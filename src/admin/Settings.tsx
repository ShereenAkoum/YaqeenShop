import { FormEvent, useEffect, useState } from 'react';
import { Save, Settings as SettingsIcon, Truck, WalletCards } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ErrorPopup } from './ErrorPopup';

export function SettingsAdmin({permissions}:{permissions:string[]}){
 const canEdit=permissions.includes('settings.edit'),[deliveryFee,setDeliveryFee]=useState('0'),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
 useEffect(()=>{(async()=>{setLoading(true);const{data,error}=await supabase!.from('site_settings').select('value').eq('key','commerce').maybeSingle();if(error)setError(error.message);else setDeliveryFee(String(Number(data?.value?.delivery_fee||0)));setLoading(false)})()},[]);
 async function save(e:FormEvent){e.preventDefault();setSaved(false);const fee=Number(deliveryFee);if(!Number.isInteger(fee)||fee<0||fee>100000){setError('Delivery fee must be a whole number between 0 and 100000 minor units.');return}setSaving(true);const{error}=await supabase!.from('site_settings').update({value:{currency:'USD',delivery_fee:fee}}).eq('key','commerce');setSaving(false);if(error){setError(error.message);return}setSaved(true);setTimeout(()=>setSaved(false),2500)}
 return <section className="admin-page settings-page"><div className="page-title"><div><p className="eyebrow">STORE CONFIGURATION</p><h1>Settings</h1></div></div>
 {loading?<div className="settings-loading">Loading settings…</div>:<form className="settings-card" onSubmit={save}><div className="settings-card-head"><span className="settings-card-icon"><SettingsIcon size={20}/></span><div><h2>Commerce</h2><p>Configure the defaults used for storefront orders.</p></div></div>
 <div className="settings-fields"><label><span className="settings-field-label"><WalletCards size={16}/> Currency</span><input value="USD" disabled readOnly/><small>This release operates in USD. All product prices are stored as integer cents.</small></label><label><span className="settings-field-label"><Truck size={16}/> Delivery fee</span><div className="settings-money-input"><span>¢</span><input type="number" min="0" max="100000" step="1" value={deliveryFee} disabled={!canEdit} onChange={e=>setDeliveryFee(e.target.value)}/></div><small>Flat delivery fee per order in minor units. 300 = $3.00.</small></label></div>
 <div className="settings-summary"><span>Current checkout delivery charge</span><strong>{'</strong></div>
 {canEdit?<div className="settings-actions">{saved&&<span className="settings-saved">Settings saved</span>}<button className="primary-button" disabled={saving}><Save size={16}/>{saving?'Saving…':'Save changes'}</button></div>:<p className="muted small settings-readonly">You have view-only access to these settings.</p>}</form>}
 {error&&<ErrorPopup message={error} onClose={()=>setError('')}/>}</section>
}+(Number(deliveryFee||0)/100).toFixed(2)}</strong></div>
 {canEdit?<div className="settings-actions">{saved&&<span className="settings-saved">Settings saved</span>}<button className="primary-button" disabled={saving}><Save size={16}/>{saving?'Saving…':'Save changes'}</button></div>:<p className="muted small settings-readonly">You have view-only access to these settings.</p>}</form>}
 {error&&<ErrorPopup message={error} onClose={()=>setError('')}/>}</section>
}