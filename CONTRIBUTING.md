# Contributing to AI Interview System

## Development Setup

1. Run the setup script:
```bash
./setup.sh
```

2. Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=sk-...
```

3. Start the development server:
```bash
npm run dev
```

## Project Structure

- **app/** - Next.js app directory
  - **admin/** - Admin panel for creating templates
  - **api/** - API routes for backend functionality
  - **interview/[id]/** - Interview page
- **lib/** - Shared utilities and database
- **messages/** - i18n translation files

## Key Features

### Admin Panel
- Create interview templates with natural language prompts
- Set interview duration
- Delete templates

### Interview System
- AI-powered conversations using OpenAI GPT-4
- Countdown timer with extension option
- Multi-language support
- Conversation logging to SQLite database

### API Routes
- `/api/templates` - CRUD for interview templates
- `/api/sessions` - Manage interview sessions
- `/api/init` - Initialize interview with AI greeting
- `/api/chat` - Handle conversation messages

## Database Schema

The system uses SQLite with three main tables:

1. **interview_templates** - Store interview configurations
2. **interview_sessions** - Track active/completed interviews
3. **conversation_logs** - Store all messages

## Adding New Languages

1. Create a new JSON file in `messages/` directory (e.g., `messages/it.json`)
2. Copy the structure from `messages/en.json`
3. Translate all strings
4. Add the language to the selector in `app/page.tsx`

## Testing

The application can be tested without an OpenAI API key by:
1. Setting up the project normally
2. Creating interview templates in the admin panel
3. The interview will fail at initialization without a valid API key

For full testing, you need a valid OpenAI API key.
