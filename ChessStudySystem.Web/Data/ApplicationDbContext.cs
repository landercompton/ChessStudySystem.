using Microsoft.EntityFrameworkCore;
using ChessStudySystem.Web.Models;
using System.Text.Json;

namespace ChessStudySystem.Web.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
        {
        }

        public DbSet<Opening> Openings { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure the Opening entity
            modelBuilder.Entity<Opening>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Fen).HasMaxLength(200);
                entity.Property(e => e.Eco).HasMaxLength(10);
                entity.Property(e => e.Name).HasMaxLength(500);
                entity.Property(e => e.Moves).HasMaxLength(1000);
                entity.Property(e => e.Src).HasMaxLength(50);
                entity.Property(e => e.Scid).HasMaxLength(50);
                
                // Configure the Aliases property to be stored as JSON
                entity.Property(e => e.Aliases)
                    .HasConversion(
                        v => JsonSerializer.Serialize(v, JsonSerializerOptions.Default),
                        v => JsonSerializer.Deserialize<Dictionary<string, string>>(v, JsonSerializerOptions.Default) ?? new Dictionary<string, string>()
                    );

                // Add indexes for better performance
                entity.HasIndex(e => e.Fen);
                entity.HasIndex(e => e.Eco);
                entity.HasIndex(e => e.Name);
            });
        }
    }
}