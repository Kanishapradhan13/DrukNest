import React, { useEffect, useState, useMemo, useCallback } from 'react';

function useWindowWidth() {
  const [w, setW] = useState(() => typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h, { passive: true });
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
}
import type { Listing } from '../lib/types';
import { supabase } from '../lib/supabase';
import { Icon } from '../components/Icons';
import Card from '../components/Card';
import { CITIES, TYPES } from '../lib/data';

interface ListingsProps {
  setView: (v: string) => void;
  setSelectedListing: (id: string) => void;
  initialCity?: string;
  initialType?: string;
}

type SortKey = 'rating' | 'price_asc' | 'price_desc' | 'newest';

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'rating',     label: 'Top Rated'    },
  { value: 'price_asc',  label: 'Price: Low → High' },
  { value: 'price_desc', label: 'Price: High → Low' },
  { value: 'newest',     label: 'Newest First' },
];

const MIN_PRICE = 3000;
const MAX_PRICE = 40000;

/* ─────────────────────────────────────────────
   Pill button helper
───────────────────────────────────────────── */
function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
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

/* ─────────────────────────────────────────────
   Toggle switch helper
───────────────────────────────────────────── */
function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 99,
        background: on ? 'var(--lav-500)' : 'var(--lav-200)',
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'background 0.2s',
        flexShrink: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 23 : 3,
          width: 18,
          height: 18,
          borderRadius: '50%',
          background: '#ffffff',
          boxShadow: '0 1px 4px rgba(0,0,0,0.18)',
          transition: 'left 0.2s cubic-bezier(.22,1,.36,1)',
        }}
      />
    </button>
  );
}

const PAGE_SIZE = 12;

export default function Listings({ setView, setSelectedListing, initialCity, initialType }: ListingsProps) {
  /* ── State ─────────────────────────────────────────────────────── */
  const [allListings, setAllListings]     = useState<Listing[]>([]);
  const [loading, setLoading]             = useState(true);
  const [filterCity, setFilterCity]       = useState(initialCity ?? '');
  const [filterType, setFilterType]       = useState(initialType ?? 'Any');
  const [maxPrice, setMaxPrice]           = useState(MAX_PRICE);
  const [verifiedOnly, setVerifiedOnly]   = useState(false);
  const [sort, setSort]                   = useState<SortKey>('rating');
  const [viewMode, setViewMode]           = useState<'grid' | 'list'>('grid');
  const [page, setPage]                   = useState(1);
  const [showFilters, setShowFilters]     = useState(false);

  const width = useWindowWidth();
  const isMobile = width <= 860;

  /* ── Fetch ─────────────────────────────────────────────────────── */
  useEffect(() => {
    async function fetchListings() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('listings')
          .select('*, owner:profiles(*)')
          .eq('status', 'live')
          .order('created_at', { ascending: false });

        if (!error && data) {
          setAllListings(data as Listing[]);
        }
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }
    fetchListings();
  }, []);

  /* ── Derived / filtered list ───────────────────────────────────── */
  const cityCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const l of allListings) {
      counts[l.city] = (counts[l.city] || 0) + 1;
    }
    return counts;
  }, [allListings]);

  const filteredListings = useMemo(() => {
    let result = [...allListings];

    if (filterCity)   result = result.filter((l) => l.city === filterCity);
    const type = filterType !== 'Any' ? filterType : null;
    if (type)         result = result.filter((l) => l.type === type);
    if (verifiedOnly) result = result.filter((l) => l.verified);
    result = result.filter((l) => l.price <= maxPrice);

    switch (sort) {
      case 'rating':     result.sort((a, b) => b.rating - a.rating);            break;
      case 'price_asc':  result.sort((a, b) => a.price - b.price);              break;
      case 'price_desc': result.sort((a, b) => b.price - a.price);              break;
      case 'newest':     result.sort((a, b) => b.created_at.localeCompare(a.created_at)); break;
    }

    return result;
  }, [allListings, filterCity, filterType, maxPrice, verifiedOnly, sort]);

  /* Reset page when filters change */
  useEffect(() => { setPage(1); }, [filterCity, filterType, maxPrice, verifiedOnly, sort]);

  const totalPages = Math.max(1, Math.ceil(filteredListings.length / PAGE_SIZE));
  const pagedListings = filteredListings.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  /* ── Handlers ─────────────────────────────────────────────────── */
  function handleCardClick(id: string) {
    setSelectedListing(id);
    setView('detail');
  }

  const handleReset = useCallback(() => {
    setFilterCity('');
    setFilterType('Any');
    setMaxPrice(MAX_PRICE);
    setVerifiedOnly(false);
    setSort('rating');
    setPage(1);
  }, []);

  const lightSelectStyle: React.CSSProperties = {
    background: '#ffffff',
    border: '1.5px solid var(--lav-200)',
    borderRadius: 10,
    color: 'var(--ink)',
    fontFamily: "'DM Sans', sans-serif",
    fontSize: 13,
    fontWeight: 500,
    padding: '7px 32px 7px 12px',
    cursor: 'pointer',
    WebkitAppearance: 'none',
    appearance: 'none',
    outline: 'none',
    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='7' viewBox='0 0 10 7'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%236B6885' stroke-width='1.4' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 10px center',
  };

  return (
    <div
      style={{
        fontFamily: "'DM Sans', sans-serif",
        minHeight: '100vh',
        background: 'var(--lav-50)',
        paddingTop: 66,
      }}
    >

      {/* ══════════════════════════════════════════
          MAIN CONTENT
      ══════════════════════════════════════════ */}
      {/* Mobile filter toggle */}
      {isMobile && (
        <div style={{ maxWidth: 1260, margin: '0 auto', padding: '16px 16px 0' }}>
          <button
            onClick={() => setShowFilters(o => !o)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: showFilters ? 'var(--lav-500)' : '#fff',
              border: `1.5px solid ${showFilters ? 'var(--lav-500)' : 'var(--lav-200)'}`,
              borderRadius: 12, padding: '10px 18px',
              fontSize: 14, fontWeight: 600,
              color: showFilters ? '#fff' : 'var(--lav-600)',
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M1 3h14M4 8h8M7 13h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none"/>
            </svg>
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>
      )}

      <div
        className="listings-layout"
        style={{
          maxWidth: 1260,
          margin: '0 auto',
          padding: '28px 40px',
          display: 'grid',
          gridTemplateColumns: '250px 1fr',
          gap: 28,
          alignItems: 'start',
        }}
      >

        {/* ─── LEFT SIDEBAR ──────────────────────────────────────────── */}
        {(!isMobile || showFilters) && (
        <aside
          className="listings-sidebar"
          style={{
            position: 'sticky',
            top: 66 + 16,
            background: '#ffffff',
            borderRadius: 20,
            boxShadow: 'var(--shadow)',
            padding: '24px 20px',
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
          }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 18,
                fontWeight: 400,
                color: 'var(--ink)',
              }}
            >
              Filters
            </span>
            <button
              onClick={handleReset}
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--lav-600)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 8px',
                borderRadius: 6,
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--lav-100)')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'none')}
            >
              Reset
            </button>
          </div>

          {/* City radio */}
          <div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--slate3)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              City
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[{ name: '', label: 'All Cities' }, ...CITIES.map((c) => ({ name: c.name, label: `${c.name} (${cityCounts[c.name] ?? 0})` }))].map((c) => (
                <label
                  key={c.name}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: filterCity === c.name ? 600 : 400,
                    color: filterCity === c.name ? 'var(--lav-600)' : 'var(--slate)',
                  }}
                >
                  <input
                    type="radio"
                    name="city"
                    value={c.name}
                    checked={filterCity === c.name}
                    onChange={() => setFilterCity(c.name)}
                    style={{ accentColor: 'var(--lav-500)', width: 15, height: 15 }}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          </div>

          {/* Type pills */}
          <div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--slate3)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              Property Type
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {TYPES.map((t) => (
                <Pill key={t} active={filterType === t} onClick={() => setFilterType(t)}>
                  {t}
                </Pill>
              ))}
            </div>
          </div>

          {/* Price range */}
          <div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--slate3)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 8,
              }}
            >
              Max Price
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 13,
                color: 'var(--slate2)',
              }}
            >
              <span>Nu {MIN_PRICE.toLocaleString()}</span>
              <span
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 16,
                  color: 'var(--lav-600)',
                  fontWeight: 400,
                }}
              >
                Nu {maxPrice.toLocaleString()}
              </span>
            </div>
            <input
              type="range"
              min={MIN_PRICE}
              max={MAX_PRICE}
              step={500}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
            />
          </div>

          {/* Verified-only toggle */}
          <div>
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 11,
                fontWeight: 700,
                color: 'var(--slate3)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                marginBottom: 12,
              }}
            >
              Trust &amp; Safety
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 10,
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 13,
                    fontWeight: 500,
                    color: 'var(--ink)',
                    marginBottom: 2,
                  }}
                >
                  Verified Only
                </div>
                <div
                  style={{
                    fontFamily: "'DM Sans', sans-serif",
                    fontSize: 11,
                    color: 'var(--slate3)',
                  }}
                >
                  Show DrukNest-verified listings
                </div>
              </div>
              <Toggle on={verifiedOnly} onChange={setVerifiedOnly} />
            </div>
          </div>
        </aside>
        )}

        {/* ─── RIGHT CONTENT ─────────────────────────────────────────── */}
        <div>
          {/* Toolbar row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 20,
              flexWrap: 'wrap',
              gap: 12,
            }}
          >
            {/* Results count */}
            <div
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 14,
                color: 'var(--slate2)',
              }}
            >
              {loading ? (
                'Loading properties…'
              ) : (
                <>
                  <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{filteredListings.length}</span>
                  {' '}propert{filteredListings.length !== 1 ? 'ies' : 'y'} found
                </>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* Sort */}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                style={lightSelectStyle}
              >
                {SORT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              {/* View toggle */}
              <div
                style={{
                  display: 'flex',
                  background: '#ffffff',
                  border: '1.5px solid var(--lav-200)',
                  borderRadius: 10,
                  overflow: 'hidden',
                }}
              >
                {(['grid', 'list'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setViewMode(mode)}
                    title={mode === 'grid' ? 'Grid view' : 'List view'}
                    style={{
                      width: 36,
                      height: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: viewMode === mode ? 'var(--lav-500)' : 'transparent',
                      color: viewMode === mode ? '#ffffff' : 'var(--slate3)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'background 0.18s, color 0.18s',
                    }}
                  >
                    {mode === 'grid' ? (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <rect x="1" y="1" width="6" height="6" rx="1.5" />
                        <rect x="9" y="1" width="6" height="6" rx="1.5" />
                        <rect x="1" y="9" width="6" height="6" rx="1.5" />
                        <rect x="9" y="9" width="6" height="6" rx="1.5" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <rect x="1" y="2"  width="14" height="3.5" rx="1.2" />
                        <rect x="1" y="6.5" width="14" height="3.5" rx="1.2" />
                        <rect x="1" y="11" width="14" height="3.5" rx="1.2" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Loading skeleton */}
          {loading && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(280px, 1fr))' : '1fr',
                gap: 24,
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="skeleton-shimmer"
                  style={{
                    borderRadius: 20,
                    height: viewMode === 'grid' ? 320 : 160,
                    boxShadow: 'var(--shadow-sm)',
                  }}
                />
              ))}
            </div>
          )}

          {/* Listings grid / list */}
          {!loading && filteredListings.length > 0 && (
            <>
              <div
                style={
                  viewMode === 'grid'
                    ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }
                    : { display: 'flex', flexDirection: 'column', gap: 18 }
                }
              >
                {pagedListings.map((listing) => (
                  <Card
                    key={listing.id}
                    listing={listing}
                    layout={viewMode}
                    onClick={() => handleCardClick(listing.id)}
                    setView={setView}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 32 }}>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    style={{ padding: '8px 16px', borderRadius: 10, border: '1.5px solid var(--lav-200)', background: 'white', color: 'var(--lav-600)', fontSize: 13, fontWeight: 600, cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1, fontFamily: "'DM Sans', sans-serif" }}
                  >
                    ‹ Prev
                  </button>
                  {Array.from({ length: totalPages }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      style={{ width: 36, height: 36, borderRadius: 10, border: `1.5px solid ${page === i + 1 ? 'var(--lav-500)' : 'var(--lav-200)'}`, background: page === i + 1 ? 'var(--lav-500)' : 'white', color: page === i + 1 ? 'white' : 'var(--ink)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    style={{ padding: '8px 16px', borderRadius: 10, border: '1.5px solid var(--lav-200)', background: 'white', color: 'var(--lav-600)', fontSize: 13, fontWeight: 600, cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1, fontFamily: "'DM Sans', sans-serif" }}
                  >
                    Next ›
                  </button>
                </div>
              )}
            </>
          )}

          {/* Empty state */}
          {!loading && filteredListings.length === 0 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '80px 24px',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'var(--lav-100)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--lav-400)',
                  marginBottom: 20,
                }}
              >
                <Icon type="search" size={36} />
              </div>
              <h3
                style={{
                  fontFamily: "'DM Serif Display', serif",
                  fontSize: 24,
                  fontWeight: 400,
                  color: 'var(--ink)',
                  margin: '0 0 10px',
                }}
              >
                No properties found
              </h3>
              <p
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  color: 'var(--slate2)',
                  maxWidth: 320,
                  lineHeight: 1.6,
                  margin: '0 0 22px',
                }}
              >
                Try adjusting your filters or expanding your price range to see more results.
              </p>
              <button
                onClick={handleReset}
                style={{
                  fontFamily: "'DM Sans', sans-serif",
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#ffffff',
                  background: 'var(--lav-500)',
                  border: 'none',
                  borderRadius: 12,
                  padding: '10px 24px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(139,111,232,0.30)',
                  transition: 'opacity 0.2s',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = '0.88')}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </div>
  );
}
