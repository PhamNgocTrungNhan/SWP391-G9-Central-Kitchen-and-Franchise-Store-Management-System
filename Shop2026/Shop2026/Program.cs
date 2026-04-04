using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Microsoft.OpenApi.Models;
using System.Security.Claims;
using System.Text.Json.Serialization;
using System.Text;
using System.Threading.Tasks;

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

// Bắt buộc thêm dòng này cho VNPAY để lấy IP Address
builder.Services.AddHttpContextAccessor();

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlServer(builder.Configuration.GetConnectionString("DefaultConnection")));

var jwtKey = builder.Configuration["Jwt:Key"] ?? "ChuoiBiMatCuaBanPhaiDaiHon16KyTu_123456789";
// Cookie cho Razor Pages (đăng nhập form); JWT cho /api/*. Trước đây chỉ có JWT nên trang [Authorize] luôn 401.
builder.Services.AddAuthentication(options =>
{
    options.DefaultScheme = "SmartAuth";
    options.DefaultChallengeScheme = "SmartAuth";
})
.AddPolicyScheme("SmartAuth", "SmartAuth", options =>
{
    options.ForwardDefaultSelector = context =>
        context.Request.Path.StartsWithSegments("/api")
            ? JwtBearerDefaults.AuthenticationScheme
            : CookieAuthenticationDefaults.AuthenticationScheme;
})
.AddCookie(CookieAuthenticationDefaults.AuthenticationScheme, options =>
{
    options.LoginPath = "/Account/Login";
    options.AccessDeniedPath = "/Account/Login";
})
.AddJwtBearer(JwtBearerDefaults.AuthenticationScheme, options =>
{
    // .NET 8: MapInboundClaims mặc định false → role trong JWT dễ không khớp RoleClaimType.
    options.MapInboundClaims = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = builder.Configuration["Jwt:Issuer"] ?? "Shop2026",
        ValidAudience = builder.Configuration["Jwt:Audience"] ?? "Shop2026Users",
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey)),
        // MapInboundClaims = true → claim role từ JWT được map sang ClaimTypes.Role (URI dài).
        // Nếu để RoleClaimType = "role" thì [Authorize(Roles)] không khớp → mọi user (kể cả ADMIN) bị 403.
        RoleClaimType = ClaimTypes.Role,
        NameClaimType = ClaimTypes.Name,
    };

    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = context =>
        {
            if (context.Principal?.Identity is not ClaimsIdentity id)
                return Task.CompletedTask;

            foreach (var claim in context.Principal.Claims)
            {
                var t = claim.Type;
                var isRole = t == ClaimTypes.Role
                    || string.Equals(t, "role", StringComparison.OrdinalIgnoreCase)
                    || string.Equals(t, "roles", StringComparison.OrdinalIgnoreCase)
                    || t.EndsWith("/role", StringComparison.Ordinal);

                if (!isRole)
                    continue;

                foreach (var part in claim.Value.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                {
                    if (!id.HasClaim(ClaimTypes.Role, part) && !id.HasClaim("role", part))
                    {
                        id.AddClaim(new Claim(ClaimTypes.Role, part));
                        id.AddClaim(new Claim("role", part));
                    }
                }
            }

            return Task.CompletedTask;
        }
    };
});

builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Shop2026 API", Version = "v1" });
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Description = "Nhập Token vào đây theo format: Bearer {token}",
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

if (builder.Environment.IsDevelopment())
{
    builder.Services.AddCors(options =>
    {
        options.AddDefaultPolicy(policy =>
        {
            policy
                .SetIsOriginAllowed(static origin =>
                    !string.IsNullOrEmpty(origin) &&
                    (origin.StartsWith("http://localhost", StringComparison.OrdinalIgnoreCase) ||
                     origin.StartsWith("http://127.0.0.1", StringComparison.OrdinalIgnoreCase)))
                .AllowAnyHeader()
                .AllowAnyMethod();
        });
    });
}

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "Shop2026 API v1"));
}

app.UseStaticFiles();
app.UseRouting();
if (app.Environment.IsDevelopment())
{
    app.UseCors();
}
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();
app.MapRazorPages();
app.Run();
