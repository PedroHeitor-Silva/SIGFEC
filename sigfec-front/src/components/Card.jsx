/* eslint-disable react/prop-types */
const Card = ({ children, className = '' }) => (
  <div
    className={`rounded-xl bg-white p-6 ${className}`}
    style={{ boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}
  >
    {children}
  </div>
);

export default Card;
