using ChessStudySystem.Web.Data;
using ChessStudySystem.Web.Models.Lichess;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace ChessStudySystem.Web.Services
{
    public interface ILichessGameImportService
    {
        Task<int> StartImportAsync(LichessImportRequest request, CancellationToken cancellationToken = default);
        Task<ImportSession?> GetImportSessionAsync(int sessionId);
        Task<List<ImportSession>> GetUserImportHistoryAsync(string username);
        Task<bool> CancelImportAsync(int sessionId);
        Task<LichessUser?> GetOrUpdateUserAsync(string username);
        Task<GameStatistics> GetGameStatisticsAsync(string username);
        Task<(List<LichessGame> games, int totalCount)> SearchGamesAsync(LichessGameSearchRequest request);
        Task<string> ExportGamesAsync(LichessGameSearchRequest request, string format = "pgn");
    }

    public class LichessGameImportService : ILichessGameImportService
    {
        private readonly LichessDbContext _context;
        private readonly HttpClient _httpClient;
        private readonly ILogger<LichessGameImportService> _logger;
        private readonly IServiceProvider _serviceProvider;
        private const string LichessApiBase = "https://lichess.org/api";

        public LichessGameImportService(
            HttpClient httpClient,
            LichessDbContext context,
            ILogger<LichessGameImportService> logger,
            IServiceProvider serviceProvider)
        {
            _httpClient = httpClient;
            _context = context;
            _logger = logger;
            _serviceProvider = serviceProvider;
            
            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "ChessStudySystem/1.0");
        }

        public async Task<int> StartImportAsync(LichessImportRequest request, CancellationToken cancellationToken = default)
        {
            if (!request.IsValid(out var errors))
            {
                throw new ArgumentException($"Invalid request: {string.Join(", ", errors)}");
            }

            var session = new ImportSession
            {
                Username = request.Username.ToLowerInvariant(),
                StartedAt = DateTime.UtcNow,
                Status = "Running",
                FiltersUsed = request.ToFilterDictionary()
            };

            _context.ImportSessions.Add(session);
            await _context.SaveChangesAsync(cancellationToken);

            _ = Task.Run(async () =>
            {
                using var scope = _serviceProvider.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<LichessDbContext>();
                var logger = scope.ServiceProvider.GetRequiredService<ILogger<LichessGameImportService>>();

                try
                {
                    await PerformImportAsync(session.Id, request, context, logger);
                }
                catch (Exception ex)
                {
                    logger.LogError(ex, $"Import failed for session {session.Id}");
                    try
                    {
                        using var errorScope = _serviceProvider.CreateScope();
                        var errorContext = errorScope.ServiceProvider.GetRequiredService<LichessDbContext>();
                        var failedSession = await errorContext.ImportSessions.FindAsync(session.Id);
                        if (failedSession != null)
                        {
                            failedSession.Status = "Failed";
                            failedSession.ErrorMessage = ex.Message;
                            failedSession.CompletedAt = DateTime.UtcNow;
                            await errorContext.SaveChangesAsync();
                        }
                    }
                    catch (Exception updateEx)
                    {
                        logger.LogError(updateEx, $"Failed to update session {session.Id} error status");
                    }
                }
            }, cancellationToken);

            return session.Id;
        }

        private async Task DebugLichessResponse(LichessImportRequest request)
        {
            try
            {
                var testUrl = BuildApiUrl(new LichessImportRequest 
                { 
                    Username = request.Username, 
                    MaxGames = 1
                });
                
                _logger.LogInformation($"🔍 Debug URL: {testUrl}");
                
                var response = await _httpClient.GetAsync(testUrl);
                var content = await response.Content.ReadAsStringAsync();
                
                _logger.LogInformation($"📥 Raw API Response ({content.Length} chars):");
                _logger.LogInformation($"📄 First 2000 characters: {content.Substring(0, Math.Min(2000, content.Length))}");
                
                var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);
                if (lines.Length > 0)
                {
                    try
                    {
                        var gameJson = JsonSerializer.Deserialize<JsonElement>(lines[0]);
                        _logger.LogInformation($"🎮 Game JSON keys: {string.Join(", ", gameJson.EnumerateObject().Select(p => p.Name))}");
                        
                        if (gameJson.TryGetProperty("pgn", out var pgnProp))
                        {
                            _logger.LogInformation($"✅ PGN found! Type: {pgnProp.ValueKind}, Length: {pgnProp.GetString()?.Length ?? 0}");
                            if (pgnProp.ValueKind == JsonValueKind.String)
                            {
                                var pgnValue = pgnProp.GetString();
                                _logger.LogInformation($"📝 PGN content preview: {pgnValue?.Substring(0, Math.Min(200, pgnValue.Length ?? 0))}...");
                            }
                        }
                        else
                        {
                            _logger.LogWarning("❌ No PGN property found in response");
                        }
                        
                        if (gameJson.TryGetProperty("moves", out var movesProp))
                        {
                            _logger.LogInformation($"🔄 Moves found: {movesProp.GetString()?.Substring(0, Math.Min(100, movesProp.GetString()?.Length ?? 0))}...");
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to parse first game JSON");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Debug request failed");
            }
        }

        private async Task PerformImportAsync(int sessionId, LichessImportRequest request, LichessDbContext context, ILogger<LichessGameImportService> logger)
        {
            await DebugLichessResponse(request);

            var session = await context.ImportSessions.FindAsync(sessionId);
            if (session == null) 
            {
                logger.LogError($"Session {sessionId} not found in PerformImportAsync");
                return;
            }

            try
            {
                logger.LogInformation($"Starting import for user {request.Username} (Session {sessionId})");

                var url = BuildApiUrl(request);
                logger.LogInformation($"Fetching games from: {url}");

                using var httpClient = new HttpClient();
                httpClient.Timeout = TimeSpan.FromMinutes(5);
                httpClient.DefaultRequestHeaders.Add("Accept", "application/x-ndjson");
                httpClient.DefaultRequestHeaders.Add("User-Agent", "ChessStudySystem/1.0");

                var response = await httpClient.GetAsync(url);
                
                if (!response.IsSuccessStatusCode)
                {
                    throw new Exception($"Lichess API error: {response.StatusCode} - {response.ReasonPhrase}");
                }

                logger.LogInformation($"API request successful, processing games...");

                var content = await response.Content.ReadAsStringAsync();
                var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);

                session.TotalGamesFound = lines.Length;
                await context.SaveChangesAsync();

                var gamesToAdd = new List<LichessGame>();
                int processedCount = 0;
                int importedCount = 0;
                int skippedCount = 0;
                int errorCount = 0;

                foreach (var line in lines)
                {
                    try
                    {
                        processedCount++;

                        var gameJson = JsonSerializer.Deserialize<JsonElement>(line);
                        var game = ParseLichessGame(gameJson, request.Username);

                        if (game != null)
                        {
                            var existingGame = await context.Games.FirstOrDefaultAsync(g => g.LichessId == game.LichessId);
                            if (existingGame == null)
                            {
                                game.ImportSessionId = sessionId;
                                gamesToAdd.Add(game);
                                importedCount++;
                            }
                            else
                            {
                                skippedCount++;
                            }
                        }
                        else
                        {
                            errorCount++;
                        }

                        if (gamesToAdd.Count >= 50)
                        {
                            context.Games.AddRange(gamesToAdd);
                            await context.SaveChangesAsync();
                            gamesToAdd.Clear();
                        }

                        if (processedCount % 100 == 0)
                        {
                            session.GamesProcessed = processedCount;
                            session.GamesImported = importedCount;
                            session.GamesSkipped = skippedCount;
                            session.GamesErrored = errorCount;
                            await context.SaveChangesAsync();
                            
                            logger.LogInformation($"Progress: {processedCount}/{lines.Length} ({processedCount * 100 / lines.Length}%)");
                        }

                        if (request.MaxGames.HasValue && processedCount >= request.MaxGames.Value)
                        {
                            break;
                        }
                    }
                    catch (Exception ex)
                    {
                        errorCount++;
                        logger.LogError(ex, $"Error processing game {processedCount}");
                    }
                }

                if (gamesToAdd.Count > 0)
                {
                    context.Games.AddRange(gamesToAdd);
                    await context.SaveChangesAsync();
                }

                session.GamesProcessed = processedCount;
                session.GamesImported = importedCount;
                session.GamesSkipped = skippedCount;
                session.GamesErrored = errorCount;
                session.Status = "Completed";
                session.CompletedAt = DateTime.UtcNow;
                await context.SaveChangesAsync();

                logger.LogInformation($"Import completed for session {sessionId}. " +
                    $"Processed: {processedCount}, Imported: {importedCount}, " +
                    $"Skipped: {skippedCount}, Errors: {errorCount}");
            }
            catch (Exception ex)
            {
                session.Status = "Failed";
                session.ErrorMessage = ex.Message;
                session.CompletedAt = DateTime.UtcNow;
                await context.SaveChangesAsync();
                
                logger.LogError(ex, $"Import failed for session {sessionId}: {ex.Message}");
            }
        }

        private LichessGame? ParseLichessGame(JsonElement gameJson, string username)
        {
            try
            {
                var gameId = GetStringProperty(gameJson, "id") ?? "unknown";
                _logger.LogInformation($"🎮 Parsing game {gameId}");

                var game = new LichessGame
                {
                    LichessId = gameId,
                    Username = username.ToLowerInvariant(),
                    Rated = GetBoolProperty(gameJson, "rated"),
                    Variant = GetStringProperty(gameJson, "variant"),
                    Speed = GetStringProperty(gameJson, "speed"),
                    PerfType = GetStringProperty(gameJson, "perf"),
                    CreatedAt = GetDateTimeProperty(gameJson, "createdAt") ?? DateTime.UtcNow,
                    LastMoveAt = GetDateTimeProperty(gameJson, "lastMoveAt"),
                    Status = GetStringProperty(gameJson, "status"),
                    Winner = GetStringProperty(gameJson, "winner"),
                    Termination = GetStringProperty(gameJson, "termination"),
                    ImportedAt = DateTime.UtcNow
                };

                // Extract PGN with detailed logging
                if (gameJson.TryGetProperty("pgn", out var pgnProperty))
                {
                    _logger.LogInformation($"✅ Game {gameId}: Found PGN property, type: {pgnProperty.ValueKind}");
                    if (pgnProperty.ValueKind == JsonValueKind.String)
                    {
                        var pgnValue = pgnProperty.GetString();
                        game.Pgn = pgnValue;
                        _logger.LogInformation($"📝 Game {gameId}: PGN extracted, length: {pgnValue?.Length ?? 0}");
                        if (!string.IsNullOrEmpty(pgnValue))
                        {
                            _logger.LogInformation($"📄 Game {gameId}: PGN preview: {pgnValue.Substring(0, Math.Min(100, pgnValue.Length))}...");
                        }
                    }
                }
                else
                {
                    _logger.LogWarning($"❌ Game {gameId}: No PGN property found");
                }

                // Extract moves
                if (gameJson.TryGetProperty("moves", out var movesProperty))
                {
                    if (movesProperty.ValueKind == JsonValueKind.String)
                    {
                        var movesValue = movesProperty.GetString();
                        game.Moves = movesValue;
                        if (!string.IsNullOrEmpty(movesValue))
                        {
                            game.MovesCount = movesValue.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
                            _logger.LogInformation($"🔄 Game {gameId}: Moves extracted, count: {game.MovesCount}");
                        }
                    }
                }

                // Extract players
                if (gameJson.TryGetProperty("players", out var players))
                {
                    if (players.TryGetProperty("white", out var white))
                    {
                        game.WhiteUsername = GetNestedStringProperty(white, "user", "name");
                        game.WhiteTitle = GetNestedStringProperty(white, "user", "title");
                        
                        if (white.TryGetProperty("rating", out var whiteRating) && whiteRating.ValueKind == JsonValueKind.Number)
                            game.WhiteRating = whiteRating.GetInt32();
                        
                        if (white.TryGetProperty("ratingDiff", out var whiteRatingDiff) && whiteRatingDiff.ValueKind == JsonValueKind.Number)
                            game.WhiteRatingDiff = whiteRatingDiff.GetInt32();
                    }

                    if (players.TryGetProperty("black", out var black))
                    {
                        game.BlackUsername = GetNestedStringProperty(black, "user", "name");
                        game.BlackTitle = GetNestedStringProperty(black, "user", "title");
                        
                        if (black.TryGetProperty("rating", out var blackRating) && blackRating.ValueKind == JsonValueKind.Number)
                            game.BlackRating = blackRating.GetInt32();
                        
                        if (black.TryGetProperty("ratingDiff", out var blackRatingDiff) && blackRatingDiff.ValueKind == JsonValueKind.Number)
                            game.BlackRatingDiff = blackRatingDiff.GetInt32();
                    }
                }

                // Set user-specific data
                var isWhite = game.WhiteUsername?.Equals(username, StringComparison.OrdinalIgnoreCase) == true;
                var isBlack = game.BlackUsername?.Equals(username, StringComparison.OrdinalIgnoreCase) == true;

                if (isWhite)
                {
                    game.UserColor = "white";
                    game.UserRating = game.WhiteRating;
                    game.UserRatingDiff = game.WhiteRatingDiff;
                    game.OpponentUsername = game.BlackUsername;
                    game.OpponentRating = game.BlackRating;
                    game.UserResult = game.Winner == "white" ? "win" : (game.Winner == "black" ? "loss" : "draw");
                }
                else if (isBlack)
                {
                    game.UserColor = "black";
                    game.UserRating = game.BlackRating;
                    game.UserRatingDiff = game.BlackRatingDiff;
                    game.OpponentUsername = game.WhiteUsername;
                    game.OpponentRating = game.WhiteRating;
                    game.UserResult = game.Winner == "black" ? "win" : (game.Winner == "white" ? "loss" : "draw");
                }

                // Parse opening
                if (gameJson.TryGetProperty("opening", out var opening))
                {
                    game.OpeningEco = GetStringProperty(opening, "eco");
                    game.OpeningName = GetStringProperty(opening, "name");
                    
                    var openingPly = GetIntProperty(opening, "ply");
                    if (openingPly.HasValue)
                        game.OpeningPly = openingPly.Value;
                }

                // Parse clock
                if (gameJson.TryGetProperty("clock", out var clock))
                {
                    var initialTime = GetIntProperty(clock, "initial");
                    var increment = GetIntProperty(clock, "increment");
                    var totalTime = GetIntProperty(clock, "totalTime");
                    
                    if (initialTime.HasValue)
                        game.InitialTime = initialTime.Value;
                    
                    if (increment.HasValue)
                        game.Increment = increment.Value;
                        
                    if (totalTime.HasValue)
                        game.TotalTime = totalTime.Value;
                    
                    if (game.InitialTime.HasValue && game.Increment.HasValue)
                    {
                        game.TimeControl = $"{game.InitialTime}+{game.Increment}";
                    }
                }

                // Parse analysis
                if (gameJson.TryGetProperty("analysis", out var analysis))
                {
                    game.HasAnalysis = true;
                    game.Analysis = analysis.ToString();
                }

                _logger.LogInformation($"✅ Game {gameId}: Parsed successfully. PGN: {(string.IsNullOrEmpty(game.Pgn) ? "EMPTY" : $"{game.Pgn.Length} chars")}");

                return game;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"❌ Error parsing Lichess game: {ex.Message}");
                return null;
            }
        }

        private string BuildApiUrl(LichessImportRequest request)
        {
            var queryParams = new List<string>();

            if (request.MaxGames.HasValue)
                queryParams.Add($"max={request.MaxGames}");

            if (request.Since.HasValue)
                queryParams.Add($"since={((DateTimeOffset)request.Since.Value).ToUnixTimeMilliseconds()}");

            if (request.Until.HasValue)
                queryParams.Add($"until={((DateTimeOffset)request.Until.Value).ToUnixTimeMilliseconds()}");

            var validPerfTypes = new[] { "bullet", "blitz", "rapid", "classical", "correspondence" };
            if (request.PerfTypes != null && request.PerfTypes.Any())
            {
                var validTypes = request.PerfTypes.Where(t => validPerfTypes.Contains(t));
                if (validTypes.Any())
                    queryParams.Add($"perfType={string.Join(",", validTypes)}");
            }

            if (!string.IsNullOrEmpty(request.Opponent))
                queryParams.Add($"vs={request.Opponent}");

            if (!string.IsNullOrEmpty(request.Color))
                queryParams.Add($"color={request.Color}");

            if (request.RatedOnly.HasValue)
                queryParams.Add($"rated={request.RatedOnly.Value.ToString().ToLowerInvariant()}");

            if (request.AnalyzedOnly == true)
                queryParams.Add("analyzed=true");

            if (request.OnlyFinished)
                queryParams.Add("finished=true");

            // ALWAYS include these parameters
            queryParams.Add("opening=true");
            queryParams.Add("clocks=true");
            queryParams.Add("moves=true");
            queryParams.Add("pgnInJson=true");

            if (request.IncludeAnalysis)
                queryParams.Add("evals=true");

            var query = string.Join("&", queryParams);
            var finalUrl = $"{LichessApiBase}/games/user/{request.Username}?{query}";
            
            _logger.LogInformation($"🌐 Lichess API URL: {finalUrl}");
            
            return finalUrl;
        }

        public async Task<ImportSession?> GetImportSessionAsync(int sessionId)
        {
            return await _context.ImportSessions.FindAsync(sessionId);
        }

        public async Task<List<ImportSession>> GetUserImportHistoryAsync(string username)
        {
            return await _context.ImportSessions
                .Where(s => s.Username == username.ToLowerInvariant())
                .OrderByDescending(s => s.StartedAt)
                .Take(20)
                .ToListAsync();
        }

        public async Task<bool> CancelImportAsync(int sessionId)
        {
            var session = await _context.ImportSessions.FindAsync(sessionId);
            if (session == null || session.IsCompleted) return false;

            session.Status = "Cancelled";
            session.CompletedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
            return true;
        }

        public async Task<LichessUser?> GetOrUpdateUserAsync(string username)
        {
            var normalizedUsername = username.ToLowerInvariant().Trim();
            
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == normalizedUsername);
            
            if (user == null || DateTime.UtcNow.Subtract(user.LastUpdated).TotalHours > 24)
            {
                try
                {
                    var url = $"{LichessApiBase}/user/{normalizedUsername}";
                    var response = await _httpClient.GetAsync(url);
                    
                    if (!response.IsSuccessStatusCode)
                    {
                        return user;
                    }

                    var content = await response.Content.ReadAsStringAsync();
                    var userJson = JsonSerializer.Deserialize<JsonElement>(content);

                    if (user == null)
                    {
                        user = new LichessUser
                        {
                            Username = normalizedUsername,
                            LastUpdated = DateTime.UtcNow
                        };
                        _context.Users.Add(user);
                    }

                    user.DisplayName = GetStringProperty(userJson, "title");
                    user.Title = GetStringProperty(userJson, "title");
                    user.IsOnline = GetBoolProperty(userJson, "online");
                    user.Country = GetStringProperty(userJson, "country");
                    user.IsPatron = GetBoolProperty(userJson, "patron");
                    user.IsVerified = GetBoolProperty(userJson, "verified");
                    user.LastUpdated = DateTime.UtcNow;

                    if (userJson.TryGetProperty("count", out var count))
                    {
                        var totalGames = GetIntProperty(count, "all");
                        var ratedGames = GetIntProperty(count, "rated");
                        var wins = GetIntProperty(count, "win");
                        var losses = GetIntProperty(count, "loss");
                        var draws = GetIntProperty(count, "draw");
                        
                        user.TotalGames = totalGames ?? 0;
                        user.RatedGames = ratedGames ?? 0;
                        user.Wins = wins ?? 0;
                        user.Losses = losses ?? 0;
                        user.Draws = draws ?? 0;
                    }

                    if (userJson.TryGetProperty("perfs", out var perfs))
                    {
                        user.Performances.Clear();
                        foreach (var perf in perfs.EnumerateObject())
                        {
                            var rating = GetIntProperty(perf.Value, "rating");
                            var games = GetIntProperty(perf.Value, "games");
                            
                            user.Performances[perf.Name] = new PerformanceStats
                            {
                                Rating = rating ?? 1500,
                                Games = games ?? 0
                            };
                        }
                    }

                    await _context.SaveChangesAsync();
                    return user;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Error fetching user data for {username}");
                    return user;
                }
            }

            return user;
        }

        public async Task<GameStatistics> GetGameStatisticsAsync(string username)
        {
            var games = await _context.Games
                .Where(g => g.Username == username.ToLowerInvariant())
                .ToListAsync();

            return new GameStatistics
            {
                TotalGames = games.Count,
                Wins = games.Count(g => g.UserResult == "win"),
                Losses = games.Count(g => g.UserResult == "loss"),
                Draws = games.Count(g => g.UserResult == "draw"),
                GamesByTimeControl = new Dictionary<string, int>(),
                GamesByColor = new Dictionary<string, int>(),
                GamesByResult = new Dictionary<string, int>(),
                GamesByOpening = new Dictionary<string, int>(),
                GamesByOpponent = new Dictionary<string, int>()
            };
        }

        public async Task<(List<LichessGame> games, int totalCount)> SearchGamesAsync(LichessGameSearchRequest request)
        {
            var query = _context.Games.AsQueryable();
            
            // Apply filters
            if (!string.IsNullOrEmpty(request.Username))
                query = query.Where(g => g.Username == request.Username.ToLowerInvariant());

            if (!string.IsNullOrEmpty(request.Opponent))
                query = query.Where(g => g.OpponentUsername != null && g.OpponentUsername.Contains(request.Opponent));

            if (!string.IsNullOrEmpty(request.Opening))
                query = query.Where(g => g.OpeningName != null && g.OpeningName.Contains(request.Opening));

            if (!string.IsNullOrEmpty(request.EcoCode))
                query = query.Where(g => g.OpeningEco == request.EcoCode);

            if (!string.IsNullOrEmpty(request.Result))
                query = query.Where(g => g.UserResult == request.Result);

            if (!string.IsNullOrEmpty(request.Color))
                query = query.Where(g => g.UserColor == request.Color);

            if (request.PerfTypes != null && request.PerfTypes.Any())
                query = query.Where(g => request.PerfTypes.Contains(g.PerfType));

            if (request.FromDate.HasValue)
                query = query.Where(g => g.CreatedAt >= request.FromDate.Value);

            if (request.ToDate.HasValue)
                query = query.Where(g => g.CreatedAt <= request.ToDate.Value);

            if (request.MinRating.HasValue)
                query = query.Where(g => g.UserRating >= request.MinRating.Value);

            if (request.MaxRating.HasValue)
                query = query.Where(g => g.UserRating <= request.MaxRating.Value);

            if (request.RatedOnly.HasValue)
                query = query.Where(g => g.Rated == request.RatedOnly.Value);

            if (request.AnalyzedOnly.HasValue && request.AnalyzedOnly.Value)
                query = query.Where(g => g.HasAnalysis);

            if (!string.IsNullOrEmpty(request.Status))
                query = query.Where(g => g.Status == request.Status);

            if (request.MinMoves.HasValue)
                query = query.Where(g => g.MovesCount >= request.MinMoves.Value);

            if (request.MaxMoves.HasValue)
                query = query.Where(g => g.MovesCount <= request.MaxMoves.Value);

            // Apply sorting
            query = (request.SortBy?.ToLower(), request.SortDirection?.ToLower()) switch
            {
                ("date", "asc") or ("createdat", "asc") => query.OrderBy(g => g.CreatedAt),
                ("date", "desc") or ("createdat", "desc") or ("date", null) or ("createdat", null) => query.OrderByDescending(g => g.CreatedAt),
                ("opponent", "asc") => query.OrderBy(g => g.OpponentUsername),
                ("opponent", "desc") => query.OrderByDescending(g => g.OpponentUsername),
                ("result", "asc") => query.OrderBy(g => g.UserResult),
                ("result", "desc") => query.OrderByDescending(g => g.UserResult),
                ("color", "asc") => query.OrderBy(g => g.UserColor),
                ("color", "desc") => query.OrderByDescending(g => g.UserColor),
                ("rating", "asc") => query.OrderBy(g => g.UserRating),
                ("rating", "desc") => query.OrderByDescending(g => g.UserRating),
                ("timecontrol", "asc") or ("time", "asc") => query.OrderBy(g => g.TimeControl),
                ("timecontrol", "desc") or ("time", "desc") => query.OrderByDescending(g => g.TimeControl),
                ("opening", "asc") => query.OrderBy(g => g.OpeningName),
                ("opening", "desc") => query.OrderByDescending(g => g.OpeningName),
                ("moves", "asc") => query.OrderBy(g => g.MovesCount),
                ("moves", "desc") => query.OrderByDescending(g => g.MovesCount),
                _ => query.OrderByDescending(g => g.CreatedAt)
            };

            var totalCount = await query.CountAsync();
            
            var games = await query
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .ToListAsync();

            return (games, totalCount);
        }

        public async Task<string> ExportGamesAsync(LichessGameSearchRequest request, string format = "pgn")
        {
            await Task.Delay(100);
            return "Placeholder export";
        }

        // Helper methods
        private static string? GetStringProperty(JsonElement element, string propertyName)
        {
            return element.TryGetProperty(propertyName, out var property) && property.ValueKind == JsonValueKind.String
                ? property.GetString()
                : null;
        }

        private static bool GetBoolProperty(JsonElement element, string propertyName)
        {
            return element.TryGetProperty(propertyName, out var property) && property.ValueKind == JsonValueKind.True;
        }

        private static int? GetIntProperty(JsonElement element, string propertyName)
        {
            return element.TryGetProperty(propertyName, out var property) && property.ValueKind == JsonValueKind.Number
                ? property.GetInt32()
                : null;
        }

        private static DateTime? GetDateTimeProperty(JsonElement element, string propertyName)
        {
            if (element.TryGetProperty(propertyName, out var property))
            {
                if (property.ValueKind == JsonValueKind.Number)
                {
                    var timestamp = property.GetInt64();
                    return DateTimeOffset.FromUnixTimeMilliseconds(timestamp).DateTime;
                }
                else if (property.ValueKind == JsonValueKind.String)
                {
                    if (DateTime.TryParse(property.GetString(), out var date))
                        return date;
                }
            }
            return null;
        }

        private static string? GetNestedStringProperty(JsonElement element, string parentProperty, string childProperty)
        {
            return element.TryGetProperty(parentProperty, out var parent) &&
                   parent.TryGetProperty(childProperty, out var child) &&
                   child.ValueKind == JsonValueKind.String
                ? child.GetString()
                : null;
        }
    }
}