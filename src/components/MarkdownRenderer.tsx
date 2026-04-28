'use client';

import React from 'react';

interface Props {
  content: string;
}

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'code'; lang: string; code: string }
  | { kind: 'list'; ordered: boolean; items: string[] }
  | { kind: 'blockquote'; text: string }
  | { kind: 'hr' }
  | { kind: 'paragraph'; text: string };

function tokenize(raw: string): Block[] {
  const blocks: Block[] = [];
  const lines = raw.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ kind: 'code', lang, code: codeLines.join('\n') });
      i++;
      continue;
    }

    // Heading
    const hMatch = line.match(/^(#{1,6})\s+(.*)/);
    if (hMatch) {
      blocks.push({ kind: 'heading', level: hMatch[1].length, text: hMatch[2] });
      i++;
      continue;
    }

    // HR
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      blocks.push({ kind: 'hr' });
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const qLines: string[] = [line.slice(2)];
      i++;
      while (i < lines.length && lines[i].startsWith('> ')) {
        qLines.push(lines[i].slice(2));
        i++;
      }
      blocks.push({ kind: 'blockquote', text: qLines.join('\n') });
      continue;
    }

    // Unordered list
    if (/^[-*+]\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s/, ''));
        i++;
      }
      blocks.push({ kind: 'list', ordered: false, items });
      continue;
    }

    // Ordered list
    if (/^\d+\.\s/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s/, ''));
        i++;
      }
      blocks.push({ kind: 'list', ordered: true, items });
      continue;
    }

    // Blank line — skip
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Paragraph — accumulate consecutive lines
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('#') &&
      !lines[i].startsWith('```') &&
      !lines[i].startsWith('> ') &&
      !/^[-*+]\s/.test(lines[i]) &&
      !/^\d+\.\s/.test(lines[i]) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push({ kind: 'paragraph', text: paraLines.join('\n') });
  }

  return blocks;
}

function renderInline(text: string): React.ReactNode {
  const segments: React.ReactNode[] = [];
  let pos = 0;
  let textStart = 0;
  let key = 0;

  const flush = (end: number) => {
    if (textStart < end) {
      segments.push(text.slice(textStart, end));
    }
  };

  while (pos < text.length) {
    // Inline code
    if (text[pos] === '`') {
      const end = text.indexOf('`', pos + 1);
      if (end !== -1) {
        flush(pos);
        segments.push(
          <code key={key++} className="bg-[#1e1e2e] text-[#a5b4fc] px-1.5 py-0.5 rounded text-[0.875em] font-mono">
            {text.slice(pos + 1, end)}
          </code>
        );
        pos = end + 1;
        textStart = pos;
        continue;
      }
    }

    // Bold+italic ***
    if (text.slice(pos, pos + 3) === '***') {
      const end = text.indexOf('***', pos + 3);
      if (end !== -1) {
        flush(pos);
        segments.push(<strong key={key++}><em>{text.slice(pos + 3, end)}</em></strong>);
        pos = end + 3;
        textStart = pos;
        continue;
      }
    }

    // Bold **
    if (text.slice(pos, pos + 2) === '**') {
      const end = text.indexOf('**', pos + 2);
      if (end !== -1) {
        flush(pos);
        segments.push(<strong key={key++} className="font-semibold text-white">{text.slice(pos + 2, end)}</strong>);
        pos = end + 2;
        textStart = pos;
        continue;
      }
    }

    // Italic *
    if (text[pos] === '*' && text[pos - 1] !== '*' && text[pos + 1] !== '*') {
      const end = text.indexOf('*', pos + 1);
      if (end !== -1 && text[end + 1] !== '*') {
        flush(pos);
        segments.push(<em key={key++} className="italic">{text.slice(pos + 1, end)}</em>);
        pos = end + 1;
        textStart = pos;
        continue;
      }
    }

    // Link
    if (text[pos] === '[') {
      const close = text.indexOf(']', pos);
      if (close !== -1 && text[close + 1] === '(') {
        const urlEnd = text.indexOf(')', close + 2);
        if (urlEnd !== -1) {
          flush(pos);
          const linkText = text.slice(pos + 1, close);
          const url = text.slice(close + 2, urlEnd);
          segments.push(
            <a
              key={key++}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#a5b4fc] hover:text-[#c4b5fd] underline underline-offset-2 transition-colors"
            >
              {linkText}
            </a>
          );
          pos = urlEnd + 1;
          textStart = pos;
          continue;
        }
      }
    }

    pos++;
  }

  flush(text.length);

  if (segments.length === 0) return text;
  if (segments.length === 1) return segments[0];
  return <>{segments}</>;
}

function renderBlock(block: Block, index: number): React.ReactNode {
  switch (block.kind) {
    case 'heading': {
      const cls = [
        'font-semibold text-white leading-tight',
        block.level === 1 ? 'text-2xl mt-6 mb-3' :
        block.level === 2 ? 'text-xl mt-5 mb-2' :
        block.level === 3 ? 'text-lg mt-4 mb-2' :
        'text-base mt-3 mb-1',
      ].join(' ');
      return React.createElement(
        `h${block.level}`,
        { key: index, className: cls },
        renderInline(block.text)
      );
    }

    case 'code':
      return (
        <div key={index} className="my-3 rounded-xl overflow-hidden border border-[#2a2a3a]">
          {block.lang && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#13131a] border-b border-[#2a2a3a]">
              <span className="text-xs font-mono text-[#7070a0] uppercase tracking-wider">{block.lang}</span>
            </div>
          )}
          <pre className="overflow-x-auto p-4 bg-[#0d0d14] text-[#cdd6f4] text-sm leading-relaxed font-mono">
            <code>{block.code}</code>
          </pre>
        </div>
      );

    case 'list':
      return block.ordered ? (
        <ol key={index} className="my-2 pl-6 space-y-1 list-decimal marker:text-[#7070a0]">
          {block.items.map((item, j) => (
            <li key={j} className="text-[#e2e2ea] leading-relaxed">{renderInline(item)}</li>
          ))}
        </ol>
      ) : (
        <ul key={index} className="my-2 pl-6 space-y-1 list-disc marker:text-[#7070a0]">
          {block.items.map((item, j) => (
            <li key={j} className="text-[#e2e2ea] leading-relaxed">{renderInline(item)}</li>
          ))}
        </ul>
      );

    case 'blockquote':
      return (
        <blockquote key={index} className="my-3 pl-4 border-l-2 border-[#6366f1] text-[#9090b0] italic">
          {renderInline(block.text)}
        </blockquote>
      );

    case 'hr':
      return <hr key={index} className="my-4 border-[#2a2a3a]" />;

    case 'paragraph':
      return (
        <p key={index} className="my-2 text-[#e2e2ea] leading-7">
          {renderInline(block.text)}
        </p>
      );
  }
}

export default function MarkdownRenderer({ content }: Props) {
  if (!content) return null;
  const blocks = tokenize(content);
  return (
    <div className="text-[15px] leading-7 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      {blocks.map((block, i) => renderBlock(block, i))}
    </div>
  );
}
