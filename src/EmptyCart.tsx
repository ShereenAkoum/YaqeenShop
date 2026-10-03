import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronLeft, ChevronRight, Gift, Heart, ShieldCheck, ShoppingBag, Truck } from 'lucide-react';

type Product = { id: string; slug: string; title: string; price: number | null; product_images?: { url: string; position: number }[] };
function readFavorites(): string[] {
  try { const saved = JSON.parse(localStorage.getItem('yaqeen-favorites') || '[]'); return Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []; } catch { return []; }
}

export function EmptyCart() {
  return <div className="empty-cart-experience">
    <section className="cart-empty-modern" aria-labelledby="empty-cart-title">
      <img className="empty-cart-illustration" src={import.meta.env.BASE_URL + 'images/yaqeen-empty-cart.svg'} alt=""/>
      <h2 id="empty-cart-title">Your cart is empty.</h2>
      <p>Looks like you haven’t added anything yet.<br/>Discover our collection of meaningful gifts to inspire your journey.</p>
      <Link className="empty-cart-explore" to="/shop">Explore the Collection <ArrowRight size={17}/></Link>
    </section>
    <div className="empty-cart-assurances">
      <div><ShieldCheck/><div><strong>Secure payment</strong><span>Shop with confidence</span></div></div>
      <div><Truck/><div><strong>Fast &amp; reliable shipping</strong><span>Delivered with care</span></div></div>
      <div><Gift/><div><strong>Thoughtful packaging</strong><span>Perfect for you or a loved one</span></div></div>
    </div>
  </div>;
}

export function EmptyCartRecommendations({ products }: { products: Product[] }) {
  const rail = useRef<HTMLDivElement>(null);
  const [favorites, setFavorites] = useState(readFavorites);
  const [position, setPosition] = useState({ start: true, end: true });
  useEffect(() => {
    const sync = () => setFavorites(readFavorites());
    window.addEventListener('favoriteschange', sync);
    window.addEventListener('storage', sync);
    return () => { window.removeEventListener('favoriteschange', sync); window.removeEventListener('storage', sync); };
  }, []);
  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const update = () => setPosition({ start: element.scrollLeft <= 2, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - 2 });
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener('scroll', update, { passive: true });
    update();
    return () => { observer.disconnect(); element.removeEventListener('scroll', update); };
  }, [products]);
  function toggle(id: string) {
    const saved = readFavorites();
    const next = saved.includes(id) ? saved.filter(value => value !== id) : [...saved, id];
    try { localStorage.setItem('yaqeen-favorites', JSON.stringify(next)); setFavorites(next); window.dispatchEvent(new Event('favoriteschange')); } catch { /* Storage may be unavailable in private browsing. */ }
  }
  function scroll(direction: number) {
    const element = rail.current;
    if (element) element.scrollBy({ left: direction * (element.clientWidth + 16), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  if (!products.length) return null;
  return <section className="empty-cart-recommendations" aria-labelledby="empty-cart-recommendations-title">
    <header className="cart-heading"><h2 id="empty-cart-recommendations-title">You Might Also Like</h2><Link to="/shop">View all <ArrowRight size={17}/></Link></header>
    <div className="empty-cart-carousel">
      <button className="empty-carousel-arrow previous" type="button" aria-label="Previous products" disabled={position.start} onClick={() => scroll(-1)}><ChevronLeft size={21}/></button>
      <div className="empty-cart-product-rail" ref={rail} tabIndex={0} aria-label="Recommended products">{products.map(product => {
        const photo = [...(product.product_images || [])].sort((a, b) => a.position - b.position)[0]?.url;
        const saved = favorites.includes(product.id);
        return <article className="empty-cart-product" key={product.id}>
          <div className="empty-cart-product-photo"><Link to={'/products/' + product.slug} aria-label={'View ' + product.title}>{photo ? <img src={photo} alt={product.title} loading="lazy"/> : <ShoppingBag size={36}/>}</Link><button type="button" className="empty-cart-favorite" aria-label={(saved ? 'Remove ' : 'Save ') + product.title + (saved ? ' from favorites' : ' to favorites')} aria-pressed={saved} onClick={() => toggle(product.id)}><Heart size={18} fill={saved ? 'currentColor' : 'none'}/></button></div>
          <div className="empty-cart-product-info"><Link to={'/products/' + product.slug}><h3 dir="auto">{product.title}</h3>{product.price != null && <span>${Number(product.price).toFixed(2)}</span>}</Link><Link className="empty-cart-product-shop" to={'/products/' + product.slug} aria-label={'Shop ' + product.title}><ShoppingBag size={16}/></Link></div>
        </article>;
      })}</div>
      <button className="empty-carousel-arrow next" type="button" aria-label="Next products" disabled={position.end} onClick={() => scroll(1)}><ChevronRight size={21}/></button>
    </div>
  </section>;
}
