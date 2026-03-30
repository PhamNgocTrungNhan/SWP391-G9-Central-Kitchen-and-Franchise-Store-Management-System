using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Text.Json.Serialization;
using System.Text;

using PayOS;

using Shop2026.Context;
using Shop2026.DAL;
using Shop2026.DLL;
using Shop2026.Models;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers().AddJsonOptions(options =>
{
    options.JsonSerializerOptions.ReferenceHandler = ReferenceHandler.IgnoreCycles;
});
builder.Services.AddRazorPages();

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));


var jwtKey = builder.Configuration["Jwt:Key"] ?? "ChuoiBiMatCuaBanPhaiDaiHon16KyTu_123456789";
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "Shop2026",
            ValidAudience = builder.Configuration["Jwt:Audience"] ?? "Shop2026Users",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Shop2026 API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = " Token + Key with format: Bearer {token}",
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
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            new string[] {}
        }
    });
});


string clientId = builder.Configuration["PayOS:ClientId"] ?? throw new Exception("Lack PayOS:ClientId");
string apiKey = builder.Configuration["PayOS:ApiKey"] ?? throw new Exception("Lack PayOS:ApiKey");
string checksumKey = builder.Configuration["PayOS:ChecksumKey"] ?? throw new Exception("Lack PayOS:ChecksumKey");

PayOSClient payOS = new PayOSClient(clientId, apiKey, checksumKey);
builder.Services.AddSingleton(payOS);

// ==========================================
// ĐĂNG KÝ REPOSITORY & SERVICE
// ==========================================
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

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Shop2026 API v1"));
}

app.UseStaticFiles();
app.UseRouting();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapRazorPages();
app.Run();
