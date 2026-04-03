# InboxPilot

AI-powered email assistant with smart replies, message polishing, enhancement, insight extraction, and Google Calendar integration.

**Stack:** Spring Boot 3.4.1 + React 18 + MUI + Brave/Chrome Extension  
**AI Provider:** Groq (Qwen3-32B) — free, no billing required  
**Calendar:** Google Calendar API with OAuth 2.0

---

## Features

- **Smart Reply** — paste any email, pick a tone (Professional / Casual / Friendly / Formal), get an AI-generated reply
- **Polish** — fix grammar, spelling, and flow without changing meaning
- **Enhance** — make emails more compelling with better word choice and structure
- **Insights** — extract action items and meetings from any email
- **Google Calendar** — one-click event creation from extracted meetings via OAuth 2.0
- **Gmail Extension** — all features available directly inside Gmail's compose toolbar
- **Copy to Clipboard** — one-click copy for generated replies

---

## Setup

### 1. Get a free Groq API key

1. Go to [console.groq.com/keys](https://console.groq.com/keys)
2. Sign up / log in
3. Click **Create API Key** and copy it

### 2. Google Calendar setup (optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a project, enable **Google Calendar API**
3. Create **OAuth 2.0 credentials** (Web application)
4. Set redirect URI to `http://localhost:8080/api/calendar/callback`
5. Add your email as a **test user** in the OAuth consent screen

### 3. Run the backend

```bash
cd inboxpilot-api

# Set your API keys
export GROQ_KEY=your_groq_api_key
export GOOGLE_CLIENT_ID=your_google_client_id
export GOOGLE_CLIENT_SECRET=your_google_client_secret

mvn spring-boot:run
```

Backend starts on `http://localhost:8080`

### 4. Run the frontend

```bash
cd inboxpilot-ui
npm install
npm run dev
```

Frontend opens at `http://localhost:5173`

### 5. Install the browser extension (Brave / Chrome)

1. Open `brave://extensions` (or `chrome://extensions`)
2. Turn on **Developer mode** (top right toggle)
3. Click **Load unpacked**
4. Select the `inboxpilot-extension` folder
5. Open [Gmail](https://mail.google.com) and open/reply to any email
6. You'll see 4 buttons in the compose toolbar: **Smart Reply**, **Polish**, **Enhance**, **Insights**

> **Note:** The backend must be running on port 8080 for the extension to work.

---

## Project Structure

```
InboxPilot/
├── inboxpilot-api/          Spring Boot backend (REST API + Groq + Google Calendar)
├── inboxpilot-ui/           React frontend (Vite + MUI)
└── inboxpilot-extension/    Brave/Chrome extension (Manifest v3)
```

---

## API Endpoints

### Email

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mail/reply` | Generate an AI email reply |
| POST | `/api/mail/insights` | Extract action items and meetings |
| POST | `/api/mail/format` | Polish grammar and spelling |
| POST | `/api/mail/enhance` | Make email more compelling |

**Request body:**
```json
{
  "body": "the email text",
  "tone": "professional"
}
```

### Google Calendar

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/calendar/auth` | Redirect to Google OAuth consent |
| GET | `/api/calendar/callback` | OAuth callback (handles token exchange) |
| GET | `/api/calendar/status` | Check if Google Calendar is connected |
| POST | `/api/calendar/event` | Create a single calendar event |
| POST | `/api/calendar/events` | Create multiple calendar events |
