using MetricsPoc.Server.Models;
using Microsoft.EntityFrameworkCore;

namespace MetricsPoc.Server.Data;

public class TodoDbContext(DbContextOptions<TodoDbContext> options) : DbContext(options)
{
    public DbSet<TodoItem> Todos => Set<TodoItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<TodoItem>(entity =>
        {
            entity.ToTable("Todos");
            entity.HasKey(todo => todo.Id);
            entity.Property(todo => todo.Id).ValueGeneratedOnAdd();
            entity.Property(todo => todo.Title).HasMaxLength(200).IsRequired();
            entity.Property(todo => todo.CreatedAtUtc).HasColumnType("timestamp with time zone");
            entity.Property(todo => todo.UpdatedAtUtc).HasColumnType("timestamp with time zone");
        });
    }
}
