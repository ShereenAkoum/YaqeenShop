import { type CartItem } from './StorePages';
import { type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Banknote, Gift, LockKeyhole, Pencil, ShieldCheck, ShoppingBag, Store, Truck, UserRound, Wallet } from 'lucide-react';

const money = (value: number) => `$${value.toFixed(2)}`;
type Props = {
  items: CartItem[]; fee: number; fulfillment: 'delivery' | 'pickup'; pickupEnabled: boolean;
  payments: { cod: boolean; whish: boolean }; paymentMethod: string; whishMessage: string;
  pending: boolean; error: string; fieldErrors: Record<string, string>;
  setFulfillment: (value: 'delivery' | 'pickup') => void; setPaymentMethod: (value: string) => void;
  clearField: (name: string) => void; submit: (event: FormEvent<HTMLFormElement>) => void;
};

export function CheckoutLayout(p: Props) {
  const count = p.items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = p.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const fee = p.fulfillment === 'pickup' ? 0 : p.fee;
  const field = (name: string, title: string, placeholder: string, autocomplete: string, required = false, full = false, type = 'text') => <label className={full ? 'full' : ''}>
    <span>{title} {required && <b className="required-mark">*</b>}</span>
    <input name={name} type={type} autoComplete={autocomplete} required={required} placeholder={placeholder} aria-invalid={Boolean(p.fieldErrors[name])} aria-describedby={p.fieldErrors[name] ? `checkout-${name}-error` : undefined} onInput={event => {
      if (name === 'phone') {
        const value = event.currentTarget.value.replace(/[^0-9+]/g, '');
        event.currentTarget.value = (value.startsWith('+') ? '+' : '') + value.replace(/\+/g, '');
      }
      p.clearField(name);
    }} />
    {p.fieldErrors[name] && <small className="field-error" id={`checkout-${name}-error`} role="alert">{p.fieldErrors[name]}</small>}
  </label>;
  return <div className="checkout-page-modern">
    <header className="checkout-hero"><img src={import.meta.env.BASE_URL + 'images/yaqeen-shop-hero-v2.png'} alt="Acrylic reminders with olive branches in warm sunlight" /><div className="container"><p className="eyebrow">CHECKOUT</p><h1>Almost Yours.</h1><p>Complete your order and bring more<br className="checkout-desktop-break" /> meaningful reminders into your life.</p></div></header>
    <div className="container checkout-content">
      {!p.items.length ? <div className="cart-empty-modern"><ShoppingBag /><h2>Your bag is empty.</h2><p>Add something meaningful before continuing to checkout.</p><Link className="button" to="/shop">Explore the collection</Link></div> : <>
      <ol className="checkout-progress" aria-label="Checkout steps"><li aria-current="step"><span>1</span>Shipping</li><li><span>2</span>Payment</li><li><span>3</span>Review</li></ol>
      <form className="checkout-modern-grid" onSubmit={p.submit}>
        <div className="checkout-form-modern">
          <section className="checkout-section"><div className="checkout-section-heading"><span><UserRound /></span><div><h2>Shipping Information</h2><p>Enter your details so we can deliver your order to you.</p></div></div>
            <div className="checkout-fields two">
              {field('full_name', 'Full Name', 'Your full name', 'name', true)}
              {field('email', 'Email Address', 'you@example.com', 'email', false, false, 'email')}
              {field('phone', 'Phone Number', '+961 00 000 000', 'tel', true, true, 'tel')}
              {p.fulfillment === 'delivery' && <>{field('address', 'Shipping Address', 'Street, building, floor', 'street-address', true, true)}{field('city', 'City / Area', 'Your city or area', 'address-level2', true)}{field('instructions', 'Delivery Instructions', 'Landmark or preferred time', 'off')}</>}
            </div>
          </section>
          <section className="checkout-section"><div className="checkout-section-heading"><span><Truck /></span><div><h2>Delivery Method</h2><p>Choose how you would like to receive your order.</p></div></div><div className="checkout-fulfillment-options checkout-payment-options">
            <label className={'checkout-method-card selectable ' + (p.fulfillment === 'delivery' ? 'selected' : '')}><input type="radio" name="fulfillment_method" value="delivery" checked={p.fulfillment === 'delivery'} onChange={() => p.setFulfillment('delivery')} /><Truck /><span><strong>Delivery</strong><small>Have your order delivered<br />to your address.</small></span></label>
            {p.pickupEnabled && <label className={'checkout-method-card selectable ' + (p.fulfillment === 'pickup' ? 'selected' : '')}><input type="radio" name="fulfillment_method" value="pickup" checked={p.fulfillment === 'pickup'} onChange={() => { p.setFulfillment('pickup'); p.clearField('address'); p.clearField('city'); }} /><Store /><span><strong>Pick Up</strong><small>Collect your order with<br />no delivery fee.</small></span></label>}
          </div></section>
          <section className="checkout-section"><div className="checkout-section-heading"><span><Wallet /></span><div><h2>Payment Method</h2><p>Choose one of the available payment methods.</p></div></div><div className="checkout-payment-options">
            {p.payments.cod && <label className={'checkout-method-card selectable ' + (p.paymentMethod === 'cod' ? 'selected' : '')}><input type="radio" name="payment_method" value="cod" checked={p.paymentMethod === 'cod'} onChange={() => p.setPaymentMethod('cod')} /><Banknote /><span><strong>Cash on Delivery (COD)</strong><small>Pay when your order arrives.</small></span></label>}
            {p.payments.whish && <label className={'checkout-method-card selectable ' + (p.paymentMethod === 'whish' ? 'selected' : '')}><input type="radio" name="payment_method" value="whish" checked={p.paymentMethod === 'whish'} onChange={() => p.setPaymentMethod('whish')} /><Wallet /><span><strong>Whish Money</strong><small>{p.whishMessage}</small></span></label>}
            {!p.payments.cod && !p.payments.whish && <p className="checkout-error">No payment method is currently available.</p>}
            {p.fieldErrors.payment_method && <p className="field-error" role="alert">{p.fieldErrors.payment_method}</p>}
          </div><p className="checkout-payment-caption"><LockKeyhole size={15} />Your details are used only to fulfil your order.</p></section>
          <section className="checkout-section"><div className="checkout-section-heading"><span><Pencil /></span><div><h2>Order Note <small>(Optional)</small></h2><p>Add anything else you'd like us to know.</p></div></div><div className="checkout-fields"><label><span className="sr-only">Order note</span><textarea name="notes" rows={3} maxLength={500} placeholder="Gift note, special request, or other details…" /></label></div></section>
        </div>
        <aside className="checkout-aside"><div className="checkout-summary-modern"><header className="checkout-summary-heading"><h2>Order Summary ({count})</h2><Link to="/cart"><Pencil size={15} />Edit Cart</Link></header><div className="checkout-summary-items">{p.items.map(item => <div className="checkout-summary-item" key={item.cart_id}><div className="checkout-summary-image">{item.image ? <img src={item.image} alt={item.title} /> : <ShoppingBag />}<b>{item.quantity}</b></div><div><strong>{item.title}</strong>{item.options && <small>{item.options}</small>}{item.color && item.color !== item.options && <small>{item.color}</small>}<small>Qty: {item.quantity}</small></div><span>{money(item.price * item.quantity)}</span></div>)}</div><div className="checkout-summary-costs"><div><span>Subtotal ({count} {count === 1 ? 'item' : 'items'})</span><span>{money(subtotal)}</span></div><div><span>{p.fulfillment === 'pickup' ? 'Pick Up' : 'Shipping Fee'}</span><span>{money(fee)}</span></div></div><div className="checkout-summary-total"><span>Total</span><strong>{money(subtotal + fee)}</strong></div>
          {p.error && <div className="checkout-error" role="alert">{p.error}</div>}
          <button className="button checkout-place-order" disabled={p.pending}><LockKeyhole size={20} />{p.pending ? 'Placing your order…' : 'Place Order'}<ArrowRight size={20} /></button><p className="checkout-submit-note">By placing this order, you agree to our <Link to="/terms">Terms &amp; Conditions</Link> and <Link to="/privacy">Privacy Policy</Link>.</p><div className="checkout-trust"><div><ShieldCheck /><span>Secure<br />checkout</span></div><div><Truck /><span>Careful<br />delivery</span></div><div><Gift /><span>Thoughtful<br />packaging</span></div></div>
        </div><div className="checkout-purpose"><h2>More Than<br />A Purchase</h2><p>Every order helps spread beautiful reminders that inspire faith, peace, and positivity.</p><span /></div></aside>
      </form></>}
    </div>
  </div>;
}
