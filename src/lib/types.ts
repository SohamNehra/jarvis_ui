export interface Project {
  name: string;
  description?: string;
}

export interface Chat {
  name: string;
  project_name?: string;
  created_at?: string;
}

export interface ToolUse {
  id: string;
  tool: string;
  input?: Record<string, unknown>;
  status: 'running' | 'done' | 'error';
  result?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  toolUses?: ToolUse[];
  isStreaming?: boolean;
}

export interface ChatRequest {
  message: string;
  chat_name?: string;
  project_name?: string;
  use_multi_agent?: boolean;
}

export type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'content'; content: string }
  | { type: 'tool_use'; name: string; input?: Record<string, unknown> }
  | { type: 'tool_result'; name: string; result: string }
  | { type: 'error'; message: string }
  | { type: 'done' };
