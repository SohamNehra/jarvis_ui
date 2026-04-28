'use client';

import type { ToolUse } from '@/lib/types';

const TOOL_META: Record<string, { icon: string; label: string }> = {
  web_search:  { icon: '🔍', label: 'Web search' },
  calculator:  { icon: '🧮', label: 'Calculator' },
  python:      { icon: '🐍', label: 'Python' },
  bash:        { icon: '💻', label: 'Terminal' },
  read_file:   { icon: '📄', label: 'Read file' },
  write_file:  { icon: '✍️', label: 'Write file' },
  browser:     { icon: '🌐', label: 'Browser' },
  memory:      { icon: '🧠', label: 'Memory' },
};

function elapsedSec(tu: ToolUse): string | null {
  if (!tu.endTime || !tu.startTime) return null;
  const s = ((tu.endTime - tu.startTime) / 1000).toFixed(1);
  return `${s}s`;
}

interface Props {
  toolUses: ToolUse[];
}

export default function ToolIndicator({ toolUses }: Props) {
  if (!toolUses?.length) return null;

  return (
    <div className="flex flex-col gap-1.5 mb-3">
      {toolUses.map((tu) => {
        const safeTool = tu.tool ?? '';
        const meta = TOOL_META[safeTool] ?? { icon: '⚙️', label: safeTool.replace(/_/g, ' ') || 'Tool' };
        const isDone = tu.status === 'done';
        const isError = tu.status === 'error';
        const elapsed = elapsedSec(tu);

        return (
          <div
            key={tu.id}
            className={[
              'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium transition-all w-fit max-w-full',
              isDone
                ? 'bg-[#0f1f0f] text-[#4ade80] border border-[#1a3a1a]'
                : isError
                ? 'bg-[#1f0f0f] text-[#f87171] border border-[#3a1a1a]'
                : 'bg-[#13131e] text-[#a5b4fc] border border-[#252540]',
            ].join(' ')}
          >
            {/* Status icon */}
            {isDone ? (
              <span className="text-[#4ade80] text-[11px] font-bold flex-shrink-0">✓</span>
            ) : isError ? (
              <span className="text-[10px] flex-shrink-0">✗</span>
            ) : (
              <Spinner />
            )}

            {/* Tool emoji + label */}
            <span className="flex-shrink-0">{meta.icon}</span>
            <span className="capitalize flex-shrink-0">{meta.label}</span>

            {/* Detail text */}
            {tu.detail && (
              <span className={[
                'truncate max-w-[240px]',
                isDone ? 'text-[#4ade80]/70' : isError ? 'text-[#f87171]/70' : 'text-[#a5b4fc]/70',
              ].join(' ')}>
                {tu.detail}
              </span>
            )}

            {/* Elapsed time */}
            {isDone && elapsed && (
              <span className="flex-shrink-0 text-[#4ade80]/50 font-normal ml-1">
                ({elapsed})
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

function Spinner() {
  return (
    <span className="flex items-center gap-[3px] flex-shrink-0">
      <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:0ms]" />
      <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:120ms]" />
      <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:240ms]" />
    </span>
  );
}
