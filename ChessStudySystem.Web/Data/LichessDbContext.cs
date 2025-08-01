using Microsoft.EntityFrameworkCore;
using ChessStudySystem.Web.Models.Lichess;
using System.Text.Json;

namespace ChessStudySystem.Web.Data
{
    public class LichessDbContext : DbContext
    {
        public LichessDbContext(DbContextOptions<LichessDbContext> options) : base(options)
        {
        }

        public DbSet<LichessGame> Games { get; set; }
        public DbSet<LichessUser> Users { get; set; }
        public DbSet<ImportSession> ImportSessions { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Configure LichessGame entity
            modelBuilder.Entity<LichessGame>(entity =>
            {
                entity.HasKey(e => e.Id);
                
                // Unique constraint on LichessId to prevent duplicates
                entity.HasIndex(e => e.LichessId).IsUnique();
                entity.Property(e => e.LichessId).HasMaxLength(20).IsRequired();
                
                entity.Property(e => e.Username).HasMaxLength(50).IsRequired();
                entity.Property(e => e.Variant).HasMaxLength(20);
                entity.Property(e => e.Speed).HasMaxLength(20);
                entity.Property(e => e.PerfType).HasMaxLength(20);
                entity.Property(e => e.Status).HasMaxLength(20);
                entity.Property(e => e.Winner).HasMaxLength(10);
                entity.Property(e => e.WhiteUsername).HasMaxLength(50);
                entity.Property(e => e.BlackUsername).HasMaxLength(50);
                entity.Property(e => e.UserColor).HasMaxLength(10);
                entity.Property(e => e.UserResult).HasMaxLength(10);
                entity.Property(e => e.OpponentUsername).HasMaxLength(50);
                entity.Property(e => e.OpeningEco).HasMaxLength(10);
                entity.Property(e => e.OpeningName).HasMaxLength(200);
                entity.Property(e => e.TimeControl).HasMaxLength(20);
                entity.Property(e => e.Termination).HasMaxLength(50);

                // Performance indexes
                entity.HasIndex(e => e.Username);
                entity.HasIndex(e => e.CreatedAt);
                entity.HasIndex(e => e.PerfType);
                entity.HasIndex(e => e.OpeningEco);
                entity.HasIndex(e => e.UserResult);
                entity.HasIndex(e => e.OpponentUsername);
                entity.HasIndex(e => new { e.Username, e.UserColor });
                entity.HasIndex(e => new { e.Username, e.PerfType });
                entity.HasIndex(e => new { e.Username, e.CreatedAt });
                entity.HasIndex(e => new { e.OpeningEco, e.UserResult });
            });

            // Configure LichessUser entity
            modelBuilder.Entity<LichessUser>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.HasIndex(e => e.Username).IsUnique();
                entity.Property(e => e.Username).HasMaxLength(50).IsRequired();
                entity.Property(e => e.DisplayName).HasMaxLength(100);
                entity.Property(e => e.Title).HasMaxLength(10);
                entity.Property(e => e.Country).HasMaxLength(5);
                
                // Store performance ratings as JSON
                entity.Property(e => e.Performances)
                    .HasConversion(
                        v => JsonSerializer.Serialize(v, JsonSerializerOptions.Default),
                        v => JsonSerializer.Deserialize<Dictionary<string, PerformanceStats>>(v, JsonSerializerOptions.Default) ?? new Dictionary<string, PerformanceStats>()
                    );
            });

            // Configure ImportSession entity
            modelBuilder.Entity<ImportSession>(entity =>
            {
                entity.HasKey(e => e.Id);
                entity.Property(e => e.Username).HasMaxLength(50).IsRequired();
                entity.Property(e => e.Status).HasMaxLength(20).IsRequired();
                entity.Property(e => e.ErrorMessage).HasMaxLength(1000);
                
                entity.HasIndex(e => e.Username);
                entity.HasIndex(e => e.StartedAt);
                entity.HasIndex(e => e.Status);
                
                // Store filters as JSON
                entity.Property(e => e.FiltersUsed)
                    .HasConversion(
                        v => JsonSerializer.Serialize(v, JsonSerializerOptions.Default),
                        v => JsonSerializer.Deserialize<Dictionary<string, object>>(v, JsonSerializerOptions.Default) ?? new Dictionary<string, object>()
                    );
            });
        }
    }
}