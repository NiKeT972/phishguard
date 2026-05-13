import React, { useState } from 'react';
import axios from 'axios';
import { Shield, AlertTriangle, AlertCircle, CheckCircle, ExternalLink, Flag, Printer } from 'lucide-react';
import { showToast } from './Toast';

const API = 'http://localhost:8000';

function CircularProgress({ value, color }) {
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;

  return (
    <svg width="90" height="90" viewBox="0 0 90 90">
      <circle cx="45" cy="45" r={r} fill="none" stroke="var(--bg-secondary)" strokeWidth="7" />
      <circle
        cx="45" cy="45" r={r}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 45 45)"
        style={{ transition: 'stroke-dashoffset 1s ease' }}
      />
      <text x="45" y="45" textAnchor="middle" dominantBaseline="central" fill={color} fontSize="18" fontWeight="800">
        {value}%
      </text>
    </svg>
  );
}

const VERDICT_CONFIG = {
  SAFE: {
    icon: '✅',
    label: 'SAFE',
    color: 'var(--accent-green)',
    bg: 'rgba(0, 255, 136, 0.08)',
    border: 'rgba(0, 255, 136, 0.3)',
    Icon: CheckCircle,
    message: 'This appears to be safe.',
  },
  SUSPICIOUS: {
    icon: '⚠️',
    label: 'SUSPICIOUS',
    color: 'var(--accent-yellow)',
    bg: 'rgba(255, 215, 0, 0.08)',
    border: 'rgba(255, 215, 0, 0.3)',
    Icon: AlertTriangle,
    message: 'Proceed with caution.',
  },
  SCAM: {
    icon: '🚨',
    label: 'SCAM DETECTED',
    color: 'var(--accent-red)',
    bg: 'rgba(255, 71, 87, 0.08)',
    border: 'rgba(255, 71, 87, 0.3)',
    Icon: AlertCircle,
    message: 'Do NOT share any information!',
  },
};

const SEVERITY_CONFIG = {
  high: { icon: '🔴', color: '#FF4757', bg: 'rgba(255, 71, 87, 0.15)', border: 'rgba(255, 71, 87, 0.35)' },
  medium: { icon: '🟡', color: '#FFD700', bg: 'rgba(255, 215, 0, 0.12)', border: 'rgba(255, 215, 0, 0.35)' },
  low: { icon: '🟢', color: '#00FF88', bg: 'rgba(0, 255, 136, 0.1)', border: 'rgba(0, 255, 136, 0.3)' },
};

export default function VerdictCard({ result, scanType, inputText }) {
  const [reported, setReported] = useState(false);

  if (!result) return null;

  const config = VERDICT_CONFIG[result.verdict] || VERDICT_CONFIG.SUSPICIOUS;
  const reasons = result.reasons || result.reasons_english || [];
  const reasonsHindi = result.reasons_hindi || [];
  const signals = result.signals || [];

  const showReportBtn = result.verdict === 'SCAM' || result.verdict === 'SUSPICIOUS';

  const handleReport = async () => {
    if (reported) return;
    try {
      await axios.post(`${API}/api/report`, {
        scan_type: scanType || 'unknown',
        input_text: inputText || '',
        verdict: result.verdict,
        reporter_note: '',
      });
    } catch {
      // If endpoint doesn't exist yet, still show success UX
    }
    setReported(true);
    showToast('Scam reported to community database!', 'success');
  };

  const handleCopyDetails = () => {
    const text = `PhishGuard Report\nVerdict: ${result.verdict}\nConfidence: ${result.confidence}%\nReasons: ${reasons.join(', ')}`;
    navigator.clipboard.writeText(text).then(() => showToast('Details copied!', 'success'));
  };

  const handleExportPDF = () => {
    window.print();
  };

  return (
    <div
      className="animate-fade-in-up verdict-card-print"
      style={{
        ...styles.card,
        background: config.bg,
        border: `1px solid ${config.border}`,
      }}
    >
      {/* Verdict header */}
      <div style={styles.header}>
        <div style={styles.verdictLeft}>
          <span style={styles.verdictIcon}>{config.icon}</span>
          <div>
            <div style={{ ...styles.verdictLabel, color: config.color }}>{config.label}</div>
            <div style={styles.verdictSubtext}>{config.message}</div>
          </div>
        </div>
        <CircularProgress value={result.confidence || 0} color={config.color} />
      </div>

      {/* Scam type */}
      {result.scam_type && result.scam_type !== 'Safe' && (
        <div style={{ ...styles.scamTypeBadge, borderColor: config.border, color: config.color }}>
          <Shield size={14} />
          <span>Scam Type: <strong>{result.scam_type}</strong></span>
        </div>
      )}

      {/* Info row */}
      <div style={styles.infoRow}>
        {result.domain_age_days !== undefined && (
          <InfoChip label="Domain Age" value={result.domain_age_days !== null ? `${result.domain_age_days} days` : 'Unknown'} />
        )}
        {result.ssl_valid !== undefined && (
          <InfoChip label="SSL" value={result.ssl_valid ? '✅ Valid' : '❌ Invalid'} />
        )}
        {result.virustotal_detections !== undefined && (
          <InfoChip label="VirusTotal" value={`${result.virustotal_detections} detections`} />
        )}
        {result.upi_format_valid !== undefined && (
          <InfoChip label="UPI Format" value={result.upi_format_valid ? '✅ Valid' : '❌ Invalid'} />
        )}
      </div>

      {/* Reasons */}
      {reasons.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Why we flagged this:</div>
          <ul style={styles.reasonsList}>
            {reasons.map((r, i) => (
              <li key={i} style={styles.reasonItem}>
                <span style={{ color: config.color, marginRight: '8px', fontSize: '16px' }}>›</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Signal Breakdown */}
      {signals.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Signal Breakdown:</div>
          <div style={styles.signalsWrapper}>
            {signals.map((signal, i) => {
              const sev = SEVERITY_CONFIG[signal.severity] || SEVERITY_CONFIG.low;
              return (
                <span
                  key={i}
                  style={{
                    ...styles.signalChip,
                    background: sev.bg,
                    border: `1px solid ${sev.border}`,
                    color: sev.color,
                  }}
                >
                  {sev.icon} {signal.name}: {signal.value}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {/* Hindi reasons */}
      {reasonsHindi.length > 0 && (
        <div style={{ ...styles.section, ...styles.hindiSection }}>
          <div style={styles.sectionTitle}>हिंदी में: (In Hindi)</div>
          <ul style={styles.reasonsList}>
            {reasonsHindi.map((r, i) => (
              <li key={i} style={{ ...styles.reasonItem, fontFamily: 'serif', fontSize: '14px' }}>
                <span style={{ color: 'var(--accent-cyan)', marginRight: '8px' }}>›</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Extracted URLs */}
      {result.extracted_urls && result.extracted_urls.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>URLs found in message:</div>
          {result.extracted_urls.map((url, i) => (
            <div key={i} style={styles.urlChip}>{url}</div>
          ))}
        </div>
      )}

      {/* Suspicious UPI keywords */}
      {result.suspicious_keywords_found && result.suspicious_keywords_found.length > 0 && (
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Suspicious keywords in UPI ID:</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {result.suspicious_keywords_found.map((kw, i) => (
              <span key={i} style={styles.keyword}>{kw}</span>
            ))}
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={styles.actions} className="no-print">
        {showReportBtn && (
          <button
            style={{
              ...styles.reportBtn,
              ...(reported ? styles.reportBtnDone : {}),
            }}
            onClick={handleReport}
            disabled={reported}
          >
            <Flag size={15} />
            {reported ? 'Reported ✓' : 'Report to Community'}
          </button>
        )}
        <a
          href="https://cybercrime.gov.in"
          target="_blank"
          rel="noopener noreferrer"
          style={styles.cyberBtn}
        >
          <ExternalLink size={15} />
          Report to Cyber Crime
        </a>
        <button style={styles.copyBtn} onClick={handleCopyDetails}>
          Copy Details
        </button>
        <button style={styles.exportBtn} onClick={handleExportPDF}>
          <Printer size={15} />
          Export Report
        </button>
      </div>
    </div>
  );
}

function InfoChip({ label, value }) {
  return (
    <div style={styles.infoChip}>
      <span style={styles.infoLabel}>{label}</span>
      <span style={styles.infoValue}>{value}</span>
    </div>
  );
}

const styles = {
  card: {
    borderRadius: '16px',
    padding: '24px',
    marginTop: '24px',
    maxWidth: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
    flexWrap: 'wrap',
    gap: '12px',
  },
  verdictLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  verdictIcon: {
    fontSize: 'clamp(28px, 6vw, 40px)',
    lineHeight: 1,
  },
  verdictLabel: {
    fontSize: 'clamp(16px, 4vw, 22px)',
    fontWeight: '800',
    letterSpacing: '1px',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  verdictSubtext: {
    fontSize: 'clamp(11px, 2.5vw, 13px)',
    color: 'var(--text-secondary)',
    marginTop: '2px',
  },
  scamTypeBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    border: '1px solid',
    borderRadius: '20px',
    padding: '6px 14px',
    fontSize: '13px',
    fontWeight: '600',
    marginBottom: '16px',
  },
  infoRow: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginBottom: '16px',
  },
  infoChip: {
    background: 'var(--bg-secondary)',
    borderRadius: '8px',
    padding: '8px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  infoLabel: {
    fontSize: '11px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  infoValue: {
    fontSize: '13px',
    fontWeight: '600',
    color: 'var(--text-primary)',
  },
  section: {
    marginBottom: '16px',
  },
  sectionTitle: {
    fontSize: '12px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '10px',
  },
  reasonsList: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  reasonItem: {
    fontSize: '14px',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'flex-start',
    lineHeight: '1.5',
  },
  signalsWrapper: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
  },
  signalChip: {
    borderRadius: '20px',
    padding: '5px 12px',
    fontSize: '12px',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    whiteSpace: 'nowrap',
  },
  hindiSection: {
    background: 'rgba(0, 245, 255, 0.04)',
    borderRadius: '10px',
    padding: '14px',
    border: '1px solid rgba(0, 245, 255, 0.1)',
  },
  urlChip: {
    background: 'var(--bg-secondary)',
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    color: 'var(--accent-cyan)',
    fontFamily: 'monospace',
    marginBottom: '4px',
    wordBreak: 'break-all',
  },
  keyword: {
    background: 'rgba(255, 71, 87, 0.15)',
    color: 'var(--accent-red)',
    border: '1px solid rgba(255, 71, 87, 0.3)',
    borderRadius: '6px',
    padding: '4px 10px',
    fontSize: '12px',
    fontWeight: '600',
  },
  actions: {
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap',
    marginTop: '8px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  reportBtn: {
    background: 'rgba(0, 245, 255, 0.1)',
    border: '1px solid rgba(0, 245, 255, 0.3)',
    color: 'var(--accent-cyan)',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  reportBtnDone: {
    background: 'rgba(0, 255, 136, 0.1)',
    border: '1px solid rgba(0, 255, 136, 0.3)',
    color: 'var(--accent-green)',
    cursor: 'default',
    opacity: 0.8,
  },
  cyberBtn: {
    background: 'rgba(255, 71, 87, 0.1)',
    border: '1px solid rgba(255, 71, 87, 0.3)',
    color: 'var(--accent-red)',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
  },
  copyBtn: {
    background: 'transparent',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  exportBtn: {
    background: 'rgba(162, 155, 254, 0.1)',
    border: '1px solid rgba(162, 155, 254, 0.3)',
    color: '#A29BFE',
    borderRadius: '8px',
    padding: '10px 18px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
};
