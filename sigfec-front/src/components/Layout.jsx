/* eslint-disable react/prop-types */
import { motion } from 'framer-motion';

export default function Layout({ title, description, children }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md rounded-xl border border-slate-800 bg-slate-900 p-8 shadow-2xl"
      >
        {(title || description) && (
          <header className="mb-8">
            {title && <h1 className="text-2xl font-bold text-white">{title}</h1>}
            {description && <p className="mt-2 text-sm text-slate-400">{description}</p>}
          </header>
        )}
        {children}
      </motion.div>
    </div>
  );
}
