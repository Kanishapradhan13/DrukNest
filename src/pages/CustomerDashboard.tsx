import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Listing, Inquiry, RoommateConnection } from '../lib/types';
import Card from '../components/Card';
import { CITIES } from '../lib/data';
import ChatModal from '../components/ChatModal';

interface CustomerDashboardProps {
  setView: (v: string) => void;
  onListingClick?: (id: string) => void;
}

type Tab = 'saved' | 'enquiries' | 'roommate' | 'profile';

export default function CustomerDashboard({ setView, onListingClick }: CustomerDashboardProps) {
  const { user, profile, signOut, refreshProfile } = useAuth();

  const [tab, setTab] = useState<Tab>('saved');
  const [savedListings, setSavedListings] = useState<Listing[]>([]);
  const [inquiries, setInquiries] = useState<(Inquiry & { listing?: Listing })[]>([]);
  const [roommateConnections, setRoommateConnections] = useState<RoommateConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatInquiry, setChatInquiry] = useState<(Inquiry & { listing?: Listing }) | null>(null);
  const [chatConnection, setChatConnection] = useState<RoommateConnection | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone]       = useState('');
  const [city, setCity]         = useState('');
  const [bio, setBio]           = useState('');
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState('');

  useEffect(() => {
    if (!user) { setView('signin'); return; }
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
    setCity(profile?.city ?? '');
    setBio(profile?.bio ?? '');
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile?.id]);

  async function load() {
    if (!user) return;
    setLoading(true);
    const [savedIdsRes, inqRes, roommateRes] = await Promise.all([
      supabase
        .from('saved_listings')
        .select('listing_id')
        .eq('user_id', user.id),
      supabase
        .from('inquiries')
        .select('*, listing:listings(id, title, city, price, type, status, owner_id)')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('roommate_connections')
        .select('*, sender:profiles!sender_id(id, full_name, phone, city), poster:profiles!poster_id(id, full_name, phone, city)')
        .or(`poster_id.eq.${user.id},sender_id.eq.${user.id}`)
        .order('created_at', { ascending: false }),
    ]);

    if (savedIdsRes.data && savedIdsRes.data.length > 0) {
      const ids = savedIdsRes.data.map((r: { listing_id: string }) => r.listing_id);
      const { data: listingsData } = await supabase
        .from('listings')
        .select('*')
        .in('id', ids);
      setSavedListings((listingsData ?? []) as Listing[]);
    } else {
      setSavedListings([]);
    }
    if (inqRes.data) setInquiries(inqRes.data as (Inquiry & { listing?: Listing })[]);
    if (roommateRes.data) setRoommateConnections(roommateRes.data as RoommateConnection[]);
    setLoading(false);
  }

  async function removeSaved(listingId: string) {
    await supabase
      .from('saved_listings')
      .delete()
      .eq('user_id', user!.id)
      .eq('listing_id', listingId);
    setSavedListings(prev => prev.filter(l => l.id !== listingId));
  }

  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        phone: phone.trim(),
        city: city.trim(),
        bio: bio.trim(),
        avatar_letter: fullName.trim().charAt(0).toUpperCase(),
      })
      .eq('id', user.id);
    await refreshProfile();
    setSaving(false);
    if (!error) {
      setSaveMsg('Profile saved!');
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }

  const initial = profile?.avatar_letter || profile?.full_name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <div style={{ background: 'var(--lav-50)', minHeight: '100vh', paddingTop: 66 }}>

      {/* ── Header bar ── */}
      <div style={{
        background: '#1E1B2E', color: 'white',
        padding: '0 32px', height: 56,
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'linear-gradient(135deg, #8B6FE8, #7254CC)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 700, color: 'white', flexShrink: 0,
        }}>
          {initial}
        </div>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20 }}>My Dashboard</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.55)' }}>{profile?.full_name}</span>
        <button
          onClick={() => { signOut(); setView('home'); }}
          style={{
            background: 'none', border: 'none', color: 'var(--lav-300)',
            fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
            fontFamily: "'DM Sans', sans-serif",
          }}
        >
          Sign Out
        </button>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '28px 24px' }}>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
          <StatCard label="Wishlist"             value={savedListings.length}     accent="var(--lav-500)" bg="var(--lav-50)" border="var(--lav-200)" />
          <StatCard label="Sent Enquiries"     value={inquiries.length}         accent="#16A34A"        bg="#F0FDF4"        border="#86EFAC"         />
          <StatCard label="Roommate Chats"  value={roommateConnections.length}  accent="#D97706"  bg="#FFFBEB"  border="#FDE68A" />
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--lav-200)', marginBottom: 24 }}>
          {([
            { id: 'saved',     label: 'Wishlist',           count: savedListings.length     },
            { id: 'enquiries', label: 'My Enquiries',      count: inquiries.length         },
            { id: 'roommate',  label: 'Roommate Chats', count: roommateConnections.length },
            { id: 'profile',   label: 'Profile',           count: null                     },
          ] as { id: Tab; label: string; count: number | null }[]).map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); if (t.id === 'saved') load(); }}
              style={{
                padding: '10px 20px', background: 'none', border: 'none',
                borderBottom: tab === t.id ? '2.5px solid var(--lav-500)' : '2.5px solid transparent',
                color: tab === t.id ? 'var(--lav-600)' : 'var(--slate2)',
                fontWeight: tab === t.id ? 700 : 500, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: -2,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {t.label}
              {t.count !== null && (
                <span style={{
                  background: tab === t.id ? 'var(--lav-100)' : 'var(--lav-50)',
                  color: tab === t.id ? 'var(--lav-600)' : 'var(--slate3)',
                  fontSize: 11, fontWeight: 700, padding: '1px 7px',
                  borderRadius: 99, border: '1px solid var(--lav-200)',
                }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── SAVED TAB ── */}
        {tab === 'saved' && (
          loading ? <LoadingRow /> : savedListings.length === 0 ? (
            <EmptyState
              icon="♡"
              title="Your wishlist is empty"
              desc="Browse properties and tap the heart to add them to your wishlist."
              action={{ label: 'Browse Listings', onClick: () => setView('listings') }}
            />
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
              {savedListings.map(listing => (
                <div key={listing.id} style={{ position: 'relative' }}>
                  <Card
                    listing={listing}
                    layout="grid"
                    onClick={() => onListingClick ? onListingClick(listing.id) : setView('detail')}
                  />
                  <button
                    onClick={() => removeSaved(listing.id)}
                    style={{
                      position: 'absolute', top: 10, right: 10,
                      background: 'rgba(255,255,255,0.92)', border: 'none',
                      borderRadius: 8, padding: '5px 10px',
                      fontSize: 12, fontWeight: 600, color: '#DC2626',
                      cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                      boxShadow: '0 2px 6px rgba(0,0,0,0.12)',
                    }}
                  >
                    ✕ Remove
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {/* ── ENQUIRIES TAB ── */}
        {tab === 'enquiries' && (
          loading ? <LoadingRow /> : inquiries.length === 0 ? (
            <EmptyState
              icon="💬"
              title="No enquiries sent yet"
              desc="Find a listing you like and send a message to the owner."
              action={{ label: 'Browse Listings', onClick: () => setView('listings') }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {inquiries.map(inq => {
                const lst = inq.listing as Listing | undefined;
                return (
                  <div key={inq.id} style={{
                    background: 'white', borderRadius: 14,
                    boxShadow: 'var(--shadow-sm)', padding: '20px 24px',
                    border: '1px solid var(--lav-100)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
                      <div>
                        {lst ? (
                          <button
                            onClick={() => onListingClick ? onListingClick(lst.id) : setView('detail')}
                            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                          >
                            <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: 'var(--ink)', marginBottom: 3 }}>{lst.title}</p>
                            <p style={{ fontSize: 12, color: 'var(--slate3)' }}>
                              {lst.city} · {lst.type} · Nu {lst.price?.toLocaleString()}/mo
                            </p>
                          </button>
                        ) : (
                          <p style={{ fontSize: 14, color: 'var(--slate3)' }}>Listing unavailable</p>
                        )}
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--slate3)', flexShrink: 0 }}>
                        {new Date(inq.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <p style={{
                      fontSize: 14, color: 'var(--slate2)', lineHeight: 1.6,
                      borderLeft: '3px solid var(--lav-200)', paddingLeft: 14, margin: '0 0 14px',
                    }}>
                      {inq.message}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {inq.accepted ? (
                        <button
                          onClick={() => setChatInquiry(inq)}
                          style={{
                            background: 'var(--lav-500)', color: '#fff', border: 'none',
                            borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600,
                            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}
                        >
                          💬 Open Chat
                        </button>
                      ) : (
                        <span style={{
                          fontSize: 12, color: '#D97706', background: '#FFF7ED',
                          border: '1px solid #FDE68A', borderRadius: 99, padding: '4px 12px',
                          fontFamily: "'DM Sans', sans-serif", fontWeight: 600,
                        }}>
                          ⏳ Awaiting response
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}

        {/* ── ROOMMATE CHATS TAB ── */}
        {tab === 'roommate' && (
          loading ? <LoadingRow /> : roommateConnections.length === 0 ? (
            <EmptyState
              icon="🏠"
              title="No roommate chats yet"
              desc="Post your profile or connect with someone on the Roommate Finder to start a conversation."
              action={{ label: 'Go to Roommate Finder', onClick: () => setView('roommates') }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {roommateConnections.map(conn => {
                const isSender = conn.sender_id === user!.id;
                const other = isSender ? conn.poster : conn.sender;
                return (
                  <ConnectionCard
                    key={conn.id}
                    name={other?.full_name || 'Anonymous'}
                    city={other?.city}
                    phone={other?.phone}
                    message={conn.message}
                    date={conn.created_at}
                    direction={isSender ? 'sent' : 'received'}
                    onChat={() => setChatConnection(conn)}
                  />
                );
              })}
            </div>
          )
        )}

        {/* ── PROFILE TAB ── */}
        {tab === 'profile' && (
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' }}>

            {/* Avatar card */}
            <div style={{ background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-sm)', padding: 28, textAlign: 'center' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg, #8B6FE8, #7254CC)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 32, fontWeight: 700, color: 'white',
                margin: '0 auto 16px',
              }}>
                {initial}
              </div>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--ink)', marginBottom: 4 }}>
                {profile?.full_name}
              </p>
              <p style={{ fontSize: 13, color: 'var(--slate3)', textTransform: 'capitalize', marginBottom: 18 }}>
                {profile?.role}
              </p>
              <div style={{ fontSize: 12, color: 'var(--slate2)', background: 'var(--lav-50)', borderRadius: 10, padding: '12px 14px', textAlign: 'left', lineHeight: 1.8 }}>
                <p><strong style={{ color: 'var(--slate)' }}>Email:</strong> {profile?.email}</p>
                <p><strong style={{ color: 'var(--slate)' }}>Member since:</strong>{' '}
                  {profile?.created_at
                    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    : '—'}
                </p>
                <p><strong style={{ color: 'var(--slate)' }}>CID Verified:</strong>{' '}
                  <span style={{ color: profile?.cid_verified ? '#16A34A' : '#D97706' }}>
                    {profile?.cid_verified ? '✓ Verified' : 'Pending'}
                  </span>
                </p>
              </div>
            </div>

            {/* Edit form */}
            <div style={{ background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-sm)', padding: 28 }}>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--ink)', marginBottom: 24 }}>
                Edit Profile
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <ProfileField label="Full Name">
                  <input value={fullName} onChange={e => setFullName(e.target.value)} style={inputSt} placeholder="Your full name" />
                </ProfileField>
                <ProfileField label="Phone Number">
                  <input value={phone} onChange={e => setPhone(e.target.value)} style={inputSt} placeholder="+975 ..." />
                </ProfileField>
                <ProfileField label="City">
                  <select value={city} onChange={e => setCity(e.target.value)} style={inputSt}>
                    <option value="">— Select City —</option>
                    {CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </ProfileField>
                <ProfileField label="Bio">
                  <textarea
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    rows={4}
                    style={{ ...inputSt, height: 'auto', resize: 'vertical', padding: '10px 14px', lineHeight: 1.6 }}
                    placeholder="A short bio about yourself…"
                  />
                </ProfileField>
              </div>

              {saveMsg && (
                <div style={{ marginTop: 16, background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 8, padding: '10px 14px', color: '#16A34A', fontSize: 14 }}>
                  {saveMsg}
                </div>
              )}

              <button
                onClick={saveProfile}
                disabled={saving}
                style={{
                  marginTop: 22, background: 'var(--lav-500)', color: 'white',
                  border: 'none', borderRadius: 10, padding: '11px 28px',
                  fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif",
                  boxShadow: '0 4px 14px rgba(139,111,232,0.28)',
                }}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Inquiry chat modal */}
      {chatInquiry && user && (
        <ChatModal
          inquiryId={chatInquiry.id}
          inquiryMessage={chatInquiry.message}
          currentUserId={user.id}
          otherUserName="Property Owner"
          listingTitle={chatInquiry.listing?.title ?? 'Property'}
          onClose={() => setChatInquiry(null)}
        />
      )}

      {/* Roommate chat modal */}
      {chatConnection && user && (
        <ChatModal
          inquiryId={chatConnection.id}
          inquiryMessage={chatConnection.message}
          currentUserId={user.id}
          otherUserName={
            chatConnection.sender_id === user.id
              ? (chatConnection.poster?.full_name ?? 'Roommate')
              : (chatConnection.sender?.full_name ?? 'Roommate')
          }
          listingTitle="Roommate Chat"
          table="roommate_messages"
          threadColumn="connection_id"
          onClose={() => setChatConnection(null)}
        />
      )}
    </div>
  );
}

/* ── Sub-components ── */

function StatCard({ label, value, accent, bg, border }: { label: string; value: number | string; accent: string; bg: string; border: string }) {
  return (
    <div style={{ background: bg, borderRadius: 14, border: `1.5px solid ${border}`, padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</p>
      <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: accent, lineHeight: 1 }}>{value}</p>
    </div>
  );
}

function EmptyState({ icon, title, desc, action }: { icon: string; title: string; desc: string; action: { label: string; onClick: () => void } }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>{icon}</div>
      <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--ink)', marginBottom: 8 }}>{title}</h3>
      <p style={{ color: 'var(--slate2)', fontSize: 14, marginBottom: 22 }}>{desc}</p>
      <button
        onClick={action.onClick}
        style={{ background: 'var(--lav-500)', color: 'white', border: 'none', borderRadius: 10, padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
      >
        {action.label}
      </button>
    </div>
  );
}

function LoadingRow() {
  return <p style={{ color: 'var(--slate3)', fontSize: 14, textAlign: 'center', padding: '48px 0' }}>Loading…</p>;
}

function ProfileField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--slate)', display: 'block', marginBottom: 6 }}>{label}</label>
      {children}
    </div>
  );
}

function ConnectionCard({ name, city, phone, message, date, onChat, direction }: {
  name: string;
  city?: string;
  phone?: string;
  message: string;
  date: string;
  onChat: () => void;
  direction: 'received' | 'sent';
}) {
  return (
    <div style={{
      background: 'white', borderRadius: 14,
      boxShadow: 'var(--shadow-sm)', padding: '20px 24px',
      border: `1px solid ${direction === 'received' ? 'var(--lav-100)' : '#FEF9C3'}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg, #8B6FE8, #7254CC)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16, fontWeight: 700, flexShrink: 0,
          }}>
            {name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: 'var(--ink)', marginBottom: 2 }}>
              {name}
            </p>
            <p style={{ fontSize: 12, color: 'var(--slate3)' }}>
              {city && `📍 ${city}`}{phone && ` · 📞 ${phone}`}
            </p>
          </div>
        </div>
        <span style={{ fontSize: 12, color: 'var(--slate3)', flexShrink: 0 }}>
          {new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
        </span>
      </div>
      <p style={{
        fontSize: 14, color: 'var(--slate2)', lineHeight: 1.6,
        borderLeft: `3px solid ${direction === 'received' ? '#FDE68A' : 'var(--lav-200)'}`,
        paddingLeft: 14, margin: '0 0 14px',
      }}>
        {message}
      </p>
      <button
        onClick={onChat}
        style={{
          background: 'var(--lav-500)', color: '#fff', border: 'none',
          borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
          display: 'flex', alignItems: 'center', gap: 6,
        }}
      >
        💬 Open Chat
      </button>
    </div>
  );
}

const inputSt: React.CSSProperties = {
  width: '100%', height: 42, border: '1.5px solid var(--lav-200)', borderRadius: 10,
  padding: '0 14px', fontSize: 14, color: 'var(--ink)', background: 'white',
  outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif",
};
