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
            
            // Configure HttpClient for Lichess API
            _httpClient.DefaultRequestHeaders.Clear();
            _httpClient.DefaultRequestHeaders.Add("User-Agent", "ChessStudySystem/1.0");
        }

        public async Task<int> StartImportAsync(LichessImportRequest request, CancellationToken cancellationToken = default)
        {
            // Validate request
            if (!request.IsValid(out var errors))
            {
                throw new ArgumentException($"Invalid request: {string.Join(", ", errors)}");
            }

            // Create import session
            var session = new ImportSession
            {
                Username = request.Username.ToLowerInvariant(),
                StartedAt = DateTime.UtcNow,
                Status = "Running",
                FiltersUsed = request.ToFilterDictionary()
            };

            _context.ImportSessions.Add(session);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation($"Created import session {session.Id} for user {request.Username}");

            // Start background import - use a hosted service or background task queue in production
            _ = Task.Run(async () => 
            {
                try
                {
                    _logger.LogInformation($"Background task starting for session {session.Id}");
                    
                    // Use a separate service scope for the background task
                    using var scope = _serviceProvider.CreateScope();
                    var backgroundContext = scope.ServiceProvider.GetRequiredService<LichessDbContext>();
                    var backgroundLogger = scope.ServiceProvider.GetRequiredService<ILogger<LichessGameImportService>>();
                    
                    await PerformImportAsync(session.Id, request, backgroundContext, backgroundLogger);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, $"Background task failed for session {session.Id}");
                    
                    // Update session status on failure
                    try
                    {
                        using var scope = _serviceProvider.CreateScope();
                        var errorContext = scope.ServiceProvider.GetRequiredService<LichessDbContext>();
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
                        _logger.LogError(updateEx, $"Failed to update session {session.Id} error status");
                    }
                }
            }, cancellationToken);

            return session.Id;
        }

        private async Task PerformImportAsync(int sessionId, LichessImportRequest request, LichessDbContext context, ILogger<LichessGameImportService> logger)
        {
            var session = await context.ImportSessions.FindAsync(sessionId);
            if (session == null) 
            {
                logger.LogError($"Session {sessionId} not found in PerformImportAsync");
                return;
            }

            try
            {
                logger.LogInformation($"Starting import for user {request.Username} (Session {sessionId})");

                // Build URL and limit games for faster processing
                var url = BuildApiUrl(request);
                logger.LogInformation($"Fetching games from: {url}");

                // Create HttpClient with timeout
                using var httpClient = new HttpClient();
                httpClient.Timeout = TimeSpan.FromMinutes(5); // 5 minute timeout
                httpClient.DefaultRequestHeaders.Add("Accept", "application/x-ndjson");
                httpClient.DefaultRequestHeaders.Add("User-Agent", "ChessStudySystem/1.0");

                var response = await httpClient.GetAsync(url);
                
                if (!response.IsSuccessStatusCode)
                {
                    throw new Exception($"Lichess API error: {response.StatusCode} - {response.ReasonPhrase}");
                }

                logger.LogInformation($"Successfully connected to Lichess API, reading games...");

                // Read all content at once instead of streaming
                var content = await response.Content.ReadAsStringAsync();
                var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);

                logger.LogInformation($"Found {lines.Length} games to process");

                var gamesToAdd = new List<LichessGame>();
                var processedCount = 0;
                var importedCount = 0;
                var skippedCount = 0;
                var errorCount = 0;

                // Update initial progress
                session.TotalGamesFound = lines.Length;
                await context.SaveChangesAsync();

                foreach (var line in lines)
                {
                    try
                    {
                        if (string.IsNullOrWhiteSpace(line)) continue;

                        processedCount++;

                        var gameJson = JsonSerializer.Deserialize<JsonElement>(line);
                        var game = ParseLichessGameSimple(gameJson, request.Username, sessionId);

                        if (game != null)
                        {
                            // Quick duplicate check using only LichessId
                            if (!await context.Games.AnyAsync(g => g.LichessId == game.LichessId))
                            {
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

                        // Update progress every 5 games and save in small batches
                        if (processedCount % 5 == 0)
                        {
                            // Save any pending games
                            if (gamesToAdd.Count > 0)
                            {
                                context.Games.AddRange(gamesToAdd);
                                await context.SaveChangesAsync();
                                gamesToAdd.Clear();
                            }

                            // Update session progress
                            session.GamesProcessed = processedCount;
                            session.GamesImported = importedCount;
                            session.GamesSkipped = skippedCount;
                            session.GamesErrored = errorCount;
                            await context.SaveChangesAsync();
                            
                            logger.LogInformation($"Progress: {processedCount}/{lines.Length} ({processedCount * 100 / lines.Length}%)");
                        }

                        // Stop if we've reached the max limit
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

                // Save any remaining games
                if (gamesToAdd.Count > 0)
                {
                    context.Games.AddRange(gamesToAdd);
                    await context.SaveChangesAsync();
                }

                // Final update
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

        // Simplified game parsing for faster processing
        private LichessGame? ParseLichessGameSimple(JsonElement gameJson, string username, int sessionId)
        {
            try
            {
                var lichessId = GetStringProperty(gameJson, "id");
                if (string.IsNullOrEmpty(lichessId)) return null;

                var game = new LichessGame
                {
                    LichessId = lichessId,
                    Username = username.ToLowerInvariant(),
                    ImportSessionId = sessionId,
                    ImportedAt = DateTime.UtcNow,
                    CreatedAt = GetDateTimeProperty(gameJson, "createdAt") ?? DateTime.UtcNow,
                    Rated = GetBoolProperty(gameJson, "rated"),
                    Variant = GetStringProperty(gameJson, "variant"),
                    Speed = GetStringProperty(gameJson, "speed"),
                    PerfType = GetStringProperty(gameJson, "perf"),
                    Status = GetStringProperty(gameJson, "status"),
                    Winner = GetStringProperty(gameJson, "winner"),
                    Moves = GetStringProperty(gameJson, "moves")
                };

                // Count moves
                if (!string.IsNullOrEmpty(game.Moves))
                {
                    game.MovesCount = game.Moves.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
                }

                // Parse players (simplified)
                if (gameJson.TryGetProperty("players", out var players))
                {
                    if (players.TryGetProperty("white", out var white))
                    {
                        game.WhiteUsername = GetNestedStringProperty(white, "user", "name");
                        game.WhiteRating = GetIntProperty(white, "rating");
                    }

                    if (players.TryGetProperty("black", out var black))
                    {
                        game.BlackUsername = GetNestedStringProperty(black, "user", "name");
                        game.BlackRating = GetIntProperty(black, "rating");
                    }
                }

                // Determine user's color and result (simplified)
                if (game.WhiteUsername?.Equals(username, StringComparison.OrdinalIgnoreCase) == true)
                {
                    game.UserColor = "white";
                    game.UserRating = game.WhiteRating;
                    game.OpponentUsername = game.BlackUsername;
                    game.UserResult = game.Winner == "white" ? "win" : (game.Winner == "black" ? "loss" : "draw");
                }
                else if (game.BlackUsername?.Equals(username, StringComparison.OrdinalIgnoreCase) == true)
                {
                    game.UserColor = "black";
                    game.UserRating = game.BlackRating;
                    game.OpponentUsername = game.WhiteUsername;
                    game.UserResult = game.Winner == "black" ? "win" : (game.Winner == "white" ? "loss" : "draw");
                }

                // Parse opening (simplified)
                if (gameJson.TryGetProperty("opening", out var opening))
                {
                    game.OpeningEco = GetStringProperty(opening, "eco");
                    game.OpeningName = GetStringProperty(opening, "name");
                }

                return game;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing Lichess game");
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

            // Only include valid performance types (standard chess)
            var validPerfTypes = new[] { "bullet", "blitz", "rapid", "classical", "correspondence" };
            if (request.PerfTypes.Any())
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

            // Always include these for better data
            queryParams.Add("opening=true");
            queryParams.Add("clocks=true");
            queryParams.Add("moves=true");

            if (request.IncludeAnalysis)
                queryParams.Add("evals=true");

            if (request.IncludePgn)
                queryParams.Add("pgnInJson=true");

            var query = string.Join("&", queryParams);
            return $"{LichessApiBase}/games/user/{request.Username}?{query}";
        }

        private LichessGame? ParseLichessGame(JsonElement gameJson, string username, int sessionId)
        {
            try
            {
                var game = new LichessGame
                {
                    LichessId = GetStringProperty(gameJson, "id") ?? string.Empty,
                    Username = username.ToLowerInvariant(),
                    ImportSessionId = sessionId,
                    ImportedAt = DateTime.UtcNow
                };

                if (string.IsNullOrEmpty(game.LichessId)) return null;

                // Basic game properties
                game.Rated = GetBoolProperty(gameJson, "rated");
                game.Variant = GetStringProperty(gameJson, "variant");
                game.Speed = GetStringProperty(gameJson, "speed");
                game.PerfType = GetStringProperty(gameJson, "perf");
                game.Status = GetStringProperty(gameJson, "status");
                game.Winner = GetStringProperty(gameJson, "winner");

                // Dates
                game.CreatedAt = GetDateTimeProperty(gameJson, "createdAt") ?? DateTime.UtcNow;
                game.LastMoveAt = GetDateTimeProperty(gameJson, "lastMoveAt");

                // Players
                if (gameJson.TryGetProperty("players", out var players))
                {
                    if (players.TryGetProperty("white", out var white))
                    {
                        game.WhiteUsername = GetNestedStringProperty(white, "user", "name");
                        game.WhiteRating = GetIntProperty(white, "rating");
                        game.WhiteRatingDiff = GetIntProperty(white, "ratingDiff");
                    }

                    if (players.TryGetProperty("black", out var black))
                    {
                        game.BlackUsername = GetNestedStringProperty(black, "user", "name");
                        game.BlackRating = GetIntProperty(black, "rating");
                        game.BlackRatingDiff = GetIntProperty(black, "ratingDiff");
                    }
                }

                // Determine user's perspective
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

                // Opening
                if (gameJson.TryGetProperty("opening", out var opening))
                {
                    game.OpeningEco = GetStringProperty(opening, "eco");
                    game.OpeningName = GetStringProperty(opening, "name");
                    game.OpeningPly = GetIntProperty(opening, "ply");
                }

                // Clock
                if (gameJson.TryGetProperty("clock", out var clock))
                {
                    game.InitialTime = GetIntProperty(clock, "initial");
                    game.Increment = GetIntProperty(clock, "increment");
                    game.TotalTime = GetIntProperty(clock, "totalTime");
                    
                    if (game.InitialTime.HasValue && game.Increment.HasValue)
                    {
                        game.TimeControl = $"{game.InitialTime}+{game.Increment}";
                    }
                }

                // Moves
                game.Moves = GetStringProperty(gameJson, "moves");
                if (!string.IsNullOrEmpty(game.Moves))
                {
                    game.MovesCount = game.Moves.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
                }

                // PGN (if included)
                game.Pgn = GetStringProperty(gameJson, "pgn");

                // Analysis
                if (gameJson.TryGetProperty("analysis", out var analysis))
                {
                    game.HasAnalysis = true;
                    game.Analysis = analysis.ToString();
                }

                return game;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error parsing Lichess game");
                return null;
            }
        }

        private static string? GetNestedStringProperty(JsonElement element, string parentProperty, string childProperty)
        {
            return element.TryGetProperty(parentProperty, out var parent) &&
                   parent.TryGetProperty(childProperty, out var child) &&
                   child.ValueKind == JsonValueKind.String
                ? child.GetString()
                : null;
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
            
            // Check if user exists in database and is recent
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == normalizedUsername);
            
            // Update if user doesn't exist or data is older than 1 hour
            if (user == null || user.LastUpdated < DateTime.UtcNow.AddHours(-1))
            {
                var updatedUser = await FetchUserFromLichessAsync(normalizedUsername);
                if (updatedUser == null) return null;

                if (user == null)
                {
                    _context.Users.Add(updatedUser);
                }
                else
                {
                    _context.Entry(user).CurrentValues.SetValues(updatedUser);
                    user.Id = user.Id; // Preserve the original ID
                }

                await _context.SaveChangesAsync();
                return updatedUser;
            }

            return user;
        }

        private async Task<LichessUser?> FetchUserFromLichessAsync(string username)
        {
            try
            {
                var url = $"{LichessApiBase}/user/{username}";
                _logger.LogInformation($"Fetching user data from: {url}");
                
                var response = await _httpClient.GetAsync(url);
                
                _logger.LogInformation($"Lichess API response: {response.StatusCode}");
                
                if (!response.IsSuccessStatusCode) 
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogWarning($"Lichess API error: {response.StatusCode} - {errorContent}");
                    return null;
                }

                var content = await response.Content.ReadAsStringAsync();
                _logger.LogInformation($"Lichess API response content length: {content.Length}");
                
                var userJson = JsonSerializer.Deserialize<JsonElement>(content);

                var user = new LichessUser
                {
                    Username = username,
                    DisplayName = GetStringProperty(userJson, "username"),
                    Title = GetStringProperty(userJson, "title"),
                    IsOnline = GetBoolProperty(userJson, "online"),
                    JoinedAt = GetDateTimeProperty(userJson, "createdAt"),
                    LastSeenAt = GetDateTimeProperty(userJson, "seenAt"),
                    Country = GetStringProperty(userJson, "country"),
                    IsPatron = GetBoolProperty(userJson, "patron"),
                    IsVerified = GetBoolProperty(userJson, "verified"),
                    LastUpdated = DateTime.UtcNow
                };

                // Parse count data
                if (userJson.TryGetProperty("count", out var count))
                {
                    user.TotalGames = GetIntProperty(count, "all") ?? 0;
                    user.RatedGames = GetIntProperty(count, "rated") ?? 0;
                    user.Wins = GetIntProperty(count, "win") ?? 0;
                    user.Losses = GetIntProperty(count, "loss") ?? 0;
                    user.Draws = GetIntProperty(count, "draw") ?? 0;
                }

                // Parse performance data (simplified)
                if (userJson.TryGetProperty("perfs", out var perfs))
                {
                    var perfTypes = new[] { "bullet", "blitz", "rapid", "classical", "correspondence" };
                    foreach (var perfType in perfTypes)
                    {
                        if (perfs.TryGetProperty(perfType, out var perf))
                        {
                            user.Performances[perfType] = new PerformanceStats
                            {
                                Rating = GetIntProperty(perf, "rating") ?? 1500,
                                Games = GetIntProperty(perf, "games") ?? 0
                            };
                        }
                    }
                }

                return user;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error fetching user data for {username}");
                return null;
            }
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
            
            if (!string.IsNullOrEmpty(request.Username))
                query = query.Where(g => g.Username == request.Username.ToLowerInvariant());

            var totalCount = await query.CountAsync();
            var games = await query.Take(request.PageSize).ToListAsync();

            return (games, totalCount);
        }

        public async Task<string> ExportGamesAsync(LichessGameSearchRequest request, string format = "pgn")
        {
            await Task.Delay(100); // Placeholder
            return "Placeholder export";
        }

        // Helper methods for JSON parsing
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
            if (element.TryGetProperty(propertyName, out var property) && property.ValueKind == JsonValueKind.Number)
            {
                var timestamp = property.GetInt64();
                return DateTimeOffset.FromUnixTimeMilliseconds(timestamp).DateTime;
            }
            return null;
        }
    }
}