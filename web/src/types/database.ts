// SEMENTARA: ditulis tangan dari supabase/migrations/20261015000100 + 20261015000200
// (+ kolom facilities.sort_order/is_active dari migrasi 0003). Ganti dengan hasil:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.ts
// (jalankan di Git Bash, bukan PowerShell 5.1, supaya file tidak tersimpan UTF-16).

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Timestamps = { created_at: string; updated_at: string };
type TimestampsWrite = { created_at?: string; updated_at?: string };

export type Database = {
  public: {
    Tables: {
      admins: {
        Row: { user_id: string; created_at: string };
        Insert: { user_id: string; created_at?: string };
        Update: { user_id?: string; created_at?: string };
        Relationships: [];
      };
      locations: {
        Row: {
          id: number;
          slug: string;
          name: string;
          tagline: string | null;
          description: string | null;
          address: string | null;
          gmaps_url: string | null;
          hero_image: string | null;
          short_name: string | null;
          area: string | null;
          latitude: number | null;
          longitude: number | null;
          sort_order: number;
          is_active: boolean;
          has_towers: boolean;
        } & Timestamps;
        Insert: {
          id?: number;
          slug: string;
          name: string;
          tagline?: string | null;
          description?: string | null;
          address?: string | null;
          gmaps_url?: string | null;
          hero_image?: string | null;
          short_name?: string | null;
          area?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          sort_order?: number;
          is_active?: boolean;
          has_towers?: boolean;
        } & TimestampsWrite;
        Update: Partial<Database["public"]["Tables"]["locations"]["Insert"]>;
        Relationships: [];
      };
      room_types: {
        Row: {
          id: number;
          location_id: number;
          name: string;
          slug: string;
          category: string;
          default_max_guests: number | null;
          sort_order: number;
          is_active: boolean;
        } & Timestamps;
        Insert: {
          id?: number;
          location_id: number;
          name: string;
          slug: string;
          category?: string;
          default_max_guests?: number | null;
          sort_order?: number;
          is_active?: boolean;
        } & TimestampsWrite;
        Update: Partial<Database["public"]["Tables"]["room_types"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "room_types_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      units: {
        Row: {
          id: number;
          location_id: number;
          name: string;
          slug: string;
          room_type: string | null;
          max_guests: number;
          normal_price: number;
          promo_price: number;
          promo_badge: string | null;
          is_promo_active: boolean;
          rental_period: string;
          description: string | null;
          facilities_list: Json;
          youtube_video_url: string | null;
          main_image: string | null;
          gallery_images: Json;
          is_featured: boolean;
          is_available: boolean;
          room_type_id: number | null;
          tower: string | null;
          floor_number: number | null;
          view_type: string | null;
          size_sqm: number | null;
          weekly_price: number | null;
          monthly_price: number | null;
          is_published: boolean;
          sort_order: number;
          effective_price: number | null;
        } & Timestamps;
        Insert: {
          id?: number;
          location_id: number;
          name: string;
          slug: string;
          room_type?: string | null;
          max_guests?: number;
          normal_price?: number;
          promo_price?: number;
          promo_badge?: string | null;
          is_promo_active?: boolean;
          rental_period?: string;
          description?: string | null;
          facilities_list?: Json;
          youtube_video_url?: string | null;
          main_image?: string | null;
          gallery_images?: Json;
          is_featured?: boolean;
          is_available?: boolean;
          room_type_id?: number | null;
          tower?: string | null;
          floor_number?: number | null;
          view_type?: string | null;
          size_sqm?: number | null;
          weekly_price?: number | null;
          monthly_price?: number | null;
          is_published?: boolean;
          sort_order?: number;
          effective_price?: never;
        } & TimestampsWrite;
        Update: Partial<Database["public"]["Tables"]["units"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "units_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "units_room_type_id_fkey";
            columns: ["room_type_id"];
            isOneToOne: false;
            referencedRelation: "room_types";
            referencedColumns: ["id"];
          },
        ];
      };
      amenities: {
        Row: {
          id: number;
          name: string;
          icon: string;
          sort_order: number;
          is_active: boolean;
        } & Timestamps;
        Insert: {
          id?: number;
          name: string;
          icon?: string;
          sort_order?: number;
          is_active?: boolean;
        } & TimestampsWrite;
        Update: Partial<Database["public"]["Tables"]["amenities"]["Insert"]>;
        Relationships: [];
      };
      unit_amenities: {
        Row: { unit_id: number; amenity_id: number };
        Insert: { unit_id: number; amenity_id: number };
        Update: { unit_id?: number; amenity_id?: number };
        Relationships: [
          {
            foreignKeyName: "unit_amenities_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "unit_amenities_amenity_id_fkey";
            columns: ["amenity_id"];
            isOneToOne: false;
            referencedRelation: "amenities";
            referencedColumns: ["id"];
          },
        ];
      };
      facilities: {
        Row: {
          id: number;
          location_id: number;
          name: string;
          icon: string | null;
          description: string | null;
          image: string | null;
          /** Dari migrasi 0003; bisa undefined sebelum 0003 dijalankan. */
          sort_order: number;
          /** Dari migrasi 0003; bisa undefined sebelum 0003 dijalankan. */
          is_active: boolean;
        } & Timestamps;
        Insert: {
          id?: number;
          location_id: number;
          name: string;
          icon?: string | null;
          description?: string | null;
          image?: string | null;
          sort_order?: number;
          is_active?: boolean;
        } & TimestampsWrite;
        Update: Partial<Database["public"]["Tables"]["facilities"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "facilities_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      landmarks: {
        Row: {
          id: number;
          location_id: number;
          name: string;
          distance_time: string;
          notes: string | null;
          sort_order: number;
          is_active: boolean;
          icon: string | null;
        } & Timestamps;
        Insert: {
          id?: number;
          location_id: number;
          name: string;
          distance_time: string;
          notes?: string | null;
          sort_order?: number;
          is_active?: boolean;
          icon?: string | null;
        } & TimestampsWrite;
        Update: Partial<Database["public"]["Tables"]["landmarks"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "landmarks_location_id_fkey";
            columns: ["location_id"];
            isOneToOne: false;
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
        ];
      };
      faqs: {
        Row: {
          id: number;
          question: string;
          answer: string;
          badge: string | null;
          sort_order: number;
          is_active: boolean;
        } & Timestamps;
        Insert: {
          id?: number;
          question: string;
          answer: string;
          badge?: string | null;
          sort_order?: number;
          is_active?: boolean;
        } & TimestampsWrite;
        Update: Partial<Database["public"]["Tables"]["faqs"]["Insert"]>;
        Relationships: [];
      };
      settings: {
        Row: { id: number; key: string; value: string | null } & Timestamps;
        Insert: { id?: number; key: string; value?: string | null } & TimestampsWrite;
        Update: { id?: number; key?: string; value?: string | null } & TimestampsWrite;
        Relationships: [];
      };
      leads: {
        Row: {
          id: string;
          code: string;
          unit_id: number | null;
          unit_name: string | null;
          location_name: string | null;
          nightly_price: number | null;
          full_name: string;
          whatsapp: string;
          check_in: string;
          check_out: string;
          nights: number | null;
          guests: number;
          purpose: string | null;
          notes: string | null;
          estimated_total: number | null;
          source_path: string | null;
          origin_city: string | null;
          status: string;
          admin_notes: string | null;
        } & Timestamps;
        Insert: {
          id?: string;
          code: string;
          unit_id?: number | null;
          unit_name?: string | null;
          location_name?: string | null;
          nightly_price?: number | null;
          full_name: string;
          whatsapp: string;
          check_in: string;
          check_out: string;
          nights?: never;
          guests: number;
          purpose?: string | null;
          notes?: string | null;
          estimated_total?: number | null;
          source_path?: string | null;
          origin_city?: string | null;
          status?: string;
          admin_notes?: string | null;
        } & TimestampsWrite;
        Update: Partial<Database["public"]["Tables"]["leads"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "leads_unit_id_fkey";
            columns: ["unit_id"];
            isOneToOne: false;
            referencedRelation: "units";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      submit_lead: {
        Args: {
          p_unit_id: number;
          p_full_name: string;
          p_whatsapp: string;
          p_check_in: string;
          p_check_out: string;
          p_guests: number;
          p_purpose?: string | null;
          p_notes?: string | null;
          p_source_path?: string | null;
          p_origin_city?: string | null;
        };
        Returns: Json;
      };
      unit_popularity: {
        Args: { p_days?: number };
        Returns: { unit_id: number; lead_count: number }[];
      };
      backfill_v2: { Args: Record<PropertyKey, never>; Returns: Json };
      sync_id_sequences: { Args: Record<PropertyKey, never>; Returns: undefined };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicSchema = Database["public"];

export type Tables<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> = PublicSchema["Tables"][T]["Update"];
