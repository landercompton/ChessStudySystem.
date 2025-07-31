using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChessStudySystem.Web.Migrations
{
    /// <inheritdoc />
    public partial class init : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Openings",
                columns: table => new
                {
                    Id = table.Column<int>(type: "INTEGER", nullable: false)
                        .Annotation("Sqlite:Autoincrement", true),
                    Fen = table.Column<string>(type: "TEXT", maxLength: 200, nullable: true),
                    Eco = table.Column<string>(type: "TEXT", maxLength: 10, nullable: true),
                    Name = table.Column<string>(type: "TEXT", maxLength: 500, nullable: true),
                    Moves = table.Column<string>(type: "TEXT", maxLength: 1000, nullable: true),
                    Src = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    Scid = table.Column<string>(type: "TEXT", maxLength: 50, nullable: true),
                    Aliases = table.Column<string>(type: "TEXT", nullable: false),
                    IsEcoRoot = table.Column<bool>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Openings", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Openings_Eco",
                table: "Openings",
                column: "Eco");

            migrationBuilder.CreateIndex(
                name: "IX_Openings_Fen",
                table: "Openings",
                column: "Fen");

            migrationBuilder.CreateIndex(
                name: "IX_Openings_Name",
                table: "Openings",
                column: "Name");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Openings");
        }
    }
}
