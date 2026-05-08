import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Listing, Profile, Report } from '../lib/types';

interface AdminConsoleProps {
  setView: (v: string) => void;
}


type Tab = 'queue' | 'users' | 'analytics' | 'reports';
type Risk = 'Low' | 'Medium' | 'High';

export default function AdminConsole({ setView }: AdminConsoleProps) {
  const { profile, signOut } = useAuth();

  const [tab, setTab] = useState<Tab>('queue');
  const [stats, setStats] = useState({ pending: 0, total: 0, users: 0, reports: 0 });
  const [pendingListings, setPendingListings] = useState<Listing[]>([]);
  const [dbUsers, setDbUsers] = useState<Profile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [actionedIds, setActionedIds] = useState<Record<string, 'approved' | 'rejected'>>({});

  /* ── Access guard ── */
  if (profile && profile.role !== 'admin') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--lav-50)', gap: 16 }}>
        <div style={{ fontSize: 56 }}>🔒</div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: 'var(--ink)' }}>Access Denied</h2>
        <p style={{ color: 'var(--slate2)', fontSize: 15 }}>This area is restricted to administrators only.</p>
        <button onClick={() => setView('home')} style={btnPrimary}>Go Home</button>
      </div>
    );
  }

  /* ── Fetch real data ── */
  useEffect(() => {
    async function load() {
      const [pendingRes, totalRes, usersRes, reportsRes] = await Promise.all([
        supabase.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('listings').select('*', { count: 'exact', head: true }),
        supabase.from('profiles').select('*', { count: 'exact', head: true }),
        supabase.from('reports').select('*', { count: 'exact', head: true }).neq('status', 'Resolved'),
      ]);
      setStats({
        pending: pendingRes.count ?? 0,
        total: totalRes.count ?? 0,
        users: usersRes.count ?? 0,
        reports: reportsRes.count ?? 0,
      });

      const { data: pendingData } = await supabase
        .from('listings')
        .select('*, owner:profiles(*)')
        .eq('status', 'pending')
        .limit(20);
      if (pendingData) setPendingListings(pendingData as Listing[]);

      const { data: profilesData } = await supabase.from('profiles').select('*').limit(50);
      if (profilesData && profilesData.length > 0) setDbUsers(profilesData as Profile[]);

      const { data: reportsData } = await supabase.from('reports').select('*, reporter:profiles(*)').limit(20);
      if (reportsData && reportsData.length > 0) setReports(reportsData as Report[]);
    }
    load();
  }, []);

  async function approveQueue(listingId: string) {
    await supabase.from('listings').update({ status: 'live', verified: true }).eq('id', listingId);
    setActionedIds(p => ({ ...p, [listingId]: 'approved' }));
  }
  async function rejectQueue(listingId: string) {
    await supabase.from('listings').update({ status: 'rejected' }).eq('id', listingId);
    setActionedIds(p => ({ ...p, [listingId]: 'rejected' }));
  }

  async function resolveReport(reportId: string) {
    await supabase.from('reports').update({ status: 'Resolved' }).eq('id', reportId);
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'Resolved' as const } : r));
  }

  /* ── Header ── */
  return (
    <div style={{ background: 'var(--lav-50)', minHeight: '100vh', paddingTop: 66 }}>

      {/* Admin header */}
      <div style={{ background: '#1E1B2E', color: 'white', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', gap: 14 }}>
        <span style={{ fontSize: 20 }}>⚙</span>
        <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, flex: 'none' }}>Admin Console</span>
        <span style={{ background: 'rgba(139,111,232,0.3)', color: 'var(--lav-300)', fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99, letterSpacing: '0.08em', textTransform: 'uppercase', border: '1px solid rgba(139,111,232,0.4)' }}>
          DrukNest Internal
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)' }}>
          Admin: {profile?.full_name ?? 'Tashi Admin'}
        </span>
        <button onClick={() => { signOut(); setView('home'); }} style={{ background: 'none', border: 'none', color: 'var(--lav-300)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
          Sign Out
        </button>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 24px' }}>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 28 }}>
          <StatCard label="Pending Approvals" value={stats.pending} accent="#F97316" bg="#FFF7ED" border="#FED7AA" />
          <StatCard label="Total Listings" value={stats.total} accent="var(--lav-500)" bg="var(--lav-50)" border="var(--lav-200)" />
          <StatCard label="Registered Users" value={stats.users.toLocaleString()} accent="#16A34A" bg="#F0FDF4" border="#86EFAC" />
          <StatCard label="Open Reports" value={stats.reports} accent="#DC2626" bg="#FEF2F2" border="#FECACA" />
          <StatCard label="Revenue (Apr)" value="Nu 0" accent="var(--slate2)" bg="white" border="var(--lav-200)" />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--lav-200)', marginBottom: 24 }}>
          {([
            { id: 'queue', label: 'Approval Queue', count: stats.pending },
            { id: 'users', label: 'Users', count: stats.users },
            { id: 'analytics', label: 'Analytics', count: null },
            { id: 'reports', label: 'Reports', count: stats.reports },
          ] as { id: Tab; label: string; count: number | null }[]).map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '10px 20px', background: 'none', border: 'none',
                borderBottom: tab === t.id ? '2.5px solid var(--lav-500)' : '2.5px solid transparent',
                color: tab === t.id ? 'var(--lav-600)' : 'var(--slate2)',
                fontWeight: tab === t.id ? 700 : 500, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 6, marginBottom: -2,
              }}
            >
              {t.label}
              {t.count !== null && (
                <span style={{ background: tab === t.id ? 'var(--lav-100)' : 'var(--lav-50)', color: tab === t.id ? 'var(--lav-600)' : 'var(--slate3)', fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 99, border: '1px solid var(--lav-200)' }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── QUEUE TAB ── */}
        {tab === 'queue' && (
          <div>
            <div style={{ background: 'white', borderRadius: 14, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--lav-50)', borderBottom: '1.5px solid var(--lav-200)' }}>
                    {['ID', 'Property', 'Owner', 'City', 'Price/mo', 'Document', 'Photos', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--slate2)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingListings.length === 0 && (
                    <tr>
                      <td colSpan={8} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--slate3)', fontSize: 14 }}>
                        No listings pending approval.
                      </td>
                    </tr>
                  )}
                  {pendingListings.map((listing, i) => (
                    <tr key={listing.id} style={{ borderBottom: '1px solid var(--lav-100)', background: i % 2 === 0 ? 'white' : 'var(--lav-50)' }}>
                      <td style={tdStyle}><span style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--slate3)' }}>{listing.id.slice(0, 8)}</span></td>
                      <td style={tdStyle}><span style={{ fontWeight: 600, color: 'var(--ink)', fontSize: 14 }}>{listing.title}</span></td>
                      <td style={tdStyle}><span style={{ color: 'var(--slate2)', fontSize: 14 }}>{(listing.owner as Profile | undefined)?.full_name ?? '—'}</span></td>
                      <td style={tdStyle}><span style={{ color: 'var(--slate2)', fontSize: 14 }}>{listing.city}</span></td>
                      <td style={tdStyle}><span style={{ fontWeight: 600, color: 'var(--lav-600)', fontSize: 14 }}>Nu {listing.price.toLocaleString()}</span></td>
                      <td style={tdStyle}>
                        {listing.doc_url ? (
                          <a href={listing.doc_url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--lav-600)', fontWeight: 600, textDecoration: 'none', background: 'var(--lav-50)', border: '1px solid var(--lav-200)', borderRadius: 6, padding: '3px 8px' }}>
                            View Doc
                          </a>
                        ) : (
                          <span style={{ fontSize: 12, color: '#DC2626' }}>No doc</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {listing.photo_urls && listing.photo_urls.length > 0 ? (
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            <img src={listing.photo_urls[0]} alt="" style={{ width: 36, height: 36, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--lav-200)' }} />
                            {listing.photo_urls.length > 1 && (
                              <span style={{ fontSize: 11, color: 'var(--slate3)' }}>+{listing.photo_urls.length - 1}</span>
                            )}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--slate3)' }}>—</span>
                        )}
                      </td>
                      <td style={tdStyle}>
                        {actionedIds[listing.id] ? (
                          <span style={{ fontSize: 13, fontWeight: 600, color: actionedIds[listing.id] === 'approved' ? '#16A34A' : '#DC2626' }}>
                            {actionedIds[listing.id] === 'approved' ? '✓ Approved' : '✗ Rejected'}
                          </span>
                        ) : (
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button onClick={() => approveQueue(listing.id)} style={{ ...btnSm, background: '#16A34A', color: 'white' }}>Approve</button>
                            <button onClick={() => rejectQueue(listing.id)} style={{ ...btnSm, background: 'white', color: '#DC2626', border: '1px solid #FECACA' }}>Reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── USERS TAB ── */}
        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Search users by name…"
                style={{ ...inputSm, flex: 1 }}
              />
              <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)} style={inputSm}>
                <option value="all">All Roles</option>
                <option value="tenant">Tenant</option>
                <option value="owner">Owner</option>
              </select>
            </div>

            <div style={{ background: 'white', borderRadius: 14, boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--lav-50)', borderBottom: '1.5px solid var(--lav-200)' }}>
                    {['Name', 'Role', 'Joined', 'Listings', 'ID Status', 'Account Status', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px 16px', fontSize: 12, fontWeight: 700, color: 'var(--slate2)', textAlign: 'left', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dbUsers.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--slate3)', fontSize: 14 }}>
                        No registered users yet.
                      </td>
                    </tr>
                  )}
                  {dbUsers.map(u => ({
                      id: u.id, name: u.full_name, role: u.role, joined: new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                      listings: 0, id_status: u.cid_verified ? 'CID Verified' : 'Pending', account_status: 'Active',
                    }))
                    .filter(u => {
                      const matchName = u.name.toLowerCase().includes(userSearch.toLowerCase());
                      const matchRole = userRoleFilter === 'all' || u.role.toLowerCase() === userRoleFilter;
                      return matchName && matchRole;
                    })
                    .map((u, i) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--lav-100)', background: i % 2 === 0 ? 'white' : 'var(--lav-50)' }}>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--lav-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--lav-700)', flexShrink: 0 }}>
                              {u.name.charAt(0)}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)' }}>{u.name}</span>
                          </div>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: u.role === 'owner' || u.role === 'Owner' ? 'var(--lav-100)' : '#F0FDF4', color: u.role === 'owner' || u.role === 'Owner' ? 'var(--lav-700)' : '#166534', border: `1px solid ${u.role === 'owner' || u.role === 'Owner' ? 'var(--lav-300)' : '#86EFAC'}` }}>
                            {u.role}
                          </span>
                        </td>
                        <td style={tdStyle}><span style={{ color: 'var(--slate2)', fontSize: 14 }}>{u.joined}</span></td>
                        <td style={tdStyle}><span style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate)' }}>{u.listings}</span></td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: 12, color: u.id_status === 'CID Verified' || u.id_status === 'CID + Docs Verified' ? '#16A34A' : u.id_status === 'Pending' ? '#D97706' : 'var(--slate2)' }}>
                            {u.id_status}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: u.account_status === 'Active' ? '#F0FDF4' : u.account_status === 'Flagged' ? '#FEF2F2' : '#FFFBEB', color: u.account_status === 'Active' ? '#16A34A' : u.account_status === 'Flagged' ? '#DC2626' : '#D97706', border: `1px solid ${u.account_status === 'Active' ? '#86EFAC' : u.account_status === 'Flagged' ? '#FECACA' : '#FDE68A'}` }}>
                            {u.account_status}
                          </span>
                        </td>
                        <td style={tdStyle}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button style={{ ...btnSm, background: 'var(--lav-50)', color: 'var(--lav-600)', border: '1px solid var(--lav-200)' }}>View</button>
                            {u.account_status === 'Flagged' && (
                              <button style={{ ...btnSm, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>Suspend</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {tab === 'analytics' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Listings by City */}
            <div style={{ background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-sm)', padding: 24 }}>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--ink)', marginBottom: 20 }}>Listings by City</h3>
              <p style={{ fontSize: 13, color: 'var(--slate3)', textAlign: 'center', padding: '24px 0' }}>City breakdown will populate as listings are added.</p>
            </div>

            {/* Platform Metrics */}
            <div style={{ background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-sm)', padding: 24 }}>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--ink)', marginBottom: 20 }}>Platform Metrics</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { label: 'Total Listings', value: String(stats.total) },
                  { label: 'Registered Users', value: String(stats.users) },
                  { label: 'Pending Approvals', value: String(stats.pending) },
                  { label: 'Open Reports', value: String(stats.reports) },
                ].map(m => (
                  <div key={m.label} style={{ background: 'var(--lav-50)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--lav-100)' }}>
                    <p style={{ fontSize: 12, color: 'var(--slate3)', marginBottom: 4, fontWeight: 500 }}>{m.label}</p>
                    <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--ink)' }}>{m.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Property Types */}
            <div style={{ background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-sm)', padding: 24 }}>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--ink)', marginBottom: 20 }}>Property Types</h3>
              <p style={{ fontSize: 13, color: 'var(--slate3)', textAlign: 'center', padding: '24px 0' }}>Property type breakdown will populate as listings are added.</p>
            </div>

            {/* Key Milestones */}
            <div style={{ background: '#1E1B2E', borderRadius: 16, padding: 24 }}>
              <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'white', marginBottom: 20 }}>Key Milestones</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)', textAlign: 'center', padding: '24px 0' }}>Milestones will appear here as the platform grows.</p>
            </div>

          </div>
        )}

        {/* ── REPORTS TAB ── */}
        {tab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {reports.map(report => (
              <div key={report.id} style={{ background: 'white', borderRadius: 14, boxShadow: 'var(--shadow-sm)', padding: '20px 24px', border: '1px solid var(--lav-100)' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <h4 style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{report.title}</h4>
                    <PriorityBadge priority={report.priority} />
                    <StatusBadge status={report.status} />
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--slate3)', flexShrink: 0 }}>
                    {new Date(report.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: 'var(--slate2)', marginBottom: 8, lineHeight: 1.5 }}>{report.description}</p>
                <p style={{ fontSize: 12, color: 'var(--slate3)', marginBottom: 14 }}>
                  Reported by <strong style={{ color: 'var(--slate2)' }}>{(report.reporter as Profile | undefined)?.full_name ?? 'Anonymous'}</strong>
                  {report.target_listing_id && <span> · Against listing: <strong style={{ color: 'var(--slate2)' }}>{report.target_listing_id}</strong></span>}
                  {report.target_user_id && <span> · Against user: <strong style={{ color: 'var(--slate2)' }}>{report.target_user_id}</strong></span>}
                </p>
                <div style={{ display: 'flex', gap: 10 }}>
                  {report.status !== 'Resolved' && (
                    <button onClick={() => resolveReport(report.id)} style={{ ...btnSm, background: '#F0FDF4', color: '#16A34A', border: '1px solid #86EFAC' }}>
                      ✓ Mark Resolved
                    </button>
                  )}
                  <button style={{ ...btnSm, background: 'var(--lav-50)', color: 'var(--lav-600)', border: '1px solid var(--lav-200)' }}>Investigate</button>
                  <button style={{ ...btnSm, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>Remove Listing</button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
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

function RiskBadge({ risk }: { risk: Risk }) {
  const map: Record<Risk, { color: string; bg: string; border: string }> = {
    Low: { color: '#16A34A', bg: '#F0FDF4', border: '#86EFAC' },
    Medium: { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    High: { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  };
  const s = map[risk];
  return (
    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 9px', borderRadius: 99, color: s.color, background: s.bg, border: `1px solid ${s.border}` }}>
      {risk}
    </span>
  );
}

function PriorityBadge({ priority }: { priority: 'Low' | 'Medium' | 'High' }) {
  const map: Record<string, { color: string; bg: string }> = {
    Low: { color: '#16A34A', bg: '#F0FDF4' },
    Medium: { color: '#D97706', bg: '#FFFBEB' },
    High: { color: '#DC2626', bg: '#FEF2F2' },
  };
  const s = map[priority] ?? map['Low'];
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, color: s.color, background: s.bg }}>{priority} Priority</span>;
}

function StatusBadge({ status }: { status: 'Open' | 'Investigating' | 'Resolved' }) {
  const map: Record<string, { color: string; bg: string }> = {
    Open: { color: '#DC2626', bg: '#FEF2F2' },
    Investigating: { color: '#D97706', bg: '#FFFBEB' },
    Resolved: { color: '#16A34A', bg: '#F0FDF4' },
  };
  const s = map[status] ?? map['Open'];
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6, color: s.color, background: s.bg }}>{status}</span>;
}

/* ── Shared styles ── */

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  verticalAlign: 'middle',
};

const btnSm: React.CSSProperties = {
  padding: '6px 14px', borderRadius: 7, fontSize: 12,
  fontWeight: 600, cursor: 'pointer', border: 'none',
  fontFamily: "'DM Sans', sans-serif",
};

const btnPrimary: React.CSSProperties = {
  padding: '11px 28px', borderRadius: 10, border: 'none',
  background: 'var(--lav-500)', color: 'white', fontSize: 14,
  fontWeight: 600, cursor: 'pointer',
  fontFamily: "'DM Sans', sans-serif",
};

const inputSm: React.CSSProperties = {
  height: 38, border: '1.5px solid var(--lav-200)', borderRadius: 9,
  padding: '0 12px', fontSize: 13, color: 'var(--ink)', background: 'white',
  outline: 'none', fontFamily: "'DM Sans', sans-serif",
};
