import toast from 'react-hot-toast';

/**
 * Toast with undo button.
 * @param {string} message
 * @param {() => Promise|void} onUndo - called if user clicks "Desfazer"
 * @param {number} duration - ms until timeout (default 5s)
 * @returns {Promise<boolean>} resolves true if undone, false if expired
 */
export function toastUndo(message, onUndo, duration = 5000) {
  return new Promise((resolve) => {
    let undone = false;
    const id = toast.custom(
      (t) => (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '12px 14px',
            background: '#0f172a',
            border: '1px solid #334155',
            borderRadius: 8,
            color: 'white',
            fontSize: 13,
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
            minWidth: 280,
          }}
        >
          <span style={{ flex: 1 }}>{message}</span>
          <button
            onClick={async () => {
              undone = true;
              toast.dismiss(t.id);
              try { await onUndo?.(); } catch { /* ignore */ }
              resolve(true);
            }}
            style={{
              background: 'transparent',
              border: '1px solid #10b981',
              color: '#10b981',
              padding: '4px 12px',
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              cursor: 'pointer',
            }}
          >
            Desfazer
          </button>
        </div>
      ),
      { duration }
    );

    setTimeout(() => {
      if (!undone) {
        toast.dismiss(id);
        resolve(false);
      }
    }, duration);
  });
}
