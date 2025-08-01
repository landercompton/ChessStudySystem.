using Microsoft.AspNetCore.Mvc;
using ChessStudySystem.Web.Models.Lichess;
using ChessStudySystem.Web.Services;
using System.Text.Json;

namespace ChessStudySystem.Web.Controllers
{
    public class LichessController : Controller
    {
        private readonly ILichessGameImportService _importService;
        private readonly ILogger<LichessController> _logger;

        public LichessController(
            ILichessGameImportService importService,
            ILogger<LichessController> logger)
        {
            _importService = importService;
            _logger = logger;
        }

        public IActionResult Import()
        {
            var model = new LichessImportRequest();
            return View(model);
        }

        [HttpPost]
        public async Task<IActionResult> Import(LichessImportRequest request)
        {
            if (!ModelState.IsValid)
            {
                return View(request);
            }

            if (!request.IsValid(out var errors))
            {
                foreach (var error in errors)
                {
                    ModelState.AddModelError("", error);
                }
                return View(request);
            }

            try
            {
                // Validate user exists
                var user = await _importService.GetOrUpdateUserAsync(request.Username);
                if (user == null)
                {
                    ModelState.AddModelError("Username", $"User '{request.Username}' not found on Lichess.");
                    return View(request);
                }

                // Start import
                var sessionId = await _importService.StartImportAsync(request);

                TempData["Success"] = $"Import started for {request.Username}";
                TempData["SessionId"] = sessionId;
                TempData["Username"] = request.Username;
                TempData["Filters"] = request.GetDisplayFilters();

                return RedirectToAction("Progress", new { sessionId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error starting import for user {Username}", request.Username);
                ModelState.AddModelError("", "An error occurred while starting the import. Please try again.");
                return View(request);
            }
        }

        public async Task<IActionResult> Progress(int sessionId)
        {
            var session = await _importService.GetImportSessionAsync(sessionId);
            if (session == null)
            {
                TempData["Error"] = "Import session not found.";
                return RedirectToAction("Import");
            }

            ViewBag.SessionId = sessionId;
            return View(session);
        }

        [HttpGet]
        public async Task<IActionResult> GetProgressStatus(int sessionId)
        {
            var session = await _importService.GetImportSessionAsync(sessionId);
            if (session == null)
            {
                return Json(new { error = "Session not found" });
            }

            return Json(new
            {
                status = session.Status,
                progress = session.ProgressPercentage,
                processed = session.GamesProcessed,
                imported = session.GamesImported,
                skipped = session.GamesSkipped,
                errors = session.GamesErrored,
                totalFound = session.TotalGamesFound,
                isCompleted = session.IsCompleted,
                duration = session.Duration?.ToString(@"mm\:ss"),
                errorMessage = session.ErrorMessage
            });
        }

        [HttpPost]
        public async Task<IActionResult> CancelImport(int sessionId)
        {
            var success = await _importService.CancelImportAsync(sessionId);

            if (success)
            {
                TempData["Info"] = "Import cancelled successfully.";
            }
            else
            {
                TempData["Error"] = "Could not cancel import. It may have already completed.";
            }

            return RedirectToAction("Progress", new { sessionId });
        }

        public async Task<IActionResult> Games(string username, int page = 1)
        {
            if (string.IsNullOrWhiteSpace(username))
            {
                return RedirectToAction("Import");
            }

            var searchRequest = new LichessGameSearchRequest
            {
                Username = username,
                Page = page,
                PageSize = 50,
                SortBy = "CreatedAt",
                SortDirection = "desc"
            };

            var (games, totalCount) = await _importService.SearchGamesAsync(searchRequest);
            var user = await _importService.GetOrUpdateUserAsync(username);
            var stats = await _importService.GetGameStatisticsAsync(username);

            ViewBag.Username = username;
            ViewBag.User = user;
            ViewBag.Stats = stats;
            ViewBag.CurrentPage = page;
            ViewBag.TotalPages = (int)Math.Ceiling((double)totalCount / searchRequest.PageSize);
            ViewBag.TotalCount = totalCount;

            return View(games);
        }

        [HttpGet]
        public async Task<IActionResult> Search(
            string? username = null,
            string? opponent = null,
            string? opening = null,
            string? ecoCode = null,
            string? result = null,
            string? color = null,
            List<string>? perfTypes = null,
            DateTime? fromDate = null,
            DateTime? toDate = null,
            int? minRating = null,
            int? maxRating = null,
            bool? ratedOnly = null,
            bool? analyzedOnly = null,
            string? status = null,
            int? minMoves = null,
            int? maxMoves = null,
            string? sortBy = null,
            string? sortDirection = null,
            int page = 1,
            int pageSize = 50)
        {
            if (string.IsNullOrEmpty(opponent) && string.IsNullOrEmpty(opening) &&
                string.IsNullOrEmpty(ecoCode) && string.IsNullOrEmpty(result) &&
                string.IsNullOrEmpty(color) && (perfTypes == null || !perfTypes.Any()) &&
                fromDate == null && toDate == null && minRating == null && maxRating == null &&
                ratedOnly == null && analyzedOnly == null && string.IsNullOrEmpty(status) &&
                minMoves == null && maxMoves == null &&
                string.IsNullOrEmpty(sortBy) && page == 1)
            {
                var model = new LichessGameSearchRequest();
                if (!string.IsNullOrEmpty(username))
                {
                    model.Username = username;
                }

                ViewBag.PerfTypes = new List<string> { "bullet", "blitz", "rapid", "classical", "correspondence" };
                ViewBag.Results = new List<string> { "win", "loss", "draw" };
                ViewBag.Colors = new List<string> { "white", "black" };
                ViewBag.SortOptions = new Dictionary<string, string>
                {
                    ["CreatedAt"] = "Date",
                    ["Rating"] = "Rating",
                    ["Opponent"] = "Opponent",
                    ["Opening"] = "Opening",
                    ["Moves"] = "Game Length"
                };

                return View(model);
            }

            // Otherwise, process as a search request
            var request = new LichessGameSearchRequest
            {
                Username = username,
                Opponent = opponent,
                Opening = opening,
                EcoCode = ecoCode,
                Result = result,
                Color = color,
                PerfTypes = perfTypes,
                FromDate = fromDate,
                ToDate = toDate,
                MinRating = minRating,
                MaxRating = maxRating,
                RatedOnly = ratedOnly,
                AnalyzedOnly = analyzedOnly,
                Status = status,
                MinMoves = minMoves,
                MaxMoves = maxMoves,
                SortBy = sortBy ?? "CreatedAt",
                SortDirection = sortDirection ?? "desc",
                Page = page,
                PageSize = pageSize
            };

            var (games, totalCount) = await _importService.SearchGamesAsync(request);

            ViewBag.PerfTypes = new List<string> { "bullet", "blitz", "rapid", "classical", "correspondence" };
            ViewBag.Results = new List<string> { "win", "loss", "draw" };
            ViewBag.Colors = new List<string> { "white", "black" };
            ViewBag.SortOptions = new Dictionary<string, string>
            {
                ["CreatedAt"] = "Date",
                ["Rating"] = "Rating",
                ["Opponent"] = "Opponent",
                ["Opening"] = "Opening",
                ["Moves"] = "Game Length"
            };

            ViewBag.TotalCount = totalCount;
            ViewBag.TotalPages = (int)Math.Ceiling((double)totalCount / request.PageSize);
            ViewBag.SearchRequest = request;

            return View("SearchResults", games);
        }

        [HttpPost]
        public async Task<IActionResult> Search(LichessGameSearchRequest request)
        {
            var (games, totalCount) = await _importService.SearchGamesAsync(request);

            ViewBag.PerfTypes = new List<string> { "bullet", "blitz", "rapid", "classical", "correspondence" };
            ViewBag.Results = new List<string> { "win", "loss", "draw" };
            ViewBag.Colors = new List<string> { "white", "black" };
            ViewBag.SortOptions = new Dictionary<string, string>
            {
                ["CreatedAt"] = "Date",
                ["Rating"] = "Rating",
                ["Opponent"] = "Opponent",
                ["Opening"] = "Opening",
                ["Moves"] = "Game Length"
            };

            ViewBag.TotalCount = totalCount;
            ViewBag.TotalPages = (int)Math.Ceiling((double)totalCount / request.PageSize);
            ViewBag.SearchRequest = request;

            return View("SearchResults", games);
        }

        public async Task<IActionResult> Export(LichessGameSearchRequest request, string format = "pgn")
        {
            try
            {
                var exportData = await _importService.ExportGamesAsync(request, format);
                var fileName = $"lichess_games_{DateTime.UtcNow:yyyyMMdd_HHmmss}";

                var (contentType, fileExtension) = format.ToLowerInvariant() switch
                {
                    "pgn" => ("application/x-chess-pgn", "pgn"),
                    "csv" => ("text/csv", "csv"),
                    "json" => ("application/json", "json"),
                    _ => ("text/plain", "txt")
                };

                return File(System.Text.Encoding.UTF8.GetBytes(exportData), contentType, $"{fileName}.{fileExtension}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exporting games");
                TempData["Error"] = "An error occurred while exporting games.";
                return RedirectToAction("Search");
            }
        }

        public async Task<IActionResult> History(string username)
        {
            if (string.IsNullOrWhiteSpace(username))
            {
                return RedirectToAction("Import");
            }

            var history = await _importService.GetUserImportHistoryAsync(username);
            ViewBag.Username = username;

            return View(history);
        }

        public async Task<IActionResult> Statistics(string username)
        {
            if (string.IsNullOrWhiteSpace(username))
            {
                return RedirectToAction("Import");
            }

            var stats = await _importService.GetGameStatisticsAsync(username);
            var user = await _importService.GetOrUpdateUserAsync(username);

            ViewBag.Username = username;
            ViewBag.User = user;

            return View(stats);
        }

        [HttpGet]
        public async Task<IActionResult> ValidateUser(string username)
        {
            if (string.IsNullOrWhiteSpace(username))
            {
                return Json(new { valid = false, message = "Username is required" });
            }

            try
            {
                var user = await _importService.GetOrUpdateUserAsync(username);
                if (user == null)
                {
                    return Json(new { valid = false, message = "User not found on Lichess" });
                }

                return Json(new
                {
                    valid = true,
                    user = new
                    {
                        username = user.Username,
                        displayName = user.DisplayName,
                        title = user.Title,
                        isOnline = user.IsOnline,
                        totalGames = user.TotalGames,
                        country = user.Country,
                        joinedAt = user.JoinedAt?.ToString("yyyy-MM-dd"),
                        performances = user.Performances.ToDictionary(
                            p => p.Key,
                            p => new { rating = p.Value.Rating, games = p.Value.Games }
                        )
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error validating user {Username}", username);
                return Json(new { valid = false, message = "Error checking user" });
            }
        }

        [HttpGet]
        public async Task<IActionResult> GameDetails(string lichessId)
        {
            // This would be implemented if you want a detailed game view
            // For now, redirect to Lichess
            return Redirect($"https://lichess.org/{lichessId}");
        }

        [HttpPost]
        public async Task<IActionResult> DeleteGames(string username, bool confirm = false)
        {
            if (!confirm)
            {
                return Json(new { success = false, message = "Confirmation required" });
            }

            try
            {
                // This would need to be implemented in the service
                // For safety, we'll leave this as a placeholder
                return Json(new { success = false, message = "Feature not implemented for safety" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting games for user {Username}", username);
                return Json(new { success = false, message = "Error deleting games" });
            }
        }

        // Add this test method to your LichessController to debug the import process

        [HttpGet]
        public async Task<IActionResult> TestImport(string username = "Nredomrepyh")
        {
            try
            {
                _logger.LogInformation($"Testing import for {username}");

                // Test API call directly
                var httpClient = new HttpClient();
                httpClient.DefaultRequestHeaders.Add("User-Agent", "ChessStudySystem/1.0");

                var url = $"https://lichess.org/api/games/user/{username}?max=5&opening=true&moves=true";
                _logger.LogInformation($"Testing URL: {url}");

                var response = await httpClient.GetAsync(url);
                _logger.LogInformation($"API Response: {response.StatusCode}");

                if (response.IsSuccessStatusCode)
                {
                    var content = await response.Content.ReadAsStringAsync();
                    var lines = content.Split('\n', StringSplitOptions.RemoveEmptyEntries);

                    return Json(new
                    {
                        success = true,
                        message = $"API working! Got {lines.Length} games",
                        statusCode = (int)response.StatusCode,
                        contentLength = content.Length,
                        firstGamePreview = lines.Length > 0 ? lines[0].Substring(0, Math.Min(200, lines[0].Length)) : "No games"
                    });
                }
                else
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    return Json(new
                    {
                        success = false,
                        message = $"API Error: {response.StatusCode}",
                        error = errorContent
                    });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Test import failed");
                return Json(new
                {
                    success = false,
                    message = $"Exception: {ex.Message}",
                    stackTrace = ex.StackTrace
                });
            }
        }

        // Add this method to test the session creation and background task
        [HttpGet]
        public async Task<IActionResult> TestSession()
        {
            try
            {
                // Create a test session
                var session = new ChessStudySystem.Web.Models.Lichess.ImportSession
                {
                    Username = "test",
                    StartedAt = DateTime.UtcNow,
                    Status = "Running"
                };

                // Simulate background progress updates
                _ = Task.Run(async () =>
                {
                    for (int i = 0; i <= 100; i += 10)
                    {
                        await Task.Delay(1000);
                        session.GamesProcessed = i;
                        session.GamesImported = i - 5;
                        _logger.LogInformation($"Test session progress: {i}%");
                    }
                    session.Status = "Completed";
                    session.CompletedAt = DateTime.UtcNow;
                });

                return Json(new
                {
                    success = true,
                    message = "Test session created",
                    sessionId = session.Id
                });
            }
            catch (Exception ex)
            {
                return Json(new
                {
                    success = false,
                    message = ex.Message
                });
            }
        }
    }
}