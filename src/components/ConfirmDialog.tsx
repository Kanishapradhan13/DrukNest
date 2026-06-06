
interface ConfirmDialogProps {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel',
  danger = false, onConfirm, onCancel,
}: ConfirmDialogProps) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(30,27,46,0.55)', backdropFilter: 'blur(4px)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 24px 60px rgba(30,27,46,0.25)', width: '100%', maxWidth: 400, padding: 28 }}>
        <h3 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 20, color: 'var(--ink)', margin: '0 0 8px' }}>{title}</h3>
        <p style={{ fontSize: 14, color: 'var(--slate2)', margin: '0 0 24px', lineHeight: 1.55 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ padding: '9px 20px', borderRadius: 10, border: '1.5px solid var(--lav-200)', background: 'white', color: 'var(--ink)', fontSize: 14, fontWeight: 500, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            style={{ padding: '9px 20px', borderRadius: 10, border: 'none', background: danger ? '#DC2626' : 'linear-gradient(135deg, #8B6FE8, #7254CC)', color: 'white', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
