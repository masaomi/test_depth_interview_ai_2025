export interface TemplateTranslation {
  title: string;
  prompt: string;
}

export interface InterviewTemplate {
  id: string;
  title: string;
  prompt: string;
  duration: number;
  translations?: string; // JSON string of translations
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

export interface ReportAggregation {
  id: string;
  created_at: string;
  llm_model: string;
  total_sessions: number;
  status: 'processing' | 'completed' | 'failed';
}

export interface ReportDetail {
  id: number;
  aggregation_id: string;
  template_id: string;
  template_title: string;
  language: string;
  total_interviews: number;
  completed_interviews: number;
  in_progress_interviews: number;
  total_messages: number;
  avg_duration: string;
  last_conducted_at?: string;
  executive_summary?: string;
  key_findings?: string; // JSON string
  segment_analysis?: string;
  recommended_actions?: string; // JSON string
}
