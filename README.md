# AI Interview System

An AI-powered interview system that allows administrators to create interview templates and conduct time-limited interviews with users using OpenAI's GPT API.

## Features

- 🤖 AI-powered interviews using OpenAI GPT-4 or Local LLM (Ollama, LM Studio)
- ⏱️ Configurable time limits with extension options
- 🌍 Multi-language support (English, Japanese, Spanish, French, German, Chinese)
- 👨‍💼 Admin panel for creating and managing interview templates
- 💾 Automatic conversation log storage
- 📱 Responsive design with dark mode support
- 🔄 Flexible LLM provider switching (OpenAI API or Local LLM)

## Setup

1. Clone the repository

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory and configure your LLM provider.

**Quick Start**: Copy one of the provided sample files:
```bash
# For OpenAI API
cp env.openai.example .env

# For Ollama
cp env.ollama.example .env

# For LM Studio
cp env.lmstudio.example .env
```

Then edit the `.env` file with your settings.

### Option A: Using OpenAI API (Default)

```bash
# .env
OPENAI_API_KEY=your_openai_api_key_here
# OPENAI_MODEL=gpt-4  # Optional, defaults to gpt-4
```

### Option B: Using Local LLM (Ollama, LM Studio, etc.)

**Priority: `LLM_PROVIDER=local` takes precedence over `OPENAI_API_KEY`**

```bash
# .env
LLM_PROVIDER=local
LOCAL_LLM_BASE_URL=http://localhost:11434/v1  # Ollama default
LOCAL_LLM_MODEL=gpt-oss20B
# LOCAL_LLM_API_KEY=dummy  # Optional, use if your local server requires auth
```

#### Setting up Ollama:
```bash
# Install Ollama from https://ollama.ai/
# Pull or create your model
ollama pull llama2  # or use your custom gpt-oss20B model
# Ollama server runs at http://localhost:11434 by default
```

#### Setting up LM Studio:
```bash
# Install LM Studio and load your model
# Start local server (usually http://localhost:1234)
# Configure .env accordingly:
LLM_PROVIDER=local
LOCAL_LLM_BASE_URL=http://localhost:1234/v1
LOCAL_LLM_MODEL=gpt-oss20B
```

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Admin Panel

1. Navigate to the Admin Panel from the home page
2. Create a new interview template:
   - Enter an interview title
   - Describe what you want to ask users in natural language (like MyGPTs prompts)
   - Set the duration in seconds
3. Save the template

### Conducting an Interview

1. From the home page, select your preferred language
2. Click on an available interview
3. The AI will greet you and start the interview
4. Answer questions in the chat interface
5. When time runs out, you can choose to:
   - Extend the interview by 5 minutes
   - Finish and save the conversation

### Viewing Conversation Logs

All conversations are automatically saved in the SQLite database (`interviews.db`). You can query this database to view or analyze the interview responses.

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite (better-sqlite3)
- **AI**: OpenAI GPT-4 API or Local LLM (Ollama, LM Studio, etc.)
- **Internationalization**: next-intl

## LLM Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LLM_PROVIDER` | No | - | Set to `local` to use local LLM server |
| `LOCAL_LLM_BASE_URL` | Yes (if `LLM_PROVIDER=local`) | - | Base URL of your local LLM server (e.g., `http://localhost:11434/v1`) |
| `LOCAL_LLM_MODEL` | No | `gpt-oss20B` | Model name for local LLM |
| `LOCAL_LLM_API_KEY` | No | `dummy` | API key for local LLM server (if required) |
| `OPENAI_API_KEY` | Yes (if not using local) | - | Your OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4` | OpenAI model name |

### Priority

The system uses the following priority:
1. If `LLM_PROVIDER=local`, use local LLM (regardless of `OPENAI_API_KEY`)
2. Otherwise, use OpenAI API (requires `OPENAI_API_KEY`)

### Switching Between Providers

To switch between OpenAI and local LLM, simply update your `.env` file:

**Use OpenAI:**
```bash
# Remove or comment out LLM_PROVIDER
# LLM_PROVIDER=local
OPENAI_API_KEY=your_openai_api_key_here
```

**Use Local LLM:**
```bash
LLM_PROVIDER=local
LOCAL_LLM_BASE_URL=http://localhost:11434/v1
LOCAL_LLM_MODEL=gpt-oss20B
# OPENAI_API_KEY can remain (will be ignored)
```

## Project Structure

```
.
├── app/
│   ├── admin/           # Admin panel page
│   ├── api/             # API routes
│   │   ├── chat/        # Chat endpoints
│   │   ├── init/        # Interview initialization
│   │   ├── sessions/    # Session management
│   │   └── templates/   # Template CRUD
│   ├── interview/[id]/  # Interview page
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── lib/
│   ├── db.ts            # Database setup
│   └── types.ts         # TypeScript types
├── messages/            # i18n translation files
└── interviews.db        # SQLite database (auto-created)
```

## API Endpoints

- `GET /api/templates` - List all interview templates
- `POST /api/templates` - Create a new template
- `DELETE /api/templates?id={id}` - Delete a template
- `POST /api/sessions` - Create a new interview session
- `PATCH /api/sessions` - Update session status
- `GET /api/sessions?id={id}` - Get session details
- `POST /api/init` - Initialize an interview
- `POST /api/chat` - Send a message in the interview
- `GET /api/chat?session_id={id}` - Get conversation history

## License

MIT

