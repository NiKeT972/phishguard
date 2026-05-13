import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Shield, AlertTriangle, Users, TrendingUp, MapPin, Clock } from 'lucide-react';

const API = 'http://localhost:8000';

const COLORS = ['#FF4757', '#FFD700', '#00F5FF', '#00FF88', '#FF6B35', '#A29BFE'];

const SCAM_ICONS = {
  'KYC Fraud': '🪪',
  'OTP Phishing': '🔐',
  'Bank Impersonation': '🏦',
  'Fake Prize': '🎰',
  'Job Scam': '💼',
  'Government Impersonation': '🏛️',
};

const TYPE_COLORS = {
  'KYC Fraud': 'var(--accent-red)',
  'OTP Phishing': 'var(--accent-yellow)',
  'Bank Impersonation': 'var(--accent-cyan)',
  'Fake Prize': 'var(--accent-green)',
  'Job Scam': 'var(--accent-orange)',
  'Government Impersonation': '#A29BFE',
};

// India SVG map with city markers
const CITY_COORDS = {
  Mumbai:    { x: 145, y: 310 },
  Delhi:     { x: 200, y: 175 },
  Bangalore: { x: 195, y: 390 },
  Hyderabad: { x: 210, y: 340 },
  Chennai:   { x: 220, y: 400 },
  Kolkata:   { x: 310, y: 240 },
};

function IndiaMap({ cityData }) {
  const maxScams = Math.max(...(cityData || []).map(c => c.scams), 1);
  return (
    <div style={styles.mapContainer}>
      <svg viewBox="0 0 450 500" style={{ width: '100%', maxWidth: '380px', margin: '0 auto', display: 'block' }}>
        {/* Simple India outline paths */}
        <path
          d="M180,60 L220,55 L260,70 L290,90 L310,120 L330,160 L340,200 L330,240 L320,260 L300,290 L310,320 L290,360 L270,400 L240,430 L220,450 L200,440 L180,420 L160,400 L140,370 L120,340 L110,310 L120,280 L140,260 L130,230 L120,200 L110,170 L120,140 L140,110 L160,80 Z"
          fill="rgba(0,245,255,0.06)"
          stroke="rgba(0,245,255,0.3)"
          strokeWidth="1.5"
        />
        {/* Kashmir region */}
        <path
          d="M180,60 L195,45 L215,38 L235,42 L255,55 L260,70 L220,55 Z"
          fill="rgba(0,245,255,0.04)"
          stroke="rgba(0,245,255,0.2)"
          strokeWidth="1"
        />
        {/* North East */}
        <path
          d="M310,120 L340,100 L370,120 L380,160 L350,180 L330,160 Z"
          fill="rgba(0,245,255,0.04)"
          stroke="rgba(0,245,255,0.2)"
          strokeWidth="1"
        />

        {/* City markers */}
        {(cityData || []).map(city => {
          const coords = CITY_COORDS[city.city];
          if (!coords) return null;
          const radius = 8 + (city.scams / maxScams) * 18;
          return (
            <g key={city.city}>
              <circle cx={coords.x} cy={coords.y} r={radius + 6} fill="rgba(255,71,87,0.15)" />
              <circle cx={coords.x} cy={coords.y} r={radius} fill="rgba(255,71,87,0.6)" stroke="#FF4757" strokeWidth="1.5" />
              <circle cx={coords.x} cy={coords.y} r={4} fill="#FF4757" />
              <text x={coords.x} y={coords.y - radius - 6} textAnchor="middle" fill="white" fontSize="10" fontWeight="600">
                {city.city}
              </text>
              <text x={coords.x} y={coords.y + radius + 14} textAnchor="middle" fill="#FF4757" fontSize="9">
                {city.scams}
              </text>
            </g>
          );
        })}

        {/* Grid lines */}
        {[1,2,3,4].map(i => (
          <line key={i} x1={60 + i*80} y1="40" x2={60 + i*80} y2="460" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        ))}
        {[1,2,3,4,5].map(i => (
          <line key={i} x1="60" y1={60 + i*80} x2="420" y2={60 + i*80} stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
        ))}
      </svg>
    </div>
  );
}

function useCountUp(target, duration = 800) {
  const [display, setDisplay] = useState(target);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (typeof target !== 'number' || target === prevTarget.current) {
      setDisplay(target);
      return;
    }
    const start = prevTarget.current || 0;
    const diff = target - start;
    const steps = 30;
    const stepMs = duration / steps;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const val = Math.round(start + (diff * step) / steps);
      setDisplay(val);
      if (step >= steps) {
        clearInterval(timer);
        setDisplay(target);
      }
    }, stepMs);
    prevTarget.current = target;
    return () => clearInterval(timer);
  }, [target, duration]);

  return display;
}

function StatCard({ icon: Icon, value, label, color, subtitle, animate }) {
  const numericValue = typeof value === 'number' ? value : null;
  const countedValue = useCountUp(animate && numericValue !== null ? numericValue : numericValue || 0);
  const displayValue = animate && numericValue !== null
    ? countedValue.toLocaleString('en-IN')
    : (value || '—');

  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statIcon, background: `${color}15`, color }}>
        <Icon size={22} />
      </div>
      <div style={{ ...styles.statValue, transition: 'all 0.3s ease' }}>{displayValue}</div>
      <div style={styles.statLabel}>{label}</div>
      {subtitle && <div style={styles.statSub}>{subtitle}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [secondsAgo, setSecondsAgo] = useState(0);

  const fetchStats = () => {
    axios.get(`${API}/api/stats`)
      .then(r => {
        setStats(r.data);
        setLastUpdated(Date.now());
        setSecondsAgo(0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchStats();
    const pollInterval = setInterval(fetchStats, 30000);
    return () => clearInterval(pollInterval);
  }, []);

  // Update "X seconds ago" counter every second
  useEffect(() => {
    if (!lastUpdated) return;
    const ticker = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated) / 1000));
    }, 1000);
    return () => clearInterval(ticker);
  }, [lastUpdated]);

  const pieData = stats
    ? Object.entries(stats.scam_distribution || {}).map(([name, value]) => ({ name, value }))
    : [];

  const topThree = [...pieData].sort((a, b) => b.value - a.value).slice(0, 3);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.pageHeader}>
          <h1 style={styles.pageTitle}>Scam Dashboard</h1>
          <p style={styles.pageSubtitle}>Real-time threat intelligence for India</p>
        </div>
        <div style={styles.skeletonGrid}>
          {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '120px', borderRadius: '16px' }} />)}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.pageHeader}>
        <h1 style={styles.pageTitle}>📊 Scam Dashboard</h1>
        <p style={styles.pageSubtitle}>Real-time threat intelligence across India</p>
      </div>

      {/* Community Stats heading with Live dot */}
      <div style={styles.communityHeadingRow}>
        <h2 style={styles.communityHeading}>Community Stats</h2>
        <span className="live-dot-wrapper" title="Live data">
          <span className="live-dot" />
        </span>
        {lastUpdated && (
          <span style={styles.lastUpdated}>
            Last updated: {secondsAgo < 5 ? 'just now' : `${secondsAgo}s ago`}
          </span>
        )}
      </div>

      {/* Stat cards */}
      <div style={styles.statsGrid}>
        <StatCard
          icon={Shield}
          value={stats?.scams_detected_today || null}
          label="Scams Detected Today"
          color="var(--accent-red)"
          subtitle="↑ 12% from yesterday"
          animate
        />
        <StatCard
          icon={AlertTriangle}
          value={stats?.scams_this_week_mumbai || null}
          label="Mumbai This Week"
          color="var(--accent-yellow)"
          subtitle="Top city by scam count"
          animate
        />
        <StatCard
          icon={Users}
          value={stats?.total_users_protected || null}
          label="Indians Protected"
          color="var(--accent-green)"
          subtitle="Growing daily"
          animate
        />
        <StatCard
          icon={TrendingUp}
          value={stats?.top_scam_type || '—'}
          label="Top Scam Type"
          color="var(--accent-cyan)"
          subtitle="Most reported this week"
        />
      </div>

      {/* Charts row */}
      <div style={styles.chartsRow}>
        {/* Pie chart */}
        <div style={styles.chartCard}>
          <h3 style={styles.cardTitle}>Scam Type Distribution</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '10px', color: 'var(--text-primary)' }}
                formatter={(v) => [`${v}%`, '']}
              />
              <Legend
                iconType="circle"
                iconSize={10}
                formatter={(value) => <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* India map */}
        <div style={styles.chartCard}>
          <h3 style={styles.cardTitle}>
            <MapPin size={16} style={{ display: 'inline', marginRight: '8px', color: 'var(--accent-red)' }} />
            Scam Heatmap — India
          </h3>
          <IndiaMap cityData={stats?.city_data || []} />
          <div style={styles.mapLegend}>
            <span style={{ color: 'var(--accent-red)' }}>●</span>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Circle size = scam volume</span>
          </div>
        </div>
      </div>

      {/* Trending scams */}
      <div style={styles.sectionCard}>
        <h3 style={styles.cardTitle}>🔥 Trending This Week</h3>
        <div style={styles.trendingGrid}>
          {topThree.map((item, i) => (
            <div key={item.name} style={styles.trendingItem}>
              <div style={styles.trendingRank}>{['🥇','🥈','🥉'][i]}</div>
              <div>
                <div style={styles.trendingIcon}>{SCAM_ICONS[item.name] || '⚠️'}</div>
                <div style={styles.trendingName}>{item.name}</div>
                <div style={{ ...styles.trendingCount, color: COLORS[i] }}>{item.value}% of all scams</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent scam feed */}
      <div style={styles.sectionCard}>
        <h3 style={styles.cardTitle}>
          <Clock size={16} style={{ display: 'inline', marginRight: '8px', color: 'var(--accent-cyan)' }} />
          Recent Reported Scams
        </h3>
        <div style={styles.feedList}>
          {(stats?.recent_scams || []).map((scam, i) => (
            <div key={i} style={styles.feedItem} className="animate-fade-in">
              <div style={styles.feedLeft}>
                <span style={styles.feedIcon}>{SCAM_ICONS[scam.type] || '⚠️'}</span>
                <div>
                  <div style={styles.feedType}>{scam.type}</div>
                  <div style={styles.feedPreview}>"{scam.preview}"</div>
                </div>
              </div>
              <div style={styles.feedRight}>
                <span style={styles.feedLocation}>📍 {scam.location}</span>
                <span style={styles.feedTime}>{scam.time}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    maxWidth: '1100px',
    margin: '0 auto',
    padding: '40px 20px 20px',
  },
  pageHeader: {
    marginBottom: '24px',
  },
  pageTitle: {
    fontSize: 'clamp(20px, 4vw, 28px)',
    fontWeight: '800',
    fontFamily: 'Space Grotesk, sans-serif',
    marginBottom: '6px',
  },
  pageSubtitle: {
    fontSize: '15px',
    color: 'var(--text-secondary)',
  },
  communityHeadingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  communityHeading: {
    fontSize: 'clamp(16px, 3vw, 20px)',
    fontWeight: '700',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  lastUpdated: {
    fontSize: '12px',
    color: 'var(--text-muted)',
    marginLeft: 'auto',
  },
  skeletonGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  statCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  statIcon: {
    width: '44px',
    height: '44px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '4px',
  },
  statValue: {
    fontSize: 'clamp(20px, 4vw, 26px)',
    fontWeight: '800',
    fontFamily: 'Space Grotesk, sans-serif',
  },
  statLabel: {
    fontSize: '14px',
    color: 'var(--text-secondary)',
    fontWeight: '500',
  },
  statSub: {
    fontSize: '12px',
    color: 'var(--text-muted)',
  },
  chartsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '16px',
    marginBottom: '24px',
  },
  chartCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '24px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '700',
    marginBottom: '20px',
    color: 'var(--text-primary)',
    display: 'flex',
    alignItems: 'center',
  },
  mapContainer: {
    display: 'flex',
    justifyContent: 'center',
  },
  mapLegend: {
    textAlign: 'center',
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
  },
  sectionCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: '16px',
    padding: '24px',
    marginBottom: '24px',
  },
  trendingGrid: {
    display: 'flex',
    gap: '16px',
    flexWrap: 'wrap',
  },
  trendingItem: {
    flex: '1 1 160px',
    background: 'var(--bg-secondary)',
    borderRadius: '12px',
    padding: '20px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
  },
  trendingRank: {
    fontSize: '24px',
    flexShrink: 0,
  },
  trendingIcon: {
    fontSize: '24px',
    marginBottom: '8px',
  },
  trendingName: {
    fontSize: '14px',
    fontWeight: '700',
    marginBottom: '4px',
  },
  trendingCount: {
    fontSize: '13px',
    fontWeight: '600',
  },
  feedList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1px',
  },
  feedItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '14px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    gap: '12px',
    flexWrap: 'wrap',
  },
  feedLeft: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  },
  feedIcon: {
    fontSize: '22px',
    flexShrink: 0,
    marginTop: '2px',
  },
  feedType: {
    fontSize: '14px',
    fontWeight: '600',
    color: 'var(--accent-red)',
    marginBottom: '3px',
  },
  feedPreview: {
    fontSize: '13px',
    color: 'var(--text-secondary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    maxWidth: '400px',
    fontStyle: 'italic',
  },
  feedRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
    flexShrink: 0,
  },
  feedLocation: {
    fontSize: '12px',
    color: 'var(--text-secondary)',
  },
  feedTime: {
    fontSize: '11px',
    color: 'var(--text-muted)',
  },
};
