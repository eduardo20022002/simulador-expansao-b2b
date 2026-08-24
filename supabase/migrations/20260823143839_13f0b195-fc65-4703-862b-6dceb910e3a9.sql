TRUNCATE public.sales; TRUNCATE public.cep_geo;
GRANT SELECT ON public.sales TO anon, authenticated;
GRANT ALL ON public.sales TO service_role;
GRANT SELECT ON public.cep_geo TO anon, authenticated;
GRANT ALL ON public.cep_geo TO service_role;
DROP POLICY IF EXISTS "sales public read" ON public.sales;
CREATE POLICY "sales public read" ON public.sales FOR SELECT USING (true);
DROP POLICY IF EXISTS "cep_geo public read" ON public.cep_geo;
CREATE POLICY "cep_geo public read" ON public.cep_geo FOR SELECT USING (true);