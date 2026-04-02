# LLM Gateway Go SDK

Go client library for LLM Gateway - a production-grade multi-provider LLM gateway.

## Installation

```bash
go get github.com/big-llm/llm-gateway/go
```

## Quick Start

```go
package main

import (
    "fmt"
    "github.com/big-llm/llm-gateway/go"
)

func main() {
    // Initialize the gateway
    gateway := llmgateway.New(
        llmgateway.WithBaseURL("http://localhost:3000"),
        llmgateway.WithAPIKey("your-api-key"),
        llmgateway.WithAdminToken("your-admin-token"),
    )

    // Chat completions
    resp, err := gateway.Chat.Completions.Create(ctx, &llmgateway.ChatCompletionRequest{
        Model: "gpt-4o",
        Messages: []llmgateway.Message{
            {Role: "user", Content: "Hello!"},
        },
    })
    if err != nil {
        panic(err)
    }
    fmt.Println(resp.Choices[0].Message.Content)

    // List models
    models, err := gateway.Models.List(ctx)
    if err != nil {
        panic(err)
    }
    for _, m := range models.Data {
        fmt.Println(m.ID)
    }

    // Embeddings
    emb, err := gateway.Embeddings.Create(ctx, &llmgateway.EmbeddingRequest{
        Model: "text-embedding-3-small",
        Input: "The quick brown fox",
    })
    if err != nil {
        panic(err)
    }
    fmt.Println(emb.Data[0].Embedding)

    // Anthropic Messages
    msgResp, err := gateway.Messages.Create(ctx, &llmgateway.AnthropicMessageRequest{
        Model: "claude-sonnet-4-20250514",
        MaxTokens: 1024,
        Messages: []llmgateway.Message{
            {Role: "user", Content: "Hello!"},
        },
    })
    if err != nil {
        panic(err)
    }
    fmt.Println(msgResp.Content[0].Text)
}
```

## Configuration

```go
gateway := llmgateway.New(
    llmgateway.WithBaseURL("http://localhost:3000"),
    llmgateway.WithAPIKey("your-api-key"),
    llmgateway.WithAdminToken("admin-token"),
    llmgateway.WithTimeout(60 * time.Second),
    llmgateway.WithMaxRetries(3),
)
```

## API Reference

### Chat Completions

```go
// Non-streaming
resp, err := gateway.Chat.Completions.Create(ctx, &llmgateway.ChatCompletionRequest{
    Model: "gpt-4o",
    Messages: []llmgateway.Message{
        {Role: "user", Content: "Hello"},
    },
    Temperature: 0.7,
    MaxTokens: 1000,
})

// Streaming
stream, err := gateway.Chat.Completions.CreateStream(ctx, &llmgateway.ChatCompletionRequest{
    Model: "gpt-4o",
    Messages: []llmgateway.Message{
        {Role: "user", Content: "Hello"},
    },
    Stream: true,
})
defer stream.Close()

for {
    chunk, err := stream.Recv()
    if err == io.EOF {
        break
    }
    fmt.Print(chunk.Choices[0].Delta.Content)
}
```

### Models

```go
// List all models
models, err := gateway.Models.List(ctx)

// Retrieve a specific model
model, err := gateway.Models.Get(ctx, "gpt-4o")
```

### Embeddings

```go
resp, err := gateway.Embeddings.Create(ctx, &llmgateway.EmbeddingRequest{
    Model: "text-embedding-3-small",
    Input: []string{"Hello world", "Goodbye world"},
})
```

### Admin API

```go
// Health check
health, err := gateway.Admin.Health(ctx)

// List API keys
keys, err := gateway.Admin.Keys.List(ctx)

// Create API key
newKey, err := gateway.Admin.Keys.Create(ctx, &llmgateway.CreateKeyRequest{
    OrgID: "org_123",
    TeamID: "team_456",
    Name: "My API Key",
    BudgetLimit: 100.0,
})

// List organizations
orgs, err := gateway.Admin.Orgs.List(ctx)

// Provider health
providers, err := gateway.Admin.Health.Providers(ctx)

// Usage stats
stats, err := gateway.Admin.Stats(ctx)
```

## Error Handling

```go
resp, err := gateway.Chat.Completions.Create(ctx, request)
if err != nil {
    switch err := err.(type) {
    case *llmgateway.RateLimitError:
        fmt.Println("Rate limit exceeded:", err.Message)
    case *llmgateway.AuthenticationError:
        fmt.Println("Authentication failed:", err.Message)
    case *llmgateway.GatewayError:
        fmt.Println("Gateway error:", err.Message, err.StatusCode)
    default:
        fmt.Println("Error:", err)
    }
}
```

## License

MIT
