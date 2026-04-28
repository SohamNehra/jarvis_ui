'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { fetchSettings, fetchSettingsStatus, saveSettings } from '@/lib/api';
import type { AppSettings, Service, SettingsStatus } from '@/lib/types';

const MODELS = [
  { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5', sub: 'Fast & affordable' },
  { id: 'claude-sonnet-4-6',         label: 'Claude Sonnet 4.6', sub: 'Balanced performance' },
  { id: 'claude-opus-4-6',           label: 'Claude Opus 4.6',  sub: 'Most capable' },
];

const BUILTIN_KEYS = [
  { key: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key', hint: 'Required for Claude models' },
  { key: 'OPENAI_API_KEY',    label: 'OpenAI API Key',    hint: 'Required for GPT models' },
  { key: 'TAVILY_API_KEY',    label: 'Tavily API Key',    hint: 'Required for web search' },
] as const;

function makeId() {
  return `svc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    api_keys: {},
    model: 'claude-sonnet-4-6',
    services: [],
  });
  const [status, setStatus] = useState<SettingsStatus>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New service form state
  const [addingService, setAddingService] = useState(false);
  const [newSvc, setNewSvc] = useState<Omit<Service, 'id'>>({ name: '', api_key: '', base_url: '' });

  useEffect(() => {
    // setState only inside .then() — satisfies react-hooks/set-state-in-effect
    Promise.all([fetchSettings(), fetchSettingsStatus()])
      .then(([s, st]) => {
        setSettings(s);
        setStatus(st);
      })
      .catch(() => {});
  }, []);

  const setKey = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, api_keys: { ...prev.api_keys, [key]: value } }));
  };

  const toggleReveal = (key: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { next.delete(key); } else { next.add(key); }
      return next;
    });
  };

  const addService = () => {
    if (!newSvc.name.trim()) return;
    const svc: Service = { id: makeId(), ...newSvc };
    setSettings((prev) => ({ ...prev, services: [...prev.services, svc] }));
    setNewSvc({ name: '', api_key: '', base_url: '' });
    setAddingService(false);
  };

  const removeService = (id: string) => {
    setSettings((prev) => ({ ...prev, services: prev.services.filter((s) => s.id !== id) }));
  };

  const updateService = (id: string, field: keyof Omit<Service, 'id'>, value: string) => {
    setSettings((prev) => ({
      ...prev,
      services: prev.services.map((s) => (s.id === id ? { ...s, [field]: value } : s)),
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveSettings(settings);
      // Refresh status after save
      const st = await fetchSettingsStatus();
      setStatus(st);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#0f0f14] overflow-hidden">
      {/* Nav panel */}
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
            <GearIcon />
            Settings
          </div>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-10 space-y-10">
          <div>
            <h1 className="text-2xl font-semibold text-white mb-1">Settings</h1>
            <p className="text-[#606070] text-sm">Configure API keys, model, and connected services</p>
          </div>

          {/* ── API Keys ─────────────────────────────────────────── */}
          <section>
            <SectionHeading>API Keys</SectionHeading>
            <div className="space-y-3">
              {BUILTIN_KEYS.map(({ key, label, hint }) => {
                const connected = status[key];
                const hasStatus = key in status;
                return (
                  <div key={key} className="bg-[#17171f] border border-[#2a2a3a] rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-[#c0c0d0]">{label}</label>
                      {hasStatus && (
                        <span className="flex items-center gap-1.5 text-xs font-medium">
                          <span className={`w-2 h-2 rounded-full ${connected ? 'bg-[#4ade80]' : 'bg-[#ef4444]'}`} />
                          <span className={connected ? 'text-[#4ade80]' : 'text-[#ef4444]'}>
                            {connected ? 'Connected' : 'Not configured'}
                          </span>
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <input
                        type={revealed.has(key) ? 'text' : 'password'}
                        value={settings.api_keys[key] ?? ''}
                        onChange={(e) => setKey(key, e.target.value)}
                        placeholder={`${label}…`}
                        className="w-full bg-[#0f0f14] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#404050] focus:outline-none focus:border-[#4a4a6a] font-mono pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => toggleReveal(key)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#505060] hover:text-[#a0a0b0] transition-colors"
                      >
                        {revealed.has(key) ? <EyeOffIcon /> : <EyeIcon />}
                      </button>
                    </div>
                    <p className="mt-1.5 text-[11px] text-[#505060]">{hint}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Model ────────────────────────────────────────────── */}
          <section>
            <SectionHeading>Model</SectionHeading>
            <div className="bg-[#17171f] border border-[#2a2a3a] rounded-xl p-4 space-y-1.5">
              {MODELS.map((m) => {
                const active = settings.model === m.id;
                return (
                  <label
                    key={m.id}
                    className={[
                      'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border',
                      active ? 'bg-[#1e1e3a] border-[#3a3a6a]' : 'border-transparent hover:bg-[#1a1a24]',
                    ].join(' ')}
                  >
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${active ? 'border-[#6366f1]' : 'border-[#404050]'}`}>
                      {active && <div className="w-2 h-2 rounded-full bg-[#6366f1]" />}
                    </div>
                    <input
                      type="radio"
                      name="model"
                      value={m.id}
                      checked={active}
                      onChange={() => setSettings((prev) => ({ ...prev, model: m.id }))}
                      className="sr-only"
                    />
                    <div>
                      <p className="text-sm text-[#c0c0d0] font-medium">{m.label}</p>
                      <p className="text-[11px] text-[#505060]">{m.sub}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {/* ── Connected Services ───────────────────────────────── */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <SectionHeading noMargin>Connected Services</SectionHeading>
              <button
                onClick={() => setAddingService(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1e1e2e] border border-[#2a2a3a] text-[#a0a0b0] hover:text-white hover:border-[#3a3a4a] text-xs font-medium transition-all"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                Add service
              </button>
            </div>

            {settings.services.length === 0 && !addingService && (
              <p className="text-[#404050] text-sm text-center py-6 border border-dashed border-[#2a2a3a] rounded-xl">
                No custom services configured
              </p>
            )}

            <div className="space-y-3">
              {settings.services.map((svc) => (
                <div key={svc.id} className="bg-[#17171f] border border-[#2a2a3a] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <input
                      value={svc.name}
                      onChange={(e) => updateService(svc.id, 'name', e.target.value)}
                      placeholder="Service name"
                      className="bg-transparent text-sm font-medium text-white focus:outline-none border-b border-transparent focus:border-[#4a4a6a] pb-0.5 flex-1 mr-2"
                    />
                    <button
                      onClick={() => removeService(svc.id)}
                      className="text-[#505060] hover:text-[#f87171] transition-colors flex-shrink-0"
                      title="Remove service"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-[#505060] uppercase tracking-wider mb-1">API Key</label>
                      <input
                        type="password"
                        value={svc.api_key}
                        onChange={(e) => updateService(svc.id, 'api_key', e.target.value)}
                        placeholder="sk-..."
                        className="w-full bg-[#0f0f14] border border-[#2a2a3a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#404050] focus:outline-none focus:border-[#4a4a6a] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#505060] uppercase tracking-wider mb-1">Base URL</label>
                      <input
                        value={svc.base_url}
                        onChange={(e) => updateService(svc.id, 'base_url', e.target.value)}
                        placeholder="https://api.example.com"
                        className="w-full bg-[#0f0f14] border border-[#2a2a3a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#404050] focus:outline-none focus:border-[#4a4a6a]"
                      />
                    </div>
                  </div>
                </div>
              ))}

              {addingService && (
                <div className="bg-[#17171f] border border-[#3a3a6a] rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-[#a5b4fc] uppercase tracking-wider">New service</p>
                  <input
                    autoFocus
                    value={newSvc.name}
                    onChange={(e) => setNewSvc((p) => ({ ...p, name: e.target.value }))}
                    placeholder="Service name"
                    className="w-full bg-[#0f0f14] border border-[#2a2a3a] rounded-lg px-3 py-1.5 text-sm text-white placeholder-[#404050] focus:outline-none focus:border-[#4a4a6a]"
                    onKeyDown={(e) => e.key === 'Enter' && addService()}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-[#505060] uppercase tracking-wider mb-1">API Key</label>
                      <input
                        type="password"
                        value={newSvc.api_key}
                        onChange={(e) => setNewSvc((p) => ({ ...p, api_key: e.target.value }))}
                        placeholder="sk-..."
                        className="w-full bg-[#0f0f14] border border-[#2a2a3a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#404050] focus:outline-none focus:border-[#4a4a6a] font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-[#505060] uppercase tracking-wider mb-1">Base URL</label>
                      <input
                        value={newSvc.base_url}
                        onChange={(e) => setNewSvc((p) => ({ ...p, base_url: e.target.value }))}
                        placeholder="https://..."
                        className="w-full bg-[#0f0f14] border border-[#2a2a3a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#404050] focus:outline-none focus:border-[#4a4a6a]"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={addService}
                      disabled={!newSvc.name.trim()}
                      className="px-4 py-1.5 rounded-lg bg-[#6366f1] hover:bg-[#5254cc] disabled:opacity-50 text-white text-xs font-medium transition-colors"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setAddingService(false)}
                      className="px-3 py-1.5 rounded-lg text-[#808090] hover:text-white text-xs transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* ── Save ─────────────────────────────────────────────── */}
          {error && (
            <div className="px-4 py-3 rounded-xl bg-[#2a1a1a] border border-[#4a2a2a] text-[#f87171] text-sm">
              {error}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className={[
              'flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all',
              saved
                ? 'bg-[#0f1f0f] text-[#4ade80] border border-[#1a3a1a]'
                : 'bg-[#6366f1] hover:bg-[#5254cc] text-white disabled:opacity-60',
            ].join(' ')}
          >
            {saving ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : saved ? (
              <>✓ Saved</>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({ children, noMargin }: { children: React.ReactNode; noMargin?: boolean }) {
  return (
    <h2 className={`text-[#a0a0b0] text-xs font-semibold uppercase tracking-wider ${noMargin ? '' : 'mb-4'}`}>
      {children}
    </h2>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
