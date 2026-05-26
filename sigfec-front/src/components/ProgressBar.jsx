/* eslint-disable react/prop-types */
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

let pendingCount = 0;
let listeners = [];

function notify() {
  listeners.forEach((fn) => fn(pendingCount > 0));
}

api.interceptors.request.use((cfg) => {
  pendingCount++;
  notify();
  return cfg;
});

api.interceptors.response.use(
  (res) => {
    pendingCount = Math.max(0, pendingCount - 1);
    notify();
    return res;
  },
  (err) => {
    pendingCount = Math.max(0, pendingCount - 1);
    notify();
    return Promise.reject(err);
  }
);

export default function ProgressBar() {
  const [active, setActive] = useState(false);

  useEffect(() => {
    const fn = (v) => setActive(v);
    listeners.push(fn);
    return () => { listeners = listeners.filter((l) => l !== fn); };
  }, []);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed top-0 left-0 right-0 z-[200] h-0.5 overflow-hidden pointer-events-none"
        >
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: ['-100%', '100%'] }}
            transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
            className="h-full w-1/3 bg-gradient-to-r from-transparent via-emerald-400 to-transparent"
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
