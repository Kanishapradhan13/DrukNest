import React, { useEffect, useState } from 'react';
import type { Listing, Inquiry, Lease } from '../lib/types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../components/Icons';
import Thumb from '../components/Thumb';
import ChatModal from '../components/ChatModal';

interface OwnerDashboardProps {
  setView: (v: string) => void;
  onEditListing: (listing: Listing) => void;
}


/* ─── Helpers ───────────────────────────────────────────────── */
function avatarLetter(name: string) {
  return name.charAt(0).toUpperCase();
}

function formatRent(n: number) {
  return `Nu ${n.toLocaleString('en-IN')}`;
}

/* ─── Lease Detail Modal ────────────────────────────────────── */
function LeaseModal({
  lease,
  onClose,
}: {
  lease: Lease | null;
  onClose: () => void;
}) {
  if (!lease) return null;
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(30,27,46,0.55)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: 20,
          padding: '32px 36px',
          minWidth: 360,
          maxWidth: 480,
          boxShadow: 'var(--shadow-xl)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 24,
          }}
        >
          <h3
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 22,
              color: 'var(--ink)',
            }}
          >
            Lease Details
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'var(--lav-100)',
              border: 'none',
              borderRadius: 8,
              width: 32,
              height: 32,
              cursor: 'pointer',
              fontSize: 18,
              color: 'var(--slate)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            fontSize: 14,
            color: 'var(--slate)',
          }}
        >
          {[
            ['Tenant', lease.tenant?.full_name ?? 'Unknown'],
            ['Property', lease.listing?.title ?? 'Unknown Property'],
            ['Duration', `${lease.start_date} – ${lease.end_date}`],
            ['Monthly Rent', formatRent(lease.monthly_rent)],
            ['Status', lease.status.charAt(0).toUpperCase() + lease.status.slice(1)],
          ].map(([label, value]) => (
            <div
              key={label}
              style={{ display: 'flex', justifyContent: 'space-between' }}
            >
              <span style={{ color: 'var(--slate3)', fontWeight: 500 }}>
                {label}
              </span>
              <span
                style={{
                  fontWeight: 600,
                  color:
                    label === 'Status'
                      ? lease.status === 'active'
                        ? '#2D8A5E'
                        : 'var(--slate2)'
                      : 'var(--ink)',
                }}
              >
                {value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function OwnerDashboard({ setView, onEditListing }: OwnerDashboardProps) {
  const { user, profile } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [activeTab, setActiveTab] = useState<'listings' | 'inquiries' | 'leases'>('listings');
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [chatInquiry, setChatInquiry] = useState<Inquiry | null>(null);

  /* Fetch owner data on mount */
  useEffect(() => {
    async function load() {
      if (!user) return;
      try {
        const { data: lData } = await supabase
          .from('listings')
          .select('*')
          .eq('owner_id', user.id);
        if (lData) setListings(lData as Listing[]);

        const { data: iData } = await supabase
          .from('inquiries')
          .select('*, sender:profiles!sender_id(*), listing:listings(*)')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });
        if (iData) setInquiries(iData as Inquiry[]);

        const { data: leData } = await supabase
          .from('leases')
          .select('*, tenant:profiles!tenant_id(*), listing:listings(*)')
          .eq('owner_id', user.id)
          .order('created_at', { ascending: false });
        if (leData) setLeases(leData as Lease[]);
      } catch {
        /* silent */
      }
    }
    load();
  }, [user]);

  async function unpublish(id: string) {
    try {
      await supabase
        .from('listings')
        .update({ status: 'unpublished' })
        .eq('id', id);
      setListings((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status: 'unpublished' } : l))
      );
    } catch {
      /* silent */
    }
  }

  async function deleteListing(id: string) {
    if (!window.confirm('Are you sure you want to delete this listing? This cannot be undone.')) return;
    try {
      await supabase.from('listings').delete().eq('id', id);
      setListings((prev) => prev.filter((l) => l.id !== id));
    } catch {
      /* silent */
    }
  }

  async function acceptInquiry(inq: Inquiry) {
    try {
      await supabase.from('inquiries').update({ accepted: true }).eq('id', inq.id);
      setInquiries((prev) => prev.map((i) => i.id === inq.id ? { ...i, accepted: true } : i));
      setChatInquiry({ ...inq, accepted: true });
    } catch {
      /* silent */
    }
  }

  const ownerName = profile?.full_name ?? profile?.display_name ?? 'Owner';
  const ownerInitial = avatarLetter(ownerName);
  const listingCount = listings.length;

  /* ── Sub-tab counts ── */
  const inquiryCount = inquiries.length;
  const leaseCount = leases.length;

  /* ── Shared styles ── */
  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 18px',
    borderRadius: 20,
    border: 'none',
    background: active ? '#fff' : 'transparent',
    color: active ? 'var(--lav-500)' : 'var(--slate2)',
    fontWeight: active ? 600 : 500,
    fontSize: 13.5,
    cursor: 'pointer',
    boxShadow: active ? 'var(--shadow-sm)' : 'none',
    transition: 'all 0.18s',
    whiteSpace: 'nowrap' as const,
  });

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    borderRadius: 16,
    padding: '20px 24px',
    boxShadow: 'var(--shadow-sm)',
  };

  return (
    <div
      style={{
        paddingTop: 66,
        minHeight: '100vh',
        background: 'var(--lav-50)',
      }}
    >
      {/* Sub-header */}
      <div
        style={{
          background: '#fff',
          borderBottom: '1.5px solid var(--lav-100)',
          padding: '14px 40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Avatar */}
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--lav-300), var(--lav-600))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 700,
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            {ownerInitial}
          </div>
          <div>
            <div
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 18,
                color: 'var(--ink)',
                lineHeight: 1.2,
              }}
            >
              {ownerName}
            </div>
            <div
              style={{
                fontSize: 12.5,
                color: 'var(--slate2)',
                marginTop: 2,
              }}
            >
              Verified Owner ·{' '}
              <span style={{ color: 'var(--lav-500)', fontWeight: 600 }}>
                {listingCount} listing{listingCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        {/* Tabs pill group */}
        <div
          style={{
            display: 'flex',
            background: 'var(--lav-100)',
            borderRadius: 24,
            padding: 4,
            gap: 2,
            marginBottom: 28,
            width: 'fit-content',
            flexWrap: 'wrap',
          }}
        >
          <button
            style={tabBtnStyle(activeTab === 'listings')}
            onClick={() => setActiveTab('listings')}
          >
            My Listings{' '}
            <span
              style={{
                background: 'var(--lav-200)',
                color: 'var(--lav-600)',
                borderRadius: 99,
                padding: '1px 7px',
                fontSize: 12,
                marginLeft: 4,
                fontWeight: 700,
              }}
            >
              {listingCount}
            </span>
          </button>
          <button
            style={tabBtnStyle(activeTab === 'inquiries')}
            onClick={() => setActiveTab('inquiries')}
          >
            Inquiries{' '}
            <span
              style={{
                background: 'var(--lav-200)',
                color: 'var(--lav-600)',
                borderRadius: 99,
                padding: '1px 7px',
                fontSize: 12,
                marginLeft: 4,
                fontWeight: 700,
              }}
            >
              {inquiryCount}
            </span>
          </button>
          <button
            style={tabBtnStyle(activeTab === 'leases')}
            onClick={() => setActiveTab('leases')}
          >
            Leases{' '}
            <span
              style={{
                background: 'var(--lav-200)',
                color: 'var(--lav-600)',
                borderRadius: 99,
                padding: '1px 7px',
                fontSize: 12,
                marginLeft: 4,
                fontWeight: 700,
              }}
            >
              {leaseCount}
            </span>
          </button>
        </div>

        {/* ── My Listings Tab ─────────────────────────────────── */}
        {activeTab === 'listings' && (
          <>
            {listings.length === 0 ? (
              <div
                style={{
                  ...cardStyle,
                  textAlign: 'center',
                  padding: '64px 40px',
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    background: 'var(--lav-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}
                >
                  <Icon type="home" size={28} />
                </div>
                <div
                  style={{
                    fontFamily: "'DM Serif Display', serif",
                    fontSize: 20,
                    color: 'var(--ink)',
                    marginBottom: 8,
                  }}
                >
                  No listings yet
                </div>
                <div
                  style={{
                    color: 'var(--slate2)',
                    fontSize: 14,
                    marginBottom: 20,
                  }}
                >
                  Start earning by listing your first property on DrukNest.
                </div>
                <button
                  onClick={() => setView('add-property')}
                  style={{
                    background: 'var(--lav-500)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 12,
                    padding: '11px 24px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  + Add Your First Listing
                </button>
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 16,
                }}
              >
                {listings.map((listing) => (
                  <div
                    key={listing.id}
                    style={{
                      ...cardStyle,
                      display: 'flex',
                      gap: 16,
                      alignItems: 'flex-start',
                    }}
                  >
                    {/* Thumb */}
                    <div
                      style={{
                        width: 120,
                        height: 90,
                        borderRadius: 10,
                        overflow: 'hidden',
                        flexShrink: 0,
                      }}
                    >
                      <Thumb
                        pal={listing.pal as [string, string]}
                        h={90}
                        style={{ borderRadius: 10 }}
                        imageUrl={listing.photo_urls?.[0]}
                      />
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          marginBottom: 4,
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            fontWeight: 600,
                            fontSize: 15,
                            color: 'var(--ink)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: 200,
                          }}
                        >
                          {listing.title}
                        </span>
                        <span
                          style={{
                            padding: '2px 9px',
                            borderRadius: 99,
                            fontSize: 11,
                            fontWeight: 700,
                            background:
                              listing.status === 'live'
                                ? '#E5F8EF'
                                : listing.status === 'pending'
                                ? '#FFF3E0'
                                : 'var(--lav-100)',
                            color:
                              listing.status === 'live'
                                ? '#2D8A5E'
                                : listing.status === 'pending'
                                ? '#E8956F'
                                : 'var(--slate2)',
                          }}
                        >
                          {listing.status === 'live'
                            ? 'Live'
                            : listing.status === 'pending'
                            ? 'Pending'
                            : listing.status === 'unpublished'
                            ? 'Unpublished'
                            : listing.status}
                        </span>
                      </div>
                      <div
                        style={{
                          fontSize: 13,
                          color: 'var(--slate3)',
                          marginBottom: 4,
                        }}
                      >
                        {listing.location}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 700,
                          color: 'var(--lav-500)',
                          marginBottom: 10,
                        }}
                      >
                        {formatRent(listing.price)}/mo
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => onEditListing(listing)}
                          style={{
                            background: 'var(--lav-100)',
                            color: 'var(--lav-600)',
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 14px',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Edit
                        </button>
                        {listing.status !== 'unpublished' && (
                          <button
                            onClick={() => unpublish(listing.id)}
                            style={{
                              background: '#FFF3E0',
                              color: '#E8956F',
                              border: 'none',
                              borderRadius: 8,
                              padding: '6px 14px',
                              fontSize: 13,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Unpublish
                          </button>
                        )}
                        <button
                          onClick={() => deleteListing(listing.id)}
                          style={{
                            background: '#FEE2E2',
                            color: '#DC2626',
                            border: 'none',
                            borderRadius: 8,
                            padding: '6px 14px',
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── Inquiries Tab ───────────────────────────────────── */}
        {activeTab === 'inquiries' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {inquiries.length === 0 ? (
              <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px', color: 'var(--slate2)', fontSize: 14 }}>
                No inquiries yet.
              </div>
            ) : inquiries.map((inq) => {
              const tenantName = inq.sender?.full_name ?? 'Unknown';
              const listingTitle = inq.listing?.title ?? 'Unknown Property';
              const date = new Date(inq.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              return (
                <div key={inq.id} style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                    <div
                      style={{
                        width: 42, height: 42, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--lav-200), var(--lav-400))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 17, flexShrink: 0,
                      }}
                    >
                      {avatarLetter(tenantName)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, marginBottom: 2 }}>
                        <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>{tenantName}</span>
                        <span style={{ fontSize: 12, color: 'var(--slate3)' }}>{date}</span>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--lav-500)', fontWeight: 600, marginBottom: 6 }}>{listingTitle}</div>
                      <div style={{ fontSize: 14, color: 'var(--slate)', marginBottom: 12, lineHeight: 1.5 }}>{inq.message}</div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {inq.accepted ? (
                          <button
                            onClick={() => setChatInquiry(inq)}
                            style={{ background: 'var(--lav-500)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
                          >
                            💬 Open Chat
                          </button>
                        ) : (
                          <button
                            onClick={() => acceptInquiry(inq)}
                            style={{ background: '#E5F8EF', color: '#2D8A5E', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                          >
                            ✓ Accept & Chat
                          </button>
                        )}
                        <span style={{ fontSize: 11, color: 'var(--slate3)', padding: '3px 8px', background: inq.accepted ? '#E5F8EF' : 'var(--lav-50)', borderRadius: 99, border: '1px solid var(--lav-200)' }}>
                          {inq.accepted ? 'Accepted' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Leases Tab ──────────────────────────────────────── */}
        {activeTab === 'leases' && (
          leases.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px', color: 'var(--slate2)', fontSize: 14 }}>
              No leases yet.
            </div>
          ) : (
            <div style={{ ...cardStyle, padding: 0, overflow: 'hidden', borderRadius: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: 'var(--lav-50)', borderBottom: '1.5px solid var(--lav-100)' }}>
                    {['Tenant', 'Property', 'Duration', 'Monthly Rent', 'Status', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontWeight: 600, fontSize: 12.5, color: 'var(--slate2)', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leases.map((lease, idx) => (
                    <tr key={lease.id} style={{ borderBottom: idx < leases.length - 1 ? '1px solid var(--lav-100)' : 'none' }}>
                      <td style={{ padding: '14px 20px', fontWeight: 600, color: 'var(--ink)' }}>{lease.tenant?.full_name ?? '—'}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--slate)' }}>{lease.listing?.title ?? '—'}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--slate2)', fontSize: 13 }}>{lease.start_date} – {lease.end_date}</td>
                      <td style={{ padding: '14px 20px', color: 'var(--lav-500)', fontWeight: 700 }}>{formatRent(lease.monthly_rent)}</td>
                      <td style={{ padding: '14px 20px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: lease.status === 'active' ? '#E5F8EF' : 'var(--lav-100)', color: lease.status === 'active' ? '#2D8A5E' : 'var(--slate2)' }}>
                          {lease.status.charAt(0).toUpperCase() + lease.status.slice(1)}
                        </span>
                      </td>
                      <td style={{ padding: '14px 20px' }}>
                        <button
                          onClick={() => setSelectedLease(lease)}
                          style={{ background: 'var(--lav-100)', color: 'var(--lav-600)', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

      </div>

      {/* Lease detail modal */}
      {selectedLease && (
        <LeaseModal
          lease={selectedLease}
          onClose={() => setSelectedLease(null)}
        />
      )}

      {/* Chat modal */}
      {chatInquiry && user && (
        <ChatModal
          inquiryId={chatInquiry.id}
          inquiryMessage={chatInquiry.message}
          currentUserId={user.id}
          otherUserName={chatInquiry.sender?.full_name ?? 'Tenant'}
          listingTitle={chatInquiry.listing?.title ?? 'Property'}
          onClose={() => setChatInquiry(null)}
        />
      )}
    </div>
  );
}
