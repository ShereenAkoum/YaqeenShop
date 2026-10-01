import { Link } from 'react-router-dom';

export function NotFound(){
 return <section className="container not-found-page">
  <p className="eyebrow">404 / PAGE NOT FOUND</p>
  <span className="not-found-mark" lang="ar" dir="rtl">يقين</span>
  <h1>This page wandered off.</h1>
  <p>The page you’re looking for doesn’t exist or may have moved.</p>
  <div className="not-found-actions">
   <Link className="button" to="/">Return home</Link>
   <Link className="secondary-button" to="/shop">Explore the collection</Link>
  </div>
 </section>
}
