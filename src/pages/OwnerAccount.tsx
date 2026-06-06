import React, { useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../components/Icons';

interface OwnerAccountProps {
  setView: (v: string) => void;
}

type AccountTab =
  | 'profile'
  | 'contact'
  | 'documents'
  | 'notifications'
  | 'security'
  | 'verify';

/* ─── Toggle Switch ─────────────────────────────────────────── */
function Toggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      onClick={() => onChange(!on)}
      aria-pressed={on}
      style={{
        width: 46,
        height: 26,
        borderRadius: 99,
        border: 'none',
        background: on ? 'var(--lav-500)' : 'var(--lav-200)',
        cursor: 'pointer',
        position: 'relative',
        flexShrink: 0,
        transition: 'background 0.2s',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 23 : 3,
          width: 20,
          height: 20,
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
          transition: 'left 0.2s',
          display: 'block',
        }}
      />
    </button>
  );
}

/* ─── Input Field ───────────────────────────────────────────── */
function Field({
  label,
  value,
  onChange,
  type = 'text',
  readOnly = false,
  placeholder = '',
}: {
  label: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: 12.5,
          fontWeight: 600,
          color: 'var(--slate2)',
          marginBottom: 6,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {label}
      </label>
      <input
        type={type}
        value={value}
        readOnly={readOnly}
        placeholder={placeholder}
        onChange={(e) => onChange?.(e.target.value)}
        style={{
          width: '100%',
          border: '1.5px solid var(--lav-200)',
          borderRadius: 10,
          padding: '11px 14px',
          fontSize: 14,
          color: readOnly ? 'var(--slate2)' : 'var(--ink)',
          background: readOnly ? 'var(--lav-50)' : '#fff',
          outline: 'none',
          cursor: readOnly ? 'default' : 'text',
          transition: 'border-color 0.15s',
        }}
        onFocus={(e) => {
          if (!readOnly) e.currentTarget.style.borderColor = 'var(--lav-400)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = 'var(--lav-200)';
        }}
      />
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────── */
export default function OwnerAccount({ setView }: OwnerAccountProps) {
  const { user, profile, refreshProfile } = useAuth();

  /* Profile & Identity */
  const [firstName, setFirstName] = useState(
    profile?.full_name?.split(' ')[0] ?? ''
  );
  const [lastName, setLastName] = useState(
    profile?.full_name?.split(' ').slice(1).join(' ') ?? ''
  );
  const [displayName, setDisplayName] = useState(
    profile?.display_name ?? profile?.full_name ?? ''
  );
  const [pronouns, setPronouns] = useState('');
  const [bio, setBio] = useState(profile?.bio ?? '');

  /* Contact Details */
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [whatsapp, setWhatsapp] = useState(profile?.whatsapp ?? '');
  const [city, setCity] = useState(profile?.city ?? '');
  const [preferredContact, setPreferredContact] = useState('WhatsApp');
  const [responseTime, setResponseTime] = useState('Within 24 hours');

  /* Bank details for rent payments */
  const [bankName, setBankName] = useState(profile?.bank_name ?? '');
  const [bankAccount, setBankAccount] = useState(profile?.bank_account ?? '');

  /* Security */
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  /* CID Verification */
  const [cidNumber, setCidNumber] = useState(profile?.cid_number ?? '');
  const [cidFile, setCidFile] = useState<File | null>(null);
  const [cidSubmitting, setCidSubmitting] = useState(false);
  const [cidMsg, setCidMsg] = useState('');

  /* Notifications */
  const [notifState, setNotifState] = useState({
    new_inquiry: true,
    lease_request: true,
    doc_approved: true,
    listing_live: true,
    monthly_summary: false,
    platform_updates: false,
  });

  /* Avatar upload */
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);

  const [activeTab, setActiveTab] = useState<AccountTab>('profile');
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  /* Save helpers */
  async function saveProfile() {
    if (!user) return;
    setSaving(true);
    setSaveMsg('');
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: `${firstName} ${lastName}`.trim(),
        display_name: displayName,
        bio,
      })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      setSaveMsg('Error saving. Please try again.');
    } else {
      setSaveMsg('Changes saved!');
      await refreshProfile();
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }

  async function uploadAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    const ext = file.name.split('.').pop() ?? 'jpg';
    const filePath = `${user.id}/avatar.${ext}`;
    const { data: upData, error: upErr } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (upErr) { setAvatarUploading(false); return; }
    const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(upData.path);
    await supabase.from('profiles').update({ avatar_url: urlData.publicUrl }).eq('id', user.id);
    await refreshProfile();
    setAvatarUploading(false);
  }

  async function saveContact() {
    if (!user) return;
    setSaving(true);
    setSaveMsg('');
    const { error } = await supabase
      .from('profiles')
      .update({ phone, whatsapp, city, bank_name: bankName.trim() || null, bank_account: bankAccount.trim() || null })
      .eq('id', user.id);
    setSaving(false);
    if (error) {
      setSaveMsg('Error saving. Please try again.');
    } else {
      setSaveMsg('Contact details saved!');
      await refreshProfile();
      setTimeout(() => setSaveMsg(''), 3000);
    }
  }

  async function updatePassword() {
    setPwError('');
    setPwSuccess('');
    if (!newPassword || newPassword.length < 6) {
      setPwError('Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwError(error.message);
    } else {
      setPwSuccess('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    }
  }

  async function submitCid() {
    if (!user || !cidNumber.trim() || !cidFile) return;
    setCidSubmitting(true);
    setCidMsg('');
    const ext = cidFile.name.split('.').pop() ?? 'jpg';
    const filePath = `${user.id}/cid.${ext}`;
    const { data: upData, error: upErr } = await supabase.storage.from('cid-docs').upload(filePath, cidFile, { upsert: true });
    if (upErr) { setCidMsg(`Upload failed: ${upErr.message}`); setCidSubmitting(false); return; }
    const { data: urlData } = supabase.storage.from('cid-docs').getPublicUrl(upData.path);
    const { error } = await supabase.from('profiles').update({
      cid_number: cidNumber.trim(),
      cid_status: 'pending',
      cid_doc_url: urlData.publicUrl,
    }).eq('id', user.id);
    await refreshProfile();
    setCidSubmitting(false);
    if (error) { setCidMsg(`Submission failed: ${error.message}`); }
    else { setCidMsg('Submitted! An admin will verify your CID within 24–48 hours.'); }
  }

  const ownerName =
    profile?.display_name ?? profile?.full_name ?? 'Owner';
  const ownerInitial = ownerName.charAt(0).toUpperCase();
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : 'January 2026';

  const tabBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 20px',
    border: 'none',
    borderBottom: active ? '2.5px solid var(--lav-500)' : '2.5px solid transparent',
    background: 'transparent',
    color: active ? 'var(--lav-500)' : 'var(--slate2)',
    fontWeight: active ? 600 : 500,
    fontSize: 14,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
    transition: 'all 0.15s',
  });


  const sectionTitle = (t: string) => (
    <h3
      style={{
        fontFamily: "'DM Serif Display', serif",
        fontSize: 18,
        color: 'var(--ink)',
        marginBottom: 22,
      }}
    >
      {t}
    </h3>
  );

  const btnPrimary: React.CSSProperties = {
    background: 'var(--lav-500)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    padding: '10px 22px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  };

  const btnSecondary: React.CSSProperties = {
    background: 'var(--lav-100)',
    color: 'var(--slate)',
    border: 'none',
    borderRadius: 10,
    padding: '10px 22px',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
  };

  const DOCUMENTS = [
    {
      id: 'd1',
      title: 'CID',
      date: 'Uploaded Jan 12, 2026',
      status: 'verified' as const,
      color: '#2D8A5E',
      bg: '#E5F8EF',
    },
    {
      id: 'd2',
      title: 'Land Certificate 1',
      date: 'Uploaded Jan 12, 2026',
      status: 'verified' as const,
      color: '#2D8A5E',
      bg: '#E5F8EF',
    },
    {
      id: 'd3',
      title: 'Land Certificate 2',
      date: 'Uploaded Feb 3, 2026',
      status: 'verified' as const,
      color: '#2D8A5E',
      bg: '#E5F8EF',
    },
    {
      id: 'd4',
      title: 'Tax Clearance 2025',
      date: 'Uploaded Apr 15, 2026',
      status: 'pending' as const,
      color: '#8A6200',
      bg: '#FFF8E0',
    },
  ];

  const NOTIFICATIONS = [
    {
      key: 'new_inquiry' as keyof typeof notifState,
      label: 'New Inquiry Received',
      desc: 'Get notified when a tenant sends an inquiry about your property.',
    },
    {
      key: 'lease_request' as keyof typeof notifState,
      label: 'Lease Request',
      desc: 'Be alerted when a new lease request is submitted.',
    },
    {
      key: 'doc_approved' as keyof typeof notifState,
      label: 'Document Approved',
      desc: 'Receive confirmation when your submitted documents are approved.',
    },
    {
      key: 'listing_live' as keyof typeof notifState,
      label: 'Listing Goes Live',
      desc: 'Know immediately when your listing is published on DrukNest.',
    },
    {
      key: 'monthly_summary' as keyof typeof notifState,
      label: 'Monthly Earnings Summary',
      desc: 'Receive a monthly report of your rental income.',
    },
    {
      key: 'platform_updates' as keyof typeof notifState,
      label: 'Platform Updates',
      desc: 'Stay informed about new features and DrukNest announcements.',
    },
  ];

  return (
    <div
      style={{
        paddingTop: 66,
        minHeight: '100vh',
        background: 'var(--lav-50)',
      }}
    >
      {/* Header Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E1B2E 0%, #3B2D6E 100%)',
          padding: '44px 40px 72px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* bhu-border overlay */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              repeating-linear-gradient(45deg, rgba(139,111,232,0.08) 0px, rgba(139,111,232,0.08) 1px, transparent 1px, transparent 10px),
              repeating-linear-gradient(-45deg, rgba(139,111,232,0.08) 0px, rgba(139,111,232,0.08) 1px, transparent 1px, transparent 10px)
            `,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'relative',
            maxWidth: 1100,
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          {/* Left: identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div
              onClick={() => !avatarUploading && avatarInputRef.current?.click()}
              style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--lav-300), var(--lav-600))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: 32, flexShrink: 0,
                boxShadow: '0 4px 20px rgba(139,111,232,0.35)',
                cursor: 'pointer', overflow: 'hidden', position: 'relative',
              }}
            >
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : avatarUploading ? '...' : ownerInitial}
              <div style={{
                position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                opacity: 0, transition: 'opacity 0.2s', fontSize: 18,
              }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '0')}
              >
                ✎
              </div>
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />
            <div>
              <div
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 28,
                  color: '#fff',
                  lineHeight: 1.15,
                  marginBottom: 8,
                }}
              >
                {ownerName}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: '#fff',
                    fontSize: 12.5,
                    fontWeight: 600,
                    padding: '3px 12px',
                    borderRadius: 99,
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                >
                  <span style={{ color: '#7EE8A2' }}>✓</span> Verified Owner
                </span>
                <span
                  style={{
                    color: 'rgba(255,255,255,0.55)',
                    fontSize: 13,
                  }}
                >
                  Member since {memberSince}
                </span>
              </div>
            </div>
          </div>
          {/* Right: action buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={() => setView('add-property')}
              style={{
                background: 'var(--lav-500)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                boxShadow: 'var(--shadow)',
              }}
            >
              + Add Property
            </button>
            <button
              onClick={() => setView('owner')}
              style={{
                background: 'rgba(255,255,255,0.12)',
                color: '#fff',
                border: '1.5px solid rgba(255,255,255,0.25)',
                borderRadius: 12,
                padding: '10px 20px',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
              }}
            >
              My Dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          padding: '0 24px 40px',
        }}
      >
        {/* Tabs card — floats up */}
        <div
          style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: 'var(--shadow)',
            marginTop: -44,
            position: 'relative',
            zIndex: 2,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              borderBottom: '1.5px solid var(--lav-100)',
              overflowX: 'auto',
              padding: '0 8px',
            }}
          >
            {(
              [
                { key: 'profile', label: 'Profile & Identity' },
                { key: 'contact', label: 'Contact Details' },
                { key: 'verify', label: profile?.cid_status === 'verified' ? '✓ CID Verified' : 'Verify CID' },
                { key: 'documents', label: 'Documents' },
                { key: 'notifications', label: 'Notifications' },
                { key: 'security', label: 'Security' },
              ] as { key: AccountTab; label: string }[]
            ).map(({ key, label }) => (
              <button
                key={key}
                style={tabBtnStyle(activeTab === key)}
                onClick={() => setActiveTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Profile & Identity ───────────────────────────── */}
          {activeTab === 'profile' && (
            <div style={{ padding: '32px' }}>
              {sectionTitle('Profile & Identity')}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 18,
                  marginBottom: 18,
                }}
              >
                <Field
                  label="First Name"
                  value={firstName}
                  onChange={setFirstName}
                  placeholder="e.g. Karma"
                />
                <Field
                  label="Last Name"
                  value={lastName}
                  onChange={setLastName}
                  placeholder="e.g. Dorji"
                />
                <Field
                  label="Display Name"
                  value={displayName}
                  onChange={setDisplayName}
                  placeholder="How others see you"
                />
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: 'var(--slate2)',
                      marginBottom: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Pronouns
                  </label>
                  <select
                    value={pronouns}
                    onChange={(e) => setPronouns(e.target.value)}
                    style={{
                      width: '100%',
                      border: '1.5px solid var(--lav-200)',
                      borderRadius: 10,
                      padding: '11px 14px',
                      fontSize: 14,
                      color: 'var(--ink)',
                      background: '#fff',
                      outline: 'none',
                      appearance: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Prefer not to say</option>
                    <option value="he/him">He / Him</option>
                    <option value="she/her">She / Her</option>
                    <option value="they/them">They / Them</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label
                  style={{
                    display: 'block',
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: 'var(--slate2)',
                    marginBottom: 6,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  About Yourself
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  placeholder="Tell tenants a bit about yourself, your properties and your experience as a host..."
                  style={{
                    width: '100%',
                    border: '1.5px solid var(--lav-200)',
                    borderRadius: 10,
                    padding: '12px 14px',
                    fontSize: 14,
                    color: 'var(--ink)',
                    background: '#fff',
                    outline: 'none',
                    resize: 'vertical',
                    lineHeight: 1.55,
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = 'var(--lav-400)')
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = 'var(--lav-200)')
                  }
                />
              </div>
              {saveMsg && (
                <div
                  style={{
                    color: saveMsg.startsWith('Error')
                      ? '#C0392B'
                      : '#2D8A5E',
                    fontSize: 13,
                    fontWeight: 500,
                    marginBottom: 12,
                  }}
                >
                  {saveMsg}
                </div>
              )}
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  style={btnSecondary}
                  onClick={() => {
                    setFirstName(profile?.full_name?.split(' ')[0] ?? '');
                    setLastName(
                      profile?.full_name?.split(' ').slice(1).join(' ') ?? ''
                    );
                    setDisplayName(
                      profile?.display_name ?? profile?.full_name ?? ''
                    );
                    setBio(profile?.bio ?? '');
                    setSaveMsg('');
                  }}
                >
                  Discard
                </button>
                <button
                  style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}
                  onClick={saveProfile}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          )}

          {/* ── Contact Details ──────────────────────────────── */}
          {activeTab === 'contact' && (
            <div style={{ padding: '32px' }}>
              {sectionTitle('Contact Details')}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 18,
                  marginBottom: 24,
                }}
              >
                <Field
                  label="Email Address"
                  value={profile?.email ?? user?.email ?? ''}
                  readOnly
                />
                <Field
                  label="Phone Number"
                  value={phone}
                  onChange={setPhone}
                  type="tel"
                  placeholder="+975 17 XXXXXX"
                />
                <Field
                  label="WhatsApp Number"
                  value={whatsapp}
                  onChange={setWhatsapp}
                  type="tel"
                  placeholder="+975 17 XXXXXX"
                />
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: 'var(--slate2)',
                      marginBottom: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    City
                  </label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    style={{
                      width: '100%',
                      border: '1.5px solid var(--lav-200)',
                      borderRadius: 10,
                      padding: '11px 14px',
                      fontSize: 14,
                      color: 'var(--ink)',
                      background: '#fff',
                      outline: 'none',
                      appearance: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="">Select city</option>
                    <option value="Thimphu">Thimphu</option>
                    <option value="Paro">Paro</option>
                    <option value="Phuentsholing">Phuentsholing</option>
                    <option value="GMC">GMC</option>
                    <option value="Bumthang">Bumthang</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: 'var(--slate2)',
                      marginBottom: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Preferred Contact Method
                  </label>
                  <select
                    value={preferredContact}
                    onChange={(e) => setPreferredContact(e.target.value)}
                    style={{
                      width: '100%',
                      border: '1.5px solid var(--lav-200)',
                      borderRadius: 10,
                      padding: '11px 14px',
                      fontSize: 14,
                      color: 'var(--ink)',
                      background: '#fff',
                      outline: 'none',
                      appearance: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option>WhatsApp</option>
                    <option>Phone</option>
                    <option>Email</option>
                  </select>
                </div>
                <div>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: 'var(--slate2)',
                      marginBottom: 6,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Response Time
                  </label>
                  <select
                    value={responseTime}
                    onChange={(e) => setResponseTime(e.target.value)}
                    style={{
                      width: '100%',
                      border: '1.5px solid var(--lav-200)',
                      borderRadius: 10,
                      padding: '11px 14px',
                      fontSize: 14,
                      color: 'var(--ink)',
                      background: '#fff',
                      outline: 'none',
                      appearance: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option>Within 1 hour</option>
                    <option>Within 24 hours</option>
                    <option>Within 48 hours</option>
                    <option>Within a week</option>
                  </select>
                </div>
              </div>
              {/* Bank details for receiving rent */}
              <div style={{ margin: '24px 0', padding: '20px 22px', background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 12 }}>
                <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: 'var(--ink)', margin: '0 0 4px' }}>Bank Details for Rent Payments</p>
                <p style={{ fontSize: 13, color: 'var(--slate2)', margin: '0 0 16px', lineHeight: 1.5 }}>Tenants will use these details to transfer rent. Required to use the payment tracking feature.</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <Field label="Bank Name" value={bankName} onChange={setBankName} placeholder="e.g. Bank of Bhutan" />
                  <Field label="Account Number" value={bankAccount} onChange={setBankAccount} placeholder="e.g. 01234567890" />
                </div>
              </div>

              {saveMsg && (
                <div
                  style={{
                    color: saveMsg.startsWith('Error')
                      ? '#C0392B'
                      : '#2D8A5E',
                    fontSize: 13,
                    fontWeight: 500,
                    marginBottom: 12,
                  }}
                >
                  {saveMsg}
                </div>
              )}
              <button
                style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}
                onClick={saveContact}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}

          {/* ── Documents ───────────────────────────────────── */}
          {activeTab === 'documents' && (
            <div style={{ padding: '32px' }}>
              {sectionTitle('Documents')}
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--slate2)',
                  marginBottom: 24,
                  lineHeight: 1.6,
                  maxWidth: 600,
                }}
              >
                Your submitted documents are reviewed by the DrukNest team to
                verify your identity and property ownership. All documents are
                stored securely and are never shared with tenants.
              </p>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                  marginBottom: 28,
                }}
              >
                {DOCUMENTS.map((doc) => (
                  <div
                    key={doc.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '16px 18px',
                      border: '1.5px solid var(--lav-100)',
                      borderRadius: 12,
                      background: 'var(--lav-50)',
                    }}
                  >
                    {/* Doc icon */}
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 10,
                        background: doc.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: doc.color,
                        flexShrink: 0,
                      }}
                    >
                      <Icon type="doc" size={20} />
                    </div>
                    {/* Info */}
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14,
                          color: 'var(--ink)',
                        }}
                      >
                        {doc.title}
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: 'var(--slate3)',
                          marginTop: 2,
                        }}
                      >
                        {doc.date}
                      </div>
                    </div>
                    {/* Status badge */}
                    <span
                      style={{
                        padding: '3px 11px',
                        borderRadius: 99,
                        fontSize: 12,
                        fontWeight: 700,
                        background: doc.bg,
                        color: doc.color,
                      }}
                    >
                      {doc.status === 'verified' ? 'Verified' : 'Pending Review'}
                    </span>
                    {/* Replace button */}
                    <button
                      style={{
                        background: 'var(--lav-100)',
                        color: 'var(--lav-600)',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 14px',
                        fontSize: 13,
                        fontWeight: 600,
                        cursor: 'pointer',
                        flexShrink: 0,
                      }}
                    >
                      Replace
                    </button>
                  </div>
                ))}
              </div>

              {/* Drag-drop upload */}
              <div
                style={{
                  border: '2px dashed var(--lav-300)',
                  borderRadius: 14,
                  padding: '32px 24px',
                  textAlign: 'center',
                  background: 'var(--lav-50)',
                  cursor: 'pointer',
                }}
                onDragOver={(e) => e.preventDefault()}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: 'var(--lav-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--lav-500)',
                    margin: '0 auto 12px',
                  }}
                >
                  <Icon type="doc" size={22} />
                </div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 600,
                    color: 'var(--ink)',
                    marginBottom: 6,
                  }}
                >
                  Upload Additional Document
                </div>
                <div style={{ fontSize: 13, color: 'var(--slate3)' }}>
                  Drag and drop your file here, or{' '}
                  <span style={{ color: 'var(--lav-500)', fontWeight: 600 }}>
                    browse
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: 'var(--slate4)',
                    marginTop: 6,
                  }}
                >
                  PDF, JPG or PNG · Max 10MB
                </div>
              </div>
            </div>
          )}

          {/* ── Notifications ───────────────────────────────── */}
          {activeTab === 'notifications' && (
            <div style={{ padding: '32px' }}>
              {sectionTitle('Notification Preferences')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {NOTIFICATIONS.map((n, idx) => (
                  <div
                    key={n.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 16,
                      padding: '18px 0',
                      borderBottom:
                        idx < NOTIFICATIONS.length - 1
                          ? '1px solid var(--lav-100)'
                          : 'none',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontWeight: 600,
                          fontSize: 14.5,
                          color: 'var(--ink)',
                          marginBottom: 3,
                        }}
                      >
                        {n.label}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--slate3)' }}>
                        {n.desc}
                      </div>
                    </div>
                    <Toggle
                      on={notifState[n.key]}
                      onChange={(v) =>
                        setNotifState((prev) => ({ ...prev, [n.key]: v }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Verify CID ──────────────────────────────────── */}
          {activeTab === 'verify' && (
            <div style={{ padding: '32px', maxWidth: 560 }}>
              {sectionTitle('CID Verification')}
              <p style={{ fontSize: 14, color: 'var(--slate2)', marginBottom: 24, lineHeight: 1.7 }}>
                Verify your Bhutan Citizenship Identity Document (CID) to build trust with tenants and get a verified badge on your listings.
              </p>

              {/* Current status banner */}
              {profile?.cid_status === 'verified' && (
                <div style={{ background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>🪪</span>
                  <div>
                    <p style={{ fontWeight: 700, color: '#16A34A', margin: 0 }}>CID Verified</p>
                    <p style={{ fontSize: 13, color: '#15803D', margin: '2px 0 0' }}>Your identity has been verified by the DrukNest team.</p>
                  </div>
                </div>
              )}
              {profile?.cid_status === 'pending' && (
                <div style={{ background: '#FFFBEB', border: '1.5px solid #FDE68A', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>⏳</span>
                  <div>
                    <p style={{ fontWeight: 700, color: '#D97706', margin: 0 }}>Verification Pending</p>
                    <p style={{ fontSize: 13, color: '#92400E', margin: '2px 0 0' }}>Your CID is under review. This usually takes 24–48 hours.</p>
                  </div>
                </div>
              )}
              {profile?.cid_status === 'rejected' && (
                <div style={{ background: '#FEF2F2', border: '1.5px solid #FECACA', borderRadius: 12, padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 24 }}>❌</span>
                  <div>
                    <p style={{ fontWeight: 700, color: '#DC2626', margin: 0 }}>Verification Rejected</p>
                    <p style={{ fontSize: 13, color: '#B91C1C', margin: '2px 0 0' }}>Please re-submit with a clearer photo of your CID.</p>
                  </div>
                </div>
              )}

              {/* Form — show if not yet verified */}
              {profile?.cid_status !== 'verified' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <Field
                    label="CID Number *"
                    value={cidNumber}
                    onChange={setCidNumber}
                    placeholder="e.g. 11901002345"
                  />
                  <div>
                    <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--slate2)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      CID Document Photo *
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 18px', border: `2px dashed ${cidFile ? 'var(--lav-400)' : 'var(--lav-200)'}`, borderRadius: 12, cursor: 'pointer', background: cidFile ? 'var(--lav-50)' : '#fff', transition: 'border-color 0.2s' }}>
                      <span style={{ fontSize: 24 }}>{cidFile ? '📄' : '📎'}</span>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', margin: 0 }}>
                          {cidFile ? cidFile.name : 'Upload CID photo'}
                        </p>
                        <p style={{ fontSize: 12, color: 'var(--slate3)', margin: '2px 0 0' }}>JPG, PNG — front side of your CID card</p>
                      </div>
                      <input type="file" accept="image/*" onChange={e => setCidFile(e.target.files?.[0] ?? null)} style={{ display: 'none' }} />
                    </label>
                  </div>

                  {cidMsg && (
                    <div style={{ padding: '12px 16px', borderRadius: 10, background: cidMsg.startsWith('Submitted') ? '#F0FDF4' : '#FEF2F2', color: cidMsg.startsWith('Submitted') ? '#16A34A' : '#DC2626', fontSize: 13, fontWeight: 500 }}>
                      {cidMsg}
                    </div>
                  )}

                  <button
                    onClick={submitCid}
                    disabled={cidSubmitting || !cidNumber.trim() || !cidFile}
                    style={{ background: cidNumber.trim() && cidFile ? 'var(--lav-500)' : 'var(--lav-200)', color: cidNumber.trim() && cidFile ? '#fff' : 'var(--slate3)', border: 'none', borderRadius: 11, padding: '12px 28px', fontSize: 14, fontWeight: 600, cursor: cidNumber.trim() && cidFile ? 'pointer' : 'not-allowed', fontFamily: "'DM Sans', sans-serif", alignSelf: 'flex-start' }}
                  >
                    {cidSubmitting ? 'Submitting…' : profile?.cid_status === 'pending' ? 'Resubmit for Verification' : 'Submit for Verification'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── Security ────────────────────────────────────── */}
          {activeTab === 'security' && (
            <div style={{ padding: '32px' }}>
              {sectionTitle('Security')}

              {/* Status badges */}
              <div
                style={{
                  display: 'flex',
                  gap: 12,
                  marginBottom: 32,
                  flexWrap: 'wrap',
                }}
              >
                {[
                  { label: 'CID Verified', icon: '✓', ok: true },
                  { label: 'Email Confirmed', icon: '✓', ok: true },
                  { label: '2FA', icon: '·', ok: false, extra: 'Off' },
                ].map((b) => (
                  <div
                    key={b.label}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 7,
                      padding: '8px 16px',
                      borderRadius: 99,
                      background: b.ok ? '#E5F8EF' : 'var(--lav-100)',
                      color: b.ok ? '#2D8A5E' : 'var(--slate2)',
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    <span>{b.icon}</span>
                    {b.label}
                    {b.extra && (
                      <span style={{ opacity: 0.65 }}>{b.extra}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Change password */}
              <div
                style={{
                  maxWidth: 480,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  marginBottom: 28,
                }}
              >
                <Field
                  label="Current Password"
                  type="password"
                  value={currentPassword}
                  onChange={setCurrentPassword}
                  placeholder="Enter current password"
                />
                <Field
                  label="New Password"
                  type="password"
                  value={newPassword}
                  onChange={setNewPassword}
                  placeholder="Min. 6 characters"
                />
                <Field
                  label="Confirm New Password"
                  type="password"
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  placeholder="Re-enter new password"
                />
                {pwError && (
                  <div
                    style={{ color: '#C0392B', fontSize: 13, fontWeight: 500 }}
                  >
                    {pwError}
                  </div>
                )}
                {pwSuccess && (
                  <div
                    style={{ color: '#2D8A5E', fontSize: 13, fontWeight: 500 }}
                  >
                    {pwSuccess}
                  </div>
                )}
                <button style={btnPrimary} onClick={updatePassword}>
                  Update Password
                </button>
              </div>

              {/* Danger zone */}
              <div
                style={{
                  borderTop: '1.5px solid var(--lav-100)',
                  paddingTop: 24,
                  marginTop: 8,
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: '#C0392B',
                    marginBottom: 6,
                  }}
                >
                  Danger Zone
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: 'var(--slate2)',
                    marginBottom: 14,
                  }}
                >
                  Permanently delete your account and all associated data. This
                  action cannot be undone.
                </div>
                <button
                  style={{
                    background: '#FFF0F0',
                    color: '#C0392B',
                    border: '1.5px solid #FBBABA',
                    borderRadius: 10,
                    padding: '10px 22px',
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Delete Account
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
