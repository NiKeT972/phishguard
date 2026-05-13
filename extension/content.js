// PhishGuard Content Script — scans all links on the page

const PHISHGUARD_ATTR = 'data-phishguard-checked';
const SCAN_DELAY = 1500; // Wait for page to settle
const MAX_LINKS = 40;    // Limit concurrent scans

const DEMO_SCAM_PATTERNS = [
  /sbi-kyc/i, /paytm-reward/i, /hdfc-account-verify/i,
  /amazon-prize/i, /sbi-kyc\.net/i, /-kyc-update\./i,
  /lottery.*\.tk/i, /prize.*\.ml/i, /refund.*\.ga/i,
];

const DEMO_SAFE_PATTERNS = [
  /^https:\/\/sbi\.co\.in/i, /^https:\/\/paytm\.com/i,
  /^https:\/\/amazon\.in/i, /^https:\/\/google\.com/i,
  /^https:\/\/hdfcbank\.com/i, /^https:\/\/icicibank\.com/i,
];

const SUSPICIOUS_TLDS = ['.tk', '.ml', '.ga', '.cf', '.gq', '.xyz'];

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

let scanQueue = [];
let scanning = false;

setTimeout(startScan, SCAN_DELAY);

function startScan() {
  const links = Array.from(document.querySelectorAll('a[href]'))
    .filter(a => {
      const href = a.href;
      return href && href.startsWith('http') && !a.hasAttribute(PHISHGUARD_ATTR);
    })
    .slice(0, MAX_LINKS);

  if (links.length === 0) return;

  // Quick local checks first (no API needed)
  links.forEach(link => {
    link.setAttribute(PHISHGUARD_ATTR, 'pending');
    const verdict = quickLocalCheck(link.href);
    if (verdict) {
      applyBadge(link, verdict.verdict, verdict.reason);
    } else {
      scanQueue.push(link);
    }
  });

  // Process remaining via API
  processQueue();
}

function quickLocalCheck(url) {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    // Demo scam patterns
    for (const pattern of DEMO_SCAM_PATTERNS) {
      if (pattern.test(url)) {
        return { verdict: 'SCAM', reason: 'Known phishing domain' };
      }
    }

    // Demo safe
    for (const pattern of DEMO_SAFE_PATTERNS) {
      if (pattern.test(url)) return null; // Skip API for known safe
    }

    // Suspicious TLDs
    for (const tld of SUSPICIOUS_TLDS) {
      if (host.endsWith(tld)) {
        return { verdict: 'SUSPICIOUS', reason: `Suspicious domain extension: ${tld}` };
      }
    }

    // Many hyphens
    if ((host.match(/-/g) || []).length >= 3) {
      return { verdict: 'SUSPICIOUS', reason: 'Domain has many hyphens' };
    }

    return null;
  } catch {
    return null;
  }
}

async function processQueue() {
  if (scanning || scanQueue.length === 0) return;
  scanning = true;

  // Process in small batches to avoid overwhelming the API
  const batch = scanQueue.splice(0, 5);

  await Promise.all(batch.map(async (link) => {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'SCAN_URL',
        url: link.href,
      });

      if (response.success && response.result) {
        const { verdict, reasons, reasons_english } = response.result;
        const reason = (reasons || reasons_english || [''])[0] || '';
        if (verdict === 'SCAM' || verdict === 'SUSPICIOUS') {
          applyBadge(link, verdict, reason);
        } else {
          link.setAttribute(PHISHGUARD_ATTR, 'safe');
        }
      }
    } catch {
      // API unavailable — skip silently
      link.setAttribute(PHISHGUARD_ATTR, 'skipped');
    }
  }));

  scanning = false;

  if (scanQueue.length > 0) {
    setTimeout(processQueue, 500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Visual badge application
// ─────────────────────────────────────────────────────────────────────────────

function applyBadge(link, verdict, reason) {
  link.setAttribute(PHISHGUARD_ATTR, verdict.toLowerCase());

  if (verdict === 'SCAM') {
    link.style.backgroundColor = 'rgba(255, 71, 87, 0.15)';
    link.style.borderRadius = '3px';
    link.style.outline = '1.5px solid rgba(255, 71, 87, 0.6)';
    link.style.textDecoration = 'underline wavy #FF4757';
    appendBadgeIcon(link, '🚨', '#FF4757', reason);
  } else if (verdict === 'SUSPICIOUS') {
    link.style.textDecoration = 'underline wavy #FFD700';
    link.style.outline = '1px dashed rgba(255, 215, 0, 0.4)';
    appendBadgeIcon(link, '⚠️', '#FFD700', reason);
  }
}

function appendBadgeIcon(link, emoji, color, reason) {
  // Avoid duplicate badges
  if (link.querySelector('.phishguard-badge')) return;

  const badge = document.createElement('span');
  badge.className = 'phishguard-badge';
  badge.textContent = emoji;
  badge.title = `PhishGuard: ${reason}`;
  badge.style.cssText = `
    display: inline-block;
    margin-left: 4px;
    font-size: 14px;
    cursor: help;
    vertical-align: middle;
    position: relative;
    z-index: 9999;
  `;

  // Tooltip on hover
  badge.addEventListener('mouseenter', () => {
    showTooltip(badge, `🛡️ PhishGuard\n${reason}`, color);
  });
  badge.addEventListener('mouseleave', hideTooltip);

  // Insert after the link
  link.insertAdjacentElement('afterend', badge);
}

let activeTooltip = null;

function showTooltip(el, text, color) {
  hideTooltip();
  const tip = document.createElement('div');
  tip.id = 'phishguard-tooltip';
  tip.style.cssText = `
    position: fixed;
    background: #111830;
    color: white;
    border: 1px solid ${color};
    border-radius: 8px;
    padding: 8px 12px;
    font-size: 12px;
    font-family: Inter, sans-serif;
    z-index: 999999;
    max-width: 240px;
    white-space: pre-line;
    line-height: 1.5;
    box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    pointer-events: none;
  `;
  tip.textContent = text;

  const rect = el.getBoundingClientRect();
  document.body.appendChild(tip);

  const tipRect = tip.getBoundingClientRect();
  let top = rect.bottom + 6;
  let left = rect.left;

  if (left + tipRect.width > window.innerWidth) left = window.innerWidth - tipRect.width - 10;
  if (top + tipRect.height > window.innerHeight) top = rect.top - tipRect.height - 6;

  tip.style.top = `${top}px`;
  tip.style.left = `${left}px`;
  activeTooltip = tip;
}

function hideTooltip() {
  if (activeTooltip) {
    activeTooltip.remove();
    activeTooltip = null;
  }
}

// Observe DOM changes for dynamically loaded links
const observer = new MutationObserver(() => {
  const newLinks = document.querySelectorAll(`a[href]:not([${PHISHGUARD_ATTR}])`);
  if (newLinks.length > 0) {
    startScan();
  }
});

observer.observe(document.body, { childList: true, subtree: true });
