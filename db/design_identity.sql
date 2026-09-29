ALTER TABLE public.designs ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.designs ADD COLUMN IF NOT EXISTS code text;
UPDATE public.designs d
SET name = coalesce((SELECT nullif(trim(a.title),'') FROM public.design_assets a WHERE a.design_id=d.id ORDER BY a.created_at,a.id LIMIT 1),'Design ' || left(d.id::text,8)),
    code = 'DES-' || upper(left(d.id::text,8))
WHERE d.name IS NULL OR d.code IS NULL;
UPDATE public.designs SET name=coalesce(name,'Design ' || left(id::text,8)),code=coalesce(code,'DES-' || upper(left(id::text,8))) WHERE name IS NULL OR code IS NULL;
ALTER TABLE public.designs ALTER COLUMN name SET NOT NULL;
ALTER TABLE public.designs ALTER COLUMN code SET NOT NULL;
ALTER TABLE public.designs ADD CONSTRAINT designs_name_not_blank CHECK (length(trim(name))>0);
ALTER TABLE public.designs ADD CONSTRAINT designs_code_not_blank CHECK (length(trim(code))>0);
CREATE UNIQUE INDEX designs_code_unique ON public.designs (lower(code));
