'use client';

import { useEffect, useRef } from 'react';
import type { Message } from '@/lib/types';
import MarkdownRenderer from './MarkdownRenderer';
import ToolIndicator from './ToolIndicator';

interface Props {
  messages: Message[];
  isStreaming: boolean;
  chatName?: string;
}

export default function ChatArea({ messages, isStreaming, chatName }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isStreaming]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-3xl shadow-lg shadow-indigo-500/20">
          J
        </div>
        <div>
          <h2 className="text-2xl font-semibold text-white mb-2">
            {chatName ? chatName : 'How can I help?'}
          </h2>
          <p className="text-[#606070] text-[15px] max-w-sm">
            Ask me anything — I can search the web, write code, do math, and more.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-2 max-w-lg">
          {SUGGESTIONS.map((s) => (
            <div
              key={s}
              className="px-3 py-1.5 rounded-full border border-[#2a2a3a] text-[#808090] text-xs hover:border-[#4a4a5a] hover:text-[#a0a0b0] cursor-default transition-colors"
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto scroll-smooth">
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isStreaming && messages[messages.length - 1]?.role !== 'assistant' && (
          <ThinkingIndicator />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%] bg-[#1e1e2e] border border-[#2e2e42] rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="text-[#e8e8ea] text-[15px] leading-7 whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-sm font-bold text-white shadow-md shadow-indigo-500/20 mt-0.5">
        J
      </div>
      <div className="flex-1 min-w-0">
        {message.toolUses && message.toolUses.length > 0 && (
          <ToolIndicator toolUses={message.toolUses} />
        )}
        <MarkdownRenderer content={message.content} />
        {message.isStreaming && (
          <span className="inline-block w-0.5 h-4 bg-[#6366f1] ml-0.5 animate-pulse align-middle" />
        )}
      </div>
    </div>
  );
}

function ThinkingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-sm font-bold text-white shadow-md shadow-indigo-500/20">
        J
      </div>
      <div className="flex items-center gap-1 py-2">
        <span className="text-[#606070] text-sm mr-1">Thinking</span>
        <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] animate-bounce [animation-delay:0ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] animate-bounce [animation-delay:150ms]" />
        <span className="w-1.5 h-1.5 rounded-full bg-[#6366f1] animate-bounce [animation-delay:300ms]" />
      </div>
    </div>
  );
}

const SUGGESTIONS = [
  'Search the web',
  'Write some code',
  'Analyze data',
  'Explain a concept',
  'Debug an issue',
  'Draft a message',
];
