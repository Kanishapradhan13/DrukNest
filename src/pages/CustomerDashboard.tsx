import React, { useEffect, useRef, useState } from 'react';
import { Check, AlertTriangle, Clock, CalendarDays, Home as HomeIcon, Handshake, CheckCircle2, Heart, MessageCircle, CreditCard, IdCard, MapPin } from 'lucide-react';

function useWindowWidth() {
  const [w, setW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h, { passive: true });
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import type { Listing, Inquiry, RoommateConnection, RentPayment } from '../lib/types';
import Card from '../components/Card';
import { CITIES } from '../lib/data';
import ChatModal from '../components/ChatModal';
import { useToast } from '../contexts/ToastContext';

interface CustomerDashboardProps {
  setView: (v: string) => void;
  onListingClick?: (id: string) => void;
  initialTab?: Tab;
}

type Tab = 'saved' | 'enquiries' | 'roommate' | 'profile' | 'payments' | 'chats';

export default function CustomerDashboard({ setView, onListingClick, initialTab }: CustomerDashboardProps) {
  const { user, profile, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();

  const [tab, setTab] = useState<Tab>(initialTab ?? 'saved');
  const [savedListings, setSavedListings] = useState<Listing[]>([]);
  const [inquiries, setInquiries] = useState<(Inquiry & { listing?: Listing })[]>([]);
  const [roommateConnections, setRoommateConnections] = useState<RoommateConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [chatInquiry, setChatInquiry] = useState<(Inquiry & { listing?: Listing }) | null>(null);
  const [chatConnection, setChatConnection] = useState<RoommateConnection | null>(null);
  const [payments, setPayments] = useState<RentPayment[]>([]);
  const [paymentLeaseId, setPaymentLeaseId] = useState<string | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone]       = useState('');
  const [city, setCity]         = useState('');
  const [bio, setBio]           = useState('');
  const [saving, setSaving]     = useState(false);
  const [saveMsg, setSaveMsg]   = useState('');
  const [cidNumber, setCidNumber]       = useState('');
  const [cidFile, setCidFile]           = useState<File | null>(null);
  const [cidSubmitting, setCidSubmitting] = useState(false);
  const [cidMsg, setCidMsg]             = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  /* payment proof upload state */
  const [openPaymentId, setOpenPaymentId]       = useState<string | null>(null);   // which panel is expanded
  const [submittingPaymentId, setSubmittingPaymentId] = useState<string | null>(null); // which is mid-upload
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [bankRef, setBankRef]     = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) { setView('signin'); return; }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (!profile) return;
    /* eslint-disable react-hooks/set-state-in-effect */
    setFullName(profile.full_name ?? '');
    setPhone(profile.phone ?? '');
    setCity(profile.city ?? '');
    setBio(profile.bio ?? '');
    setCidNumber(profile.cid_number ?? '');
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [profile?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    if (!user) return;
    setLoading(true);
    const [savedIdsRes, inqRes] = await Promise.all([
      supabase
        .from('saved_listings')
        .select('listing_id')
        .eq('user_id', user.id),
      supabase
        .from('inquiries')
        .select('*, listing:listings(id, title, city, price, type, status, owner_id), owner:profiles!owner_id(id, full_name, avatar_url)')
        .eq('sender_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    // Fetch connections with listing join; fall back if listing_id column doesn't exist yet
    let roommateResult = await supabase
      .from('roommate_connections')
      .select('*, sender:profiles!sender_id(id, full_name, phone, city, avatar_url), poster:profiles!poster_id(id, full_name, phone, city, avatar_url), post:roommate_posts(id, city, budget, occupation, move_in_date, bio, listing_id, listing:listings(id, title, city, photo_urls))')
      .or(`poster_id.eq.${user.id},sender_id.eq.${user.id}`)
      .order('created_at', { ascending: false });
    if (roommateResult.error) {
      roommateResult = await supabase
        .from('roommate_connections')
        .select('*, sender:profiles!sender_id(id, full_name, phone, city, avatar_url), poster:profiles!poster_id(id, full_name, phone, city, avatar_url), post:roommate_posts(id, city, budget, occupation, move_in_date, bio)')
        .or(`poster_id.eq.${user.id},sender_id.eq.${user.id}`)
        .order('created_at', { ascending: false });
    }

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
    if (roommateResult.data) setRoommateConnections(roommateResult.data as RoommateConnection[]);

    const { data: payData } = await supabase
      .from('rent_payments')
      .select('*, lease:leases(id, listing_id, start_date, end_date, listing:listings(id, title, city, type, price, photo_urls))')
      .eq('tenant_id', user.id)
      .order('due_date', { ascending: true });
    if (payData) setPayments(payData as RentPayment[]);

    setLoading(false);
  }

  async function acceptConnection(connId: string) {
    await supabase.from('roommate_connections').update({ status: 'accepted' }).eq('id', connId);
    setRoommateConnections(prev => prev.map(c => c.id === connId ? { ...c, status: 'accepted' as const } : c));
  }

  async function declineConnection(connId: string) {
    await supabase.from('roommate_connections').update({ status: 'declined' }).eq('id', connId);
    setRoommateConnections(prev => prev.map(c => c.id === connId ? { ...c, status: 'declined' as const } : c));
  }

  async function removeSaved(listingId: string) {
    await supabase
      .from('saved_listings')
      .delete()
      .eq('user_id', user!.id)
      .eq('listing_id', listingId);
    setSavedListings(prev => prev.filter(l => l.id !== listingId));
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const path = `${user.id}/avatar.${ext}`;
    const { data: up, error: upErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
    if (upErr) { toast('Failed to upload photo', 'error'); setAvatarUploading(false); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(up.path);
    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user.id);
    await refreshProfile();
    setAvatarUploading(false);
    toast('Profile photo updated!');
    e.target.value = '';
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
      toast('Profile saved!');
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }

  async function submitPaymentProof(paymentId: string) {
    if (!user || !proofFile) return;
    setSubmittingPaymentId(paymentId);
    const ext = proofFile.name.split('.').pop() ?? 'jpg';
    const path = `${user.id}/${paymentId}.${ext}`;
    const { data: up, error: upErr } = await supabase.storage.from('payment-proofs').upload(path, proofFile, { upsert: true });
    if (upErr) { toast('Failed to upload proof', 'error'); setSubmittingPaymentId(null); return; }
    const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(up.path);
    const { error } = await supabase.from('rent_payments').update({
      status: 'pending_confirmation',
      bank_reference: bankRef[paymentId] ?? '',
      proof_url: urlData.publicUrl,
      paid_date: new Date().toISOString(),
    }).eq('id', paymentId);
    if (!error) {
      setPayments(prev => prev.map(p => p.id === paymentId ? { ...p, status: 'pending_confirmation' as const, proof_url: urlData.publicUrl } : p));
      toast('Payment proof submitted — awaiting owner confirmation');
      setProofFile(null);
      setOpenPaymentId(null);
    } else {
      toast('Failed to submit payment', 'error');
    }
    setSubmittingPaymentId(null);
  }

  async function submitCid() {
    if (!user || !cidNumber.trim() || !cidFile) return;
    setCidSubmitting(true);
    setCidMsg('');

    const ext = cidFile.name.split('.').pop() ?? 'jpg';
    const filePath = `${user.id}/cid.${ext}`;
    const { data: upData, error: upErr } = await supabase.storage
      .from('cid-docs')
      .upload(filePath, cidFile, { upsert: true });

    if (upErr) {
      setCidMsg(`Upload failed: ${upErr.message}`);
      setCidSubmitting(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('cid-docs').getPublicUrl(upData.path);

    const { error } = await supabase.from('profiles').update({
      cid_number: cidNumber.trim(),
      cid_status: 'pending',
      cid_doc_url: urlData.publicUrl,
    }).eq('id', user.id);

    await refreshProfile();
    setCidSubmitting(false);
    if (error) {
      setCidMsg(`Submission failed: ${error.message}`);
    } else {
      setCidMsg('Submitted! An admin will verify your CID within 24–48 hours.');
    }
  }

  const initial = profile?.avatar_letter || profile?.full_name?.charAt(0)?.toUpperCase() || 'U';
  const width = useWindowWidth();
  const isMobile = width <= 640;

  return (
    <div style={{ background: 'var(--lav-50)', minHeight: '100vh', paddingTop: 66 }}>

      {/* ── Header bar ── */}
      <div style={{
        background: '#1E1B2E', color: 'white',
        padding: isMobile ? '0 16px' : '0 32px', height: 56,
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

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '16px 14px' : '28px 24px' }}>

        {/* ── Stats ── */}
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          <StatCard label="Wishlist"             value={savedListings.length}     accent="var(--lav-500)" bg="var(--lav-50)" border="var(--lav-200)" />
          <StatCard label="Sent Enquiries"     value={inquiries.length}         accent="#16A34A"        bg="#F0FDF4"        border="#86EFAC"         />
          <StatCard label="Roommate Chats"  value={roommateConnections.length}  accent="#D97706"  bg="#FFFBEB"  border="#FDE68A" />
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', borderBottom: '2px solid var(--lav-200)', marginBottom: 24, overflowX: 'auto' }}>
          {([
            { id: 'saved',     label: 'Wishlist',     count: savedListings.length     },
            { id: 'enquiries', label: 'My Enquiries', count: inquiries.length         },
            { id: 'chats',     label: '💬 Chats',     count: (inquiries.filter(i => i.accepted).length + roommateConnections.filter(c => c.status !== 'declined').length) || null },
            { id: 'payments',  label: 'Payments',     count: payments.filter(p => p.status === 'unpaid' || p.status === 'overdue').length || null },
            { id: 'profile',   label: 'Profile',      count: null                     },
          ] as { id: Tab; label: string; count: number | null }[]).map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); if (t.id === 'saved' || t.id === 'chats') load(); }}
              style={{
                padding: '10px 16px', background: 'none', border: 'none',
                borderBottom: tab === t.id ? '2.5px solid var(--lav-500)' : '2.5px solid transparent',
                color: tab === t.id ? 'var(--lav-600)' : 'var(--slate2)',
                fontWeight: tab === t.id ? 700 : 500, fontSize: 13, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 5, marginBottom: -2,
                fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', flexShrink: 0,
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
              icon={<Heart size={48} strokeWidth={1.8} />}
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
              icon={<MessageCircle size={48} strokeWidth={1.8} />}
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
              icon={<HomeIcon size={48} strokeWidth={1.8} />}
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
                    avatarUrl={(other as typeof other & { avatar_url?: string })?.avatar_url}
                    city={other?.city}
                    phone={other?.phone}
                    message={conn.message}
                    date={conn.created_at}
                    status={conn.status ?? 'pending'}
                    direction={isSender ? 'sent' : 'received'}
                    onChat={() => setChatConnection(conn)}
                    onAccept={() => acceptConnection(conn.id)}
                    onDecline={() => declineConnection(conn.id)}
                  />
                );
              })}
            </div>
          )
        )}

        {/* ── CHATS TAB ── */}
        {tab === 'chats' && (() => {
          type InqWithOwner = Inquiry & { listing?: Listing; owner?: { id: string; full_name: string; avatar_url?: string } };
          const acceptedInquiries = (inquiries as InqWithOwner[]).filter(i => i.accepted);
          const allConnections = roommateConnections.filter(c => c.status !== 'declined');
          const hasAny = acceptedInquiries.length > 0 || allConnections.length > 0;

          if (!hasAny) return (
            <div style={{ background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-sm)', padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--ink)', margin: '0 0 8px' }}>No conversations yet</p>
              <p style={{ fontSize: 14, color: 'var(--slate3)', margin: 0 }}>Accepted inquiries and roommate connections will appear here.</p>
            </div>
          );

          const ChatRow = ({ avatar, name, subtitle, date, onClick }: { avatar?: string; name: string; subtitle: string; date: string; onClick: () => void }) => (
            <div
              onClick={onClick}
              style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px', cursor: 'pointer', borderRadius: 12, transition: 'background 0.15s' }}
              onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = 'var(--lav-50)'}
              onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = 'transparent'}
            >
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #8B6FE8, #7254CC)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0, overflow: 'hidden', boxShadow: '0 2px 8px rgba(139,111,232,0.2)' }}>
                {avatar ? <img src={avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : name.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</p>
                <p style={{ fontSize: 13, color: 'var(--slate3)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subtitle}</p>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 11, color: 'var(--slate4)' }}>{new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                <span style={{ fontSize: 11, color: 'var(--lav-500)', fontWeight: 600 }}>Open →</span>
              </div>
            </div>
          );

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* With Owners */}
              {acceptedInquiries.length > 0 && (
                <div style={{ background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-sm)', overflow: 'hidden', border: '1px solid var(--lav-100)' }}>
                  <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--lav-100)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--lav-100)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--lav-500)' }}><HomeIcon size={14} strokeWidth={1.8} /></div>
                    <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: 'var(--ink)' }}>Chats with Owners</span>
                    <span style={{ fontSize: 11, fontWeight: 700, background: 'var(--lav-100)', color: 'var(--lav-600)', borderRadius: 99, padding: '2px 8px', marginLeft: 'auto' }}>{acceptedInquiries.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {acceptedInquiries.map((inq, i) => {
                      const ownerName = inq.owner?.full_name ?? 'Property Owner';
                      return (
                        <div key={inq.id} style={{ borderTop: i > 0 ? '1px solid var(--lav-50)' : 'none' }}>
                          <ChatRow
                            avatar={inq.owner?.avatar_url}
                            name={ownerName}
                            subtitle={`${inq.listing?.title ?? 'Property'} · ${inq.listing?.city ?? ''}`}
                            date={inq.created_at}
                            onClick={() => setChatInquiry(inq)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* With Roommates */}
              {allConnections.length > 0 && (
                <div style={{ background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-sm)', overflow: 'hidden', border: '1px solid var(--lav-100)' }}>
                  <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--lav-100)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: '#FEF9C3', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#92400E' }}><Handshake size={14} strokeWidth={1.8} /></div>
                    <span style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: 'var(--ink)' }}>Roommate Chats</span>
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#FEF9C3', color: '#92400E', borderRadius: 99, padding: '2px 8px', marginLeft: 'auto' }}>{allConnections.length}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {allConnections.map((conn, i) => {
                      const isSender = conn.sender_id === user!.id;
                      const other = isSender ? conn.poster : conn.sender;
                      const otherAvatar = (other as typeof other & { avatar_url?: string })?.avatar_url;
                      const post = conn.post;
                      const subtitle = post?.listing
                        ? `${post.listing.title} · ${post.listing.city}`
                        : post
                          ? `${post.city} · Nu ${post.budget.toLocaleString()}/mo · ${post.occupation}`
                          : `${other?.city ?? 'Bhutan'}`;
                      return (
                        <div key={conn.id} style={{ borderTop: i > 0 ? '1px solid var(--lav-50)' : 'none' }}>
                          <ChatRow
                            avatar={otherAvatar}
                            name={other?.full_name ?? 'Roommate'}
                            subtitle={subtitle}
                            date={conn.created_at}
                            onClick={() => setChatConnection(conn)}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })()}

        {/* ── PAYMENTS TAB ── */}
        {tab === 'payments' && (() => {
          type PayLease = RentPayment & { lease?: { id: string; listing_id: string; start_date: string; end_date: string; listing?: { id: string; title: string; city: string; type: string; price: number; photo_urls?: string[] } } };
          const typedPayments = payments as PayLease[];
          const statusColors: Record<string, { bg: string; color: string; border: string }> = {
            unpaid:               { bg: '#F1F5F9', color: '#64748B', border: '#CBD5E1' },
            pending_confirmation: { bg: '#FFFBEB', color: '#D97706', border: '#FDE68A' },
            paid:                 { bg: '#F0FDF4', color: '#16A34A', border: '#86EFAC' },
            overdue:              { bg: '#FEF2F2', color: '#DC2626', border: '#FECACA' },
          };
          const statusLabel = (s: string) =>
            s === 'pending_confirmation' ? 'Awaiting Confirmation' :
            s === 'unpaid' ? 'Unpaid' : s === 'paid' ? '✓ Paid' : 'Overdue';

          if (typedPayments.length === 0) {
            return (
              <EmptyState
                icon={<CreditCard size={48} strokeWidth={1.8} />}
                title="No payment schedule yet"
                desc="Once your lease is active, your monthly payment schedule will appear here."
                action={{ label: 'Browse Listings', onClick: () => setView('listings') }}
              />
            );
          }

          /* ── LEVEL 2: payment schedule for selected lease ── */
          if (paymentLeaseId) {
            const leasePayments = typedPayments.filter(p => p.lease_id === paymentLeaseId);
            const listing = leasePayments[0]?.lease?.listing;
            const lease = leasePayments[0]?.lease;
            const paid = leasePayments.filter(p => p.status === 'paid').length;
            const total = leasePayments.length;
            const nextDue = leasePayments.find(p => p.status === 'unpaid' || p.status === 'overdue');

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Back + header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <button
                    onClick={() => { setPaymentLeaseId(null); setOpenPaymentId(null); }}
                    style={{ background: 'var(--lav-100)', border: 'none', borderRadius: 10, padding: '8px 14px', fontSize: 13, fontWeight: 600, color: 'var(--lav-700)', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 6 }}
                  >
                    ← Back
                  </button>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--ink)', margin: 0 }}>{listing?.title ?? 'Payment Schedule'}</p>
                    <p style={{ fontSize: 12, color: 'var(--slate3)', margin: 0 }}>📍 {listing?.city ?? ''} · {lease?.start_date} → {lease?.end_date}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ background: 'white', borderRadius: 14, boxShadow: 'var(--shadow-sm)', padding: '16px 20px', border: '1px solid var(--lav-100)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>{paid} of {total} months paid</span>
                    {nextDue && <span style={{ fontSize: 12, color: '#D97706', fontWeight: 600 }}>Next due: {nextDue.due_date}</span>}
                  </div>
                  <div style={{ height: 8, background: 'var(--lav-100)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${total > 0 ? (paid / total) * 100 : 0}%`, background: 'linear-gradient(90deg, var(--lav-400), var(--lav-600))', borderRadius: 99, transition: 'width 0.4s' }} />
                  </div>
                </div>

                {/* Payment rows */}
                {leasePayments.map(p => {
                  const sc = statusColors[p.status] ?? statusColors.unpaid;
                  const isOpen = openPaymentId === p.id;
                  const isSubmitting = submittingPaymentId === p.id;
                  return (
                    <div key={p.id} style={{ background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-sm)', border: `1.5px solid ${sc.border}`, overflow: 'hidden' }}>
                      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: sc.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: sc.color, flexShrink: 0 }}>
                          {p.status === 'paid' ? <Check size={18} strokeWidth={2} /> : p.status === 'overdue' ? <AlertTriangle size={18} strokeWidth={2} /> : p.status === 'pending_confirmation' ? <Clock size={18} strokeWidth={2} /> : <CalendarDays size={18} strokeWidth={2} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 100 }}>
                          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)', margin: 0 }}>{p.month_label ?? new Date(p.due_date).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</p>
                          <p style={{ fontSize: 12, color: 'var(--slate3)', margin: '2px 0 0' }}>Due {p.due_date}</p>
                        </div>
                        <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--lav-600)', margin: 0 }}>Nu {p.amount.toLocaleString()}</p>
                        <span style={{ fontSize: 12, fontWeight: 700, padding: '4px 12px', borderRadius: 99, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, flexShrink: 0 }}>
                          {statusLabel(p.status)}
                        </span>
                        {(p.status === 'unpaid' || p.status === 'overdue') && (
                          <button
                            onClick={() => { setOpenPaymentId(isOpen ? null : p.id); setProofFile(null); }}
                            style={{ padding: '7px 14px', borderRadius: 9, border: 'none', background: isOpen ? 'var(--lav-100)' : 'var(--lav-500)', color: isOpen ? 'var(--lav-600)' : 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                          >
                            {isOpen ? 'Cancel' : '📤 Submit Payment'}
                          </button>
                        )}
                        {p.proof_url && (
                          <a href={p.proof_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--lav-600)', fontWeight: 600 }}>View Proof</a>
                        )}
                      </div>
                      {isOpen && (
                        <div style={{ padding: '14px 20px 18px', background: 'var(--lav-50)', borderTop: '1px solid var(--lav-100)' }}>
                          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', marginBottom: 14, fontSize: 13, color: 'var(--slate2)', lineHeight: 1.6 }}>
                            <p style={{ fontWeight: 700, color: '#D97706', margin: '0 0 4px' }}>Bank Transfer Instructions</p>
                            <p style={{ margin: 0 }}>Transfer <strong>Nu {p.amount.toLocaleString()}</strong> to the owner's bank account, then upload your transfer screenshot below.</p>
                          </div>
                          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                            <input
                              value={bankRef[p.id] ?? ''}
                              onChange={e => setBankRef(prev => ({ ...prev, [p.id]: e.target.value }))}
                              placeholder="Bank reference / transaction ID"
                              style={{ flex: 1, minWidth: 180, height: 38, border: '1.5px solid var(--lav-200)', borderRadius: 9, padding: '0 12px', fontSize: 13, fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
                            />
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px', height: 38, borderRadius: 9, border: '1.5px solid var(--lav-300)', background: 'white', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--lav-600)', fontFamily: "'DM Sans', sans-serif" }}>
                              📎 {proofFile ? proofFile.name.slice(0, 20) : 'Upload Screenshot'}
                              <input type="file" accept="image/*" onChange={e => setProofFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
                            </label>
                            <button
                              onClick={() => submitPaymentProof(p.id)}
                              disabled={!proofFile || isSubmitting}
                              style={{ padding: '0 16px', height: 38, borderRadius: 9, border: 'none', background: proofFile && !isSubmitting ? '#16A34A' : 'var(--lav-200)', color: proofFile && !isSubmitting ? 'white' : 'var(--slate3)', fontSize: 13, fontWeight: 600, cursor: proofFile && !isSubmitting ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif" }}
                            >
                              {isSubmitting ? 'Submitting…' : '✓ Submit'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          }

          /* ── LEVEL 1: apartment cards ── */
          const leaseMap = new Map<string, PayLease[]>();
          typedPayments.forEach(p => {
            const key = p.lease_id;
            if (!leaseMap.has(key)) leaseMap.set(key, []);
            leaseMap.get(key)!.push(p);
          });

          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <p style={{ fontSize: 13, color: 'var(--slate3)', margin: 0 }}>Select an apartment to view its payment schedule.</p>
              {Array.from(leaseMap.entries()).map(([leaseId, leasePayments]) => {
                const listing = leasePayments[0]?.lease?.listing;
                const lease = leasePayments[0]?.lease;
                const paid = leasePayments.filter(p => p.status === 'paid').length;
                const pending = leasePayments.filter(p => p.status === 'pending_confirmation').length;
                const overdue = leasePayments.filter(p => p.status === 'overdue').length;
                const unpaid = leasePayments.filter(p => p.status === 'unpaid').length;
                const total = leasePayments.length;
                const monthlyRent = leasePayments[0]?.amount ?? 0;
                const photo = listing?.photo_urls?.[0];

                return (
                  <div
                    key={leaseId}
                    onClick={() => setPaymentLeaseId(leaseId)}
                    style={{ background: 'white', borderRadius: 18, boxShadow: 'var(--shadow-sm)', border: '1.5px solid var(--lav-100)', overflow: 'hidden', cursor: 'pointer', transition: 'box-shadow 0.2s, border-color 0.2s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--lav-300)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)'; (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--lav-100)'; }}
                  >
                    {/* Property photo banner */}
                    {photo ? (
                      <div style={{ height: 140, overflow: 'hidden', position: 'relative' }}>
                        <img src={photo} alt={listing?.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(30,27,46,0.6))' }} />
                        <div style={{ position: 'absolute', bottom: 12, left: 16, right: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <div>
                            <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: '#fff', margin: 0 }}>{listing?.title ?? 'Your Apartment'}</p>
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)', margin: 0 }}>📍 {listing?.city}</p>
                          </div>
                          <span style={{ background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', color: '#fff', backdropFilter: 'blur(8px)', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 99 }}>
                            Nu {monthlyRent.toLocaleString()}/mo
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div style={{ height: 72, background: 'linear-gradient(135deg, #1E1B2E, #3B2D6E)', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: '#fff', margin: 0 }}>{listing?.title ?? 'Your Apartment'}</p>
                          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', margin: 0 }}>📍 {listing?.city ?? 'Bhutan'}</p>
                        </div>
                        <span style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 99 }}>Nu {monthlyRent.toLocaleString()}/mo</span>
                      </div>
                    )}

                    {/* Stats + lease dates */}
                    <div style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                        {paid > 0 && <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#F0FDF4', color: '#16A34A', border: '1px solid #86EFAC' }}>✓ {paid} Paid</span>}
                        {pending > 0 && <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A' }}>⏳ {pending} Awaiting</span>}
                        {overdue > 0 && <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>⚠ {overdue} Overdue</span>}
                        {unpaid > 0 && <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: '#F1F5F9', color: '#64748B', border: '1px solid #CBD5E1' }}>📅 {unpaid} Upcoming</span>}
                      </div>
                      {/* Progress bar */}
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--slate3)', marginBottom: 5 }}>
                          <span>{paid}/{total} months paid</span>
                          <span>{lease?.start_date} – {lease?.end_date}</span>
                        </div>
                        <div style={{ height: 6, background: 'var(--lav-100)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${total > 0 ? (paid / total) * 100 : 0}%`, background: 'linear-gradient(90deg, var(--lav-400), var(--lav-600))', borderRadius: 99 }} />
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--lav-600)', display: 'flex', alignItems: 'center', gap: 4 }}>
                          View Payments →
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

        {/* ── PROFILE TAB ── */}
        {tab === 'profile' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 24, alignItems: 'start' }}>

            {/* Avatar card */}
            <div style={{ background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-sm)', padding: 28, textAlign: 'center' }}>
              <div
                onClick={() => avatarInputRef.current?.click()}
                style={{
                  width: 90, height: 90, borderRadius: '50%',
                  background: profile?.avatar_url ? 'transparent' : 'linear-gradient(135deg, #8B6FE8, #7254CC)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 36, fontWeight: 700, color: 'white',
                  margin: '0 auto 10px', cursor: 'pointer', position: 'relative',
                  overflow: 'hidden', border: '3px solid var(--lav-200)',
                }}
                title="Click to change photo"
              >
                {profile?.avatar_url
                  ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : initial
                }
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'rgba(0,0,0,0.45)', padding: '5px 0',
                  fontSize: 10, fontWeight: 600, color: 'white', letterSpacing: 0.3,
                }}>
                  {avatarUploading ? '…' : '✎ Edit'}
                </div>
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                onChange={uploadAvatar}
                style={{ display: 'none' }}
              />
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--ink)', marginBottom: 4, marginTop: 8 }}>
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

          {/* ── CID Verification ── */}
          <div style={{ background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-sm)', padding: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--ink)', margin: 0, marginBottom: 4 }}>
                  CID Verification
                </h3>
                <p style={{ fontSize: 13, color: 'var(--slate3)', margin: 0 }}>
                  Verify your identity with your Bhutan Citizenship ID to unlock all platform features
                </p>
              </div>
              <div style={{ flexShrink: 0, width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg, #8B6FE8, #7254CC)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}><IdCard size={22} strokeWidth={1.8} /></div>
            </div>

            {profile?.cid_status === 'verified' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 14, padding: '18px 22px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16A34A', flexShrink: 0 }}><CheckCircle2 size={22} strokeWidth={1.8} /></div>
                <div>
                  <p style={{ fontWeight: 700, color: '#16A34A', margin: 0, fontSize: 16 }}>Identity Verified</p>
                  <p style={{ fontSize: 13, color: '#15803D', margin: '2px 0 0' }}>Your CID <strong style={{ fontFamily: 'monospace' }}>{profile.cid_number}</strong> has been confirmed by DrukNest.</p>
                </div>
              </div>
            ) : profile?.cid_status === 'pending' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 14, padding: '18px 22px' }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#FEF9C3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>⏳</div>
                <div>
                  <p style={{ fontWeight: 700, color: '#D97706', margin: 0, fontSize: 16 }}>Verification Pending</p>
                  <p style={{ fontSize: 13, color: '#B45309', margin: '2px 0 0' }}>CID <strong style={{ fontFamily: 'monospace' }}>{profile.cid_number}</strong> submitted — admin will verify within 24–48 hours.</p>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Info box */}
                <div style={{ background: 'var(--lav-50)', border: '1px solid var(--lav-200)', borderRadius: 10, padding: '12px 16px', fontSize: 13, color: 'var(--slate2)', lineHeight: 1.6 }}>
                  Your CID is your Bhutan Citizenship ID card. Upload a clear photo of the front side. Your document is reviewed only by DrukNest admins and kept confidential.
                </div>

                {profile?.cid_status === 'rejected' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px' }}>
                    <span style={{ fontSize: 18, flexShrink: 0 }}>❌</span>
                    <p style={{ color: '#DC2626', fontSize: 13, margin: 0 }}>Your previous submission was rejected. Please resubmit with a valid CID number and a clear, readable photo.</p>
                  </div>
                )}

                <ProfileField label="CID Number *">
                  <input
                    value={cidNumber}
                    onChange={e => setCidNumber(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    placeholder="11-digit CID number  e.g. 11701001234"
                    style={inputSt}
                  />
                </ProfileField>

                <ProfileField label="CID Document Photo *">
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    border: '1.5px dashed var(--lav-300)', borderRadius: 10,
                    padding: '12px 16px', cursor: 'pointer', background: cidFile ? 'var(--lav-50)' : 'white',
                    transition: 'background 0.15s',
                  }}>
                    <span style={{ fontSize: 22 }}>{cidFile ? '📄' : '📎'}</span>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: cidFile ? 'var(--lav-600)' : 'var(--slate2)' }}>
                        {cidFile ? cidFile.name : 'Click to upload CID photo'}
                      </p>
                      {!cidFile && <p style={{ margin: 0, fontSize: 12, color: 'var(--slate3)' }}>JPG, PNG or PDF · Max 5 MB</p>}
                      {cidFile && <p style={{ margin: 0, fontSize: 12, color: 'var(--slate3)' }}>{(cidFile.size / 1024).toFixed(0)} KB</p>}
                    </div>
                    {cidFile && <span style={{ fontSize: 12, color: 'var(--lav-500)', fontWeight: 600 }}>Change</span>}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={e => setCidFile(e.target.files?.[0] ?? null)}
                      style={{ display: 'none' }}
                    />
                  </label>
                </ProfileField>

                {cidMsg && (
                  <div style={{
                    background: cidMsg.startsWith('Upload failed') || cidMsg.startsWith('Submission failed') ? '#FEF2F2' : '#F0FDF4',
                    border: `1px solid ${cidMsg.startsWith('Upload failed') || cidMsg.startsWith('Submission failed') ? '#FECACA' : '#86EFAC'}`,
                    borderRadius: 8, padding: '10px 14px', fontSize: 14,
                    color: cidMsg.startsWith('Upload failed') || cidMsg.startsWith('Submission failed') ? '#DC2626' : '#16A34A',
                  }}>
                    {cidMsg}
                  </div>
                )}

                <button
                  onClick={submitCid}
                  disabled={cidSubmitting || !cidNumber.trim() || !cidFile}
                  style={{
                    marginTop: 4, background: 'var(--lav-500)', color: 'white',
                    border: 'none', borderRadius: 10, padding: '11px 28px',
                    fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans', sans-serif",
                    cursor: cidSubmitting || !cidNumber.trim() || !cidFile ? 'not-allowed' : 'pointer',
                    opacity: cidSubmitting || !cidNumber.trim() || !cidFile ? 0.55 : 1,
                    boxShadow: '0 4px 14px rgba(139,111,232,0.28)',
                    alignSelf: 'flex-start',
                  }}
                >
                  {cidSubmitting ? 'Submitting…' : 'Submit for Verification'}
                </button>
              </div>
            )}
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
          otherUserName={(chatInquiry as typeof chatInquiry & { owner?: { full_name: string; avatar_url?: string } }).owner?.full_name ?? 'Property Owner'}
          otherUserAvatarUrl={(chatInquiry as typeof chatInquiry & { owner?: { avatar_url?: string } }).owner?.avatar_url}
          listingTitle={chatInquiry.listing?.title ?? 'Property'}
          onClose={() => setChatInquiry(null)}
        />
      )}

      {/* Roommate chat modal */}
      {chatConnection && user && (() => {
        const isSender = chatConnection.sender_id === user.id;
        const other = isSender ? chatConnection.poster : chatConnection.sender;
        return (
          <ChatModal
            inquiryId={chatConnection.id}
            inquiryMessage={chatConnection.message}
            currentUserId={user.id}
            otherUserName={other?.full_name ?? 'Roommate'}
            otherUserAvatarUrl={(other as typeof other & { avatar_url?: string })?.avatar_url}
            listingTitle="Roommate Chat"
            table="roommate_messages"
            threadColumn="connection_id"
            onClose={() => setChatConnection(null)}
          />
        );
      })()}
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

function EmptyState({ icon, title, desc, action }: { icon: React.ReactNode; title: string; desc: string; action: { label: string; onClick: () => void } }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', background: 'white', borderRadius: 16, boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ marginBottom: 16, color: 'var(--lav-400)', display: 'flex', justifyContent: 'center' }}>{icon}</div>
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

function ConnectionCard({ name, avatarUrl, city, phone, message, date, status, direction, onChat, onAccept, onDecline }: {
  name: string;
  avatarUrl?: string;
  city?: string;
  phone?: string;
  message: string;
  date: string;
  status: 'pending' | 'accepted' | 'declined';
  direction: 'received' | 'sent';
  onChat: () => void;
  onAccept?: () => void;
  onDecline?: () => void;
}) {
  const borderColor =
    status === 'accepted' ? '#BBF7D0' :
    status === 'declined' ? '#FECACA' :
    direction === 'received' ? 'var(--lav-100)' : '#FEF9C3';

  return (
    <div style={{
      background: 'white', borderRadius: 14,
      boxShadow: 'var(--shadow-sm)', padding: '20px 24px',
      border: `1px solid ${borderColor}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            background: 'linear-gradient(135deg, #8B6FE8, #7254CC)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 16, fontWeight: 700, flexShrink: 0,
            overflow: 'hidden',
          }}>
            {avatarUrl
              ? <img src={avatarUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : name.charAt(0).toUpperCase()}
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {status === 'pending' && direction === 'sent' && (
            <span style={{ fontSize: 11, fontWeight: 600, background: '#FEF9C3', color: '#92400E', border: '1px solid #FDE68A', borderRadius: 99, padding: '3px 10px' }}>
              ⏳ Awaiting Response
            </span>
          )}
          {status === 'accepted' && (
            <span style={{ fontSize: 11, fontWeight: 600, background: '#F0FDF4', color: '#16A34A', border: '1px solid #86EFAC', borderRadius: 99, padding: '3px 10px' }}>
              ✓ Accepted
            </span>
          )}
          {status === 'declined' && (
            <span style={{ fontSize: 11, fontWeight: 600, background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 99, padding: '3px 10px' }}>
              ✕ Declined
            </span>
          )}
          <span style={{ fontSize: 12, color: 'var(--slate3)' }}>
            {new Date(date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>
      <p style={{
        fontSize: 14, color: 'var(--slate2)', lineHeight: 1.6,
        borderLeft: `3px solid ${direction === 'received' ? '#FDE68A' : 'var(--lav-200)'}`,
        paddingLeft: 14, margin: '0 0 14px',
      }}>
        {message}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {status === 'accepted' && (
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
        )}
        {status === 'pending' && direction === 'received' && (
          <>
            <button
              onClick={onAccept}
              style={{
                background: '#16A34A', color: '#fff', border: 'none',
                borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              ✓ Accept
            </button>
            <button
              onClick={onDecline}
              style={{
                background: 'white', color: '#DC2626', border: '1.5px solid #FECACA',
                borderRadius: 8, padding: '7px 16px', fontSize: 13, fontWeight: 600,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
              }}
            >
              ✕ Decline
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const inputSt: React.CSSProperties = {
  width: '100%', height: 42, border: '1.5px solid var(--lav-200)', borderRadius: 10,
  padding: '0 14px', fontSize: 14, color: 'var(--ink)', background: 'white',
  outline: 'none', boxSizing: 'border-box', fontFamily: "'DM Sans', sans-serif",
};
