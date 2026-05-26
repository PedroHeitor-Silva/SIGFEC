/* eslint-disable react/prop-types */
import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';

const KEY = (k) => `@sigfec:draft:${k}`;

/**
 * Auto-save form state in localStorage. Restores on mount.
 *
 * Usage:
 *   const [form, setForm, draft] = useDraft('cadastro-parceiro', initialForm);
 *   draft.clear() // call after successful submit
 *   draft.savedAt // Date | null
 *
 * @param {string} key - unique identifier for the draft
 * @param {object} initial - initial form value
 * @param {number} debounce - ms before saving (default 800)
 */
export default function useDraft(key, initial, debounce = 800) {
  const [form, setForm] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY(key));
      if (raw) {
        const parsed = JSON.parse(raw);
        return parsed.value ?? initial;
      }
    } catch {/* ignore */}
    return initial;
  });

  const [savedAt, setSavedAt] = useState(() => {
    try {
      const raw = localStorage.getItem(KEY(key));
      return raw ? new Date(JSON.parse(raw).at) : null;
    } catch { return null; }
  });

  const timer = useRef();
  const isFirst = useRef(true);

  useEffect(() => {
    // skip first render (don't save the just-loaded draft)
    if (isFirst.current) { isFirst.current = false; return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const at = new Date().toISOString();
      try {
        localStorage.setItem(KEY(key), JSON.stringify({ value: form, at }));
        setSavedAt(new Date(at));
      } catch {/* quota etc */}
    }, debounce);
    return () => clearTimeout(timer.current);
  }, [form, key, debounce]);

  const clear = () => {
    localStorage.removeItem(KEY(key));
    setSavedAt(null);
  };

  const restore = () => {
    try {
      const raw = localStorage.getItem(KEY(key));
      if (raw) {
        const parsed = JSON.parse(raw);
        setForm(parsed.value);
        toast.success('Rascunho restaurado.');
      }
    } catch {/* ignore */}
  };

  return [form, setForm, { clear, restore, savedAt }];
}

/**
 * Indicador visual "Salvo automaticamente há Xs"
 */
export function DraftIndicator({ savedAt, onClear }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!savedAt) return;
    const t = setInterval(() => setNow(Date.now()), 5000);
    return () => clearInterval(t);
  }, [savedAt]);

  if (!savedAt) return null;
  const seconds = Math.floor((now - savedAt.getTime()) / 1000);
  const display = seconds < 5 ? 'agora' : seconds < 60 ? `há ${seconds}s` : `há ${Math.floor(seconds / 60)}min`;

  return (
    <div className="inline-flex items-center gap-2 text-[11px] text-slate-500">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500/60" />
      <span>Rascunho salvo {display}</span>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="text-slate-600 hover:text-rose-400 transition underline-offset-2 hover:underline"
        >
          descartar
        </button>
      )}
    </div>
  );
}
