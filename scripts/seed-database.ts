import Database from 'better-sqlite3';
import path from 'path';
import { randomUUID } from 'crypto';

const dbPath = path.join(process.cwd(), 'interviews.db');
const db = new Database(dbPath);

// Initialize database schema (ensure tables exist)
console.log('🔧 Initializing database schema...');
db.exec(`
  CREATE TABLE IF NOT EXISTS interview_templates (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    prompt TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 600,
    translations TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS interview_sessions (
    id TEXT PRIMARY KEY,
    template_id TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ended_at DATETIME,
    status TEXT DEFAULT 'active',
    FOREIGN KEY (template_id) REFERENCES interview_templates(id)
  );

  CREATE TABLE IF NOT EXISTS conversation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (session_id) REFERENCES interview_sessions(id)
  );

  CREATE TABLE IF NOT EXISTS report_aggregations (
    id TEXT PRIMARY KEY,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    llm_model TEXT NOT NULL,
    total_sessions INTEGER NOT NULL,
    status TEXT DEFAULT 'processing'
  );

  CREATE TABLE IF NOT EXISTS report_details (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    aggregation_id TEXT NOT NULL,
    template_id TEXT NOT NULL,
    template_title TEXT NOT NULL,
    language TEXT NOT NULL DEFAULT 'en',
    total_interviews INTEGER NOT NULL,
    completed_interviews INTEGER NOT NULL,
    in_progress_interviews INTEGER NOT NULL,
    total_messages INTEGER NOT NULL,
    avg_duration TEXT,
    avg_duration_seconds INTEGER,
    last_conducted_at DATETIME,
    executive_summary TEXT,
    key_findings TEXT,
    segment_analysis TEXT,
    recommended_actions TEXT,
    FOREIGN KEY (aggregation_id) REFERENCES report_aggregations(id),
    FOREIGN KEY (template_id) REFERENCES interview_templates(id)
  );

  CREATE INDEX IF NOT EXISTS idx_report_details_lang 
    ON report_details(aggregation_id, template_id, language);

  CREATE INDEX IF NOT EXISTS idx_conversation_logs_session 
    ON conversation_logs(session_id);

  CREATE INDEX IF NOT EXISTS idx_sessions_template 
    ON interview_sessions(template_id);
`);

// Clear existing data
console.log('🧹 Clearing existing data...');
db.exec(`
  DELETE FROM conversation_logs;
  DELETE FROM report_details;
  DELETE FROM report_aggregations;
  DELETE FROM interview_sessions;
  DELETE FROM interview_templates;
`);

// Sample interview templates
const templates = [
  {
    id: 'template-product-feedback',
    title: 'Product Feedback Interview',
    prompt: `You are an experienced product researcher conducting a user interview. Your goal is to understand the user's experience with our product and gather valuable feedback.

Guidelines:
- Ask one question at a time
- Listen actively and ask follow-up questions based on user responses
- Be empathetic and professional
- Dig deeper into specific pain points or positive experiences
- Keep the conversation natural and conversational

Start by asking about their overall experience with the product.`,
    duration: 600,
    translations: JSON.stringify({
      ja: {
        title: '製品フィードバックインタビュー',
        prompt: `あなたは経験豊富なプロダクトリサーチャーとして、ユーザーインタビューを実施しています。ユーザーの製品体験を理解し、貴重なフィードバックを収集することが目標です。

ガイドライン：
- 一度に1つの質問をする
- ユーザーの回答に基づいて積極的に聞き、フォローアップの質問をする
- 共感的でプロフェッショナルな態度を保つ
- 特定の課題点やポジティブな体験をより深く掘り下げる
- 自然で会話的なやり取りを心がける

まず製品全体の体験について質問してください。`
      },
      en: {
        title: 'Product Feedback Interview',
        prompt: `You are an experienced product researcher conducting a user interview. Your goal is to understand the user's experience with our product and gather valuable feedback.

Guidelines:
- Ask one question at a time
- Listen actively and ask follow-up questions based on user responses
- Be empathetic and professional
- Dig deeper into specific pain points or positive experiences
- Keep the conversation natural and conversational

Start by asking about their overall experience with the product.`
      }
    })
  },
  {
    id: 'template-user-research',
    title: 'User Needs Research',
    prompt: `You are a UX researcher conducting a discovery interview. Your objective is to understand the user's needs, challenges, and behaviors in their daily workflow.

Guidelines:
- Focus on understanding the "why" behind user behaviors
- Ask open-ended questions
- Avoid leading questions
- Explore specific examples and stories
- Be curious and non-judgmental
- Build rapport with the interviewee

Begin by asking about their typical workflow and daily challenges.`,
    duration: 900,
    translations: JSON.stringify({
      ja: {
        title: 'ユーザーニーズ調査',
        prompt: `あなたはUXリサーチャーとして、発見的インタビューを実施しています。ユーザーの日常業務におけるニーズ、課題、行動を理解することが目的です。

ガイドライン：
- ユーザーの行動の背後にある「なぜ」を理解することに焦点を当てる
- オープンエンドな質問をする
- 誘導的な質問を避ける
- 具体的な例やストーリーを探る
- 好奇心を持ち、批判的でない態度を保つ
- インタビュイーとの信頼関係を構築する

まず、彼らの典型的なワークフローと日々の課題について質問してください。`
      },
      en: {
        title: 'User Needs Research',
        prompt: `You are a UX researcher conducting a discovery interview. Your objective is to understand the user's needs, challenges, and behaviors in their daily workflow.

Guidelines:
- Focus on understanding the "why" behind user behaviors
- Ask open-ended questions
- Avoid leading questions
- Explore specific examples and stories
- Be curious and non-judgmental
- Build rapport with the interviewee

Begin by asking about their typical workflow and daily challenges.`
      }
    })
  }
];

console.log('📝 Creating interview templates...');
const insertTemplate = db.prepare(`
  INSERT INTO interview_templates (id, title, prompt, duration, translations, created_at)
  VALUES (?, ?, ?, ?, ?, datetime('now'))
`);

for (const template of templates) {
  insertTemplate.run(
    template.id,
    template.title,
    template.prompt,
    template.duration,
    template.translations
  );
  console.log(`   ✓ Created template: ${template.title}`);
}

// Create sample interview sessions and conversations
const sessions: Array<{
  id: string;
  template_id: string;
  language: string;
  status: string;
  conversations: Array<{ role: string; content: string }>;
}> = [
  // Product Feedback Interview - Session 1 (English)
  {
    id: 'session-pf-001',
    template_id: 'template-product-feedback',
    language: 'en',
    status: 'completed',
    conversations: [
      {
        role: 'assistant',
        content: 'Hello! Thank you for taking the time to speak with me today. I\'m interested in learning about your experience with our product. To start, could you tell me about your overall experience with it so far?'
      },
      {
        role: 'user',
        content: 'Hi! Overall, I\'ve had a pretty positive experience. I use it daily for managing my projects, and it has definitely made my workflow more organized.'
      },
      {
        role: 'assistant',
        content: 'That\'s great to hear! I\'m glad it\'s helping with your workflow. Could you share a specific example of how it has made your project management more organized?'
      },
      {
        role: 'user',
        content: 'Sure! For example, I really like the task prioritization feature. It helps me see what needs to be done first, and I can easily rearrange tasks when priorities change. It saves me a lot of time compared to my old spreadsheet method.'
      },
      {
        role: 'assistant',
        content: 'That\'s wonderful! The task prioritization feature seems to be really valuable for you. On the flip side, have you encountered any challenges or frustrations while using the product?'
      },
      {
        role: 'user',
        content: 'Yes, actually. The mobile app is a bit clunky. Sometimes it\'s slow to load, and the interface doesn\'t feel as intuitive as the desktop version. I wish it was more responsive when I\'m on the go.'
      },
      {
        role: 'assistant',
        content: 'I appreciate you sharing that feedback. Can you tell me more about a specific situation where the mobile app\'s performance impacted your work?'
      },
      {
        role: 'user',
        content: 'Last week, I was in a meeting and wanted to quickly update a task status, but the app took forever to sync. It was a bit embarrassing because everyone was waiting. I ended up just making a note to update it later on my laptop.'
      }
    ]
  },
  // Product Feedback Interview - Session 2 (Japanese)
  {
    id: 'session-pf-002',
    template_id: 'template-product-feedback',
    language: 'ja',
    status: 'completed',
    conversations: [
      {
        role: 'assistant',
        content: 'こんにちは！本日はお時間をいただきありがとうございます。製品についてのご経験をお伺いしたいと思います。まず、全体的な使用感についてお聞かせいただけますか？'
      },
      {
        role: 'user',
        content: 'こんにちは。全体的には満足しています。特にチーム機能が便利で、メンバー間のコミュニケーションがスムーズになりました。'
      },
      {
        role: 'assistant',
        content: 'それは良かったです！チーム機能が役立っているとのこと、嬉しく思います。具体的に、どのような場面でコミュニケーションがスムーズになったと感じられましたか？'
      },
      {
        role: 'user',
        content: 'プロジェクトの進捗確認が簡単になりました。以前はメールでやり取りしていたんですが、今はアプリ内で直接コメントできるので、情報が一箇所に集まって便利です。'
      },
      {
        role: 'assistant',
        content: 'なるほど、情報の一元管理が効率化につながっているのですね。一方で、改善してほしい点や使いにくいと感じる部分はありますか？'
      },
      {
        role: 'user',
        content: 'はい、通知機能がちょっと多すぎて、重要な通知が埋もれてしまうことがあります。通知の優先度を設定できるようになると助かります。'
      },
      {
        role: 'assistant',
        content: '貴重なフィードバックをありがとうございます。通知が多すぎて困った具体的な状況について、もう少し詳しく教えていただけますか？'
      },
      {
        role: 'user',
        content: '先週、クライアントからの重要なコメントがあったんですが、他の細かい更新通知に紛れて気づくのが遅れてしまいました。結果的に対応が遅れて、少し問題になりました。'
      }
    ]
  },
  // Product Feedback Interview - Session 3 (Active session)
  {
    id: 'session-pf-003',
    template_id: 'template-product-feedback',
    language: 'en',
    status: 'active',
    conversations: [
      {
        role: 'assistant',
        content: 'Hello! Thank you for joining this interview today. I\'d love to hear about your experience with our product. How has it been for you overall?'
      },
      {
        role: 'user',
        content: 'It\'s been good! I started using it about a month ago for team collaboration.'
      },
      {
        role: 'assistant',
        content: 'That\'s great! How has it helped with your team collaboration specifically?'
      }
    ]
  },
  // User Needs Research - Session 1 (English)
  {
    id: 'session-ur-001',
    template_id: 'template-user-research',
    language: 'en',
    status: 'completed',
    conversations: [
      {
        role: 'assistant',
        content: 'Hello! Thank you for participating in this research session. I\'m here to learn about your daily workflow and understand your needs better. Could you start by describing a typical day in your work?'
      },
      {
        role: 'user',
        content: 'Sure! I work as a marketing manager, so my day usually starts with checking emails and prioritizing tasks. Then I have meetings with my team, work on campaigns, and analyze performance metrics.'
      },
      {
        role: 'assistant',
        content: 'That sounds like a busy schedule! What would you say is the most challenging part of your daily workflow?'
      },
      {
        role: 'user',
        content: 'Definitely managing all the different tools and platforms. We use one tool for email, another for project management, another for analytics, and so on. Switching between them takes up a lot of time and mental energy.'
      },
      {
        role: 'assistant',
        content: 'I can understand how that would be challenging. Can you walk me through a specific example of when switching between tools caused a problem or slowed you down?'
      },
      {
        role: 'user',
        content: 'Last month, we were preparing for a product launch. I needed to gather data from our analytics tool, update the project management system, and then communicate findings via email and Slack. By the time I compiled everything, I had lost at least an hour just copying and pasting between platforms.'
      },
      {
        role: 'assistant',
        content: 'That must have been frustrating. What would an ideal solution look like for you? How would you prefer to handle this kind of situation?'
      },
      {
        role: 'user',
        content: 'I wish there was a central dashboard where I could see everything in one place—project status, analytics, and team communications. Something that reduces the need to constantly switch contexts would be amazing.'
      }
    ]
  },
  // User Needs Research - Session 2 (Japanese)
  {
    id: 'session-ur-002',
    template_id: 'template-user-research',
    language: 'ja',
    status: 'completed',
    conversations: [
      {
        role: 'assistant',
        content: 'こんにちは！本日は調査にご協力いただきありがとうございます。あなたの日々の業務フローについて理解を深めたいと思います。まず、典型的な1日の仕事の流れについて教えていただけますか？'
      },
      {
        role: 'user',
        content: 'はい。私はソフトウェアエンジニアとして働いています。朝はスタンドアップミーティングから始まり、その後コーディング、コードレビュー、そして午後は設計やドキュメント作成を行います。'
      },
      {
        role: 'assistant',
        content: 'なるほど、多様なタスクをこなされているのですね。その中で、最も時間がかかる、あるいは難しいと感じる作業は何ですか？'
      },
      {
        role: 'user',
        content: 'コードレビューですね。他の人のコードを理解して、適切なフィードバックをするのに時間がかかります。特に、コンテキストが分からない場合は、元のコーダーに質問したり、関連するドキュメントを探したりする必要があります。'
      },
      {
        role: 'assistant',
        content: 'コードレビューの課題についてもう少し詳しく聞かせてください。最近、特に困難だったレビューの経験はありますか？'
      },
      {
        role: 'user',
        content: '先週、大規模なリファクタリングのプルリクエストをレビューしました。変更箇所が多すぎて、全体像を把握するのに半日かかりました。コメントも少なくて、なぜその変更が必要だったのか理解するのが大変でした。'
      },
      {
        role: 'assistant',
        content: 'それは大変でしたね。理想的には、コードレビューのプロセスがどうなっていればもっと効率的になると思いますか？'
      },
      {
        role: 'user',
        content: 'プルリクエストに自動的にコンテキスト情報が付与されるといいですね。例えば、変更の背景や関連するイシュー、影響範囲などが一目で分かると助かります。AIで要約を作ってくれるツールがあれば最高です。'
      }
    ]
  },
  // User Needs Research - Session 3 (Active session in Japanese)
  {
    id: 'session-ur-003',
    template_id: 'template-user-research',
    language: 'ja',
    status: 'active',
    conversations: [
      {
        role: 'assistant',
        content: '本日はありがとうございます。あなたの日常業務について教えてください。まず、典型的な1日の流れを教えていただけますか？'
      },
      {
        role: 'user',
        content: 'デザイナーとして働いています。朝はクライアントとのミーティング、午後はデザイン作業が中心です。'
      }
    ]
  }
];

console.log('\n💬 Creating interview sessions and conversations...');
const insertSession = db.prepare(`
  INSERT INTO interview_sessions (id, template_id, language, started_at, ended_at, status)
  VALUES (?, ?, ?, datetime('now', '-' || ? || ' days'), 
          CASE WHEN ? = 'completed' THEN datetime('now', '-' || ? || ' days', '+30 minutes') ELSE NULL END,
          ?)
`);

const insertConversation = db.prepare(`
  INSERT INTO conversation_logs (session_id, role, content, timestamp)
  VALUES (?, ?, ?, datetime('now', '-' || ? || ' days', '+' || ? || ' minutes'))
`);

for (let i = 0; i < sessions.length; i++) {
  const session = sessions[i];
  const daysAgo = sessions.length - i; // More recent sessions have smaller numbers
  
  // Insert session
  insertSession.run(
    session.id,
    session.template_id,
    session.language,
    daysAgo,
    session.status,
    daysAgo,
    session.status
  );
  
  console.log(`   ✓ Created session: ${session.id} (${session.language}, ${session.status})`);
  
  // Insert conversations
  for (let j = 0; j < session.conversations.length; j++) {
    const conv = session.conversations[j];
    insertConversation.run(
      session.id,
      conv.role,
      conv.content,
      daysAgo,
      j * 2 // 2 minutes between each message
    );
  }
  console.log(`      → Added ${session.conversations.length} conversation messages`);
}

console.log('\n✅ Database seeded successfully!');
console.log('\nSummary:');
console.log(`   Templates: ${templates.length}`);
console.log(`   Sessions: ${sessions.length}`);
console.log(`   Total conversations: ${sessions.reduce((sum, s) => sum + s.conversations.length, 0)}`);

db.close();

