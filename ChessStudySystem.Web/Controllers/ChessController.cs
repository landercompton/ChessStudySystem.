using Microsoft.AspNetCore.Mvc;
using ChessStudySystem.Web.Models;
using ChessStudySystem.Web.Models.Lichess;
using ChessStudySystem.Web.Data;
using ChessStudySystem.Web.Services;
using Microsoft.EntityFrameworkCore;

namespace ChessStudySystem.Web.Controllers
{
    public class ChessController : Controller
    {
        private readonly ApplicationDbContext _context;
        private readonly IOpeningImportService _importService;
        private readonly ILogger<ChessController> _logger;
        private readonly LichessDbContext _lichessContext;

        public ChessController(
            ApplicationDbContext context, 
            IOpeningImportService importService,
            ILogger<ChessController> logger,
            LichessDbContext lichessContext)
        {
            _context = context;
            _importService = importService;
            _logger = logger;
            _lichessContext = lichessContext;
        }

        public async Task<IActionResult> Study(string? gameId = null)
        {
            LichessGame? game = null;
            
            if (!string.IsNullOrEmpty(gameId))
            {
                game = await _lichessContext.Games
                    .FirstOrDefaultAsync(g => g.LichessId == gameId);
            }
            
            ViewBag.Game = game;
            return View();
        }

        public IActionResult ImportEco()
        {
            return View();
        }

        [HttpPost]
        [RequestSizeLimit(52428800)] // 50MB limit
        public async Task<IActionResult> ImportEco(IFormFile jsonFile)
        {
            if (jsonFile == null || jsonFile.Length == 0)
            {
                TempData["Error"] = "Please select a valid JSON file.";
                return RedirectToAction("ImportEco");
            }

            if (!jsonFile.FileName.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
            {
                TempData["Error"] = "Please select a JSON file.";
                return RedirectToAction("ImportEco");
            }

            if (jsonFile.Length > 52428800) // 50MB
            {
                TempData["Error"] = "File size exceeds the maximum limit of 50MB.";
                return RedirectToAction("ImportEco");
            }

            try
            {
                using var stream = jsonFile.OpenReadStream();
                var importResult = await _importService.ImportFromJsonAsync(stream);
                
                if (importResult.Success)
                {
                    TempData["Success"] = importResult.Message;
                }
                else
                {
                    var errorMessage = importResult.Message ?? "Import failed";
                    if (importResult.Errors.Any())
                    {
                        errorMessage += " Details: " + string.Join(", ", importResult.Errors.Take(3));
                        if (importResult.Errors.Count > 3)
                        {
                            errorMessage += $" ... and {importResult.Errors.Count - 3} more errors.";
                        }
                    }
                    TempData["Error"] = errorMessage;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unexpected error during import");
                TempData["Error"] = "An unexpected error occurred during import. Please try again.";
            }

            return RedirectToAction("ImportEco");
        }

        public async Task<IActionResult> ViewOpenings(int page = 1, int pageSize = 50, string? search = null)
        {
            IQueryable<Opening> query = _context.Openings;

            // Apply search filter if provided
            if (!string.IsNullOrWhiteSpace(search))
            {
                query = query.Where(o => 
                    (o.Name != null && o.Name.Contains(search)) ||
                    (o.Eco != null && o.Eco.Contains(search)) ||
                    (o.Moves != null && o.Moves.Contains(search)));
                ViewBag.SearchTerm = search;
            }

            var openings = await query
                .OrderBy(o => o.Eco)
                .ThenBy(o => o.Name)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var totalCount = await query.CountAsync();
            
            ViewBag.CurrentPage = page;
            ViewBag.PageSize = pageSize;
            ViewBag.TotalCount = totalCount;
            ViewBag.TotalPages = (int)Math.Ceiling((double)totalCount / pageSize);

            return View(openings);
        }

        public async Task<IActionResult> SearchOpenings(string searchTerm)
        {
            if (string.IsNullOrWhiteSpace(searchTerm))
            {
                return Json(new List<object>());
            }

            var openings = await _context.Openings
                .Where(o => (o.Name != null && o.Name.Contains(searchTerm)) || 
                           (o.Eco != null && o.Eco.Contains(searchTerm)))
                .Take(20)
                .Select(o => new { 
                    o.Id, 
                    o.Name, 
                    o.Eco, 
                    o.Fen,
                    o.Moves
                })
                .ToListAsync();

            return Json(openings);
        }

        public async Task<IActionResult> GetOpeningDetails(int id)
        {
            var opening = await _context.Openings.FindAsync(id);
            
            if (opening == null)
            {
                return NotFound();
            }

            return Json(new {
                opening.Id,
                opening.Name,
                opening.Eco,
                opening.Fen,
                opening.Moves,
                opening.Src,
                opening.Scid,
                opening.Aliases
            });
        }

        [HttpGet]
        public async Task<IActionResult> FindOpeningByFen(string fen)
        {
            if (string.IsNullOrWhiteSpace(fen))
            {
                return Json(null);
            }

            var opening = await _context.Openings
                .FirstOrDefaultAsync(o => o.Fen == fen);

            if (opening == null)
            {
                return Json(null);
            }

            return Json(new {
                opening.Id,
                opening.Name,
                opening.Eco,
                opening.Moves,
                opening.Src,
                opening.Scid
            });
        }

        [HttpGet]
        public async Task<IActionResult> FindOpeningsByEco(string eco)
        {
            if (string.IsNullOrWhiteSpace(eco))
            {
                return Json(new List<object>());
            }

            var openings = await _context.Openings
                .Where(o => o.Eco == eco)
                .Select(o => new {
                    o.Id,
                    o.Name,
                    o.Eco,
                    o.Fen,
                    o.Moves,
                    o.Src
                })
                .ToListAsync();

            return Json(openings);
        }

        public async Task<IActionResult> GetDatabaseStats()
        {
            try
            {
                var totalOpenings = await _context.Openings.CountAsync();
                var totalEcoCodes = await _context.Openings
                    .Where(o => !string.IsNullOrEmpty(o.Eco))
                    .Select(o => o.Eco)
                    .Distinct()
                    .CountAsync();
                var totalSources = await _context.Openings
                    .Where(o => !string.IsNullOrEmpty(o.Src))
                    .Select(o => o.Src)
                    .Distinct()
                    .CountAsync();

                return Json(new {
                    totalOpenings,
                    totalEcoCodes,
                    totalSources,
                    lastImport = "Recently" // You can track this in database if needed
                });
            }
            catch
            {
                return Json(new {
                    totalOpenings = 0,
                    totalEcoCodes = 0,
                    totalSources = 0,
                    lastImport = "Unknown"
                });
            }
        }
    }
}