const API = 'http://localhost:8000';

// ─────────────────────────────────────────────────────────────────────────────
// Context menu setup
// ─────────────────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'phishguard-check-link',
    title: '🛡️ Check with PhishGuard',
    contexts: ['link'],
  });

  chrome.contextMenus.create({
    id: 'phishguard-check-selection',
    title: '🛡️ Analyse selected text with PhishGuard',
    contexts: ['selection'],
  });

  chrome.contextMenus.create({
    id: 'phishguard-check-page',
    title: '🛡️ Scan this page with PhishGuard',
    contexts: ['page'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'phishguard-check-link') {
    const url = info.linkUrl;
    await chrome.storage.session.set({ pendingUrl: url });
    chrome.action.openPopup();
  } else if (info.menuItemId === 'phishguard-check-selection') {
    const text = info.selectionText;
    await chrome.storage.session.set({ pendingUrl: text });
    chrome.action.openPopup();
  } else if (info.menuItemId === 'phishguard-check-page') {
    const url = tab.url;
    await chrome.storage.session.set({ pendingUrl: url });
    chrome.action.openPopup();
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Message handler (from content script)
// ─────────────────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SCAN_URL') {
    scanUrl(message.url)
      .then(result => sendResponse({ success: true, result }))
      .catch(err => sendResponse({ success: false, error: err.message }));
    return true; // keep channel open for async response
  }

  if (message.type === 'GET_STATS') {
    fetch(`${API}/api/stats`)
      .then(r => r.json())
      .then(data => sendResponse({ success: true, data }))
      .catch(() => sendResponse({ success: false }));
    return true;
  }
});

async function scanUrl(url) {
  const res = await fetch(`${API}/api/scan/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw new Error('API error');
  return res.json();
}
