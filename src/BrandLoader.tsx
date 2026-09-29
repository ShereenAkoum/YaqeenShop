const logoUrl = 'https://zjppxaoexrmfocebctht.supabase.co/storage/v1/object/public/website-media/media-1790693265049-transparent-logow.webp';

export function BrandLoader({label = 'Loading', compact = false}:{label?:string; compact?:boolean}){
 return <div className={'brand-loader'+(compact?' brand-loader-compact':'')} role="status" aria-label={label}>
  <img src={logoUrl} alt="" aria-hidden="true" decoding="async"/>
  <span className="brand-loader-sr">{label}</span>
 </div>;
}
