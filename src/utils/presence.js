/**
 * Utility to determine if a user is "Actually" online based on their heartbeat.
 * Even if the 'online' flag is true, we verify the lastSeen timestamp.
 */
export const isActuallyOnline = (user) => {
  if (!user || !user.online) return false;
  if (!user.lastSeen) return false;
  
  try {
    // Handle Firestore Timestamp vs plain Date
    const lastSeenDate = typeof user.lastSeen.toDate === 'function' 
      ? user.lastSeen.toDate() 
      : new Date(user.lastSeen);
      
    const now = new Date();
    const diffInMinutes = (now - lastSeenDate) / (1000 * 60);
    
    // Consider offline if the "pulse" hasn't updated in 2 minutes
    return diffInMinutes < 2;
  } catch (e) {
    console.warn('[PresenceCheck] Failed to calculate status:', e);
    return user.online; // Fallback to raw value
  }
};
/**
 * Formats the lastSeen timestamp into a human-readable string.
 */
export const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return 'Offline';
  
  try {
    const date = typeof lastSeen.toDate === 'function' ? lastSeen.toDate() : new Date(lastSeen);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 60) return 'Last seen just now';
    if (diffInSeconds < 3600) return `Last seen ${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `Last seen ${Math.floor(diffInSeconds / 3600)}h ago`;
    
    const diffInDays = Math.floor(diffInSeconds / 86400);
    if (diffInDays === 1) return 'Last seen yesterday';
    if (diffInDays < 7) return `Last seen ${diffInDays}d ago`;
    
    return `Last seen on ${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
  } catch (e) {
    return 'Offline';
  }
};
