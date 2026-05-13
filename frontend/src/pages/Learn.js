import React, { useState } from 'react';
import { Copy, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { showToast } from '../components/Toast';

const SCAM_TYPES = [
  {
    id: 'kyc',
    icon: '🪪',
    name: 'KYC Fraud',
    color: 'var(--accent-red)',
    howItWorks: 'Fraudsters pose as bank officials and claim your KYC (Know Your Customer) details are outdated. They pressure you to share Aadhaar, PAN, and banking details through phishing links or calls.',
    example: '"Dear customer, your SBI account KYC is pending. Your account will be blocked in 24 hours. Update now: http://sbi-kyc-update.net — SBI Support"',
    howToIdentify: [
      'Banks NEVER ask for KYC via SMS or WhatsApp',
      'Official links end in .sbi.co.in, .hdfcbank.com etc.',
      'Urgency + KYC = Red flag. Always.',
      'Check the sender — banks use registered numbers',
    ],
    whatToDo: [
      'Do NOT click the link',
      'Call your bank directly on the number on your card',
      'Report on cybercrime.gov.in',
      'Block the number',
    ],
  },
  {
    id: 'bank',
    icon: '🏦',
    name: 'Bank Impersonation',
    color: 'var(--accent-yellow)',
    howItWorks: 'Scammers create messages, emails, or calls that look exactly like they come from your bank (SBI, HDFC, ICICI etc.), asking you to verify your account or share credentials.',
    example: '"Your HDFC Bank account is suspended. To reactivate, call 9876543210 or visit http://hdfc-verify.tk immediately. HDFC Customer Care"',
    howToIdentify: [
      'Fake domains: hdfc-verify.tk, sbionline.net (not hdfcbank.com)',
      'Banks never ask for PIN or password over call/SMS',
      'Check sender ID — official HDFC SMS comes from AD-HDFCBK',
      'Spelling mistakes and urgency are classic tells',
    ],
    whatToDo: [
      'Hang up immediately if called',
      'Login directly to bank app, not via any link',
      'Call 1800-XXX-XXXX (official helpline on back of card)',
      'Report to your bank fraud department',
    ],
  },
  {
    id: 'otp',
    icon: '🔐',
    name: 'OTP Phishing',
    color: 'var(--accent-cyan)',
    howItWorks: 'Fraudsters initiate a payment or login on your account, then call pretending to be bank support asking for the OTP you just received, claiming it is for "verification".',
    example: '"Your Paytm OTP is 847291. Share this with our executive to complete your KYC verification. Valid for 10 minutes. — Paytm Team"',
    howToIdentify: [
      'OTPs are NEVER to be shared — ever',
      'Every OTP SMS says "Do not share this OTP"',
      'If someone calls asking for OTP = 100% scam',
      'No legitimate company ever needs your OTP',
    ],
    whatToDo: [
      'NEVER share OTP with anyone, including "bank staff"',
      'If you shared OTP, block your card immediately',
      'Change all banking passwords',
      'Call your bank fraud line within minutes',
    ],
  },
  {
    id: 'job',
    icon: '💼',
    name: 'Fake Job Offer',
    color: 'var(--accent-green)',
    howItWorks: 'Scammers post fake jobs offering "work from home", "part-time", or "data entry" roles with high pay. They ask for a registration/training fee upfront and disappear.',
    example: '"Urgent hiring! Work from home. Earn Rs 5,000/day. Data entry job. No experience needed. Registration fee Rs 500 only. WhatsApp: 9876543210"',
    howToIdentify: [
      'Legitimate jobs NEVER ask for upfront payment',
      'Too-good-to-be-true salaries (Rs 5000/day for data entry)',
      'WhatsApp/Telegram only — no official company email',
      'No verifiable company name or website',
    ],
    whatToDo: [
      'Never pay registration/training fees for jobs',
      'Verify company on LinkedIn and official website',
      'Check reviews on Glassdoor',
      'Report to cybercrime.gov.in if scammed',
    ],
  },
  {
    id: 'prize',
    icon: '🎰',
    name: 'Fake Prize / Lottery',
    color: 'var(--accent-orange)',
    howItWorks: 'You receive a message claiming you won a prize (KBC, Amazon, BSNL lottery). To claim it, they ask for your personal details, bank info, or a "processing fee".',
    example: '"Congratulations! You have been selected as the lucky winner of Rs 25,00,000 in KBC Season 14. Contact Mr. Sharma at 9876543210 to claim your prize."',
    howToIdentify: [
      'You cannot win a lottery you never entered',
      'KBC only selects participants — never calls winners randomly',
      'Any "processing fee" or "tax payment" = definite scam',
      'Real prizes are never announced via WhatsApp/SMS',
    ],
    whatToDo: [
      'Ignore and delete the message',
      'Never share bank details or pay any fee',
      'If you paid, file FIR + report on cybercrime.gov.in',
      'Warn family members, especially elderly',
    ],
  },
  {
    id: 'govt',
    icon: '🏛️',
    name: 'Government Impersonation',
    color: '#A29BFE',
    howItWorks: 'Fraudsters pretend to be from TRAI, Income Tax, IRDAI, or other government agencies. Common threats include "SIM block", "income tax notice", or "arrest warrant" unless you pay immediately.',
    example: '"TRAI Notice: Your mobile number 98XXXXXXXX will be blocked in 2 hours for illegal use. To unblock, press 1 immediately. — TRAI Department"',
    howToIdentify: [
      'TRAI never sends SMS to disconnect SIMs — your operator does',
      'Income Tax sends notices via registered post, not SMS',
      'Government agencies NEVER demand immediate phone payment',
      'No legitimate agency threatens "arrest" via phone',
    ],
    whatToDo: [
      'Hang up immediately',
      'Visit the official government website directly',
      'Call the official helpline (not the number they give)',
      'File complaint on Sanchar Saathi portal for SIM fraud',
    ],
  },
];

function ScamCard({ scam }) {
  const [expanded, setExpanded] = useState(false);

  const handleCopy = () => {
    const text = `⚠️ ${scam.name} Alert!\n\nExample: ${scam.example}\n\nHow to identify:\n${scam.howToIdentify.map(s => '• ' + s).join('\n')}\n\nStay safe! Report scams at cybercrime.gov.in`;
    navigator.clipboard.writeText(text).then(() => showToast('Scam alert copied! Share to protect others.', 'success'));
  };

  return (
    <div style={{ ...styles.card, borderColor: `${scam.color}30` }}>
      {/* Card header */}
      <div style={styles.cardHeader}>
        <div style={styles.cardHeaderLeft}>
          <span style={styles.scamIcon}>{scam.icon}</span>
          <div>
            <h3 style={{ ...styles.scamName, color: scam.color }}>{scam.name}</h3>
            <p style={styles.scamDesc}>{scam.howItWorks}</p>
          </div>
        </div>
        <button
          style={{ ...styles.expandBtn, borderColor: `${scam.color}40`, color: scam.color }}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {/* Example message */}
      <div style={{ ...styles.exampleBox, borderLeftColor: scam.color }}>
        <div style={styles.exampleLabel}>📱 Real scam example:</div>
        <div style={styles.exampleText}>"{scam.example}"</div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={styles.expandedContent} className="animate-fade-in">
          <div style={styles.twoCol}>
            <div>
              <div style={styles.sectionHead}>🔍 How to identify</div>
              <ul style={styles.list}>
                {scam.howToIdentify.map((s, i) => (
                  <li key={i} style={styles.listItem}>
                    <span style={{ color: scam.color, marginRight: '8px' }}>›</span>{s}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div style={styles.sectionHead}>✅ What to do</div>
              <ul style={styles.list}>
                {scam.whatToDo.map((s, i) => (
                  <li key={i} style={styles.listItem}>
                    <span style={{ color: 'var(--accent-green)', marginRight: '8px' }}>›</span>{s}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div style={styles.cardFooter}>
        <button style={styles.shareBtn} onClick={handleCopy}>
          <Copy size={14} />
          Share Alert
        </button>
        <button style={styles.toggleBtn} onClick={() => setExpanded(!expanded)}>
          {expanded ? 'Show less' : 'Learn more'}
        </button>
      </div>
    </div>
  );
}

export default function Learn() {
  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>📚 Scam Encyclopedia</h1>
        <p style={styles.subtitle}>Know Before You Fall For It — Learn to identify India's most common cyber scams</p>
      </div>

      {/* Quick stat */}
      <div style={styles.alertBanner}>
        <span style={styles.alertIcon}>⚡</span>
        <span>India loses <strong style={{ color: 'var(--accent-red)' }}>₹10,000+ crore</strong> to cyber fraud every year. Knowledge is your best shield.</span>
      </div>

      {/* Scam cards */}
      <div style={styles.cardGrid}>
        {SCAM_TYPES.map(scam => (
          <ScamCard key={scam.id} scam={scam} />
        ))}
      </div>

      {/* Bottom CTA */}
      <div style={styles.cta}>
        <div style={styles.ctaContent}>
          <div style={styles.ctaTitle}>🚨 Received a Scam?</div>
          <div style={styles.ctaText}>
            Report it immediately to India's National Cyber Crime portal. Every report helps protect millions of Indians.
          </div>
          <a href="https://cybercrime.gov.in" target="_blank" rel="noopener noreferrer" style={styles.ctaBtn}>
            <ExternalLink size={18} />
            Report at cybercrime.gov.in
          </a>
        </div>
        <div style={styles.ctaHelpline}>
          <div style={styles.helplineTitle}>Cyber Crime Helpline</div>
          <div style={styles.helplineNumber}>1930</div>
          <div style={styles.helplineNote}>Available 24×7</div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '40px 20px 20px',
  },
  header: {
    marginBottom: '28px',
  },
  title: {
    fontSize: '28px',
    fontWeight: '800',
    fontFamily: 'Space Grotesk, sans-serif',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '16px',
    color: 'var(--text-secondary)',
    lineHeight: 1.6,
  },
  alertBanner: {
    background: 'rgba(255, 71, 87, 0.08)',
    border: '1px solid rgba(255, 71, 87, 0.3)',
    borderRadius: '12px',
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '28px',
    fontSize: '14px',
    color: 'var(--text-secondary)',
  },
  alertIcon: {
    fontSize: '20px',
    flexShrink: 0,
  },
  cardGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
    marginBottom: '32px',
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid',
    borderRadius: '16px',
    padding: '24px',
    transition: 'transform 0.2s',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '16px',
  },
  cardHeaderLeft: {
    display: 'flex',
    gap: '16px',
    flex: 1,
  },
  scamIcon: {
    fontSize: '36px',
    flexShrink: 0,
  },
  scamName: {
    fontSize: '18px',
    fontWeight: '800',
    fontFamily: 'Space Grotesk, sans-serif',
    marginBottom: '4px',
  },
  scamDesc: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    lineHeight: '1.6',
  },
  expandBtn: {
    background: 'none',
    border: '1px solid',
    borderRadius: '8px',
    padding: '6px',
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'all 0.2s',
  },
  exampleBox: {
    background: 'var(--bg-secondary)',
    borderLeft: '3px solid',
    borderRadius: '8px',
    padding: '14px 16px',
    marginBottom: '16px',
  },
  exampleLabel: {
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
  },
  exampleText: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    fontStyle: 'italic',
    lineHeight: '1.6',
  },
  expandedContent: {
    marginBottom: '16px',
  },
  twoCol: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: '20px',
  },
  sectionHead: {
    fontSize: '13px',
    fontWeight: '700',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '12px',
  },
  list: {
    listStyle: 'none',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  listItem: {
    fontSize: '13px',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'flex-start',
    lineHeight: '1.5',
  },
  cardFooter: {
    display: 'flex',
    gap: '10px',
    paddingTop: '16px',
    borderTop: '1px solid rgba(255,255,255,0.05)',
  },
  shareBtn: {
    background: 'rgba(0, 245, 255, 0.08)',
    border: '1px solid rgba(0, 245, 255, 0.25)',
    color: 'var(--accent-cyan)',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    gap: '7px',
    cursor: 'pointer',
  },
  toggleBtn: {
    background: 'none',
    border: '1px solid var(--border)',
    color: 'var(--text-secondary)',
    borderRadius: '8px',
    padding: '8px 16px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  cta: {
    background: 'linear-gradient(135deg, rgba(255,71,87,0.1) 0%, rgba(0,245,255,0.05) 100%)',
    border: '1px solid rgba(255, 71, 87, 0.3)',
    borderRadius: '20px',
    padding: '32px',
    display: 'flex',
    gap: '32px',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  ctaContent: {
    flex: 1,
    minWidth: '240px',
  },
  ctaTitle: {
    fontSize: '22px',
    fontWeight: '800',
    fontFamily: 'Space Grotesk, sans-serif',
    marginBottom: '10px',
  },
  ctaText: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
    marginBottom: '20px',
    lineHeight: '1.6',
  },
  ctaBtn: {
    background: 'var(--accent-red)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '14px 28px',
    fontSize: '15px',
    fontWeight: '700',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
    textDecoration: 'none',
    boxShadow: '0 4px 20px rgba(255, 71, 87, 0.3)',
  },
  ctaHelpline: {
    textAlign: 'center',
    background: 'rgba(0,0,0,0.3)',
    borderRadius: '16px',
    padding: '24px 32px',
    border: '1px solid rgba(255,71,87,0.2)',
  },
  helplineTitle: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  helplineNumber: {
    fontSize: '52px',
    fontWeight: '900',
    color: 'var(--accent-red)',
    fontFamily: 'Space Grotesk, sans-serif',
    lineHeight: 1,
    marginBottom: '6px',
  },
  helplineNote: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
};
