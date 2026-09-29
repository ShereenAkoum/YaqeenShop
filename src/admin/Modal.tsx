import type { ReactNode } from 'react';

export function Modal({title,onClose,children,compact=false,className=''}:{title:string;onClose:()=>void;children:ReactNode;compact?:boolean;className?:string}){
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className={'modal '+(compact||title.toLowerCase().startsWith('delete')?'modal-confirm ':'')+className}>
      <div className="modal-head"><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Close">×</button></div>
      {children}
    </div>
  </div>;
}
