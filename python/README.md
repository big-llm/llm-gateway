# LLM Gateway Python SDK

Python client library for LLM Gateway - a production-grade multi-provider LLM gateway.

## Installation

```bash
pip install llm-gateway
```

Or install from source:

```bash
pip install -e .
```

## Quick Start

```python
from llm_gateway import LLMGateway

# Initialize the gateway
gateway = LLMGateway(
    base_url="http://localhost:3000",
    api_key="your-api-key",
    admin_token="your-admin-token"
)

# Chat completions (OpenAI-compatible)
response = gateway.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)
print(response.choices[0].message.content)

# Chat completions with streaming
for chunk in gateway.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Tell me a story"}],
    stream=True
):
    print(chunk.choices[0].delta.content, end="")

# List models
models = gateway.models.list()
for model in models.data:
    print(model.id)

# Embeddings
embedding = gateway.embeddings.create(
    model="text-embedding-3-small",
    input="The quick brown fox"
)
print(embedding.data[0].embedding)

# Anthropic Messages API
response = gateway.messages.create(
    model="claude-sonnet-4-20250514",
    max_tokens=1024,
    messages=[
        {"role": "user", "content": "Hello!"}
    ]
)
print(response.content[0].text)
```

## Configuration

```python
from llm_gateway import LLMGateway

# With custom configuration
gateway = LLMGateway(
    base_url="http://localhost:3000",
    api_key="your-api-key",
    admin_token="your-admin-token",
    timeout=60,
    max_retries=3
)
```

## API Reference

### Chat Completions

```python
# Non-streaming
response = gateway.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
    temperature=0.7,
    max_tokens=1000
)

# Streaming
for chunk in gateway.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
    stream=True
):
    print(chunk.choices[0].delta.content)
```

### Models

```python
# List all models
models = gateway.models.list()

# Retrieve a specific model
model = gateway.models.retrieve("gpt-4o")
```

### Embeddings

```python
response = gateway.embeddings.create(
    model="text-embedding-3-small",
    input=["Hello world", "Goodbye world"]
)
for emb in response.data:
    print(emb.embedding)
```

### Admin API

```python
# Get health status
health = gateway.admin.health()

# List API keys
keys = gateway.admin.keys.list()

# Create API key
new_key = gateway.admin.keys.create(
    org_id="org_123",
    team_id="team_456",
    name="My API Key",
    budget_limit=100.0
)

# List organizations
orgs = gateway.admin.orgs.list()

# Get provider health
providers = gateway.admin.health.providers()

# Get usage stats
stats = gateway.admin.stats()
```

## Error Handling

```python
from llm_gateway import LLMGateway, GatewayError, RateLimitError, AuthenticationError

try:
    response = gateway.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": "Hello"}]
    )
except RateLimitError:
    print("Rate limit exceeded")
except AuthenticationError:
    print("Invalid API key")
except GatewayError as e:
    print(f"Gateway error: {e}")
```

## License

MIT
