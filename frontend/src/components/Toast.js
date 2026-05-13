import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

const ToastContext = createContext(null);

export function useToast() {
  return useContext(ToastContext);
}

let addToastGlobal = null;

export function showToast(message, type = 'info') {
  if (addToastGlobal) addToastGlobal(message, type);
}

export default function Toast() {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3500);
  }, []);

  useEffect(() => {
    addToastGlobal = addToast;
    return () => { addToastGlobal = null; };
  }, [addToast]);

  if (!toasts.length) return null;

  return (
    <div style={styles.container}>
      {toasts.map(toast => (
        <div
          key={toast.id}
          style={{
            ...styles.toast,
            borderColor: toast.type === 'success' ? 'var(--accent-green)' : toast.type === 'error' ? 'var(--accent-red)' : 'var(--accent-cyan)',
          }}
          className="animate-fade-in-up"
        >
          <span style={{ marginRight: '8px' }}>
            {toast.type === 'success' ? '✅' : toast.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          {toast.message}
        </div>
      ))}
    </div>
  );
}

const styles = {
  container: {
    position: 'fixed',
    bottom: '90px',
    right: '20px',
    zIndex: 9999,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  toast: {
    background: 'var(--bg-card)',
    border: '1px solid var(--accent-cyan)',
    color: 'var(--text-primary)',
    padding: '12px 18px',
    borderRadius: '10px',
    fontSize: '14px',
    boxShadow: 'var(--shadow-cyan)',
    maxWidth: '320px',
    display: 'flex',
    alignItems: 'center',
  },
};
