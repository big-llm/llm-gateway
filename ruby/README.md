# LLM Gateway Ruby SDK

Ruby gem for LLM Gateway - a production-grade multi-provider LLM gateway.

## Installation

```ruby
# In Gemfile
gem 'llm-gateway'

# Or install directly
gem install llm-gateway
```

## Quick Start

```ruby
require 'llm_gateway'

# Initialize the gateway
gateway = LLMGateway.new(
  base_url: 'http://localhost:3000',
  api_key: 'your-api-key',
  admin_token: 'your-admin-token'
)

# Chat completions
response = gateway.chat.completions.create(
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello!' }]
)
puts response['choices'][0]['message']['content']

# Chat completions with streaming
gateway.chat.completions.create(
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Tell me a story' }],
  stream: true
) do |chunk|
  print chunk['choices'][0]['delta']['content']
end

# List models
models = gateway.models.list
models['data'].each { |m| puts m['id'] }

# Embeddings
response = gateway.embeddings.create(
  model: 'text-embedding-3-small',
  input: 'The quick brown fox'
)
puts response['data'][0]['embedding']

# Anthropic Messages
response = gateway.messages.create(
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [{ role: 'user', content: 'Hello!' }]
)
puts response['content'][0]['text']
```

## Configuration

```ruby
gateway = LLMGateway.new(
  base_url: 'http://localhost:3000',
  api_key: 'your-api-key',
  admin_token: 'admin-token',
  timeout: 60,
  max_retries: 3
)
```

## API Reference

### Chat Completions

```ruby
# Non-streaming
response = gateway.chat.completions.create(
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello' }],
  temperature: 0.7,
  max_tokens: 1000
)

# Streaming
gateway.chat.completions.create(
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello' }],
  stream: true
) do |chunk|
  puts chunk['choices'][0]['delta']['content']
end
```

### Models

```ruby
# List all models
models = gateway.models.list

# Retrieve a specific model
model = gateway.models.retrieve('gpt-4o')
```

### Embeddings

```ruby
response = gateway.embeddings.create(
  model: 'text-embedding-3-small',
  input: ['Hello world', 'Goodbye world']
)
```

### Admin API

```ruby
# Health check
health = gateway.admin.health

# List API keys
keys = gateway.admin.keys.list

# Create API key
new_key = gateway.admin.keys.create(
  org_id: 'org_123',
  team_id: 'team_456',
  name: 'My API Key',
  budget_limit: 100.0
)

# List organizations
orgs = gateway.admin.orgs.list

# Provider health
providers = gateway.admin.health.providers

# Usage stats
stats = gateway.admin.stats
```

## Error Handling

```ruby
begin
  response = gateway.chat.completions.create(
    model: 'gpt-4o',
    messages: [{ role: 'user', content: 'Hello' }]
  )
rescue LLMGateway::RateLimitError => e
  puts "Rate limit exceeded: #{e.message}"
rescue LLMGateway::AuthenticationError => e
  puts "Authentication failed: #{e.message}"
rescue LLMGateway::GatewayError => e
  puts "Gateway error: #{e.message} (status: #{e.status_code})"
end
```

## License

MIT
