import React, { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Icon } from '../components/Icons';

interface SignInProps {
  setView: (v: string) => void;
}

type TabType = 'signin' | 'create';
type RoleType = 'tenant' | 'owner';
type StepType = 1 | 2;

export default function SignIn({ setView }: SignInProps) {
  const { signIn, signUp } = useAuth();

  // Tab
  const [tab, setTab] = useState<TabType>('signin');

  // Sign-in state
  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');
  const [siError, setSiError] = useState('');
  const [siLoading, setSiLoading] = useState(false);

  // Create account state
  const [role, setRole] = useState<RoleType>('tenant');
  const [step, setStep] = useState<StepType>(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [caEmail, setCaEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [caPassword, setCaPassword] = useState('');
  const [caError, setCaError] = useState('');
  const [caLoading, setCaLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [resendSent, setResendSent] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  async function handleResendConfirmation() {
    setResendLoading(true);
    const { supabase } = await import('../lib/supabase');
    await supabase.auth.resend({ type: 'signup', email: siEmail });
    setResendLoading(false);
    setResendSent(true);
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setSiError('');
    setResendSent(false);
    setSiLoading(true);
    const { error } = await signIn(siEmail, siPassword);
    setSiLoading(false);
    if (error) {
      setSiError(error);
      return;
    }
    // re-fetch profile to determine role redirect
    const { data } = await (await import('../lib/supabase')).supabase
      .from('profiles')
      .select('role')
      .eq('email', siEmail)
      .single();
    const r = data?.role ?? 'tenant';
    if (r === 'owner') setView('account');
    else if (r === 'admin') setView('admin');
    else setView('home');
  }

  function handleStep1(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !caEmail.trim() || !caPassword.trim()) {
      setCaError('Please fill in all required fields.');
      return;
    }
    if (caPassword.length < 6) {
      setCaError('Password must be at least 6 characters.');
      return;
    }
    setCaError('');
    setStep(2);
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setCaError('');
    setCaLoading(true);
    const fullName = `${firstName.trim()} ${lastName.trim()}`;
    const { error } = await signUp(caEmail, caPassword, fullName, role);
    setCaLoading(false);
    if (error) {
      // Surface auth errors (wrong password format, duplicate email, etc.)
      // but swallow profile-save errors — they're handled by DB trigger
      if (
        error.includes('already registered') ||
        error.includes('already been registered') ||
        error.includes('User already registered')
      ) {
        setCaError('An account with this email already exists. Please sign in instead.');
        return;
      }
      if (
        error.includes('Password') ||
        error.includes('password') ||
        error.includes('email') ||
        error.includes('Email')
      ) {
        setCaError(error);
        return;
      }
      // Profile DB errors — account was created, just proceed
    }
    setView(role === 'owner' ? 'account' : 'home');
  }

  function handleFileDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) setUploadedFile(file.name);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) setUploadedFile(file.name);
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    border: '1.5px solid var(--lav-200)',
    fontSize: 14,
    fontFamily: "'DM Sans', sans-serif",
    color: 'var(--ink)',
    background: '#fff',
    transition: 'border-color 0.18s',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 12,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    color: 'var(--slate)',
    marginBottom: 5,
    letterSpacing: '0.02em',
  };

  const primaryBtn: React.CSSProperties = {
    width: '100%',
    padding: '13px 0',
    borderRadius: 12,
    border: 'none',
    background: 'linear-gradient(135deg, #8B6FE8 0%, #7254CC 100%)',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    fontFamily: "'DM Sans', sans-serif",
    cursor: 'pointer',
    boxShadow: '0 4px 18px rgba(139,111,232,0.30)',
    transition: 'opacity 0.2s',
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        background: 'var(--lav-50)',
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {/* ── Left Decorative Panel ── */}
      <div
        style={{
          width: '42%',
          flexShrink: 0,
          background: 'linear-gradient(160deg, #1E1B2E 0%, #2D2260 50%, #3B2D6E 100%)',
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '48px 44px',
        }}
      >
        {/* Diamond grid overlay */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              repeating-linear-gradient(45deg, rgba(139,111,232,0.10) 0px, rgba(139,111,232,0.10) 1px, transparent 1px, transparent 40px),
              repeating-linear-gradient(-45deg, rgba(139,111,232,0.10) 0px, rgba(139,111,232,0.10) 1px, transparent 1px, transparent 40px)
            `,
          }}
        />
        {/* Glow orbs */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '20%',
            left: '30%',
            width: 260,
            height: 260,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,111,232,0.28) 0%, transparent 70%)',
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '15%',
            right: '10%',
            width: 180,
            height: 180,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(180,140,255,0.20) 0%, transparent 70%)',
          }}
        />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <button
            onClick={() => setView('home')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: 0,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #8B6FE8, #7254CC)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <Icon type="logo" size={22} />
            </div>
            <span
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 20,
                color: '#fff',
                letterSpacing: '-0.02em',
              }}
            >
              DrukNest
            </span>
          </button>
        </div>

        {/* Main copy */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <h1
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 42,
              color: '#fff',
              lineHeight: 1.2,
              marginBottom: 20,
              letterSpacing: '-0.02em',
            }}
          >
            Find your place<br />
            <span style={{ color: 'var(--lav-300)' }}>in Bhutan</span>
          </h1>
          <p
            style={{
              fontSize: 15,
              color: 'rgba(255,255,255,0.70)',
              lineHeight: 1.7,
              maxWidth: 300,
            }}
          >
            Verified listings, digital leases, and a community built on trust — across Thimphu, Paro and beyond.
          </p>

          {/* Trust indicators */}
          <div
            style={{
              marginTop: 36,
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            {[
              { icon: 'shield' as const, text: 'CID-verified tenants & owners' },
              { icon: 'doc' as const, text: 'Legally recognised digital leases' },
              { icon: 'verified' as const, text: 'Admin-reviewed listings only' },
            ].map((item) => (
              <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: 'rgba(139,111,232,0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--lav-300)',
                    flexShrink: 0,
                  }}
                >
                  <Icon type={item.icon} size={16} />
                </div>
                <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)' }}>
            © 2026 DrukNest · Bhutan
          </p>
        </div>
      </div>

      {/* ── Right Form Area ── */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px',
          overflowY: 'auto',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 480,
          }}
        >
          {/* Tabs */}
          <div
            style={{
              display: 'flex',
              background: 'var(--lav-100)',
              borderRadius: 14,
              padding: 4,
              marginBottom: 32,
            }}
          >
            {(['signin', 'create'] as TabType[]).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setSiError(''); setCaError(''); setStep(1); }}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  borderRadius: 10,
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  background: tab === t ? '#fff' : 'transparent',
                  color: tab === t ? 'var(--ink)' : 'var(--slate3)',
                  boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
                }}
              >
                {t === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            ))}
          </div>

          {/* ── SIGN IN ── */}
          {tab === 'signin' && (
            <div>
              <h2
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 28,
                  color: 'var(--ink)',
                  marginBottom: 6,
                  letterSpacing: '-0.02em',
                }}
              >
                Welcome back
              </h2>
              <p style={{ fontSize: 14, color: 'var(--slate2)', marginBottom: 28 }}>
                Sign in to your DrukNest account
              </p>

              <form onSubmit={handleSignIn} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={labelStyle}>Email address</label>
                  <input
                    type="email"
                    value={siEmail}
                    onChange={(e) => setSiEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--lav-400)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--lav-200)')}
                  />
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>Password</label>
                    <button
                      type="button"
                      style={{
                        background: 'none',
                        border: 'none',
                        fontSize: 12,
                        color: 'var(--lav-600)',
                        cursor: 'pointer',
                        fontFamily: "'DM Sans', sans-serif",
                        fontWeight: 500,
                      }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    type="password"
                    value={siPassword}
                    onChange={(e) => setSiPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    style={inputStyle}
                    onFocus={(e) => (e.target.style.borderColor = 'var(--lav-400)')}
                    onBlur={(e) => (e.target.style.borderColor = 'var(--lav-200)')}
                  />
                </div>

                {siError && (
                  <div
                    style={{
                      background: siError.toLowerCase().includes('confirm') ? '#FFF8E6' : '#FFF0F3',
                      border: `1px solid ${siError.toLowerCase().includes('confirm') ? '#FFD97A' : '#FFD0D9'}`,
                      borderRadius: 10,
                      padding: '12px 14px',
                      fontSize: 13,
                      color: siError.toLowerCase().includes('confirm') ? '#92600A' : '#C0264A',
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {siError.toLowerCase().includes('confirm') ? (
                      <>
                        <strong>Email not confirmed.</strong> Please check your inbox and click the confirmation link, then sign in.
                        <br />
                        {resendSent ? (
                          <span style={{ color: '#2D8A5E', fontWeight: 600, marginTop: 6, display: 'inline-block' }}>
                            ✓ Confirmation email resent — check your inbox.
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendConfirmation}
                            disabled={resendLoading}
                            style={{
                              background: 'none', border: 'none', color: '#7254CC',
                              fontWeight: 700, fontSize: 13, cursor: 'pointer',
                              padding: 0, marginTop: 6, display: 'inline-block',
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            {resendLoading ? 'Sending…' : 'Resend confirmation email →'}
                          </button>
                        )}
                      
                      </>
                    ) : siError}
                  </div>
                )}

                <button type="submit" style={{ ...primaryBtn, opacity: siLoading ? 0.7 : 1 }} disabled={siLoading}>
                  {siLoading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>

              <p
                style={{
                  textAlign: 'center',
                  marginTop: 22,
                  fontSize: 13,
                  color: 'var(--slate2)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Don't have an account?{' '}
                <button
                  onClick={() => setTab('create')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--lav-600)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Sign up
                </button>
              </p>
            </div>
          )}

          {/* ── CREATE ACCOUNT ── */}
          {tab === 'create' && (
            <div>
              <h2
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 28,
                  color: 'var(--ink)',
                  marginBottom: 6,
                  letterSpacing: '-0.02em',
                }}
              >
                {step === 1 ? 'Create your account' : 'Verify your identity'}
              </h2>
              <p style={{ fontSize: 14, color: 'var(--slate2)', marginBottom: 22 }}>
                {step === 1 ? 'Step 1 of 2 — Your details' : 'Step 2 of 2 — Identity verification'}
              </p>

              {/* Progress bar */}
              <div
                style={{
                  height: 4,
                  borderRadius: 99,
                  background: 'var(--lav-100)',
                  marginBottom: 28,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: step === 1 ? '50%' : '100%',
                    borderRadius: 99,
                    background: 'linear-gradient(90deg, #8B6FE8, #7254CC)',
                    transition: 'width 0.4s cubic-bezier(.22,1,.36,1)',
                  }}
                />
              </div>

              {/* Role selector */}
              {step === 1 && (
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    marginBottom: 24,
                  }}
                >
                  {(['tenant', 'owner'] as RoleType[]).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setRole(r)}
                      style={{
                        flex: 1,
                        padding: '10px 0',
                        borderRadius: 10,
                        border: `2px solid ${role === r ? 'var(--lav-500)' : 'var(--lav-200)'}`,
                        background: role === r ? 'var(--lav-100)' : '#fff',
                        color: role === r ? 'var(--lav-700)' : 'var(--slate2)',
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: "'DM Sans', sans-serif",
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {r === 'tenant' ? '🏠 I am a Tenant' : '🔑 I am an Owner'}
                    </button>
                  ))}
                </div>
              )}

              {/* Step 1 Fields */}
              {step === 1 && (
                <form onSubmit={handleStep1} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>First Name</label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Karma"
                        required
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = 'var(--lav-400)')}
                        onBlur={(e) => (e.target.style.borderColor = 'var(--lav-200)')}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>Last Name</label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Wangchuk"
                        required
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = 'var(--lav-400)')}
                        onBlur={(e) => (e.target.style.borderColor = 'var(--lav-200)')}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Email address</label>
                    <input
                      type="email"
                      value={caEmail}
                      onChange={(e) => setCaEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = 'var(--lav-400)')}
                      onBlur={(e) => (e.target.style.borderColor = 'var(--lav-200)')}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Phone number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+975 17xxxxxx"
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = 'var(--lav-400)')}
                      onBlur={(e) => (e.target.style.borderColor = 'var(--lav-200)')}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Password</label>
                    <input
                      type="password"
                      value={caPassword}
                      onChange={(e) => setCaPassword(e.target.value)}
                      placeholder="Min. 6 characters"
                      required
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = 'var(--lav-400)')}
                      onBlur={(e) => (e.target.style.borderColor = 'var(--lav-200)')}
                    />
                  </div>

                  {caError && (
                    <div
                      style={{
                        background: '#FFF0F3',
                        border: '1px solid #FFD0D9',
                        borderRadius: 10,
                        padding: '10px 14px',
                        fontSize: 13,
                        color: '#C0264A',
                      }}
                    >
                      {caError}
                    </div>
                  )}

                  <button type="submit" style={primaryBtn}>
                    Continue →
                  </button>
                </form>
              )}

              {/* Step 2 Fields */}
              {step === 2 && (
                <form onSubmit={handleCreateAccount} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Info box */}
                  <div
                    style={{
                      background: 'var(--lav-100)',
                      border: '1px solid var(--lav-200)',
                      borderRadius: 12,
                      padding: '14px 16px',
                      display: 'flex',
                      gap: 12,
                      alignItems: 'flex-start',
                    }}
                  >
                    <div style={{ color: 'var(--lav-600)', flexShrink: 0, marginTop: 1 }}>
                      <Icon type="shield" size={20} />
                    </div>
                    <div>
                      <p
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: 'var(--lav-700)',
                          marginBottom: 4,
                          fontFamily: "'DM Sans', sans-serif",
                        }}
                      >
                        Identity Verification Required
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--slate2)', lineHeight: 1.5 }}>
                        DrukNest verifies all users using their CID (Citizenship ID) or Passport to maintain a safe and trusted community. Your document is securely reviewed by our admin team.
                      </p>
                    </div>
                  </div>

                  {/* Owner warning */}
                  {role === 'owner' && (
                    <div
                      style={{
                        background: '#FFF9EC',
                        border: '1px solid #FFE0A0',
                        borderRadius: 12,
                        padding: '12px 16px',
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                      }}
                    >
                      <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
                      <div>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 600,
                            color: '#B8620A',
                            marginBottom: 3,
                            fontFamily: "'DM Sans', sans-serif",
                          }}
                        >
                          Owner Account Notice
                        </p>
                        <p style={{ fontSize: 12, color: '#7A5010', lineHeight: 1.5 }}>
                          As an owner, you must also provide proof of property ownership (land certificate or deed) in addition to your CID. Your listings will be reviewed by admin before going live.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Drag-drop upload */}
                  <div>
                    <label style={labelStyle}>Upload CID or Passport</label>
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleFileDrop}
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: `2px dashed ${dragOver ? 'var(--lav-500)' : uploadedFile ? 'var(--lav-400)' : 'var(--lav-300)'}`,
                        borderRadius: 12,
                        padding: '28px 20px',
                        textAlign: 'center',
                        cursor: 'pointer',
                        background: dragOver ? 'var(--lav-100)' : uploadedFile ? 'var(--lav-50)' : '#fff',
                        transition: 'all 0.2s',
                      }}
                    >
                      {uploadedFile ? (
                        <>
                          <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--lav-700)',
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            {uploadedFile}
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--slate3)', marginTop: 4 }}>
                            Click to replace
                          </p>
                        </>
                      ) : (
                        <>
                          <div style={{ color: 'var(--lav-400)', marginBottom: 8 }}>
                            <Icon type="doc" size={32} />
                          </div>
                          <p
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: 'var(--slate)',
                              fontFamily: "'DM Sans', sans-serif",
                            }}
                          >
                            Drag & drop your document here
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--slate3)', marginTop: 4 }}>
                            or click to browse · PDF, JPG, PNG
                          </p>
                        </>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      style={{ display: 'none' }}
                      onChange={handleFileChange}
                    />
                  </div>

                  {caError && (
                    <div
                      style={{
                        background: '#FFF0F3',
                        border: '1px solid #FFD0D9',
                        borderRadius: 10,
                        padding: '10px 14px',
                        fontSize: 13,
                        color: '#C0264A',
                      }}
                    >
                      {caError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      style={{
                        flex: 1,
                        padding: '13px 0',
                        borderRadius: 12,
                        border: '1.5px solid var(--lav-200)',
                        background: '#fff',
                        color: 'var(--slate)',
                        fontSize: 14,
                        fontWeight: 600,
                        fontFamily: "'DM Sans', sans-serif",
                        cursor: 'pointer',
                      }}
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      style={{ ...primaryBtn, flex: 2, opacity: caLoading ? 0.7 : 1 }}
                      disabled={caLoading}
                    >
                      {caLoading ? 'Creating account…' : 'Complete Registration'}
                    </button>
                  </div>
                </form>
              )}

              <p
                style={{
                  textAlign: 'center',
                  marginTop: 22,
                  fontSize: 13,
                  color: 'var(--slate2)',
                  fontFamily: "'DM Sans', sans-serif",
                }}
              >
                Already have an account?{' '}
                <button
                  onClick={() => setTab('signin')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--lav-600)',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 13,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  Sign in
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
