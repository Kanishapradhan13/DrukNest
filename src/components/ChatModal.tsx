import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Message } from '../lib/types';

const IMG_PREFIX = '__img__';

interface ChatModalProps {
  inquiryId: string;
  inquiryMessage: string;
  currentUserId: string;
  otherUserName: string;
  otherUserAvatarUrl?: string;
  listingTitle: string;
  onClose: () => void;
  table?: string;
  threadColumn?: string;
}

export default function ChatModal({
  inquiryId,
  inquiryMessage,
  currentUserId,
  otherUserName,
  otherUserAvatarUrl,
  listingTitle,
  onClose,
  table = 'messages',
  threadColumn = 'inquiry_id',
}: ChatModalProps) {
  const [messages, setMessages]     = useState<Message[]>([]);
  const [text, setText]             = useState('');
  const [sending, setSending]       = useState(false);
  const [sendError, setSendError]   = useState('');
  const [photoFile, setPhotoFile]   = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [lightbox, setLightbox]     = useState<string | null>(null);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const fileRef     = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── Load + subscribe ── */
  useEffect(() => {
    supabase
      .from(table)
      .select('*')
      .eq(threadColumn, inquiryId)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setMessages(data as Message[]); });

    const channel = supabase
      .channel(`chat-${table}-${inquiryId}`)
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table, filter: `${threadColumn}=eq.${inquiryId}` },
        (payload) => setMessages(prev => [...prev, payload.new as Message])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [inquiryId, table, threadColumn]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* ── Photo pick ── */
  function pickPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
    e.target.value = '';
  }

  function clearPhoto() {
    setPhotoFile(null);
    if (photoPreview) { URL.revokeObjectURL(photoPreview); setPhotoPreview(null); }
  }

  /* ── Auto-resize textarea ── */
  function handleTextChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }

  /* ── Send ── */
  async function send() {
    if (sending) return;
    if (!text.trim() && !photoFile) return;
    setSending(true);
    setSendError('');

    try {
      if (photoFile) {
        const ext  = photoFile.name.split('.').pop() ?? 'jpg';
        const path = `chat/${currentUserId}/${Date.now()}.${ext}`;
        const { data: upData, error: upErr } = await supabase.storage
          .from('listing-photos')
          .upload(path, photoFile, { upsert: false });
        if (!upErr && upData) {
          const { data: urlData } = supabase.storage.from('listing-photos').getPublicUrl(upData.path);
          const { error } = await supabase.from(table).insert({
            [threadColumn]: inquiryId,
            sender_id: currentUserId,
            content: IMG_PREFIX + urlData.publicUrl,
          });
          if (error) throw error;
        }
        clearPhoto();
      }

      if (text.trim()) {
        const { error } = await supabase.from(table).insert({
          [threadColumn]: inquiryId,
          sender_id: currentUserId,
          content: text.trim(),
        });
        if (error) throw error;
        setText('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      }
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'message' in err ? (err as { message: string }).message : '';
      setSendError(msg || 'Failed to send message. Please try again.');
    }

    setSending(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const otherInitial = otherUserName.charAt(0).toUpperCase();

  /* ── Group messages by date ── */
  function formatDate(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString()) return 'Today';
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
  }

  /* ── Render ── */
  return (
    <>
      {/* Backdrop */}
      <div
        style={{ position: 'fixed', inset: 0, background: 'rgba(30,27,46,0.6)', backdropFilter: 'blur(6px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 32px 80px rgba(30,27,46,0.32)', width: '100%', maxWidth: 540, display: 'flex', flexDirection: 'column', height: 620, overflow: 'hidden' }}>

          {/* ── Header ── */}
          <div style={{ background: '#1E1B2E', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, #8B6FE8, #7254CC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white', flexShrink: 0, overflow: 'hidden' }}>
              {otherUserAvatarUrl
                ? <img src={otherUserAvatarUrl} alt={otherUserName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : otherInitial}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontFamily: "'DM Serif Display', serif", fontSize: 16, color: 'white', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{otherUserName}</p>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{listingTitle}</p>
            </div>
            <button
              onClick={onClose}
              style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(255,255,255,0.1)', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >
              ×
            </button>
          </div>

          {/* ── Messages ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 2, background: '#F9F7FF' }}>

            {/* Inquiry context pill */}
            <div style={{ alignSelf: 'center', background: 'white', border: '1px solid var(--lav-200)', borderRadius: 20, padding: '6px 14px', fontSize: 12, color: 'var(--slate3)', maxWidth: '80%', textAlign: 'center', lineHeight: 1.5, marginBottom: 8 }}>
              <span style={{ fontWeight: 600, color: 'var(--lav-500)' }}>Inquiry · </span>{inquiryMessage}
            </div>

            {messages.length === 0 && (
              <div style={{ textAlign: 'center', marginTop: 32, color: 'var(--slate3)', fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                No messages yet — say hello!
              </div>
            )}

            {messages.map((msg, i) => {
              const isOwn = msg.sender_id === currentUserId;
              const isImg = msg.content.startsWith(IMG_PREFIX);
              const imgUrl = isImg ? msg.content.slice(IMG_PREFIX.length) : null;

              /* Date separator */
              const prevMsg  = messages[i - 1];
              const showDate = !prevMsg || formatDate(msg.created_at) !== formatDate(prevMsg.created_at);

              return (
                <React.Fragment key={msg.id}>
                  {showDate && (
                    <div style={{ alignSelf: 'center', fontSize: 11, color: 'var(--slate3)', background: 'rgba(255,255,255,0.8)', border: '1px solid var(--lav-100)', borderRadius: 20, padding: '3px 12px', margin: '8px 0 4px', fontWeight: 500 }}>
                      {formatDate(msg.created_at)}
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: 8, marginTop: 4 }}>
                    {/* Other user avatar */}
                    {!isOwn && (
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg, #8B6FE8, #7254CC)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'white', flexShrink: 0, marginBottom: 2 }}>
                        {otherInitial}
                      </div>
                    )}

                    <div style={{ maxWidth: '68%', display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', gap: 2 }}>
                      <div style={{
                        background: isOwn ? 'linear-gradient(135deg, #8B6FE8, #7254CC)' : 'white',
                        color: isOwn ? 'white' : 'var(--ink)',
                        borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        padding: isImg ? '4px' : '10px 14px',
                        border: isOwn ? 'none' : '1px solid var(--lav-100)',
                        boxShadow: '0 1px 4px rgba(30,27,46,0.08)',
                        overflow: 'hidden',
                      }}>
                        {isImg ? (
                          <img
                            src={imgUrl!}
                            alt="Photo"
                            onClick={() => setLightbox(imgUrl!)}
                            style={{ display: 'block', maxWidth: 220, maxHeight: 200, objectFit: 'cover', borderRadius: 14, cursor: 'zoom-in' }}
                          />
                        ) : (
                          <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, wordBreak: 'break-word' }}>{msg.content}</p>
                        )}
                      </div>
                      <p style={{ margin: 0, fontSize: 10, color: 'var(--slate3)', paddingLeft: isOwn ? 0 : 4, paddingRight: isOwn ? 4 : 0 }}>
                        {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            <div ref={bottomRef} />
          </div>

          {/* ── Photo preview strip ── */}
          {photoPreview && (
            <div style={{ padding: '10px 18px 0', background: 'white', borderTop: '1px solid var(--lav-100)', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <div style={{ position: 'relative', display: 'inline-flex' }}>
                <img src={photoPreview} alt="preview" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 10, border: '1.5px solid var(--lav-200)' }} />
                <button
                  onClick={clearPhoto}
                  style={{ position: 'absolute', top: -6, right: -6, width: 18, height: 18, borderRadius: '50%', background: '#DC2626', border: '2px solid white', color: 'white', fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1 }}
                >
                  ×
                </button>
              </div>
              <p style={{ fontSize: 12, color: 'var(--slate3)', margin: 0 }}>Photo ready — click <strong>Send</strong> or add a message below</p>
            </div>
          )}

          {/* ── Send error ── */}
          {sendError && (
            <div style={{ padding: '8px 18px', background: '#FEF2F2', borderTop: '1px solid #FECACA', fontSize: 12, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span>⚠️ {sendError}</span>
              <button onClick={() => setSendError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#DC2626', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}>×</button>
            </div>
          )}

          {/* ── Compose bar ── */}
          <div style={{ padding: '10px 14px 14px', background: 'white', borderTop: photoPreview ? 'none' : '1px solid var(--lav-100)', display: 'flex', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>

            {/* Photo button */}
            <button
              onClick={() => fileRef.current?.click()}
              title="Send a photo"
              style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--lav-50)', border: '1.5px solid var(--lav-200)', color: 'var(--lav-500)', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginBottom: 1 }}
            >
              📷
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} style={{ display: 'none' }} />

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              value={text}
              onChange={handleTextChange}
              onKeyDown={handleKey}
              placeholder="Type a message…"
              rows={1}
              style={{
                flex: 1, border: '1.5px solid var(--lav-200)', borderRadius: 12,
                padding: '9px 13px', fontSize: 14, fontFamily: "'DM Sans', sans-serif",
                color: 'var(--ink)', resize: 'none', outline: 'none', lineHeight: 1.55,
                minHeight: 38, maxHeight: 120, overflowY: 'auto',
                transition: 'border-color 0.15s',
              }}
              onFocus={e => (e.target.style.borderColor = 'var(--lav-400)')}
              onBlur={e  => (e.target.style.borderColor = 'var(--lav-200)')}
            />

            {/* Send button */}
            <button
              onClick={send}
              disabled={sending || (!text.trim() && !photoFile)}
              style={{
                width: 38, height: 38, borderRadius: 10, border: 'none',
                background: sending || (!text.trim() && !photoFile) ? 'var(--lav-200)' : 'linear-gradient(135deg, #8B6FE8, #7254CC)',
                color: sending || (!text.trim() && !photoFile) ? 'var(--lav-400)' : 'white',
                fontSize: 16, cursor: sending || (!text.trim() && !photoFile) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginBottom: 1, transition: 'background 0.15s',
              }}
              title="Send"
            >
              ➤
            </button>
          </div>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.88)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, cursor: 'zoom-out' }}
        >
          <img src={lightbox} alt="Full size" style={{ maxWidth: '100%', maxHeight: '90vh', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }} />
          <button
            onClick={() => setLightbox(null)}
            style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
