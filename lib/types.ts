export interface InterviewTemplate {
  id: string;
  title: string;
  prompt: string;
  duration: number;
  created_at?: string;
}

export interface InterviewSession {
  id: string;
  template_id: string;
  language: string;
  started_at: string;
  ended_at?: string;
  status: 'active' | 'completed' | 'extended';
}

export interface ConversationLog {
  id: number;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}
