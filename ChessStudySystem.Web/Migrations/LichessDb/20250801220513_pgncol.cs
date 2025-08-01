using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChessStudySystem.Web.Migrations.LichessDb
{
    /// <inheritdoc />
    public partial class pgncol : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ImportSessions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Username = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    StartedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    TotalGamesFound = table.Column<int>(type: "INTEGER", nullable: false),
                    GamesProcessed = table.Column<int>(type: "INTEGER", nullable: false),
                    GamesImported = table.Column<int>(type: "INTEGER", nullable: false),
                    GamesSkipped = table.Column<int>(type: "INTEGER", nullable: false),
                    GamesErrored = table.Column<int>(type: "INTEGER", nullable: false),
                    FiltersUsed = table.Column<string>(type: "TEXT", nullable: false),
                    ErrorMessage = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    Errors = table.Column<string>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ImportSessions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Username = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    DisplayName = table.Column<string>(type: "TEXT", maxLength: 100, nullable: true),
                    Title = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    IsOnline = table.Column<bool>(type: "INTEGER", nullable: false),
                    JoinedAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    LastSeenAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Country = table.Column<string>(type: "TEXT", maxLength: 5, nullable: true),
                    IsPatron = table.Column<bool>(type: "INTEGER", nullable: false),
                    IsVerified = table.Column<bool>(type: "INTEGER", nullable: false),
                    TotalGames = table.Column<int>(type: "INTEGER", nullable: false),
                    RatedGames = table.Column<int>(type: "INTEGER", nullable: false),
                    Wins = table.Column<int>(type: "INTEGER", nullable: false),
                    Losses = table.Column<int>(type: "INTEGER", nullable: false),
                    Draws = table.Column<int>(type: "INTEGER", nullable: false),
                    Performances = table.Column<string>(type: "TEXT", nullable: false),
                    Bio = table.Column<string>(type: "TEXT", nullable: true),
                    FollowersCount = table.Column<int>(type: "INTEGER", nullable: true),
                    FollowingCount = table.Column<int>(type: "INTEGER", nullable: true),
                    LastUpdated = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Games",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    LichessId = table.Column<string>(type: "TEXT", maxLength: 20, nullable: false),
                    Username = table.Column<string>(type: "TEXT", maxLength: 50, nullable: false),
                    Rated = table.Column<bool>(type: "INTEGER", nullable: false),
                    Variant = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true),
                    Speed = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true),
                    PerfType = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    LastMoveAt = table.Column<DateTime>(type: "TEXT", nullable: true),
                    Status = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true),
                    Winner = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    Termination = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    WhiteUsername = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    WhiteRating = table.Column<int>(type: "INTEGER", nullable: true),
                    WhiteRatingDiff = table.Column<int>(type: "INTEGER", nullable: true),
                    WhiteTitle = table.Column<string>(type: "TEXT", nullable: true),
                    BlackUsername = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    BlackRating = table.Column<int>(type: "INTEGER", nullable: true),
                    BlackRatingDiff = table.Column<int>(type: "INTEGER", nullable: true),
                    BlackTitle = table.Column<string>(type: "TEXT", nullable: true),
                    UserColor = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    UserResult = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    UserRating = table.Column<int>(type: "INTEGER", nullable: true),
                    UserRatingDiff = table.Column<int>(type: "INTEGER", nullable: true),
                    OpponentUsername = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    OpponentRating = table.Column<int>(type: "INTEGER", nullable: true),
                    OpponentTitle = table.Column<string>(type: "TEXT", nullable: true),
                    OpeningEco = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    OpeningName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    OpeningPly = table.Column<int>(type: "INTEGER", nullable: true),
                    TimeControl = table.Column<string>(type: "TEXT", maxLength: 20, nullable: true),
                    InitialTime = table.Column<int>(type: "INTEGER", nullable: true),
                    Increment = table.Column<int>(type: "INTEGER", nullable: true),
                    TotalTime = table.Column<int>(type: "INTEGER", nullable: true),
                    Moves = table.Column<string>(type: "TEXT", nullable: true),
                    Pgn = table.Column<string>(type: "TEXT", nullable: true),
                    MovesCount = table.Column<int>(type: "INTEGER", nullable: true),
                    HasAnalysis = table.Column<bool>(type: "INTEGER", nullable: false),
                    Analysis = table.Column<string>(type: "TEXT", nullable: true),
                    ImportedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    ImportSessionId = table.Column<int>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Games", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Games_ImportSessions_ImportSessionId",
                        column: x => x.ImportSessionId,
                        principalTable: "ImportSessions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Games_CreatedAt",
                table: "Games",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_Games_ImportSessionId",
                table: "Games",
                column: "ImportSessionId");

            migrationBuilder.CreateIndex(
                name: "IX_Games_LichessId",
                table: "Games",
                column: "LichessId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Games_OpeningEco",
                table: "Games",
                column: "OpeningEco");

            migrationBuilder.CreateIndex(
                name: "IX_Games_OpeningEco_UserResult",
                table: "Games",
                columns: new[] { "OpeningEco", "UserResult" });

            migrationBuilder.CreateIndex(
                name: "IX_Games_OpponentUsername",
                table: "Games",
                column: "OpponentUsername");

            migrationBuilder.CreateIndex(
                name: "IX_Games_PerfType",
                table: "Games",
                column: "PerfType");

            migrationBuilder.CreateIndex(
                name: "IX_Games_Username",
                table: "Games",
                column: "Username");

            migrationBuilder.CreateIndex(
                name: "IX_Games_Username_CreatedAt",
                table: "Games",
                columns: new[] { "Username", "CreatedAt" });

            migrationBuilder.CreateIndex(
                name: "IX_Games_Username_PerfType",
                table: "Games",
                columns: new[] { "Username", "PerfType" });

            migrationBuilder.CreateIndex(
                name: "IX_Games_Username_UserColor",
                table: "Games",
                columns: new[] { "Username", "UserColor" });

            migrationBuilder.CreateIndex(
                name: "IX_Games_UserResult",
                table: "Games",
                column: "UserResult");

            migrationBuilder.CreateIndex(
                name: "IX_ImportSessions_StartedAt",
                table: "ImportSessions",
                column: "StartedAt");

            migrationBuilder.CreateIndex(
                name: "IX_ImportSessions_Status",
                table: "ImportSessions",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_ImportSessions_Username",
                table: "ImportSessions",
                column: "Username");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Username",
                table: "Users",
                column: "Username",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Games");

            migrationBuilder.DropTable(
                name: "Users");

            migrationBuilder.DropTable(
                name: "ImportSessions");
        }
    }
}
