import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Shield, BarChart2, BookOpen, Menu, X } from 'lucide-react';
import Toast from './Toast';

const navItems = [
  { path: '/', label: 'Scanner', icon: Shield },
  { path: '/dashboard', label: 'Dashboard', icon: BarChart2 },
  { path: '/learn', label: 'Learn', icon: BookOpen },
];

export default function Layout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Header */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <button onClick={() => navigate('/')} style={styles.logoBtn}>
            <span style={styles.shieldIcon}>🛡️</span>
            <span style={styles.logoText}>Phish<span style={{ color: 'var(--accent-cyan)' }}>Guard</span></span>
          </button>

          {/* Desktop nav */}
          <nav style={styles.desktopNav}>
            {navItems.map(({ path, label, icon: Icon }) => (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  ...styles.navBtn,
                  ...(location.pathname === path ? styles.navBtnActive : {}),
                }}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div style={styles.teamTag}>DATA MAVERICKS</div>

          {/* Mobile hamburger */}
          <button style={styles.hamburger} onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div style={styles.mobileMenu}>
            {navItems.map(({ path, label, icon: Icon }) => (
              <button
                key={path}
                onClick={() => { navigate(path); setMenuOpen(false); }}
                style={{
                  ...styles.mobileNavBtn,
                  ...(location.pathname === path ? styles.mobileNavBtnActive : {}),
                }}
              >
                <Icon size={18} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Main content */}
      <main style={{ flex: 1, paddingBottom: '80px' }}>
        {children}
      </main>

      {/* Bottom nav bar (mobile) */}
      <nav style={styles.bottomNav}>
        {navItems.map(({ path, label, icon: Icon }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            style={{
              ...styles.bottomNavBtn,
              ...(location.pathname === path ? styles.bottomNavBtnActive : {}),
            }}
          >
            <Icon size={20} />
            <span style={{ fontSize: '10px', marginTop: '3px' }}>{label}</span>
          </button>
        ))}
      </nav>

      <Toast />
    </div>
  );
}

const styles = {
  header: {
    background: 'rgba(11, 15, 44, 0.95)',
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid var(--border)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerInner: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 20px',
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  logoBtn: {
    background: 'none',
    border: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    cursor: 'pointer',
  },
  shieldIcon: {
    fontSize: '28px',
    animation: 'shield-pulse 2.5s ease-in-out infinite',
    display: 'inline-block',
  },
  logoText: {
    fontSize: '22px',
    fontWeight: '800',
    color: 'var(--text-primary)',
    fontFamily: 'Space Grotesk, sans-serif',
    letterSpacing: '-0.5px',
  },
  desktopNav: {
    display: 'flex',
    gap: '8px',
    marginLeft: '24px',
    flex: 1,
    '@media (max-width: 768px)': { display: 'none' },
  },
  navBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: '8px 16px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  navBtnActive: {
    background: 'rgba(0, 245, 255, 0.1)',
    color: 'var(--accent-cyan)',
    border: '1px solid rgba(0, 245, 255, 0.2)',
  },
  teamTag: {
    marginLeft: 'auto',
    fontSize: '11px',
    fontWeight: '700',
    color: 'var(--accent-cyan)',
    letterSpacing: '1.5px',
    opacity: 0.8,
    display: 'flex',
    alignItems: 'center',
  },
  hamburger: {
    display: 'none',
    background: 'none',
    border: 'none',
    color: 'var(--text-primary)',
    padding: '8px',
    borderRadius: '8px',
    '@media (max-width: 768px)': { display: 'flex' },
  },
  mobileMenu: {
    background: 'var(--bg-card)',
    borderTop: '1px solid var(--border)',
    padding: '12px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  mobileNavBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    padding: '12px 16px',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '15px',
    fontWeight: '500',
    cursor: 'pointer',
    textAlign: 'left',
  },
  mobileNavBtnActive: {
    background: 'rgba(0, 245, 255, 0.1)',
    color: 'var(--accent-cyan)',
  },
  bottomNav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: 'rgba(11, 15, 44, 0.97)',
    backdropFilter: 'blur(12px)',
    borderTop: '1px solid var(--border)',
    display: 'flex',
    justifyContent: 'space-around',
    padding: '8px 0',
    zIndex: 100,
  },
  bottomNavBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '6px 20px',
    borderRadius: '10px',
    transition: 'all 0.2s',
    cursor: 'pointer',
  },
  bottomNavBtnActive: {
    color: 'var(--accent-cyan)',
  },
};
