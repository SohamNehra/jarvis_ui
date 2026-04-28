'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import type { Project, Chat, Message, ToolUse } from '@/lib/types';
import {
  fetchProjects,
  fetchChats,
  fetchChatHistory,
  createProject,
  deleteProject,
  streamChat,
  checkHealth,
  renameChat,
  deleteChat,
  moveChatToProject,
} from '@/lib/api';
import Sidebar from './Sidebar';
import ChatArea from './ChatArea';
import ChatInput from './ChatInput';

function chatNameFromText(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5)
    .join('-');
  return slug.slice(0, 50) || `chat-${Date.now()}`;
}

function buildChatUrl(chatName: string, projectName?: string): string {
  const p = new URLSearchParams();
  p.set('chat', chatName);
  if (projectName) p.set('project', projectName);
  return `/chat?${p.toString()}`;
}

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const chatNameFromUrl = searchParams.get('chat') ?? undefined;
  const projectNameFromUrl = searchParams.get('project') ?? undefined;

  // activeChatName is the single source of truth for the open conversation.
  // URL is updated explicitly at well-defined moments (never during SSE streaming).
  const [activeChatName, setActiveChatName] = useState<string | undefined>(chatNameFromUrl);
  const [activeProjectName, setActiveProjectName] = useState<string | undefined>(projectNameFromUrl);

  // Ref so effects can read activeChatName without it being a dependency.
  const activeChatNameRef = useRef<string | undefined>(chatNameFromUrl);
  const updateActiveChatName = useCallback((name: string | undefined) => {
    activeChatNameRef.current = name;
    setActiveChatName(name);
  }, []);

  const [projects, setProjects] = useState<Project[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isBackendUp, setIsBackendUp] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [useMultiAgent, setUseMultiAgent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const streamingToolUsesRef = useRef<ToolUse[]>([]);
  const [streamingToolUses, setStreamingToolUses] = useState<ToolUse[]>([]);

  // ── Mount: health check + sidebar data + history restore ─────────────────
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      const healthy = await checkHealth();
      if (!mounted) return;
      setIsBackendUp(healthy);
      if (!healthy) return;
      try {
        const [projs, cts] = await Promise.all([fetchProjects(), fetchChats()]);
        if (!mounted) return;
        setProjects(projs);
        setChats(cts);
        if (chatNameFromUrl) {
          const history = await fetchChatHistory(chatNameFromUrl, projectNameFromUrl);
          if (mounted && history.length > 0) setMessages(history);
        }
      } catch (e) {
        if (!mounted) return;
        setError((e as Error).message);
      }
    };
    init();
    return () => { mounted = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── External navigation (browser back/forward) ───────────────────────────
  // Fires ONLY when chatNameFromUrl changes. Uses the ref so activeChatName
  // is not a dependency (which would fire on every sendMessage).
  // setState is only called inside .then() — the allowed pattern for this rule.
  useEffect(() => {
    if (chatNameFromUrl === activeChatNameRef.current) return;
    updateActiveChatName(chatNameFromUrl);
    setActiveProjectName(projectNameFromUrl);
    setMessages([]);
    setError(null);
    if (chatNameFromUrl) {
      const name = chatNameFromUrl;
      const proj = projectNameFromUrl;
      fetchChatHistory(name, proj)
        .then((h) => { if (h.length > 0) setMessages(h); })
        .catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chatNameFromUrl, projectNameFromUrl]);

  // ── Sidebar: select an existing chat ─────────────────────────────────────
  const selectChat = useCallback(
    (chatName: string, projectName?: string) => {
      if (chatName === activeChatNameRef.current) return;
      abortRef.current?.abort();
      streamingToolUsesRef.current = [];
      setStreamingToolUses([]);
      setMessages([]);
      setError(null);
      setIsStreaming(false);
      updateActiveChatName(chatName);
      setActiveProjectName(projectName);
      // Explicit URL update — NOT via a useEffect so it can't race with messages
      router.push(buildChatUrl(chatName, projectName));
      // Load history (no synchronous setState before first await)
      fetchChatHistory(chatName, projectName)
        .then((h) => { if (h.length > 0) setMessages(h); })
        .catch(() => {});
    },
    [updateActiveChatName, router]
  );

  // ── Sidebar: new blank chat (optionally inside a project) ─────────────────
  const newChat = useCallback(
    (projectName?: string) => {
      abortRef.current?.abort();
      streamingToolUsesRef.current = [];
      setStreamingToolUses([]);
      setMessages([]);
      setError(null);
      setIsStreaming(false);
      updateActiveChatName(undefined);
      setActiveProjectName(projectName);
      // Clear URL
      if (projectName) {
        router.replace(`/chat?project=${encodeURIComponent(projectName)}`);
      } else {
        router.replace('/chat');
      }
    },
    [updateActiveChatName, router]
  );

  const handleNewProject = useCallback(async (name: string, description: string) => {
    const proj = await createProject(name, description);
    setProjects((prev) => [...prev, proj]);
  }, []);

  // ── Chat management (rename / delete / move) ─────────────────────────────
  const handleRenameChat = useCallback(
    async (chatName: string, newName: string, projectName?: string) => {
      try {
        await renameChat(chatName, newName, projectName);
        setChats((prev) =>
          prev.map((c) => (c.name === chatName ? { ...c, name: newName } : c))
        );
        if (activeChatName === chatName) updateActiveChatName(newName);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [activeChatName, updateActiveChatName]
  );

  const handleDeleteChat = useCallback(
    async (chatName: string, projectName?: string) => {
      try {
        await deleteChat(chatName);
        setChats((prev) => prev.filter((c) => c.name !== chatName));
        if (activeChatName === chatName) newChat(projectName);
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [activeChatName, newChat]
  );

  const handleMoveChat = useCallback(
    async (chatName: string, newProjectName: string | null, fromProjectName?: string | null) => {
      try {
        await moveChatToProject(chatName, newProjectName, fromProjectName);
        setChats((prev) =>
          prev.map((c) =>
            c.name === chatName
              ? { ...c, project_name: newProjectName ?? undefined }
              : c
          )
        );
      } catch (e) {
        setError((e as Error).message);
      }
    },
    []
  );

  const handleDeleteProject = useCallback(
    async (projectName: string) => {
      try {
        await deleteProject(projectName);
        setProjects((prev) => prev.filter((p) => p.name !== projectName));
        setChats((prev) => prev.filter((c) => c.project_name !== projectName));
        if (activeProjectName === projectName) newChat();
      } catch (e) {
        setError((e as Error).message);
      }
    },
    [activeProjectName, newChat]
  );

  const loadedProjectsRef = useRef<Set<string>>(new Set());
  const handleExpandProject = useCallback(async (projectName: string) => {
    if (loadedProjectsRef.current.has(projectName)) return;
    loadedProjectsRef.current.add(projectName);
    try {
      const projectChats = await fetchChats(projectName);
      setChats((prev) => [
        ...prev.filter((c) => c.project_name !== projectName),
        ...projectChats,
      ]);
    } catch { /* sidebar shows whatever we have */ }
  }, []);

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    streamingToolUsesRef.current = [];
    setStreamingToolUses([]);
    setIsStreaming(false);
    setMessages((prev) => prev.map((m) => (m.isStreaming ? { ...m, isStreaming: false } : m)));
  }, []);

  // ── Send a message ────────────────────────────────────────────────────────
  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput('');
    setError(null);

    const chatName = activeChatName ?? chatNameFromText(text);
    const projName = activeProjectName;
    const isNewChat = !activeChatName;

    if (isNewChat) {
      updateActiveChatName(chatName);
      setChats((prev) =>
        prev.some((c) => c.name === chatName)
          ? prev
          : [{ name: chatName, project_name: projName }, ...prev]
      );
    }

    // Add user + placeholder assistant message BEFORE streaming starts
    const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', content: text };
    const assistantMsg: Message = { id: `asst-${Date.now()}`, role: 'assistant', content: '', toolUses: [], isStreaming: true };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    streamingToolUsesRef.current = [];
    setStreamingToolUses([]);
    setIsStreaming(true);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    await streamChat(
      { message: text, chat_name: chatName, project_name: projName, use_multi_agent: useMultiAgent },
      // onToken — append to last assistant message; never touch toolUses
      (token) => {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: last.content + token };
          }
          return updated;
        });
      },
      // onToolUse — update streamingToolUses only; never touch messages
      (toolUse: ToolUse) => {
        setStreamingToolUses((prev) => {
          let next: ToolUse[];
          if (toolUse.status === 'done') {
            next = prev.map((t) =>
              t.tool === toolUse.tool && t.status === 'running'
                ? { ...t, status: 'done' as const, result: toolUse.result, endTime: toolUse.endTime }
                : t
            );
          } else {
            next = [...prev, toolUse];
          }
          streamingToolUsesRef.current = next;
          return next;
        });
      },
      // onDone — read tool uses from ref (avoids nested setState), merge into last message
      () => {
        const doneAt = Date.now();
        const finalToolUses = streamingToolUsesRef.current.map((t) =>
          t.status === 'running' ? { ...t, status: 'done' as const, endTime: doneAt } : t
        );
        streamingToolUsesRef.current = [];
        setStreamingToolUses([]);
        setIsStreaming(false);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = { ...last, isStreaming: false, toolUses: finalToolUses };
          }
          return updated;
        });
        if (isNewChat) {
          router.replace(buildChatUrl(chatName, projName));
        }
      },
      // onError
      (err) => {
        streamingToolUsesRef.current = [];
        setStreamingToolUses([]);
        setIsStreaming(false);
        setError(err);
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last?.role === 'assistant') {
            updated[updated.length - 1] = { ...last, isStreaming: false, content: last.content || `_Error: ${err}_` };
          }
          return updated;
        });
      },
      ctrl.signal
    );
  }, [input, isStreaming, activeChatName, activeProjectName, useMultiAgent, updateActiveChatName, router]);

  const displayChatName = activeChatName?.replace(/-/g, ' ');

  return (
    <div className="flex h-screen bg-[#0f0f14] overflow-hidden">
      <Sidebar
        projects={projects}
        chats={chats}
        selectedChat={activeChatName ?? null}
        selectedProject={activeProjectName ?? null}
        isBackendUp={isBackendUp}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectChat={selectChat}
        onNewChat={newChat}
        onNewProject={handleNewProject}
        onExpandProject={handleExpandProject}
        onRenameChat={handleRenameChat}
        onDeleteChat={handleDeleteChat}
        onMoveChat={handleMoveChat}
        onDeleteProject={handleDeleteProject}
      />

      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className="flex items-center gap-3 px-4 py-3 border-b border-[#1e1e28] bg-[#0f0f14]">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-1.5 rounded-lg text-[#606070] hover:text-white hover:bg-[#1e1e28] transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            {displayChatName ? (
              <div className="flex items-center gap-2">
                <span className="text-white font-medium text-sm truncate capitalize">
                  {displayChatName}
                </span>
                {activeProjectName && (
                  <span className="text-[#505060] text-xs truncate">· {activeProjectName}</span>
                )}
              </div>
            ) : (
              <span className="text-[#606070] text-sm">New conversation</span>
            )}
          </div>

          {!isBackendUp && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#2a1a1a] border border-[#4a2a2a]">
              <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]" />
              <span className="text-[#ef4444] text-xs font-medium">Backend offline</span>
            </div>
          )}
        </header>

        {error && (
          <div className="mx-4 mt-3 flex items-center justify-between px-4 py-2 rounded-xl bg-[#2a1a1a] border border-[#4a2a2a]">
            <span className="text-[#f87171] text-sm">{error}</span>
            <button
              onClick={() => setError(null)}
              className="text-[#f87171] hover:text-red-300 ml-3 text-lg leading-none"
            >
              ×
            </button>
          </div>
        )}

        <ChatArea
          messages={messages}
          isStreaming={isStreaming}
          chatName={displayChatName}
          streamingToolUses={streamingToolUses}
        />

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={sendMessage}
          onStop={stopStreaming}
          isStreaming={isStreaming}
          disabled={!isBackendUp}
          useMultiAgent={useMultiAgent}
          onToggleMultiAgent={() => setUseMultiAgent((v) => !v)}
        />
      </div>
    </div>
  );
}
