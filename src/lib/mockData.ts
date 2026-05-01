// Mock data for the front-only ChargiZ demo.
// Realistic dataset: 3 entreprises, ~6 filiales, ~10 sites, ~15 collaborateurs,
// ~12 vehicules, ~30 sessions de recharge.

export const MOCK_ENTREPRISE_ID = "ent-1";
export const MOCK_FILIALE_ID = "fil-1";
export const MOCK_SITE_ID = "site-1";
export const MOCK_USER_ID = "user-superadmin";

const today = new Date();
const daysAgo = (n: number) => new Date(today.getTime() - n * 86400000).toISOString();

export const mockEntreprises = [
  { id: "ent-1", nom: "Enedis Logistics", siren: "552081317", siret: "55208131700045", ville: "Paris", code_postal: "75008", adresse: "12 rue de la Paix", email: "contact@enedis-logistics.fr", telephone: "0140000001", created_at: daysAgo(420) },
  { id: "ent-2", nom: "GreenMobility SA", siren: "812345678", siret: "81234567800012", ville: "Lyon", code_postal: "69002", adresse: "5 cours Charlemagne", email: "hello@greenmob.fr", telephone: "0472000002", created_at: daysAgo(310) },
  { id: "ent-3", nom: "ElectroFleet", siren: "923456789", siret: "92345678900023", ville: "Bordeaux", code_postal: "33000", adresse: "8 quai Louis XVIII", email: "info@electrofleet.fr", telephone: "0556000003", created_at: daysAgo(180) },
];

export const mockFiliales = [
  { id: "fil-1", nom: "Enedis Île-de-France", entreprise_id: "ent-1", ville: "Paris", code_postal: "75008", adresse: "12 rue de la Paix", created_at: daysAgo(400) },
  { id: "fil-2", nom: "Enedis Sud", entreprise_id: "ent-1", ville: "Marseille", code_postal: "13001", adresse: "Quai du Port", created_at: daysAgo(380) },
  { id: "fil-3", nom: "GreenMob Rhône", entreprise_id: "ent-2", ville: "Lyon", code_postal: "69002", adresse: "5 cours Charlemagne", created_at: daysAgo(290) },
  { id: "fil-4", nom: "GreenMob Alpes", entreprise_id: "ent-2", ville: "Grenoble", code_postal: "38000", adresse: "Place Victor Hugo", created_at: daysAgo(260) },
  { id: "fil-5", nom: "ElectroFleet Aquitaine", entreprise_id: "ent-3", ville: "Bordeaux", code_postal: "33000", adresse: "8 quai Louis XVIII", created_at: daysAgo(150) },
];

export const mockSites = [
  { id: "site-1", nom: "Siège Paris", filiale_id: "fil-1", entreprise_id: "ent-1", ville: "Paris", code_postal: "75008", adresse: "12 rue de la Paix", nb_bornes: 8, created_at: daysAgo(395) },
  { id: "site-2", nom: "Dépôt Bobigny", filiale_id: "fil-1", entreprise_id: "ent-1", ville: "Bobigny", code_postal: "93000", adresse: "ZAC des Vignes", nb_bornes: 12, created_at: daysAgo(380) },
  { id: "site-3", nom: "Agence Marseille", filiale_id: "fil-2", entreprise_id: "ent-1", ville: "Marseille", code_postal: "13001", adresse: "Quai du Port", nb_bornes: 6, created_at: daysAgo(370) },
  { id: "site-4", nom: "Hub Lyon Confluence", filiale_id: "fil-3", entreprise_id: "ent-2", ville: "Lyon", code_postal: "69002", adresse: "5 cours Charlemagne", nb_bornes: 10, created_at: daysAgo(285) },
  { id: "site-5", nom: "Atelier Villeurbanne", filiale_id: "fil-3", entreprise_id: "ent-2", ville: "Villeurbanne", code_postal: "69100", adresse: "12 rue Jean Jaurès", nb_bornes: 4, created_at: daysAgo(270) },
  { id: "site-6", nom: "Plateforme Grenoble", filiale_id: "fil-4", entreprise_id: "ent-2", ville: "Grenoble", code_postal: "38000", adresse: "Place Victor Hugo", nb_bornes: 5, created_at: daysAgo(255) },
  { id: "site-7", nom: "Centre Bordeaux", filiale_id: "fil-5", entreprise_id: "ent-3", ville: "Bordeaux", code_postal: "33000", adresse: "8 quai Louis XVIII", nb_bornes: 7, created_at: daysAgo(140) },
];

export const mockCollaborateurs = [
  { id: "col-1", user_id: "u-1", nom: "Martin", prenom: "Sophie", email: "sophie.martin@enedis.fr", telephone: "0612345678", role: "collaborateur", entreprise_id: "ent-1", filiale_id: "fil-1", site_id: "site-1", is_active: true, cout_kwh_domicile: 0.2516, jours_suivi: ["lundi","mardi","mercredi","jeudi","vendredi"], horaires_suivi: { debut: "08:30", fin: "18:00" }, jours_conge: [], adresse: "10 rue Lafayette", code_postal: "75009", ville: "Paris", pays: "France", created_at: daysAgo(300) },
  { id: "col-2", user_id: "u-2", nom: "Dubois", prenom: "Lucas", email: "lucas.dubois@enedis.fr", telephone: "0623456789", role: "collaborateur", entreprise_id: "ent-1", filiale_id: "fil-1", site_id: "site-2", is_active: true, cout_kwh_domicile: 0.2228, jours_suivi: ["lundi","mardi","mercredi","jeudi","vendredi"], horaires_suivi: { debut: "07:00", fin: "16:00" }, jours_conge: [], adresse: "5 av. de la République", code_postal: "93000", ville: "Bobigny", pays: "France", created_at: daysAgo(280) },
  { id: "col-3", user_id: "u-3", nom: "Bernard", prenom: "Emma", email: "emma.bernard@enedis.fr", telephone: "0634567890", role: "gestionnaire_site", entreprise_id: "ent-1", filiale_id: "fil-2", site_id: "site-3", is_active: true, cout_kwh_domicile: 0.2516, jours_suivi: ["lundi","mardi","mercredi","jeudi","vendredi"], horaires_suivi: {}, jours_conge: [], adresse: "20 La Canebière", code_postal: "13001", ville: "Marseille", pays: "France", created_at: daysAgo(260) },
  { id: "col-4", user_id: "u-4", nom: "Petit", prenom: "Hugo", email: "hugo.petit@enedis.fr", telephone: "0645678901", role: "collaborateur", entreprise_id: "ent-1", filiale_id: "fil-2", site_id: "site-3", is_active: true, cout_kwh_domicile: 0.2228, jours_suivi: ["lundi","mardi","mercredi","jeudi","vendredi"], horaires_suivi: {}, jours_conge: [], adresse: "3 rue Paradis", code_postal: "13001", ville: "Marseille", pays: "France", created_at: daysAgo(240) },
  { id: "col-5", user_id: "u-5", nom: "Moreau", prenom: "Léa", email: "lea.moreau@greenmob.fr", telephone: "0656789012", role: "collaborateur", entreprise_id: "ent-2", filiale_id: "fil-3", site_id: "site-4", is_active: true, cout_kwh_domicile: 0.2516, jours_suivi: ["lundi","mardi","mercredi","jeudi","vendredi"], horaires_suivi: {}, jours_conge: [], adresse: "15 quai Perrache", code_postal: "69002", ville: "Lyon", pays: "France", created_at: daysAgo(220) },
  { id: "col-6", user_id: "u-6", nom: "Laurent", prenom: "Nathan", email: "nathan.laurent@greenmob.fr", telephone: "0667890123", role: "gestionnaire_filiale", entreprise_id: "ent-2", filiale_id: "fil-3", site_id: "site-5", is_active: true, cout_kwh_domicile: 0.2228, jours_suivi: ["lundi","mardi","mercredi","jeudi","vendredi"], horaires_suivi: {}, jours_conge: [], adresse: "8 rue Garibaldi", code_postal: "69003", ville: "Lyon", pays: "France", created_at: daysAgo(210) },
  { id: "col-7", user_id: "u-7", nom: "Simon", prenom: "Chloé", email: "chloe.simon@greenmob.fr", telephone: "0678901234", role: "collaborateur", entreprise_id: "ent-2", filiale_id: "fil-4", site_id: "site-6", is_active: true, cout_kwh_domicile: 0.2516, jours_suivi: ["lundi","mardi","mercredi","jeudi","vendredi"], horaires_suivi: {}, jours_conge: [], adresse: "2 place Victor Hugo", code_postal: "38000", ville: "Grenoble", pays: "France", created_at: daysAgo(200) },
  { id: "col-8", user_id: "u-8", nom: "Garcia", prenom: "Manon", email: "manon.garcia@electrofleet.fr", telephone: "0689012345", role: "gestionnaire_entreprise", entreprise_id: "ent-3", filiale_id: "fil-5", site_id: "site-7", is_active: true, cout_kwh_domicile: 0.2228, jours_suivi: ["lundi","mardi","mercredi","jeudi","vendredi"], horaires_suivi: {}, jours_conge: [], adresse: "12 cours de l'Intendance", code_postal: "33000", ville: "Bordeaux", pays: "France", created_at: daysAgo(150) },
  { id: "col-9", user_id: "u-9", nom: "Roux", prenom: "Jules", email: "jules.roux@electrofleet.fr", telephone: "0690123456", role: "collaborateur", entreprise_id: "ent-3", filiale_id: "fil-5", site_id: "site-7", is_active: true, cout_kwh_domicile: 0.2516, jours_suivi: ["lundi","mardi","mercredi","jeudi","vendredi"], horaires_suivi: {}, jours_conge: [], adresse: "5 rue Sainte-Catherine", code_postal: "33000", ville: "Bordeaux", pays: "France", created_at: daysAgo(120) },
  { id: "col-10", user_id: "u-10", nom: "Vincent", prenom: "Camille", email: "camille.vincent@enedis.fr", telephone: "0601234567", role: "collaborateur", entreprise_id: "ent-1", filiale_id: "fil-1", site_id: "site-1", is_active: false, cout_kwh_domicile: 0.2228, jours_suivi: [], horaires_suivi: {}, jours_conge: [], adresse: "8 bd Haussmann", code_postal: "75008", ville: "Paris", pays: "France", created_at: daysAgo(450) },
];

export const mockAdmins = [
  { id: "adm-1", user_id: "ua-1", nom: "Admin", prenom: "Pierre", email: "pierre.admin@chargiz.fr", role: "admin", entreprise_id: null, filiale_id: null, site_id: null, is_active: true, telephone: "0100000001", created_at: daysAgo(500) },
  { id: "adm-2", user_id: "ua-2", nom: "Super", prenom: "Marie", email: "marie.super@chargiz.fr", role: "superadmin", entreprise_id: null, filiale_id: null, site_id: null, is_active: true, telephone: "0100000002", created_at: daysAgo(600) },
];

export const mockVehicules = [
  { id: "veh-1", marque: "Renault", modele: "Megane E-Tech", immatriculation: "AA-001-AA", capacite_batterie_kwh: 60, autonomie_km: 470, collaborateur_id: "col-1", entreprise_id: "ent-1", filiale_id: "fil-1", site_id: "site-1", smartcar_connected: true, kilometrage: 12500, created_at: daysAgo(280) },
  { id: "veh-2", marque: "Tesla", modele: "Model 3", immatriculation: "BB-002-BB", capacite_batterie_kwh: 75, autonomie_km: 580, collaborateur_id: "col-2", entreprise_id: "ent-1", filiale_id: "fil-1", site_id: "site-2", smartcar_connected: true, kilometrage: 24300, created_at: daysAgo(260) },
  { id: "veh-3", marque: "Peugeot", modele: "e-208", immatriculation: "CC-003-CC", capacite_batterie_kwh: 50, autonomie_km: 340, collaborateur_id: "col-3", entreprise_id: "ent-1", filiale_id: "fil-2", site_id: "site-3", smartcar_connected: false, kilometrage: 8900, created_at: daysAgo(240) },
  { id: "veh-4", marque: "Hyundai", modele: "Kona Electric", immatriculation: "DD-004-DD", capacite_batterie_kwh: 64, autonomie_km: 484, collaborateur_id: "col-4", entreprise_id: "ent-1", filiale_id: "fil-2", site_id: "site-3", smartcar_connected: true, kilometrage: 15600, created_at: daysAgo(230) },
  { id: "veh-5", marque: "Volkswagen", modele: "ID.3", immatriculation: "EE-005-EE", capacite_batterie_kwh: 58, autonomie_km: 425, collaborateur_id: "col-5", entreprise_id: "ent-2", filiale_id: "fil-3", site_id: "site-4", smartcar_connected: true, kilometrage: 19200, created_at: daysAgo(210) },
  { id: "veh-6", marque: "Kia", modele: "EV6", immatriculation: "FF-006-FF", capacite_batterie_kwh: 77, autonomie_km: 528, collaborateur_id: "col-6", entreprise_id: "ent-2", filiale_id: "fil-3", site_id: "site-5", smartcar_connected: true, kilometrage: 22100, created_at: daysAgo(200) },
  { id: "veh-7", marque: "BMW", modele: "iX3", immatriculation: "GG-007-GG", capacite_batterie_kwh: 80, autonomie_km: 460, collaborateur_id: "col-7", entreprise_id: "ent-2", filiale_id: "fil-4", site_id: "site-6", smartcar_connected: false, kilometrage: 11400, created_at: daysAgo(190) },
  { id: "veh-8", marque: "Renault", modele: "Zoe", immatriculation: "HH-008-HH", capacite_batterie_kwh: 52, autonomie_km: 395, collaborateur_id: "col-8", entreprise_id: "ent-3", filiale_id: "fil-5", site_id: "site-7", smartcar_connected: true, kilometrage: 17800, created_at: daysAgo(140) },
  { id: "veh-9", marque: "Tesla", modele: "Model Y", immatriculation: "II-009-II", capacite_batterie_kwh: 75, autonomie_km: 533, collaborateur_id: "col-9", entreprise_id: "ent-3", filiale_id: "fil-5", site_id: "site-7", smartcar_connected: true, kilometrage: 9300, created_at: daysAgo(110) },
  { id: "veh-10", marque: "Citroën", modele: "ë-C4", immatriculation: "JJ-010-JJ", capacite_batterie_kwh: 50, autonomie_km: 357, collaborateur_id: null, entreprise_id: "ent-1", filiale_id: "fil-1", site_id: "site-1", smartcar_connected: false, kilometrage: 5200, created_at: daysAgo(90) },
];

function makeSession(id: string, day: number, collab: typeof mockCollaborateurs[number], energie: number, isDom: boolean, km: number) {
  const veh = mockVehicules.find(v => v.collaborateur_id === collab.id);
  const cout = +(energie * (isDom ? (collab.cout_kwh_domicile || 0.25) : 0.45)).toFixed(2);
  return {
    id, date_debut: daysAgo(day), date_fin: daysAgo(day),
    energie_kwh: energie, cout_euro: cout, is_domicile: isDom,
    kilometrage: km, co2_evite: +(km * 0.146).toFixed(2),
    collaborateur_id: collab.id, vehicule_id: veh?.id || null,
    entreprise_id: collab.entreprise_id, filiale_id: collab.filiale_id, site_id: collab.site_id,
  };
}

export const mockSessions = [
  makeSession("sess-1", 1, mockCollaborateurs[0], 32.5, true, 145),
  makeSession("sess-2", 2, mockCollaborateurs[0], 18.2, false, 78),
  makeSession("sess-3", 3, mockCollaborateurs[1], 45.8, true, 210),
  makeSession("sess-4", 4, mockCollaborateurs[1], 22.1, false, 95),
  makeSession("sess-5", 5, mockCollaborateurs[2], 28.3, true, 130),
  makeSession("sess-6", 6, mockCollaborateurs[3], 35.7, true, 165),
  makeSession("sess-7", 7, mockCollaborateurs[4], 41.2, true, 190),
  makeSession("sess-8", 8, mockCollaborateurs[4], 19.5, false, 82),
  makeSession("sess-9", 9, mockCollaborateurs[5], 52.3, true, 240),
  makeSession("sess-10", 10, mockCollaborateurs[6], 30.1, true, 138),
  makeSession("sess-11", 11, mockCollaborateurs[7], 38.9, true, 178),
  makeSession("sess-12", 12, mockCollaborateurs[8], 25.4, true, 116),
  makeSession("sess-13", 14, mockCollaborateurs[0], 29.8, true, 136),
  makeSession("sess-14", 15, mockCollaborateurs[1], 33.6, true, 154),
  makeSession("sess-15", 16, mockCollaborateurs[4], 27.9, false, 121),
  makeSession("sess-16", 18, mockCollaborateurs[5], 44.2, true, 203),
  makeSession("sess-17", 20, mockCollaborateurs[6], 36.5, true, 168),
  makeSession("sess-18", 22, mockCollaborateurs[7], 31.8, true, 146),
  makeSession("sess-19", 24, mockCollaborateurs[8], 23.7, false, 102),
  makeSession("sess-20", 26, mockCollaborateurs[0], 40.1, true, 184),
  makeSession("sess-21", 28, mockCollaborateurs[1], 28.6, true, 131),
  makeSession("sess-22", 30, mockCollaborateurs[4], 35.4, true, 162),
  makeSession("sess-23", 32, mockCollaborateurs[5], 21.9, false, 94),
  makeSession("sess-24", 35, mockCollaborateurs[6], 39.7, true, 182),
  makeSession("sess-25", 38, mockCollaborateurs[7], 26.3, true, 121),
  makeSession("sess-26", 40, mockCollaborateurs[8], 33.1, true, 152),
  makeSession("sess-27", 42, mockCollaborateurs[0], 30.4, true, 139),
  makeSession("sess-28", 45, mockCollaborateurs[1], 42.6, true, 195),
  makeSession("sess-29", 48, mockCollaborateurs[4], 24.8, false, 107),
  makeSession("sess-30", 50, mockCollaborateurs[5], 37.2, true, 171),
];

export const tableMap: Record<string, any[]> = {
  entreprises: mockEntreprises,
  filiales: mockFiliales,
  sites: mockSites,
  profiles: mockCollaborateurs,
  collaborateurs: mockCollaborateurs,
  admins: mockAdmins,
  user_roles: mockCollaborateurs.map(c => ({ user_id: c.user_id, role: c.role })),
  vehicules: mockVehicules,
  sessions_recharge: mockSessions,
  justificatifs: [],
};
