# Anthropic OpenAI Bridge

A production-grade bridge service that translates Claude Code CLI requests (Anthropic Messages API) to OpenAI-compatible APIs (like NVIDIA NIM), with optional Anthropic fallback.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────────┐
│  Claude Code    │────▶│  This Bridge    │────▶│  OpenAI Compatible │
│  (Anthropic API)│     │  (Fastify)      │     │  (NVIDIA NIM, etc) │
└─────────────────┘     └──────────────────┘     └─────────────────────┘
                               │
                               │ (Optional Fallback)
                               ▼
                        ┌──────────────────┐
                        │   Anthropic      │
                        │   (Direct)       │
                        └──────────────────┘
```

### Components

| Component                        | Purpose                            |
| -------------------------------- | ---------------------------------- |
| **Routes** (`src/routes/`)       | Fastify HTTP endpoints             |
| **Adapters** (`src/adapters/`)   | Request/response format conversion |
| **Providers** (`src/providers/`) | Abstract provider interface        |
| **Streaming** (`src/streaming/`) | SSE stream processing pipeline     |
| **Schemas** (`src/schemas/`)     | Zod validation schemas             |
| **Config** (`src/config/`)       | Environment-based configuration    |

### Request Flow

1. **Request Validation** - Zod schema validates incoming Anthropic request
2. **Normalization** - Convert Anthropic format to OpenAI format
3. **Provider Routing** - Route to primary or fallback provider
4. **API Call** - Execute request against provider
5. **Response Denormalization** - Convert OpenAI response back to Anthropic format
6. **Streaming** - If streaming, convert SSE chunks from OpenAI to Anthropic events

## Protocol Mapping

### Request Mapping

| Anthropic Field  | OpenAI Field                      | Notes                               |
| ---------------- | --------------------------------- | ----------------------------------- |
| `model`          | `model`                           | Can be mapped via config            |
| `messages`       | `messages`                        | Content blocks converted            |
| `system`         | First message with `role: system` |                                     |
| `max_tokens`     | `max_tokens`                      |                                     |
| `temperature`    | `temperature`                     |                                     |
| `top_p`          | `top_p`                           |                                     |
| `stop_sequences` | `stop`                            |                                     |
| `tools`          | `tools`                           | Converted to OpenAI function format |
| `tool_choice`    | `tool_choice`                     | Mapped appropriately                |

### Response Mapping

| OpenAI Field                           | Anthropic Field           |
| -------------------------------------- | ------------------------- |
| `choices[0].message.content`           | `content[0].text`         |
| `choices[0].message.tool_calls`        | `content[*].tool_use`     |
| `choices[0].finish_reason: stop`       | `stop_reason: end_turn`   |
| `choices[0].finish_reason: length`     | `stop_reason: max_tokens` |
| `choices[0].finish_reason: tool_calls` | `stop_reason: tool_use`   |
| `usage.completion_tokens`              | `usage.output_tokens`     |

### Streaming Event Mapping

| OpenAI Event                     | Anthropic Event                          |
| -------------------------------- | ---------------------------------------- |
| `choices[0].delta.content`       | `content_block_delta` (text_delta)       |
| `choices[0].delta.tool_calls`    | `content_block_delta` (input_json_delta) |
| Chunk with `finish_reason: stop` | `message_delta` + `message_stop`         |

## Installation

### Prerequisites

- Node.js >= 20.0.0
- npm or yarn

### Install Dependencies

```bash
npm install
```

### Build

```bash
npm run build
```

### Run Tests

```bash
npm test
```

## Claude Code Setup

### 1. Configure Environment Variables

```bash
export PRIMARY_API_KEY="your-nvidia-api-key"
export PRIMARY_BASE_URL="https://integrate.api.nvidia.com/v1"
export PRIMARY_MODEL="nvidia/llama-3.1-nemotron-70b-instruct"
```

### 2. Start the Bridge

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

### 3. Configure Claude Code

Add to your Claude Code settings or use CLI:

```bash
claude config set apiUrl http://localhost:3000
```

Or configure via `~/.claude/settings.json`:

```json
{
  "apiUrl": "http://localhost:3000"
}
```

### 4. Verify

```bash
curl http://localhost:3000/health
```

Expected response:

```json
{ "status": "ok", "timestamp": "..." }
```

## NVIDIA NIM Setup

### Option 1: NVIDIA NIM (Self-Hosted)

```bash
export PRIMARY_BASE_URL="http://localhost:8000/v1"
export PRIMARY_MODEL="meta/llama-3.1-70b-instruct"
```

### Option 2: NVIDIA API Catalog (Cloud)

```bash
export PRIMARY_API_KEY="nvapi-..."
export PRIMARY_BASE_URL="https://integrate.api.nvidia.com/v1"
export PRIMARY_MODEL="nvidia/llama-3.1-nemotron-70b-instruct"
```

### Option 3: OpenAI Compatible Endpoints

The bridge works with any OpenAI-compatible API:

```bash
# Ollama (local)
export PRIMARY_BASE_URL="http://localhost:11434/v1"
export PRIMARY_MODEL="llama3"

# LM Studio
export PRIMARY_BASE_URL="http://localhost:1234/v1"

# vLLM
export PRIMARY_BASE_URL="http://localhost:8000/v1"
```

## Environment Variables

### Server Configuration

| Variable          | Default   | Description          |
| ----------------- | --------- | -------------------- |
| `SERVER_HOST`     | `0.0.0.0` | Bind address         |
| `SERVER_PORT`     | `3000`    | HTTP port            |
| `REQUEST_TIMEOUT` | `60000`   | Request timeout (ms) |
| `LOG_LEVEL`       | `info`    | Logging level        |
| `LOG_PRETTY`      | `false`   | Pretty print logs    |

### Rate Limiting

| Variable                 | Default    | Description             |
| ------------------------ | ---------- | ----------------------- |
| `RATE_LIMIT_ENABLED`     | `true`     | Enable rate limiting    |
| `RATE_LIMIT_MAX`         | `100`      | Max requests per window |
| `RATE_LIMIT_TIME_WINDOW` | `1 minute` | Time window             |

### CORS

| Variable       | Default | Description     |
| -------------- | ------- | --------------- |
| `CORS_ENABLED` | `true`  | Enable CORS     |
| `CORS_ORIGIN`  | `*`     | Allowed origins |

### Primary Provider

| Variable              | Default                     | Description        |
| --------------------- | --------------------------- | ------------------ |
| `PRIMARY_API_KEY`     | -                           | API key (required) |
| `PRIMARY_BASE_URL`    | `https://api.openai.com/v1` | Base URL           |
| `PRIMARY_MODEL`       | -                           | Default model      |
| `PRIMARY_TIMEOUT`     | `60000`                     | Request timeout    |
| `PRIMARY_MAX_RETRIES` | `3`                         | Max retries        |

### Fallback Provider (Optional)

| Variable            | Default | Description       |
| ------------------- | ------- | ----------------- |
| `FALLBACK_API_KEY`  | -       | Fallback API key  |
| `FALLBACK_BASE_URL` | -       | Fallback base URL |
| `FALLBACK_MODEL`    | -       | Fallback model    |
| `FALLBACK_TIMEOUT`  | `60000` | Fallback timeout  |

### Advanced

| Variable                  | Default    | Description      |
| ------------------------- | ---------- | ---------------- |
| `ROUTER_STRATEGY`         | `failover` | Routing strategy |
| `CIRCUIT_BREAKER_ENABLED` | `true`     | Circuit breaker  |

## Streaming Explanation

### How It Works

1. **Request**: Client sends streaming request with `stream: true`
2. **Provider Call**: Bridge calls provider with streaming enabled
3. **Chunk Processing**: Each OpenAI chunk is parsed and converted
4. **Event Translation**: OpenAI delta events become Anthropic SSE events
5. **Client Delivery**: SSE events sent to client in real-time

### SSE Events

The bridge emits these Anthropic-compatible SSE events:

```
event: message_start
data: {"type":"message_start","message":{...}}

event: content_block_start
data: {"type":"content_block_start","index":0,"content_block":{"type":"text"}}

event: content_block_delta
data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}

event: content_block_stop
data: {"type":"content_block_stop","index":0}

event: message_delta
data: {"type":"message_delta","delta":{"stop_reason":"end_turn"},"usage":{"output_tokens":10}}

event: message_stop
data: {}
```

### Streaming Endpoints

| Endpoint                   | Description           |
| -------------------------- | --------------------- |
| `POST /v1/messages`        | Non-streaming request |
| `POST /v1/messages/stream` | Streaming request     |

### Client Example

```javascript
const response = await fetch('http://localhost:3000/v1/messages/stream', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'claude-3-5-sonnet-20240620',
    messages: [{ role: 'user', content: 'Hello' }],
    max_tokens: 1024,
    stream: true,
  }),
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  console.log(decoder.decode(value));
}
```

## Limitations

### Supported Features

- ✅ Text messages
- ✅ Image content (base64, URL)
- ✅ Tool definitions
- ✅ Tool calls (function calling)
- ✅ Tool results
- ✅ Streaming (text and tools)
- ✅ System prompts
- ✅ Temperature, top_p, max_tokens
- ✅ Model mapping

### Known Limitations

| Limitation          | Description                                                        |
| ------------------- | ------------------------------------------------------------------ |
| **Cache Control**   | Anthropic cache control is not supported (no equivalent in OpenAI) |
| **Top K**           | Anthropic `top_k` has no OpenAI equivalent                         |
| **Stop Sequences**  | Limited mapping to OpenAI `stop` parameter                         |
| **Refusals**        | OpenAI refusals may not map perfectly to Anthropic                 |
| **Vision**          | Limited vision capabilities depending on provider                  |
| **Streaming Tools** | Tool streaming support varies by provider                          |

### Provider-Specific Notes

| Provider   | Streaming | Tools | Vision |
| ---------- | --------- | ----- | ------ |
| NVIDIA NIM | ✅        | ✅    | ✅     |
| OpenAI     | ✅        | ✅    | ✅     |
| Ollama     | ⚠️        | ❌    | ⚠️     |
| vLLM       | ✅        | ✅    | ✅     |

## Troubleshooting

### Connection Refused

```bash
# Check if server is running
curl http://localhost:3000/health

# Check port is not in use
lsof -i :3000
```

### Authentication Errors

```bash
# Verify API key is set
echo $PRIMARY_API_KEY

# Test direct provider access
curl -H "Authorization: Bearer $PRIMARY_API_KEY" \
  $PRIMARY_BASE_URL/models
```

### Model Not Found

```bash
# List available models
curl http://localhost:3000/v1/models

# Check model mapping in config
# Add to modelMapping in config if needed
```

### Streaming Issues

- Ensure client handles SSE format correctly
- Check provider supports streaming
- Verify `stream_options.include_usage` is supported

## API Reference

### Endpoints

| Method | Path                  | Description              |
| ------ | --------------------- | ------------------------ |
| GET    | `/health`             | Health check             |
| GET    | `/v1/models`          | List models              |
| GET    | `/v1/models/:model`   | Get model info           |
| POST   | `/v1/messages`        | Create message           |
| POST   | `/v1/messages/stream` | Create streaming message |

### Error Responses

```json
{
  "type": "error",
  "error": {
    "type": "invalid_request_error",
    "message": "Invalid request body"
  }
}
```

## License

MIT
