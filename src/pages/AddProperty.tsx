import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { CITIES, TYPES } from '../lib/data';
import { useAuth } from '../contexts/AuthContext';
import { Wifi, Flame, SquareParking, Droplets, Zap, UserCheck, FileText, Check } from 'lucide-react';
import Thumb from '../components/Thumb';
import type { Listing } from '../lib/types';

interface AddPropertyProps {
  setView: (v: string) => void;
  listing?: Listing | null;
}

interface FormState {
  title: string;
  city: string;
  type: string;
  address: string;
  district: string;
  beds: number;
  baths: number;
  sqft: string;
  furnished: string;
  floor: string;
  price: string;
  deposit: string;
  duration: string;
  available_from: string;
  wifi: boolean;
  heat: boolean;
  parking: boolean;
  water: boolean;
  electricity: boolean;
  security: boolean;
  desc: string;
}

const FURNISHED_OPTIONS = ['Fully Furnished', 'Semi Furnished', 'Unfurnished'];
const DURATION_OPTIONS = ['Long-term (6+ months)', 'Short-term (< 6 months)'];

const AMENITIES: { key: keyof Pick<FormState, 'wifi' | 'heat' | 'parking' | 'water' | 'electricity' | 'security'>; label: string; icon: React.ReactNode }[] = [
  { key: 'wifi',        label: 'Wi-Fi Internet',      icon: <Wifi size={18} strokeWidth={1.8} /> },
  { key: 'heat',        label: 'Central Heating',     icon: <Flame size={18} strokeWidth={1.8} /> },
  { key: 'parking',     label: 'Parking Space',       icon: <SquareParking size={18} strokeWidth={1.8} /> },
  { key: 'water',       label: 'Water Supply 24/7',   icon: <Droplets size={18} strokeWidth={1.8} /> },
  { key: 'electricity', label: 'Electricity Backup',  icon: <Zap size={18} strokeWidth={1.8} /> },
  { key: 'security',    label: 'Security Guard',      icon: <UserCheck size={18} strokeWidth={1.8} /> },
];

const STEP_LABELS = ['Property Details', 'Pricing', 'Amenities', 'Photos & Docs'];

interface PhotoItem {
  preview: string;
  name: string;
  file: File;
}

export default function AddProperty({ setView, listing }: AddPropertyProps) {
  const { user, profile } = useAuth();
  const isEditing = !!listing;

  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Photo upload state
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [certFile, setCertFile] = useState<File | null>(null);
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const certInputRef = React.useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({
    title: listing?.title ?? '',
    city: listing?.city ?? 'Thimphu',
    type: listing?.type ?? 'Apartment',
    address: listing?.address ?? (listing?.location?.split(' · ')[1] ?? ''),
    district: listing?.district ?? '',
    beds: listing?.beds ?? 1,
    baths: listing?.baths ?? 1,
    sqft: listing?.sqft?.toString() ?? '',
    furnished: listing?.furnished ?? 'Fully Furnished',
    floor: listing?.floor ?? '',
    price: listing?.price?.toString() ?? '',
    deposit: listing?.deposit?.toString() ?? '',
    duration: listing?.duration ?? 'Long-term (6+ months)',
    available_from: listing?.available_from ?? '',
    wifi: listing?.has_wifi ?? false,
    heat: listing?.has_heat ?? false,
    parking: listing?.has_parking ?? false,
    water: listing?.has_water ?? false,
    electricity: listing?.has_electricity ?? false,
    security: listing?.has_security ?? false,
    desc: listing?.description ?? '',
  });

  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  useEffect(() => {
    const handler = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  const isMobile = windowWidth <= 768;

  if (!user || (profile && profile.role === 'tenant')) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--lav-50)', gap: 16, fontFamily: "'DM Sans', sans-serif" }}>
        <div style={{ fontSize: 56 }}>🔒</div>
        <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: 'var(--ink)', margin: 0 }}>Owners Only</h2>
        <p style={{ color: 'var(--slate2)', fontSize: 15, margin: 0 }}>Only registered property owners can list a property.</p>
        <button onClick={() => setView('home')} style={{ marginTop: 8, background: 'var(--lav-500)', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 28px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Go Home
        </button>
      </div>
    );
  }

  function addFiles(files: FileList | null) {
    if (!files) return;
    const allowed = Array.from(files).filter(f =>
      f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024
    );
    const newPhotos: PhotoItem[] = allowed.slice(0, 12 - photos.length).map(f => ({
      file: f,
      name: f.name,
      preview: URL.createObjectURL(f),
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
  }

  function removePhoto(index: number) {
    setPhotos(prev => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    addFiles(e.dataTransfer.files);
  }

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  function stepperBtn(key: 'beds' | 'baths', delta: number) {
    set(key, Math.max(1, Math.min(10, form[key] + delta)));
  }

  function validateStep(s: number): string {
    if (s === 1) {
      if (!form.title.trim()) return 'Property title is required.';
      if (!form.address.trim()) return 'Street / Area is required.';
    }
    if (s === 2) {
      if (!form.price || Number(form.price) <= 0) return 'Monthly rent is required and must be greater than 0.';
    }
    if (s === 3) {
      if (!form.desc.trim()) return 'Description is required.';
    }
    if (s === 4) {
      const hasExistingPhotos = listing?.photo_urls && listing.photo_urls.length > 0;
      const hasExistingDoc = !!listing?.doc_url;
      if (photos.length === 0 && !hasExistingPhotos) return 'Please upload at least one property photo.';
      if (!certFile && !hasExistingDoc) return 'Land Ownership Certificate is required.';
    }
    return '';
  }

  async function handleSubmit() {
    if (!user) { setView('signin'); return; }
    const err4 = validateStep(4);
    if (err4) { setError(err4); return; }
    setSubmitting(true);
    setError('');
    try {
      // Upload new photos (if any)
      let photoUrls: string[] = listing?.photo_urls ?? [];
      if (photos.length > 0) {
        photoUrls = [];
        for (const photo of photos) {
          const ext = photo.name.split('.').pop() ?? 'jpg';
          const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
          const { data: pData, error: pErr } = await supabase.storage
            .from('listing-photos')
            .upload(path, photo.file, { upsert: true });
          if (pErr) throw new Error(`Photo upload failed: ${pErr.message}`);
          const { data: pUrl } = supabase.storage.from('listing-photos').getPublicUrl(pData.path);
          photoUrls.push(pUrl.publicUrl);
        }
      }

      // Upload new certificate (if provided)
      let docUrl: string = listing?.doc_url ?? '';
      if (certFile) {
        const certExt = certFile.name.split('.').pop() ?? 'pdf';
        const certPath = `${user.id}/${Date.now()}-cert.${certExt}`;
        const { data: cData, error: cErr } = await supabase.storage
          .from('listing-docs')
          .upload(certPath, certFile, { upsert: true });
        if (cErr) throw new Error(`Document upload failed: ${cErr.message}`);
        const { data: cUrl } = supabase.storage.from('listing-docs').getPublicUrl(cData.path);
        docUrl = cUrl.publicUrl;
      }

      const payload = {
        title: form.title.trim(),
        location: `${form.city} · ${form.address}`,
        city: form.city,
        address: form.address.trim(),
        district: form.district.trim() || null,
        type: form.type,
        price: Number(form.price),
        deposit: form.deposit ? Number(form.deposit) : 0,
        beds: form.beds,
        baths: form.baths,
        sqft: form.sqft ? Number(form.sqft) : null,
        floor: form.floor || null,
        furnished: form.furnished,
        duration: form.duration,
        available_from: form.available_from || null,
        description: form.desc,
        has_wifi: form.wifi,
        has_heat: form.heat,
        has_parking: form.parking,
        has_water: form.water,
        has_electricity: form.electricity,
        has_security: form.security,
        photo_urls: photoUrls,
        doc_url: docUrl,
      };

      if (isEditing && listing) {
        const { error: updateErr } = await supabase
          .from('listings')
          .update(payload)
          .eq('id', listing.id);
        if (updateErr) { setError(updateErr.message); setSubmitting(false); return; }
      } else {
        const { error: insertErr } = await supabase.from('listings').insert({
          owner_id: user.id,
          ...payload,
          status: 'pending',
          rating: 0,
          review_count: 0,
          verified: false,
          pal: ['#C9BCFF', '#8B6FE8'],
        });
        if (insertErr) { setError(insertErr.message); setSubmitting(false); return; }

        // Notify all admins about the new listing pending review
        const { data: admins } = await supabase
          .from('profiles')
          .select('id')
          .eq('role', 'admin');
        if (admins && admins.length > 0) {
          await supabase.from('notifications').insert(
            admins.map((a: { id: string }) => ({
              user_id: a.id,
              type: 'new_listing',
              title: 'New Listing Pending Review',
              body: `${profile?.full_name ?? 'An owner'} submitted "${form.title.trim()}" for approval.`,
              link_view: 'admin',
              read: false,
            }))
          );
        }
      }

      setSuccess(true);
      setTimeout(() => setView('owner'), 1800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'An error occurred');
      setSubmitting(false);
    }
  }

  const cityPal = CITIES.find(c => c.name === form.city)?.pal ?? ['#C9BCFF', '#8B6FE8'];

  /* ── Success screen ── */
  if (success) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--lav-50)' }}>
        <div style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: '#16A34A' }}><Check size={36} strokeWidth={2.5} /></div>
          <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 28, color: 'var(--ink)', marginBottom: 10 }}>{isEditing ? 'Listing Updated!' : 'Submitted for Review!'}</h2>
          <p style={{ color: 'var(--slate2)', fontSize: 15 }}>{isEditing ? 'Your changes have been saved. Redirecting…' : 'Your listing is pending admin approval and will go live once approved. Redirecting…'}</p>
        </div>
      </div>
    );
  }

  /* ── Layout ── */
  return (
    <div style={{ background: 'var(--lav-50)', minHeight: '100vh', paddingTop: 66 }}>
      {/* ── Progress bar ── */}
      <div style={{
        position: 'sticky', top: 66, zIndex: 50,
        background: 'white', borderBottom: '1px solid var(--lav-200)',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 0 }}>
          {STEP_LABELS.map((label, i) => {
            const num = i + 1;
            const done = num < step;
            const active = num === step;
            return (
              <React.Fragment key={num}>
                {i > 0 && (
                  <div style={{ flex: 1, height: 2, background: done ? 'var(--lav-500)' : 'var(--lav-200)', transition: 'background 0.3s' }} />
                )}
                <div
                  onClick={() => done && setStep(num)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    cursor: done ? 'pointer' : 'default',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 14, fontWeight: 600,
                    background: done ? 'var(--lav-500)' : active ? 'white' : 'var(--lav-100)',
                    color: done ? 'white' : active ? 'var(--lav-600)' : 'var(--slate3)',
                    border: active ? '2px solid var(--lav-500)' : done ? 'none' : '2px solid var(--lav-200)',
                    boxShadow: active ? '0 0 0 4px rgba(139,111,232,0.18)' : 'none',
                    transition: 'all 0.3s',
                  }}>
                    {done ? <Check size={12} strokeWidth={2.5} /> : num}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 500, color: active ? 'var(--lav-600)' : done ? 'var(--lav-500)' : 'var(--slate3)', whiteSpace: 'nowrap' }}>
                    {label}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '20px 16px' : '32px 24px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 300px', gap: 32, alignItems: 'start' }}>

        {/* ── Main form ── */}
        <div>
          {/* STEP 1 */}
          {step === 1 && (
            <FormCard title="Property Details" subtitle="Tell us about your property">
              <Field label="Property Title *">
                <input
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="e.g. Sunny 2BHK in Thimphu City Centre"
                  style={inputStyle}
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                <Field label="City">
                  <select value={form.city} onChange={e => set('city', e.target.value)} style={inputStyle}>
                    {CITIES.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </Field>
                <Field label="Property Type">
                  <select value={form.type} onChange={e => set('type', e.target.value)} style={inputStyle}>
                    {TYPES.filter(t => t !== 'Any').map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Street / Area *">
                <input
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  placeholder="e.g. Norzin Lam, Changlimithang"
                  style={inputStyle}
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '1fr 1fr 1fr', gap: 16 }}>
                <Field label="Bedrooms">
                  <StepperInput value={form.beds} onDec={() => stepperBtn('beds', -1)} onInc={() => stepperBtn('beds', 1)} />
                </Field>
                <Field label="Bathrooms">
                  <StepperInput value={form.baths} onDec={() => stepperBtn('baths', -1)} onInc={() => stepperBtn('baths', 1)} />
                </Field>
                <Field label="Area (sq.ft)">
                  <input
                    type="number"
                    value={form.sqft}
                    onChange={e => set('sqft', e.target.value)}
                    placeholder="e.g. 750"
                    style={inputStyle}
                  />
                </Field>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                <Field label="Furnished Status">
                  <select value={form.furnished} onChange={e => set('furnished', e.target.value)} style={inputStyle}>
                    {FURNISHED_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </Field>
                <Field label="Floor Number">
                  <input
                    value={form.floor}
                    onChange={e => set('floor', e.target.value)}
                    placeholder="e.g. 3rd Floor"
                    style={inputStyle}
                  />
                </Field>
              </div>
            </FormCard>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <FormCard title="Pricing" subtitle="Set your rental price and terms">
              {/* Reference price */}
              <div style={{ background: 'var(--lav-50)', border: '1px solid var(--lav-200)', borderRadius: 12, padding: '14px 18px', marginBottom: 4 }}>
                <p style={{ fontSize: 13, color: 'var(--slate2)', marginBottom: 2 }}>Market Reference</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--lav-700)' }}>
                  Similar properties in <span style={{ color: 'var(--lav-600)' }}>{form.city}</span> rent for:{' '}
                  <span style={{ color: 'var(--ink)' }}>Nu 8,000 – Nu 18,000 / month</span>
                </p>
              </div>

              <Field label="Monthly Rent (Nu) *">
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)',
                    fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--slate2)',
                    pointerEvents: 'none', zIndex: 1,
                  }}>Nu</span>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => set('price', e.target.value)}
                    placeholder="12,000"
                    style={{ ...inputStyle, paddingLeft: 52, fontFamily: "'DM Serif Display', serif", fontSize: 24, height: 60 }}
                  />
                </div>
              </Field>

              <Field label="Security Deposit (Nu) — optional">
                <input
                  type="number"
                  value={form.deposit}
                  onChange={e => set('deposit', e.target.value)}
                  placeholder="e.g. 24,000"
                  style={inputStyle}
                />
              </Field>

              <Field label="Rental Duration">
                <select value={form.duration} onChange={e => set('duration', e.target.value)} style={inputStyle}>
                  {DURATION_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>

              <Field label="Available From — optional">
                <input
                  type="date"
                  value={form.available_from}
                  onChange={e => set('available_from', e.target.value)}
                  style={inputStyle}
                />
              </Field>

              {/* Free listing box */}
              <div style={{ background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: 12, padding: '14px 18px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>🎉</span>
                <div>
                  <p style={{ fontWeight: 600, fontSize: 14, color: '#166534', marginBottom: 3 }}>Free Listing on DrukNest</p>
                  <p style={{ fontSize: 13, color: '#15803D', lineHeight: 1.5 }}>
                    Listing your property on DrukNest is completely free. We only succeed when you find a great tenant.
                  </p>
                </div>
              </div>
            </FormCard>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <FormCard title="Amenities & Description" subtitle="Highlight what makes your property special">
              <div style={{ marginBottom: 8 }}>
                <label style={labelStyle}>Amenities Available</label>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 10, marginTop: 8 }}>
                  {AMENITIES.map(a => {
                    const selected = form[a.key];
                    return (
                      <button
                        key={a.key}
                        type="button"
                        onClick={() => set(a.key, !selected as FormState[typeof a.key])}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '12px 16px', borderRadius: 10,
                          border: `1.5px solid ${selected ? 'var(--lav-400)' : 'var(--lav-200)'}`,
                          background: selected ? 'var(--lav-100)' : 'white',
                          color: selected ? 'var(--lav-700)' : 'var(--slate)',
                          fontFamily: "'DM Sans', sans-serif", fontSize: 14, fontWeight: 500,
                          transition: 'all 0.2s', textAlign: 'left',
                        }}
                      >
                        <span style={{ color: selected ? 'var(--lav-500)' : 'var(--slate3)', flexShrink: 0, display: 'flex' }}>
                          {a.icon}
                        </span>
                        <span style={{ flex: 1 }}>{a.label}</span>
                        {selected && <span style={{ color: 'var(--lav-500)', display: 'flex' }}><Check size={16} strokeWidth={2.5} /></span>}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Field label={`Description * (${form.desc.length}/600)`}>
                <textarea
                  value={form.desc}
                  onChange={e => { if (e.target.value.length <= 600) set('desc', e.target.value); }}
                  placeholder="Describe your property — neighbourhood, views, nearby landmarks, house rules…"
                  rows={6}
                  style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }}
                />
              </Field>
            </FormCard>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <FormCard title="Upload Photos & Documents" subtitle="Strong visuals get 3× more inquiries">

              {/* Hidden file inputs */}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                style={{ display: 'none' }}
                onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
              />
              <input
                ref={certInputRef}
                type="file"
                accept="image/*,.pdf"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) setCertFile(e.target.files[0]); e.target.value = ''; }}
              />

              {/* Photo upload zone */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>
                  Property Photos
                  <span style={{ fontWeight: 400, color: 'var(--slate3)', marginLeft: 8 }}>
                    {photos.length}/12 uploaded
                  </span>
                </label>

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); setDragActive(true); }}
                  onDragLeave={() => setDragActive(false)}
                  onDrop={handleDrop}
                  onClick={() => photoInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragActive ? 'var(--lav-500)' : 'var(--lav-300)'}`,
                    borderRadius: 14,
                    padding: '36px 20px',
                    textAlign: 'center',
                    background: dragActive ? 'var(--lav-100)' : 'var(--lav-50)',
                    marginTop: 8,
                    cursor: 'pointer',
                    transition: 'border-color 0.2s, background 0.2s',
                  }}
                >
                  <div style={{ fontSize: 40, marginBottom: 10 }}>📷</div>
                  <p style={{ fontWeight: 600, color: 'var(--ink)', marginBottom: 4 }}>
                    {dragActive ? 'Drop photos here…' : 'Drag & Drop Photos'}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--slate3)', marginBottom: 14 }}>
                    JPG, PNG · Max 5 MB per file · Up to 12 photos
                  </p>
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); photoInputRef.current?.click(); }}
                    style={{
                      background: 'var(--lav-500)', color: 'white', border: 'none',
                      borderRadius: 8, padding: '9px 22px', fontSize: 14, fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Browse Files
                  </button>
                </div>

                {/* Uploaded photos grid */}
                {photos.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: 10, marginTop: 14 }}>
                    {photos.map((photo, i) => (
                      <div key={photo.preview} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', aspectRatio: '1' }}>
                        <img
                          src={photo.preview}
                          alt={photo.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(i)}
                          style={{
                            position: 'absolute', top: 4, right: 4,
                            width: 24, height: 24, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.65)', color: 'white',
                            border: 'none', fontSize: 14, display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            cursor: 'pointer', lineHeight: 1, fontWeight: 700,
                          }}
                          title="Remove photo"
                        >×</button>
                        {i === 0 && (
                          <span style={{
                            position: 'absolute', bottom: 4, left: 4,
                            background: 'rgba(0,0,0,0.6)', color: 'white',
                            fontSize: 10, fontWeight: 700, padding: '2px 7px',
                            borderRadius: 999, letterSpacing: '.05em',
                          }}>COVER</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Land Ownership Certificate */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>Land Ownership Certificate <span style={{ color: '#DC2626' }}>*</span></label>
                {certFile ? (
                  <div style={{
                    border: '1.5px solid #22C55E', borderRadius: 12,
                    padding: '16px 20px', background: '#F0FDF4', marginTop: 8,
                    display: 'flex', alignItems: 'center', gap: 12,
                  }}>
                    <span style={{ color: '#16A34A' }}><FileText size={24} strokeWidth={1.8} /></span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: '#15803D', marginBottom: 2 }}>
                        {certFile.name}
                      </p>
                      <p style={{ fontSize: 12, color: '#4ADE80' }}>
                        {(certFile.size / 1024).toFixed(0)} KB — ready to submit
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCertFile(null)}
                      style={{
                        background: '#FEF2F2', color: '#DC2626', border: 'none',
                        borderRadius: 8, padding: '6px 12px', fontSize: 12,
                        fontWeight: 600, cursor: 'pointer',
                      }}
                    >Remove</button>
                  </div>
                ) : (
                  <div
                    onClick={() => certInputRef.current?.click()}
                    style={{
                      border: '1.5px dashed var(--lav-300)', borderRadius: 12,
                      padding: '20px', background: 'white', marginTop: 8,
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      gap: 14, transition: 'border-color 0.2s, background 0.2s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--lav-50)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                  >
                    <span style={{ color: 'var(--lav-400)' }}><FileText size={28} strokeWidth={1.8} /></span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 2 }}>
                        Upload Certificate
                      </p>
                      <p style={{ fontSize: 12, color: 'var(--slate3)' }}>PDF or image, max 10 MB</p>
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); certInputRef.current?.click(); }}
                      style={{
                        background: 'var(--lav-100)', color: 'var(--lav-700)',
                        border: '1px solid var(--lav-300)', borderRadius: 8,
                        padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      }}
                    >Browse</button>
                  </div>
                )}
              </div>

              {/* What happens next */}
              <div style={{ background: 'var(--lav-50)', border: '1px solid var(--lav-200)', borderRadius: 12, padding: '16px 20px' }}>
                <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--ink)', marginBottom: 10 }}>What happens next?</p>
                {[
                  'Our team reviews your listing within 24 hours',
                  'Documents are verified for authenticity',
                  'Once approved, your listing goes live instantly',
                  'You start receiving inquiries from verified tenants',
                ].map((step, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                    <span style={{ width: 22, height: 22, borderRadius: '50%', background: 'var(--lav-200)', color: 'var(--lav-700)', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{i + 1}</span>
                    <span style={{ fontSize: 13, color: 'var(--slate2)', lineHeight: 1.5 }}>{step}</span>
                  </div>
                ))}
              </div>

            </FormCard>
          )}

          {/* ── Navigation buttons ── */}
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', color: '#B91C1C', fontSize: 14, marginTop: 8, marginBottom: 4 }}>
              {error}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <button
              onClick={() => { setError(''); if (step === 1) { setView('home'); } else { setStep(s => s - 1); } }}
              style={{
                padding: '11px 24px', borderRadius: 10, border: '1.5px solid var(--lav-300)',
                background: 'white', color: 'var(--slate)', fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {step === 1 ? 'Cancel' : '← Back'}
            </button>

            <button
              onClick={() => {
                const err = validateStep(step);
                if (err) { setError(err); return; }
                setError('');
                if (step < 4) setStep(s => s + 1);
                else handleSubmit();
              }}
              disabled={submitting}
              style={{
                padding: '11px 28px', borderRadius: 10, border: 'none',
                background: step === 4 ? '#16A34A' : 'var(--lav-500)',
                color: 'white', fontSize: 14, fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
                boxShadow: step === 4 ? '0 4px 14px rgba(22,163,74,0.3)' : '0 4px 14px rgba(139,111,232,0.3)',
              }}
            >
              {step === 4 ? (submitting ? 'Uploading & Submitting…' : 'Submit for Review') : 'Continue →'}
            </button>
          </div>
        </div>

        {/* ── Right sidebar ── */}
        {!isMobile && <div style={{ position: 'sticky', top: 180 }}>
          {/* Listing preview card */}
          <div style={{ background: 'white', borderRadius: 16, boxShadow: 'var(--shadow)', overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ borderRadius: '16px 16px 0 0', overflow: 'hidden' }}>
              <Thumb pal={cityPal} h={150} />
            </div>
            <div style={{ padding: '14px 16px' }}>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: 'var(--ink)', marginBottom: 4, lineHeight: 1.3 }}>
                {form.title || 'Your Property Title'}
              </p>
              <p style={{ fontSize: 12, color: 'var(--slate3)', marginBottom: 8 }}>
                {form.city} · {form.type || 'Type'}
              </p>
              <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--slate2)', marginBottom: 10 }}>
                <span>🛏 {form.beds} bed{form.beds !== 1 ? 's' : ''}</span>
                <span>🚿 {form.baths} bath{form.baths !== 1 ? 's' : ''}</span>
                {form.sqft && <span>📐 {form.sqft} sqft</span>}
              </div>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 18, color: 'var(--lav-600)' }}>
                {form.price ? `Nu ${Number(form.price).toLocaleString()} /mo` : 'Nu — /mo'}
              </p>
            </div>
          </div>

          {/* Step indicator */}
          <div style={{ background: 'white', borderRadius: 14, boxShadow: 'var(--shadow-sm)', padding: '14px 16px' }}>
            <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--slate3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Your Progress</p>
            {STEP_LABELS.map((label, i) => {
              const num = i + 1;
              const done = num < step;
              const active = num === step;
              return (
                <div key={num} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: done ? 'var(--lav-500)' : active ? 'var(--lav-100)' : 'var(--lav-50)',
                    border: `1.5px solid ${done ? 'var(--lav-500)' : active ? 'var(--lav-400)' : 'var(--lav-200)'}`,
                    color: done ? 'white' : active ? 'var(--lav-600)' : 'var(--slate3)',
                    fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    {done ? <Check size={12} strokeWidth={2.5} /> : num}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--ink)' : done ? 'var(--slate2)' : 'var(--slate3)' }}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>}
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function FormCard({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', borderRadius: 18, boxShadow: 'var(--shadow)', padding: '28px 32px', marginBottom: 24 }}>
      <h2 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 24, color: 'var(--ink)', marginBottom: 4 }}>{title}</h2>
      <p style={{ fontSize: 14, color: 'var(--slate2)', marginBottom: 24 }}>{subtitle}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {children}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ marginTop: 6 }}>{children}</div>
    </div>
  );
}

function StepperInput({ value, onDec, onInc }: { value: number; onDec: () => void; onInc: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, border: '1.5px solid var(--lav-200)', borderRadius: 10, overflow: 'hidden', height: 42 }}>
      <button onClick={onDec} style={{ width: 36, height: '100%', background: 'var(--lav-50)', color: 'var(--slate)', fontSize: 18, fontWeight: 700, border: 'none', cursor: 'pointer', flexShrink: 0 }}>−</button>
      <span style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>{value}</span>
      <button onClick={onInc} style={{ width: 36, height: '100%', background: 'var(--lav-50)', color: 'var(--slate)', fontSize: 18, fontWeight: 700, border: 'none', cursor: 'pointer', flexShrink: 0 }}>+</button>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--slate)',
  display: 'block',
  marginBottom: 0,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 42,
  border: '1.5px solid var(--lav-200)',
  borderRadius: 10,
  padding: '0 14px',
  fontSize: 14,
  color: 'var(--ink)',
  background: 'white',
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: "'DM Sans', sans-serif",
};
