CREATE POLICY staff_delete ON public.designs FOR DELETE TO authenticated USING (public.has_permission('designs.edit'));
CREATE POLICY staff_delete ON public.design_assets FOR DELETE TO authenticated USING (public.has_permission('designs.edit'));
ALTER TABLE public.design_assets DROP CONSTRAINT design_assets_design_id_fkey;
ALTER TABLE public.design_assets ADD CONSTRAINT design_assets_design_id_fkey FOREIGN KEY (design_id) REFERENCES public.designs(id) ON DELETE CASCADE;
