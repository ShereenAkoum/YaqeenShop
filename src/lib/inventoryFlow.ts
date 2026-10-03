export function inventoryAllocations(products:any[],variants:any[],sales:any[]){
 const sold=new Map(sales.map(s=>[s.variant_id||s.product_id,Number(s.sold)]));
 return [
  ...variants.map(v=>({...v,sold:sold.get(v.id)||0})),
  ...products.filter(p=>p.inventory_item_id).map(p=>({...p,color:'',active:p.status==='Active',products:{title:p.title,status:p.status},simple:true,sold:sold.get(p.id)||0})),
 ];
}
export function inventoryBalance(quantity:number,allocations:readonly number[]){
 const allocated=allocations.reduce((sum,value)=>sum+value,0);
 return {allocated,unallocated:quantity-allocated};
}
