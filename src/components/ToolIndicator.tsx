'use client';

import type { ToolUse } from '@/lib/types';

const TOOL_ICONS: Record<string, string> = {
  web_search: '🔍',
  calculator: '🧮',
  python: '🐍',
  bash: '💻',
  read_file: '📄',
  write_file: '✍️',
  browser: '🌐',
  memory: '🧠',
  default: '⚙️',
};

const TOOL_LABELS: Record<string, string> = {
  web_search: 'Web Search',
  calculator: 'Calculator',
  python: 'Python',
  bash: 'Terminal',
  read_file: 'Reading file',
  write_file: 'Writing file',
  browser: 'Browser',
  memory: 'Memory',
};

interface Props {
  toolUses: ToolUse[];
}

export default function ToolIndicator({ toolUses }: Props) {
  if (!toolUses || toolUses.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {toolUses.map((tu) => {
        const icon = TOOL_ICONS[tu.tool] ?? TOOL_ICONS.default;
        const label = TOOL_LABELS[tu.tool] ?? tu.tool.replace(/_/g, ' ');
        const isDone = tu.status === 'done';
        const isError = tu.status === 'error';

        return (
          <div
            key={tu.id}
            className={[
              'flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all',
              isDone
                ? 'bg-[#1a2a1a] text-[#4ade80] border border-[#2a4a2a]'
                : isError
                ? 'bg-[#2a1a1a] text-[#f87171] border border-[#4a2a2a]'
                : 'bg-[#1a1a2e] text-[#a5b4fc] border border-[#2a2a4e]',
            ].join(' ')}
          >
            <span>{icon}</span>
            <span>{label}</span>
            {!isDone && !isError && (
              <span className="flex gap-0.5">
                <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
                <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:150ms]" />
                <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:300ms]" />
              </span>
            )}
            {isDone && <span className="text-[10px]">✓</span>}
            {isError && <span className="text-[10px]">✗</span>}
          </div>
        );
      })}
    </div>
  );
}
