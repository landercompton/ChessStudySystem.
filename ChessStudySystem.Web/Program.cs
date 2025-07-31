// Add this to your Program.cs to fix SharedArrayBuffer CORS issue

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

// IMPORTANT: Add CORS headers for SharedArrayBuffer support
//app.Use(async (context, next) =>
//{
//    // These headers are required for SharedArrayBuffer and WebAssembly threading
//    context.Response.Headers.Add("Cross-Origin-Embedder-Policy", "require-corp");
//    context.Response.Headers.Add("Cross-Origin-Opener-Policy", "same-origin");
    
//    // Optional: Add other security headers
//    context.Response.Headers.Add("Cross-Origin-Resource-Policy", "cross-origin");
    
//    await next();
//});


app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();