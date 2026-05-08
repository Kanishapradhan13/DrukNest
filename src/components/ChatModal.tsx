import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Message } from '../lib/types';

interface ChatModalProps {
  inquiryId: string;
  inquiryMessage: string;   // the original message that started this thread
  currentUserId: string;
  otherUserName: string;
  listingTitle: string;
  onClose: () => void;
}

export default function ChatModal({
  inquiryId,
  inquiryMessage,
  currentUserId,
  otherUserName,
  listingTitle,
  onClose,
}: ChatModalProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Load existing messages
    supabase
      .from('messages')
      .select('*')
      .eq('inquiry_id', inquiryId)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setMessages(data as Message[]); });

    // Real-time subscription
    const channel = supabase
      .channel(`chat-${inquiryId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `inquiry_id=eq.${inquiryId}` },
        (payload) => setMessages(prev => [...prev, payload.new as Message])
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [inquiryId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    setText('');
    await supabase.from('messages').insert({
      inquiry_id: inquiryId,
      sender_id: currentUserId,
      content: trimmed,
    });
    setSending(false);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(30,27,46,0.55)', backdropFilter: 'blur(4px)',
        zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 24,
        boxShadow: '0 24px 64px rgba(30,27,46,0.28)',
        width: '100%', maxWidth: 520,
        display: 'flex', flexDirection: 'column',
        height: 580, overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid var(--lav-100)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'var(--lav-50)', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 17, color: 'var(--ink)' }}>
              {otherUserName}
            </div>
            <div style={{ fontSize: 12, color: 'var(--slate3)', marginTop: 1 }}>{listingTitle}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'var(--lav-100)', border: 'none', borderRadius: 8,
              width: 32, height: 32, cursor: 'pointer', fontSize: 16,
              color: 'var(--slate)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {/* Original inquiry message shown as context */}
          <div style={{
            alignSelf: 'center', background: 'var(--lav-50)',
            border: '1px solid var(--lav-200)', borderRadius: 12,
            padding: '8px 14px', fontSize: 12, color: 'var(--slate3)',
            maxWidth: '85%', textAlign: 'center', lineHeight: 1.5,
          }}>
            <span style={{ fontWeight: 600, color: 'var(--slate2)' }}>Inquiry: </span>
            {inquiryMessage}
          </div>

          {messages.length === 0 && (
            <div style={{ textAlign: 'center', color: 'var(--slate3)', fontSize: 13, marginTop: 16 }}>
              No messages yet. Start the conversation!
            </div>
          )}

          {messages.map((msg) => {
            const isOwn = msg.sender_id === currentUserId;
            return (
              <div key={msg.id} style={{ display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '72%',
                  background: isOwn ? 'var(--lav-500)' : 'var(--lav-50)',
                  color: isOwn ? '#fff' : 'var(--ink)',
                  borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                  padding: '10px 14px',
                  fontSize: 14, lineHeight: 1.5,
                  border: isOwn ? 'none' : '1px solid var(--lav-100)',
                }}>
                  <p style={{ margin: 0 }}>{msg.content}</p>
                  <p style={{
                    margin: '4px 0 0', fontSize: 10,
                    color: isOwn ? 'rgba(255,255,255,0.65)' : 'var(--slate3)',
                    textAlign: 'right',
                  }}>
                    {new Date(msg.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{
          padding: '12px 16px', borderTop: '1px solid var(--lav-100)',
          display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0,
          background: '#fff',
        }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Type a message… (Enter to send)"
            rows={2}
            style={{
              flex: 1, border: '1.5px solid var(--lav-200)', borderRadius: 12,
              padding: '10px 13px', fontSize: 14, fontFamily: "'DM Sans', sans-serif",
              color: 'var(--ink)', resize: 'none', outline: 'none',
              lineHeight: 1.5,
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--lav-400)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--lav-200)')}
          />
          <button
            onClick={send}
            disabled={sending || !text.trim()}
            style={{
              background: 'var(--lav-500)', color: '#fff', border: 'none',
              borderRadius: 12, padding: '10px 18px', fontSize: 14, fontWeight: 600,
              fontFamily: "'DM Sans', sans-serif", cursor: sending || !text.trim() ? 'not-allowed' : 'pointer',
              opacity: sending || !text.trim() ? 0.55 : 1, transition: 'opacity 0.15s',
              flexShrink: 0,
            }}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
