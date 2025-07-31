using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using ChessStudySystem.Web.Models; // Adjust the namespace according to your project structure
using ChessStudySystem.Web.Data; // Adjust the namespace according to your project structure
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore; // Assuming you are using Entity Framework Core

namespace ChessStudySystem.Web.Controllers
{
    public class ChessController : Controller
    {
        public IActionResult Study()
        {
            return View();
        }


        public IActionResult ImportEco()
        {
            return View();
        }

        [HttpPost]
        public IActionResult ImportEco(FormFile formFile)
        {


            return RedirectToAction("ImportEco");
        }




    }

}