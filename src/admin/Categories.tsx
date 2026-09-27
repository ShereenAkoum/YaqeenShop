import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Modal } from './Modal';

export function Categories({permissions}:{permissions:string[]}){
 const[rows,setRows]=useState<any[]>([]),[edit,setEdit]=useState<any|null|undefined>(undefined);
 const[error,setError]=useState(''); const canEdit=permissions.includes('products.edit');
 async function load(){const{data}=await supabase!.from('categories').select('id,title,active,created_at').order('created_at',{ascending:false});setRows(data||[])}
 useEffect(()=>{void load()},[]);
 async function save(e:FormEvent<HTMLFormElement>){e.preventDefault();setError('');const fd=new FormData(e.currentTarget);const title=String(fd.get('title')||'').trim(),active=fd.get('active')==='on';if(!title){setError('Name is required.');return}const slug=title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'category-'+crypto.randomUUID();const q=edit?.id?supabase!.from('categories').update({title,active}).eq('id',edit.id):supabase!.from('categories').insert({title,active,slug});const{error}=await q;if(error){setError(error.message);return}setEdit(undefined);void load()}
 async function remove(row:any){if(!window.confirm('Delete '+row.title+'?'))return;const{error}=await supabase!.from('categories').delete().eq('id',row.id);if(error)window.alert(error.code==='23503'?'This category is in use.':'Unable to delete category.');else void load()}
 return <section className="admin-page"><div className="page-title"><div><p className="eyebrow">WORKSPACE</p><h1>Categories</h1></div>{canEdit&&<button className="primary-button" onClick={()=>setEdit(null)}>Add category</button>}</div>
 <div className="table-wrap"><table><thead><tr><th>Name</th><th>Active</th><th>Actions</th></tr></thead><tbody>{rows.map(r=><tr key={r.id}><td>{r.title}</td><td>{r.active?'Yes':'No'}</td><td>{canEdit&&<><button className="link-button" onClick={()=>setEdit(r)}>Edit</button><button className="link-button danger" onClick={()=>remove(r)}>Delete</button></>}</td></tr>)}</tbody></table></div>
 {edit!==undefined&&<Modal title={edit?'Edit category':'Add category'} onClose={()=>setEdit(undefined)}><form className="editor-form" onSubmit={save}><label>Name<input name="title" required defaultValue={edit?.title||''}/></label><label className="check"><input type="checkbox" name="active" defaultChecked={edit?.active??true}/> Active</label>{error&&<p className="form-error">{error}</p>}<button className="primary-button">Save</button></form></Modal>}</section>
}
