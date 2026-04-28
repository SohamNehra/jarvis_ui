import type { Project, Chat, Message, ChatRequest, StreamEvent, ToolUse } from './types';

const API_BASE = 'http://localhost:8000';

function toArray<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === 'object') {
    for (const key of ['items', 'data', 'results', 'projects', 'chats', 'messages']) {
      const v = (data as Record<string, unknown>)[key];
      if (Array.isArray(v)) return v as T[];
    }
  }
  return [];
}

export async function fetchProjects(): Promise<Project[]> {
  const res = await fetch(`${API_BASE}/api/projects`);
  if (!res.ok) throw new Error(`Failed to fetch projects: ${res.statusText}`);
  return toArray<Project>(await res.json());
}

export async function createProject(name: string, description: string): Promise<Project> {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error(`Failed to create project: ${res.statusText}`);
  return res.json();
}

export async function fetchChats(projectName?: string): Promise<Chat[]> {
  const url = projectName
    ? `${API_BASE}/api/chats?project_name=${encodeURIComponent(projectName)}`
    : `${API_BASE}/api/chats`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch chats: ${res.statusText}`);
  return toArray<Chat>(await res.json());
}

// Gracefully returns [] if endpoint doesn't exist yet
export async function fetchChatHistory(
  chatName: string,
  projectName?: string
): Promise<Message[]> {
  try {
    const url = new URL(`${API_BASE}/api/chat/history`);
    url.searchParams.set('chat_name', chatName);
    if (projectName) url.searchParams.set('project_name', projectName);
    const res = await fetch(url.toString());
    if (!res.ok) return [];
    const raw = toArray<{ role: string; content: string }>(await res.json());
    return raw.map((m, i) => ({
      id: `hist-${i}-${Date.now()}`,
      role: (m.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content ?? '',
    }));
  } catch {
    return [];
  }
}

export async function streamChat(
  body: ChatRequest,
  onToken: (text: string) => void,
  onToolUse: (tool: ToolUse) => void,
  onDone: () => void,
  onError: (error: string) => void,
  signal?: AbortSignal
): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/api/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      onError(`API error ${res.status}: ${text}`);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) { onError('No response body'); return; }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (!data) continue;
        if (data === '[DONE]') { onDone(); return; }

        try {
          const parsed = JSON.parse(data) as Record<string, unknown>;

          // ── Format A: {"token": "...", "done": false}  (FastAPI default) ──
          if ('done' in parsed || 'token' in parsed) {
            if (parsed.done === true) { onDone(); return; }
            const tok = parsed.token ?? parsed.text ?? parsed.content;
            if (typeof tok === 'string' && tok) onToken(tok);
            continue;
          }

          // ── Format B: {"type": "...", ...}  (structured events) ──
          const event = parsed as StreamEvent;
          if (event.type === 'text' || event.type === 'content') {
            onToken(event.content);
          } else if (event.type === 'tool_use') {
            onToolUse({ id: `${Date.now()}-${event.name}`, tool: event.name, input: event.input, status: 'running' });
          } else if (event.type === 'tool_result') {
            onToolUse({ id: `${Date.now()}-${event.name}-done`, tool: event.name, status: 'done', result: event.result });
          } else if (event.type === 'done') {
            onDone(); return;
          } else if (event.type === 'error') {
            onError(event.message); return;
          }
        } catch {
          // Plain-text chunk (no JSON wrapping)
          if (data) onToken(data);
        }
      }
    }
    onDone();
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      onDone();
    } else {
      onError((err as Error).message ?? 'Unknown error');
    }
  }
}

export async function fetchNotes(): Promise<Record<string, Record<string, string>>> {
  const res = await fetch(`${API_BASE}/api/notes`);
  if (!res.ok) throw new Error(`Failed to fetch notes: ${res.statusText}`);
  return res.json();
}

export async function updateNote(section: string, key: string, value: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/notes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section, key, value }),
  });
  if (!res.ok) throw new Error(`Failed to update note: ${res.statusText}`);
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
