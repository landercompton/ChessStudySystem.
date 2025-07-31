using System.Diagnostics.Eventing.Reader;

namespace ChessStudySystem.Web.Models
{

    //"rnbqkbnr/pppppppp/8/8/8/7N/PPPPPPPP/RNBQKB1R b KQkq - 1 1": {
    //    "src": "eco_tsv",
    //    "eco": "A00",
    //    "moves": "1. Nh3",
    //    "name": "Amar Opening",
    //    "scid": "A00g",
    //    "aliases": {
    //        "scid": "Amar/Paris Opening",
    //        "eco_wikip": "Irregular Openings: Amar Opening",
    //        "ct": "Amar Opening, General",
    //        "chessGraph": "Amar; Paris Opening",
    //        "chronos": "Amar (Paris) opening",
    //        "icsbot": "Amar; Paris Opening "
    //    }
    //},


    public class Opening
    {
        public int Id { get; set; }
        public string? Fen { get; set; }
        public string? Eco { get; set; }
        public string? Name { get; set; }
        public string? Moves { get; set; }
        public string? Src { get; set; }
        public string? Scid { get; set; }
        public Dictionary<string, string> Aliases { get; set; } = new Dictionary<string, string>();
        public bool IsEcoRoot { get; set; } = false;

    }
}
