-- Use the inventory pool recorded at sale time, even if a variant moves later.
create or replace function public.inventory_item_sales_totals()
returns table(inventory_item_id uuid,sold bigint)
language sql stable security invoker set search_path = '' as $$
 select m.inventory_item_id,sum(-m.delta)::bigint
 from public.inventory_movements m
 where m.movement_type='Sale' and m.delta<0
 group by m.inventory_item_id
$$;
revoke all on function public.inventory_item_sales_totals() from public,anon;
grant execute on function public.inventory_item_sales_totals() to authenticated;
