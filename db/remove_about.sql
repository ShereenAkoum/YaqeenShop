begin;
delete from public.website_documents where key = 'about';
do $$
declare r record; field text; array_key text; content jsonb; cleaned jsonb;
begin
  for r in select id, key, draft, published from public.website_documents loop
    foreach field in array array['draft','published'] loop
      content := case when field='draft' then r.draft else r.published end;
      if content is null then continue; end if;
      foreach array_key in array array['links','shop_links','support_links','about_links','sections'] loop
        if jsonb_typeof(content->array_key)='array' then
          select coalesce(jsonb_agg(item order by ord),'[]'::jsonb) into cleaned
          from jsonb_array_elements(content->array_key) with ordinality as a(item,ord)
          where coalesce(item->>'url','') !~ '(^|/)about/?([?#].*)?$'
            and coalesce(item->>'cta_url','') !~ '(^|/)about/?([?#].*)?$'
            and (array_key <> 'sections' or coalesce(item->>'type','') <> 'story');
          content := jsonb_set(content,array[array_key],cleaned);
        end if;
      end loop;
      if r.key='footer' then content := content - 'about_links' - 'about_heading'; end if;
      if field='draft' then update public.website_documents set draft=content where id=r.id and draft is distinct from content;
      else update public.website_documents set published=content where id=r.id and published is distinct from content; end if;
    end loop;
  end loop;
end $$;
commit;
