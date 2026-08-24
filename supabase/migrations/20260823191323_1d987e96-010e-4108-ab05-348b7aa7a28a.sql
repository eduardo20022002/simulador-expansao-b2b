DROP POLICY IF EXISTS "sales public read" ON public.sales;
REVOKE SELECT ON public.sales FROM anon;
GRANT SELECT ON public.sales TO authenticated;
GRANT ALL ON public.sales TO service_role;
CREATE POLICY "sales authenticated read" ON public.sales FOR SELECT TO authenticated USING (true);