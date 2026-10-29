/**
 * Estilos do react-select que respeitam o tema (claro/escuro) atual.
 * Lê data-theme do <html>. Default = claro.
 */
export function getSelectStyles() {
  // Cores do design system (index.css): acompanham o tema na hora, inclusive ao alternar claro/escuro.
  const c = {
    bg: 'var(--sg-campo)', menu: 'var(--sg-campo)', border: 'var(--sg-campo-borda)',
    text: 'var(--sg-texto)', ph: 'var(--sg-placeholder)', optHover: 'var(--sg-opcao-hover)',
  };

  return {
    control: (p, s) => ({
      ...p, backgroundColor: c.bg, borderColor: s.isFocused ? '#1ABB9C' : c.border,
      borderRadius: '0.5rem', color: c.text, padding: '2px', minHeight: '46px',
      boxShadow: s.isFocused ? '0 0 0 3px var(--sg-foco)' : 'none',
      '&:hover': { borderColor: s.isFocused ? '#1ABB9C' : 'var(--sg-campo-borda-hover)' },
    }),
    menu: (p) => ({ ...p, backgroundColor: c.menu, border: `1px solid ${c.border}`, borderRadius: '0.5rem', boxShadow: '0 10px 30px rgba(15,23,42,0.18)' }),
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
