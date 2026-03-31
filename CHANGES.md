# Project Changes & Features

This file tracks all features, changes, and updates made to the project.
Each section represents a feature area. New updates are added **below** existing content in each section — nothing is deleted.

---

## Project Overview

**App:** AI-powered Email Writer
**Stack:** Spring Boot 3.4.1 (backend) + React 18 + MUI (frontend) + Chrome Extension (Gmail integration)
**AI Provider:** Google Gemini API

---

## Architecture

### Initial Architecture (2026-04-01)
Analyzed the base project from [EmbarkXOfficial/spring-ai-masters](https://github.com/EmbarkXOfficial/spring-ai-masters/tree/fa7da3c468efb79cb2e76a6f98ac6bae73ee6017/email-writer).

3-part system:
- `inboxpilot-api` — Spring Boot REST API
- `inboxpilot-ui` — React web UI
- `inboxpilot-extension` — Chrome Extension for Gmail

---

## Backend (`inboxpilot-api`)

### Initial State (2026-04-01)
- `EmailWriterSbApplication.java` — app entry point
- `EmailGeneratorController.java` — exposes `POST /api/email/generate`, CORS open to `*`
- `EmailGeneratorService.java` — builds Gemini prompt, calls API via WebClient, parses `candidates[0].content.parts[0].text`
- `EmailRequest.java` — DTO with `emailContent` (String) and `tone` (String)
- Config via env vars: `GEMINI_URL`, `GEMINI_KEY`

### Scaffolded (2026-04-01)
Created all backend source files from scratch:
- `pom.xml` — Spring Boot 3.4.1 with web, webflux, lombok, jackson
- `EmailWriterSbApplication.java` — main entry point
- `EmailRequest.java` — Lombok `@Data` DTO
- `EmailGeneratorService.java` — WebClient-based Gemini API call, prompt builder, response parser
- `EmailGeneratorController.java` — `POST /api/email/generate` with `@CrossOrigin("*")`
- `application.properties` — default Gemini URL to `gemini-1.5-flash` endpoint, keys via env vars with fallback placeholder

---

## Frontend (`inboxpilot-ui`)

### Initial State (2026-04-01)
- Built with React 18 + Vite + Material UI
- `App.jsx` — single-page UI with:
  - Multiline TextField for email input
  - Tone selector dropdown (Professional, Casual, Friendly, None)
  - Submit button (disabled if no content)
  - Loading spinner during API call
  - Read-only output TextField
  - Copy to Clipboard button
- Calls `http://localhost:8080/api/email/generate`

### Scaffolded (2026-04-01)
Created all frontend files:
- `package.json` — React 18.3.1, MUI 6.3.1, Axios 1.7.9, Vite
- `index.html` — HTML root with `<div id="root">`
- `vite.config.js` — Vite + React plugin
- `src/main.jsx
` — React StrictMode root
- `src/index.css` — global reset styles
- `src/App.jsx` — full UI with email input, tone selector (Professional/Casual/Friendly/Formal/None), loading spinner, generated reply output, copy-to-clipboard with feedback state

---

## Chrome Extension (`inboxpilot-extension`)

### Initial State (2026-04-01)
- Manifest v3
- Injects into `mail.google.com`
- `content.js` — uses `MutationObserver` to detect Gmail compose windows, injects "AI Reply" button
- Extracts email body from DOM (`.h7`, `.a3s.aiL`, `.gmail_quote` selectors)
- Calls backend at `http://localhost:8080/api/email/generate` with tone hardcoded to `"professional"`
- Inserts generated reply into compose box via `execCommand('insertText')`

### Scaffolded (2026-04-01)
Created all extension files:
- `manifest.json` — Manifest v3, permissions: activeTab + storage, host permissions for localhost:8080 and mail.google.com
- `content.js` — MutationObserver for compose window detection, "AI Reply" button injected into `.btC` toolbar, email content extracted from `.h7`/`.a3s.aiL`/`.gmail_quote`, fetch to backend, reply inserted via `execCommand`, button shows "Generating..." state during request
- `content.css` — hover/active styles for the injected button (was empty before)

---

## Dependencies

### Initial Dependencies (2026-04-01)

**Backend:**
- Spring Boot 3.4.1
- spring-boot-starter-web
- spring-boot-starter-webflux
- Lombok
- Jackson

**Frontend:**
- React 18.3.1
- Material-UI 6.3.1
- Axios 1.7.9
- Vite

---

## Task & Event Extraction Feature

### Added (2026-04-01)
New feature: analyze any email to extract action items and events.

**Backend:**
- `EmailAnalysis.java` — new DTO with `tasks: List<String>` and `events: List<EventDetail>` (title, date, time, location)
- `EmailGeneratorService.analyzeEmail()` — calls Groq with a JSON-extraction prompt, strips `<think>` blocks, parses the response into `EmailAnalysis`
- `EmailGeneratorController` — new `POST /api/email/analyze` endpoint

**Frontend:**
- "Extract Tasks & Events" button added alongside "Generate Reply"
- Tasks panel — shows bullet list of action items with count badge
- Events panel — shows title, date, time, location with icons
- Both panels shown side by side in a responsive 2-column layout

---

## UI Redesign

### Redesigned (2026-04-01)
Complete UI overhaul:
- Dark gradient background (`#0f0c29 → #302b63 → #24243e`)
- Glassmorphism cards with `backdrop-filter: blur` and semi-transparent borders
- Purple accent color scheme (`#7c6bff`)
- MUI Icons added (`@mui/icons-material`) — AutoAwesome, AssignmentOutlined, EventOutlined, ScheduleOutlined, LocationOnOutlined, ContentCopy
- Inline copy button inside reply card
- Color-coded panels: orange for tasks, blue for events
- Responsive layout — panels stack on mobile

---

## API Provider Switch

### Changed (2026-04-01)
Switched from Google Gemini to **Groq** (free, no billing needed):
- Provider: groq.com
- Model: `qwen/qwen3-32b`
- API format: OpenAI-compatible (`/v1/chat/completions`)
- Auth: `Authorization: Bearer <key>`
- Added `<think>` block stripping for Qwen3's chain-of-thought output
- Properties renamed from `gemini.*` to `grok.*`

---

## Known Issues / TODOs

### Noted on 2026-04-01
- Chrome extension has hardcoded tone (`"professional"`) — no user control
- CORS is open to `*` — should be restricted in production
- API keys are env vars only — no `.env.example` or documentation
- `content.css` in extension is empty
- No authentication/authorization on the backend

### Updated on 2026-04-01
- `content.css` is no longer empty — hover/active styles added
- API key placeholder added to `application.properties` so it's obvious where to set it
- Still TODO: extension tone is still hardcoded to `"professional"`
