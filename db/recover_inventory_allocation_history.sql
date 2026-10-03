-- Recover factual allocation events from existing audit records, without changing stock.
-- Sales already have movement entries and must not be counted as allocation releases.
with changes as (
 select a.created_at,a.actor,a.entity_type,a.entity_id,a.metadata->'before' old_row,a.metadata->'after' new_row
 from public.audit_logs a
 where a.entity_type in ('products','product_variants') and a.action in ('insert','update')
), parsed as (
 select *,nullif(old_row->>'inventory_item_id','')::uuid old_item,nullif(new_row->>'inventory_item_id','')::uuid new_item,
 coalesce((old_row->>'stock_allocation')::integer,0) old_qty,coalesce((new_row->>'stock_allocation')::integer,0) new_qty
 from changes
), events as (
 select *,new_item item,new_qty-old_qty change from parsed where old_item is not distinct from new_item and old_qty<>new_qty
 union all
 select *,old_item item,-old_qty change from parsed where old_item is distinct from new_item and old_qty<>0
 union all
 select *,new_item item,new_qty change from parsed where old_item is distinct from new_item and new_qty<>0
)
insert into public.inventory_movements(inventory_item_id,delta,allocation_delta,allocation_variant_id,reason,actor,movement_type,product_title,variant_sku,created_at)
select e.item,0,e.change,
 case when e.entity_type='product_variants' and exists(select 1 from public.product_variants v where v.id=e.entity_id::uuid) then e.entity_id::uuid end,
 'Allocation change recovered from audit history',e.actor,'Allocation',
 case when e.entity_type='products' then e.new_row->>'title' else (select p.title from public.products p where p.id=(e.new_row->>'product_id')::uuid) end,
 case when e.entity_type='product_variants' then e.new_row->>'sku' end,e.created_at
from events e
where e.item is not null and exists(select 1 from public.inventory_items i where i.id=e.item)
and not exists(select 1 from public.inventory_movements m where m.inventory_item_id=e.item and m.created_at=e.created_at
 and ((m.movement_type='Sale' and m.delta=e.change and m.variant_sku=e.new_row->>'sku')
 or (m.movement_type='Allocation' and m.allocation_delta=e.change
 and (m.allocation_variant_id::text=e.entity_id or m.variant_sku=e.new_row->>'sku' or (e.entity_type='products' and m.product_title=e.new_row->>'title')))));
