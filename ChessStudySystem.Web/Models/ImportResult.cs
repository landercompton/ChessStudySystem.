namespace ChessStudySystem.Web.Models
{
    public class ImportResult
    {
        public int ProcessedCount { get; set; }
        public int SkippedCount { get; set; }
        public int ErrorCount { get; set; }
        public List<string> Errors { get; set; } = new List<string>();
        public bool Success { get; set; }
        public string? Message { get; set; }
    }
}