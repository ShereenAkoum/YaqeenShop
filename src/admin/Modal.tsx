import type { ReactNode } from 'react';

export function Modal({title,onClose,children,compact=false}:{title:string;onClose:()=>void;children:ReactNode;compact?:boolean}){
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className={'modal '+(compact||title.toLowerCase().startsWith('delete')?'modal-confirm':'')}>
      <div className="modal-head"><h2>{title}</h2><button type="button" onClick={onClose} aria-label="Close">×</button></div>
      {children}
    </div>
  </div>;
}
