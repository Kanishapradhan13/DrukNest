import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import type { Notification } from '../lib/types';

function useWindowWidth() {
  const [w, setW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h, { passive: true });
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}

interface NavProps {
  view: string;
  setView: (v: string) => void;
  onAdminTab?: (tab: string) => void;
}

export default function Nav({ view, setView, onAdminTab }: NavProps) {
  const { profile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const width = useWindowWidth();
  const isMobile = width <= 768;

  useEffect(() => { if (!isMobile) setNavOpen(false); }, [isMobile]);

  useEffect(() => {
    if (navOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [navOpen]);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => { if (data) setNotifications(data as Notification[]); });

    const ch = supabase
      .channel(`notif-${profile.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${profile.id}` },
        (p) => setNotifications(prev => [p.new as Notification, ...prev])
      )
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!notifOpen) return;
    function handleClick(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [notifOpen]);

  async function markAllRead() {
    if (!profile) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', profile.id).eq('read', false);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
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
    padding: isMobile ? '0 16px' : '0 32px',
    transition: 'background 0.3s ease, box-shadow 0.3s ease',
    background: transparent ? 'transparent' : 'rgba(249,247,255,0.92)',
    backdropFilter: transparent ? 'none' : 'blur(16px)',
    WebkitBackdropFilter: transparent ? 'none' : 'blur(16px)',
    boxShadow: transparent ? 'none' : 'var(--shadow-sm)',
  };

  const linkStyle: React.CSSProperties = {
    fontSize: 14, fontWeight: 500,
    color: transparent ? 'rgba(255,255,255,0.88)' : 'var(--slate)',
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '6px 14px', borderRadius: 8,
    fontFamily: "'DM Sans', sans-serif",
    transition: 'color 0.2s, background 0.2s',
    whiteSpace: 'nowrap',
  };

  const initial = profile?.avatar_letter || profile?.full_name?.charAt(0)?.toUpperCase() || 'U';

  function goTo(v: string) { setMenuOpen(false); setView(v); }
  function goMobile(v: string) { setNavOpen(false); setView(v); }
  function handleSignOut() { setMenuOpen(false); setNavOpen(false); signOut(); setView('home'); }

  const hamburgerColor = transparent ? '#ffffff' : '#1E1B2E';
  function HamburgerIcon() {
    return navOpen ? (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M5 5L17 17M17 5L5 17" stroke={hamburgerColor} strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    ) : (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <path d="M3 6h16M3 11h16M3 16h16" stroke={hamburgerColor} strokeWidth="2.2" strokeLinecap="round"/>
      </svg>
    );
  }

  /* ── Admin nav ── */
  if (profile?.role === 'admin') {
    const adminTabs = [
      { label: 'Listing Queue', tab: 'queue' },
      { label: 'Users & CID',  tab: 'users'  },
      { label: 'Reports',      tab: 'reports' },
      { label: 'Analytics',    tab: 'analytics' },
    ];
    const adminLinkSt: React.CSSProperties = {
      fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)',
      background: 'none', border: 'none', cursor: 'pointer',
      padding: '6px 14px', borderRadius: 8,
      fontFamily: "'DM Sans', sans-serif",
      transition: 'color 0.15s, background 0.15s',
      whiteSpace: 'nowrap',
    };
    return (
      <>
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 56, zIndex: 500,
          background: '#1E1B2E', display: 'flex', alignItems: 'center',
          padding: isMobile ? '0 16px' : '0 28px', gap: 0,
          boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
        }}>
          <button
            onClick={() => setView('admin')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
          >
            <img src="/logo.png" alt="DrukNest logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            {!isMobile && <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: '#ffffff', letterSpacing: '-0.01em', lineHeight: 1 }}>DrukNest</span>}
          </button>
          <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', background: 'rgba(139,111,232,0.35)', color: '#C4B5FD', padding: '3px 9px', borderRadius: 6, textTransform: 'uppercase', flexShrink: 0 }}>
            Admin
          </span>

          {!isMobile && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              {adminTabs.map(({ label, tab }) => (
                <button key={label} style={adminLinkSt}
                  onClick={() => { setView('admin'); onAdminTab?.(tab); }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.background = 'none'; }}
                >{label}</button>
              ))}
            </div>
          )}

          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 'auto' }}>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', margin: 0, lineHeight: 1.2 }}>{profile.full_name}</p>
                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Administrator</p>
              </div>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #8B6FE8, #7254CC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                {initial}
              </div>
              <button onClick={handleSignOut}
                style={{ fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.65)', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '7px 14px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                onMouseEnter={e => { e.currentTarget.style.background = '#DC2626'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#DC2626'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = 'rgba(255,255,255,0.65)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
              >Sign Out</button>
            </div>
          )}

          {isMobile && (
            <button onClick={() => setNavOpen(o => !o)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center', color: '#fff' }}>
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                {navOpen
                  ? <path d="M5 5L17 17M17 5L5 17" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
                  : <path d="M3 6h16M3 11h16M3 16h16" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>}
              </svg>
            </button>
          )}
        </nav>

        {isMobile && navOpen && (
          <div style={{ position: 'fixed', top: 56, left: 0, right: 0, bottom: 0, background: '#1E1B2E', zIndex: 499, overflowY: 'auto', padding: '20px 16px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #8B6FE8, #7254CC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white' }}>{initial}</div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>{profile.full_name}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Administrator</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {adminTabs.map(({ label, tab }) => (
                <button key={tab}
                  onClick={() => { setNavOpen(false); setView('admin'); onAdminTab?.(tab); }}
                  style={{ padding: '15px 18px', textAlign: 'left', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.9)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                >{label}</button>
              ))}
            </div>
            <button onClick={handleSignOut}
              style={{ marginTop: 24, width: '100%', padding: '15px', background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 14, fontSize: 15, fontWeight: 600, color: '#F87171', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              Sign Out
            </button>
          </div>
        )}
      </>
    );
  }

  /* ── Owner nav ── */
  if (profile?.role === 'owner') {
    const ownerLinkSt: React.CSSProperties = {
      fontSize: 13, fontWeight: 500, color: 'rgba(255,255,255,0.75)',
      background: 'none', border: 'none', cursor: 'pointer',
      padding: '6px 14px', borderRadius: 8,
      fontFamily: "'DM Sans', sans-serif",
      transition: 'color 0.15s, background 0.15s',
      whiteSpace: 'nowrap',
    };
    const activeLinkSt: React.CSSProperties = { ...ownerLinkSt, color: '#fff', background: 'rgba(255,255,255,0.1)' };
    const ownerNavItems = [
      { label: 'My Listings',  view: 'owner'        },
      { label: 'Add Property', view: 'add-property' },
      { label: 'Account',      view: 'account'      },
      { label: 'How it Works', view: 'how'          },
    ];
    return (
      <>
        <nav style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 60, zIndex: 500,
          background: '#1E1B2E', display: 'flex', alignItems: 'center',
          padding: isMobile ? '0 16px' : '0 28px', gap: 0,
          boxShadow: '0 2px 12px rgba(0,0,0,0.35)',
        }}>
          <button onClick={() => setView('owner')}
            style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}>
            <img src="/logo.png" alt="DrukNest" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            {!isMobile && <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: '#ffffff', letterSpacing: '-0.01em' }}>DrukNest</span>}
          </button>
          <span style={{ marginLeft: 10, fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', background: 'rgba(139,111,232,0.35)', color: '#C4B5FD', padding: '3px 9px', borderRadius: 6, textTransform: 'uppercase', flexShrink: 0 }}>
            Owner
          </span>

          {!isMobile && (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
              {ownerNavItems.map(item => (
                <button key={item.view} style={view === item.view ? activeLinkSt : ownerLinkSt}
                  onClick={() => setView(item.view)}
                  onMouseEnter={e => { if (view !== item.view) { e.currentTarget.style.color = '#fff'; e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}}
                  onMouseLeave={e => { if (view !== item.view) { e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; e.currentTarget.style.background = 'none'; }}}
                >{item.label}</button>
              ))}
            </div>
          )}

          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, marginLeft: 'auto' }}>
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button onClick={() => { setNotifOpen(o => !o); if (!notifOpen && unreadCount > 0) markAllRead(); }}
                  style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}>
                  🔔
                  {unreadCount > 0 && (
                    <span style={{ position: 'absolute', top: -3, right: -3, width: 18, height: 18, background: '#DC2626', borderRadius: '50%', border: '2px solid #1E1B2E', fontSize: 10, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && <NotifDropdown notifications={notifications} unreadCount={unreadCount} onMarkAllRead={markAllRead} onClose={() => setNotifOpen(false)} setView={setView} dark />}
              </div>
              <div ref={menuRef} style={{ position: 'relative' }}>
                <button onClick={() => setMenuOpen(o => !o)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 10, padding: '6px 12px', cursor: 'pointer' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #8B6FE8, #7254CC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', overflow: 'hidden', flexShrink: 0 }}>
                    {profile.avatar_url ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'white', fontFamily: "'DM Sans', sans-serif" }}>{profile.full_name?.split(' ')[0]}</span>
                </button>
                {menuOpen && (
                  <div style={{ position: 'absolute', top: 46, right: 0, background: 'white', borderRadius: 14, boxShadow: '0 8px 32px rgba(30,27,46,0.18)', border: '1px solid var(--lav-100)', minWidth: 200, zIndex: 600, overflow: 'hidden' }}>
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--lav-100)', background: 'var(--lav-50)' }}>
                      <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>{profile.full_name}</p>
                      <p style={{ fontSize: 12, color: 'var(--slate3)' }}>Property Owner</p>
                    </div>
                    <MenuItem onClick={() => goTo('owner')}>My Dashboard</MenuItem>
                    <MenuItem onClick={() => goTo('add-property')}>Add Property</MenuItem>
                    <MenuItem onClick={() => goTo('account')}>Account Settings</MenuItem>
                    <div style={{ borderTop: '1px solid var(--lav-100)' }}>
                      <button onClick={handleSignOut}
                        style={{ width: '100%', padding: '12px 18px', background: 'none', border: 'none', textAlign: 'left', fontSize: 14, color: '#DC2626', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >Sign Out</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {isMobile && (
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button onClick={() => { setNotifOpen(o => !o); if (!notifOpen && unreadCount > 0) markAllRead(); }}
                  style={{ width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: 'white', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                  🔔
                  {unreadCount > 0 && (
                    <span style={{ position: 'absolute', top: -3, right: -3, width: 16, height: 16, background: '#DC2626', borderRadius: '50%', border: '2px solid #1E1B2E', fontSize: 9, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && <NotifDropdown notifications={notifications} unreadCount={unreadCount} onMarkAllRead={markAllRead} onClose={() => setNotifOpen(false)} setView={setView} dark />}
              </div>
              <button onClick={() => setNavOpen(o => !o)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}>
                <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                  {navOpen
                    ? <path d="M5 5L17 17M17 5L5 17" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>
                    : <path d="M3 6h16M3 11h16M3 16h16" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"/>}
                </svg>
              </button>
            </div>
          )}
        </nav>

        {isMobile && navOpen && (
          <div style={{ position: 'fixed', top: 60, left: 0, right: 0, bottom: 0, background: '#1E1B2E', zIndex: 499, overflowY: 'auto', padding: '20px 16px 32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 20, borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #8B6FE8, #7254CC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white', overflow: 'hidden' }}>
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
              </div>
              <div>
                <p style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>{profile.full_name}</p>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', margin: 0 }}>Property Owner</p>
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ownerNavItems.map(item => (
                <button key={item.view} onClick={() => goMobile(item.view)}
                  style={{ padding: '15px 18px', textAlign: 'left', background: view === item.view ? 'rgba(139,111,232,0.25)' : 'rgba(255,255,255,0.06)', border: `1px solid ${view === item.view ? 'rgba(139,111,232,0.4)' : 'rgba(255,255,255,0.1)'}`, borderRadius: 14, fontSize: 15, fontWeight: view === item.view ? 600 : 500, color: view === item.view ? '#C4B5FD' : 'rgba(255,255,255,0.9)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                >{item.label}</button>
              ))}
            </div>
            <button onClick={handleSignOut}
              style={{ marginTop: 24, width: '100%', padding: '15px', background: 'rgba(220,38,38,0.15)', border: '1px solid rgba(220,38,38,0.3)', borderRadius: 14, fontSize: 15, fontWeight: 600, color: '#F87171', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
              Sign Out
            </button>
          </div>
        )}
      </>
    );
  }

  /* ── Guest / Tenant nav ── */
  return (
    <>
      <nav style={navStyle}>
        <button
          onClick={() => setView('home')}
          style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', padding: 0, flexShrink: 0 }}
        >
          <img src="/logo.png" alt="DrukNest logo" style={{ width: 44, height: 44, flexShrink: 0, objectFit: 'contain' }} />
          <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: isMobile ? 19 : 22, color: transparent ? '#ffffff' : 'var(--ink)', letterSpacing: '-0.01em', lineHeight: 1 }}>
            DrukNest
          </span>
        </button>

        {!isMobile && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
            <button style={linkStyle} onClick={() => setView('listings')}>Search Homes</button>
            <button style={linkStyle} onClick={() => setView('roommates')}>Find Roommate</button>
            <button style={linkStyle} onClick={() => setView('how')}>How it Works</button>
            {profile?.role === 'tenant' && (
              <button style={linkStyle} onClick={() => setView('verify-id')}>Verify ID</button>
            )}
          </div>
        )}

        {!isMobile && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            {profile ? (
              <>
                <div ref={notifRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => { setNotifOpen(o => !o); if (!notifOpen && unreadCount > 0) markAllRead(); }}
                    title="Notifications"
                    style={{ width: 38, height: 38, borderRadius: '50%', background: transparent ? 'rgba(255,255,255,0.12)' : 'var(--lav-50)', border: `1.5px solid ${transparent ? 'rgba(255,255,255,0.25)' : 'var(--lav-200)'}`, color: transparent ? 'white' : 'var(--lav-600)', fontSize: 17, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', flexShrink: 0 }}
                  >
                    🔔
                    {unreadCount > 0 && (
                      <span style={{ position: 'absolute', top: -3, right: -3, width: 18, height: 18, background: '#DC2626', borderRadius: '50%', border: '2px solid white', fontSize: 10, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {notifOpen && <NotifDropdown notifications={notifications} unreadCount={unreadCount} onMarkAllRead={markAllRead} onClose={() => setNotifOpen(false)} setView={setView} />}
                </div>
                {profile.role === 'tenant' && (
                  <button
                    onClick={() => setView('listings')}
                    style={{ fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", color: transparent ? 'rgba(255,255,255,0.9)' : 'var(--lav-600)', background: 'transparent', border: transparent ? '1.5px solid rgba(255,255,255,0.45)' : '1.5px solid var(--lav-300)', borderRadius: 10, padding: '8px 16px', cursor: 'pointer', whiteSpace: 'nowrap' }}
                  >
                    Browse Listings
                  </button>
                )}
                <div ref={menuRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setMenuOpen(o => !o)}
                    style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg, #8B6FE8, #7254CC)', border: menuOpen ? '2.5px solid var(--lav-300)' : '2.5px solid transparent', color: 'white', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(139,111,232,0.35)', fontFamily: "'DM Sans', sans-serif", transition: 'border-color 0.15s', flexShrink: 0, overflow: 'hidden' }}
                    title={profile.full_name}
                  >
                    {profile.avatar_url ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
                  </button>
                  {menuOpen && (
                    <div style={{ position: 'absolute', top: 46, right: 0, background: 'white', borderRadius: 14, boxShadow: '0 8px 32px rgba(30,27,46,0.18)', border: '1px solid var(--lav-100)', minWidth: 210, zIndex: 600, overflow: 'hidden' }}>
                      <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--lav-100)', background: 'var(--lav-50)' }}>
                        <p style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>{profile.full_name}</p>
                        <p style={{ fontSize: 12, color: 'var(--slate3)', textTransform: 'capitalize' }}>{profile.role}</p>
                      </div>
                      <MenuItem onClick={() => goTo('dashboard')}>My Dashboard</MenuItem>
                      <div style={{ borderTop: '1px solid var(--lav-100)' }}>
                        <button onClick={handleSignOut}
                          style={{ width: '100%', padding: '12px 18px', background: 'none', border: 'none', textAlign: 'left', fontSize: 14, color: '#DC2626', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#FEF2F2')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >Sign Out</button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setView('signin')}
                  style={{ fontSize: 14, fontWeight: 500, fontFamily: "'DM Sans', sans-serif", color: transparent ? '#ffffff' : 'var(--lav-600)', background: 'transparent', border: transparent ? '1.5px solid rgba(255,255,255,0.55)' : '1.5px solid var(--lav-400)', borderRadius: 10, padding: '8px 18px', cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                >
                  Sign In / Sign Up
                </button>
                <button
                  onClick={() => setView('signin')}
                  style={{ fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif", color: '#ffffff', background: 'linear-gradient(135deg, #8B6FE8 0%, #7254CC 100%)', border: 'none', borderRadius: 10, padding: '8px 18px', cursor: 'pointer', boxShadow: '0 2px 10px rgba(139,111,232,0.30)', transition: 'all 0.2s', whiteSpace: 'nowrap' }}
                >
                  List Your Property
                </button>
              </>
            )}
          </div>
        )}

        {/* Mobile: bell (if logged in) + hamburger */}
        {isMobile && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
            {profile && (
              <div ref={notifRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => { setNotifOpen(o => !o); if (!notifOpen && unreadCount > 0) markAllRead(); }}
                  style={{ width: 36, height: 36, borderRadius: '50%', background: transparent ? 'rgba(255,255,255,0.12)' : 'var(--lav-100)', border: 'none', color: transparent ? 'white' : 'var(--lav-600)', fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
                >
                  🔔
                  {unreadCount > 0 && (
                    <span style={{ position: 'absolute', top: -2, right: -2, width: 16, height: 16, background: '#DC2626', borderRadius: '50%', border: '2px solid white', fontSize: 9, fontWeight: 700, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                {notifOpen && <NotifDropdown notifications={notifications} unreadCount={unreadCount} onMarkAllRead={markAllRead} onClose={() => setNotifOpen(false)} setView={setView} />}
              </div>
            )}
            <button
              onClick={() => setNavOpen(o => !o)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', display: 'flex', alignItems: 'center' }}
            >
              <HamburgerIcon />
            </button>
          </div>
        )}
      </nav>

      {/* Guest/Tenant mobile menu */}
      {isMobile && navOpen && (
        <div style={{ position: 'fixed', top: 66, left: 0, right: 0, bottom: 0, background: '#fff', zIndex: 499, overflowY: 'auto', borderTop: '1px solid var(--lav-100)' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              { label: '🔍  Search Homes',    view: 'listings'   },
              { label: '🤝  Find Roommate',   view: 'roommates'  },
              { label: '❓  How it Works',    view: 'how'        },
              ...(profile?.role === 'tenant' ? [{ label: '🪪  Verify ID', view: 'verify-id' }] : []),
            ].map(item => (
              <button key={item.view} onClick={() => goMobile(item.view)}
                style={{ padding: '16px 20px', textAlign: 'left', background: 'none', border: 'none', borderBottom: '1px solid var(--lav-50)', fontSize: 16, fontWeight: 500, color: 'var(--ink)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                {item.label}
              </button>
            ))}
          </div>

          <div style={{ height: 1, background: 'var(--lav-100)', margin: '8px 0' }} />

          {profile ? (
            <div style={{ padding: '12px 16px 32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 4px 16px', borderBottom: '1px solid var(--lav-100)', marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #8B6FE8, #7254CC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, fontWeight: 700, color: 'white', overflow: 'hidden', flexShrink: 0 }}>
                  {profile.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initial}
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', margin: 0 }}>{profile.full_name}</p>
                  <p style={{ fontSize: 12, color: 'var(--slate3)', textTransform: 'capitalize', margin: 0 }}>{profile.role}</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {profile.role === 'tenant' && (
                  <button onClick={() => goMobile('listings')}
                    style={{ padding: '14px 18px', textAlign: 'left', background: 'var(--lav-50)', border: '1px solid var(--lav-200)', borderRadius: 14, fontSize: 15, fontWeight: 500, color: 'var(--lav-700)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    Browse Listings
                  </button>
                )}
                <button onClick={() => goMobile('dashboard')}
                  style={{ padding: '14px 18px', textAlign: 'left', background: 'var(--lav-50)', border: '1px solid var(--lav-200)', borderRadius: 14, fontSize: 15, fontWeight: 500, color: 'var(--lav-700)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  My Dashboard
                </button>
              </div>
              <button onClick={handleSignOut}
                style={{ marginTop: 16, width: '100%', padding: '14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 14, fontSize: 15, fontWeight: 600, color: '#DC2626', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Sign Out
              </button>
            </div>
          ) : (
            <div style={{ padding: '12px 16px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={() => goMobile('signin')}
                style={{ padding: '15px', background: 'transparent', border: '1.5px solid var(--lav-400)', borderRadius: 14, fontSize: 15, fontWeight: 500, color: 'var(--lav-600)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                Sign In / Sign Up
              </button>
              <button onClick={() => goMobile('signin')}
                style={{ padding: '15px', background: 'linear-gradient(135deg, #8B6FE8 0%, #7254CC 100%)', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, color: 'white', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", boxShadow: '0 4px 16px rgba(139,111,232,0.35)' }}>
                List Your Property
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function NotifDropdown({ notifications, unreadCount, onMarkAllRead, onClose, setView, dark = false }: {
  notifications: Notification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onClose: () => void;
  setView: (v: string) => void;
  dark?: boolean;
}) {
  void dark;
  return (
    <div style={{ position: 'absolute', top: 46, right: 0, width: 300, background: 'white', borderRadius: 16, boxShadow: '0 8px 32px rgba(30,27,46,0.18)', border: '1px solid var(--lav-100)', zIndex: 600, overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--lav-100)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)' }}>Notifications</span>
        {unreadCount > 0 && (
          <button onClick={onMarkAllRead} style={{ fontSize: 12, color: 'var(--lav-500)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Mark all read</button>
        )}
      </div>
      <div style={{ maxHeight: 320, overflowY: 'auto' }}>
        {notifications.length === 0 ? (
          <p style={{ textAlign: 'center', fontSize: 13, color: 'var(--slate3)', padding: '24px 16px', margin: 0 }}>No notifications yet</p>
        ) : notifications.map(n => (
          <div key={n.id}
            onClick={() => { onClose(); if (n.link_view) setView(n.link_view); }}
            style={{ padding: '12px 18px', borderBottom: '1px solid var(--lav-50)', background: n.read ? 'white' : 'var(--lav-50)', cursor: n.link_view ? 'pointer' : 'default' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--lav-50)')}
            onMouseLeave={e => (e.currentTarget.style.background = n.read ? 'white' : 'var(--lav-50)')}
          >
            <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', margin: '0 0 2px' }}>{n.title}</p>
            <p style={{ fontSize: 12, color: 'var(--slate3)', margin: 0, lineHeight: 1.45 }}>{n.body}</p>
            <p style={{ fontSize: 10, color: 'var(--slate3)', margin: '4px 0 0', opacity: 0.7 }}>
              {new Date(n.created_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{ width: '100%', padding: '11px 18px', background: 'none', border: 'none', textAlign: 'left', fontSize: 14, color: 'var(--ink)', fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'block' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--lav-50)')}
      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
    >
      {children}
    </button>
  );
}
