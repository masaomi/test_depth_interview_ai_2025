# Database Seeding Script

This directory contains scripts for database management.

## Seed Database

The `seed-database.ts` script initializes the database with sample data for testing and development.

### What it does:

1. Clears all existing data from the database
2. Creates 2 sample interview templates:
   - Product Feedback Interview (with English and Japanese translations)
   - User Needs Research (with English and Japanese translations)
3. Creates 6 sample interview sessions (3 for each template):
   - Sessions in both English and Japanese
   - Mix of completed and active sessions
   - Each session contains 3-8 conversation messages

### Usage:

```bash
# Install dependencies first (if not already installed)
pnpm install

# Run the seed script
pnpm seed
```

### Sample Data Overview:

**Templates:**
- `template-product-feedback`: Product Feedback Interview (10 min duration)
- `template-user-research`: User Needs Research (15 min duration)

**Sessions:**
- 4 completed sessions with full conversation logs
- 2 active (in-progress) sessions
- Sessions distributed across the last few days

**Conversations:**
- Realistic interview dialogues
- Mix of user and assistant messages
- Both English and Japanese conversations

### Note:

⚠️ **Warning:** This script will delete all existing data before inserting sample data. Use with caution in production environments.

