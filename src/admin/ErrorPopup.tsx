import { AlertTriangle, X } from 'lucide-react';
export function ErrorPopup({message,onClose}:{message:string;onClose:()=>void}){
 if(!message)return null;
 return <div className="crm-error-backdrop" role="presentation" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}><div className="crm-error-popup" role="alertdialog" aria-modal="true" aria-label="Something went wrong"><div className="crm-error-head"><span className="crm-error-icon"><AlertTriangle size={20}/></span><div><h3>Something went wrong</h3><p>{message}</p></div><button type="button" className="icon-button" aria-label="Close error" onClick={onClose}><X size={18}/></button></div><div className="crm-error-actions"><button type="button" className="primary-button" onClick={onClose}>OK</button></div></div></div>
}
