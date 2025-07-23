using Microsoft.AspNetCore.Mvc;

namespace ChessStudySystem.Web.Controllers
{
    public class ChessController : Controller
    {
        public IActionResult Study()
        {
            return View();
        }

        [HttpPost]
        public IActionResult MakeMove([FromBody] MakeMoveRequest request)
        {
            // TODO: Implement server-side move validation
            // For now, just echo back the move
            
            return Json(new
            {
                success = true,
                fen = request.Fen,
                move = request.Move,
                evaluation = "+0.25", // Placeholder
                bestMove = "e2e4" // Placeholder
            });
        }
    }

    public class MakeMoveRequest
    {
        public string Fen { get; set; } = "";
        public string Move { get; set; } = "";
        public string From { get; set; } = "";
        public string To { get; set; } = "";
    }
}