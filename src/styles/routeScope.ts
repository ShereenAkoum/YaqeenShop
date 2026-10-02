/** One scope per screen. Shared chrome is scoped separately to its application area. */
export function styleScope(pathname: string) {
  const path = pathname.replace(/\/+$/, '') || '/';
  if (path === '/login') return { area: 'admin', screen: 'login' };
  if (path === '/admin' || path.startsWith('/admin/')) {
    const module = path.split('/')[2] || 'dashboard';
    const screen = ['production', 'deliveries', 'payments'].includes(module) ? 'operations' : module;
    return { area: 'admin', screen: `admin-${screen}` };
  }
  const screens: Record<string, string> = {
    '/': 'home', '/shop': 'shop', '/cart': 'cart', '/checkout': 'checkout',
    '/order-confirmation': 'confirmation', '/search': 'search',
    '/contact': 'contact', '/faq': 'faq', '/privacy': 'legal', '/terms': 'legal',
    '/under-construction': 'construction',
  };
  const screen = path.startsWith('/products/') ? 'product' : screens[path] || 'content';
  return { area: 'store', screen: `store-${screen}` };
}
