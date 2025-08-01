using System.ComponentModel.DataAnnotations;

namespace ChessStudySystem.Web.Models.Lichess
{
    public class LichessGame
    {
        public int Id { get; set; }
        
        [Required]
        public string LichessId { get; set; } = string.Empty;
        
        [Required]
        public string Username { get; set; } = string.Empty; // The user whose games we imported
        
        // Basic game info
        public bool Rated { get; set; }
        public string? Variant { get; set; }
        public string? Speed { get; set; }
        public string? PerfType { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? LastMoveAt { get; set; }
        public string? Status { get; set; }
        public string? Winner { get; set; }
        public string? Termination { get; set; }
        
        // Players
        public string? WhiteUsername { get; set; }
        public int? WhiteRating { get; set; }
        public int? WhiteRatingDiff { get; set; }
        public string? WhiteTitle { get; set; }
        public string? BlackUsername { get; set; }
        public int? BlackRating { get; set; }
        public int? BlackRatingDiff { get; set; }
        public string? BlackTitle { get; set; }
        
        // User-specific info (for the imported user)
        public string? UserColor { get; set; } // "white" or "black"
        public string? UserResult { get; set; } // "win", "loss", "draw"
        public int? UserRating { get; set; }
        public int? UserRatingDiff { get; set; }
        public string? OpponentUsername { get; set; }
        public int? OpponentRating { get; set; }
        public string? OpponentTitle { get; set; }
        
        // Opening
        public string? OpeningEco { get; set; }
        public string? OpeningName { get; set; }
        public int? OpeningPly { get; set; }
        
        // Time control
        public string? TimeControl { get; set; } // e.g., "600+5"
        public int? InitialTime { get; set; }
        public int? Increment { get; set; }
        public int? TotalTime { get; set; }
        
        // Game data
        public string? Moves { get; set; }
        public string? Pgn { get; set; }
        public int? MovesCount { get; set; }
        
        // Analysis data
        public bool HasAnalysis { get; set; }
        public string? Analysis { get; set; } // JSON string of analysis data
        
        // Import tracking
        public DateTime ImportedAt { get; set; }
        public int ImportSessionId { get; set; }
        
        // Navigation property
        public ImportSession? ImportSession { get; set; }
    }

    public class LichessUser
    {
        public int Id { get; set; }
        
        [Required]
        public string Username { get; set; } = string.Empty;
        
        public string? DisplayName { get; set; }
        public string? Title { get; set; }
        public bool IsOnline { get; set; }
        public DateTime? JoinedAt { get; set; }
        public DateTime? LastSeenAt { get; set; }
        public string? Country { get; set; }
        public bool IsPatron { get; set; }
        public bool IsVerified { get; set; }
        
        // Game counts
        public int TotalGames { get; set; }
        public int RatedGames { get; set; }
        public int Wins { get; set; }
        public int Losses { get; set; }
        public int Draws { get; set; }
        
        // Performance ratings by category
        public Dictionary<string, PerformanceStats> Performances { get; set; } = new();
        
        // Profile data
        public string? Bio { get; set; }
        public int? FollowersCount { get; set; }
        public int? FollowingCount { get; set; }
        
        // Cache info
        public DateTime LastUpdated { get; set; }
    }

    public class PerformanceStats
    {
        public int Rating { get; set; }
        public int RatingDeviation { get; set; }
        public bool IsProvisional { get; set; }
        public int Games { get; set; }
        public int Wins { get; set; }
        public int Losses { get; set; }
        public int Draws { get; set; }
        public double WinRate => Games > 0 ? (double)Wins / Games * 100 : 0;
    }

    public class ImportSession
    {
        public int Id { get; set; }
        
        [Required]
        public string Username { get; set; } = string.Empty;
        
        public DateTime StartedAt { get; set; }
        public DateTime? CompletedAt { get; set; }
        public string Status { get; set; } = "Running"; // Running, Completed, Failed, Cancelled
        
        // Progress tracking
        public int TotalGamesFound { get; set; }
        public int GamesProcessed { get; set; }
        public int GamesImported { get; set; }
        public int GamesSkipped { get; set; }
        public int GamesErrored { get; set; }
        
        // Filters used in this import
        public Dictionary<string, object> FiltersUsed { get; set; } = new();
        
        // Error tracking
        public string? ErrorMessage { get; set; }
        public List<string> Errors { get; set; } = new();
        
        // Navigation properties
        public List<LichessGame> Games { get; set; } = new();
        
        public double ProgressPercentage => TotalGamesFound > 0 ? (double)GamesProcessed / TotalGamesFound * 100 : 0;
        public bool IsCompleted => Status == "Completed" || Status == "Failed" || Status == "Cancelled";
        public TimeSpan? Duration => CompletedAt.HasValue ? CompletedAt.Value - StartedAt : DateTime.UtcNow - StartedAt;
    }

    public class LichessImportRequest
    {
        [Required]
        [StringLength(50, MinimumLength = 2)]
        public string Username { get; set; } = string.Empty;
        
        // Game quantity filters
        [Range(1, 10000)]
        public int? MaxGames { get; set; }
        
        // Date filters
        [DataType(DataType.Date)]
        public DateTime? Since { get; set; }
        
        [DataType(DataType.Date)]
        public DateTime? Until { get; set; }
        
        // Game type filters (only standard chess variants)
        public List<string> PerfTypes { get; set; } = new(); // bullet, blitz, rapid, classical, correspondence
        
        // Opponent filter
        [StringLength(50)]
        public string? Opponent { get; set; }
        
        // Color filter
        public string? Color { get; set; } // "white", "black", or null for both
        
        // Rating filters
        public bool? RatedOnly { get; set; }
        
        // Analysis filter
        public bool? AnalyzedOnly { get; set; }
        
        // Game completion filter
        public bool OnlyFinished { get; set; } = true;
        
        // Include additional data
        public bool IncludeAnalysis { get; set; } = true;
        public bool IncludePgn { get; set; } = false;
        
        // Validation
        public bool IsValid(out List<string> errors)
        {
            errors = new List<string>();
            
            if (string.IsNullOrWhiteSpace(Username))
                errors.Add("Username is required");
            
            if (Since.HasValue && Until.HasValue && Since.Value > Until.Value)
                errors.Add("'Since' date must be before 'Until' date");
            
            if (MaxGames.HasValue && MaxGames.Value < 1)
                errors.Add("Maximum games must be at least 1");
            
            return !errors.Any();
        }
        
        public string GetDisplayFilters()
        {
            var filters = new List<string>();
            
            if (MaxGames.HasValue)
                filters.Add($"Max: {MaxGames:N0}");
            
            if (PerfTypes.Any())
                filters.Add($"Types: {string.Join(", ", PerfTypes)}");
            
            if (!string.IsNullOrEmpty(Opponent))
                filters.Add($"vs {Opponent}");
            
            if (!string.IsNullOrEmpty(Color))
                filters.Add($"as {Color}");
            
            if (RatedOnly.HasValue)
                filters.Add(RatedOnly.Value ? "Rated only" : "Casual only");
            
            if (AnalyzedOnly == true)
                filters.Add("Analyzed only");
            
            if (Since.HasValue)
                filters.Add($"Since {Since.Value:MMM dd, yyyy}");
            
            if (Until.HasValue)
                filters.Add($"Until {Until.Value:MMM dd, yyyy}");
            
            return filters.Any() ? string.Join(" • ", filters) : "No filters";
        }
        
        public Dictionary<string, object> ToFilterDictionary()
        {
            var dict = new Dictionary<string, object>();
            
            if (MaxGames.HasValue) dict["maxGames"] = MaxGames.Value;
            if (Since.HasValue) dict["since"] = Since.Value;
            if (Until.HasValue) dict["until"] = Until.Value;
            if (PerfTypes.Any()) dict["perfTypes"] = PerfTypes;
            if (!string.IsNullOrEmpty(Opponent)) dict["opponent"] = Opponent;
            if (!string.IsNullOrEmpty(Color)) dict["color"] = Color;
            if (RatedOnly.HasValue) dict["ratedOnly"] = RatedOnly.Value;
            if (AnalyzedOnly.HasValue) dict["analyzedOnly"] = AnalyzedOnly.Value;
            dict["onlyFinished"] = OnlyFinished;
            dict["includeAnalysis"] = IncludeAnalysis;
            dict["includePgn"] = IncludePgn;
            
            return dict;
        }
    }

    public class LichessGameSearchRequest
    {
        public string? Username { get; set; }
        public string? Opponent { get; set; }
        public string? Opening { get; set; }
        public string? EcoCode { get; set; }
        public string? Result { get; set; }
        public string? Color { get; set; }
        public List<string> PerfTypes { get; set; } = new();
        public DateTime? FromDate { get; set; }
        public DateTime? ToDate { get; set; }
        public int? MinRating { get; set; }
        public int? MaxRating { get; set; }
        public bool? RatedOnly { get; set; }
        public bool? AnalyzedOnly { get; set; }
        public string? Status { get; set; }
        public int? MinMoves { get; set; }
        public int? MaxMoves { get; set; }
        
        // Pagination
        public int Page { get; set; } = 1;
        public int PageSize { get; set; } = 50;
        
        // Sorting
        public string SortBy { get; set; } = "CreatedAt";
        public string SortDirection { get; set; } = "desc";
    }

    public class GameStatistics
    {
        public int TotalGames { get; set; }
        public int Wins { get; set; }
        public int Losses { get; set; }
        public int Draws { get; set; }
        public double WinRate => TotalGames > 0 ? (double)Wins / TotalGames * 100 : 0;
        public double DrawRate => TotalGames > 0 ? (double)Draws / TotalGames * 100 : 0;
        
        public Dictionary<string, int> GamesByTimeControl { get; set; } = new();
        public Dictionary<string, int> GamesByColor { get; set; } = new();
        public Dictionary<string, int> GamesByResult { get; set; } = new();
        public Dictionary<string, int> GamesByOpening { get; set; } = new();
        public Dictionary<string, int> GamesByOpponent { get; set; } = new();
        
        public int? HighestRating { get; set; }
        public int? LowestRating { get; set; }
        public int? AverageRating { get; set; }
        public int? RatingChange { get; set; }
        
        public DateTime? FirstGame { get; set; }
        public DateTime? LastGame { get; set; }
        
        public int LongestGame { get; set; } // in moves
        public int ShortestGame { get; set; } = int.MaxValue;
        public double AverageGameLength { get; set; }
    }
}