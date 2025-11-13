# AI Interview System

An AI-powered interview system that allows administrators to create interview templates and conduct time-limited interviews with users using OpenAI's GPT API.

## Screenshot

![AI Interview System](./public/AI_interview_system.jpg)

## Features

- 🤖 AI-powered interviews using OpenAI GPT-4, Amazon Bedrock, or Local LLM (Ollama, LM Studio)
- ⏱️ Configurable time limits with extension options
- 🌍 Multi-language support (English, Japanese, Spanish, French, German, Chinese)
- 👨‍💼 Admin panel for creating and managing interview templates
- 💾 Automatic conversation log storage
- 📱 Responsive design with dark mode support
- 🔄 Flexible LLM provider switching (OpenAI API, Amazon Bedrock, or Local LLM)

## Setup

1. Clone the repository

2. Install dependencies:
```bash
pnpm install
# or
npm install
```

**Note**: This project uses pnpm. If you don't have pnpm installed:
```bash
npm install -g pnpm
```

3. Create a `.env` file in the root directory and configure your LLM provider.

📚 **For detailed environment setup instructions, see:**
- [Environment Setup Guide (English)](./ENV_SETUP_GUIDE.en.md) - Complete guide with Ollama commands
- [環境変数設定ガイド（日本語）](./ENV_SETUP_GUIDE.md) - Ollamaコマンド付き完全ガイド

**Quick Start**: Copy one of the provided sample files:
```bash
# For OpenAI API
cp env.openai.example .env

# For Amazon Bedrock
cp env.bedrock.example .env

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

### Option B: Using Amazon Bedrock

```bash
# .env
LLM_PROVIDER=bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
```

**Setting up Amazon Bedrock:**
1. Create an IAM user with Bedrock access permissions in AWS Console
2. Attach policy: `AmazonBedrockFullAccess` (or custom policy with `bedrock:InvokeModel`)
3. Generate access key and secret key
4. Enable model access in Bedrock console (AWS Console > Bedrock > Model access)
5. Configure `.env` with your credentials and preferred model

**Supported Bedrock Models:**
- Claude 3.5 Sonnet (Recommended): `anthropic.claude-3-5-sonnet-20241022-v2:0`
- Claude 3 Sonnet: `anthropic.claude-3-sonnet-20240229-v1:0`
- Claude 3 Haiku: `anthropic.claude-3-haiku-20240307-v1:0`
- Amazon Titan: `amazon.titan-text-express-v1`
- Meta Llama: `meta.llama3-70b-instruct-v1:0`

### Option C: Using Local LLM (Ollama, LM Studio, etc.)

**Priority: `LLM_PROVIDER` setting determines which provider to use**

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

#### Setting up Admin Panel Authentication (Optional):
```bash
# .env
ADMIN_PASSWORD=your-secure-password-here
```

If `ADMIN_PASSWORD` is set, the Admin Panel will require password authentication. If not set, the Admin Panel button will be hidden and the feature will be disabled.

4. (Optional) Initialize the database with sample data:
```bash
pnpm seed
```

This will create:
- 2 interview templates (Product Feedback Interview & User Needs Research)
- 6 sample interview sessions (4 completed, 2 active)
- 37 conversation messages in both English and Japanese

⚠️ **Warning**: This command will clear all existing data in the database.

5. Run the development server:
```bash
pnpm dev
# or
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

## Production Deployment

### Basic Steps

1. Build the application for production:
```bash
pnpm build
```

2. Start the production server:
```bash
pnpm start
```

By default, the server runs on port 3000. To specify a different port:
```bash
# Using -p option (recommended)
pnpm start -p 3090

# Or using PORT environment variable
PORT=3090 pnpm start
```

### Environment Variables for Production

You have several options for configuring environment variables in production:

#### Option A: Using `.env.production` File

```bash
# Copy from example file
cp env.openai.example .env.production
# or
cp env.ollama.example .env.production

# Edit with your production settings
nano .env.production
```

⚠️ **Security Note**: Always set proper file permissions for your environment file:
```bash
chmod 600 .env.production
```

#### Option B: System Environment Variables

Set environment variables directly in your server environment:
```bash
# For OpenAI API
export OPENAI_API_KEY=your_openai_api_key_here
export OPENAI_MODEL=gpt-4
export ADMIN_PASSWORD=your-secure-password

# For Local LLM
export LLM_PROVIDER=local
export LOCAL_LLM_BASE_URL=http://localhost:11434/v1
export LOCAL_LLM_MODEL=gpt-oss20B
export ADMIN_PASSWORD=your-secure-password

# Build and start
pnpm build && pnpm start
```

#### Option C: Using Process Manager (Recommended) ✨

For production environments, using a process manager like PM2 is **highly recommended** for:
- Automatic restarts on crashes
- Easy process monitoring
- Log management
- Zero-downtime reloads

```bash
# Install PM2 globally
npm install -g pm2

# Create ecosystem.config.js for PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'interview-ai',
    script: 'node_modules/.bin/next',
    args: 'start -p 3090',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      // Add your environment variables here
      OPENAI_API_KEY: 'your_openai_api_key_here',
      ADMIN_PASSWORD: 'your-secure-password'
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Set PM2 to start on system boot
pm2 startup
```

**PM2 Common Commands:**
```bash
# View logs
pm2 logs interview-ai

# Restart application
pm2 restart interview-ai

# Stop application
pm2 stop interview-ai

# View process status
pm2 status

# Monitor processes
pm2 monit
```

### Production Checklist

- [ ] Set `ADMIN_PASSWORD` for security
- [ ] Configure appropriate LLM provider (OpenAI or Local)
- [ ] Set file permissions: `chmod 600 .env.production` (if using .env.production)
- [ ] Ensure `interviews.db` has proper read/write permissions
- [ ] Verify local LLM server is running (if using `LLM_PROVIDER=local`)
- [ ] Consider using PM2 or similar process manager
- [ ] Set up proper logging and monitoring
- [ ] Configure firewall rules if needed

### Docker Deployment (Optional)

For containerized deployment, create a `Dockerfile`:

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Install pnpm
RUN npm install -g pnpm

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy application files
COPY . .

# Build application
RUN pnpm build

# Expose port
EXPOSE 3000

# Start application
CMD ["pnpm", "start"]
```

Build and run:
```bash
# Build image
docker build -t interview-ai .

# Run container
docker run -d \
  -p 3090:3000 \
  -e OPENAI_API_KEY=your_key \
  -e ADMIN_PASSWORD=your_password \
  -v $(pwd)/interviews.db:/app/interviews.db \
  --name interview-ai \
  interview-ai
```

## Usage

### Admin Panel

**Authentication**: The Admin Panel is protected by password authentication when `ADMIN_PASSWORD` is set in `.env`. If not configured, the Admin Panel button will be hidden.

1. Navigate to the Admin Panel from the home page (if enabled)
2. Enter the admin password if prompted
3. Create a new interview template:
   - Enter an interview title
   - Describe what you want to ask users in natural language (like MyGPTs prompts)
   - Set the duration in seconds
4. Save the template

**Note**: Authentication session is stored in browser's localStorage for convenience.

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

**Example queries:**
```bash
# View all templates
sqlite3 interviews.db "SELECT * FROM interview_templates;"

# View all sessions
sqlite3 interviews.db "SELECT * FROM interview_sessions;"

# View conversation logs for a specific session
sqlite3 interviews.db "SELECT * FROM conversation_logs WHERE session_id='session-pf-001';"

# Count total interviews
sqlite3 interviews.db "SELECT COUNT(*) FROM interview_sessions;"
```

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
| `LLM_PROVIDER` | No | - | Set to `bedrock` for Amazon Bedrock, or `local` for local LLM server |
| `AWS_REGION` | Yes (if `LLM_PROVIDER=bedrock`) | - | AWS region where Bedrock is available (e.g., `us-east-1`) |
| `AWS_ACCESS_KEY_ID` | Yes (if `LLM_PROVIDER=bedrock`) | - | AWS access key ID for Bedrock authentication |
| `AWS_SECRET_ACCESS_KEY` | Yes (if `LLM_PROVIDER=bedrock`) | - | AWS secret access key for Bedrock authentication |
| `BEDROCK_MODEL_ID` | No | `anthropic.claude-3-5-sonnet-20241022-v2:0` | Bedrock model ID to use |
| `LOCAL_LLM_BASE_URL` | Yes (if `LLM_PROVIDER=local`) | - | Base URL of your local LLM server (e.g., `http://localhost:11434/v1`) |
| `LOCAL_LLM_MODEL` | No | `gpt-oss20B` | Model name for local LLM |
| `LOCAL_LLM_API_KEY` | No | `dummy` | API key for local LLM server (if required) |
| `OPENAI_API_KEY` | Yes (if not using Bedrock/local) | - | Your OpenAI API key |
| `OPENAI_MODEL` | No | `gpt-4` | OpenAI model name |
| `ADMIN_PASSWORD` | No | - | Password for Admin Panel access. If not set, Admin Panel is disabled |

### Priority

The system uses the following priority:
1. If `LLM_PROVIDER=bedrock`, use Amazon Bedrock (requires AWS credentials)
2. If `LLM_PROVIDER=local`, use local LLM (requires local server)
3. Otherwise, use OpenAI API (requires `OPENAI_API_KEY`)

### Switching Between Providers

To switch between providers, simply update your `.env` file:

**Use OpenAI:**
```bash
# Remove or comment out LLM_PROVIDER
# LLM_PROVIDER=bedrock
# LLM_PROVIDER=local
OPENAI_API_KEY=your_openai_api_key_here
```

**Use Amazon Bedrock:**
```bash
LLM_PROVIDER=bedrock
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key_id_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
# OPENAI_API_KEY can remain (will be ignored)
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
│   │   ├── admin/       # Admin authentication
│   │   ├── chat/        # Chat endpoints
│   │   ├── init/        # Interview initialization
│   │   ├── reports/     # Report aggregation
│   │   ├── sessions/    # Session management
│   │   └── templates/   # Template CRUD
│   ├── interview/[id]/  # Interview page
│   ├── reports/         # Report pages
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Home page
├── lib/
│   ├── db.ts            # Database setup
│   └── types.ts         # TypeScript types
├── messages/            # i18n translation files
└── interviews.db        # SQLite database (auto-created)
```

## API Endpoints

### Authentication
- `GET /api/admin/auth` - Check if admin authentication is enabled
- `POST /api/admin/auth` - Verify admin password

### Templates
- `GET /api/templates` - List all interview templates
- `POST /api/templates` - Create a new template
- `PUT /api/templates` - Update a template
- `DELETE /api/templates?id={id}` - Delete a template

### Sessions
- `POST /api/sessions` - Create a new interview session
- `PATCH /api/sessions` - Update session status
- `GET /api/sessions?id={id}` - Get session details

### Interview
- `POST /api/init` - Initialize an interview
- `POST /api/chat` - Send a message in the interview
- `GET /api/chat?session_id={id}` - Get conversation history

### Reports
- `POST /api/reports` - Run aggregation for all templates
- `GET /api/reports` - List all report aggregations
- `GET /api/reports/{id}?language={lang}` - Get report details by language

## Acknowledgments

This system was developed with reference to "みらいAIインタビュー（仮）Mirai AI Interview (TBD)" created by Takahiro Anno. Thank you very much.

## License

MIT License - Copyright (c) 2025 GenomicsChain / Masaomi Hatakeyama

See [LICENSE](./LICENSE) file for details.

