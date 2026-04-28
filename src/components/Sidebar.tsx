'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Project, Chat } from '@/lib/types';

interface Props {
  projects: Project[];
  chats: Chat[];
  selectedChat: string | null;
  selectedProject: string | null;
  isBackendUp: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSelectChat: (chatName: string, projectName?: string) => void;
  onNewChat: (projectName?: string) => void;
  onNewProject: (name: string, description: string) => Promise<void>;
  onExpandProject: (projectName: string) => void; // BUG 4: lazy-load project chats
}

export default function Sidebar({
  projects,
  chats,
  selectedChat,
  selectedProject,
  isBackendUp,
  isOpen,
  onClose,
  onSelectChat,
  onNewChat,
  onNewProject,
  onExpandProject,
}: Props) {
  const pathname = usePathname();
  // BUG 4: initialise with the active project already open
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    () => new Set(selectedProject ? [selectedProject] : [])
  );
  // Always treat the currently-selected project as expanded even if props change
  const effectiveExpanded = useMemo(() => {
    if (!selectedProject || expandedProjects.has(selectedProject)) return expandedProjects;
    return new Set([...expandedProjects, selectedProject]);
  }, [expandedProjects, selectedProject]);

  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjName, setNewProjName] = useState('');
  const [newProjDesc, setNewProjDesc] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);

  const toggleProject = (name: string) => {
    const willExpand = !expandedProjects.has(name);
    setExpandedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
    // BUG 4: fetch project chats when first expanded
    if (willExpand) onExpandProject(name);
  };

  const handleCreateProject = async () => {
    if (!newProjName.trim()) return;
    setCreatingProject(true);
    try {
      await onNewProject(newProjName.trim(), newProjDesc.trim());
      setNewProjName('');
      setNewProjDesc('');
      setShowNewProject(false);
    } finally {
      setCreatingProject(false);
    }
  };

  const safeChats = Array.isArray(chats) ? chats : [];
  const safeProjects = Array.isArray(projects) ? projects : [];
  const chatsWithoutProject = safeChats.filter((c) => !c.project_name);
  const chatsByProject: Record<string, Chat[]> = {};
  for (const c of safeChats) {
    if (c.project_name) {
      chatsByProject[c.project_name] = chatsByProject[c.project_name] ?? [];
      chatsByProject[c.project_name].push(c);
    }
  }

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 z-30 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={[
          'fixed lg:relative top-0 left-0 h-full z-40 lg:z-auto',
          'flex flex-col w-[260px] bg-[#111116] border-r border-[#1e1e28]',
          'transition-transform duration-200',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-[#1e1e28]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-sm font-bold text-white shadow-md shadow-indigo-500/30">
              J
            </div>
            <span className="font-semibold text-white text-[15px] tracking-tight">Jarvis</span>
          </div>
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${isBackendUp ? 'bg-[#4ade80]' : 'bg-[#ef4444]'}`}
              title={isBackendUp ? 'Backend connected' : 'Backend offline'}
            />
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded text-[#606070] hover:text-white transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* New Chat button */}
        <div className="px-3 pt-3 pb-1">
          <button
            onClick={() => { onNewChat(); onClose(); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-[#a0a0b0] hover:text-white hover:bg-[#1e1e2e] border border-[#2a2a3a] hover:border-[#3a3a4a] transition-all text-sm font-medium"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Chat
          </button>
        </div>

        {/* Scrollable list */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {/* Standalone chats (no project) */}
          {chatsWithoutProject.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 text-[10px] font-semibold text-[#505060] uppercase tracking-wider">
                Chats
              </p>
              {chatsWithoutProject.map((chat) => (
                <ChatItem
                  key={chat.name}
                  chat={chat}
                  isSelected={selectedChat === chat.name && !selectedProject}
                  onClick={() => { onSelectChat(chat.name); onClose(); }}
                />
              ))}
            </div>
          )}

          {/* Projects */}
          {safeProjects.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-2 py-1">
                <p className="text-[10px] font-semibold text-[#505060] uppercase tracking-wider">
                  Projects
                </p>
                <button
                  onClick={() => setShowNewProject((v) => !v)}
                  className="text-[#505060] hover:text-[#a0a0b0] transition-colors p-0.5 rounded"
                  title="New project"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </button>
              </div>

              {showNewProject && (
                <div className="mx-1 mb-2 p-3 rounded-xl bg-[#1a1a24] border border-[#2a2a3a] space-y-2">
                  <input
                    autoFocus
                    value={newProjName}
                    onChange={(e) => setNewProjName(e.target.value)}
                    placeholder="Project name"
                    className="w-full bg-[#0f0f14] border border-[#2a2a3a] rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-[#505060] focus:outline-none focus:border-[#4a4a6a]"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateProject()}
                  />
                  <input
                    value={newProjDesc}
                    onChange={(e) => setNewProjDesc(e.target.value)}
                    placeholder="Description (optional)"
                    className="w-full bg-[#0f0f14] border border-[#2a2a3a] rounded-lg px-2.5 py-1.5 text-sm text-white placeholder-[#505060] focus:outline-none focus:border-[#4a4a6a]"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleCreateProject}
                      disabled={!newProjName.trim() || creatingProject}
                      className="flex-1 py-1.5 rounded-lg bg-[#6366f1] hover:bg-[#5254cc] disabled:opacity-50 text-white text-xs font-medium transition-colors"
                    >
                      {creatingProject ? 'Creating…' : 'Create'}
                    </button>
                    <button
                      onClick={() => setShowNewProject(false)}
                      className="px-3 py-1.5 rounded-lg text-[#808090] hover:text-white text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {safeProjects.map((project) => {
                const projectChats = chatsByProject[project.name] ?? [];
                const isExpanded = effectiveExpanded.has(project.name);

                return (
                  <div key={project.name}>
                    {/* Project row */}
                    <div className="flex items-center group">
                      <button
                        onClick={() => toggleProject(project.name)}
                        className={[
                          'flex-1 flex items-center gap-2 px-2 py-2 rounded-l-lg text-sm transition-colors min-w-0',
                          selectedProject === project.name
                            ? 'text-white'
                            : 'text-[#808090] hover:text-white',
                        ].join(' ')}
                      >
                        <svg
                          width="11"
                          height="11"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          className={`flex-shrink-0 transition-transform duration-150 ${isExpanded ? 'rotate-90' : ''}`}
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0">
                          <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                        </svg>
                        <span className="truncate font-medium">{project.name}</span>
                        {projectChats.length > 0 && (
                          <span className="ml-auto text-[10px] text-[#505060] group-hover:text-[#707080] flex-shrink-0">
                            {projectChats.length}
                          </span>
                        )}
                      </button>

                      {/* BUG 5: "+" button to create a chat inside this project */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Expand the project so the new chat appears
                          if (!expandedProjects.has(project.name)) {
                            toggleProject(project.name);
                          }
                          onNewChat(project.name);
                          onClose();
                        }}
                        className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 mr-1 rounded text-[#505060] hover:text-white hover:bg-[#2a2a3a] transition-all"
                        title={`New chat in ${project.name}`}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </button>
                    </div>

                    {/* Project's chats */}
                    {isExpanded && (
                      <div className="ml-5 space-y-0.5 mb-1">
                        {projectChats.length === 0 ? (
                          <p className="px-2 py-1.5 text-[11px] text-[#404050] italic">No chats yet</p>
                        ) : (
                          projectChats.map((chat) => (
                            <ChatItem
                              key={chat.name}
                              chat={chat}
                              isSelected={selectedChat === chat.name && selectedProject === project.name}
                              onClick={() => { onSelectChat(chat.name, project.name); onClose(); }}
                            />
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {safeProjects.length === 0 && safeChats.length === 0 && (
            <div className="px-3 py-8 text-center">
              <p className="text-[#404050] text-xs">No conversations yet.</p>
              <p className="text-[#404050] text-xs mt-1">Start a new chat!</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[#1e1e28] p-2">
          <Link
            href="/settings"
            className={[
              'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-colors',
              pathname === '/settings'
                ? 'bg-[#1e1e2e] text-white'
                : 'text-[#808090] hover:text-white hover:bg-[#1a1a24]',
            ].join(' ')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </Link>
        </div>
      </aside>
    </>
  );
}

function ChatItem({
  chat,
  isSelected,
  onClick,
}: {
  chat: Chat;
  isSelected: boolean;
  onClick: () => void;
}) {
  const label = chat.name.replace(/-/g, ' ');
  return (
    <button
      onClick={onClick}
      className={[
        'w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors',
        isSelected
          ? 'bg-[#1e1e2e] text-white'
          : 'text-[#808090] hover:text-[#c0c0d0] hover:bg-[#17171e]',
      ].join(' ')}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 opacity-60 shrink-0">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span className="truncate capitalize">{label}</span>
    </button>
  );
}
