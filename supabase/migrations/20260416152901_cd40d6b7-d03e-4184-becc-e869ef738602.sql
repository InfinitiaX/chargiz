
-- Sites: allow gestionnaire_entreprise + admin + superadmin to manage
CREATE POLICY "Gest entreprise manages sites"
ON public.sites FOR ALL TO authenticated
USING (
  filiale_id IN (SELECT id FROM filiales WHERE entreprise_id = get_user_entreprise_id(auth.uid()))
  AND (has_role(auth.uid(), 'gestionnaire_entreprise') OR has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'admin'))
)
WITH CHECK (
  filiale_id IN (SELECT id FROM filiales WHERE entreprise_id = get_user_entreprise_id(auth.uid()))
  AND (has_role(auth.uid(), 'gestionnaire_entreprise') OR has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'admin'))
);

-- Vehicules: allow gestionnaire_entreprise + admin + superadmin to manage
CREATE POLICY "Gest entreprise manages vehicules"
ON public.vehicules FOR ALL TO authenticated
USING (
  (entreprise_id = get_user_entreprise_id(auth.uid()))
  AND (has_role(auth.uid(), 'gestionnaire_entreprise') OR has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'admin'))
)
WITH CHECK (
  (entreprise_id = get_user_entreprise_id(auth.uid()))
  AND (has_role(auth.uid(), 'gestionnaire_entreprise') OR has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'admin'))
);

-- Sessions recharge: allow admin/superadmin to insert/update + gestionnaire to insert
CREATE POLICY "Gest entreprise manages sessions"
ON public.sessions_recharge FOR ALL TO authenticated
USING (
  (entreprise_id = get_user_entreprise_id(auth.uid()))
  AND (has_role(auth.uid(), 'gestionnaire_entreprise') OR has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'admin'))
)
WITH CHECK (
  (entreprise_id = get_user_entreprise_id(auth.uid()))
  AND (has_role(auth.uid(), 'gestionnaire_entreprise') OR has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'admin'))
);

-- Politiques recharge: allow gestionnaire_entreprise + admin + superadmin to manage
CREATE POLICY "Gest entreprise manages politiques"
ON public.politiques_recharge FOR ALL TO authenticated
USING (
  (entreprise_id = get_user_entreprise_id(auth.uid()))
  AND (has_role(auth.uid(), 'gestionnaire_entreprise') OR has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'admin'))
)
WITH CHECK (
  (entreprise_id = get_user_entreprise_id(auth.uid()))
  AND (has_role(auth.uid(), 'gestionnaire_entreprise') OR has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'admin'))
);
