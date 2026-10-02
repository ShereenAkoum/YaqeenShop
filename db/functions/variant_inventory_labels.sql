CREATE OR REPLACE FUNCTION public.variant_inventory_labels(p_ids uuid[])
RETURNS TABLE(variant_id uuid, inventory_title text, inventory_sku text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
begin
  return query
  select pv.id, ii.title, ii.sku
  from public.product_variants pv
  join public.products p on p.id = pv.product_id
  left join public.inventory_items ii on ii.id = pv.inventory_item_id
  where pv.id = any(p_ids) and pv.active = true
    and (
      public.has_permission('inventory.view') or public.has_permission('products.view')
      or (p.status = 'Active' and (p.category_id is null or exists (
        select 1 from public.categories c where c.id = p.category_id and c.active = true
      )))
    );
end
$function$;
REVOKE ALL ON FUNCTION public.variant_inventory_labels(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.variant_inventory_labels(uuid[]) TO anon, authenticated;
