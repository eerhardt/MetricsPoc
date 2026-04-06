using MetricsPoc.Server.Data;
using MetricsPoc.Server.Models;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

// Add service defaults & Aspire client integrations.
builder.AddServiceDefaults();
builder.AddNpgsqlDbContext<TodoDbContext>("todosdb", settings =>
{
    settings.DisableMetrics = true; // Disable metrics because we want to enable it from the AppHost
});

// Add services to the container.
builder.Services.AddProblemDetails();

// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
builder.Services.AddOpenApi();

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var dbContext = scope.ServiceProvider.GetRequiredService<TodoDbContext>();
    await dbContext.Database.EnsureCreatedAsync();
}

// Configure the HTTP request pipeline.
app.UseExceptionHandler();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

var api = app.MapGroup("/api/todos");

api.MapGet("/", async (TodoDbContext dbContext) =>
{
    var todos = await dbContext.Todos
        .OrderByDescending(todo => todo.CreatedAtUtc)
        .Select(todo => new TodoResponse(
            todo.Id,
            todo.Title,
            todo.IsCompleted,
            todo.CreatedAtUtc,
            todo.UpdatedAtUtc))
        .ToListAsync();

    return Results.Ok(todos);
})
.WithName("GetTodos");

api.MapPost("/", async (CreateTodoRequest request, TodoDbContext dbContext) =>
{
    var title = request.Title?.Trim();
    if (string.IsNullOrWhiteSpace(title))
    {
        return Results.BadRequest(new { message = "Title is required." });
    }

    var now = DateTime.UtcNow;
    var todo = new TodoItem
    {
        Title = title,
        IsCompleted = false,
        CreatedAtUtc = now,
        UpdatedAtUtc = now
    };

    dbContext.Todos.Add(todo);
    await dbContext.SaveChangesAsync();

    return Results.Created($"/api/todos/{todo.Id}", new TodoResponse(
        todo.Id,
        todo.Title,
        todo.IsCompleted,
        todo.CreatedAtUtc,
        todo.UpdatedAtUtc));
})
.WithName("CreateTodo");

api.MapPut("/{id:int}", async (int id, UpdateTodoRequest request, TodoDbContext dbContext) =>
{
    var title = request.Title?.Trim();
    if (string.IsNullOrWhiteSpace(title))
    {
        return Results.BadRequest(new { message = "Title is required." });
    }

    var todo = await dbContext.Todos.FindAsync(id);
    if (todo is null)
    {
        return Results.NotFound();
    }

    todo.Title = title;
    todo.IsCompleted = request.IsCompleted;
    todo.UpdatedAtUtc = DateTime.UtcNow;

    await dbContext.SaveChangesAsync();

    return Results.Ok(new TodoResponse(
        todo.Id,
        todo.Title,
        todo.IsCompleted,
        todo.CreatedAtUtc,
        todo.UpdatedAtUtc));
})
.WithName("UpdateTodo");

api.MapDelete("/{id:int}", async (int id, TodoDbContext dbContext) =>
{
    var todo = await dbContext.Todos.FindAsync(id);
    if (todo is null)
    {
        return Results.NotFound();
    }

    dbContext.Todos.Remove(todo);
    await dbContext.SaveChangesAsync();

    return Results.NoContent();
})
.WithName("DeleteTodo");

app.MapDefaultEndpoints();

app.UseFileServer();

app.Run();

record CreateTodoRequest(string? Title);

record UpdateTodoRequest(string? Title, bool IsCompleted);

record TodoResponse(int Id, string Title, bool IsCompleted, DateTime CreatedAtUtc, DateTime UpdatedAtUtc);
