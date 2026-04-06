var builder = DistributedApplication.CreateBuilder(args);

var postgres = builder.AddPostgres("postgres")
    .WithLifetime(ContainerLifetime.Persistent);
var todosdb = postgres.AddDatabase("todosdb");

var server = builder.AddProject<Projects.MetricsPoc_Server>("server")
    .WithReference(todosdb)
    .WaitFor(todosdb)
    .WithEnvironment("Metrics__EnabledMetrics__Npgsql", "true")
    .WithHttpHealthCheck("/health")
    .WithExternalHttpEndpoints();

var webfrontend = builder.AddViteApp("webfrontend", "../frontend")
    .WithReference(server)
    .WaitFor(server);

server.PublishWithContainerFiles(webfrontend, "wwwroot");

builder.Build().Run();
