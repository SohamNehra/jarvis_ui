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
  detail?: string;       // human-readable summary, e.g. "Searching for 'bitcoin price'"
  status: 'running' | 'done' | 'error';
  result?: string;
  startTime?: number;    // Date.now() at tool_start
  endTime?: number;      // Date.now() at tool_end
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

export interface Service {
  id: string;
  name: string;
  api_key: string;
  base_url: string;
}

export interface AppSettings {
  api_keys: Record<string, string>;
  model: string;
  services: Service[];
}

export type SettingsStatus = Record<string, boolean>;

export type StreamEvent =
  | { type: 'text'; content: string }
  | { type: 'content'; content: string }
  | { type: 'tool_use'; name: string; input?: Record<string, unknown> }
  | { type: 'tool_result'; name: string; result: string }
  | { type: 'tool_start'; name: string; input?: Record<string, unknown> }
  | { type: 'tool_end'; name: string }
  | { type: 'error'; message: string }
  | { type: 'done' };
