import React, { useEffect, useState } from 'react';
import type { Listing, Inquiry, Lease, RentPayment, Profile } from '../lib/types';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Home as HomeIcon, MapPin } from 'lucide-react';
import Thumb from '../components/Thumb';
import ChatModal from '../components/ChatModal';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../contexts/ToastContext';

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
            ...(lease.deposit_amount ? [['Security Deposit', formatRent(lease.deposit_amount)]] : []),
            ...(lease.notes ? [['Notes', lease.notes]] : []),
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

/* ─── Create Lease Modal ─────────────────────────────────────── */
function CreateLeaseModal({
  inquiry,
  onClose,
  onCreated,
}: {
  inquiry: Inquiry;
  onClose: () => void;
  onCreated: () => void;
}) {
  const listing = inquiry.listing as Listing | undefined;
  const today = new Date().toISOString().split('T')[0];
  const oneYearLater = new Date();
  oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
  const defaultEnd = oneYearLater.toISOString().split('T')[0];

  const [startDate, setStartDate] = React.useState(today);
  const [endDate, setEndDate]     = React.useState(defaultEnd);
  const [rent, setRent]           = React.useState(listing?.price?.toString() ?? '');
  const [deposit, setDeposit]     = React.useState(listing?.deposit?.toString() ?? '0');
  const [notes, setNotes]         = React.useState('');
  const [saving, setSaving]       = React.useState(false);
  const [error, setError]         = React.useState('');

  /* Count months between two date strings */
  function monthsBetween(start: string, end: string) {
    const s = new Date(start);
    const e = new Date(end);
    return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  }

  async function handleCreate() {
    if (!startDate || !endDate) { setError('Start and end dates are required.'); return; }
    if (new Date(endDate) <= new Date(startDate)) { setError('End date must be after start date.'); return; }
    if (!rent || Number(rent) <= 0) { setError('Monthly rent is required.'); return; }
    setSaving(true);
    setError('');
    try {
      /* 1. Insert lease */
      const { data: leaseData, error: leaseErr } = await supabase
        .from('leases')
        .insert({
          owner_id: inquiry.owner_id,
          tenant_id: inquiry.sender_id,
          listing_id: inquiry.listing_id,
          inquiry_id: inquiry.id,
          start_date: startDate,
          end_date: endDate,
          monthly_rent: Number(rent),
          deposit_amount: Number(deposit) || 0,
          notes: notes.trim() || null,
          status: 'active',
        })
        .select()
        .single();
      if (leaseErr || !leaseData) { setError(leaseErr?.message ?? 'Failed to create lease.'); setSaving(false); return; }

      /* 2. Auto-generate monthly payment schedule */
      const months = monthsBetween(startDate, endDate);
      const payments = [];
      for (let i = 0; i < months; i++) {
        const d = new Date(startDate);
        d.setMonth(d.getMonth() + i);
        const due = d.toISOString().split('T')[0];
        const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        payments.push({
          lease_id: leaseData.id,
          tenant_id: inquiry.sender_id,
          owner_id: inquiry.owner_id,
          due_date: due,
          amount: Number(rent),
          status: 'unpaid',
          month_label: monthLabel,
        });
      }
      if (payments.length > 0) {
        await supabase.from('rent_payments').insert(payments);
      }

      /* 3. Notify tenant */
      await supabase.from('notifications').insert({
        user_id: inquiry.sender_id,
        type: 'lease_created',
        title: 'Lease Agreement Created!',
        body: `Your lease for "${listing?.title ?? 'the property'}" has been created. Check your Payments tab to see the schedule.`,
        link_view: 'dashboard',
      });

      onCreated();
      onClose();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
      setSaving(false);
    }
  }

  const months = startDate && endDate ? monthsBetween(startDate, endDate) : 0;
  const inputSt: React.CSSProperties = {
    width: '100%', border: '1.5px solid var(--lav-200)', borderRadius: 10,
    padding: '10px 14px', fontSize: 14, fontFamily: "'DM Sans', sans-serif",
    outline: 'none', color: 'var(--ink)', background: '#fff',
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(30,27,46,0.6)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
      onClick={onClose}
    >
      <div
        style={{ background: '#fff', borderRadius: 20, padding: '32px 36px', width: '100%', maxWidth: 500, boxShadow: 'var(--shadow-xl)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--ink)' }}>Create Lease</h3>
          <button onClick={onClose} style={{ background: 'var(--lav-100)', border: 'none', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: 'var(--slate)' }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--slate3)', marginBottom: 24 }}>
          For <strong style={{ color: 'var(--lav-600)' }}>{inquiry.sender?.full_name ?? 'Tenant'}</strong> · {listing?.title ?? 'Property'}
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Start Date *</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputSt} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>End Date *</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} style={inputSt} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Monthly Rent (Nu) *</label>
              <input type="number" value={rent} onChange={e => setRent(e.target.value)} placeholder="e.g. 12000" style={inputSt} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Security Deposit (Nu)</label>
              <input type="number" value={deposit} onChange={e => setDeposit(e.target.value)} placeholder="e.g. 24000" style={inputSt} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--slate2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Notes (optional)</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Any special conditions…" style={{ ...inputSt, height: 'auto', resize: 'vertical', padding: '10px 14px', lineHeight: 1.5 }} />
          </div>

          {/* Preview */}
          {months > 0 && (
            <div style={{ background: 'var(--lav-50)', border: '1.5px solid var(--lav-200)', borderRadius: 12, padding: '14px 18px', fontSize: 13, color: 'var(--slate2)' }}>
              <span style={{ fontWeight: 700, color: 'var(--ink)' }}>{months} monthly payments</span> of{' '}
              <span style={{ fontWeight: 700, color: 'var(--lav-600)' }}>Nu {Number(rent || 0).toLocaleString()}</span> will be auto-generated.
              {Number(deposit) > 0 && <> · Deposit: <strong>Nu {Number(deposit).toLocaleString()}</strong></>}
            </div>
          )}

          {error && <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>{error}</p>}

          <button
            onClick={handleCreate}
            disabled={saving}
            style={{ background: 'var(--lav-500)', color: '#fff', border: 'none', borderRadius: 11, padding: '12px 0', fontSize: 15, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1, fontFamily: "'DM Sans', sans-serif" }}
          >
            {saving ? 'Creating…' : '✓ Create Lease & Generate Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function OwnerDashboard({ setView, onEditListing }: OwnerDashboardProps) {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [listings, setListings] = useState<Listing[]>([]);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [payments, setPayments] = useState<(RentPayment & { tenant?: { full_name: string; avatar_url?: string }; lease?: Lease & { listing?: { title: string } } })[]>([]);
  const [activeTab, setActiveTab] = useState<'listings' | 'inquiries' | 'leases' | 'payments' | 'chats'>('listings');
  const [selectedLease, setSelectedLease] = useState<Lease | null>(null);
  const [chatInquiry, setChatInquiry] = useState<Inquiry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Listing | null>(null);
  const [createLeaseInquiry, setCreateLeaseInquiry] = useState<Inquiry | null>(null);
  const [paymentApt, setPaymentApt] = useState<string | null>(null);
  const [paymentTenantId, setPaymentTenantId] = useState<string | null>(null);
  const [inquiryListingId, setInquiryListingId] = useState<string | null>(null);
  const [leaseListingId, setLeaseListingId] = useState<string | null>(null);
  const [leaseTenantId, setLeaseTenantId] = useState<string | null>(null);

  async function load() {
    if (!user) return;
    try {
      const { data: lData } = await supabase.from('listings').select('*').eq('owner_id', user.id);
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

      const { data: payData } = await supabase
        .from('rent_payments')
        .select('*, tenant:profiles!tenant_id(full_name, avatar_url), lease:leases(listing_id, listing:listings(title))')
        .eq('owner_id', user.id)
        .order('due_date', { ascending: false })
        .limit(50);
      if (payData) setPayments(payData as (RentPayment & { tenant?: { full_name: string; avatar_url?: string }; lease?: Lease & { listing?: { title: string } } })[]);
    } catch { /* silent */ }
  }

  /* Fetch owner data on mount */
  useEffect(() => {
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function togglePublish(listing: Listing) {
    const newStatus = listing.status === 'unpublished' ? 'pending' : 'unpublished';
    const label = newStatus === 'unpublished' ? 'unpublished' : 'resubmitted for review';
    const { error } = await supabase.from('listings').update({ status: newStatus }).eq('id', listing.id);
    if (!error) {
      setListings(prev => prev.map(l => l.id === listing.id ? { ...l, status: newStatus as Listing['status'] } : l));
      toast(`Listing ${label}`, newStatus === 'unpublished' ? 'info' : 'success');
    }
  }

  async function doDeleteListing() {
    if (!deleteTarget) return;
    const { error } = await supabase.from('listings').delete().eq('id', deleteTarget.id);
    if (!error) {
      setListings(prev => prev.filter(l => l.id !== deleteTarget.id));
      toast('Listing deleted');
    } else {
      toast('Failed to delete listing', 'error');
    }
    setDeleteTarget(null);
  }

  async function acceptInquiry(inq: Inquiry) {
    try {
      await supabase.from('inquiries').update({ accepted: true }).eq('id', inq.id);
      setInquiries(prev => prev.map(i => i.id === inq.id ? { ...i, accepted: true } : i));
      setChatInquiry({ ...inq, accepted: true });
      if (inq.sender_id) {
        await supabase.from('notifications').insert({
          user_id: inq.sender_id, type: 'inquiry_accepted',
          title: 'Inquiry Accepted!',
          body: `Your inquiry for "${inq.listing?.title ?? 'a property'}" was accepted. You can now chat with the owner.`,
          link_view: 'dashboard',
        });
      }
      toast('Inquiry accepted — chat is open');
    } catch { /* silent */ }
  }

  async function declineInquiry(inq: Inquiry) {
    try {
      await supabase.from('inquiries').update({ declined: true }).eq('id', inq.id);
      setInquiries(prev => prev.map(i => i.id === inq.id ? { ...i, declined: true } : i));
      if (inq.sender_id) {
        await supabase.from('notifications').insert({
          user_id: inq.sender_id, type: 'inquiry_declined',
          title: 'Inquiry Update',
          body: `Your inquiry for "${inq.listing?.title ?? 'a property'}" was not accepted at this time.`,
          link_view: 'dashboard',
        });
      }
      toast('Inquiry declined', 'info');
    } catch { /* silent */ }
  }

  async function confirmPayment(paymentId: string) {
    const { error } = await supabase.from('rent_payments').update({ status: 'paid', owner_confirmed_at: new Date().toISOString() }).eq('id', paymentId);
    if (!error) {
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'paid' as const, owner_confirmed_at: new Date().toISOString() } : p));
      toast('Payment confirmed as received');
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
              width: 48, height: 48, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--lav-300), var(--lav-600))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 20, flexShrink: 0,
              overflow: 'hidden',
            }}
          >
            {profile?.avatar_url
              ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : ownerInitial}
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
            onClick={() => { setActiveTab('listings'); setPaymentApt(null); setPaymentTenantId(null); }}
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
            <span style={{ background: 'var(--lav-200)', color: 'var(--lav-600)', borderRadius: 99, padding: '1px 7px', fontSize: 12, marginLeft: 4, fontWeight: 700 }}>
              {leaseCount}
            </span>
          </button>
          <button
            style={tabBtnStyle(activeTab === 'payments')}
            onClick={() => setActiveTab('payments')}
          >
            Payments{' '}
            <span style={{ background: payments.filter(p => p.status === 'pending_confirmation').length > 0 ? '#FDE68A' : 'var(--lav-200)', color: payments.filter(p => p.status === 'pending_confirmation').length > 0 ? '#D97706' : 'var(--lav-600)', borderRadius: 99, padding: '1px 7px', fontSize: 12, marginLeft: 4, fontWeight: 700 }}>
              {payments.filter(p => p.status === 'pending_confirmation').length > 0 ? `${payments.filter(p => p.status === 'pending_confirmation').length} new` : payments.length}
            </span>
          </button>
          <button
            style={tabBtnStyle(activeTab === 'chats')}
            onClick={() => setActiveTab('chats')}
          >
            💬 Chats{' '}
            <span style={{ background: 'var(--lav-200)', color: 'var(--lav-600)', borderRadius: 99, padding: '1px 7px', fontSize: 12, marginLeft: 4, fontWeight: 700 }}>
              {inquiries.filter(i => i.accepted).length}
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
                  <HomeIcon size={28} strokeWidth={1.8} />
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
                      {/* Stats row */}
                      <div style={{ display: 'flex', gap: 12, marginBottom: 8 }}>
                        <span style={{ fontSize: 12, color: 'var(--slate3)' }}>👁 {listing.views ?? 0} views</span>
                        <span style={{ fontSize: 12, color: 'var(--slate3)' }}>📨 {inquiries.filter(i => i.listing_id === listing.id).length} inquiries</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button
                          onClick={() => onEditListing(listing)}
                          style={{ background: 'var(--lav-100)', color: 'var(--lav-600)', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                        >
                          Edit
                        </button>
                        {listing.status === 'live' && (
                          <button
                            onClick={() => togglePublish(listing)}
                            style={{ background: '#FFF3E0', color: '#E8956F', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Unpublish
                          </button>
                        )}
                        {listing.status === 'unpublished' && (
                          <button
                            onClick={() => togglePublish(listing)}
                            style={{ background: '#E5F8EF', color: '#2D8A5E', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                          >
                            Republish
                          </button>
                        )}
                        <button
                          onClick={() => setDeleteTarget(listing)}
                          style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
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
        {activeTab === 'inquiries' && (() => {
          if (inquiries.length === 0) return (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px', color: 'var(--slate2)', fontSize: 14 }}>No inquiries yet.</div>
          );

          /* Group inquiries by listing_id */
          const inqByListing = new Map<string, Inquiry[]>();
          inquiries.forEach(inq => {
            const lid = inq.listing_id;
            if (!inqByListing.has(lid)) inqByListing.set(lid, []);
            inqByListing.get(lid)!.push(inq);
          });

          /* ── LEVEL 2: Inquiry list for selected property ── */
          if (inquiryListingId) {
            const listInqs = inqByListing.get(inquiryListingId) ?? [];
            const propListing = listInqs[0]?.listing as Listing | undefined;
            const photo = propListing?.photo_urls?.[0];
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Back + property header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
                  <button onClick={() => setInquiryListingId(null)} style={{ background: 'var(--lav-100)', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: 'var(--lav-700)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
                  {photo && <img src={photo} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
                  <div>
                    <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: 'var(--ink)', margin: 0 }}>{propListing?.title ?? 'Property'}</p>
                    <p style={{ fontSize: 12, color: 'var(--slate3)', margin: 0 }}>{propListing?.city ?? ''} · {listInqs.length} inquiry{listInqs.length !== 1 ? 'ies' : 'y'}</p>
                  </div>
                </div>
                {listInqs.map((inq) => {
                  const tenantName = inq.sender?.full_name ?? 'Unknown';
                  const date = new Date(inq.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                  return (
                    <div key={inq.id} style={cardStyle}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, var(--lav-200), var(--lav-400))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 17, flexShrink: 0, overflow: 'hidden' }}>
                          {inq.sender?.avatar_url
                            ? <img src={inq.sender.avatar_url} alt={tenantName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : avatarLetter(tenantName)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{ fontWeight: 600, fontSize: 15, color: 'var(--ink)' }}>{tenantName}</span>
                              {inq.sender?.cid_status === 'verified' && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#F0FDF4', color: '#16A34A', border: '1px solid #86EFAC' }}>🪪 ID Verified</span>}
                              {inq.sender?.cid_status === 'pending' && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>⏳ ID Pending</span>}
                            </div>
                            <span style={{ fontSize: 12, color: 'var(--slate3)' }}>{date}</span>
                          </div>
                          <div style={{ fontSize: 14, color: 'var(--slate)', marginBottom: 12, lineHeight: 1.5 }}>{inq.message}</div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                            {inq.declined ? (
                              <span style={{ fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 99, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>✕ Declined</span>
                            ) : inq.accepted ? (
                              <>
                                <button onClick={() => setChatInquiry(inq)} style={{ background: 'var(--lav-500)', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>💬 Open Chat</button>
                                {!leases.some(l => l.inquiry_id === inq.id)
                                  ? <button onClick={() => setCreateLeaseInquiry(inq)} style={{ background: '#E5F8EF', color: '#2D8A5E', border: '1.5px solid #86EFAC', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>📋 Create Lease</button>
                                  : <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: '#F0FDF4', color: '#16A34A', border: '1px solid #86EFAC' }}>✓ Lease Created</span>}
                                <span style={{ fontSize: 11, color: 'var(--slate3)', padding: '3px 8px', background: '#E5F8EF', borderRadius: 99 }}>Accepted</span>
                              </>
                            ) : (
                              <>
                                <button onClick={() => acceptInquiry(inq)} style={{ background: '#E5F8EF', color: '#2D8A5E', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>✓ Accept & Chat</button>
                                <button onClick={() => declineInquiry(inq)} style={{ background: '#FEF2F2', color: '#DC2626', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>✕ Decline</button>
                                <span style={{ fontSize: 11, color: 'var(--slate3)', padding: '3px 8px', background: 'var(--lav-50)', borderRadius: 99, border: '1px solid var(--lav-200)' }}>Pending</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }

          /* ── LEVEL 1: Property cards ── */
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--slate3)', margin: 0 }}>Select a property to view its inquiries.</p>
              {Array.from(inqByListing.entries()).map(([lid, listInqs]) => {
                const propListing = listInqs[0]?.listing as Listing | undefined;
                const photo = propListing?.photo_urls?.[0];
                const pending = listInqs.filter(i => !i.accepted && !i.declined).length;
                const accepted = listInqs.filter(i => i.accepted).length;
                const declined = listInqs.filter(i => i.declined).length;
                return (
                  <div
                    key={lid}
                    onClick={() => setInquiryListingId(lid)}
                    style={{ background: 'white', borderRadius: 18, boxShadow: 'var(--shadow-sm)', border: '1.5px solid var(--lav-100)', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s, border-color 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--lav-300)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--lav-100)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'stretch', gap: 0 }}>
                      {/* Photo */}
                      <div style={{ width: 120, flexShrink: 0, background: 'linear-gradient(135deg, #1E1B2E, #3B2D6E)', position: 'relative', overflow: 'hidden' }}>
                        {photo
                          ? <img src={photo} alt={propListing?.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)' }}><HomeIcon size={32} strokeWidth={1.8} /></div>}
                      </div>
                      {/* Details */}
                      <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                        <div>
                          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: 'var(--ink)', margin: 0 }}>{propListing?.title ?? 'Property'}</p>
                          <p style={{ fontSize: 13, color: 'var(--slate3)', margin: '2px 0 0' }}>{propListing?.city ?? ''} · Nu {propListing?.price?.toLocaleString() ?? '—'}/mo · {propListing?.type ?? ''}</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {pending > 0 && <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>⏳ {pending} Pending</span>}
                          {accepted > 0 && <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#F0FDF4', color: '#16A34A', border: '1px solid #86EFAC' }}>✓ {accepted} Accepted</span>}
                          {declined > 0 && <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>✕ {declined} Declined</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', color: 'var(--lav-400)', fontSize: 20 }}>›</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ── Leases Tab ──────────────────────────────────────── */}
        {activeTab === 'leases' && (() => {
          if (leases.length === 0) return (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px', color: 'var(--slate2)', fontSize: 14 }}>No leases yet.</div>
          );

          /* Group leases by listing_id */
          const leaseByListing = new Map<string, Lease[]>();
          leases.forEach(l => {
            const lid = l.listing_id;
            if (!leaseByListing.has(lid)) leaseByListing.set(lid, []);
            leaseByListing.get(lid)!.push(l);
          });

          /* ── LEVEL 3: Lease detail for selected tenant ── */
          if (leaseListingId && leaseTenantId) {
            const lease = leases.find(l => l.listing_id === leaseListingId && l.tenant_id === leaseTenantId);
            if (!lease) return null;
            const propListing = lease.listing as Listing | undefined;
            const tenant = lease.tenant as (Profile & { avatar_url?: string }) | undefined;
            const photo = propListing?.photo_urls?.[0];
            const statusColors: Record<string, { bg: string; color: string }> = {
              active: { bg: '#E5F8EF', color: '#2D8A5E' },
              pending: { bg: '#FFFBEB', color: '#D97706' },
              expired: { bg: '#F1F5F9', color: '#64748B' },
              cancelled: { bg: '#FEF2F2', color: '#DC2626' },
            };
            const sc = statusColors[lease.status] ?? statusColors.pending;
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Breadcrumb back */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                  <button onClick={() => { setLeaseListingId(null); setLeaseTenantId(null); }} style={{ background: 'none', border: 'none', color: 'var(--lav-600)', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: "'DM Sans', sans-serif" }}>All Properties</button>
                  <span style={{ color: 'var(--slate4)' }}>›</span>
                  <button onClick={() => setLeaseTenantId(null)} style={{ background: 'none', border: 'none', color: 'var(--lav-600)', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: 0, fontFamily: "'DM Sans', sans-serif" }}>{propListing?.title ?? 'Property'}</button>
                  <span style={{ color: 'var(--slate4)' }}>›</span>
                  <span style={{ color: 'var(--slate)', fontWeight: 600 }}>{tenant?.full_name ?? 'Tenant'}</span>
                </div>
                {/* Lease detail card */}
                <div style={{ background: 'white', borderRadius: 18, boxShadow: 'var(--shadow-sm)', border: '1.5px solid var(--lav-100)', overflow: 'hidden' }}>
                  {/* Property banner */}
                  <div style={{ height: 100, position: 'relative', background: 'linear-gradient(135deg, #1E1B2E, #3B2D6E)', overflow: 'hidden' }}>
                    {photo && <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.7 }} />}
                    <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(30,27,46,0.7))' }} />
                    <div style={{ position: 'absolute', bottom: 12, left: 16 }}>
                      <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: '#fff', margin: 0 }}>{propListing?.title ?? '—'}</p>
                      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', margin: 0 }}>{propListing?.city ?? ''}</p>
                    </div>
                    <span style={{ position: 'absolute', top: 12, right: 14, fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: sc.bg, color: sc.color }}>
                      {lease.status.charAt(0).toUpperCase() + lease.status.slice(1)}
                    </span>
                  </div>
                  {/* Tenant row */}
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--lav-100)', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--lav-300), var(--lav-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0, overflow: 'hidden' }}>
                      {tenant?.avatar_url ? <img src={tenant.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : avatarLetter(tenant?.full_name ?? '?')}
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', margin: 0 }}>{tenant?.full_name ?? '—'}</p>
                      <p style={{ fontSize: 12, color: 'var(--slate3)', margin: 0 }}>{tenant?.email ?? ''}{tenant?.phone ? ` · 📞 ${tenant.phone}` : ''}</p>
                    </div>
                  </div>
                  {/* Lease details grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0 }}>
                    {[
                      { label: 'Move-in', value: lease.start_date },
                      { label: 'Move-out', value: lease.end_date },
                      { label: 'Monthly Rent', value: `Nu ${lease.monthly_rent.toLocaleString()}` },
                      { label: 'Deposit', value: lease.deposit_amount ? `Nu ${lease.deposit_amount.toLocaleString()}` : '—' },
                      { label: 'Deposit Paid', value: lease.deposit_paid ? '✓ Yes' : '✗ No' },
                      { label: 'Created', value: new Date(lease.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
                    ].map((row, i) => (
                      <div key={row.label} style={{ padding: '14px 18px', borderTop: '1px solid var(--lav-100)', borderRight: i % 3 !== 2 ? '1px solid var(--lav-100)' : 'none' }}>
                        <p style={{ fontSize: 11, color: 'var(--slate3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 4px' }}>{row.label}</p>
                        <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', margin: 0 }}>{row.value}</p>
                      </div>
                    ))}
                  </div>
                  {lease.notes && (
                    <div style={{ padding: '14px 20px', borderTop: '1px solid var(--lav-100)', fontSize: 13, color: 'var(--slate2)', lineHeight: 1.6 }}>
                      <p style={{ fontSize: 11, color: 'var(--slate3)', fontWeight: 600, textTransform: 'uppercase', margin: '0 0 4px' }}>Notes</p>
                      {lease.notes}
                    </div>
                  )}
                </div>
              </div>
            );
          }

          /* ── LEVEL 2: Tenants for selected property ── */
          if (leaseListingId) {
            const propLeases = leaseByListing.get(leaseListingId) ?? [];
            const propListing = propLeases[0]?.listing as Listing | undefined;
            const photo = propListing?.photo_urls?.[0];
            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 4 }}>
                  <button onClick={() => setLeaseListingId(null)} style={{ background: 'var(--lav-100)', border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 13, fontWeight: 600, color: 'var(--lav-700)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>← Back</button>
                  {photo && <img src={photo} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />}
                  <div>
                    <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: 'var(--ink)', margin: 0 }}>{propListing?.title ?? 'Property'}</p>
                    <p style={{ fontSize: 12, color: 'var(--slate3)', margin: 0 }}>{propListing?.city ?? ''} · {propLeases.length} tenant{propLeases.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                {propLeases.map(lease => {
                  const tenant = lease.tenant as (Profile & { avatar_url?: string }) | undefined;
                  const sc = lease.status === 'active' ? { bg: '#E5F8EF', color: '#2D8A5E' } : { bg: 'var(--lav-100)', color: 'var(--slate2)' };
                  return (
                    <div
                      key={lease.id}
                      onClick={() => setLeaseTenantId(lease.tenant_id)}
                      style={{ background: 'white', borderRadius: 14, boxShadow: 'var(--shadow-sm)', border: '1.5px solid var(--lav-100)', padding: '16px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 14, transition: 'box-shadow 0.2s, border-color 0.2s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--lav-300)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--lav-100)'; }}
                    >
                      <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg, var(--lav-300), var(--lav-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0, overflow: 'hidden' }}>
                        {tenant?.avatar_url ? <img src={tenant.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : avatarLetter(tenant?.full_name ?? '?')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', margin: 0 }}>{tenant?.full_name ?? '—'}</p>
                        <p style={{ fontSize: 12, color: 'var(--slate3)', margin: '2px 0 0' }}>{lease.start_date} → {lease.end_date} · Nu {lease.monthly_rent.toLocaleString()}/mo</p>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: sc.bg, color: sc.color, flexShrink: 0 }}>
                        {lease.status.charAt(0).toUpperCase() + lease.status.slice(1)}
                      </span>
                      <span style={{ color: 'var(--lav-400)', fontSize: 18 }}>›</span>
                    </div>
                  );
                })}
              </div>
            );
          }

          /* ── LEVEL 1: Property cards ── */
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <p style={{ fontSize: 13, color: 'var(--slate3)', margin: 0 }}>Select a property to view its leases.</p>
              {Array.from(leaseByListing.entries()).map(([lid, propLeases]) => {
                const propListing = propLeases[0]?.listing as Listing | undefined;
                const photo = propListing?.photo_urls?.[0];
                const active = propLeases.filter(l => l.status === 'active').length;
                const pending = propLeases.filter(l => l.status === 'pending').length;
                return (
                  <div
                    key={lid}
                    onClick={() => setLeaseListingId(lid)}
                    style={{ background: 'white', borderRadius: 18, boxShadow: 'var(--shadow-sm)', border: '1.5px solid var(--lav-100)', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s, border-color 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--lav-300)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--lav-100)'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'stretch' }}>
                      <div style={{ width: 120, flexShrink: 0, background: 'linear-gradient(135deg, #1E1B2E, #3B2D6E)', overflow: 'hidden' }}>
                        {photo
                          ? <img src={photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : <div style={{ width: '100%', height: '100%', minHeight: 90, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>🏠</div>}
                      </div>
                      <div style={{ flex: 1, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
                        <div>
                          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: 'var(--ink)', margin: 0 }}>{propListing?.title ?? 'Property'}</p>
                          <p style={{ fontSize: 13, color: 'var(--slate3)', margin: '2px 0 0' }}>{propListing?.city ?? ''} · Nu {propListing?.price?.toLocaleString() ?? '—'}/mo</p>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: 'var(--lav-100)', color: 'var(--lav-700)' }}>👥 {propLeases.length} tenant{propLeases.length !== 1 ? 's' : ''}</span>
                          {active > 0 && <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#E5F8EF', color: '#2D8A5E', border: '1px solid #86EFAC' }}>✓ {active} Active</span>}
                          {pending > 0 && <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>⏳ {pending} Pending</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', padding: '0 20px', color: 'var(--lav-400)', fontSize: 20 }}>›</div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ── Payments Tab ───────────────────────────────────── */}
        {activeTab === 'payments' && (() => {
          type PaymentRow = (typeof payments)[number];
          const getTitle = (p: PaymentRow) => (p.lease as (Lease & { listing?: { title: string } }) | undefined)?.listing?.title ?? 'Unknown Property';
          const statusColors: Record<string, { bg: string; color: string; border: string }> = {
            unpaid:               { bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1' },
            pending_confirmation: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
            paid:                 { bg: '#F0FDF4', color: '#16A34A', border: '#86EFAC' },
            overdue:              { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
          };

          /* ── Breadcrumb ── */
          const Breadcrumb = () => (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 13, color: 'var(--slate2)' }}>
              <button onClick={() => { setPaymentApt(null); setPaymentTenantId(null); }} style={{ background: 'none', border: 'none', cursor: paymentApt ? 'pointer' : 'default', color: paymentApt ? 'var(--lav-600)' : 'var(--slate)', fontWeight: 600, fontSize: 13, padding: 0, fontFamily: "'DM Sans', sans-serif" }}>
                All Properties
              </button>
              {paymentApt && <>
                <span style={{ color: 'var(--slate4)' }}>›</span>
                <button onClick={() => setPaymentTenantId(null)} style={{ background: 'none', border: 'none', cursor: paymentTenantId ? 'pointer' : 'default', color: paymentTenantId ? 'var(--lav-600)' : 'var(--slate)', fontWeight: 600, fontSize: 13, padding: 0, fontFamily: "'DM Sans', sans-serif", maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {paymentApt}
                </button>
              </>}
              {paymentTenantId && (() => {
                const t = payments.find(p => p.tenant_id === paymentTenantId)?.tenant;
                return <>
                  <span style={{ color: 'var(--slate4)' }}>›</span>
                  <span style={{ color: 'var(--slate)', fontWeight: 600 }}>{t?.full_name ?? 'Tenant'}</span>
                </>;
              })()}
            </div>
          );

          /* ── LEVEL 1: Apartments ── */
          if (!paymentApt) {
            const aptMap = new Map<string, PaymentRow[]>();
            payments.forEach(p => {
              const t = getTitle(p);
              if (!aptMap.has(t)) aptMap.set(t, []);
              aptMap.get(t)!.push(p);
            });
            const apts = Array.from(aptMap.entries());
            return (
              <div>
                <Breadcrumb />
                {apts.length === 0 ? (
                  <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px', color: 'var(--slate2)', fontSize: 14 }}>No payment records yet. They will appear once leases are active.</div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                    {apts.map(([title, aptPayments]) => {
                      const tenantIds = new Set(aptPayments.map(p => p.tenant_id));
                      const pending = aptPayments.filter(p => p.status === 'pending_confirmation').length;
                      const overdue = aptPayments.filter(p => p.status === 'overdue').length;
                      const listing = listings.find(l => l.title === title);
                      const thumb = listing?.photo_urls?.[0];
                      return (
                        <button key={title} onClick={() => setPaymentApt(title)} style={{ background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-sm)', border: '1.5px solid var(--lav-100)', overflow: 'hidden', cursor: 'pointer', textAlign: 'left', padding: 0, transition: 'box-shadow 0.15s', fontFamily: "'DM Sans', sans-serif" }}
                          onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow)')}
                          onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
                        >
                          {/* Thumbnail */}
                          <div style={{ height: 120, background: thumb ? `url(${thumb}) center/cover no-repeat` : 'linear-gradient(135deg, var(--lav-200), var(--lav-400))', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {!thumb && <HomeIcon size={36} strokeWidth={1.8} style={{ color: 'rgba(255,255,255,0.4)' }} />}
                          </div>
                          <div style={{ padding: '14px 16px' }}>
                            <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 15, color: 'var(--ink)', margin: '0 0 8px', lineHeight: 1.3 }}>{title}</p>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99, background: 'var(--lav-50)', color: 'var(--lav-600)', border: '1px solid var(--lav-200)' }}>
                                👤 {tenantIds.size} tenant{tenantIds.size !== 1 ? 's' : ''}
                              </span>
                              {pending > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>⏳ {pending} awaiting</span>}
                              {overdue > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 99, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>! {overdue} overdue</span>}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          /* ── LEVEL 2: Tenants for selected apartment ── */
          const aptPayments = payments.filter(p => getTitle(p) === paymentApt);
          if (!paymentTenantId) {
            const tenantMap = new Map<string, PaymentRow[]>();
            aptPayments.forEach(p => {
              if (!tenantMap.has(p.tenant_id)) tenantMap.set(p.tenant_id, []);
              tenantMap.get(p.tenant_id)!.push(p);
            });
            return (
              <div>
                <Breadcrumb />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {Array.from(tenantMap.entries()).map(([tenantId, tenantPayments]) => {
                    const tenant = tenantPayments[0].tenant;
                    const paid = tenantPayments.filter(p => p.status === 'paid').length;
                    const pending = tenantPayments.filter(p => p.status === 'pending_confirmation').length;
                    const unpaid = tenantPayments.filter(p => p.status === 'unpaid' || p.status === 'overdue').length;
                    return (
                      <button key={tenantId} onClick={() => setPaymentTenantId(tenantId)}
                        style={{ background: 'white', borderRadius: 14, boxShadow: 'var(--shadow-sm)', border: '1.5px solid var(--lav-100)', padding: '16px 20px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 14, fontFamily: "'DM Sans', sans-serif', transition: 'box-shadow 0.15s'" }}
                        onMouseEnter={e => (e.currentTarget.style.boxShadow = 'var(--shadow)')}
                        onMouseLeave={e => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
                      >
                        <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg, var(--lav-200), var(--lav-400))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color: '#fff', flexShrink: 0, overflow: 'hidden' }}>
                          {tenant?.avatar_url ? <img src={tenant.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (tenant?.full_name?.charAt(0) ?? '?')}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', margin: '0 0 6px' }}>{tenant?.full_name ?? 'Unknown Tenant'}</p>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#F0FDF4', color: '#16A34A', border: '1px solid #86EFAC' }}>✓ {paid} paid</span>
                            {pending > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>⏳ {pending} pending</span>}
                            {unpaid > 0 && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 99, background: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1' }}>{unpaid} upcoming</span>}
                          </div>
                        </div>
                        <span style={{ fontSize: 20, color: 'var(--slate4)' }}>›</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          }

          /* ── LEVEL 3: Payment schedule for selected tenant ── */
          const tenantPayments = aptPayments.filter(p => p.tenant_id === paymentTenantId).sort((a, b) => a.due_date.localeCompare(b.due_date));
          return (
            <div>
              <Breadcrumb />
              <div style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ background: 'var(--lav-50)', borderBottom: '1.5px solid var(--lav-100)' }}>
                      {['Month', 'Due Date', 'Amount', 'Status', 'Bank Ref', 'Proof', 'Action'].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: 12, color: 'var(--slate2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tenantPayments.map((p, i) => {
                      const sc = statusColors[p.status] ?? statusColors.unpaid;
                      return (
                        <tr key={p.id} style={{ borderBottom: i < tenantPayments.length - 1 ? '1px solid var(--lav-100)' : 'none' }}>
                          <td style={{ padding: '12px 16px', fontWeight: 600, color: 'var(--ink)' }}>{p.month_label ?? new Date(p.due_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--slate2)', fontSize: 13 }}>{p.due_date}</td>
                          <td style={{ padding: '12px 16px', fontWeight: 700, color: 'var(--lav-600)' }}>{formatRent(p.amount)}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 12, fontWeight: 700, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                              {p.status === 'pending_confirmation' ? 'Awaiting Confirm' : p.status === 'unpaid' ? 'Unpaid' : p.status === 'paid' ? '✓ Paid' : 'Overdue'}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', color: 'var(--slate3)', fontSize: 12, fontFamily: 'monospace' }}>{p.bank_reference ?? '—'}</td>
                          <td style={{ padding: '12px 16px' }}>
                            {p.proof_url
                              ? <a href={p.proof_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--lav-600)', fontWeight: 600 }}>View</a>
                              : <span style={{ color: 'var(--slate3)', fontSize: 12 }}>—</span>}
                          </td>
                          <td style={{ padding: '12px 16px' }}>
                            {p.status === 'pending_confirmation' && (
                              <button onClick={() => confirmPayment(p.id)} style={{ background: '#F0FDF4', color: '#16A34A', border: '1px solid #86EFAC', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                                ✓ Confirm
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })()}

        {/* Bank details reminder */}
        {activeTab === 'payments' && !profile?.bank_account && (
          <div style={{ marginTop: 16, background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 20 }}>🏦</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#D97706', margin: 0 }}>Bank details not set</p>
              <p style={{ fontSize: 12, color: 'var(--slate3)', margin: '2px 0 0' }}>Add your bank account in Account Settings so tenants can transfer rent.</p>
            </div>
            <button onClick={() => setView('account')} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#D97706', color: 'white', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}>
              Add Bank Details
            </button>
          </div>
        )}

        {/* ── Chats Tab ── */}
        {activeTab === 'chats' && (() => {
          const acceptedInquiries = inquiries.filter(i => i.accepted);
          if (acceptedInquiries.length === 0) return (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--ink)', margin: '0 0 8px' }}>No chats yet</p>
              <p style={{ fontSize: 14, color: 'var(--slate3)', margin: 0 }}>Accept an inquiry to start a conversation with a tenant.</p>
            </div>
          );
          return (
            <div style={{ background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-sm)', overflow: 'hidden', border: '1px solid var(--lav-100)' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--lav-100)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--lav-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👥</div>
                <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: 'var(--ink)' }}>Chats with Tenants</span>
                <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--lav-100)', color: 'var(--lav-600)', borderRadius: 99, padding: '2px 8px', marginLeft: 'auto' }}>{acceptedInquiries.length}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {acceptedInquiries.map((inq, i) => {
                  const tenantName = inq.sender?.full_name ?? 'Tenant';
                  const propListing = inq.listing as Listing | undefined;
                  return (
                    <div
                      key={inq.id}
                      onClick={() => setChatInquiry(inq)}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 20px', cursor: 'pointer', borderTop: i > 0 ? '1px solid var(--lav-50)' : 'none', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--lav-50)'}
                      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
                    >
                      <div style={{ width: 50, height: 50, borderRadius: '50%', background: 'linear-gradient(135deg, var(--lav-300), var(--lav-600))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 20, flexShrink: 0, overflow: 'hidden', boxShadow: '0 2px 8px rgba(139,111,232,0.2)' }}>
                        {inq.sender?.avatar_url
                          ? <img src={inq.sender.avatar_url} alt={tenantName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          : avatarLetter(tenantName)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', margin: 0 }}>{tenantName}</p>
                        <p style={{ fontSize: 13, color: 'var(--slate3)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {propListing?.title ?? '—'}{propListing?.city ? ` · ${propListing.city}` : ''}
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: 'var(--slate4)' }}>{new Date(inq.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                        <span style={{ fontSize: 11, color: 'var(--lav-500)', fontWeight: 600 }}>Open →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

      </div>

      {/* Lease detail modal */}
      {selectedLease && (
        <LeaseModal
          lease={selectedLease}
          onClose={() => setSelectedLease(null)}
        />
      )}

      {/* Create Lease modal */}
      {createLeaseInquiry && (
        <CreateLeaseModal
          inquiry={createLeaseInquiry}
          onClose={() => setCreateLeaseInquiry(null)}
          onCreated={() => {
            toast('Lease created — payment schedule generated!');
            load();
            setActiveTab('leases');
          }}
        />
      )}

      {/* Chat modal */}
      {chatInquiry && user && (
        <ChatModal
          inquiryId={chatInquiry.id}
          inquiryMessage={chatInquiry.message}
          currentUserId={user.id}
          otherUserName={chatInquiry.sender?.full_name ?? 'Tenant'}
          otherUserAvatarUrl={chatInquiry.sender?.avatar_url}
          listingTitle={chatInquiry.listing?.title ?? 'Property'}
          onClose={() => setChatInquiry(null)}
        />
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <ConfirmDialog
          title="Delete listing?"
          message={`"${deleteTarget.title}" will be permanently deleted. This cannot be undone.`}
          confirmLabel="Delete"
          danger
          onConfirm={doDeleteListing}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
