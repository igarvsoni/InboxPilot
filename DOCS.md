# Project Documentation — Function Reference & Design Decisions

This file explains every function, class, and config choice in the project — what it does, why it was used, and what makes it a good approach.

---

## Backend — `inboxpilot-api`

---

### `EmailWriterSbApplication.java`

#### `main(String[] args)`
```java
SpringApplication.run(EmailWriterSbApplication.class, args);
```
**What it does:** Bootstraps the entire Spring Boot app — starts the embedded Tomcat server, loads all beans, and wires everything together.  
**Why:** This is the standard Spring Boot entry point. The `@SpringBootApplication` annotation combines `@Configuration`, `@EnableAutoConfiguration`, and `@ComponentScan` — meaning Spring automatically finds and registers all your controllers, services, and configs without you having to declare them manually.

---

### `EmailRequest.java`

#### Class-level: `@Data` (Lombok)
**What it does:** Auto-generates `getters`, `setters`, `toString()`, `equals()`, and `hashCode()` for the class at compile time.  
**Why:** Eliminates boilerplate. Without Lombok, you'd write 30+ lines for a 2-field class. Spring's Jackson library uses the getters/setters to deserialize incoming JSON into this object automatically.

#### Fields: `emailContent`, `tone`
**What they do:** Represent the JSON body the frontend sends:
```json
{ "emailContent": "...", "tone": "professional" }
```
**Why two fields:** Separating content from tone keeps the prompt-building logic clean — the service can decide whether to include tone instructions or skip them if tone is empty.

---

### `EmailGeneratorController.java`

#### `@RestController`
**What it does:** Marks this class as a REST API controller. Every method returns data directly (not a view/template).  
**Why:** Combines `@Controller` + `@ResponseBody`. Since this is a pure API backend (no server-side HTML), this is the right choice.

#### `@RequestMapping("/api/email")`
**What it does:** All endpoints in this class are prefixed with `/api/email`.  
**Why:** Namespacing keeps routes organized — if you add more features later (e.g., `/api/user`, `/api/template`), everything stays clean.

#### `@CrossOrigin(origins = "*")`
**What it does:** Allows any domain to call this API (disables same-origin restriction).  
**Why:** The React frontend runs on `localhost:5173` and the backend on `localhost:8080` — without this, browsers would block the request. The `*` is fine for local development; in production you'd restrict it to your actual domain.

#### `@AllArgsConstructor` (Lombok)
**What it does:** Generates a constructor with all fields — here, injects `EmailGeneratorService`.  
**Why:** Spring uses constructor injection (preferred over field injection with `@Autowired`) because it makes dependencies explicit and easier to test.

#### `generateEmail(@RequestBody EmailRequest emailRequest)`
**What it does:** Receives the POST request, passes the body to the service, and returns the AI-generated reply.  
**Why `@RequestBody`:** Tells Spring to deserialize the incoming JSON into an `EmailRequest` object automatically using Jackson.  
**Why `ResponseEntity<String>`:** Gives you control over HTTP status codes. Returns `200 OK` with the generated text as the body.

---

### `EmailGeneratorService.java`

#### `WebClient` (instead of `RestTemplate`)
**What it does:** Makes non-blocking, reactive HTTP calls to the Gemini API.  
**Why WebClient over RestTemplate:** `RestTemplate` is deprecated in newer Spring versions. `WebClient` is the modern replacement — it supports both sync and async calls. Here we use `.block()` to keep it synchronous (simpler for this use case) while still using the modern API.

#### `@Value("${gemini.api.url}")` / `@Value("${gemini.api.key}")`
**What it does:** Injects values from `application.properties` (or environment variables) directly into these fields at startup.  
**Why:** Keeps secrets and config out of the code. You never hardcode API keys — you set them as env vars or in a config file that's gitignored.

#### `generateEmailReply(EmailRequest emailRequest)`
**What it does:** The main orchestration method — builds the prompt, assembles the Gemini API request body, calls the API, and returns the extracted reply text.  
**Why it's split into sub-methods:** Single Responsibility Principle. Each piece (prompt building, API call, response parsing) is its own concern — easier to test, debug, and change independently.

#### `buildPrompt(EmailRequest emailRequest)`
**What it does:** Constructs the instruction text sent to Gemini.  
```
"Generate a professional email reply for the following email content.
Please don't add subject line in reply, only provide body.
Use a [tone] tone.
Original Email: [emailContent]"
```
**Why the "don't add subject line" instruction:** Without it, Gemini sometimes includes `Subject: Re: ...` at the top, which looks wrong when you paste it into a compose box.  
**Why check if tone is empty:** Makes tone optional — if the user picks "None", no tone instruction is sent and Gemini uses its default style.

#### `extractResponseContent(String response)`
**What it does:** Parses the raw JSON from Gemini and digs out just the reply text.
```
candidates[0] → content → parts[0] → text
```
**Why Jackson `ObjectMapper`:** Gemini returns nested JSON. Jackson's `JsonNode` tree lets you navigate it with `.path()` (safe — returns `MissingNode` instead of throwing NPE if a key is absent).  
**Why a try/catch:** Gemini's response structure can vary (e.g., safety blocks, API errors). Catching the parse exception and returning a readable error string prevents a 500 crash.

---

### `application.properties`

```properties
gemini.api.url=${GEMINI_URL:https://generativelanguage.googleapis.com/...}
gemini.api.key=${GEMINI_KEY:YOUR_API_KEY_HERE}
```
**What the `${VAR:default}` syntax does:** Reads from environment variable `GEMINI_URL` — if not set, falls back to the default value.  
**Why Gemini 1.5 Flash:** It's the free-tier model. Fast, capable, and handles email generation tasks very well. No cost for up to 1M tokens/day.

---

## Frontend — `inboxpilot-ui`

---

### `main.jsx`

#### `StrictMode`
**What it does:** Wraps the app in React's strict mode — activates extra warnings and double-invokes certain functions in development to catch side effects.  
**Why:** Helps you catch bugs early. Has zero effect in production builds.

#### `createRoot`
**What it does:** React 18's new root API for rendering.  
**Why:** Replaces the old `ReactDOM.render()`. Required for React 18 features like concurrent rendering.

---

### `App.jsx`

#### `useState` hooks (5 of them)
| State | Type | Purpose |
|-------|------|---------|
| `emailContent` | string | Controlled input — tracks what the user typed |
| `tone` | string | Selected tone from dropdown |
| `generatedReply` | string | Stores the AI response to display |
| `loading` | boolean | Shows spinner, disables button during API call |
| `error` | string | Shows error message if request fails |
| `copied` | boolean | Tracks clipboard state to show "Copied!" feedback |

**Why controlled inputs:** React's controlled component pattern keeps the UI in sync with state — the source of truth is always the state variable, not the DOM.

#### `handleSubmit()`
**What it does:** Sends the `POST /api/email/generate` request via Axios with `{ emailContent, tone }`, sets loading/error/result states accordingly.  
**Why async/await:** Cleaner than `.then().catch()` chains. The `try/finally` ensures `loading` is always set back to `false` even if the request fails.  
**Why clear state at the start:** `setError('')` and `setGeneratedReply('')` reset stale data before each new request — prevents showing old results while loading.

#### `handleCopy()`
**What it does:** Copies generated reply to clipboard, sets `copied: true` for 2 seconds then resets.  
**Why `setTimeout`:** Gives users visual feedback ("Copied!") briefly, then resets the button text — a common UX pattern.

#### `disabled={!emailContent.trim() || loading}`
**What it does:** Disables the submit button if the input is empty or a request is in progress.  
**Why `.trim()`:** Prevents submitting whitespace-only input.

#### MUI (`@mui/material`) components
**Why MUI over plain HTML:** Pre-built accessible components with consistent styling out of the box. `TextField`, `Select`, `Button`, `Alert`, `CircularProgress` — all production-quality with zero custom CSS needed for the core UI.

---

## Chrome Extension — `inboxpilot-extension`

---

### `manifest.json`

#### `"manifest_version": 3`
**What it does:** Uses the latest Chrome Extension API (MV3).  
**Why:** MV2 is deprecated and being phased out. MV3 is required for new extensions published to the Chrome Web Store.

#### `"host_permissions"`
```json
"http://localhost:8080/*",
"*://mail.google.com/*"
```
**Why both:** The extension needs to (1) inject scripts into Gmail and (2) make fetch requests to your local backend. Chrome requires explicit permission for each.

#### `"run_at": "document_end"`
**What it does:** Injects `content.js` after the DOM is fully loaded.  
**Why not `document_start`:** Gmail's toolbar doesn't exist at `document_start`. Waiting for `document_end` ensures the DOM elements we need are present.

---

### `content.js`

#### `getEmailContent()`
**What it does:** Tries 3 Gmail CSS selectors in order to find the email body:
- `.h7` — sender/header block
- `.a3s.aiL` — main email body (most reliable)
- `.gmail_quote` — quoted text in replies

**Why multiple selectors:** Gmail's DOM structure varies depending on whether you're reading a thread, a standalone email, or a forwarded message. Checking multiple selectors makes it work across all cases.

#### `getComposeBox()`
```js
document.querySelector('[role="textbox"][g_editable="true"]')
```
**What it does:** Finds Gmail's compose area using ARIA attributes.  
**Why ARIA attributes instead of class names:** Gmail's CSS classes are auto-generated and change frequently. ARIA attributes like `role="textbox"` are more stable and semantic.

#### `injectAIButton(toolbar)`
**What it does:** Creates a styled button and appends it to the Gmail compose toolbar (`.btC`).  
**Why check `toolbar.querySelector('.ai-reply-btn')`:** Guards against injecting the button twice — `MutationObserver` fires frequently, and without this check you'd get duplicate buttons.  
**Why inline styles:** Gmail's CSS is heavily scoped and can override external stylesheets unpredictably. Inline styles ensure the button looks right regardless of Gmail's styling changes.

#### `MutationObserver`
**What it does:** Watches the entire `document.body` for DOM changes and calls `checkForComposeWindow()` whenever something changes.  
**Why:** Gmail is a Single Page Application — it doesn't reload the page when you open a compose window. A regular `DOMContentLoaded` listener would only fire once and miss dynamically created elements. `MutationObserver` catches them all.

#### `setTimeout(checkForComposeWindow, 500)`
**What it does:** Waits 500ms after a DOM mutation before checking for the toolbar.  
**Why the delay:** Gmail adds the compose window to the DOM first, then populates the toolbar buttons asynchronously. Without the delay, the toolbar (`.btC`) doesn't exist yet when we try to inject the button.

#### `fetch` (instead of Axios)
**What it does:** Makes the HTTP request to the backend.  
**Why native fetch instead of Axios:** Content scripts can't use npm packages — there's no bundler in a plain extension. Native `fetch` is available in all modern browsers with no imports needed.

#### `document.execCommand('insertText', false, generatedReply)`
**What it does:** Inserts the generated reply text into Gmail's compose box.  
**Why `execCommand`:** Gmail's compose box is a `contenteditable` div, not a regular `<input>`. You can't set `.value` on it. `execCommand('insertText')` integrates with Gmail's internal editor model and triggers the necessary DOM events so Gmail tracks the change correctly.

---

---

## New Features Added (2026-04-01)

---

### `EmailAnalysis.java`
**What it does:** DTO that holds the result of email analysis — a list of task strings and a list of `EventDetail` objects (title, date, time, location).  
**Why nested static class:** `EventDetail` only makes sense inside `EmailAnalysis` — keeping it nested avoids cluttering the package with a single-use class.

---

### `EmailGeneratorService.analyzeEmail(String emailContent)`
**What it does:** Sends a prompt to Groq asking it to return a structured JSON object with `tasks` and `events` extracted from the email.  
**Why a strict JSON prompt:** Open-ended prompts produce prose, not parseable data. The prompt template explicitly tells the model the exact JSON shape expected, making `parseAnalysis()` reliable.  
**Why strip JSON from raw response:** Qwen3 sometimes wraps JSON in markdown code fences. Extracting from `{` to `}` handles this robustly.

### `EmailGeneratorService.parseAnalysis(String raw)`
**What it does:** Finds the JSON object in the raw model response, parses it with Jackson, and maps fields into `EmailAnalysis`.  
**Why try/catch returning empty analysis:** If the model returns malformed JSON (rare but possible), the UI still renders cleanly with "No tasks found / No events found" instead of crashing.

### `EmailGeneratorService.callGroq(String prompt)`
**What it does:** Extracted common WebClient logic into a single private method used by both `generateEmailReply` and `analyzeEmail`.  
**Why refactor:** Avoids duplicating the HTTP call, headers, and `<think>` stripping in two places.

---

### `POST /api/email/analyze` (new endpoint)
**What it does:** Accepts `{ emailContent }`, returns `EmailAnalysis` JSON with tasks and events.  
**Why separate from `/generate`:** Keeps concerns split — a user might want to analyze without generating a reply, or vice versa. Two endpoints, two responsibilities.

---

### UI Redesign (`App.jsx`)

#### Dark gradient background
**Why:** Reduces eye strain for email-heavy workflows and gives a modern, premium feel using CSS `linear-gradient`.

#### Glassmorphism cards
**Why:** `backdrop-filter: blur` + semi-transparent backgrounds create depth without heavy shadows. Works well on dark backgrounds.

#### Two separate buttons — "Generate Reply" and "Extract Tasks & Events"
**Why:** User may want only the reply, only the analysis, or both. Combining into one button would force an extra AI call every time.

#### Color-coded panels (orange tasks, blue events)
**Why:** Visual separation helps users scan results instantly without reading labels.

#### `@mui/icons-material`
**Why added:** Icon-only labels (calendar, clock, location pin) communicate meaning faster than text in compact event cards.

---

## Why This Stack Is a Good Choice

| Decision | Reason |
|----------|--------|
| **Spring Boot** | Minimal config, embedded server, production-ready out of the box |
| **WebClient (reactive)** | Modern HTTP client, non-blocking, recommended over deprecated RestTemplate |
| **Gemini 1.5 Flash** | Free tier, fast response, handles generative tasks well |
| **React + Vite** | Fastest dev server startup, hot module replacement, minimal config |
| **MUI** | Accessible, consistent UI components — no time wasted on basic styling |
| **Chrome Extension MV3** | Future-proof, required for Chrome Web Store publishing |
| **MutationObserver** | The only reliable way to detect dynamic UI changes in SPAs like Gmail |
| **Constructor injection** | Preferred Spring pattern — explicit, testable, no reflection surprises |
| **Env var config** | Keeps secrets out of source code — safe to commit `application.properties` |
