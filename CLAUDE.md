@AGENTS.md

# Jarvis UI

Personal AI agent frontend built with Next.js 16, TypeScript, and Tailwind CSS v4. Connects to a FastAPI backend at `http://localhost:8000`.

## Tech Stack

- **Next.js 16.2.4** with App Router (see AGENTS.md — breaking changes apply)
- **React 19** — Server Components by default, `'use client'` for interactive parts
- **TypeScript 5**
- **Tailwind CSS v4** — configured via `@theme` in `globals.css`, no `tailwind.config.js`
- **Font** — Ubuntu + Ubuntu Mono loaded via `next/font/google`

## Project Structure

```
src/
  app/
    layout.tsx          Root layout — loads Ubuntu fonts, applies dark bg
    page.tsx            Redirects / → /chat
    globals.css         Tailwind v4 @theme, CSS variables, scrollbar styles
    chat/
      page.tsx          Server page; wraps <ChatPage> in <Suspense>
    settings/
      page.tsx          Server page; wraps <SettingsPage> in <Suspense>
  components/
    ChatPage.tsx        Main client component — owns all chat state and SSE logic
    Sidebar.tsx         Left sidebar (260px): projects/chats tree, new project form
    ChatArea.tsx        Message list with user bubbles and assistant responses
    ChatInput.tsx       Auto-growing textarea, send/stop buttons, multi-agent toggle
    MarkdownRenderer.tsx Custom markdown parser (no external dep) — code blocks,
                        headings, bold/italic, links, lists, blockquotes
    ToolIndicator.tsx   Animated chips showing active/completed tool calls
    SettingsPage.tsx    API key inputs, model selector, saves to localStorage + backend
  lib/
    types.ts            Shared TypeScript interfaces (Project, Chat, Message, ToolUse, StreamEvent)
    api.ts              API client — fetch wrappers + SSE streaming via ReadableStream
```

## Backend API (`http://localhost:8000`)

| Method | Path | Body / Params | Notes |
|--------|------|---------------|-------|
| POST | `/api/chat` | `{message, chat_name?, project_name?, use_multi_agent?}` | Single response |
| POST | `/api/chat/stream` | same | SSE stream |
| GET | `/api/projects` | — | Returns array (or envelope — see api.ts) |
| POST | `/api/projects` | `{name, description}` | Create project |
| GET | `/api/chats` | `?project_name=` optional | Returns array |
| GET | `/api/notes` | — | `{section: {key: value}}` |
| PUT | `/api/notes` | `{section, key, value}` | Upsert a note |
| GET | `/health` | — | Health check |

`fetchProjects` and `fetchChats` in `api.ts` use a `toArray()` helper that unwraps common backend envelopes (`{chats:[]}`, `{items:[]}`, `{data:[]}`, etc.) so the components always receive a plain array.

## SSE Streaming

`streamChat()` in `api.ts` uses `fetch` + `ReadableStream` (not `EventSource`, which doesn't support POST). It reads `data: {...}\n\n` lines and dispatches:

- `{type: "text"|"content", content: "..."}` → appends to the streaming message
- `{type: "tool_use", name: "...", input: {...}}` → adds a running ToolUse chip
- `{type: "tool_result", name: "...", result: "..."}` → marks the chip done
- `{type: "done"}` or `data: [DONE]` → ends streaming
- Unrecognised/plain-text data → appended as raw text

An `AbortController` is passed so the stop button cancels the stream immediately.

## State Management

All chat state lives in `ChatPage` (client component):
- `messages: Message[]` — accumulated per session (no history endpoint exists)
- `isStreaming: boolean` — true while SSE connection is open
- `projects / chats` — loaded once on mount from the backend
- URL params `?chat=name&project=name` drive the active conversation; updated via `useRouter`

## Routing

| URL | Component | Notes |
|-----|-----------|-------|
| `/` | `app/page.tsx` | `redirect('/chat')` |
| `/chat` | `ChatPage` | `?chat=` + `?project=` optional |
| `/settings` | `SettingsPage` | |

Both `/chat` and `/settings` page files are Server Components that wrap the interactive client component in `<Suspense>` — required because the client components call `useSearchParams()`.

## Design System

Dark theme only. Key CSS variables (defined in `globals.css`):

| Variable | Value | Used for |
|----------|-------|----------|
| `--background` | `#0f0f14` | Page background |
| `--sidebar` | `#111116` | Sidebar background |
| `--surface` | `#17171f` | Cards, inputs |
| `--border` | `#2a2a3a` | All borders |
| `--accent` | `#6366f1` | Buttons, active items, avatar |
| `--muted` | `#606070` | Secondary text |

User messages are right-aligned bubbles (`#1e1e2e`). Assistant messages are left-aligned with a gradient `J` avatar and render through `MarkdownRenderer`.

## Known Gotchas

- **No chat history endpoint** — messages are session-only. Selecting a different chat clears the local message list; the backend still has its own context keyed by `chat_name`.
- **`toArray()` in api.ts** — the backend may return `{chats: [...]}` instead of a plain array. Always use the typed fetch functions, never call `res.json()` directly for list endpoints.
- **Lazy useState initializers in SettingsPage** — localStorage is read in the `useState` initializer function (not in `useEffect`) to satisfy the `react-hooks/set-state-in-effect` ESLint rule introduced in Next.js 16.
- **Ternary-as-statement** — `@typescript-eslint/no-unused-expressions` flags `x ? a() : b()` as a statement. Use `if/else` instead.
