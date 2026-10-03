-- Retire Top Picks while preserving existing selected products as Featured.
-- Applied directly to Supabase; this repeatable script records the same change.
begin;
do $$
begin
 if exists(select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='top_pick') then
  update public.products set featured=true where top_pick is true and featured is false;
 end if;
end $$;
drop trigger if exists products_top_picks_limit on public.products;
drop function if exists public.enforce_top_picks_limit();
drop function if exists public.enforce_max_four_top_picks();
alter table public.products drop column if exists top_pick;
update public.site_settings set value=value-'top_picks_limit' where key='merchandising';
delete from public.site_settings where key='merchandising' and value='{}'::jsonb;

-- Normalize both saved homepage versions without changing hero/story/footer content.
create or replace function pg_temp.normalize_homepage_collections(doc jsonb)
returns jsonb language plpgsql as $function$
declare
 source jsonb;
 defaults jsonb := '[{"id": "new-arrivals", "type": "products", "selection": "new_arrival", "enabled": true, "heading": "New arrivals", "subheading": "JUST ADDED", "body": "Fresh reminders for meaningful moments.", "cta_text": "Explore new arrivals", "cta_url": "/shop"}, {"id": "collection", "type": "products", "selection": "collection", "enabled": true, "heading": "Explore the collection", "subheading": "THE COLLECTION", "body": "Meaningful reminders for your everyday.", "cta_text": "Shop all products", "cta_url": "/shop"}, {"id": "bestsellers", "type": "products", "selection": "bestseller", "enabled": true, "heading": "Bestsellers", "subheading": "CUSTOMER FAVOURITES", "body": "The pieces people come back to.", "cta_text": "Discover favourites", "cta_url": "/shop"}]'::jsonb;
 groups jsonb := '[]'::jsonb;
 base jsonb;
 existing jsonb;
 heroes jsonb;
 other_sections jsonb;
begin
 if doc is null or jsonb_typeof(doc->'sections') is distinct from 'array' then return doc; end if;
 source := doc->'sections';
 for base in select value from jsonb_array_elements(defaults) loop
  select value into existing from jsonb_array_elements(source) where value->>'type'='products' and value->>'selection'=base->>'selection' limit 1;
  if existing is null and base->>'selection'='collection' then
   select value into existing from jsonb_array_elements(source) where value->>'type'='products' and value->>'selection'='top' limit 1;
  end if;
  groups := groups || jsonb_build_array(base || coalesce(existing,'{}'::jsonb) || jsonb_build_object('id',base->>'id','selection',base->>'selection','heading',base->>'heading','subheading',base->>'subheading','body',base->>'body','cta_text',base->>'cta_text') || case when base->>'selection'='new_arrival' then '{"enabled":true}'::jsonb else '{}'::jsonb end);
 end loop;
 select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into heroes from jsonb_array_elements(source) with ordinality as entries(value,ord) where value->>'type'='hero';
 select coalesce(jsonb_agg(value order by ord),'[]'::jsonb) into other_sections from jsonb_array_elements(source) with ordinality as entries(value,ord) where value->>'type' is distinct from 'hero' and value->>'type' is distinct from 'products';
 return jsonb_set(doc,'{sections}',heroes||groups||other_sections);
end $function$;
update public.website_documents set draft=pg_temp.normalize_homepage_collections(draft),published=pg_temp.normalize_homepage_collections(published) where key='homepage';
drop function pg_temp.normalize_homepage_collections(jsonb);
commit;
