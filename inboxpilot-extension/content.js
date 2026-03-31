// AI Email Writer - Gmail Content Script

function getEmailContent() {
  // Try multiple selectors to handle different Gmail layouts
  const selectors = ['.h7', '.a3s.aiL', '.gmail_quote'];
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el.innerText.trim();
  }
  return '';
}

function getComposeBox() {
  return document.querySelector('[role="textbox"][g_editable="true"]');
}

function injectAIButton(toolbar) {
  // Avoid injecting twice
  if (toolbar.querySelector('.ai-reply-btn')) return;

  const btn = document.createElement('div');
  btn.className = 'T-I J-J5-Ji aoO v7 T-I-atl L3 ai-reply-btn';
  btn.style.cssText = `
    margin-left: 8px;
    background-color: #1a73e8;
    color: white;
    border-radius: 4px;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    height: 32px;
    user-select: none;
  `;
  btn.textContent = 'AI Reply';
  btn.setAttribute('role', 'button');
  btn.setAttribute('tabindex', '0');

  btn.addEventListener('click', async () => {
    const emailContent = getEmailContent();
    if (!emailContent) {
      alert('Could not find email content to reply to.');
      return;
    }

    btn.textContent = 'Generating...';
    btn.style.opacity = '0.7';
    btn.style.pointerEvents = 'none';

    try {
      const response = await fetch('http://localhost:8080/api/email/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emailContent, tone: 'professional' }),
      });

      if (!response.ok) throw new Error('API error: ' + response.status);

      const generatedReply = await response.text();
      const composeBox = getComposeBox();

      if (composeBox) {
        composeBox.focus();
        document.execCommand('selectAll');
        document.execCommand('insertText', false, generatedReply);
      } else {
        alert('Could not find the compose box.');
      }
    } catch (err) {
      alert('Failed to generate reply: ' + err.message);
    } finally {
      btn.textContent = 'AI Reply';
      btn.style.opacity = '1';
      btn.style.pointerEvents = 'auto';
    }
  });

  toolbar.appendChild(btn);
}

function checkForComposeWindow() {
  // Gmail compose toolbar selector
  const toolbars = document.querySelectorAll('.btC');
  toolbars.forEach((toolbar) => injectAIButton(toolbar));
}

// Watch for Gmail dynamically adding compose windows
const observer = new MutationObserver(() => {
  setTimeout(checkForComposeWindow, 500);
});

observer.observe(document.body, { childList: true, subtree: true });

// Initial check
checkForComposeWindow();
