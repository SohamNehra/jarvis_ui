'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
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
  onExpandProject: (projectName: string) => void;
  onRenameChat: (chatName: string, newName: string, projectName?: string) => void;
  onDeleteChat: (chatName: string, projectName?: string) => void;
  onMoveChat: (chatName: string, projectName: string | null) => void;
  onDeleteProject: (projectName: string) => void;
}

function sortChats(chats: Chat[]): Chat[] {
  return [...chats].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });
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
  onRenameChat,
  onDeleteChat,
  onMoveChat,
  onDeleteProject,
}: Props) {
  const pathname = usePathname();
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(
    () => new Set(selectedProject ? [selectedProject] : [])
  );
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
      if (next.has(name)) { next.delete(name); } else { next.add(name); }
      return next;
    });
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

  const sortedChats = sortChats(safeChats);
  const chatsWithoutProject = sortedChats.filter((c) => !c.project_name);
  const chatsByProject: Record<string, Chat[]> = {};
  for (const c of sortedChats) {
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

        {/* New Chat */}
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
          {/* Standalone chats */}
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
                  projects={safeProjects}
                  onClick={() => { onSelectChat(chat.name); onClose(); }}
                  onRename={(name) => onRenameChat(chat.name, name, chat.project_name)}
                  onDelete={() => onDeleteChat(chat.name, chat.project_name)}
                  onMove={(proj) => onMoveChat(chat.name, proj, chat.project_name)}
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
                  <ProjectItem
                    key={project.name}
                    project={project}
                    projectChats={projectChats}
                    isExpanded={isExpanded}
                    isSelected={selectedProject === project.name}
                    selectedChat={selectedChat}
                    selectedProject={selectedProject}
                    safeProjects={safeProjects}
                    onToggle={() => toggleProject(project.name)}
                    onNewChat={() => {
                      if (!expandedProjects.has(project.name)) toggleProject(project.name);
                      onNewChat(project.name);
                      onClose();
                    }}
                    onSelectChat={(chatName) => { onSelectChat(chatName, project.name); onClose(); }}
                    onRenameChat={(chatName, name) => onRenameChat(chatName, name, project.name)}
                    onDeleteChat={(chatName) => onDeleteChat(chatName, project.name)}
                    onMoveChat={onMoveChat}
                    onDeleteProject={() => onDeleteProject(project.name)}
                  />
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
              pathname === '/settings' ? 'bg-[#1e1e2e] text-white' : 'text-[#808090] hover:text-white hover:bg-[#1a1a24]',
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

// ── ProjectItem ───────────────────────────────────────────────────────────────

interface ProjectItemProps {
  project: Project;
  projectChats: Chat[];
  isExpanded: boolean;
  isSelected: boolean;
  selectedChat: string | null;
  selectedProject: string | null;
  safeProjects: Project[];
  onToggle: () => void;
  onNewChat: () => void;
  onSelectChat: (chatName: string) => void;
  onRenameChat: (chatName: string, newName: string) => void;
  onDeleteChat: (chatName: string) => void;
  onMoveChat: (chatName: string, projectName: string | null) => void;
  onDeleteProject: () => void;
}

function ProjectItem({
  project, projectChats, isExpanded, isSelected, selectedChat, selectedProject,
  safeProjects, onToggle, onNewChat, onSelectChat, onRenameChat, onDeleteChat,
  onMoveChat, onDeleteProject,
}: ProjectItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  return (
    <div onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}>
      <div className="flex items-center group">
        <button
          onClick={onToggle}
          className={[
            'flex-1 flex items-center gap-2 px-2 py-2 rounded-l-lg text-sm transition-colors min-w-0',
            isSelected ? 'text-white' : 'text-[#808090] hover:text-white',
          ].join(' ')}
        >
          <svg
            width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
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
        <button
          onClick={(e) => { e.stopPropagation(); onNewChat(); }}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 rounded text-[#505060] hover:text-white hover:bg-[#2a2a3a] transition-all"
          title={`New chat in ${project.name}`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(true); }}
            className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 mr-1 rounded text-[#505060] hover:text-white hover:bg-[#2a2a3a] transition-all"
            title="Project options"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
            </svg>
          </button>
          {showMenu && (
            <div
              ref={menuRef}
              className="absolute right-0 top-full mt-0.5 z-50 bg-[#1c1c26] border border-[#2a2a3a] rounded-xl shadow-2xl py-1 min-w-[170px]"
            >
              <MenuItem
                icon="🗑"
                label="Delete Project"
                danger
                onClick={() => { setShowConfirm(true); setShowMenu(false); }}
              />
            </div>
          )}
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#1c1c26] border border-[#2a2a3a] rounded-xl p-5 max-w-sm w-full mx-4 shadow-2xl">
            <p className="text-white text-sm font-medium mb-1">Delete project?</p>
            <p className="text-[#808090] text-xs mb-4">
              Delete &ldquo;{project.name}&rdquo; and all its chats? This cannot be undone.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => { onDeleteProject(); setShowConfirm(false); }}
                className="flex-1 py-2 rounded-lg bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs font-medium transition-colors"
              >
                Delete
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 py-2 rounded-lg bg-[#2a2a3a] hover:bg-[#3a3a4a] text-[#c0c0d0] text-xs transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

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
                projects={safeProjects}
                onClick={() => onSelectChat(chat.name)}
                onRename={(name) => onRenameChat(chat.name, name)}
                onDelete={() => onDeleteChat(chat.name)}
                onMove={(proj) => onMoveChat(chat.name, proj, chat.project_name)}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ── ChatItem ──────────────────────────────────────────────────────────────────

interface ChatItemProps {
  chat: Chat;
  isSelected: boolean;
  projects: Project[];
  onClick: () => void;
  onRename: (newName: string) => void;
  onDelete: () => void;
  onMove: (projectName: string | null) => void;
}

function ChatItem({ chat, isSelected, projects, onClick, onRename, onDelete, onMove }: ChatItemProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState(chat.name);
  const menuRef = useRef<HTMLDivElement>(null);
  const label = chat.name.replace(/-/g, ' ');

  // Close menu on outside click (setState in callback — allowed)
  useEffect(() => {
    if (!showMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showMenu]);

  const commitRename = () => {
    const trimmed = renameVal.trim();
    if (trimmed && trimmed !== chat.name) onRename(trimmed);
    else setRenameVal(chat.name);
    setIsRenaming(false);
  };

  return (
    <div
      className="relative group"
      onContextMenu={(e) => { e.preventDefault(); setShowMenu(true); }}
    >
      {isRenaming ? (
        <div className="flex items-center gap-1 px-2 py-1">
          <input
            autoFocus
            value={renameVal}
            onChange={(e) => setRenameVal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') { setRenameVal(chat.name); setIsRenaming(false); }
            }}
            onBlur={commitRename}
            className="flex-1 bg-[#0f0f14] border border-[#4a4a6a] rounded px-2 py-0.5 text-xs text-white focus:outline-none"
          />
        </div>
      ) : (
        <div
          className={[
            'flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm cursor-pointer select-none transition-colors',
            isSelected ? 'bg-[#1e1e2e] text-white' : 'text-[#808090] hover:text-[#c0c0d0] hover:bg-[#17171e]',
          ].join(' ')}
          onClick={onClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onClick()}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="flex-shrink-0 opacity-60">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span className="flex-1 truncate capitalize">{label}</span>
          {/* 3-dot button — visible on hover */}
          <button
            onClick={(e) => { e.stopPropagation(); setShowMenu(true); }}
            className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 rounded text-[#606070] hover:text-white transition-all"
            title="Chat options"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" />
            </svg>
          </button>
        </div>
      )}

      {/* Context menu */}
      {showMenu && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full mt-0.5 z-50 bg-[#1c1c26] border border-[#2a2a3a] rounded-xl shadow-2xl py-1 min-w-[170px]"
        >
          <MenuItem
            icon="✎"
            label="Rename"
            onClick={() => { setIsRenaming(true); setRenameVal(chat.name); setShowMenu(false); }}
          />

          {projects.length > 0 && (
            <>
              <div className="px-3 pt-2 pb-0.5">
                <p className="text-[10px] text-[#505060] uppercase tracking-wider font-semibold">Move to project</p>
              </div>
              {projects.map((p) => (
                <MenuItem
                  key={p.name}
                  icon="→"
                  label={p.name}
                  dimIcon
                  onClick={() => { onMove(p.name); setShowMenu(false); }}
                />
              ))}
            </>
          )}

          {chat.project_name && (
            <MenuItem
              icon="↩"
              label="Remove from project"
              onClick={() => { onMove(null); setShowMenu(false); }}
            />
          )}

          <div className="my-1 border-t border-[#2a2a3a]" />

          <MenuItem
            icon="🗑"
            label="Delete"
            danger
            onClick={() => { onDelete(); setShowMenu(false); }}
          />
        </div>
      )}
    </div>
  );
}

function MenuItem({
  icon, label, danger, dimIcon, onClick,
}: {
  icon: string;
  label: string;
  danger?: boolean;
  dimIcon?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full flex items-center gap-2.5 px-3 py-1.5 text-left text-xs transition-colors',
        danger ? 'text-[#f87171] hover:bg-[#2a1a1a]' : 'text-[#c0c0d0] hover:bg-[#2a2a3a]',
      ].join(' ')}
    >
      <span className={dimIcon ? 'opacity-40' : ''}>{icon}</span>
      {label}
    </button>
  );
}
