import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Link2, MessageSquare, Mail, Smartphone, Clipboard, Zap, Phone } from 'lucide-react';
import VerdictCard from '../components/VerdictCard';
import { showToast } from '../components/Toast';

const API = 'http://localhost:8000';

const TABS = [
  { id: 'url', label: 'URL', icon: Link2, placeholder: 'Paste any suspicious URL here...', hint: 'e.g. http://sbi-kyc-update.com' },
  { id: 'sms', label: 'SMS', icon: Smartphone, placeholder: 'Paste the suspicious SMS text here...', hint: 'Copy paste any suspicious SMS message' },
  { id: 'email', label: 'Email', icon: Mail, placeholder: 'Paste the suspicious email content here...', hint: 'Include sender address and full email body' },
  { id: 'upi', label: 'UPI ID', icon: MessageSquare, placeholder: 'Enter UPI ID to verify...', hint: 'e.g. helpdesk@upi or prize@ybl' },
  { id: 'whatsapp', label: 'WhatsApp', icon: Phone, placeholder: 'Paste the forwarded WhatsApp message here...', hint: 'Copy any suspicious WhatsApp forward' },
];

const HERO_TEXTS = [
  'Paste It. We Analyse It. Stay Safe.',
  'India ka AI-powered scam shield.',
  'Real-time protection. Zero data collection.',
];

const playAlertSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    oscillator.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  } catch (e) {
    // Web Audio API not available, silently ignore
  }
};

export default function Scanner() {
  const [activeTab, setActiveTab] = useState('url');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [stats, setStats] = useState(null);
  const [heroIdx, setHeroIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx(i => (i + 1) % HERO_TEXTS.length), 4000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    axios.get(`${API}/api/stats`).then(r => setStats(r.data)).catch(() => {});
  }, []);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setInput(text);
      showToast('Pasted from clipboard!', 'success');
    } catch {
      showToast('Could not access clipboard.', 'error');
    }
  };

  const handleAnalyse = async () => {
    if (!input.trim()) {
      showToast('Please enter something to analyse.', 'error');
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      let res;
      if (activeTab === 'url') {
        res = await axios.post(`${API}/api/scan/url`, { url: input });
      } else if (activeTab === 'upi') {
        res = await axios.post(`${API}/api/scan/upi`, { upi_id: input });
      } else {
        // sms, email, whatsapp all go to /api/scan/text with their type
        res = await axios.post(`${API}/api/scan/text`, { text: input, type: activeTab });
      }
      setResult(res.data);
      // Play alert sound for SCAM verdict
      if (res.data && res.data.verdict === 'SCAM') {
        playAlertSound();
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Backend connection failed. Make sure the server is running on port 8000.';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const currentTab = TABS.find(t => t.id === activeTab);
  const isTextarea = activeTab === 'sms' || activeTab === 'email' || activeTab === 'whatsapp';

  return (
    <div style={styles.page}>
      {/* Hero */}
      <div style={styles.hero}>
        <div style={styles.shieldWrapper}>
          <div style={styles.shieldGlow} />
          <span style={styles.heroShield}>🛡️</span>
        </div>
        <h1 style={styles.heroTitle}>
          <span key={heroIdx} style={styles.heroText} className="animate-fade-in">
            {HERO_TEXTS[heroIdx]}
          </span>
        </h1>
        <p style={styles.heroSub}>
          India's AI-powered shield against cyber scams — SMS, email, URLs & UPI
        </p>
        <div style={styles.heroBadges}>
          <span style={styles.badge}>🤖 AI-Powered</span>
          <span style={styles.badge}>🇮🇳 Made for India</span>
          <span style={styles.badge}>🔒 Privacy First</span>
        </div>
      </div>

      {/* Scanner card */}
      <div style={styles.scannerCard}>
        {/* Tab buttons */}
        <div style={styles.tabs}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setResult(null); setInput(''); }}
              style={{
                ...styles.tabBtn,
                ...(activeTab === id ? styles.tabBtnActive : {}),
              }}
            >
              <Icon size={16} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {/* Input area */}
        <div style={styles.inputWrapper}>
          {isTextarea ? (
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={currentTab.placeholder}
              style={styles.textarea}
              rows={6}
            />
          ) : (
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={currentTab.placeholder}
              style={styles.input}
              onKeyDown={e => e.key === 'Enter' && handleAnalyse()}
            />
          )}
          <div style={styles.inputHint}>
            <span style={styles.hintText}>{currentTab.hint}</span>
            <button style={styles.pasteBtn} onClick={handlePaste}>
              <Clipboard size={14} />
              Paste
            </button>
          </div>
        </div>

        {/* Analyse button */}
        <button
          style={{
            ...styles.analyseBtn,
            ...(loading ? styles.analyseBtnLoading : {}),
          }}
          onClick={handleAnalyse}
          disabled={loading}
        >
          {loading ? (
            <LoadingShield />
          ) : (
            <>
              <Zap size={20} />
              ANALYSE
            </>
          )}
        </button>

        {/* Demo hints */}
        <div style={styles.demoHints}>
          <span style={styles.demoLabel}>Try demo:</span>
          {activeTab === 'url' && (
            <>
              <button style={styles.demoBtn} onClick={() => setInput('http://sbi-kyc-update.com')}>🚨 Scam URL</button>
              <button style={styles.demoBtn} onClick={() => setInput('https://sbi.co.in')}>✅ Safe URL</button>
            </>
          )}
          {(activeTab === 'sms' || activeTab === 'email') && (
            <>
              <button style={styles.demoBtn} onClick={() => setInput('Dear customer your SBI account is blocked update KYC immediately click here: http://sbi-kyc.net')}>🚨 KYC Fraud SMS</button>
              <button style={styles.demoBtn} onClick={() => setInput('Congratulations! You have won Rs 50000 in KBC lottery. Call 9876543210 to claim')}>🚨 Fake Prize</button>
            </>
          )}
          {activeTab === 'upi' && (
            <>
              <button style={styles.demoBtn} onClick={() => setInput('pm-relief@upi')}>🚨 Scam UPI</button>
              <button style={styles.demoBtn} onClick={() => setInput('merchant@oksbi')}>✅ Legit UPI</button>
            </>
          )}
          {activeTab === 'whatsapp' && (
            <>
              <button style={styles.demoBtn} onClick={() => setInput('Congratulations! You have been selected as a winner in KBC Lucky Draw 2024. You have won Rs 25,00,000. To claim your prize, share your Aadhaar number and bank details with our agent on WhatsApp: 9876543210. Limited time offer!')}>🚨 KBC Lottery</button>
              <button style={styles.demoBtn} onClick={() => setInput('URGENT: Your SBI account will be permanently blocked within 24 hours. Share your OTP and ATM PIN with our helpdesk to verify your identity. Call now: 1800-XXX-XXXX. Do not ignore this message.')}>🚨 OTP Scam</button>
            </>
          )}
        </div>

        {/* Skeleton loader */}
        {loading && (
          <div style={styles.skeletonWrapper}>
            <div className="skeleton" style={styles.skeletonBar} />
            <div className="skeleton" style={{ ...styles.skeletonBar, width: '80%' }} />
            <div className="skeleton" style={{ ...styles.skeletonBar, width: '60%' }} />
          </div>
        )}

        {/* Result */}
        {result && !loading && <VerdictCard result={result} scanType={activeTab} inputText={input} />}
      </div>

      {/* Stats bar */}
      {stats && <StatsBar stats={stats} />}
    </div>
  );
}

function LoadingShield() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <div style={styles.spinnerShield}>🛡️</div>
      <span>Analysing...</span>
    </div>
  );
}

function StatsBar({ stats }) {
  return (
    <div style={styles.statsBar}>
      <div style={styles.statsInner}>
        <StatItem
          value={stats.scams_detected_today?.toLocaleString('en-IN')}
          label="scams detected today"
          color="var(--accent-red)"
        />
        <div style={styles.statsDivider} />
        <StatItem
          value={stats.scams_this_week_mumbai?.toLocaleString('en-IN')}
          label="in Mumbai this week"
          color="var(--accent-yellow)"
        />
        <div style={styles.statsDivider} />
        <StatItem
          value={stats.total_users_protected?.toLocaleString('en-IN')}
          label="Indians protected"
          color="var(--accent-green)"
        />
        <div style={styles.statsDivider} />
        <div style={styles.statItem}>
          <span style={{ ...styles.statValue, color: 'var(--accent-cyan)', fontSize: '13px' }}>
            🔥 {stats.trending_scam}
          </span>
          <span style={styles.statLabel}>trending scam</span>
        </div>
      </div>
    </div>
  );
}

function StatItem({ value, label, color }) {
  return (
    <div style={styles.statItem}>
      <span style={{ ...styles.statValue, color }}>{value}</span>
      <span style={styles.statLabel}>{label}</span>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: '780px',
    margin: '0 auto',
    padding: '40px 20px 20px',
  },
  hero: {
    textAlign: 'center',
    marginBottom: '40px',
  },
  shieldWrapper: {
    position: 'relative',
    display: 'inline-block',
    marginBottom: '20px',
  },
  shieldGlow: {
    position: 'absolute',
    inset: '-20px',
    background: 'radial-gradient(circle, rgba(0,245,255,0.15) 0%, transparent 70%)',
    borderRadius: '50%',
    animation: 'pulse-glow 2.5s ease-in-out infinite',
  },
  heroShield: {
    fontSize: '72px',
    animation: 'shield-pulse 2.5s ease-in-out infinite',
    display: 'inline-block',
    position: 'relative',
  },
  heroTitle: {
    fontSize: 'clamp(22px, 5vw, 36px)',
    fontWeight: '800',
    fontFamily: 'Space Grotesk, sans-serif',
    marginBottom: '12px',
    lineHeight: 1.2,
    minHeight: '48px',
  },
  heroText: {
    display: 'inline-block',
  },
  heroSub: {
    fontSize: 'clamp(13px, 3vw, 16px)',
    color: 'var(--text-secondary)',
    maxWidth: '480px',
    margin: '0 auto 20px',
    lineHeight: 1.6,
  },
  heroBadges: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  badge: {
    background: 'rgba(0, 245, 255, 0.08)',
    border: '1px solid rgba(0, 245, 255, 0.2)',
    color: 'var(--accent-cyan)',
    borderRadius: '20px',
    padding: '5px 14px',
    fontSize: 'clamp(11px, 2vw, 12px)',
    fontWeight: '600',
  },
  scannerCard: {
    background: 'var(--bg-card)',
    borderRadius: '20px',
    border: '1px solid var(--border)',
    padding: '28px',
    boxShadow: 'var(--shadow-card)',
  },
  tabs: {
    display: 'flex',
    gap: '6px',
    marginBottom: '20px',
    background: 'var(--bg-secondary)',
    borderRadius: '12px',
    padding: '6px',
    flexWrap: 'wrap',
  },
  tabBtn: {
    flex: '1 1 60px',
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: '8px 10px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    fontSize: 'clamp(12px, 2vw, 14px)',
    fontWeight: '600',
    transition: 'all 0.2s',
    cursor: 'pointer',
    minWidth: '60px',
    whiteSpace: 'nowrap',
  },
  tabBtnActive: {
    background: 'var(--bg-card)',
    color: 'var(--accent-cyan)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
  },
  inputWrapper: {
    marginBottom: '16px',
  },
  input: {
    width: '100%',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '16px 20px',
    color: 'var(--text-primary)',
    fontSize: '15px',
    outline: 'none',
    transition: 'border-color 0.2s',
    display: 'block',
  },
  textarea: {
    width: '100%',
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    padding: '16px 20px',
    color: 'var(--text-primary)',
    fontSize: '15px',
    outline: 'none',
    resize: 'vertical',
    lineHeight: '1.6',
    display: 'block',
    minHeight: '120px',
  },
  inputHint: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '8px',
    padding: '0 4px',
  },
  hintText: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  pasteBtn: {
    background: 'none',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    borderRadius: '6px',
    padding: '4px 12px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  analyseBtn: {
    width: '100%',
    background: 'var(--accent-cyan)',
    color: '#0A0F2C',
    border: 'none',
    borderRadius: '12px',
    padding: '16px',
    fontSize: '17px',
    fontWeight: '800',
    letterSpacing: '1.5px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    transition: 'all 0.2s',
    boxShadow: '0 4px 20px rgba(0, 245, 255, 0.3)',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  analyseBtnLoading: {
    background: 'rgba(0, 245, 255, 0.3)',
    color: 'var(--accent-cyan)',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  spinnerShield: {
    fontSize: '24px',
    display: 'inline-block',
    animation: 'spin 1s linear infinite',
  },
  demoHints: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '14px',
    flexWrap: 'wrap',
  },
  demoLabel: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  demoBtn: {
    background: 'var(--bg-secondary)',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    borderRadius: '6px',
    padding: '5px 12px',
    fontSize: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    maxWidth: '200px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  skeletonWrapper: {
    marginTop: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  skeletonBar: {
    height: '20px',
    borderRadius: '6px',
    width: '100%',
  },
  statsBar: {
    marginTop: '32px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '14px',
    padding: '16px 24px',
    overflow: 'hidden',
  },
  statsInner: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    overflowX: 'auto',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  statItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '2px',
    minWidth: '100px',
  },
  statValue: {
    fontSize: '20px',
    fontWeight: '800',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  statLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  statsDivider: {
    width: '1px',
    height: '32px',
    background: 'var(--border)',
    flexShrink: 0,
  },
};
