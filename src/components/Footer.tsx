import React from 'react';
import { Settings } from 'lucide-react';

interface FooterProps {
  setView: (v: string) => void;
}

const colHead: React.CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.35)',
  marginBottom: 14,
};

const linkBtn: React.CSSProperties = {
  display: 'block',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  padding: '3px 0',
  fontSize: 14,
  fontFamily: "'DM Sans', sans-serif",
  color: 'rgba(255,255,255,0.60)',
  textAlign: 'left',
  transition: 'color 0.2s',
  lineHeight: 1.7,
};

export default function Footer({ setView }: FooterProps) {
  return (
    <footer
      style={{
        background: '#1E1B2E',
        color: '#ffffff',
        paddingTop: 60,
        paddingBottom: 0,
        marginTop: 'auto',
      }}
    >
      <div
        className="footer-grid"
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '0 clamp(16px,4vw,32px)',
          display: 'grid',
          gridTemplateColumns: '1.8fr 1fr 1fr 1fr',
          gap: 40,
          alignItems: 'start',
        }}
      >
        {/* Brand column */}
        <div>
          {/* Logo */}
          <button
            onClick={() => setView('home')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              marginBottom: 16,
            }}
          >
            <img src="/logo.png" alt="DrukNest" style={{ width: 48, height: 48, objectFit: 'contain', flexShrink: 0 }} />
            <span
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 22,
                color: '#ffffff',
                letterSpacing: '-0.01em',
                lineHeight: 1,
              }}
            >
              DrukNest
            </span>
          </button>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.7,
              color: 'rgba(255,255,255,0.50)',
              maxWidth: 280,
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            Bhutan's trusted rental platform connecting verified tenants with quality homes
            across the kingdom.
          </p>
        </div>

        {/* Platform links */}
        <div>
          <p style={colHead}>Platform</p>
          <button style={linkBtn} onClick={() => setView('listings')}>Search Homes</button>
          <button style={linkBtn} onClick={() => setView('owner')}>List Property</button>
          <button style={linkBtn} onClick={() => setView('how')}>How It Works</button>
          <button style={linkBtn} onClick={() => setView('signin')}>Verify ID</button>
        </div>

        {/* Cities */}
        <div>
          <p style={colHead}>Cities</p>
          {['Thimphu', 'Paro', 'Phuentsholing', 'GMC'].map((city) => (
            <button
              key={city}
              style={linkBtn}
              onClick={() => setView('listings')}
            >
              {city}
            </button>
          ))}
        </div>

        {/* Company */}
        <div>
          <p style={colHead}>Company</p>
          <button style={linkBtn} onClick={() => setView('about')}>About Us</button>
          <button style={linkBtn} onClick={() => setView('contact')}>Contact</button>
          <button style={linkBtn} onClick={() => setView('privacy')}>Privacy</button>
          <button style={linkBtn} onClick={() => setView('terms')}>Terms of Service</button>
        </div>
      </div>

      {/* Bottom bar */}
      <div
        style={{
          marginTop: 48,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          padding: '18px 32px',
          maxWidth: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.35)',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          &copy; {new Date().getFullYear()} DrukNest. All rights reserved.
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <button
            onClick={() => setView('admin')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: 13,
              color: 'rgba(255,255,255,0.35)',
              fontFamily: "'DM Sans', sans-serif",
              padding: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transition: 'color 0.2s',
            }}
          >
            <Settings size={13} strokeWidth={1.8} />
            <span>Admin Console</span>
          </button>
        </div>
      </div>
    </footer>
  );
}
