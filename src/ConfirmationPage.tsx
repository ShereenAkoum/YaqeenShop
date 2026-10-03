import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarDays, Check, CreditCard, FileText, Gift, House, MessageCircle, Package, ShoppingBag, Truck } from 'lucide-react';
import { supabase } from './lib/supabase';
import type { CartItem } from './StorePages';

type Order = { number: string; total?: number; items: CartItem[]; delivery_fee?: number; fulfillment_method?: string; payment_method?: string; payment_status?: string };
type Recommendation = { id: string; slug: string; title: string; price: number | null; product_images: { url: string; position: number }[] };
const money = (value: number) => '$' + Number(value || 0).toFixed(2);
function readOrder(): Order | null {
  try {
    const value = JSON.parse(sessionStorage.getItem('yaqeen-order') || 'null');
    return value && typeof value.number === 'string' && Array.isArray(value.items) ? value : null;
  } catch { return null; }
}

export function ConfirmationPage() {
  const [order] = useState(readOrder);
  const [content, setContent] = useState<{ heading?: string; body?: string }>({});
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  useEffect(() => {
    if (!supabase || !order) return;
    let live = true;
    const client = supabase;
    async function load() {
      const [document, products] = await Promise.all([
        client.from('website_documents').select('published').eq('key', 'order-confirmation').not('published_at', 'is', null).maybeSingle(),
        client.from('products').select('id,slug,title,price,product_images(url,position)').eq('status', 'Active').limit(12),
      ]);
      if (!live) return;
      if (!document.error) setContent(document.data?.published || {});
      if (!products.error) setRecommendations((products.data || []).filter(p => !order?.items.some(i => i.product_id === p.id)).slice(0, 4));
    }
    void load().catch(() => {});
    return () => { live = false; };
  }, [order]);
  if (!order) return <section className="confirmation-empty"><ShoppingBag size={36}/><h1>No recent order to show</h1><p>Your confirmation will appear here after you place an order.</p><Link className="confirmation-primary" to="/shop">Explore the collection <ArrowRight size={18}/></Link></section>;
  const pickup = order.fulfillment_method === 'pickup';
  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const fee = Number(order.delivery_fee || 0);
  const total = order.total == null ? subtotal + fee : Number(order.total);
  const steps = [
    { icon: Check, title: 'Order received', text: 'We have your order', active: true },
    { icon: Package, title: 'Preparing with care', text: 'We’ll get everything ready', active: false },
    { icon: Truck, title: pickup ? 'Ready for pickup' : 'On its way', text: pickup ? 'We’ll let you know when' : 'You’ll receive delivery details', active: false },
    { icon: House, title: pickup ? 'Collected' : 'Delivered', text: 'Enjoy your reminder', active: false },
  ];
  return <div className="order-confirmation">
    <section className="confirmation-stage">
      <img className="confirmation-olive olive-left" src={import.meta.env.BASE_URL + 'images/yaqeen-footer-olive.webp'} alt=""/>
      <div className="confirmation-layout">
        <div className="confirmation-main">
          <header className="confirmation-intro">
            <span className="confirmation-spark spark-one" aria-hidden="true">✦</span><span className="confirmation-spark spark-two" aria-hidden="true">✦</span>
            <div className="confirmation-check"><Check size={32}/></div>
            <p className="confirmation-kicker">ORDER CONFIRMED</p>
            <h1>{content.heading || 'Thank you for your order!'}</h1>
            <div className="confirmation-arabic" lang="ar">يقين</div>
            <h2>Your reminder is on its way.</h2>
            <p>{content.body || `We’ve received your order and will prepare it with care for ${pickup ? 'pickup' : 'delivery'}.`}</p>
          </header>
          <div className="confirmation-facts">
            <div><span><FileText size={24}/></span><div><small>Order Number</small><strong>{order.number}</strong></div></div>
            <div><span><CalendarDays size={24}/></span><div><small>Order Total</small><strong>{money(total)}</strong></div></div>
          </div>
          <ol className="confirmation-timeline" aria-label="Order progress">{steps.map(({ icon: Icon, title, text, active }, index) => <li className={active ? 'is-current' : ''} aria-current={active ? 'step' : undefined} key={title}><span className="timeline-icon"><Icon size={20}/></span><strong>{title}</strong><small>{text}</small>{index < 3 && <span className="timeline-line" aria-hidden="true"/>}</li>)}</ol>
          <div className="confirmation-next-card"><span><Gift size={29}/></span><div><h3>What happens next?</h3><p>We’ll prepare your order and confirm the {pickup ? 'pickup' : 'delivery'} details provided at checkout. {pickup ? 'We’ll let you know once it’s ready to collect.' : 'We’ll keep you updated once it ships.'}</p></div></div>
          <div className="confirmation-buttons"><Link className="confirmation-primary" to="/shop">Continue shopping <ArrowRight size={18}/></Link><Link className="confirmation-outline" to="/"><House size={17}/>Return to home</Link></div>
        </div>
        <aside className="confirmation-aside">
          <section className="confirmation-receipt" aria-labelledby="receipt-title"><h2 id="receipt-title">YOUR ORDER</h2>
            <div className="confirmation-items">{order.items.map(item => <div className="confirmation-item" key={item.cart_id}><div className="confirmation-item-image">{item.image ? <img src={item.image} alt={item.title}/> : <ShoppingBag size={24}/>}</div><div><strong dir="auto">{item.title}</strong>{item.options && <small>{item.options}</small>}</div><div><span>{money(item.price * item.quantity)}</span><small>Qty: {item.quantity}</small></div></div>)}</div>
            <dl className="confirmation-costs"><div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div><div><dt>{pickup ? 'Pickup' : 'Delivery'}</dt><dd>{fee ? money(fee) : '—'}</dd></div><div className="confirmation-total"><dt>Total</dt><dd>{money(total)}</dd></div></dl>
            <div className="confirmation-payment"><p>Payment Method</p><div><CreditCard size={25}/><span>{order.payment_method === 'whish' ? 'Whish Money' : pickup ? 'Cash on Pickup' : 'Cash on Delivery'}</span><small>{order.payment_status === 'paid' ? 'PAID' : order.payment_method === 'whish' ? 'PENDING' : pickup ? 'DUE AT PICKUP' : 'DUE ON DELIVERY'}</small></div></div>
            <div className="confirmation-placed" role="status"><span><Check size={22}/></span><div><strong>Order successfully placed</strong><p>Your order is with us. We’ll prepare each piece with care.</p></div></div>
          </section>
          <section className="confirmation-help"><span><MessageCircle size={25}/></span><div><h3>Need help?</h3><p>If you have any questions about your order, we’re here to help.</p><Link className="confirmation-outline" to="/contact">Contact Us <ArrowRight size={17}/></Link></div></section>
        </aside>
      </div>
    </section>
    <section className="confirmation-recommendations"><header><div><h2>You might also like <span aria-hidden="true">✦</span></h2><p>More thoughtful gifts to bring faith, peace, and intention into your life.</p></div><Link className="confirmation-outline" to="/shop">Explore All Products <ArrowRight size={16}/></Link></header>{recommendations.length > 0 && <div className="confirmation-product-grid">{recommendations.map(product => { const image = [...product.product_images].sort((a, b) => a.position - b.position)[0]; return <Link className="confirmation-product" key={product.id} to={'/products/' + product.slug}><div className="confirmation-product-image">{image ? <img src={image.url} alt={product.title} loading="lazy"/> : <ShoppingBag size={36}/>}</div><div className="confirmation-product-copy"><div><h3 dir="auto">{product.title}</h3>{product.price != null && <strong>{money(product.price)}</strong>}</div><span aria-label="View product"><ShoppingBag size={17}/></span></div></Link>; })}</div>}</section>
  </div>;
}
