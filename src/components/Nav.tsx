import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './Icons';
import { useAuth } from '../contexts/AuthContext';

interface NavProps {
  view: string;
  setView: (v: string) => void;
}

export default function Nav({ view, setView }: NavProps) {
  const { profile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* Close dropdown on outside click */
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  const transparent = view === 'home' && !scrolled;

  const navStyle: React.CSSProperties = {
    position: 'fixed',
    top: 0, left: 0, right: 0,
    height: 66,
    zIndex: 500,
    display: 'flex',
    alignItems: 'center',
    padding: '0 32px',
    transition: 'background 0.3s ease, box-shadow 0.3s ease',
    background: transparent ? 'transparent' : 'rgba(249,247,255,0.92)',
    backdropFilter: transparent ? 'none' : 'blur(16px)',
    WebkitBackdropFilter: transparent ? 'none' : 'blur(16px)',
    boxShadow: transparent ? 'none' : 'var(--shadow-sm)',
  };

  const linkColor = transparent ? 'rgba(255,255,255,0.88)' : 'var(--slate)';
  const linkStyle: React.CSSProperties = {
    fontSize: 14, fontWeight: 500, color: linkColor,
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '6px 14px', borderRadius: 8,
    fontFamily: "'DM Sans', sans-serif",
    transition: 'color 0.2s, background 0.2s',
    whiteSpace: 'nowrap',
  };

  const initial = profile?.avatar_letter || profile?.full_name?.charAt(0)?.toUpperCase() || 'U';

  function goTo(v: string) {
    setMenuOpen(false);
    setView(v);
  }

  function handleSignOut() {
    setMenuOpen(false);
    signOut();
    setView('home');
  }

  return (
    <nav style={navStyle}>
      {/* Logo */}
      <button
        onClick={() => setView('home')}
        style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
      >
        <div style={{
          width: 36, height: 36, borderRadius: 12,
          background: 'linear-gradient(135deg, #8B6FE8 0%, #7254CC 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, boxShadow: '0 2px 8px rgba(139,111,232,0.35)',
        }}>
          <Icon type="logo" size={20} />
        </div>
        <span style={{
          fontFamily: "'DM Serif Display', serif", fontSize: 22,
          color: transparent ? '#ffffff' : 'var(--ink)',
          letterSpacing: '-0.01em', lineHeight: 1,
        }}>
          DrukNest
        </span>
      </button>

      {/* Center links */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        <button style={linkStyle} onClick={() => setView('listings')}>Search Homes</button>
        <button style={linkStyle} onClick={() => setView('how')}>How it Works</button>
        <button style={linkStyle} onClick={() => setView('signin')}>Verify ID</button>
      </div>

      {/* Right actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>

        {profile ? (
          <>
            {/* Role-specific primary action button */}
            {profile.role === 'owner' && (
              <button
                onClick={() => setView('add-property')}
                style={{
                  fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                  color: transparent ? 'rgba(255,255,255,0.9)' : 'var(--lav-600)',
                  background: 'transparent',
                  border: transparent ? '1.5px solid rgba(255,255,255,0.45)' : '1.5px solid var(--lav-300)',
                  borderRadius: 10, padding: '8px 16px', cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                + Add Property
              </button>
            )}
            {profile.role === 'tenant' && (
              <button
                onClick={() => setView('listings')}
                style={{
                  fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                  color: transparent ? 'rgba(255,255,255,0.9)' : 'var(--lav-600)',
                  background: 'transparent',
                  border: transparent ? '1.5px solid rgba(255,255,255,0.45)' : '1.5px solid var(--lav-300)',
                  borderRadius: 10, padding: '8px 16px', cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                Browse Listings
              </button>
            )}

            {/* Profile avatar + dropdown */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setMenuOpen(o => !o)}
                style={{
                  width: 38, height: 38, borderRadius: '50%',
                  background: 'linear-gradient(135deg, #8B6FE8, #7254CC)',
                  border: menuOpen ? '2.5px solid var(--lav-300)' : '2.5px solid transparent',
                  color: 'white', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(139,111,232,0.35)',
                  fontFamily: "'DM Sans', sans-serif",
                  transition: 'border-color 0.15s',
                  flexShrink: 0,
                }}
                title={profile.full_name}
              >
                {initial}
              </button>

              {menuOpen && (
                <div style={{
                  position: 'absolute', top: 46, right: 0,
                  background: 'white', borderRadius: 14,
                  boxShadow: '0 8px 32px rgba(30,27,46,0.18)',
                  border: '1px solid var(--lav-100)',
                  minWidth: 210, zIndex: 600,
                  overflow: 'hidden',
                }}>
                  {/* Header */}
                  <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--lav-100)', background: 'var(--lav-50)' }}>
                    <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>{profile.full_name}</p>
                    <p style={{ fontSize: 12, color: 'var(--slate3)', textTransform: 'capitalize' }}>{profile.role}</p>
                  </div>

                  {/* Tenant links */}
                  {profile.role === 'tenant' && (
                    <>
                      <MenuItem onClick={() => goTo('dashboard')}>My Dashboard</MenuItem>
                    </>
                  )}

                  {/* Owner links */}
                  {profile.role === 'owner' && (
                    <>
                      <MenuItem onClick={() => goTo('owner')}>My Dashboard</MenuItem>
                      <MenuItem onClick={() => goTo('add-property')}>Add Property</MenuItem>
                      <MenuItem onClick={() => goTo('account')}>Account Settings</MenuItem>
                    </>
                  )}

                  {/* Admin links */}
                  {profile.role === 'admin' && (
                    <>
                      <MenuItem onClick={() => goTo('admin')}>Admin Console</MenuItem>
                    </>
                  )}

                  {/* Sign out */}
                  <div style={{ borderTop: '1px solid var(--lav-100)' }}>
                    <button
                      onClick={handleSignOut}
                      style={{
                        width: '100%', padding: '12px 18px', background: 'none', border: 'none',
                        textAlign: 'left', fontSize: 14, color: '#DC2626', fontWeight: 500,
                        cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            <button
              onClick={() => setView('signin')}
              style={{
                fontSize: 14, fontWeight: 500, fontFamily: "'DM Sans', sans-serif",
                color: transparent ? '#ffffff' : 'var(--lav-600)',
                background: 'transparent',
                border: transparent ? '1.5px solid rgba(255,255,255,0.55)' : '1.5px solid var(--lav-400)',
                borderRadius: 10, padding: '8px 18px', cursor: 'pointer',
                transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}
            >
              Sign In / Sign Up
            </button>
            <button
              onClick={() => setView('signin')}
              style={{
                fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                color: '#ffffff',
                background: 'linear-gradient(135deg, #8B6FE8 0%, #7254CC 100%)',
                border: 'none', borderRadius: 10, padding: '8px 18px', cursor: 'pointer',
                boxShadow: '0 2px 10px rgba(139,111,232,0.30)',
                transition: 'all 0.2s', whiteSpace: 'nowrap',
              }}
            >
              List Your Property
            </button>
          </>
        )}
      </div>
    </nav>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', padding: '11px 18px', background: 'none', border: 'none',
        textAlign: 'left', fontSize: 14, color: 'var(--ink)', fontWeight: 500,
        cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'block',
      }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--lav-50)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {children}
    </button>
  );
}
