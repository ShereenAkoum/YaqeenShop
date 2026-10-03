begin;

-- Internal helper, called by the existing authorized allocation RPCs.
create or replace function public.record_inventory_allocation(p_old jsonb, p_new jsonb, p_variant boolean)
returns void language plpgsql security invoker set search_path = '' as $$
declare
 old_item uuid := nullif(p_old->>'inventory_item_id','')::uuid;
 new_item uuid := nullif(p_new->>'inventory_item_id','')::uuid;
 old_qty integer := coalesce((p_old->>'stock_allocation')::integer,0);
 new_qty integer := coalesce((p_new->>'stock_allocation')::integer,0);
 product_name text;
 variant_id uuid;
 variant_sku text;
begin
 if old_item is not distinct from new_item and old_qty = new_qty then return; end if;
 if p_variant then
  select title into product_name from public.products where id=(p_new->>'product_id')::uuid;
  variant_id := (p_new->>'id')::uuid; variant_sku := p_new->>'sku';
 else product_name := p_new->>'title'; end if;
 if old_item is not distinct from new_item then
  if new_item is not null then
   insert into public.inventory_movements(inventory_item_id,delta,allocation_delta,allocation_variant_id,reason,actor,movement_type,product_title,variant_sku)
   values(new_item,0,new_qty-old_qty,variant_id,'Available-to-sell allocation changed',auth.uid(),'Allocation',product_name,variant_sku);
  end if;
 else
  if old_item is not null and old_qty<>0 then
   insert into public.inventory_movements(inventory_item_id,delta,allocation_delta,allocation_variant_id,reason,actor,movement_type,product_title,variant_sku)
   values(old_item,0,-old_qty,variant_id,'Allocation released from previous inventory',auth.uid(),'Allocation',product_name,variant_sku);
  end if;
  if new_item is not null and new_qty<>0 then
   insert into public.inventory_movements(inventory_item_id,delta,allocation_delta,allocation_variant_id,reason,actor,movement_type,product_title,variant_sku)
   values(new_item,0,new_qty,variant_id,'Stock assigned for sale',auth.uid(),'Allocation',product_name,variant_sku);
  end if;
 end if;
end $$;
revoke all on function public.record_inventory_allocation(jsonb,jsonb,boolean) from public, anon, authenticated;

-- Add history without changing checkout deductions or existing allocation checks.
do $$
declare definition text;
begin
 select pg_get_functiondef('public.save_product_inventory(uuid,uuid,integer)'::regprocedure) into definition;
 if position('record_inventory_allocation' in definition)=0 then
  definition := replace(definition,'declare v_available integer;', 'declare v_before jsonb; v_available integer;');
  definition := replace(definition, E'begin\n', E'begin\n select to_jsonb(p) into v_before from public.products p where id=p_product_id for update;\n');
  definition := replace(definition, ' return;', ' perform public.record_inventory_allocation(v_before,(select to_jsonb(p) from public.products p where id=p_product_id),false); return;');
  definition := replace(definition, E'end $function$', E'perform public.record_inventory_allocation(v_before,(select to_jsonb(p) from public.products p where id=p_product_id),false);\nend $function$');
  execute definition;
 end if;
 select pg_get_functiondef('public.save_variant(uuid,jsonb)'::regprocedure) into definition;
 if position('record_inventory_allocation' in definition)=0 then
  definition := replace(definition,'declare v_id uuid;', 'declare v_before jsonb; v_id uuid;');
  definition := replace(definition,E'begin\n',E'begin\n select to_jsonb(v) into v_before from public.product_variants v where id=p_id for update;\n');
  definition := replace(definition,'return v_id;', 'perform public.record_inventory_allocation(v_before,(select to_jsonb(v) from public.product_variants v where id=v_id),true); return v_id;');
  execute definition;
 end if;
end $$;

create or replace function public.adjust_inventory(p_id uuid,p_delta integer,p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
declare physical integer; allocated bigint;
begin
 if auth.uid() is null or not public.has_permission('inventory.edit') then raise exception 'Forbidden'; end if;
 if p_delta is null or p_delta=0 or abs(p_delta::bigint)>100000 or p_reason is null or length(trim(p_reason))<3 then raise exception 'Enter a valid quantity change and reason'; end if;
 select quantity into physical from public.inventory_items where id=p_id for update;
 if not found then raise exception 'Inventory item not found'; end if;
 select coalesce((select sum(stock_allocation) from public.products where inventory_item_id=p_id),0)
       +coalesce((select sum(stock_allocation) from public.product_variants where inventory_item_id=p_id),0) into allocated;
 if physical+p_delta<0 or physical+p_delta<allocated then raise exception 'Physical stock cannot be below remaining allocations (%). Release allocations first.',allocated; end if;
 update public.inventory_items set quantity=quantity+p_delta,updated_at=now() where id=p_id;
 insert into public.inventory_movements(inventory_item_id,delta,reason,actor,movement_type)
 values(p_id,p_delta,trim(p_reason),auth.uid(),case when p_delta>0 then 'Stock received' else 'Manual usage' end);
end $$;
revoke all on function public.adjust_inventory(uuid,integer,text) from public,anon;
grant execute on function public.adjust_inventory(uuid,integer,text) to authenticated;

-- Aggregate only; inventory staff need not have access to customer/order details.
create or replace function public.inventory_sales_totals()
returns table(product_id uuid,variant_id uuid,sold bigint)
language plpgsql stable security definer set search_path = '' as $$
begin
 if auth.uid() is null or not (public.has_permission('inventory.view') or public.has_permission('products.view')) then raise exception 'Forbidden'; end if;
 return query select oi.product_id,oi.variant_id,sum(oi.quantity)::bigint from public.order_items oi group by oi.product_id,oi.variant_id;
end $$;
revoke all on function public.inventory_sales_totals() from public,anon;
grant execute on function public.inventory_sales_totals() to authenticated;
commit;
