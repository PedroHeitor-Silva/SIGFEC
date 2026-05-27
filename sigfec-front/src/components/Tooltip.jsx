/* eslint-disable react/prop-types */
import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export default function Tooltip({ label, children, side = 'top' }) {
  const [open, setOpen] = useState(false);

  const sideCls = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
    >
      {children}
      <AnimatePresence>
        {open && label && (
          <motion.span
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            role="tooltip"
            className={`absolute z-50 whitespace-nowrap rounded-md px-2 py-1 text-[11px] font-medium shadow-lg pointer-events-none ${sideCls[side]}`}
            style={{ background: '#1f2937', color: '#f9fafb', border: '1px solid #374151' }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
