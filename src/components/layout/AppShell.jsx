/**
 * AppShell.jsx
 * Outer layout wrapper — header, main split-pane, footer.
 */
import { Shield, Github, Heart } from 'lucide-react';

export default function AppShell({ children }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--clr-bg-base)',
      overflow: 'hidden',
    }}>
      {children}
    </div>
  );
}

export function AppHeader({ leftSlot, rightSlot }) {
  return (
    <header style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 12px',
      height: 52,
      flexShrink: 0,
      background: 'var(--clr-bg-surface)',
      borderBottom: '1px solid var(--clr-border)',
      zIndex: 20,
      gap: 8,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32,
          borderRadius: 9,
          background: 'linear-gradient(135deg, var(--clr-brand-500), var(--clr-accent-500))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 0 16px rgba(14,165,233,0.35)',
          flexShrink: 0,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
            <circle cx="12" cy="13" r="3"/>
          </svg>
        </div>
        {/* Title — hide subtitle on mobile */}
        <div className="app-title-block">
          <div style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 800, fontSize: 16,
            background: 'linear-gradient(135deg, var(--clr-brand-400), var(--clr-accent-400))',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
          }}>
            LCamScanner
          </div>
          <div className="app-subtitle" style={{ fontSize: 9, color: 'var(--clr-text-muted)', fontWeight: 500, letterSpacing: '0.06em' }}>
            AI DOCUMENT SCANNER
          </div>
        </div>

        {/* Scan mode selector */}
        {leftSlot && <div style={{ marginLeft: 4 }}>{leftSlot}</div>}
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
        {/* Privacy badge — hidden on narrow mobile */}
        <div className="privacy-badge" style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 10px', borderRadius: 999,
          background: 'rgba(34,197,94,0.08)',
          border: '1px solid rgba(34,197,94,0.2)',
          color: 'var(--clr-success)',
          whiteSpace: 'nowrap',
        }}>
          <Shield size={11} />
          <span style={{ fontSize: 11, fontWeight: 500 }}>100% Private</span>
        </div>
        {rightSlot}
      </div>
    </header>
  );
}

export function AppFooter() {
  return (
    <footer style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '5px 16px',
      flexShrink: 0,
      background: 'var(--clr-bg-surface)',
      borderTop: '1px solid var(--clr-border)',
      gap: 5,
      flexWrap: 'wrap',
    }}>
      <span style={{ fontSize: 11, color: 'var(--clr-text-muted)' }}>Developed with</span>
      <Heart size={11} style={{ color: '#ef4444', fill: '#ef4444' }} />
      <span style={{ fontSize: 11, color: 'var(--clr-text-muted)' }}>by</span>
      <a
        href="https://lakshan.netlify.app/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          fontSize: 11, fontWeight: 600,
          fontFamily: 'var(--font-display)',
          background: 'linear-gradient(135deg, var(--clr-brand-400), var(--clr-accent-400))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          textDecoration: 'none',
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.75'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        V.P.R. Lakshan Vidanapathirana
      </a>
      <span style={{ color: 'var(--clr-border)', fontSize: 11, margin: '0 2px' }}>·</span>
      <a
        href="https://github.com/LakGillJMT/LCamScanner"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          fontSize: 11, color: 'var(--clr-text-muted)',
          textDecoration: 'none',
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--clr-brand-400)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--clr-text-muted)'}
      >
        <Github size={12} />
        GitHub
      </a>
    </footer>
  );
}
