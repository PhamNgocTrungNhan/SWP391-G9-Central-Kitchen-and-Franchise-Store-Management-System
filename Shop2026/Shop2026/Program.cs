using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.Cookies;
using Shop2026.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddRazorPages();

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.LoginPath = "/Account/Login"; 
        options.AccessDeniedPath = "/Account/AccessDenied"; 
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
    });

<<<<<<< Updated upstream
=======
// SWAGGER TEST
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Shop2026 API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Input the code when login successfully like this : Bearer + the code ",
        Name = "Authorization",
        In = ParameterLocation.Header,
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference
                {
                    Type = ReferenceType.SecurityScheme,
                    Id = "Bearer"
                }
            },
            new string[] {}
        }
    });
});


// DAL O DAY 
builder.Services.AddScoped<AuthRepository>();
builder.Services.AddScoped<UserRepository>();
builder.Services.AddScoped<OrganizationRepository>();
builder.Services.AddScoped<InternalOrderRepository>();
builder.Services.AddScoped<CategoryRepository>();
builder.Services.AddScoped<ProductRepository>();
builder.Services.AddScoped<RecipeRepository>();
builder.Services.AddScoped<ProductionBatchRepository>();
builder.Services.AddScoped<InventoryRepository>();
builder.Services.AddScoped<DashboardRepository>();
builder.Services.AddScoped<SupplierRepository>();
builder.Services.AddScoped<TransactionRepository>();
// DLL O DAY
builder.Services.AddScoped<AuthService>();
builder.Services.AddScoped<UserService>();
builder.Services.AddScoped<OrganizationService>();
builder.Services.AddScoped<InternalOrderService>();
builder.Services.AddScoped<CategoryService>();
builder.Services.AddScoped<ProductService>();
builder.Services.AddScoped<RecipeService>();
builder.Services.AddScoped<ProductionBatchService>();
builder.Services.AddScoped<InventoryService>();
builder.Services.AddScoped<DashboardService>();
builder.Services.AddScoped<SupplierService>();
builder.Services.AddScoped<TransactionService>();

builder.Services.AddHostedService<ExpiredStockScannerJob>();

>>>>>>> Stashed changes
var app = builder.Build();

app.UseStaticFiles();
app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllers();
app.MapRazorPages();

app.Run();