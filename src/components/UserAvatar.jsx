import React from 'react';
import { motion } from 'framer-motion';

/**
 * Reusable UserAvatar component.
 * Props:
 *   src: string — image URL
 *   name: string — fallback display name
 *   online: boolean — show green dot indicator
 *   size: 'sm' | 'md' | 'lg' | 'xl' — avatar size (default: 'md')
 *   className: string — optional extra classes
 *   onClick: function — optional click handler
 */
const sizes = {
  xs: 'w-7 h-7',
  sm: 'w-9 h-9',
  md: 'w-11 h-11',
  lg: 'w-14 h-14',
  xl: 'w-20 h-20',
};

const dotSizes = {
  xs: 'w-2 h-2',
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-3.5 h-3.5',
  xl: 'w-4 h-4',
};

const UserAvatar = ({ src, name = 'U', online = false, size = 'md', className = '', onClick }) => {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff&bold=true`;

  return (
    <motion.div
      className={`relative flex-shrink-0 ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.05 } : {}}
      whileTap={onClick ? { scale: 0.97 } : {}}
    >
      <img
        src={src || fallbackUrl}
        alt={name}
        aria-label={`${name} avatar`}
        onError={(e) => { e.target.src = fallbackUrl; }}
        className={`${sizes[size]} rounded-full object-cover border border-glass-border/40 select-none`}
      />
      {online && (
        <span
          aria-label="Online"
          className={`absolute bottom-0 right-0 ${dotSizes[size]} bg-green-500 rounded-full border-2 border-bg-base`}
        />
      )}
    </motion.div>
  );
};

export default UserAvatar;
