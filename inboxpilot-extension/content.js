// InboxPilot — Gmail Extension

const API_BASE = 'http://localhost:8080/api/mail';

function extractMailBody() {
  for (const sel of ['.a3s.aiL', '.h7', '.gmail_quote']) {
    const node = document.querySelector(sel);
    if (node) return node.innerText.trim();
  }
  return '';
}

function findComposeArea() {
  return document.querySelector('[role="textbox"][g_editable="true"]');
}

// ── Google Calendar API helpers ─────────────────────────────────────

const CAL_API = 'http://localhost:8080/api/calendar';

async function checkCalendarAuth() {
  try {
    const res = await fetch(`${CAL_API}/status`);
    const data = await res.json();
    return data.authenticated;
  } catch { return false; }
}

async function addToCalendar(meeting, btn) {
  const original = btn.textContent;
  btn.textContent = 'Saving...';
  btn.style.opacity = '0.6';
  btn.style.pointerEvents = 'none';

  try {
    const authed = await checkCalendarAuth();
    if (!authed) {
      window.open(`${CAL_API}/auth`, '_blank');
      btn.textContent = 'Connect Calendar first, then retry';
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      return;
    }

    const res = await fetch(`${CAL_API}/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meeting),
    });
    const data = await res.json();

    if (data.result && data.result.startsWith('http')) {
      btn.textContent = 'Added!';
      btn.style.color = '#4caf50';
    } else {
      btn.textContent = data.result || 'Added!';
      btn.style.color = '#4caf50';
    }
  } catch (e) {
    btn.textContent = 'Error: ' + e.message;
    btn.style.color = '#ff5252';
  }

  setTimeout(() => {
    btn.textContent = original;
    btn.style.color = '#7fe0ff';
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
  }, 3000);
}

async function addAllToCalendar(meetings, btn) {
  const original = btn.textContent;
  btn.textContent = 'Saving all...';
  btn.style.opacity = '0.6';
  btn.style.pointerEvents = 'none';

  try {
    const authed = await checkCalendarAuth();
    if (!authed) {
      window.open(`${CAL_API}/auth`, '_blank');
      btn.textContent = 'Connect Calendar first, then retry';
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
      return;
    }

    const res = await fetch(`${CAL_API}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(meetings),
    });
    const data = await res.json();
    btn.textContent = `Added ${data.length} event${data.length > 1 ? 's' : ''}!`;
    btn.style.color = '#4caf50';
  } catch (e) {
    btn.textContent = 'Error: ' + e.message;
    btn.style.color = '#ff5252';
  }

  setTimeout(() => {
    btn.textContent = original;
    btn.style.color = '#7fe0ff';
    btn.style.opacity = '1';
    btn.style.pointerEvents = 'auto';
  }, 3000);
}

// ── Insights overlay ────────────────────────────────────────────────

function showInsightsPanel(data) {
  document.querySelector('.pilot-insights-overlay')?.remove();

  const overlay = document.createElement('div');
  overlay.className = 'pilot-insights-overlay';
  overlay.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: rgba(0,0,0,0.5); z-index: 99999;
    display: flex; justify-content: center; align-items: center;
    font-family: 'Google Sans', Roboto, sans-serif;
  `;

  const items = data.actionItems || [];
  const meetings = data.meetings || [];

  const calBtnStyle = `
    display:inline-flex; align-items:center; gap:4px;
    background:rgba(127,224,255,0.15); color:#7fe0ff;
    border:1px solid rgba(127,224,255,0.3); border-radius:5px;
    padding:4px 10px; font-size:11px; font-weight:600;
    cursor:pointer; margin-top:6px;
    transition: background 0.2s;
  `;

  const panel = document.createElement('div');
  panel.style.cssText = `
    background: #1e1b3a; border-radius: 16px; padding: 28px;
    max-width: 720px; width: 90%; max-height: 80vh; overflow-y: auto;
    box-shadow: 0 24px 60px rgba(0,0,0,0.5);
    border: 1px solid rgba(255,255,255,0.1);
  `;

  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
      <span style="color:#fff; font-size:18px; font-weight:700;">Email Insights</span>
      <span class="pilot-close" style="color:rgba(255,255,255,0.5); cursor:pointer; font-size:22px; padding:4px 8px;">&times;</span>
    </div>
    <div style="display:flex; gap:16px; flex-wrap:wrap;">
      <!-- Action Items -->
      <div style="flex:1; min-width:260px; background:rgba(255,255,255,0.05); border-radius:12px; padding:18px; border:1px solid rgba(255,255,255,0.08);">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px;">
          <span style="color:#ff9f7f; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Action Items</span>
          <span style="background:rgba(255,159,127,0.2); color:#ff9f7f; font-size:10px; padding:2px 8px; border-radius:10px;">${items.length}</span>
        </div>
        ${items.length > 0
          ? items.map(t => `
            <div style="display:flex; align-items:flex-start; gap:10px; margin-bottom:10px;">
              <span style="width:6px; height:6px; border-radius:50%; background:#ff9f7f; margin-top:6px; flex-shrink:0;"></span>
              <span style="color:rgba(255,255,255,0.8); font-size:13px; line-height:1.5;">${t}</span>
            </div>`).join('')
          : '<span style="color:rgba(255,255,255,0.3); font-size:13px;">No action items found</span>'}
      </div>
      <!-- Meetings -->
      <div style="flex:1; min-width:260px; background:rgba(255,255,255,0.05); border-radius:12px; padding:18px; border:1px solid rgba(255,255,255,0.08);">
        <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px;">
          <span style="color:#7fe0ff; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Meetings</span>
          <span style="background:rgba(127,224,255,0.2); color:#7fe0ff; font-size:10px; padding:2px 8px; border-radius:10px;">${meetings.length}</span>
        </div>
        ${meetings.length > 0
          ? meetings.map((m, i) => `
            <div style="margin-bottom:14px;${i > 0 ? ' padding-top:12px; border-top:1px solid rgba(255,255,255,0.06);' : ''}">
              <div style="color:#fff; font-size:14px; font-weight:600; margin-bottom:4px;">${m.name || 'Untitled'}</div>
              ${m.date ? `<div style="color:rgba(255,255,255,0.5); font-size:12px;">📅 ${m.date}</div>` : ''}
              ${m.time ? `<div style="color:rgba(255,255,255,0.5); font-size:12px;">🕐 ${m.time}</div>` : ''}
              ${m.venue ? `<div style="color:rgba(255,255,255,0.5); font-size:12px;">📍 ${m.venue}</div>` : ''}
              <span class="pilot-cal-btn" data-index="${i}" style="${calBtnStyle}">
                📅 Add to Google Calendar
              </span>
            </div>`).join('')
          : '<span style="color:rgba(255,255,255,0.3); font-size:13px;">No meetings found</span>'}
      </div>
    </div>
    ${meetings.length > 0 ? `
    <div style="margin-top:16px; display:flex; gap:10px; flex-wrap:wrap;">
      <span class="pilot-add-all-cal" style="
        display:inline-flex; align-items:center; gap:6px;
        background:rgba(127,224,255,0.15); color:#7fe0ff;
        border:1px solid rgba(127,224,255,0.3); border-radius:6px;
        padding:8px 18px; font-size:13px; font-weight:600;
        cursor:pointer; transition: background 0.2s;
      ">📅 Add All to Calendar</span>
      <span class="pilot-connect-cal" style="
        display:inline-flex; align-items:center; gap:6px;
        background:rgba(76,175,80,0.15); color:#4caf50;
        border:1px solid rgba(76,175,80,0.3); border-radius:6px;
        padding:8px 18px; font-size:13px; font-weight:600;
        cursor:pointer; transition: background 0.2s;
      ">🔗 Connect Google Calendar</span>
    </div>` : ''}
    <div style="margin-top:16px; text-align:right;">
      <span class="pilot-close" style="background:rgba(124,107,255,0.15); color:#7c6bff; border:1px solid rgba(124,107,255,0.4); border-radius:6px; padding:8px 20px; cursor:pointer; font-size:13px; font-weight:600;">Close</span>
    </div>
  `;

  overlay.appendChild(panel);
  document.body.appendChild(overlay);

  // Individual "Add to Calendar" buttons
  panel.querySelectorAll('.pilot-cal-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index);
      addToCalendar(meetings[idx], btn);
    });
  });

  // "Add All to Calendar"
  const addAllBtn = panel.querySelector('.pilot-add-all-cal');
  if (addAllBtn) {
    addAllBtn.addEventListener('click', () => addAllToCalendar(meetings, addAllBtn));
  }

  // "Connect Google Calendar"
  const connectBtn = panel.querySelector('.pilot-connect-cal');
  if (connectBtn) {
    connectBtn.addEventListener('click', () => window.open(`${CAL_API}/auth`, '_blank'));
  }

  // Close handlers
  overlay.querySelectorAll('.pilot-close').forEach(el =>
    el.addEventListener('click', () => overlay.remove())
  );
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.remove();
  });
}

// ── Button factory ──────────────────────────────────────────────────

function createButton(label, color, className) {
  const btn = document.createElement('div');
  btn.className = `T-I J-J5-Ji aoO v7 T-I-atl L3 ${className}`;
  btn.style.cssText = `
    margin-left: 8px;
    background: rgba(${color}, 0.15);
    color: rgb(${color});
    border: 1px solid rgba(${color}, 0.4);
    border-radius: 6px;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    display: flex;
    align-items: center;
    height: 32px;
    user-select: none;
    letter-spacing: 0.3px;
    transition: background 0.2s;
  `;
  btn.textContent = label;
  btn.setAttribute('role', 'button');
  btn.setAttribute('tabindex', '0');
  return btn;
}

// ── Smart Reply button ──────────────────────────────────────────────

function addReplyButton(toolbar) {
  if (toolbar.querySelector('.pilot-btn')) return;

  const btn = createButton('Smart Reply', '124,107,255', 'pilot-btn');

  btn.addEventListener('click', async () => {
    const body = extractMailBody();
    if (!body) { alert('No email content to reply to.'); return; }

    btn.textContent = 'Writing...';
    btn.style.opacity = '0.6';
    btn.style.pointerEvents = 'none';

    try {
      const res = await fetch(`${API_BASE}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, tone: 'professional' }),
      });
      if (!res.ok) throw new Error('Status ' + res.status);
      const text = await res.text();
      const compose = findComposeArea();
      if (compose) {
        compose.focus();
        document.execCommand('selectAll');
        document.execCommand('insertText', false, text);
      } else { alert('Compose box not found.'); }
    } catch (e) {
      alert('Smart Reply error: ' + e.message);
    } finally {
      btn.textContent = 'Smart Reply';
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
  });

  toolbar.appendChild(btn);
}

// ── Format button ───────────────────────────────────────────────────

function addFormatButton(toolbar) {
  if (toolbar.querySelector('.pilot-format-btn')) return;

  const btn = createButton('Polish', '76,175,80', 'pilot-format-btn');

  btn.addEventListener('click', async () => {
    const compose = findComposeArea();
    const draft = compose?.innerText?.trim();
    if (!draft) { alert('No draft to polish.'); return; }

    btn.textContent = 'Polishing...';
    btn.style.opacity = '0.6';
    btn.style.pointerEvents = 'none';

    try {
      const res = await fetch(`${API_BASE}/format`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft, tone: 'professional' }),
      });
      if (!res.ok) throw new Error('Status ' + res.status);
      const text = await res.text();
      if (compose) {
        compose.focus();
        document.execCommand('selectAll');
        document.execCommand('insertText', false, text);
      }
    } catch (e) {
      alert('Polish error: ' + e.message);
    } finally {
      btn.textContent = 'Polish';
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
  });

  toolbar.appendChild(btn);
}

// ── Enhance button ──────────────────────────────────────────────────

function addEnhanceButton(toolbar) {
  if (toolbar.querySelector('.pilot-enhance-btn')) return;

  const btn = createButton('Enhance', '255,159,127', 'pilot-enhance-btn');

  btn.addEventListener('click', async () => {
    const compose = findComposeArea();
    const draft = compose?.innerText?.trim();
    if (!draft) { alert('No draft to enhance.'); return; }

    btn.textContent = 'Enhancing...';
    btn.style.opacity = '0.6';
    btn.style.pointerEvents = 'none';

    try {
      const res = await fetch(`${API_BASE}/enhance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: draft, tone: 'professional' }),
      });
      if (!res.ok) throw new Error('Status ' + res.status);
      const text = await res.text();
      if (compose) {
        compose.focus();
        document.execCommand('selectAll');
        document.execCommand('insertText', false, text);
      }
    } catch (e) {
      alert('Enhance error: ' + e.message);
    } finally {
      btn.textContent = 'Enhance';
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
  });

  toolbar.appendChild(btn);
}

// ── Insights button ─────────────────────────────────────────────────

function addInsightsButton(toolbar) {
  if (toolbar.querySelector('.pilot-insights-btn')) return;

  const btn = createButton('Insights', '127,224,255', 'pilot-insights-btn');

  btn.addEventListener('click', async () => {
    const body = extractMailBody();
    const compose = findComposeArea();
    const content = body || compose?.innerText?.trim();
    if (!content) { alert('No email content to analyze.'); return; }

    btn.textContent = 'Analyzing...';
    btn.style.opacity = '0.6';
    btn.style.pointerEvents = 'none';

    try {
      const res = await fetch(`${API_BASE}/insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: content }),
      });
      if (!res.ok) throw new Error('Status ' + res.status);
      const data = await res.json();
      showInsightsPanel(data);
    } catch (e) {
      alert('Insights error: ' + e.message);
    } finally {
      btn.textContent = 'Insights';
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
  });

  toolbar.appendChild(btn);
}

// ── Toolbar detection & injection ───────────────────────────────────

function findToolbars() {
  const selectors = ['.btC', '.bAK', '.gU.Up'];
  for (const sel of selectors) {
    const hits = document.querySelectorAll(sel);
    if (hits.length > 0) return hits;
  }

  const toolbars = [];
  document.querySelectorAll('[role="button"][data-tooltip*="Send"]').forEach((sendBtn) => {
    const row = sendBtn.closest('tr') || sendBtn.parentElement;
    if (row && !toolbars.includes(row)) toolbars.push(row);
  });
  return toolbars;
}

function scanForCompose() {
  const toolbars = findToolbars();
  toolbars.forEach((toolbar) => {
    addReplyButton(toolbar);
    addFormatButton(toolbar);
    addEnhanceButton(toolbar);
    addInsightsButton(toolbar);
  });
}

new MutationObserver(() => setTimeout(scanForCompose, 500))
  .observe(document.body, { childList: true, subtree: true });

scanForCompose();
