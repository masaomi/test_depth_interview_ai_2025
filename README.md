# AI Interview System

An AI-powered interview system that allows administrators to create interview templates and conduct time-limited interviews with users using OpenAI's GPT API.

## Features

- 🤖 AI-powered interviews using OpenAI GPT-4
- ⏱️ Configurable time limits with extension options
- 🌍 Multi-language support (English, Japanese, Spanish, French, German, Chinese)
- 👨‍💼 Admin panel for creating and managing interview templates
- 💾 Automatic conversation log storage
- 📱 Responsive design with dark mode support

## Setup

1. Clone the repository

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

4. Add your OpenAI API key to the `.env` file:
```
OPENAI_API_KEY=your_openai_api_key_here
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser

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
- **AI**: OpenAI GPT-4 API
- **Internationalization**: next-intl

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

