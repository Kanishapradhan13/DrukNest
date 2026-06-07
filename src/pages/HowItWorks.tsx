import React, { useState } from 'react';
import { Home, Search, FileText, BadgeCheck, ShieldCheck, Key } from 'lucide-react';

interface HowItWorksProps {
  setView: (v: string) => void;
}

type RoleTab = 'tenant' | 'owner';

interface Step {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}

const TENANT_STEPS: Step[] = [
  {
    number: '01',
    icon: <Home size={28} strokeWidth={1.8} />,
    title: 'Create Account',
    description:
      'Sign up with your email and verify your identity using your CID or Passport. Takes less than 5 minutes.',
  },
  {
    number: '02',
    icon: <Search size={28} strokeWidth={1.8} />,
    title: 'Search & Filter',
    description:
      'Browse verified listings by city, budget, type and duration. Use smart filters to find exactly what you need.',
  },
  {
    number: '03',
    icon: <Home size={28} strokeWidth={1.8} />,
    title: 'Connect with Owners',
    description:
      'Message verified property owners directly. Schedule a visit or ask questions — all within DrukNest.',
  },
  {
    number: '04',
    icon: <FileText size={28} strokeWidth={1.8} />,
    title: 'Sign Digitally',
    description:
      'Request a digital lease and sign securely using OTP verification. No paperwork, no hassle.',
  },
];

const OWNER_STEPS: Step[] = [
  {
    number: '01',
    icon: <FileText size={28} strokeWidth={1.8} />,
    title: 'Submit Ownership Documents',
    description:
      'Upload your property deed and CID through our secure portal. Our admin team reviews within 24 working hours.',
  },
  {
    number: '02',
    icon: <Home size={28} strokeWidth={1.8} />,
    title: 'List Your Property',
    description:
      'Create a detailed listing with photos, amenities, price and availability. Your listing goes live after admin approval.',
  },
  {
    number: '03',
    icon: <BadgeCheck size={28} strokeWidth={1.8} />,
    title: 'Receive Verified Inquiries',
    description:
      'Only CID-verified tenants can send inquiries. Review profiles, respond to messages and choose your tenant.',
  },
  {
    number: '04',
    icon: <ShieldCheck size={28} strokeWidth={1.8} />,
    title: 'Sign & Collect',
    description:
      'Both parties sign the digital lease. Collect your deposit securely, and track payments all in one place.',
  },
];

const TRUST_ITEMS = [
  {
    icon: <BadgeCheck size={30} strokeWidth={1.8} />,
    title: 'CID Verified Users',
    description:
      'Every tenant and owner must verify their Citizenship ID or Passport. No anonymous listings, no fake profiles.',
  },
  {
    icon: <FileText size={30} strokeWidth={1.8} />,
    title: 'Legal Digital Leases',
    description:
      "Our lease documents are compliant with Bhutan's Digital Information and Communication Act. OTP-signed and time-stamped.",
  },
  {
    icon: <ShieldCheck size={30} strokeWidth={1.8} />,
    title: 'Admin-Reviewed Listings',
    description:
      'Every listing is manually reviewed by our team before going live. Only legitimate properties with verified ownership are approved.',
  },
];

const FAQ_ITEMS = [
  {
    question: 'Is DrukNest free for tenants?',
    answer:
      'Yes — browsing listings and messaging owners is completely free for tenants. DrukNest charges no platform fee to tenants. Owners pay a small listing fee only when their property is successfully rented.',
  },
  {
    question: 'How long does owner verification take?',
    answer:
      'Owner documents are reviewed within 24 working hours. Once your CID and property deed are approved, your account is upgraded and you can start listing your property immediately.',
  },
  {
    question: 'Is the digital lease legally binding in Bhutan?',
    answer:
      'Yes. Digital leases signed on DrukNest include OTP verification and are time-stamped, making them legally valid under the Digital Information and Communication Act (DICA) of Bhutan. We recommend both parties download a copy for their records.',
  },
  {
    question: 'What if I encounter a fraudulent listing?',
    answer:
      'Use the "Report" button on any listing to flag it for review. Our trust & safety team investigates all reports within 2 hours. Fraudulent listings are removed immediately and accounts are suspended pending investigation.',
  },
];

export default function HowItWorks({ setView }: HowItWorksProps) {
  const [roleTab, setRoleTab] = useState<RoleTab>('tenant');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const steps = roleTab === 'tenant' ? TENANT_STEPS : OWNER_STEPS;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--lav-50)',
        fontFamily: "'DM Sans', sans-serif",
        paddingTop: 66,
      }}
    >
      {/* ── HERO ── */}
      <section
        style={{
          background: 'linear-gradient(155deg, #1E1B2E 0%, #2D2260 55%, #3B2D6E 100%)',
          position: 'relative',
          overflow: 'hidden',
          padding: '72px 24px 80px',
          textAlign: 'center',
        }}
      >
        {/* Grid overlay */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              repeating-linear-gradient(0deg, rgba(139,111,232,0.08) 0px, rgba(139,111,232,0.08) 1px, transparent 1px, transparent 64px),
              repeating-linear-gradient(90deg, rgba(139,111,232,0.08) 0px, rgba(139,111,232,0.08) 1px, transparent 1px, transparent 64px)
            `,
          }}
        />
        {/* Glow */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 600,
            height: 300,
            borderRadius: '50%',
            background: 'radial-gradient(ellipse, rgba(139,111,232,0.28) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              background: 'rgba(139,111,232,0.18)',
              border: '1px solid rgba(139,111,232,0.35)',
              borderRadius: 99,
              padding: '5px 14px',
              marginBottom: 20,
              fontSize: 12,
              fontWeight: 600,
              color: 'var(--lav-300)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            <ShieldCheck size={13} strokeWidth={1.8} />
            Trusted Rental Platform
          </div>

          <h1
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 52,
              color: '#fff',
              marginBottom: 16,
              letterSpacing: '-0.03em',
              lineHeight: 1.15,
            }}
          >
            How DrukNest Works
          </h1>
          <p
            style={{
              fontSize: 17,
              color: 'rgba(255,255,255,0.65)',
              maxWidth: 520,
              margin: '0 auto 36px',
              lineHeight: 1.7,
            }}
          >
            From searching your first apartment to signing a legally binding digital lease — everything in one trusted place.
          </p>

          {/* Role toggle pills */}
          <div
            style={{
              display: 'inline-flex',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.14)',
              borderRadius: 14,
              padding: 4,
              gap: 0,
            }}
          >
            {(['tenant', 'owner'] as RoleTab[]).map((r) => (
              <button
                key={r}
                onClick={() => setRoleTab(r)}
                style={{
                  padding: '10px 28px',
                  borderRadius: 10,
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 600,
                  fontFamily: "'DM Sans', sans-serif",
                  cursor: 'pointer',
                  transition: 'all 0.22s cubic-bezier(.22,1,.36,1)',
                  background: roleTab === r ? '#fff' : 'transparent',
                  color: roleTab === r ? 'var(--ink)' : 'rgba(255,255,255,0.65)',
                  boxShadow: roleTab === r ? 'var(--shadow)' : 'none',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {r === 'tenant' ? <Home size={15} strokeWidth={1.8} /> : <Key size={15} strokeWidth={1.8} />}
                  {r === 'tenant' ? 'I am a Tenant' : 'I am an Owner'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── STEPS GRID ── */}
      <section
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '72px 24px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 52 }}>
          <h2
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 36,
              color: 'var(--ink)',
              marginBottom: 10,
              letterSpacing: '-0.02em',
            }}
          >
            {roleTab === 'tenant' ? 'Your rental journey' : 'List with confidence'}
          </h2>
          <p style={{ fontSize: 15, color: 'var(--slate2)', maxWidth: 480, margin: '0 auto' }}>
            {roleTab === 'tenant'
              ? 'Four simple steps to find and secure your perfect home in Bhutan.'
              : 'Four steps to reach verified tenants and manage your property effortlessly.'}
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 16,
            position: 'relative',
          }}
        >
          {/* Connector line behind cards */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 60,
              left: '12.5%',
              right: '12.5%',
              height: 2,
              background:
                'repeating-linear-gradient(90deg, var(--lav-300) 0px, var(--lav-300) 8px, transparent 8px, transparent 16px)',
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />

          {steps.map((step, i) => (
            <div
              key={i}
              style={{
                background: '#fff',
                borderRadius: 22,
                boxShadow: 'var(--shadow)',
                padding: '28px 22px 26px',
                position: 'relative',
                zIndex: 1,
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-lg)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow)';
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)';
              }}
            >
              {/* Step number */}
              <span
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 40,
                  color: 'var(--lav-200)',
                  lineHeight: 1,
                  letterSpacing: '-0.03em',
                }}
              >
                {step.number}
              </span>

              {/* Icon */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: 'var(--lav-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--lav-600)',
                }}
              >
                {step.icon}
              </div>

              {/* Title */}
              <h3
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 18,
                  color: 'var(--ink)',
                  margin: 0,
                  lineHeight: 1.3,
                }}
              >
                {step.title}
              </h3>

              {/* Description */}
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--slate2)',
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>

        {/* CTA below steps */}
        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <button
            onClick={() => setView('signin')}
            style={{
              padding: '14px 40px',
              borderRadius: 14,
              border: 'none',
              background: 'linear-gradient(135deg, #8B6FE8 0%, #7254CC 100%)',
              color: '#fff',
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif",
              cursor: 'pointer',
              boxShadow: '0 6px 24px rgba(139,111,232,0.30)',
              transition: 'opacity 0.2s',
            }}
            onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.opacity = '0.88')}
            onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.opacity = '1')}
          >
            {roleTab === 'tenant' ? 'Start searching for free' : 'List your property'}
          </button>
        </div>
      </section>

      {/* ── TRUST CALLOUTS ── */}
      <section
        style={{
          background: 'linear-gradient(150deg, #1E1B2E 0%, #2D2260 100%)',
          padding: '64px 24px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `
              repeating-linear-gradient(45deg, rgba(139,111,232,0.06) 0px, rgba(139,111,232,0.06) 1px, transparent 1px, transparent 32px),
              repeating-linear-gradient(-45deg, rgba(139,111,232,0.06) 0px, rgba(139,111,232,0.06) 1px, transparent 1px, transparent 32px)
            `,
          }}
        />
        <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 34,
                color: '#fff',
                marginBottom: 10,
                letterSpacing: '-0.02em',
              }}
            >
              Built on trust
            </h2>
            <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.55)', maxWidth: 440, margin: '0 auto' }}>
              Every feature of DrukNest is designed to protect tenants and owners alike.
            </p>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 20,
            }}
          >
            {TRUST_ITEMS.map((item, i) => (
              <div
                key={i}
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(139,111,232,0.22)',
                  borderRadius: 22,
                  padding: '30px 26px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                  backdropFilter: 'blur(6px)',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.10)')
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.06)')
                }
              >
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 14,
                    background: 'rgba(139,111,232,0.20)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--lav-300)',
                  }}
                >
                  {item.icon}
                </div>
                <h3
                  style={{
                    fontFamily: "'DM Serif Display', serif",
                    fontSize: 19,
                    color: '#fff',
                    margin: 0,
                  }}
                >
                  {item.title}
                </h3>
                <p
                  style={{
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.60)',
                    lineHeight: 1.7,
                    margin: 0,
                  }}
                >
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '72px 24px 80px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <h2
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 34,
              color: 'var(--ink)',
              marginBottom: 10,
              letterSpacing: '-0.02em',
            }}
          >
            Frequently asked questions
          </h2>
          <p style={{ fontSize: 15, color: 'var(--slate2)' }}>
            Everything you need to know about DrukNest.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openFaq === i;
            return (
              <div
                key={i}
                style={{
                  background: '#fff',
                  borderRadius: 16,
                  boxShadow: isOpen ? 'var(--shadow)' : 'var(--shadow-sm)',
                  border: `1.5px solid ${isOpen ? 'var(--lav-300)' : 'transparent'}`,
                  overflow: 'hidden',
                  transition: 'box-shadow 0.22s, border-color 0.22s',
                }}
              >
                {/* Question header */}
                <button
                  onClick={() => setOpenFaq(isOpen ? null : i)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '18px 22px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    gap: 16,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 15,
                      fontWeight: 600,
                      color: isOpen ? 'var(--lav-700)' : 'var(--ink)',
                      flex: 1,
                      lineHeight: 1.4,
                    }}
                  >
                    {item.question}
                  </span>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: isOpen ? 'var(--lav-500)' : 'var(--lav-100)',
                      color: isOpen ? '#fff' : 'var(--lav-600)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      fontWeight: 300,
                      flexShrink: 0,
                      transition: 'all 0.22s cubic-bezier(.22,1,.36,1)',
                      transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                      lineHeight: 1,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    +
                  </span>
                </button>

                {/* Answer */}
                <div
                  style={{
                    maxHeight: isOpen ? 300 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.32s cubic-bezier(.22,1,.36,1)',
                  }}
                >
                  <p
                    style={{
                      padding: '0 22px 20px',
                      fontSize: 14,
                      color: 'var(--slate2)',
                      lineHeight: 1.75,
                      margin: 0,
                      fontFamily: "'DM Sans', sans-serif",
                    }}
                  >
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <div
          style={{
            marginTop: 52,
            background: 'linear-gradient(135deg, var(--lav-100) 0%, #fff 100%)',
            border: '1px solid var(--lav-200)',
            borderRadius: 22,
            padding: '32px 36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 24,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <h3
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 22,
                color: 'var(--ink)',
                marginBottom: 6,
              }}
            >
              Still have questions?
            </h3>
            <p style={{ fontSize: 14, color: 'var(--slate2)', margin: 0 }}>
              Our support team is available Mon–Fri, 9am–6pm BST.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
            <button
              onClick={() => setView('home')}
              style={{
                padding: '11px 22px',
                borderRadius: 12,
                border: '1.5px solid var(--lav-300)',
                background: '#fff',
                color: 'var(--lav-700)',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              Browse Listings
            </button>
            <button
              onClick={() => setView('signin')}
              style={{
                padding: '11px 22px',
                borderRadius: 12,
                border: 'none',
                background: 'linear-gradient(135deg, #8B6FE8 0%, #7254CC 100%)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(139,111,232,0.28)',
                transition: 'opacity 0.2s',
              }}
            >
              Get Started
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
