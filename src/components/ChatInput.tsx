'use client';

import { useRef, useEffect, type KeyboardEvent } from 'react';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onStop?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  useMultiAgent: boolean;
  onToggleMultiAgent: () => void;
}

export default function ChatInput({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  disabled,
  useMultiAgent,
  onToggleMultiAgent,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
  }, [value]);

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!isStreaming && value.trim()) onSend();
    }
  };

  return (
    <div className="border-t border-[#2a2a3a] bg-[#0f0f14] px-4 py-4">
      <div className="max-w-3xl mx-auto">
        {/* Multi-agent toggle */}
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={onToggleMultiAgent}
            className={[
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all',
              useMultiAgent
                ? 'bg-[#1a1a3e] text-[#a5b4fc] border border-[#3a3a6e]'
                : 'text-[#606070] border border-[#2a2a3a] hover:border-[#4a4a5a] hover:text-[#909098]',
            ].join(' ')}
          >
            <span>⚡</span>
            <span>Multi-agent</span>
          </button>
        </div>

        <div className="flex items-end gap-3 bg-[#17171f] border border-[#2a2a3a] rounded-2xl px-4 py-3 focus-within:border-[#4a4a6a] transition-colors">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Message Jarvis..."
            disabled={disabled && !isStreaming}
            rows={1}
            className="flex-1 resize-none bg-transparent text-[#e8e8ea] placeholder-[#505060] text-[15px] leading-6 focus:outline-none min-h-[24px] max-h-[200px] font-sans"
          />

          {isStreaming ? (
            <button
              onClick={onStop}
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[#ef4444] hover:bg-[#dc2626] transition-colors"
              title="Stop generating"
            >
              <StopIcon />
            </button>
          ) : (
            <button
              onClick={onSend}
              disabled={!value.trim() || !!disabled}
              className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full bg-[#6366f1] hover:bg-[#5254cc] disabled:bg-[#2a2a3a] disabled:cursor-not-allowed transition-colors"
              title="Send message (Enter)"
            >
              <SendIcon />
            </button>
          )}
        </div>

        <p className="text-center text-[11px] text-[#404050] mt-2">
          Shift+Enter for new line · Enter to send
        </p>
      </div>
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white translate-x-0.5">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-white">
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </svg>
  );
}
