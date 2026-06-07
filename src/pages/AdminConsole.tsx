import React, { useEffect, useState } from 'react';
import { Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Listing, Profile, Report } from '../lib/types';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

interface AdminConsoleProps {
  setView: (v: string) => void;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
}

type Tab = 'queue' | 'users' | 'cid' | 'analytics' | 'reports';

interface CityCount { city: string; count: number; }
interface TypeCount { type: string; count: number; }

export default function AdminConsole({ setView, initialTab, onTabChange }: AdminConsoleProps) {
  const { profile, signOut } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>((initialTab as Tab) ?? 'queue');
  const [stats, setStats] = useState({ pending: 0, total: 0, users: 0, reports: 0 });
  const [pendingListings, setPendingListings] = useState<Listing[]>([]);
  const [dbUsers, setDbUsers] = useState<Profile[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [actionedIds, setActionedIds] = useState<Record<string, 'approved' | 'rejected'>>({});
  const [cidFilter, setCidFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('pending');
  const [suspendConfirm, setSuspendConfirm] = useState<Profile | null>(null);
  const [cityCounts, setCityCounts] = useState<CityCount[]>([]);
  const [typeCounts, setTypeCounts] = useState<TypeCount[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);

  /* Sync external tab changes */
  useEffect(() => {
    if (initialTab && initialTab !== tab) setTab(initialTab as Tab);
  }, [initialTab]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── Fetch real data ── */
  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false }).limit(100);
    if (data) setDbUsers(data as Profile[]);
  }

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

      await loadUsers();

      const { data: reportsData } = await supabase.from('reports').select('*, reporter:profiles(*)').limit(20);
      if (reportsData && reportsData.length > 0) setReports(reportsData as Report[]);
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  /* Re-fetch users every time the users or cid tab is opened */
  useEffect(() => {
    if (tab === 'users' || tab === 'cid') loadUsers();
    if (tab === 'analytics') loadAnalytics();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  async function approveQueue(listingId: string) {
    await supabase.from('listings').update({ status: 'live', verified: true }).eq('id', listingId);
    setActionedIds(p => ({ ...p, [listingId]: 'approved' }));
    const listing = pendingListings.find(l => l.id === listingId);
    if (listing?.owner_id) {
      await supabase.from('notifications').insert({
        user_id: listing.owner_id, type: 'listing_approved',
        title: 'Listing Approved!', body: `Your listing "${listing.title}" is now live.`, link_view: 'owner',
      });
    }
    toast('Listing approved and is now live', 'success');
  }
  async function rejectQueue(listingId: string) {
    await supabase.from('listings').update({ status: 'rejected' }).eq('id', listingId);
    setActionedIds(p => ({ ...p, [listingId]: 'rejected' }));
    const listing = pendingListings.find(l => l.id === listingId);
    if (listing?.owner_id) {
      await supabase.from('notifications').insert({
        user_id: listing.owner_id, type: 'listing_rejected',
        title: 'Listing Not Approved', body: `Your listing "${listing.title}" was not approved. Please review and resubmit.`, link_view: 'owner',
      });
    }
    toast('Listing rejected', 'warning');
  }

  async function approveCid(userId: string) {
    await supabase.from('profiles').update({ cid_verified: true, cid_status: 'verified' }).eq('id', userId);
    setDbUsers(prev => prev.map(u => u.id === userId ? { ...u, cid_verified: true, cid_status: 'verified' as const } : u));
    await supabase.from('notifications').insert({
      user_id: userId, type: 'cid_approved',
      title: 'ID Verified!', body: 'Your CID has been verified. You now have full access to DrukNest.', link_view: 'dashboard',
    });
    toast('CID approved', 'success');
  }
  async function rejectCid(userId: string) {
    await supabase.from('profiles').update({ cid_status: 'rejected' }).eq('id', userId);
    setDbUsers(prev => prev.map(u => u.id === userId ? { ...u, cid_status: 'rejected' as const } : u));
    await supabase.from('notifications').insert({
      user_id: userId, type: 'cid_rejected',
      title: 'ID Verification Failed', body: 'Your CID submission was not approved. Please re-submit a clear photo of your CID.', link_view: 'verify-id',
    });
    toast('CID rejected', 'warning');
  }

  async function resolveReport(reportId: string) {
    await supabase.from('reports').update({ status: 'Resolved' }).eq('id', reportId);
    setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'Resolved' as const } : r));
    toast('Report marked as resolved');
  }

  async function toggleSuspend(u: Profile) {
    const newVal = !u.suspended;
    const { error } = await supabase.from('profiles').update({ suspended: newVal }).eq('id', u.id);
    if (error) { toast('Failed to update account status', 'error'); return; }
    setDbUsers(prev => prev.map(p => p.id === u.id ? { ...p, suspended: newVal } : p));
    toast(newVal ? `${u.full_name} has been suspended` : `${u.full_name} has been reinstated`, newVal ? 'warning' : 'success');
    setSuspendConfirm(null);
  }

  function changeTab(t: Tab) {
    setTab(t);
    onTabChange?.(t);
  }

  async function loadAnalytics() {
    setAnalyticsLoading(true);
    const { data: listings } = await supabase.from('listings').select('city, type').eq('status', 'live');
    if (listings) {
      const cityMap: Record<string, number> = {};
      const typeMap: Record<string, number> = {};
      listings.forEach((l: { city: string; type: string }) => {
        cityMap[l.city] = (cityMap[l.city] ?? 0) + 1;
        typeMap[l.type] = (typeMap[l.type] ?? 0) + 1;
      });
      setCityCounts(Object.entries(cityMap).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count));
      setTypeCounts(Object.entries(typeMap).map(([type, count]) => ({ type, count })).sort((a, b) => b.count - a.count));
    }
    setAnalyticsLoading(false);
  }

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

  /* ── Header ── */
  return (
    <>
    <div style={{ background: 'var(--lav-50)', minHeight: '100vh', paddingTop: 56 }}>

      {/* Admin header */}
      <div style={{ background: '#1E1B2E', color: 'white', padding: '0 32px', height: 56, display: 'flex', alignItems: 'center', gap: 14 }}>
        <Settings size={20} strokeWidth={1.8} />
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
          <StatCard label="CID Pending" value={dbUsers.filter(u => u.cid_status === 'pending').length} accent="#D97706" bg="#FFFBEB" border="#FDE68A" />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--lav-200)', marginBottom: 24 }}>
          {([
            { id: 'queue', label: 'Approval Queue', count: stats.pending },
            { id: 'users', label: 'Users', count: stats.users },
            { id: 'cid', label: 'CID Verification', count: dbUsers.filter(u => u.cid_status === 'pending').length },
            { id: 'analytics', label: 'Analytics', count: null },
            { id: 'reports', label: 'Reports', count: stats.reports },
          ] as { id: Tab; label: string; count: number | null }[]).map(t => (
            <button
              key={t.id}
              onClick={() => changeTab(t.id)}
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
              <button
                onClick={loadUsers}
                style={{ ...btnSm, background: 'var(--lav-50)', color: 'var(--lav-600)', border: '1px solid var(--lav-200)', padding: '0 16px', whiteSpace: 'nowrap' }}
              >
                ↻ Refresh
              </button>
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
                  {dbUsers
                    .filter(u => {
                      const matchName = u.full_name.toLowerCase().includes(userSearch.toLowerCase()) || u.email.toLowerCase().includes(userSearch.toLowerCase());
                      const matchRole = userRoleFilter === 'all' || u.role.toLowerCase() === userRoleFilter;
                      return matchName && matchRole;
                    })
                    .map((u, i) => {
                      const idStatus = u.cid_verified ? 'CID Verified' : u.cid_status === 'pending' ? 'Pending Review' : u.cid_status === 'rejected' ? 'Rejected' : 'Not Submitted';
                      const isSuspended = !!u.suspended;
                      return (
                        <tr key={u.id} style={{ borderBottom: '1px solid var(--lav-100)', background: isSuspended ? '#FFF5F5' : i % 2 === 0 ? 'white' : 'var(--lav-50)' }}>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--lav-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--lav-700)', flexShrink: 0, overflow: 'hidden' }}>
                                {u.avatar_url
                                  ? <img src={u.avatar_url} alt={u.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                  : u.full_name.charAt(0)}
                              </div>
                              <div>
                                <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', display: 'block' }}>{u.full_name}</span>
                                <span style={{ fontSize: 11, color: 'var(--slate3)' }}>{u.email}</span>
                              </div>
                            </div>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: u.role === 'owner' ? 'var(--lav-100)' : u.role === 'admin' ? '#1E1B2E' : '#F0FDF4', color: u.role === 'owner' ? 'var(--lav-700)' : u.role === 'admin' ? 'white' : '#166534', border: `1px solid ${u.role === 'owner' ? 'var(--lav-300)' : u.role === 'admin' ? '#1E1B2E' : '#86EFAC'}` }}>
                              {u.role}
                            </span>
                          </td>
                          <td style={tdStyle}><span style={{ color: 'var(--slate2)', fontSize: 14 }}>{new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</span></td>
                          <td style={tdStyle}><span style={{ fontSize: 14, fontWeight: 600, color: 'var(--slate)' }}>—</span></td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: 12, fontWeight: 600, color: idStatus === 'CID Verified' ? '#16A34A' : idStatus === 'Pending Review' ? '#D97706' : idStatus === 'Rejected' ? '#DC2626' : 'var(--slate3)' }}>
                              {idStatus}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: isSuspended ? '#FEF2F2' : '#F0FDF4', color: isSuspended ? '#DC2626' : '#16A34A', border: `1px solid ${isSuspended ? '#FECACA' : '#86EFAC'}` }}>
                              {isSuspended ? 'Suspended' : 'Active'}
                            </span>
                          </td>
                          <td style={tdStyle}>
                            <div style={{ display: 'flex', gap: 8 }}>
                              {u.role !== 'admin' && (
                                <button
                                  onClick={() => setSuspendConfirm(u)}
                                  style={{ ...btnSm, background: isSuspended ? '#F0FDF4' : '#FEF2F2', color: isSuspended ? '#16A34A' : '#DC2626', border: `1px solid ${isSuspended ? '#86EFAC' : '#FECACA'}` }}
                                >
                                  {isSuspended ? 'Reinstate' : 'Suspend'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── CID VERIFICATION TAB ── */}
        {tab === 'cid' && (
          <div>
            {/* Filter + refresh bar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              {(['all', 'pending', 'verified', 'rejected'] as const).map(f => {
                const counts = { all: dbUsers.filter(u => u.cid_status && u.cid_status !== 'none').length, pending: dbUsers.filter(u => u.cid_status === 'pending').length, verified: dbUsers.filter(u => u.cid_status === 'verified').length, rejected: dbUsers.filter(u => u.cid_status === 'rejected').length };
                const colors = { all: 'var(--lav-500)', pending: '#D97706', verified: '#16A34A', rejected: '#DC2626' };
                const active = cidFilter === f;
                return (
                  <button key={f} onClick={() => setCidFilter(f)} style={{
                    padding: '7px 16px', borderRadius: 8, border: `1.5px solid ${active ? colors[f] : 'var(--lav-200)'}`,
                    background: active ? colors[f] : 'white', color: active ? 'white' : 'var(--slate2)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
                    fontFamily: "'DM Sans', sans-serif", textTransform: 'capitalize',
                  }}>
                    {f}
                    <span style={{ fontSize: 11, background: active ? 'rgba(255,255,255,0.25)' : 'var(--lav-50)', borderRadius: 99, padding: '1px 6px' }}>{counts[f]}</span>
                  </button>
                );
              })}
              <div style={{ flex: 1 }} />
              <button onClick={loadUsers} style={{ ...btnSm, background: 'var(--lav-50)', color: 'var(--lav-600)', border: '1px solid var(--lav-200)', padding: '7px 16px' }}>
                ↻ Refresh
              </button>
            </div>

            {/* Cards grid */}
            {(() => {
              const filtered = cidFilter === 'all'
                ? dbUsers.filter(u => u.cid_status && u.cid_status !== 'none')
                : dbUsers.filter(u => u.cid_status === cidFilter);

              if (filtered.length === 0) {
                return (
                  <div style={{ background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-sm)', padding: '48px 24px', textAlign: 'center' }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🪪</div>
                    <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--ink)', margin: '0 0 6px' }}>No {cidFilter === 'all' ? '' : cidFilter} submissions</p>
                    <p style={{ fontSize: 14, color: 'var(--slate3)', margin: 0 }}>
                      {cidFilter === 'pending' ? 'All caught up — no verifications waiting.' : `No ${cidFilter} CID submissions yet.`}
                    </p>
                  </div>
                );
              }

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: 16 }}>
                  {filtered.map(u => {
                    const isPending  = u.cid_status === 'pending';
                    const isVerified = u.cid_status === 'verified';
                    const statusColor = isVerified ? '#16A34A' : isPending ? '#D97706' : '#DC2626';
                    const statusBg    = isVerified ? '#F0FDF4' : isPending ? '#FFFBEB' : '#FEF2F2';
                    const statusBorder= isVerified ? '#86EFAC' : isPending ? '#FDE68A' : '#FECACA';
                    const statusLabel = isVerified ? '✓ Verified' : isPending ? '⏳ Pending' : '✗ Rejected';

                    return (
                      <div key={u.id} style={{ background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-sm)', border: `1.5px solid ${isPending ? '#FDE68A' : 'var(--lav-100)'}`, overflow: 'hidden' }}>
                        {/* Card header */}
                        <div style={{ padding: '16px 18px 14px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--lav-100)' }}>
                          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #8B6FE8, #7254CC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white', flexShrink: 0, overflow: 'hidden' }}>
                            {u.avatar_url
                              ? <img src={u.avatar_url} alt={u.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              : u.full_name.charAt(0).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.full_name}</p>
                            <p style={{ fontSize: 12, color: 'var(--slate3)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</p>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 99, background: statusBg, color: statusColor, border: `1px solid ${statusBorder}`, flexShrink: 0 }}>
                            {statusLabel}
                          </span>
                        </div>

                        {/* CID document photo */}
                        <div style={{ padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                          <div style={{ flexShrink: 0 }}>
                            {u.cid_doc_url ? (
                              <a href={u.cid_doc_url} target="_blank" rel="noreferrer" title="Open full document">
                                <img
                                  src={u.cid_doc_url}
                                  alt="CID document"
                                  style={{ width: 110, height: 76, objectFit: 'cover', borderRadius: 10, border: '1.5px solid var(--lav-200)', display: 'block' }}
                                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                                />
                                <p style={{ fontSize: 10, color: 'var(--lav-500)', textAlign: 'center', margin: '4px 0 0', textDecoration: 'underline' }}>View full size</p>
                              </a>
                            ) : (
                              <div style={{ width: 110, height: 76, borderRadius: 10, background: 'var(--lav-50)', border: '1.5px dashed var(--lav-200)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                                <span style={{ fontSize: 22 }}>🪪</span>
                                <span style={{ fontSize: 10, color: 'var(--slate3)' }}>No photo</span>
                              </div>
                            )}
                          </div>
                          <div style={{ flex: 1 }}>
                            <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>CID Number</p>
                            <p style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 17, color: 'var(--ink)', letterSpacing: '0.1em', margin: '0 0 10px' }}>{u.cid_number ?? '—'}</p>
                            <p style={{ fontSize: 11, color: 'var(--slate3)', margin: '0 0 2px' }}>
                              Submitted: {u.created_at ? new Date(u.created_at).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                            </p>
                            <p style={{ fontSize: 11, color: 'var(--slate3)', margin: 0, textTransform: 'capitalize' }}>Role: {u.role}</p>
                          </div>
                        </div>

                        {/* Action buttons — only for pending */}
                        {isPending && (
                          <div style={{ padding: '0 18px 16px', display: 'flex', gap: 10 }}>
                            <button
                              onClick={() => approveCid(u.id)}
                              style={{ flex: 1, padding: '9px 0', background: '#16A34A', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => rejectCid(u.id)}
                              style={{ flex: 1, padding: '9px 0', background: 'white', color: '#DC2626', border: '1.5px solid #FECACA', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── ANALYTICS TAB ── */}
        {tab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Platform Metrics row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14 }}>
              {[
                { label: 'Live Listings', value: stats.total - stats.pending, accent: 'var(--lav-500)', bg: 'var(--lav-50)', border: 'var(--lav-200)' },
                { label: 'Pending Review', value: stats.pending, accent: '#F97316', bg: '#FFF7ED', border: '#FED7AA' },
                { label: 'Total Users', value: stats.users, accent: '#16A34A', bg: '#F0FDF4', border: '#86EFAC' },
                { label: 'Open Reports', value: stats.reports, accent: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
                { label: 'CID Verified', value: dbUsers.filter(u => u.cid_status === 'verified').length, accent: '#7254CC', bg: '#F5F3FF', border: '#C4B5FD' },
                { label: 'CID Pending', value: dbUsers.filter(u => u.cid_status === 'pending').length, accent: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
              ].map(m => (
                <div key={m.label} style={{ background: m.bg, borderRadius: 14, border: `1.5px solid ${m.border}`, padding: '16px 18px' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--slate3)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>{m.label}</p>
                  <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: m.accent, lineHeight: 1, margin: 0 }}>{m.value}</p>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              {/* Listings by City chart */}
              <div style={{ background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-sm)', padding: 24 }}>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--ink)', margin: '0 0 20px' }}>Listings by City</h3>
                {analyticsLoading ? (
                  <p style={{ color: 'var(--slate3)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Loading…</p>
                ) : cityCounts.length === 0 ? (
                  <p style={{ color: 'var(--slate3)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No live listings yet.</p>
                ) : (
                  <BarChart data={cityCounts.map(c => ({ label: c.city, value: c.count }))} color="var(--lav-500)" />
                )}
              </div>

              {/* Property types chart */}
              <div style={{ background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-sm)', padding: 24 }}>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--ink)', margin: '0 0 20px' }}>Property Types</h3>
                {analyticsLoading ? (
                  <p style={{ color: 'var(--slate3)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Loading…</p>
                ) : typeCounts.length === 0 ? (
                  <p style={{ color: 'var(--slate3)', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>No live listings yet.</p>
                ) : (
                  <BarChart data={typeCounts.map(c => ({ label: c.type, value: c.count }))} color="#7254CC" />
                )}
              </div>

              {/* CID verification breakdown */}
              <div style={{ background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-sm)', padding: 24 }}>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--ink)', margin: '0 0 20px' }}>CID Verification Status</h3>
                <BarChart
                  data={[
                    { label: 'Verified', value: dbUsers.filter(u => u.cid_status === 'verified').length },
                    { label: 'Pending', value: dbUsers.filter(u => u.cid_status === 'pending').length },
                    { label: 'Rejected', value: dbUsers.filter(u => u.cid_status === 'rejected').length },
                    { label: 'Not Submitted', value: dbUsers.filter(u => !u.cid_status || u.cid_status === 'none').length },
                  ]}
                  color="#16A34A"
                />
              </div>

              {/* User roles */}
              <div style={{ background: '#1E1B2E', borderRadius: 16, padding: 24 }}>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'white', margin: '0 0 20px' }}>User Roles</h3>
                <BarChart
                  data={[
                    { label: 'Tenants', value: dbUsers.filter(u => u.role === 'tenant').length },
                    { label: 'Owners', value: dbUsers.filter(u => u.role === 'owner').length },
                    { label: 'Admins', value: dbUsers.filter(u => u.role === 'admin').length },
                  ]}
                  color="#C4B5FD"
                  dark
                />
              </div>
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

    {/* Suspend confirm dialog */}

    {suspendConfirm && (
      <ConfirmDialog
        title={suspendConfirm.suspended ? `Reinstate ${suspendConfirm.full_name}?` : `Suspend ${suspendConfirm.full_name}?`}
        message={suspendConfirm.suspended
          ? `This will restore ${suspendConfirm.full_name}'s access to DrukNest.`
          : `This will prevent ${suspendConfirm.full_name} from logging in or making new inquiries.`
        }
        confirmLabel={suspendConfirm.suspended ? 'Reinstate' : 'Suspend'}
        danger={!suspendConfirm.suspended}
        onConfirm={() => toggleSuspend(suspendConfirm)}
        onCancel={() => setSuspendConfirm(null)}
      />
    )}
  </>
  );
}

/* ── Sub-components ── */

function BarChart({ data, color, dark }: { data: { label: string; value: number }[]; color: string; dark?: boolean }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {data.map(d => (
        <div key={d.label}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: dark ? 'rgba(255,255,255,0.7)' : 'var(--slate2)', fontWeight: 500 }}>{d.label}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: dark ? 'white' : 'var(--ink)' }}>{d.value}</span>
          </div>
          <div style={{ background: dark ? 'rgba(255,255,255,0.1)' : 'var(--lav-100)', borderRadius: 99, height: 10, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 99,
              background: color,
              width: `${(d.value / max) * 100}%`,
              transition: 'width 0.6s ease',
              minWidth: d.value > 0 ? 6 : 0,
            }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatCard({ label, value, accent, bg, border }: { label: string; value: number | string; accent: string; bg: string; border: string }) {
  return (
    <div style={{ background: bg, borderRadius: 14, border: `1.5px solid ${border}`, padding: '18px 20px', boxShadow: 'var(--shadow-sm)' }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</p>
      <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: accent, lineHeight: 1 }}>{value}</p>
    </div>
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
