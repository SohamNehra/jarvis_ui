'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { updateNote, fetchNotes } from '@/lib/api';

interface ApiKeys {
  ANTHROPIC_API_KEY: string;
  OPENAI_API_KEY: string;
  TAVILY_API_KEY: string;
}

const MODELS = [
  { id: 'claude-opus-4-7', label: 'Claude Opus 4.7 (Most capable)' },
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Balanced)' },
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Fast)' },
  { id: 'gpt-4o', label: 'GPT-4o' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
];

const KEY_LABELS: Record<keyof ApiKeys, string> = {
  ANTHROPIC_API_KEY: 'Anthropic API Key',
  OPENAI_API_KEY: 'OpenAI API Key',
  TAVILY_API_KEY: 'Tavily API Key',
};

export default function SettingsPage() {
  const [keys, setKeys] = useState<ApiKeys>(() => {
    if (typeof window === 'undefined') return { ANTHROPIC_API_KEY: '', OPENAI_API_KEY: '', TAVILY_API_KEY: '' };
    try {
      const parsed = JSON.parse(localStorage.getItem('jarvis-settings') ?? '{}');
      return parsed.keys ?? { ANTHROPIC_API_KEY: '', OPENAI_API_KEY: '', TAVILY_API_KEY: '' };
    } catch {
      return { ANTHROPIC_API_KEY: '', OPENAI_API_KEY: '', TAVILY_API_KEY: '' };
    }
  });
  const [model, setModel] = useState(() => {
    if (typeof window === 'undefined') return 'claude-sonnet-4-6';
    try {
      const parsed = JSON.parse(localStorage.getItem('jarvis-settings') ?? '{}');
      return parsed.model ?? 'claude-sonnet-4-6';
    } catch {
      return 'claude-sonnet-4-6';
    }
  });
  const [revealed, setRevealed] = useState<Set<keyof ApiKeys>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNotes().then((notes) => {
      const apiKeys = notes?.api_keys ?? {};
      const modelVal = notes?.settings?.model;
      setKeys((prev) => ({
        ANTHROPIC_API_KEY: apiKeys.ANTHROPIC_API_KEY ?? prev.ANTHROPIC_API_KEY,
        OPENAI_API_KEY: apiKeys.OPENAI_API_KEY ?? prev.OPENAI_API_KEY,
        TAVILY_API_KEY: apiKeys.TAVILY_API_KEY ?? prev.TAVILY_API_KEY,
      }));
      if (modelVal) setModel(modelVal);
    }).catch(() => {});
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      // Save to localStorage
      localStorage.setItem('jarvis-settings', JSON.stringify({ keys, model }));

      // Send to backend via notes API
      await Promise.all([
        ...Object.entries(keys).map(([k, v]) =>
          v ? updateNote('api_keys', k, v) : Promise.resolve()
        ),
        updateNote('settings', 'model', model),
      ]);

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const toggleReveal = (key: keyof ApiKeys) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen bg-[#0f0f14] overflow-hidden">
      {/* Sidebar-like back panel */}
      <div className="w-[260px] flex-shrink-0 border-r border-[#1e1e28] bg-[#111116] flex flex-col">
        <div className="flex items-center gap-2.5 px-4 py-4 border-b border-[#1e1e28]">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#6366f1] to-[#8b5cf6] flex items-center justify-center text-sm font-bold text-white">
            J
          </div>
          <span className="font-semibold text-white text-[15px]">Jarvis</span>
        </div>
        <div className="flex-1 p-2">
          <Link
            href="/chat"
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-[#808090] hover:text-white hover:bg-[#1a1a24] transition-colors text-sm"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            Back to Chat
          </Link>
        </div>
        <div className="border-t border-[#1e1e28] p-2">
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#1e1e2e] text-white text-sm">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            Settings
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-10">
          <h1 className="text-2xl font-semibold text-white mb-1">Settings</h1>
          <p className="text-[#606070] text-sm mb-8">Configure your Jarvis assistant</p>

          {/* API Keys */}
          <section className="mb-8">
            <h2 className="text-[#a0a0b0] text-xs font-semibold uppercase tracking-wider mb-4">
              API Keys
            </h2>
            <div className="space-y-3">
              {(Object.keys(keys) as (keyof ApiKeys)[]).map((key) => (
                <div key={key} className="bg-[#17171f] border border-[#2a2a3a] rounded-xl p-4">
                  <label className="block text-sm font-medium text-[#c0c0d0] mb-2">
                    {KEY_LABELS[key]}
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type={revealed.has(key) ? 'text' : 'password'}
                        value={keys[key]}
                        onChange={(e) => setKeys((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder={`Enter your ${KEY_LABELS[key]}…`}
                        className="w-full bg-[#0f0f14] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#404050] focus:outline-none focus:border-[#4a4a6a] font-mono tracking-wider pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleReveal(key)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#505060] hover:text-[#a0a0b0] transition-colors"
                      >
                        {revealed.has(key) ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                  </div>
                  {key === 'ANTHROPIC_API_KEY' && (
                    <p className="mt-1.5 text-[11px] text-[#505060]">
                      Required for Claude models
                    </p>
                  )}
                  {key === 'OPENAI_API_KEY' && (
                    <p className="mt-1.5 text-[11px] text-[#505060]">
                      Required for GPT models
                    </p>
                  )}
                  {key === 'TAVILY_API_KEY' && (
                    <p className="mt-1.5 text-[11px] text-[#505060]">
                      Required for web search tool
                    </p>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Model Selection */}
          <section className="mb-8">
            <h2 className="text-[#a0a0b0] text-xs font-semibold uppercase tracking-wider mb-4">
              Model
            </h2>
            <div className="bg-[#17171f] border border-[#2a2a3a] rounded-xl p-4">
              <label className="block text-sm font-medium text-[#c0c0d0] mb-3">
                Default Model
              </label>
              <div className="space-y-2">
                {MODELS.map((m) => (
                  <label
                    key={m.id}
                    className={[
                      'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                      model === m.id
                        ? 'bg-[#1e1e3a] border border-[#3a3a6a]'
                        : 'hover:bg-[#1a1a24] border border-transparent',
                    ].join(' ')}
                  >
                    <div
                      className={[
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0',
                        model === m.id
                          ? 'border-[#6366f1]'
                          : 'border-[#404050]',
                      ].join(' ')}
                    >
                      {model === m.id && (
                        <div className="w-2 h-2 rounded-full bg-[#6366f1]" />
                      )}
                    </div>
                    <input
                      type="radio"
                      name="model"
                      value={m.id}
                      checked={model === m.id}
                      onChange={() => setModel(m.id)}
                      className="sr-only"
                    />
                    <span className="text-sm text-[#c0c0d0]">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Save */}
          {error && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-[#2a1a1a] border border-[#4a2a2a] text-[#f87171] text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className={[
              'flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all',
              saved
                ? 'bg-[#1a2a1a] text-[#4ade80] border border-[#2a4a2a]'
                : 'bg-[#6366f1] hover:bg-[#5254cc] text-white disabled:opacity-60',
            ].join(' ')}
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : saved ? (
              <>
                <span>✓</span> Saved
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
