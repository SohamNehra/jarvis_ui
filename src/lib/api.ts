import type {
  Project, Chat, Message, ChatRequest, ToolUse,
  AppSettings, SettingsStatus,
} from './types';

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

function toolDetail(name: string, input?: Record<string, unknown>): string | undefined {
  if (!input) return undefined;
  switch (name) {
    case 'web_search':
      return typeof input.query === 'string' ? `"${input.query}"` : undefined;
    case 'calculator':
      return typeof input.expression === 'string' ? input.expression : undefined;
    case 'bash':
      return typeof input.command === 'string'
        ? String(input.command).slice(0, 50)
        : undefined;
    case 'read_file':
    case 'write_file':
      return typeof input.path === 'string' ? input.path : undefined;
    default:
      return undefined;
  }
}

// ── Projects ─────────────────────────────────────────────────────────────────

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

// ── Chats ─────────────────────────────────────────────────────────────────────

export async function fetchChats(projectName?: string): Promise<Chat[]> {
  const url = projectName
    ? `${API_BASE}/api/chats?project_name=${encodeURIComponent(projectName)}`
    : `${API_BASE}/api/chats`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch chats: ${res.statusText}`);
  return toArray<Chat>(await res.json());
}

export async function renameChat(chatName: string, newName: string, projectName?: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/chats/${encodeURIComponent(chatName)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ new_name: newName, project_name: projectName }),
  });
  if (!res.ok) throw new Error(`Failed to rename chat: ${res.statusText}`);
}

export async function deleteChat(chatName: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/chats/${encodeURIComponent(chatName)}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Failed to delete chat: ${res.statusText}`);
}

export async function moveChatToProject(chatName: string, projectName: string | null): Promise<void> {
  const res = await fetch(`${API_BASE}/api/chats/${encodeURIComponent(chatName)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_name: projectName }),
  });
  if (!res.ok) throw new Error(`Failed to move chat: ${res.statusText}`);
}

// ── Chat history ──────────────────────────────────────────────────────────────

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

// ── SSE streaming ─────────────────────────────────────────────────────────────

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

          // ── A "type" field always means Format B — check it FIRST so that
          //    events like {"type":"tool_result","done":false,...} are never
          //    swallowed by Format A's "done" in parsed check. ─────────────────
          if (typeof parsed.type === 'string') {
            const evType = parsed.type;
            // Normalise tool name: backend may use "name" or "tool"
            const toolName = ((parsed.name ?? parsed.tool ?? '') as string) || 'tool';
            const toolInput = (parsed.input ?? parsed.arguments ?? {}) as Record<string, unknown>;

            if (evType === 'text' || evType === 'content') {
              const text = (parsed.content ?? parsed.text ?? '') as string;
              if (text) onToken(text);
            } else if (evType === 'tool_start' || evType === 'tool_use') {
              onToolUse({
                id: `${Date.now()}-${toolName}`,
                tool: toolName,
                input: toolInput,
                detail: toolDetail(toolName, toolInput),
                status: 'running',
                startTime: Date.now(),
              });
            } else if (evType === 'tool_end' || evType === 'tool_result') {
              onToolUse({
                id: `${Date.now()}-${toolName}-done`,
                tool: toolName,
                status: 'done',
                result: (parsed.result ?? parsed.output ?? '') as string,
                endTime: Date.now(),
              });
            } else if (evType === 'done') {
              onDone(); return;
            } else if (evType === 'error') {
              onError((parsed.message ?? parsed.error ?? 'Unknown error') as string); return;
            }

            // Some backends piggyback done:true on the last structured event
            if (parsed.done === true) { onDone(); return; }
            continue;
          }

          // ── Format A: {"token":"...","done":false}  (no "type" field) ────────
          if ('done' in parsed || 'token' in parsed) {
            if (parsed.done === true) { onDone(); return; }
            const tok = (parsed.token ?? parsed.text ?? parsed.content ?? '') as string;
            if (tok) onToken(tok);
          }
        } catch {
          // Plain-text chunk with no JSON wrapper
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

// ── Settings ──────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: AppSettings = { api_keys: {}, model: 'claude-sonnet-4-6', services: [] };

export async function fetchSettings(): Promise<AppSettings> {
  try {
    const res = await fetch(`${API_BASE}/api/settings`);
    if (!res.ok) return DEFAULT_SETTINGS;
    const data = await res.json();
    return {
      api_keys: data.api_keys ?? {},
      model: data.model ?? 'claude-sonnet-4-6',
      services: Array.isArray(data.services) ? data.services : [],
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function fetchSettingsStatus(): Promise<SettingsStatus> {
  try {
    const res = await fetch(`${API_BASE}/api/settings/status`);
    if (!res.ok) return {};
    return res.json();
  } catch {
    return {};
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const res = await fetch(`${API_BASE}/api/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error(`Failed to save settings: ${res.statusText}`);
}

// ── Notes (legacy) ────────────────────────────────────────────────────────────

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

// ── Health ────────────────────────────────────────────────────────────────────

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}
