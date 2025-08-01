using ChessStudySystem.Web.Data;
using ChessStudySystem.Web.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

// Add Entity Framework - Main database
builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection") ?? "Data Source=chess.db"));

// Add Entity Framework - Lichess database
builder.Services.AddDbContext<LichessDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("LichessConnection") ?? "Data Source=lichess.db"));

// Register services
builder.Services.AddScoped<IOpeningImportService, OpeningImportService>();
builder.Services.AddScoped<ILichessGameImportService, LichessGameImportService>();

// Add HttpClient for Lichess API
builder.Services.AddHttpClient<ILichessGameImportService, LichessGameImportService>();

var app = builder.Build();

// Create databases on startup
using (var scope = app.Services.CreateScope())
{
    var mainContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
    var lichessContext = scope.ServiceProvider.GetRequiredService<LichessDbContext>();
    
    mainContext.Database.EnsureCreated();
    lichessContext.Database.EnsureCreated();
}

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();