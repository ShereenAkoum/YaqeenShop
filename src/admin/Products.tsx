import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Modal } from './Modal';
import { ProductDetails } from './ProductDetails';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';

export function ProductsAdmin({permissions}:{permissions:string[]}){
 const[rows,setRows]=useState<any[]>([]),[cats,setCats]=useState<any[]>([]),[designs,setDesigns]=useState<any[]>([]),[adding,setAdding]=useState(false),[details,setDetails]=useState<{product:any;mode:'view'|'edit'}|null>(null),[deleting,setDeleting]=useState<any|null>(null),[error,setError]=useState('');
 const canEdit=permissions.includes('products.edit');
 async function load(){const[{data:r},{data:c},{data:d}]=await Promise.all([
  supabase!.from('products').select('*').order('created_at',{ascending:false}).limit(200),
  supabase!.from('categories').select('id,title').order('title'),
  supabase!.from('designs').select('id,title').order('title')
 ]);setRows(r||[]);setCats(c||[]);setDesigns(d||[])}
 useEffect(()=>{void load()},[]);
 async function saveNew(e:FormEvent<HTMLFormElement>){e.preventDefault();setError('');const fd=new FormData(e.currentTarget),title=String(fd.get('title')||'').trim(),sku=String(fd.get('sku')||'').trim();if(!title||!sku){setError('Title and SKU are required.');return}const data:any={title,sku,description:String(fd.get('description')||''),price:Math.round(Number(fd.get('price')||0)*100),category_id:fd.get('category_id')||null,design_id:fd.get('design_id')||null,status:fd.get('status')==='on'?'Active':'Draft',featured:fd.get('featured')==='on',bestseller:fd.get('bestseller')==='on',new_arrival:fd.get('new_arrival')==='on',seo_title:fd.get('seo_title')||null,seo_description:fd.get('seo_description')||null,slug:title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'product-'+crypto.randomUUID()};const{error}=await supabase!.from('products').insert(data);if(error){setError(error.message);return}setAdding(false);void load()}
 async function remove(){if(!deleting)return;const{error}=await supabase!.from('products').delete().eq('id',deleting.id);if(error){setError(error.code==='23503'?'This product has history. Archive it instead.':'Unable to delete product.');return}setDeleting(null);void load()}
 return <section className="admin-page">
  <div className="page-title"><div><p className="eyebrow">WORKSPACE</p><h1>Products</h1></div>{canEdit&&<button className="primary-button" onClick={()=>{setError('');setAdding(true)}}><Plus size={17}/> Add product</button>}</div>
  <div className="table-wrap"><table><thead><tr><th>Title</th><th>SKU</th><th>Active</th><th>Price</th><th>Actions</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.title}</td><td>{r.sku}</td><td><button className={'status-toggle '+(r.status==='Active'?'on':'')} aria-label={r.status==='Active'?'Deactivate product':'Activate product'} disabled={!canEdit} onClick={async()=>{if(!canEdit)return;await supabase!.from('products').update({status:r.status==='Active'?'Draft':'Active'}).eq('id',r.id);void load()}}><span/></button></td><td>{'$'+(r.price/100).toFixed(2)}</td><td className="actions-cell"><div className="table-actions"><button className="icon-button" title="View" onClick={()=>setDetails({product:r,mode:'view'})}><Eye size={18}/></button>{canEdit&&<><button className="icon-button" title="Edit" onClick={()=>setDetails({product:r,mode:'edit'})}><Pencil size={18}/></button><button className="icon-button error" title="Delete" onClick={()=>{setError('');setDeleting(r)}}><Trash2 size={18}/></button></>}</div></td></tr>)}</tbody></table></div>
  {adding&&<Modal title="Add product" onClose={()=>setAdding(false)}><form className="editor-form two-col product-editor" onSubmit={saveNew}>
   <label>Title<input name="title" required/></label><label>SKU<input name="sku" required/></label>
   <label className="full">Description<textarea name="description"/></label>
   <label>Price (USD)<input name="price" type="number" min="0" step=".01" required/></label>
   <label>Category<select name="category_id"><option value="">None</option>{cats.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label>
   <label>Master design<select name="design_id"><option value="">None</option>{designs.map(d=><option key={d.id} value={d.id}>{d.title}</option>)}</select></label>
   <label>Active on website<span className="form-toggle"><input name="status" type="checkbox"/><span className="toggle-track"><span/></span></span></label>
   <label>Featured<span className="form-toggle"><input name="featured" type="checkbox"/><span className="toggle-track"><span/></span></span></label>
   <label>Bestseller<span className="form-toggle"><input name="bestseller" type="checkbox"/><span className="toggle-track"><span/></span></span></label>
   <label>New arrival<span className="form-toggle"><input name="new_arrival" type="checkbox"/><span className="toggle-track"><span/></span></span></label>
   <label>SEO title<input name="seo_title"/></label><label>SEO description<textarea name="seo_description"/></label>
   {error&&<p className="form-error full">{error}</p>}<button className="primary-button full">Save</button>
  </form></Modal>}
  {details&&<ProductDetails product={details.product} mode={details.mode} permissions={permissions} onClose={()=>setDetails(null)} onSaved={()=>void load()}/>}
  {deleting&&<Modal title="Delete product?" onClose={()=>setDeleting(null)}><div className="confirm-body"><p>Delete {deleting.title}? Products with order or inventory history cannot be deleted.</p>{error&&<p className="form-error">{error}</p>}<div className="modal-actions"><button className="secondary-button" onClick={()=>setDeleting(null)}>Cancel</button><button className="danger-button" onClick={remove}>Delete product</button></div></div></Modal>}
 </section>
}