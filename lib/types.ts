export interface TemplateTranslation {
  title: string;
  prompt: string;
  overview?: string;
}

export interface InterviewTemplate {
  id: string;
  title: string;
  prompt: string;
  overview?: string; // Formatted overview for display on interview start screen
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
  summary?: string;
}

export type QuestionType = 'text' | 'single_choice' | 'multi_choice' | 'scale';

export interface QuestionMetadata {
  type: QuestionType;
  options?: string[]; // For single_choice and multi_choice
  scaleMin?: number; // For scale (default: 1)
  scaleMax?: number; // For scale (default: 5)
  scaleMinLabel?: string; // Label for minimum value
  scaleMaxLabel?: string; // Label for maximum value
}

export interface ResponseMetadata {
  questionType: QuestionType;
  selectedOptions?: string[]; // For single_choice and multi_choice
  scaleValue?: number; // For scale
}

export interface AIResponse {
  question: string;
  type: QuestionType;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  scaleMinLabel?: string;
  scaleMaxLabel?: string;
}

export interface ConversationLog {
  id: number;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: string; // JSON string of QuestionMetadata or ResponseMetadata
  timestamp: string;
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: QuestionMetadata | ResponseMetadata;
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
  avg_duration_seconds?: number;
  last_conducted_at?: string;
  executive_summary?: string;
  key_findings?: string; // JSON string
  segment_analysis?: string;
  recommended_actions?: string; // JSON string
}
