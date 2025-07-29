
using Microsoft.AspNetCore.Mvc;

namespace ChessStudySystem.Web.Controllers
{
    public class ChessController : Controller
    {
        public IActionResult Study()
        {
            return View();
        }
    }
}