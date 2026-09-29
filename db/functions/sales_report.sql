CREATE OR REPLACE FUNCTION public.sales_report(p_from timestamptz, p_to timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO ''
AS $function$
begin
 if not public.has_permission('reports.view') then raise exception 'Forbidden'; end if;
 return jsonb_build_object(
  'summary',(select jsonb_build_object('orders',count(*),'sales',coalesce(sum(total),0),'average_order',coalesce(round(avg(total)),0)) from public.orders where created_at>=p_from and created_at<p_to),
  'payments',(select coalesce(jsonb_agg(x),'[]') from (select status,sum(amount) amount,count(*) records from public.payments where created_at>=p_from and created_at<p_to group by status) x),
  'products',(select coalesce(jsonb_agg(x),'[]') from (select i.title,sum(i.quantity) quantity,sum(i.quantity*i.unit_price) sales from public.order_items i join public.orders o on o.id=i.order_id where o.created_at>=p_from and o.created_at<p_to group by i.product_id,i.title order by sum(i.quantity) desc limit 20) x),
  'designs',(select coalesce(jsonb_agg(x),'[]') from (select left(d.id::text,8) code,coalesce((select nullif(a.title,'') from public.design_assets a where a.design_id=d.id order by a.created_at,a.id limit 1),left(d.id::text,8)) title,sum(i.quantity) quantity from public.order_items i join public.orders o on o.id=i.order_id join public.designs d on d.id=i.design_id where o.created_at>=p_from and o.created_at<p_to group by d.id order by sum(i.quantity) desc limit 20) x),
  'production',(select coalesce(jsonb_agg(x),'[]') from (select stage,count(*) jobs from public.production_jobs where created_at>=p_from and created_at<p_to group by stage) x),
  'delivery',(select coalesce(jsonb_agg(x),'[]') from (select status,count(*) deliveries from public.deliveries where created_at>=p_from and created_at<p_to group by status) x));
end
$function$;
