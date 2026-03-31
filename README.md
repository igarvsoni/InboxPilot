# InboxPilot

AI-powered email reply generator with task & event extraction.

**Stack:** Spring Boot 3.4.1 + React 18 + MUI + Brave/Chrome Extension  
**AI Provider:** Groq (Qwen3-32B) — free, no billing required

---

## Setup

### 1. Get a free Groq API key

1. Go to [console.groq.com/keys](https://console.groq.com/keys)
2. Sign up / log in
3. Click **Create API Key** → copy it

### 2. Run the backend

```bash
cd inboxpilot-api

# Set your API key (replace with your actual key)
export GROQ_KEY=your_api_key_here

mvn spring-boot:run
```

Backend starts on `http://localhost:8080`

### 3. Run the frontend

```bash
cd inboxpilot-ui
npm install
npm run dev
```

Frontend opens at `http://localhost:5173`

### 4. Install the browser extension (Brave / Chrome)

1. Open `brave://extensions` (or `chrome://extensions`)
2. Turn on **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `inboxpilot-extension` folder
5. Open [Gmail](https://mail.google.com) → open any email → click **Reply**
6. You'll see the **"AI Reply"** button in the compose toolbar
7. Click it — the AI generates a reply and inserts it into the compose box

> **Note:** The backend must be running on port 8080 for the extension to work.

---

## Features

- **Generate Reply** — paste any email, pick a tone (Professional / Casual / Friendly / Formal), get an AI reply
- **Extract Tasks & Events** — AI reads the email and pulls out action items + meetings with date/time/location
- **Gmail Extension** — "AI Reply" button injected directly into Gmail's compose toolbar
- **Copy to Clipboard** — one-click copy for generated replies

---

## Project Structure

```
InboxPilot/
├── inboxpilot-api/          Spring Boot backend (REST API + Groq integration)
├── inboxpilot-ui/           React frontend (Vite + MUI)
├── inboxpilot-extension/    Brave/Chrome extension (Manifest v3)
├── CHANGES.md               Feature changelog
├── DOCS.md                  Function-level documentation
└── README.md                This file
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/email/generate` | Generate an email reply |
| POST | `/api/email/analyze` | Extract tasks & events from an email |

**Request body:**
```json
{
  "emailContent": "the email text",
  "tone": "professional"
}
```
