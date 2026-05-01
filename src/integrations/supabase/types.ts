export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entite: string
          entite_id: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entite: string
          entite_id?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entite?: string
          entite_id?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      entreprises: {
        Row: {
          adresse: string | null
          code_postal: string | null
          created_at: string
          email: string | null
          id: string
          nom: string
          numero_tva: string | null
          pays: string | null
          prix_kwh_defaut: number | null
          siren: string | null
          siret: string | null
          telephone: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          code_postal?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom: string
          numero_tva?: string | null
          pays?: string | null
          prix_kwh_defaut?: number | null
          siren?: string | null
          siret?: string | null
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          code_postal?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nom?: string
          numero_tva?: string | null
          pays?: string | null
          prix_kwh_defaut?: number | null
          siren?: string | null
          siret?: string | null
          telephone?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: []
      }
      filiales: {
        Row: {
          adresse: string | null
          code_postal: string | null
          created_at: string
          entreprise_id: string
          id: string
          nom: string
          numero_tva: string | null
          pays: string | null
          responsable_email: string | null
          responsable_nom: string | null
          responsable_prenom: string | null
          responsable_telephone: string | null
          siret: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          code_postal?: string | null
          created_at?: string
          entreprise_id: string
          id?: string
          nom: string
          numero_tva?: string | null
          pays?: string | null
          responsable_email?: string | null
          responsable_nom?: string | null
          responsable_prenom?: string | null
          responsable_telephone?: string | null
          siret?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          code_postal?: string | null
          created_at?: string
          entreprise_id?: string
          id?: string
          nom?: string
          numero_tva?: string | null
          pays?: string | null
          responsable_email?: string | null
          responsable_nom?: string | null
          responsable_prenom?: string | null
          responsable_telephone?: string | null
          siret?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "filiales_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
        ]
      }
      politiques_recharge: {
        Row: {
          collaborateur_id: string | null
          conges_non_rembourses: boolean | null
          created_at: string
          entreprise_id: string | null
          fermetures: Json | null
          filiale_id: string | null
          horaires_debut: string | null
          horaires_fin: string | null
          id: string
          jours_autorises: Json | null
          prix_kwh: number
          site_id: string | null
          updated_at: string
        }
        Insert: {
          collaborateur_id?: string | null
          conges_non_rembourses?: boolean | null
          created_at?: string
          entreprise_id?: string | null
          fermetures?: Json | null
          filiale_id?: string | null
          horaires_debut?: string | null
          horaires_fin?: string | null
          id?: string
          jours_autorises?: Json | null
          prix_kwh?: number
          site_id?: string | null
          updated_at?: string
        }
        Update: {
          collaborateur_id?: string | null
          conges_non_rembourses?: boolean | null
          created_at?: string
          entreprise_id?: string | null
          fermetures?: Json | null
          filiale_id?: string | null
          horaires_debut?: string | null
          horaires_fin?: string | null
          id?: string
          jours_autorises?: Json | null
          prix_kwh?: number
          site_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "politiques_recharge_collaborateur_id_fkey"
            columns: ["collaborateur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "politiques_recharge_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "politiques_recharge_filiale_id_fkey"
            columns: ["filiale_id"]
            isOneToOne: false
            referencedRelation: "filiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "politiques_recharge_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          adresse: string | null
          code_postal: string | null
          cout_kwh_domicile: number | null
          created_at: string
          email: string
          entreprise_id: string | null
          filiale_id: string | null
          horaires_suivi: Json | null
          id: string
          is_active: boolean
          jours_conge: Json | null
          jours_suivi: Json | null
          nom: string
          pays: string | null
          prenom: string
          site_id: string | null
          telephone: string | null
          updated_at: string
          user_id: string | null
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          code_postal?: string | null
          cout_kwh_domicile?: number | null
          created_at?: string
          email: string
          entreprise_id?: string | null
          filiale_id?: string | null
          horaires_suivi?: Json | null
          id?: string
          is_active?: boolean
          jours_conge?: Json | null
          jours_suivi?: Json | null
          nom: string
          pays?: string | null
          prenom: string
          site_id?: string | null
          telephone?: string | null
          updated_at?: string
          user_id?: string | null
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          code_postal?: string | null
          cout_kwh_domicile?: number | null
          created_at?: string
          email?: string
          entreprise_id?: string | null
          filiale_id?: string | null
          horaires_suivi?: Json | null
          id?: string
          is_active?: boolean
          jours_conge?: Json | null
          jours_suivi?: Json | null
          nom?: string
          pays?: string | null
          prenom?: string
          site_id?: string | null
          telephone?: string | null
          updated_at?: string
          user_id?: string | null
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_filiale_id_fkey"
            columns: ["filiale_id"]
            isOneToOne: false
            referencedRelation: "filiales"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions_recharge: {
        Row: {
          co2_evite: number | null
          collaborateur_id: string
          cout_euro: number | null
          created_at: string
          date_debut: string | null
          date_fin: string | null
          energie_kwh: number | null
          entreprise_id: string
          id: string
          is_domicile: boolean | null
          jour_semaine: string | null
          kilometrage: number | null
          latitude: number | null
          longitude: number | null
          soc_debut: number | null
          soc_fin: number | null
          vehicule_id: string
        }
        Insert: {
          co2_evite?: number | null
          collaborateur_id: string
          cout_euro?: number | null
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          energie_kwh?: number | null
          entreprise_id: string
          id?: string
          is_domicile?: boolean | null
          jour_semaine?: string | null
          kilometrage?: number | null
          latitude?: number | null
          longitude?: number | null
          soc_debut?: number | null
          soc_fin?: number | null
          vehicule_id: string
        }
        Update: {
          co2_evite?: number | null
          collaborateur_id?: string
          cout_euro?: number | null
          created_at?: string
          date_debut?: string | null
          date_fin?: string | null
          energie_kwh?: number | null
          entreprise_id?: string
          id?: string
          is_domicile?: boolean | null
          jour_semaine?: string | null
          kilometrage?: number | null
          latitude?: number | null
          longitude?: number | null
          soc_debut?: number | null
          soc_fin?: number | null
          vehicule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_recharge_collaborateur_id_fkey"
            columns: ["collaborateur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_recharge_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sessions_recharge_vehicule_id_fkey"
            columns: ["vehicule_id"]
            isOneToOne: false
            referencedRelation: "vehicules"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          adresse: string | null
          code_postal: string | null
          created_at: string
          filiale_id: string
          id: string
          nom: string
          pays: string | null
          responsable_email: string | null
          responsable_nom: string | null
          responsable_prenom: string | null
          responsable_telephone: string | null
          siret: string | null
          updated_at: string
          ville: string | null
        }
        Insert: {
          adresse?: string | null
          code_postal?: string | null
          created_at?: string
          filiale_id: string
          id?: string
          nom: string
          pays?: string | null
          responsable_email?: string | null
          responsable_nom?: string | null
          responsable_prenom?: string | null
          responsable_telephone?: string | null
          siret?: string | null
          updated_at?: string
          ville?: string | null
        }
        Update: {
          adresse?: string | null
          code_postal?: string | null
          created_at?: string
          filiale_id?: string
          id?: string
          nom?: string
          pays?: string | null
          responsable_email?: string | null
          responsable_nom?: string | null
          responsable_prenom?: string | null
          responsable_telephone?: string | null
          siret?: string | null
          updated_at?: string
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sites_filiale_id_fkey"
            columns: ["filiale_id"]
            isOneToOne: false
            referencedRelation: "filiales"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vehicules: {
        Row: {
          capacite_batterie: number | null
          collaborateur_id: string | null
          created_at: string
          entreprise_id: string
          id: string
          immatriculation: string | null
          marque: string | null
          modele: string | null
          smartcar_vehicle_id: string | null
          statut_affectation: string | null
          statut_smartcar: string | null
          updated_at: string
          vin: string | null
        }
        Insert: {
          capacite_batterie?: number | null
          collaborateur_id?: string | null
          created_at?: string
          entreprise_id: string
          id?: string
          immatriculation?: string | null
          marque?: string | null
          modele?: string | null
          smartcar_vehicle_id?: string | null
          statut_affectation?: string | null
          statut_smartcar?: string | null
          updated_at?: string
          vin?: string | null
        }
        Update: {
          capacite_batterie?: number | null
          collaborateur_id?: string | null
          created_at?: string
          entreprise_id?: string
          id?: string
          immatriculation?: string | null
          marque?: string | null
          modele?: string | null
          smartcar_vehicle_id?: string | null
          statut_affectation?: string | null
          statut_smartcar?: string | null
          updated_at?: string
          vin?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vehicules_collaborateur_id_fkey"
            columns: ["collaborateur_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicules_entreprise_id_fkey"
            columns: ["entreprise_id"]
            isOneToOne: false
            referencedRelation: "entreprises"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_entreprise_id: { Args: { _user_id: string }; Returns: string }
      get_user_filiale_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_site_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "superadmin"
        | "admin"
        | "gestionnaire_entreprise"
        | "gestionnaire_filiale"
        | "gestionnaire_site"
        | "collaborateur"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "superadmin",
        "admin",
        "gestionnaire_entreprise",
        "gestionnaire_filiale",
        "gestionnaire_site",
        "collaborateur",
      ],
    },
  },
} as const
