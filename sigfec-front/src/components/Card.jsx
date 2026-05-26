/* eslint-disable react/prop-types */
const Card = ({ children, className = '' }) => (
  <div className={`rounded-xl border border-slate-800 bg-slate-900 ${className}`}>
    {children}
  </div>
);

export default Card;
