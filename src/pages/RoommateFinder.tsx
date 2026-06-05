import React, { useEffect, useState, useMemo } from 'react';
import type { RoommatePost } from '../lib/types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { CITIES } from '../lib/data';

interface RoommateFinderProps {
  setView: (v: string) => void;
}

const MAX_BUDGET = 20000;
const MIN_BUDGET = 2000;
const OCCUPATIONS = ['Any', 'Student', 'Working'];
const GENDER_PREFS = ['Any', 'Male only', 'Female only'];

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "'DM Sans', sans-serif",
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? '#ffffff' : 'var(--slate)',
        background: active ? 'var(--lav-500)' : '#ffffff',
        border: `1.5px solid ${active ? 'var(--lav-500)' : 'var(--lav-200)'}`,
        borderRadius: 99,
        padding: '6px 14px',
        cursor: 'pointer',
        transition: 'background 0.18s, border-color 0.18s, color 0.18s',
      }}
    >
      {children}
    </button>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'DM Sans', sans-serif",
      fontSize: 11, fontWeight: 700,
      color: 'var(--slate3)',
      letterSpacing: '0.08em',
      textTransform: 'uppercase' as const,
      marginBottom: 12,
    }}>
      {children}
    </div>
  );
}

export default function RoommateFinder({ setView }: RoommateFinderProps) {
  const { profile, user } = useAuth();

  const [posts, setPosts] = useState<RoommatePost[]>([]);
  const [loading, setLoading] = useState(true);
  const [myPost, setMyPost] = useState<RoommatePost | null>(null);

  const [filterCity, setFilterCity] = useState('');
  const [maxBudget, setMaxBudget] = useState(MAX_BUDGET);
  const [filterOccupation, setFilterOccupation] = useState('Any');
  const [filterGender, setFilterGender] = useState('Any');

  // Post form
  const [showPostForm, setShowPostForm] = useState(false);
  const [formCity, setFormCity] = useState('Thimphu');
  const [formBudget, setFormBudget] = useState(8000);
  const [formOccupation, setFormOccupation] = useState<'Student' | 'Working'>('Student');
  const [formGender, setFormGender] = useState<'Any' | 'Male only' | 'Female only'>('Any');
  const [formMoveIn, setFormMoveIn] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Track which post IDs the current user has already connected with
  const [connectedPostIds, setConnectedPostIds] = useState<Set<string>>(new Set());

  // Connect modal
  const [connectPost, setConnectPost] = useState<RoommatePost | null>(null);
  const [connectMessage, setConnectMessage] = useState('');
  const [connectSent, setConnectSent] = useState(false);
  const [connectSending, setConnectSending] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchPosts(); }, []);

  async function fetchPosts() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('roommate_posts')
        .select('*, user:profiles(*)')
        .eq('active', true)
        .order('created_at', { ascending: false });
      if (data) {
        setPosts(data as RoommatePost[]);
        if (user) setMyPost((data as RoommatePost[]).find(p => p.user_id === user.id) ?? null);
      }
      if (user) {
        const { data: conns } = await supabase
          .from('roommate_connections')
          .select('post_id')
          .eq('sender_id', user.id);
        if (conns) setConnectedPostIds(new Set(conns.map((c: { post_id: string }) => c.post_id)));
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  const filteredPosts = useMemo(() => {
    let result = posts.filter(p => !user || p.user_id !== user.id);
    if (filterCity) result = result.filter(p => p.city === filterCity);
    if (filterOccupation !== 'Any') result = result.filter(p => p.occupation === filterOccupation);
    if (filterGender !== 'Any') result = result.filter(p => p.gender_preference === filterGender || p.gender_preference === 'Any');
    result = result.filter(p => p.budget <= maxBudget);
    return result;
  }, [posts, filterCity, filterOccupation, filterGender, maxBudget, user]);

  function handleReset() {
    setFilterCity('');
    setMaxBudget(MAX_BUDGET);
    setFilterOccupation('Any');
    setFilterGender('Any');
  }

  function openPostForm() {
    if (myPost) {
      setFormCity(myPost.city);
      setFormBudget(myPost.budget);
      setFormOccupation(myPost.occupation);
      setFormGender(myPost.gender_preference);
      setFormMoveIn(myPost.move_in_date);
      setFormBio(myPost.bio);
    } else {
      setFormCity(profile?.city || 'Thimphu');
      setFormBudget(8000);
      setFormOccupation('Student');
      setFormGender('Any');
      setFormMoveIn('');
      setFormBio('');
    }
    setFormError('');
    setShowPostForm(true);
  }

  async function handleSavePost() {
    if (!user) return;
    if (!formMoveIn) { setFormError('Please select a move-in date.'); return; }
    if (!formBio.trim()) { setFormError('Please write a short bio.'); return; }
    setFormSaving(true);
    setFormError('');
    try {
      const record = {
        user_id: user.id,
        city: formCity,
        budget: formBudget,
        occupation: formOccupation,
        gender_preference: formGender,
        move_in_date: formMoveIn,
        bio: formBio.trim(),
        active: true,
      };
      if (myPost) {
        await supabase.from('roommate_posts').update(record).eq('id', myPost.id);
      } else {
        await supabase.from('roommate_posts').insert(record);
      }
      setShowPostForm(false);
      await fetchPosts();
    } catch {
      setFormError('Something went wrong. Please try again.');
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDeletePost() {
    if (!myPost) return;
    await supabase.from('roommate_posts').update({ active: false }).eq('id', myPost.id);
    setMyPost(null);
    await fetchPosts();
  }

  function openConnect(post: RoommatePost) {
    if (!user) { setView('signin'); return; }
    setConnectPost(post);
    setConnectMessage('');
    setConnectSent(false);
  }

  async function handleConnect() {
    if (!user || !connectPost || !connectMessage.trim()) return;
    setConnectSending(true);
    try {
      await supabase.from('roommate_connections').insert({
        post_id: connectPost.id,
        sender_id: user.id,
        poster_id: connectPost.user_id,
        message: connectMessage.trim(),
      });
      setConnectSent(true);
      setConnectedPostIds(prev => new Set([...prev, connectPost.id]));
    } catch { /* silent */ }
    finally { setConnectSending(false); }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1.5px solid var(--lav-200)',
    borderRadius: 10,
    padding: '10px 13px',
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    color: 'var(--ink)',
    outline: 'none',
    boxSizing: 'border-box',
    background: '#fff',
  };

  const selectStyle: React.CSSProperties = {
    ...inputStyle,
    cursor: 'pointer',
    WebkitAppearance: 'none',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' viewBox='0 0 10 7'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236B6885' stroke-width='1.4' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
    paddingRight: 32,
  };

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", minHeight: '100vh', background: 'var(--lav-50)', paddingTop: 66 }}>

      {/* Hero strip */}
      <div style={{
        background: 'linear-gradient(135deg, #8B6FE8 0%, #7254CC 100%)',
        padding: '36px 40px 32px',
        textAlign: 'center',
      }}>
        <h1 style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 34, fontWeight: 400,
          color: '#ffffff', margin: '0 0 8px',
        }}>
          Find a Roommate in Bhutan
        </h1>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.82)', margin: 0 }}>
          Connect with students and working professionals looking to share rent in Thimphu, Paro, and more.
        </p>
        {user && profile?.role === 'tenant' && (
          <button
            onClick={openPostForm}
            style={{
              marginTop: 20,
              background: '#ffffff',
              color: 'var(--lav-600)',
              border: 'none',
              borderRadius: 12,
              padding: '11px 26px',
              fontSize: 14, fontWeight: 700,
              fontFamily: "'DM Sans', sans-serif",
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            }}
          >
            {myPost ? 'Edit My Profile' : '+ Post My Profile'}
          </button>
        )}
        {!user && (
          <button
            onClick={() => setView('signin')}
            style={{
              marginTop: 20,
              background: 'rgba(255,255,255,0.18)',
              color: '#ffffff',
              border: '1.5px solid rgba(255,255,255,0.55)',
              borderRadius: 12,
              padding: '11px 26px',
              fontSize: 14, fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              cursor: 'pointer',
            }}
          >
            Sign in to Post Your Profile
          </button>
        )}
      </div>

      {/* My active post banner */}
      {myPost && profile?.role === 'tenant' && (
        <div style={{
          background: '#F0EDFF',
          borderBottom: '1px solid var(--lav-200)',
          padding: '12px 40px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ fontSize: 13, color: 'var(--lav-700)', fontWeight: 500 }}>
            Your profile is live — people looking for roommates in <strong>{myPost.city}</strong> can see it.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={openPostForm} style={{
              fontSize: 13, fontWeight: 600, color: 'var(--lav-600)',
              background: '#fff', border: '1.5px solid var(--lav-300)',
              borderRadius: 8, padding: '6px 16px', cursor: 'pointer',
            }}>Edit</button>
            <button onClick={handleDeletePost} style={{
              fontSize: 13, fontWeight: 600, color: '#DC2626',
              background: '#FEF2F2', border: '1.5px solid #FCA5A5',
              borderRadius: 8, padding: '6px 16px', cursor: 'pointer',
            }}>Remove</button>
          </div>
        </div>
      )}

      {/* Main content */}
      <div style={{
        maxWidth: 1260, margin: '0 auto',
        padding: '28px 40px',
        display: 'grid',
        gridTemplateColumns: '250px 1fr',
        gap: 28,
        alignItems: 'start',
      }}>

        {/* Sidebar filters */}
        <aside style={{
          position: 'sticky', top: 66 + 16,
          background: '#ffffff', borderRadius: 20,
          boxShadow: 'var(--shadow)', padding: '24px 20px',
          display: 'flex', flexDirection: 'column', gap: 28,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--ink)' }}>
              Filters
            </span>
            <button
              onClick={handleReset}
              style={{
                fontFamily: "'DM Sans', sans-serif", fontSize: 12, fontWeight: 600,
                color: 'var(--lav-600)', background: 'none', border: 'none',
                cursor: 'pointer', padding: '2px 8px', borderRadius: 6,
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--lav-100)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              Reset
            </button>
          </div>

          {/* City */}
          <div>
            <SectionLabel>City</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[{ name: '', label: 'All Cities' }, ...CITIES.map(c => ({ name: c.name, label: c.name }))].map(c => (
                <label key={c.name} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer', fontSize: 13,
                  fontWeight: filterCity === c.name ? 600 : 400,
                  color: filterCity === c.name ? 'var(--lav-600)' : 'var(--slate)',
                }}>
                  <input
                    type="radio" name="city" value={c.name}
                    checked={filterCity === c.name}
                    onChange={() => setFilterCity(c.name)}
                    style={{ accentColor: 'var(--lav-500)', width: 15, height: 15 }}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          {/* Max budget */}
          <div>
            <SectionLabel>Max Budget / Month</SectionLabel>
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              marginBottom: 10, fontSize: 13, color: 'var(--slate2)',
            }}>
              <span>Nu {MIN_BUDGET.toLocaleString()}</span>
              <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: 'var(--lav-600)' }}>
                Nu {maxBudget.toLocaleString()}
              </span>
            </div>
            <input
              type="range" min={MIN_BUDGET} max={MAX_BUDGET} step={500}
              value={maxBudget}
              onChange={e => setMaxBudget(Number(e.target.value))}
            />
          </div>

          {/* Occupation */}
          <div>
            <SectionLabel>Occupation</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {OCCUPATIONS.map(o => (
                <Pill key={o} active={filterOccupation === o} onClick={() => setFilterOccupation(o)}>{o}</Pill>
              ))}
            </div>
          </div>

          {/* Gender preference */}
          <div>
            <SectionLabel>Gender Preference</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {GENDER_PREFS.map(g => (
                <label key={g} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  cursor: 'pointer', fontSize: 13,
                  fontWeight: filterGender === g ? 600 : 400,
                  color: filterGender === g ? 'var(--lav-600)' : 'var(--slate)',
                }}>
                  <input
                    type="radio" name="gender" value={g}
                    checked={filterGender === g}
                    onChange={() => setFilterGender(g)}
                    style={{ accentColor: 'var(--lav-500)', width: 15, height: 15 }}
                  />
                  {g}
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* Cards */}
        <div>
          <div style={{
            fontSize: 14, color: 'var(--slate2)', marginBottom: 20,
          }}>
            {loading ? 'Loading profiles…' : (
              <>
                <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{filteredPosts.length}</span>
                {' '}profile{filteredPosts.length !== 1 ? 's' : ''} found
              </>
            )}
          </div>

          {/* Loading skeletons */}
          {loading && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 24 }}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{
                  background: '#fff', borderRadius: 20, height: 240,
                  boxShadow: 'var(--shadow-sm)', animation: 'shimmer 1.6s ease-in-out infinite',
                }} />
              ))}
            </div>
          )}

          {/* Post cards */}
          {!loading && filteredPosts.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 24 }}>
              {filteredPosts.map(post => (
                <RoommateCard
                  key={post.id}
                  post={post}
                  alreadyConnected={connectedPostIds.has(post.id)}
                  onConnect={() => openConnect(post)}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && filteredPosts.length === 0 && (
            <div style={{
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: '80px 24px', textAlign: 'center',
            }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'var(--lav-100)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 36, marginBottom: 20,
              }}>
                🏠
              </div>
              <h3 style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 24, fontWeight: 400, color: 'var(--ink)', margin: '0 0 10px',
              }}>
                No profiles found
              </h3>
              <p style={{
                fontSize: 14, color: 'var(--slate2)', maxWidth: 320,
                lineHeight: 1.6, margin: '0 0 22px',
              }}>
                Try adjusting your filters, or be the first to post your profile in this area.
              </p>
              <button
                onClick={handleReset}
                style={{
                  fontSize: 14, fontWeight: 600, color: '#ffffff',
                  background: 'var(--lav-500)', border: 'none',
                  borderRadius: 12, padding: '10px 24px', cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(139,111,232,0.30)',
                }}
              >
                Reset Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Post Profile Modal ── */}
      {showPostForm && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(30,27,46,0.55)', backdropFilter: 'blur(4px)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowPostForm(false); }}
        >
          <div style={{
            background: '#fff', borderRadius: 24,
            boxShadow: '0 24px 64px rgba(30,27,46,0.28)',
            width: '100%', maxWidth: 500,
            maxHeight: '90vh', overflowY: 'auto',
            padding: '28px 28px 24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <h2 style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 22, fontWeight: 400, color: 'var(--ink)', margin: 0,
              }}>
                {myPost ? 'Edit Your Profile' : 'Post Your Profile'}
              </h2>
              <button
                onClick={() => setShowPostForm(false)}
                style={{
                  background: 'var(--lav-100)', border: 'none', borderRadius: 8,
                  width: 32, height: 32, cursor: 'pointer', fontSize: 18,
                  color: 'var(--slate)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* City */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>
                  City
                </label>
                <select value={formCity} onChange={e => setFormCity(e.target.value)} style={selectStyle}>
                  {CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              {/* Budget */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>
                  Monthly Budget — <span style={{ color: 'var(--lav-600)', fontFamily: "'DM Serif Display', serif" }}>Nu {formBudget.toLocaleString()}</span>
                </label>
                <input
                  type="range" min={MIN_BUDGET} max={MAX_BUDGET} step={500}
                  value={formBudget}
                  onChange={e => setFormBudget(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--slate3)', marginTop: 4 }}>
                  <span>Nu {MIN_BUDGET.toLocaleString()}</span>
                  <span>Nu {MAX_BUDGET.toLocaleString()}</span>
                </div>
              </div>

              {/* Occupation */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>
                  Occupation
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(['Student', 'Working'] as const).map(o => (
                    <button
                      key={o}
                      onClick={() => setFormOccupation(o)}
                      style={{
                        flex: 1, padding: '10px 0',
                        border: `2px solid ${formOccupation === o ? 'var(--lav-500)' : 'var(--lav-200)'}`,
                        borderRadius: 10,
                        background: formOccupation === o ? 'var(--lav-50)' : '#fff',
                        color: formOccupation === o ? 'var(--lav-600)' : 'var(--slate)',
                        fontFamily: "'DM Sans', sans-serif",
                        fontSize: 14, fontWeight: 600,
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      {o === 'Student' ? '🎓 Student' : '💼 Working'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender preference */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>
                  Roommate Gender Preference
                </label>
                <select value={formGender} onChange={e => setFormGender(e.target.value as typeof formGender)} style={selectStyle}>
                  {GENDER_PREFS.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>

              {/* Move-in date */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>
                  Available From
                </label>
                <input
                  type="date"
                  value={formMoveIn}
                  onChange={e => setFormMoveIn(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={inputStyle}
                />
              </div>

              {/* Bio */}
              <div>
                <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', display: 'block', marginBottom: 6 }}>
                  About You
                </label>
                <textarea
                  value={formBio}
                  onChange={e => setFormBio(e.target.value)}
                  placeholder="e.g. CST student, clean, non-smoker, early sleeper…"
                  rows={4}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                  onFocus={e => (e.target.style.borderColor = 'var(--lav-400)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--lav-200)')}
                />
              </div>

              {formError && (
                <div style={{ fontSize: 13, color: '#DC2626', background: '#FEF2F2', borderRadius: 8, padding: '10px 14px' }}>
                  {formError}
                </div>
              )}

              <button
                onClick={handleSavePost}
                disabled={formSaving}
                style={{
                  width: '100%', padding: '13px 0',
                  background: 'linear-gradient(135deg, #8B6FE8 0%, #7254CC 100%)',
                  color: '#fff', border: 'none', borderRadius: 12,
                  fontSize: 15, fontWeight: 700,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: formSaving ? 'not-allowed' : 'pointer',
                  opacity: formSaving ? 0.7 : 1,
                  boxShadow: '0 4px 16px rgba(139,111,232,0.30)',
                }}
              >
                {formSaving ? 'Saving…' : myPost ? 'Save Changes' : 'Post Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Connect Modal ── */}
      {connectPost && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(30,27,46,0.55)', backdropFilter: 'blur(4px)',
            zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
          }}
          onClick={e => { if (e.target === e.currentTarget) setConnectPost(null); }}
        >
          <div style={{
            background: '#fff', borderRadius: 24,
            boxShadow: '0 24px 64px rgba(30,27,46,0.28)',
            width: '100%', maxWidth: 440,
            padding: '28px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 20, fontWeight: 400, color: 'var(--ink)', margin: 0,
              }}>
                Connect with {connectPost.user?.full_name?.split(' ')[0] || 'this person'}
              </h2>
              <button
                onClick={() => setConnectPost(null)}
                style={{
                  background: 'var(--lav-100)', border: 'none', borderRadius: 8,
                  width: 32, height: 32, cursor: 'pointer', fontSize: 18,
                  color: 'var(--slate)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                ×
              </button>
            </div>

            {!connectSent ? (
              <>
                <p style={{ fontSize: 13, color: 'var(--slate2)', margin: '0 0 18px', lineHeight: 1.6 }}>
                  Introduce yourself — let them know who you are and why you'd be a good fit.
                </p>
                <textarea
                  value={connectMessage}
                  onChange={e => setConnectMessage(e.target.value)}
                  placeholder="Hi, I'm also looking for a roommate in Thimphu. I'm a final-year student at CST…"
                  rows={5}
                  style={{
                    width: '100%', border: '1.5px solid var(--lav-200)', borderRadius: 12,
                    padding: '12px 14px', fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                    color: 'var(--ink)', resize: 'none', outline: 'none',
                    lineHeight: 1.6, boxSizing: 'border-box',
                  }}
                  onFocus={e => (e.target.style.borderColor = 'var(--lav-400)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--lav-200)')}
                />
                <button
                  onClick={handleConnect}
                  disabled={connectSending || !connectMessage.trim()}
                  style={{
                    marginTop: 14, width: '100%', padding: '12px 0',
                    background: 'linear-gradient(135deg, #8B6FE8 0%, #7254CC 100%)',
                    color: '#fff', border: 'none', borderRadius: 12,
                    fontSize: 14, fontWeight: 700,
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: connectSending || !connectMessage.trim() ? 'not-allowed' : 'pointer',
                    opacity: connectSending || !connectMessage.trim() ? 0.55 : 1,
                  }}
                >
                  {connectSending ? 'Sending…' : 'Send Message'}
                </button>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 14 }}>✅</div>
                <p style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 19, color: 'var(--ink)', margin: '0 0 8px',
                }}>
                  Message sent!
                </p>
                <p style={{ fontSize: 13, color: 'var(--slate2)', lineHeight: 1.6, margin: '0 0 20px' }}>
                  {connectPost.user?.full_name?.split(' ')[0] || 'They'} will see your message on their dashboard.
                  {connectPost.user?.phone && (
                    <> You can also reach them at <strong>{connectPost.user.phone}</strong>.</>
                  )}
                </p>
                <button
                  onClick={() => setConnectPost(null)}
                  style={{
                    padding: '10px 28px',
                    background: 'var(--lav-500)', color: '#fff',
                    border: 'none', borderRadius: 10,
                    fontSize: 14, fontWeight: 600,
                    fontFamily: "'DM Sans', sans-serif",
                    cursor: 'pointer',
                  }}
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </div>
  );
}

function RoommateCard({ post, onConnect, alreadyConnected }: { post: RoommatePost; onConnect: () => void; alreadyConnected: boolean }) {
  const initial = post.user?.full_name?.charAt(0)?.toUpperCase() || '?';
  const moveIn = new Date(post.move_in_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div style={{
      background: '#ffffff',
      borderRadius: 20,
      boxShadow: 'var(--shadow)',
      padding: '22px 20px',
      display: 'flex', flexDirection: 'column', gap: 14,
      transition: 'box-shadow 0.2s, transform 0.2s',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(139,111,232,0.18)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)';
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
      }}
    >
      {/* Avatar + name + city */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 46, height: 46, borderRadius: '50%',
          background: 'linear-gradient(135deg, #8B6FE8, #7254CC)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 18, fontWeight: 700, flexShrink: 0,
        }}>
          {initial}
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>
            {post.user?.full_name || 'Anonymous'}
          </div>
          <div style={{ fontSize: 12, color: 'var(--slate3)', marginTop: 1 }}>
            📍 {post.city}
          </div>
        </div>
      </div>

      {/* Badges */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: 11, fontWeight: 600,
          background: post.occupation === 'Student' ? '#EEF2FF' : '#F0FDF4',
          color: post.occupation === 'Student' ? '#4F46E5' : '#15803D',
          borderRadius: 99, padding: '4px 10px',
        }}>
          {post.occupation === 'Student' ? '🎓 Student' : '💼 Working'}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600,
          background: '#F5F3FF', color: '#6D28D9',
          borderRadius: 99, padding: '4px 10px',
        }}>
          👥 {post.gender_preference}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600,
          background: '#FEF9C3', color: '#92400E',
          borderRadius: 99, padding: '4px 10px',
        }}>
          📅 From {moveIn}
        </span>
      </div>

      {/* Budget */}
      <div style={{
        background: 'var(--lav-50)',
        borderRadius: 10, padding: '10px 14px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 12, color: 'var(--slate3)', fontWeight: 500 }}>Budget / month</span>
        <span style={{
          fontFamily: "'DM Serif Display', serif",
          fontSize: 18, color: 'var(--lav-600)',
        }}>
          Nu {post.budget.toLocaleString()}
        </span>
      </div>

      {/* Bio */}
      <p style={{
        fontSize: 13, color: 'var(--slate2)',
        lineHeight: 1.6, margin: 0,
        display: '-webkit-box',
        WebkitLineClamp: 3,
        WebkitBoxOrient: 'vertical' as const,
        overflow: 'hidden',
      }}>
        {post.bio}
      </p>

      {/* Connect button */}
      {alreadyConnected ? (
        <div style={{
          width: '100%', padding: '11px 0',
          background: '#F0FDF4', border: '1.5px solid #86EFAC',
          borderRadius: 12, fontSize: 14, fontWeight: 600,
          color: '#16A34A', textAlign: 'center',
          fontFamily: "'DM Sans', sans-serif",
          marginTop: 'auto',
        }}>
          ✓ Request Sent
        </div>
      ) : (
        <button
          onClick={onConnect}
          style={{
            width: '100%', padding: '11px 0',
            background: 'linear-gradient(135deg, #8B6FE8 0%, #7254CC 100%)',
            color: '#fff', border: 'none', borderRadius: 12,
            fontSize: 14, fontWeight: 700,
            fontFamily: "'DM Sans', sans-serif",
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(139,111,232,0.28)',
            transition: 'opacity 0.15s',
            marginTop: 'auto',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.88')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Connect
        </button>
      )}
    </div>
  );
}
