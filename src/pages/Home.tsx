import React, { useEffect, useState } from 'react';
import type { Listing } from '../lib/types';
import { supabase } from '../lib/supabase';
import { Search, Home as HomeIcon, BadgeCheck, FileText, ShieldCheck, TrendingUp, GraduationCap, Handshake } from 'lucide-react';
import Card from '../components/Card';
import { CITIES, TYPES, DURATIONS } from '../lib/data';

interface HomeProps {
  setView: (v: string) => void;
  onListingClick?: (id: string) => void;
  onSearch?: (city: string, type: string) => void;
}

/* ─────────────────────────────────────────────
   Bhu-border pattern overlay reused in sections
───────────────────────────────────────────── */
function BhuBorder() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          repeating-linear-gradient(45deg, rgba(139,111,232,0.07) 0px, rgba(139,111,232,0.07) 1px, transparent 1px, transparent 10px),
          repeating-linear-gradient(-45deg, rgba(139,111,232,0.07) 0px, rgba(139,111,232,0.07) 1px, transparent 1px, transparent 10px)
        `,
        pointerEvents: 'none',
      }}
    />
  );
}

export default function Home({ setView, onListingClick, onSearch }: HomeProps) {
  const [listings, setListings] = useState<Listing[]>([]);
  const [searchCity, setSearchCity] = useState('');
  const [searchType, setSearchType] = useState('Any');
  const [searchDuration, setSearchDuration] = useState('Any Duration');
  const [cityCounts, setCityCounts] = useState<Record<string, number>>({});
  const [badgeVisible, setBadgeVisible] = useState(false);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [hoveredTrustCard, setHoveredTrustCard] = useState<number | null>(null);

  /* Badge pulse-in after mount */
  useEffect(() => {
    const t = setTimeout(() => setBadgeVisible(true), 120);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    async function fetchListings() {
      try {
        const { data } = await supabase
          .from('listings')
          .select('*')
          .eq('status', 'live')
          .order('created_at', { ascending: false })
          .limit(9);
        if (data) setListings(data as Listing[]);
      } catch {
        /* silent */
      }
    }

    async function fetchCityCounts() {
      try {
        const { data } = await supabase
          .from('listings')
          .select('city')
          .eq('status', 'live');
        if (data) {
          const counts: Record<string, number> = {};
          for (const row of data) {
            counts[row.city] = (counts[row.city] || 0) + 1;
          }
          setCityCounts(counts);
        }
      } catch {
        /* silent */
      }
    }

    function refresh() {
      fetchListings();
      fetchCityCounts();
    }

    refresh();

    const channel = supabase
      .channel('home-listings-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'listings' }, refresh)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'listings' }, refresh)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const displayListings = listings;

  const selectStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.12)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 12,
    color: '#ffffff',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 14,
    fontWeight: 500,
    padding: '10px 36px 10px 14px',
    cursor: 'pointer',
    backdropFilter: 'blur(8px)',
    WebkitAppearance: 'none',
    appearance: 'none',
    outline: 'none',
    minWidth: 148,
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='rgba(255,255,255,0.7)' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 12px center',
  };

  const trustCards = [
    {
      icon: <BadgeCheck size={22} strokeWidth={1.8} />,
      title: 'Identity Verified',
      desc: 'Every owner and renter is verified with their Bhutanese CID before listing or booking.',
      accent: true,
    },
    {
      icon: <FileText size={22} strokeWidth={1.8} />,
      title: 'Digital Lease Agreements',
      desc: 'Generate and sign legally-sound lease agreements digitally — no paperwork hassle.',
      accent: false,
    },
    {
      icon: <ShieldCheck size={22} strokeWidth={1.8} />,
      title: 'Verified Badge',
      desc: 'Listings with the blue Verified badge have been inspected and confirmed by our team.',
      accent: false,
    },
    {
      icon: <HomeIcon size={22} strokeWidth={1.8} />,
      title: 'Safe for Renters',
      desc: 'Secure payments, transparent terms, and 24/7 support keep renters protected.',
      accent: false,
    },
  ];

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* ══════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════ */}
      <section
        style={{
          position: 'relative',
          minHeight: '100vh',
          paddingTop: 66,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundImage: 'url(/hero.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        {/* Dark overlay matching the design */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(30,27,46,0.72) 0%, rgba(59,45,110,0.65) 60%, rgba(45,27,110,0.72) 100%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            padding: '60px 24px 40px',
            maxWidth: 820,
            width: '100%',
          }}
        >
          {/* Badge pill */}
          <div
            className="an1"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(139,111,232,0.22)',
              border: '1px solid rgba(201,188,255,0.35)',
              borderRadius: 99,
              padding: '6px 18px 6px 10px',
              marginBottom: 28,
              opacity: badgeVisible ? 1 : 0,
              transform: badgeVisible ? 'translateY(0)' : 'translateY(12px)',
              transition: 'opacity 0.6s ease, transform 0.6s ease',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#A992F5',
                display: 'inline-block',
                boxShadow: '0 0 0 3px rgba(169,146,245,0.28)',
                animation: 'pulse 2s infinite',
              }}
            />
            <span
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--lav-300)',
                letterSpacing: '0.02em',
              }}
            >
              320+ Verified Properties Across Bhutan
            </span>
          </div>

          {/* H1 */}
          <h1
            className="an2"
            style={{
              fontFamily: "'DM Serif Display', serif",
              fontSize: 'clamp(48px, 7vw, 92px)',
              fontWeight: 400,
              color: '#ffffff',
              lineHeight: 1.08,
              margin: '0 0 24px',
              letterSpacing: '-0.02em',
            }}
          >
            Your Home in the Land of the{' '}
            <em style={{ color: '#C9BCFF', fontStyle: 'italic' }}>Thunder Dragon</em>
          </h1>

          {/* Subtext */}
          <p
            className="an3"
            style={{
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 18,
              color: 'rgba(255,255,255,0.65)',
              maxWidth: 540,
              margin: '0 auto 36px',
              lineHeight: 1.6,
              fontWeight: 400,
            }}
          >
            Browse verified rentals across Thimphu, Paro, Phuentsholing and beyond —
            trusted by thousands of tenants and owners in Bhutan.
          </p>

          {/* Search bar */}
          <div
            className="an4"
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: 10,
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.16)',
              borderRadius: 18,
              padding: '10px 10px 10px 14px',
              backdropFilter: 'blur(16px)',
              maxWidth: 740,
              margin: '0 auto 28px',
              justifyContent: 'center',
            }}
          >
            <select
              value={searchCity}
              onChange={(e) => setSearchCity(e.target.value)}
              style={selectStyle}
            >
              <option value="" style={{ background: '#2D1B6E', color: '#fff' }}>Any City</option>
              {CITIES.map((c) => (
                <option key={c.name} value={c.name} style={{ background: '#2D1B6E', color: '#fff' }}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={searchType}
              onChange={(e) => setSearchType(e.target.value)}
              style={selectStyle}
            >
              {TYPES.map((t) => (
                <option key={t} value={t} style={{ background: '#2D1B6E', color: '#fff' }}>
                  {t}
                </option>
              ))}
            </select>

            <select
              value={searchDuration}
              onChange={(e) => setSearchDuration(e.target.value)}
              style={selectStyle}
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d} style={{ background: '#2D1B6E', color: '#fff' }}>
                  {d}
                </option>
              ))}
            </select>

            <button
              onClick={() => { onSearch?.(searchCity, searchType); setView('listings'); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: 'linear-gradient(135deg, #8B6FE8 0%, #7254CC 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 12,
                padding: '10px 26px',
                fontSize: 14,
                fontWeight: 600,
                fontFamily: "'DM Sans', sans-serif",
                cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(139,111,232,0.40)',
                transition: 'opacity 0.2s, transform 0.15s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1.03)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Search size={16} strokeWidth={1.8} />
              Search
            </button>
          </div>

          {/* Quick city pills */}
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 10,
              justifyContent: 'center',
              marginBottom: 56,
            }}
          >
            {CITIES.map((city) => (
              <button
                key={city.name}
                onClick={() => { onSearch?.(city.name, 'Any'); setView('listings'); }}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.82)',
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: 99,
                  padding: '6px 16px',
                  cursor: 'pointer',
                  transition: 'background 0.2s, border-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(139,111,232,0.32)';
                  e.currentTarget.style.borderColor = 'rgba(201,188,255,0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.18)';
                }}
              >
                📍 {city.name}
              </button>
            ))}
          </div>
        </div>

        {/* Stats strip */}
        <div
          className="home-stats-strip"
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 3,
            background: 'rgba(15,12,28,0.72)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(201,188,255,0.12)',
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: 0,
          }}
        >
          {[
            { value: '330+', label: 'Active Listings' },
            { value: '4', label: 'Cities' },
            { value: '98%', label: 'Verified' },
            { value: '4.9★', label: 'Avg Rating' },
          ].map((stat, i) => (
            <div
              key={i}
              style={{
                padding: '18px 40px',
                textAlign: 'center',
                borderRight: i < 3 ? '1px solid rgba(201,188,255,0.12)' : 'none',
                minWidth: 140,
              }}
            >
              <div
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 26,
                  color: '#C9BCFF',
                  lineHeight: 1,
                  marginBottom: 3,
                }}
              >
                {stat.value}
              </div>
              <div
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 12,
                  color: 'rgba(255,255,255,0.5)',
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          2. MARKET INSIGHT STRIP
      ══════════════════════════════════════════ */}
      <section style={{ background: '#1E1B2E', padding: '0' }}>
        <div className="home-market-grid" style={{
          maxWidth: 1260, margin: '0 auto',
          padding: '0 40px',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
        }}>
          {[
            {
              value: '40%',
              label: 'Rent Rise in 5 Years',
              sub: 'Thimphu avg, 2019–2024',
              icon: <TrendingUp size={24} strokeWidth={1.8} />,
            },
            {
              value: '3,000+',
              label: 'Students Need Housing',
              sub: 'Across RUB colleges yearly',
              icon: <GraduationCap size={24} strokeWidth={1.8} />,
            },
            {
              value: '2 in 3',
              label: 'Bachelors Share Rent',
              sub: 'Urban Bhutan survey',
              icon: <Handshake size={24} strokeWidth={1.8} />,
            },
            {
              value: '68%',
              label: 'Listings Under Nu 12K',
              sub: 'Affordable options on DrukNest',
              icon: <HomeIcon size={24} strokeWidth={1.8} />,
            },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '24px 28px',
              borderRight: i < 3 ? '1px solid rgba(201,188,255,0.1)' : 'none',
              display: 'flex', alignItems: 'flex-start', gap: 14,
            }}>
              <span style={{ color: 'var(--lav-300)', flexShrink: 0, marginTop: 2, display: 'flex' }}>{item.icon}</span>
              <div>
                <div style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 28, color: '#C9BCFF', lineHeight: 1, marginBottom: 4,
                }}>
                  {item.value}
                </div>
                <div style={{
                  fontSize: 13, fontWeight: 600,
                  color: 'rgba(255,255,255,0.85)',
                  fontFamily: "'DM Sans', sans-serif",
                  marginBottom: 3,
                }}>
                  {item.label}
                </div>
                <div style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.38)',
                  fontFamily: "'DM Sans', sans-serif",
                }}>
                  {item.sub}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════
          3. FEATURED LISTINGS
      ══════════════════════════════════════════ */}
      <section style={{ background: '#ffffff', padding: 'clamp(48px,8vw,80px) clamp(16px,5vw,40px)' }}>
        <div style={{ maxWidth: 1260, margin: '0 auto' }}>
          {/* Header row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'space-between',
              marginBottom: 40,
              flexWrap: 'wrap',
              gap: 16,
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--lav-500)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                }}
              >
                Handpicked for you
              </p>
              <h2
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 'clamp(28px, 4vw, 42px)',
                  fontWeight: 400,
                  color: 'var(--ink)',
                  lineHeight: 1.15,
                  margin: 0,
                }}
              >
                Featured Listings
              </h2>
            </div>
            <button
              onClick={() => setView('listings')}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--lav-600)',
                background: 'var(--lav-50)',
                border: '1.5px solid var(--lav-200)',
                borderRadius: 12,
                padding: '10px 22px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                transition: 'background 0.2s, border-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--lav-100)';
                e.currentTarget.style.borderColor = 'var(--lav-400)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--lav-50)';
                e.currentTarget.style.borderColor = 'var(--lav-200)';
              }}
            >
              View All →
            </button>
          </div>

          {/* 3-column grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 28,
            }}
          >
            {displayListings.slice(0, 6).map((listing: Listing) => (
              <Card
                key={listing.id}
                listing={listing}
                layout="grid"
                onClick={() => onListingClick ? onListingClick(listing.id) : setView('detail')}
                setView={setView}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          3. CITIES SECTION
      ══════════════════════════════════════════ */}
      <section
        style={{
          background: '#1E1B2E',
          padding: 'clamp(48px,8vw,80px) clamp(16px,5vw,40px)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <BhuBorder />

        <div style={{ maxWidth: 1260, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--lav-400)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Explore Bhutan
            </p>
            <h2
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 'clamp(28px, 4vw, 42px)',
                fontWeight: 400,
                color: '#ffffff',
                lineHeight: 1.15,
                margin: 0,
              }}
            >
              Find Your City
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
              gap: 24,
            }}
          >
            {CITIES.map((city) => (
              <div
                key={city.name}
                onClick={() => setView('listings')}
                onMouseEnter={() => setHoveredCity(city.name)}
                onMouseLeave={() => setHoveredCity(null)}
                style={{
                  height: 280,
                  borderRadius: 20,
                  overflow: 'hidden',
                  cursor: 'pointer',
                  position: 'relative',
                  background: `linear-gradient(135deg, ${city.pal[0]} 0%, ${city.pal[1]} 100%)`,
                  transform: hoveredCity === city.name ? 'scale(1.03)' : 'scale(1)',
                  transition: 'transform 0.28s cubic-bezier(.22,1,.36,1), box-shadow 0.28s ease',
                  boxShadow: hoveredCity === city.name
                    ? '0 16px 48px rgba(0,0,0,0.36)'
                    : '0 4px 20px rgba(0,0,0,0.20)',
                }}
              >
                {/* Photo background */}
                <img
                  src={city.img}
                  alt={city.name}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    objectPosition: 'center',
                    transition: 'transform 0.4s ease',
                    transform: hoveredCity === city.name ? 'scale(1.08)' : 'scale(1)',
                  }}
                />

                {/* Dark bottom overlay */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(10,8,20,0.90) 0%, rgba(10,8,20,0.20) 55%, transparent 100%)',
                  }}
                />

                {/* City name / label / count */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    padding: '20px 22px',
                    zIndex: 2,
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'rgba(255,255,255,0.65)',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: 4,
                    }}
                  >
                    {city.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Serif Display', serif",
                      fontSize: 24,
                      fontWeight: 400,
                      color: '#ffffff',
                      lineHeight: 1.15,
                      marginBottom: 6,
                    }}
                  >
                    {city.name}
                  </div>
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      background: 'rgba(255,255,255,0.15)',
                      borderRadius: 99,
                      padding: '3px 10px',
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12,
                      fontWeight: 500,
                      color: '#ffffff',
                    }}
                  >
                    <HomeIcon size={13} strokeWidth={1.8} />
                    {cityCounts[city.name] ?? 0} properties
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          4. TRUST SECTION
      ══════════════════════════════════════════ */}
      <section style={{ background: 'var(--lav-50)', padding: 'clamp(48px,8vw,80px) clamp(16px,5vw,40px)' }}>
        <div
          className="home-trust-layout"
          style={{
            maxWidth: 1260,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 60,
            alignItems: 'center',
          }}
        >
          {/* Left column */}
          <div>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--lav-500)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Why DrukNest
            </p>
            <h2
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 'clamp(28px, 3.5vw, 40px)',
                fontWeight: 400,
                color: 'var(--ink)',
                lineHeight: 1.2,
                margin: '0 0 18px',
              }}
            >
              Renting Made Safe &amp; Transparent
            </h2>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 16,
                color: 'var(--slate2)',
                lineHeight: 1.7,
                maxWidth: 420,
                margin: '0 0 36px',
              }}
            >
              DrukNest is built for Bhutan. Every listing, every landlord, every
              lease is verified through our multi-step trust system — so you rent
              with complete confidence.
            </p>

            {/* Trust stats */}
            <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
              {[
                { val: '2,400+', lbl: 'Happy Renters' },
                { val: '180+',   lbl: 'Verified Owners' },
                { val: '99%',    lbl: 'Issue-free Leases' },
              ].map((s) => (
                <div key={s.lbl}>
                  <div
                    style={{
                      fontFamily: "'DM Serif Display', serif",
                      fontSize: 30,
                      color: 'var(--lav-600)',
                      lineHeight: 1,
                      marginBottom: 4,
                    }}
                  >
                    {s.val}
                  </div>
                  <div
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 13,
                      color: 'var(--slate2)',
                      fontWeight: 500,
                    }}
                  >
                    {s.lbl}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right 2×2 grid of trust cards */}
          <div
            className="home-trust-cards"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 18,
            }}
          >
            {trustCards.map((card, i) => (
              <div
                key={i}
                onMouseEnter={() => setHoveredTrustCard(i)}
                onMouseLeave={() => setHoveredTrustCard(null)}
                style={{
                  background: card.accent ? 'var(--lav-500)' : '#ffffff',
                  borderRadius: 18,
                  padding: '26px 22px',
                  boxShadow: hoveredTrustCard === i
                    ? 'var(--shadow-lg)'
                    : card.accent ? '0 8px 28px rgba(139,111,232,0.32)' : 'var(--shadow)',
                  transform: hoveredTrustCard === i ? 'translateY(-4px)' : 'none',
                  transition: 'box-shadow 0.22s ease, transform 0.22s ease',
                }}
              >
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: card.accent ? 'rgba(255,255,255,0.18)' : 'var(--lav-100)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: card.accent ? '#ffffff' : 'var(--lav-500)',
                    marginBottom: 14,
                    flexShrink: 0,
                  }}
                >
                  {card.icon}
                </div>
                <h3
                  style={{
                    fontFamily: "'DM Serif Display', serif",
                    fontSize: 17,
                    fontWeight: 400,
                    color: card.accent ? '#ffffff' : 'var(--ink)',
                    margin: '0 0 8px',
                    lineHeight: 1.25,
                  }}
                >
                  {card.title}
                </h3>
                <p
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    color: card.accent ? 'rgba(255,255,255,0.78)' : 'var(--slate2)',
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {card.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          5. HOST CTA
      ══════════════════════════════════════════ */}
      <section
        style={{
          background: 'var(--lav-100)',
          padding: 'clamp(48px,8vw,80px) clamp(16px,5vw,40px)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <BhuBorder />

        <div
          className="home-host-layout"
          style={{
            maxWidth: 1260,
            margin: '0 auto',
            position: 'relative',
            zIndex: 1,
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 48,
            alignItems: 'center',
          }}
        >
          {/* Left text */}
          <div>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                fontWeight: 600,
                color: 'var(--lav-600)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 10,
              }}
            >
              Own a property?
            </p>
            <h2
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 'clamp(26px, 3.5vw, 40px)',
                fontWeight: 400,
                color: 'var(--ink)',
                lineHeight: 1.2,
                margin: '0 0 16px',
              }}
            >
              Host with DrukNest.{' '}
              <span style={{ color: 'var(--lav-600)' }}>Reach Trusted Tenants.</span>
            </h2>
            <p
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 16,
                color: 'var(--slate2)',
                maxWidth: 460,
                lineHeight: 1.65,
                margin: '0 0 28px',
              }}
            >
              List your property for free, connect with verified renters across Bhutan,
              and manage your listings with our simple dashboard.
            </p>

            {/* Mini stats */}
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
              {[
                { val: '180+', lbl: 'Owners' },
                { val: 'Nu 0', lbl: 'Listing Fee' },
                { val: '24h',  lbl: 'Approval' },
              ].map((s) => (
                <div
                  key={s.lbl}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'DM Serif Display', serif",
                      fontSize: 22,
                      color: 'var(--lav-700)',
                      lineHeight: 1,
                    }}
                  >
                    {s.val}
                  </span>
                  <span
                    style={{
                      fontFamily: "'DM Sans', sans-serif",
                      fontSize: 12,
                      color: 'var(--slate2)',
                      fontWeight: 500,
                      marginTop: 2,
                    }}
                  >
                    {s.lbl}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right buttons */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
              alignItems: 'stretch',
              minWidth: 220,
            }}
          >
            <button
              onClick={() => setView('add-property')}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 15,
                fontWeight: 700,
                color: '#ffffff',
                background: 'linear-gradient(135deg, #8B6FE8 0%, #7254CC 100%)',
                border: 'none',
                borderRadius: 14,
                padding: '14px 28px',
                cursor: 'pointer',
                boxShadow: '0 6px 24px rgba(139,111,232,0.38)',
                transition: 'opacity 0.2s, transform 0.15s',
                textAlign: 'center',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'scale(1.02)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
            >
              Start Listing — It's Free
            </button>
            <button
              onClick={() => setView('how')}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--lav-700)',
                background: 'transparent',
                border: '1.5px solid var(--lav-300)',
                borderRadius: 14,
                padding: '13px 28px',
                cursor: 'pointer',
                transition: 'background 0.2s, border-color 0.2s',
                textAlign: 'center',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--lav-200)';
                e.currentTarget.style.borderColor = 'var(--lav-500)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'var(--lav-300)';
              }}
            >
              Learn How It Works →
            </button>
          </div>
        </div>
      </section>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}
