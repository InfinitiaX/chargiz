
-- ===========================================
-- ENUM: app_role
-- ===========================================
CREATE TYPE public.app_role AS ENUM (
  'superadmin',
  'admin',
  'gestionnaire_entreprise',
  'gestionnaire_filiale',
  'gestionnaire_site',
  'collaborateur'
);

-- ===========================================
-- TABLE: user_roles
-- ===========================================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- SECURITY DEFINER: has_role
-- ===========================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- ===========================================
-- SECURITY DEFINER: get_user_role
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS public.app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- ===========================================
-- TABLE: entreprises
-- ===========================================
CREATE TABLE public.entreprises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  siren TEXT,
  siret TEXT,
  numero_tva TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  pays TEXT DEFAULT 'France',
  telephone TEXT,
  email TEXT,
  prix_kwh_defaut NUMERIC(10,4) DEFAULT 0.2100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.entreprises ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- TABLE: filiales
-- ===========================================
CREATE TABLE public.filiales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE NOT NULL,
  nom TEXT NOT NULL,
  siret TEXT,
  numero_tva TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  pays TEXT DEFAULT 'France',
  responsable_nom TEXT,
  responsable_prenom TEXT,
  responsable_email TEXT,
  responsable_telephone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.filiales ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- TABLE: sites
-- ===========================================
CREATE TABLE public.sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filiale_id UUID REFERENCES public.filiales(id) ON DELETE CASCADE NOT NULL,
  nom TEXT NOT NULL,
  siret TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  pays TEXT DEFAULT 'France',
  responsable_nom TEXT,
  responsable_prenom TEXT,
  responsable_email TEXT,
  responsable_telephone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- TABLE: profiles (collaborateurs / gestionnaires)
-- ===========================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  nom TEXT NOT NULL,
  prenom TEXT NOT NULL,
  email TEXT NOT NULL,
  telephone TEXT,
  adresse TEXT,
  code_postal TEXT,
  ville TEXT,
  pays TEXT DEFAULT 'France',
  entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE SET NULL,
  filiale_id UUID REFERENCES public.filiales(id) ON DELETE SET NULL,
  site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
  cout_kwh_domicile NUMERIC(10,4),
  jours_suivi JSONB DEFAULT '[]'::jsonb,
  horaires_suivi JSONB DEFAULT '{}'::jsonb,
  jours_conge JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- TABLE: vehicules
-- ===========================================
CREATE TABLE public.vehicules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE NOT NULL,
  collaborateur_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  marque TEXT,
  modele TEXT,
  vin TEXT,
  immatriculation TEXT,
  capacite_batterie NUMERIC(10,2),
  statut_smartcar TEXT DEFAULT 'deconnecte' CHECK (statut_smartcar IN ('connecte','deconnecte','suspendu')),
  statut_affectation TEXT DEFAULT 'non_affecte' CHECK (statut_affectation IN ('affecte','non_affecte','archive')),
  smartcar_vehicle_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.vehicules ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- TABLE: sessions_recharge
-- ===========================================
CREATE TABLE public.sessions_recharge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicule_id UUID REFERENCES public.vehicules(id) ON DELETE CASCADE NOT NULL,
  collaborateur_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE NOT NULL,
  date_debut TIMESTAMPTZ,
  date_fin TIMESTAMPTZ,
  energie_kwh NUMERIC(10,2),
  soc_debut NUMERIC(5,2),
  soc_fin NUMERIC(5,2),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  is_domicile BOOLEAN DEFAULT false,
  cout_euro NUMERIC(10,2),
  kilometrage NUMERIC(10,1),
  co2_evite NUMERIC(10,2),
  jour_semaine TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sessions_recharge ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- TABLE: politiques_recharge
-- ===========================================
CREATE TABLE public.politiques_recharge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entreprise_id UUID REFERENCES public.entreprises(id) ON DELETE CASCADE,
  filiale_id UUID REFERENCES public.filiales(id) ON DELETE CASCADE,
  site_id UUID REFERENCES public.sites(id) ON DELETE CASCADE,
  collaborateur_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  prix_kwh NUMERIC(10,4) NOT NULL DEFAULT 0.2100,
  jours_autorises JSONB DEFAULT '["lun","mar","mer","jeu","ven"]'::jsonb,
  horaires_debut TIME DEFAULT '00:00',
  horaires_fin TIME DEFAULT '23:59',
  fermetures JSONB DEFAULT '[]'::jsonb,
  conges_non_rembourses BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.politiques_recharge ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- TABLE: audit_log
-- ===========================================
CREATE TABLE public.audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entite TEXT NOT NULL,
  entite_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- HELPER: get_user_entreprise_id
-- ===========================================
CREATE OR REPLACE FUNCTION public.get_user_entreprise_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT entreprise_id FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_filiale_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT filiale_id FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_user_site_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT site_id FROM public.profiles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- ===========================================
-- RLS POLICIES: user_roles
-- ===========================================
CREATE POLICY "Superadmin/admin can view all roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users can view own role" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Superadmin can manage roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

-- ===========================================
-- RLS POLICIES: entreprises
-- ===========================================
CREATE POLICY "Superadmin/admin see all entreprises" ON public.entreprises
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Gest entreprise sees own entreprise" ON public.entreprises
  FOR SELECT TO authenticated
  USING (id = public.get_user_entreprise_id(auth.uid()));

CREATE POLICY "Superadmin/admin manage entreprises" ON public.entreprises
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')
  );

-- ===========================================
-- RLS POLICIES: filiales
-- ===========================================
CREATE POLICY "Superadmin/admin see all filiales" ON public.filiales
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Gest entreprise sees own filiales" ON public.filiales
  FOR SELECT TO authenticated
  USING (entreprise_id = public.get_user_entreprise_id(auth.uid()));

CREATE POLICY "Gest filiale sees own filiale" ON public.filiales
  FOR SELECT TO authenticated
  USING (id = public.get_user_filiale_id(auth.uid()));

CREATE POLICY "Gest entreprise manages filiales" ON public.filiales
  FOR ALL TO authenticated
  USING (
    entreprise_id = public.get_user_entreprise_id(auth.uid())
    AND (
      public.has_role(auth.uid(), 'gestionnaire_entreprise')
      OR public.has_role(auth.uid(), 'superadmin')
      OR public.has_role(auth.uid(), 'admin')
    )
  );

-- ===========================================
-- RLS POLICIES: sites
-- ===========================================
CREATE POLICY "Superadmin/admin see all sites" ON public.sites
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Gest entreprise sees own sites" ON public.sites
  FOR SELECT TO authenticated
  USING (
    filiale_id IN (
      SELECT id FROM public.filiales WHERE entreprise_id = public.get_user_entreprise_id(auth.uid())
    )
  );

CREATE POLICY "Gest filiale sees own sites" ON public.sites
  FOR SELECT TO authenticated
  USING (filiale_id = public.get_user_filiale_id(auth.uid()));

CREATE POLICY "Gest site sees own site" ON public.sites
  FOR SELECT TO authenticated
  USING (id = public.get_user_site_id(auth.uid()));

-- ===========================================
-- RLS POLICIES: profiles
-- ===========================================
CREATE POLICY "Superadmin/admin see all profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users see own profile" ON public.profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Gest entreprise sees own profiles" ON public.profiles
  FOR SELECT TO authenticated
  USING (entreprise_id = public.get_user_entreprise_id(auth.uid()));

CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Superadmin/admin manage profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Gest entreprise manage profiles" ON public.profiles
  FOR ALL TO authenticated
  USING (
    entreprise_id = public.get_user_entreprise_id(auth.uid())
    AND public.has_role(auth.uid(), 'gestionnaire_entreprise')
  );

-- ===========================================
-- RLS POLICIES: vehicules
-- ===========================================
CREATE POLICY "Superadmin/admin see all vehicules" ON public.vehicules
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Gest entreprise sees own vehicules" ON public.vehicules
  FOR SELECT TO authenticated
  USING (entreprise_id = public.get_user_entreprise_id(auth.uid()));

CREATE POLICY "Collaborateur sees own vehicule" ON public.vehicules
  FOR SELECT TO authenticated
  USING (
    collaborateur_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- ===========================================
-- RLS POLICIES: sessions_recharge
-- ===========================================
CREATE POLICY "Superadmin/admin see all sessions" ON public.sessions_recharge
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Gest entreprise sees own sessions" ON public.sessions_recharge
  FOR SELECT TO authenticated
  USING (entreprise_id = public.get_user_entreprise_id(auth.uid()));

CREATE POLICY "Collaborateur sees own sessions" ON public.sessions_recharge
  FOR SELECT TO authenticated
  USING (
    collaborateur_id IN (SELECT id FROM public.profiles WHERE user_id = auth.uid())
  );

-- ===========================================
-- RLS POLICIES: politiques_recharge
-- ===========================================
CREATE POLICY "Superadmin/admin see all politiques" ON public.politiques_recharge
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Gest entreprise sees own politiques" ON public.politiques_recharge
  FOR SELECT TO authenticated
  USING (entreprise_id = public.get_user_entreprise_id(auth.uid()));

-- ===========================================
-- RLS POLICIES: audit_log
-- ===========================================
CREATE POLICY "Superadmin/admin see all audit" ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'superadmin') OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Users see own audit" ON public.audit_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- ===========================================
-- TRIGGER: updated_at
-- ===========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_entreprises_updated_at BEFORE UPDATE ON public.entreprises FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_filiales_updated_at BEFORE UPDATE ON public.filiales FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sites_updated_at BEFORE UPDATE ON public.sites FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicules_updated_at BEFORE UPDATE ON public.vehicules FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_politiques_updated_at BEFORE UPDATE ON public.politiques_recharge FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- TRIGGER: auto-create profile on signup
-- ===========================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nom, prenom, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'prenom', ''),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
