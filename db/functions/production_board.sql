CREATE OR REPLACE FUNCTION public.production_board()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
begin
 if not public.has_permission('production.view') then raise exception 'Forbidden'; end if;
 return (select coalesce(jsonb_agg(x),'[]') from (
  select j.id,j.stage,j.created_at,o.number order_number,i.title,i.sku,i.color,i.size,i.stand,i.quantity,i.image_url,d.code design_code,
   case when public.has_permission('customers.view') then o.customer_name end customer_name,
   case when public.has_permission('payments.view') then (select p.status from public.payments p where p.order_id=o.id order by p.created_at desc limit 1) end payment_status,
   public.has_permission('inventory.view') inventory_visible,
   case when public.has_permission('inventory.view') then inv.id end inventory_item_id,
   case when public.has_permission('inventory.view') then inv.title end inventory_title,
   case when public.has_permission('inventory.view') then inv.sku end inventory_sku,
   case when public.has_permission('inventory.view') then inv.quantity end inventory_quantity
  from public.production_jobs j
  join public.order_items i on i.id=j.order_item_id
  join public.orders o on o.id=j.order_id
  left join public.designs d on d.id=i.design_id
  left join public.product_variants v on v.id=i.variant_id
  left join public.products product on product.id=i.product_id
  left join public.inventory_items inv on inv.id=case when i.variant_id is not null then v.inventory_item_id else product.inventory_item_id end
  where j.stage<>'Completed' order by j.created_at limit 250
 ) x);
end
$function$;
