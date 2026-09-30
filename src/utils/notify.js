// Notification type -> module (icon, label, colour, fallback page). Header dropdown + Notifications page duei eta use kore.
export const NOTIFY_META = {
  wishlist: { module: 'Wishlist', to: '/wishlist', tone: 'bg-brand-soft text-brand',
    icon: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z' },
  request: { module: 'Requests', to: '/requests', tone: 'bg-amber-50 text-amber-700',
    icon: 'M17 1l4 4-4 4M3 11V9a4 4 0 0 1 4-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 0 1-4 4H3' },
  accepted: { module: 'Requests', to: '/requests', tone: 'bg-emerald-50 text-emerald-700', icon: 'M20 6L9 17l-5-5' },
  rejected: { module: 'Requests', to: '/requests', tone: 'bg-rose-50 text-rose-700', icon: 'M18 6L6 18M6 6l12 12' },
  review: { module: 'Profile', to: '/profile', tone: 'bg-amber-50 text-[#B07D3A]',
    icon: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z' },
  message: { module: 'Messages', to: '/messages', tone: 'bg-sky-50 text-sky-700',
    icon: 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z' },
  system: { module: 'Book Haven', to: '/dashboard', tone: 'bg-neutral-100 text-neutral-600',
    icon: 'M12 8v4M12 16h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0z' },
}
export const metaOf = (n) => NOTIFY_META[n?.type] || NOTIFY_META.system
export const linkOf = (n) => n?.link || metaOf(n).to
