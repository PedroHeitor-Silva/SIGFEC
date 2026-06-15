/**
 * Estilos do react-select que respeitam o tema (claro/escuro) atual.
 * Lê data-theme do <html>. Default = claro.
 */
export function getSelectStyles() {
  const dark = typeof document !== 'undefined'
    && document.documentElement.dataset.theme === 'dark';

  const c = dark
    ? { bg: '#1e293b', menu: '#0f172a', border: '#334155', text: '#f8fafc', ph: '#64748b', optHover: '#064e3b' }
    : { bg: '#ffffff', menu: '#ffffff', border: '#cbd5e1', text: '#1f2937', ph: '#94a3b8', optHover: '#f0fdfa' };

  return {
    control: (p, s) => ({
      ...p, backgroundColor: c.bg, borderColor: s.isFocused ? '#1ABB9C' : c.border,
      borderRadius: '0.5rem', color: c.text, padding: '2px', minHeight: '46px',
      boxShadow: s.isFocused ? '0 0 0 3px rgba(26,187,156,0.15)' : 'none',
      '&:hover': { borderColor: '#1ABB9C' },
    }),
    menu: (p) => ({ ...p, backgroundColor: c.menu, border: `1px solid ${c.border}`, borderRadius: '0.5rem' }),
    menuPortal: (p) => ({ ...p, zIndex: 9999 }),
    menuList: (p) => ({ ...p, maxHeight: '240px' }),
    option: (p, s) => ({
      ...p, backgroundColor: s.isSelected ? '#1ABB9C' : s.isFocused ? c.optHover : 'transparent',
      color: s.isSelected ? '#ffffff' : c.text, cursor: 'pointer',
    }),
    singleValue: (p) => ({ ...p, color: c.text }),
    placeholder: (p) => ({ ...p, color: c.ph }),
    input: (p) => ({ ...p, color: c.text }),
    noOptionsMessage: (p) => ({ ...p, color: c.ph }),
  };
}

export const selectMenuProps = {
  menuPortalTarget: typeof document !== 'undefined' ? document.body : null,
  menuPosition: 'fixed',
};
