# Environment Variables Setup Guide

This guide explains how to configure environment variables for the AI Interview System.

## Quick Start

Create a `.env` file in the project root and copy one of the configurations below.

---

## Option 1: Use OpenAI API (Default)

The simplest setup. Uses OpenAI's GPT-4.

```bash
# .env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Optional: To change the model
```bash
# .env
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
OPENAI_MODEL=gpt-4-turbo  # or gpt-3.5-turbo, etc.
```

---

## Option 2: Use Local LLM (Ollama)

Run LLM locally using Ollama.

### Step 1: Setup Ollama

```bash
# Install Ollama
# Download from https://ollama.ai/

# Pull a model
ollama pull llama2
# Or load a custom model (e.g., gpt-oss20B)
```

### Step 2: Start Ollama Server

```bash
# Start Ollama server (if not already running)
ollama serve

# Or just pull and run a model (this will auto-start the server)
ollama run llama2

# Check running models
ollama list

# Test the API endpoint
curl http://localhost:11434/v1/models
```

**Note**: On macOS/Linux, Ollama usually starts automatically as a background service after installation. If you see "Error: listen tcp 127.0.0.1:11434: bind: address already in use", it means the server is already running.

### Step 3: Configure .env File

```bash
# .env
LLM_PROVIDER=local
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=llama2
```

For custom models (e.g., gpt-oss20B):
```bash
# .env
LLM_PROVIDER=local
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=gpt-oss20B
```

### Useful Ollama Commands

```bash
# Start server (if needed)
ollama serve

# List installed models
ollama list

# Pull a new model
ollama pull llama2
ollama pull mistral
ollama pull codellama

# Run a model interactively
ollama run llama2

# Remove a model
ollama rm llama2

# Check server status
curl http://localhost:11434/api/tags
```

---

## Option 3: Use Local LLM (LM Studio)

Run LLM locally using LM Studio.

### Step 1: Setup LM Studio

1. Install LM Studio (https://lmstudio.ai/)
2. Download & load a model
3. Start the local server (usually on port 1234)

### Step 2: Configure .env File

```bash
# .env
LLM_PROVIDER=local
LOCAL_LLM_BASE_URL=http://localhost:1234/v1
LOCAL_LLM_MODEL=gpt-oss20B
```

---

## Option 4: Use Other Local LLM Servers

You can use vLLM, text-generation-webui, or other OpenAI-compatible API servers.

```bash
# .env
LLM_PROVIDER=local
LOCAL_LLM_BASE_URL=http://your-server:port/v1
LOCAL_LLM_MODEL=your-model-name
LOCAL_LLM_API_KEY=your-api-key-if-needed  # Only if required
```

---

## Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLM_PROVIDER` | No | - | Set to `local` to use local LLM |
| `LOCAL_LLM_BASE_URL` | Yes* | - | Base URL of local LLM server<br/>*Required when `LLM_PROVIDER=local` |
| `LOCAL_LLM_MODEL` | No | `gpt-oss20B` | Model name to use |
| `LOCAL_LLM_API_KEY` | No | `dummy` | API key (if server requires it) |
| `OPENAI_API_KEY` | Yes* | - | OpenAI API key<br/>*Required when not using local LLM |
| `OPENAI_MODEL` | No | `gpt-4` | OpenAI model to use |

---

## Provider Selection Priority

The system selects the LLM provider in the following order:

1. **If `LLM_PROVIDER=local` is set**
   → Use local LLM (`OPENAI_API_KEY` is ignored)

2. **If `LLM_PROVIDER=local` is NOT set**
   → Use OpenAI API (`OPENAI_API_KEY` is required)

---

## Switching Providers

### Switch from OpenAI to Local LLM

Add the following to your `.env` file:
```bash
LLM_PROVIDER=local
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=gpt-oss20B
```

### Switch from Local LLM to OpenAI

Remove or comment out the following in your `.env` file:
```bash
# LLM_PROVIDER=local
# LOCAL_LLM_BASE_URL=http://localhost:11434/v1
# LOCAL_LLM_MODEL=gpt-oss20B
```

Make sure `OPENAI_API_KEY` is set.

---

## Troubleshooting

### Error: "LOCAL_LLM_BASE_URL environment variable is not set"

- If you set `LLM_PROVIDER=local`, `LOCAL_LLM_BASE_URL` is also required
- Check if your local LLM server is running

### Error: "OPENAI_API_KEY environment variable is not set"

- If you want to use local LLM, set `LLM_PROVIDER=local`
- If you want to use OpenAI, set a valid `OPENAI_API_KEY`

### Cannot Connect to Local LLM

- Check if the local server is running:
  ```bash
  # For Ollama
  curl http://localhost:11434/v1/models
  
  # For LM Studio
  curl http://localhost:1234/v1/models
  ```
- Verify the port number is correct
- Make sure the `/v1` path is included (for OpenAI-compatible API)
- For Ollama, try starting the server manually: `ollama serve`

### Ollama Server Won't Start

```bash
# Check if already running
ps aux | grep ollama

# Check the port
lsof -i :11434

# If address already in use, the server is running
# Just use it directly

# Force restart (macOS)
brew services restart ollama

# Or kill and restart
pkill ollama
ollama serve
```

---

## .env File Examples

### Complete Configuration Example

```bash
# .env

# ========================================
# LLM Provider Configuration
# ========================================
# Priority: LLM_PROVIDER=local > OPENAI_API_KEY

# Option 1: Use OpenAI (comment out LLM_PROVIDER)
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxx
# OPENAI_MODEL=gpt-4  # Optional

# Option 2: Use Local LLM (uncomment below)
# LLM_PROVIDER=local
# LOCAL_LLM_BASE_URL=http://localhost:11434/v1  # Ollama
# LOCAL_LLM_MODEL=gpt-oss20B
# LOCAL_LLM_API_KEY=dummy  # Optional
```

Copy this file and uncomment the settings you need.

---

## Quick Start with Ollama (macOS)

```bash
# 1. Install Ollama
brew install ollama

# 2. Start Ollama (if not auto-started)
ollama serve

# 3. Pull a model (in another terminal)
ollama pull llama2

# 4. Test it
ollama run llama2
# Type "Hello" and see if it responds
# Press Ctrl+D to exit

# 5. Configure your .env
cat > .env << 'EOF'
LLM_PROVIDER=local
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=llama2
EOF

# 6. Start your application
pnpm dev
```

---

## Recommended Models for Ollama

| Model | Size | Speed | Quality | Use Case |
|-------|------|-------|---------|----------|
| `llama2` | 7B | Fast | Good | General purpose, quick responses |
| `llama2:13b` | 13B | Medium | Better | Better quality, slower |
| `mistral` | 7B | Fast | Excellent | Great balance of speed/quality |
| `codellama` | 7B | Fast | Good | Code-focused tasks |
| `gemma:7b` | 7B | Fast | Good | Google's model |

Download with: `ollama pull <model-name>`

