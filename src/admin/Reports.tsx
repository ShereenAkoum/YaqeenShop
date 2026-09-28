import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { supabase } from '../lib/supabase';

const money=(v:any)=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(v||0));
const iso=(d:Date)=>d.toISOString().slice(0,10);
function ReportTable({title,rows,columns,moneyColumns=[]}:{title:string;rows:any[];columns:{key:string;label:string}[];moneyColumns?:string[]}){
 return <section className="report-section"><div className="section-head"><h2>{title}</h2></div><div className="table-wrap"><table><thead><tr>{columns.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{rows.map((r,i)=><tr key={i}>{columns.map(c=><td key={c.key}>{moneyColumns.includes(c.key)?money(r[c.key]):r[c.key]??'—'}</td>)}</tr>)}{!rows.length&&<tr><td colSpan={columns.length}>No data for this period.</td></tr>}</tbody></table></div></section>
}
export function Reports(){
 const today=new Date(),past=new Date(today.getTime()-30*86400000);const[from,setFrom]=useState(iso(past)),[to,setTo]=useState(iso(today)),[applied,setApplied]=useState({from:iso(past),to:iso(today)}),[data,setData]=useState<any|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 useEffect(()=>{(async()=>{setLoading(true);setError('');const end=new Date(applied.to+'T00:00:00Z');end.setUTCDate(end.getUTCDate()+1);const{data,error}=await supabase!.rpc('sales_report',{p_from:applied.from,p_to:end.toISOString()});if(error)setError(error.message);else setData(data);setLoading(false)})()},[applied]);
 return <section className="admin-page reports-page"><div className="page-title"><div><p className="eyebrow">A CLEARER VIEW OF YOUR BUSINESS</p><h1>Reports</h1></div></div>
 <form className="report-date-card" onSubmit={e=>{e.preventDefault();setApplied({from,to})}}><div className="report-date-icon"><CalendarDays size={19}/></div><label>From<input type="date" value={from} onChange={e=>setFrom(e.target.value)}/></label><label>Through<input type="date" value={to} onChange={e=>setTo(e.target.value)}/></label><button className="primary-button">Apply dates</button></form>
 {error&&<p className="form-error">{error}</p>}{loading?<p className="muted">Loading report…</p>:data&&<><div className="report-metrics"><div><span>Orders</span><strong>{data.summary?.orders||0}</strong></div><div><span>Order value</span><strong>{money(data.summary?.sales)}</strong></div><div><span>Average order</span><strong>{money(data.summary?.average_order)}</strong></div></div>
 <ReportTable title="Best-selling products" rows={data.products||[]} columns={[{key:'title',label:'Product'},{key:'quantity',label:'Quantity'},{key:'sales',label:'Sales'}]} moneyColumns={['sales']}/>
 <ReportTable title="Best-selling designs" rows={data.designs||[]} columns={[{key:'code',label:'Code'},{key:'title',label:'Design'},{key:'quantity',label:'Quantity'}]}/>
 <ReportTable title="Payment totals" rows={data.payments||[]} columns={[{key:'status',label:'Status'},{key:'amount',label:'Amount'},{key:'records',label:'Records'}]} moneyColumns={['amount']}/>
 <ReportTable title="Production volume" rows={data.production||[]} columns={[{key:'stage',label:'Stage'},{key:'jobs',label:'Jobs'}]}/>
 <ReportTable title="Delivery status" rows={data.delivery||[]} columns={[{key:'status',label:'Status'},{key:'deliveries',label:'Deliveries'}]}/></>}</section>
}