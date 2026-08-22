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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ad_platform_connections: {
        Row: {
          account_id: string | null
          account_name: string | null
          brand_id: string | null
          created_at: string | null
          encrypted_access_token: string | null
          encrypted_refresh_token: string | null
          id: string
          is_active: boolean | null
          last_sync_at: string | null
          platform: string
          scopes: string[] | null
          sync_error: string | null
          sync_status: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          account_id?: string | null
          account_name?: string | null
          brand_id?: string | null
          created_at?: string | null
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          platform: string
          scopes?: string[] | null
          sync_error?: string | null
          sync_status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          account_id?: string | null
          account_name?: string | null
          brand_id?: string | null
          created_at?: string | null
          encrypted_access_token?: string | null
          encrypted_refresh_token?: string | null
          id?: string
          is_active?: boolean | null
          last_sync_at?: string | null
          platform?: string
          scopes?: string[] | null
          sync_error?: string | null
          sync_status?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_platform_connections_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_actions: {
        Row: {
          action_type: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      admin_notifications: {
        Row: {
          action_label: string | null
          action_url: string | null
          created_at: string | null
          created_by: string
          id: string
          image_url: string | null
          message: string
          target_type: string
          target_user_id: string | null
          title: string
        }
        Insert: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          created_by: string
          id?: string
          image_url?: string | null
          message: string
          target_type: string
          target_user_id?: string | null
          title: string
        }
        Update: {
          action_label?: string | null
          action_url?: string | null
          created_at?: string | null
          created_by?: string
          id?: string
          image_url?: string | null
          message?: string
          target_type?: string
          target_user_id?: string | null
          title?: string
        }
        Relationships: []
      }
      admin_user_segments: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          filter_criteria: Json
          id: string
          name: string
          updated_at: string | null
          user_count: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filter_criteria?: Json
          id?: string
          name: string
          updated_at?: string | null
          user_count?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          filter_criteria?: Json
          id?: string
          name?: string
          updated_at?: string | null
          user_count?: number | null
        }
        Relationships: []
      }
      agency_profiles: {
        Row: {
          agency_name: string
          availability: string | null
          case_studies: Json | null
          completion_state: string | null
          country: string | null
          created_at: string
          currency: string | null
          domains: string[] | null
          hourly_blended_rate: number | null
          id: string
          logo_url: string | null
          min_engagement_usd: number | null
          team_size: number | null
          tools: string[] | null
          updated_at: string
          user_id: string
          vetting_status: string
          website_url: string | null
        }
        Insert: {
          agency_name?: string
          availability?: string | null
          case_studies?: Json | null
          completion_state?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          domains?: string[] | null
          hourly_blended_rate?: number | null
          id?: string
          logo_url?: string | null
          min_engagement_usd?: number | null
          team_size?: number | null
          tools?: string[] | null
          updated_at?: string
          user_id: string
          vetting_status?: string
          website_url?: string | null
        }
        Update: {
          agency_name?: string
          availability?: string | null
          case_studies?: Json | null
          completion_state?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          domains?: string[] | null
          hourly_blended_rate?: number | null
          id?: string
          logo_url?: string | null
          min_engagement_usd?: number | null
          team_size?: number | null
          tools?: string[] | null
          updated_at?: string
          user_id?: string
          vetting_status?: string
          website_url?: string | null
        }
        Relationships: []
      }
      ai_training_materials: {
        Row: {
          content_text: string | null
          content_url: string | null
          created_at: string
          created_by: string
          description: string | null
          error_message: string | null
          extracted_knowledge: Json | null
          id: string
          material_type: string
          processed_at: string | null
          processing_status: string | null
          target_agents: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          content_text?: string | null
          content_url?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          error_message?: string | null
          extracted_knowledge?: Json | null
          id?: string
          material_type: string
          processed_at?: string | null
          processing_status?: string | null
          target_agents?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          content_text?: string | null
          content_url?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          error_message?: string | null
          extracted_knowledge?: Json | null
          id?: string
          material_type?: string
          processed_at?: string | null
          processing_status?: string | null
          target_agents?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      ai_training_sessions: {
        Row: {
          agent_type: string
          created_at: string
          id: string
          material_id: string | null
          training_result: Json | null
        }
        Insert: {
          agent_type: string
          created_at?: string
          id?: string
          material_id?: string | null
          training_result?: Json | null
        }
        Update: {
          agent_type?: string
          created_at?: string
          id?: string
          material_id?: string | null
          training_result?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_training_sessions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "ai_training_materials"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_popup_views: {
        Row: {
          cta_clicked: boolean
          dismissed: boolean
          id: string
          popup_id: string
          seen_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cta_clicked?: boolean
          dismissed?: boolean
          id?: string
          popup_id: string
          seen_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cta_clicked?: boolean
          dismissed?: boolean
          id?: string
          popup_id?: string
          seen_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_popup_views_popup_id_fkey"
            columns: ["popup_id"]
            isOneToOne: false
            referencedRelation: "announcement_popups"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_popups: {
        Row: {
          audience: Json
          body: string | null
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          dismissible: boolean
          ends_at: string | null
          frequency: string
          id: string
          image_url: string | null
          is_active: boolean
          pages: string[]
          priority: number
          secondary_image_url: string | null
          starts_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: Json
          body?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          dismissible?: boolean
          ends_at?: string | null
          frequency?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          pages?: string[]
          priority?: number
          secondary_image_url?: string | null
          starts_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          audience?: Json
          body?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          dismissible?: boolean
          ends_at?: string | null
          frequency?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          pages?: string[]
          priority?: number
          secondary_image_url?: string | null
          starts_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_tour_steps: {
        Row: {
          created_at: string | null
          cta_action: string | null
          cta_text: string | null
          description: string
          id: string
          media_url: string | null
          navigate_to: string | null
          step_order: number
          title: string
          tour_id: string | null
          ui_target_selector: string | null
        }
        Insert: {
          created_at?: string | null
          cta_action?: string | null
          cta_text?: string | null
          description: string
          id?: string
          media_url?: string | null
          navigate_to?: string | null
          step_order: number
          title: string
          tour_id?: string | null
          ui_target_selector?: string | null
        }
        Update: {
          created_at?: string | null
          cta_action?: string | null
          cta_text?: string | null
          description?: string
          id?: string
          media_url?: string | null
          navigate_to?: string | null
          step_order?: number
          title?: string
          tour_id?: string | null
          ui_target_selector?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "app_tour_steps_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "app_tours"
            referencedColumns: ["id"]
          },
        ]
      }
      app_tours: {
        Row: {
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          priority: number | null
          target_page: string | null
          target_plan_types: string[] | null
          target_user_cohorts: string[] | null
          trigger_feature: string | null
          trigger_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          priority?: number | null
          target_page?: string | null
          target_plan_types?: string[] | null
          target_user_cohorts?: string[] | null
          trigger_feature?: string | null
          trigger_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          priority?: number | null
          target_page?: string | null
          target_plan_types?: string[] | null
          target_user_cohorts?: string[] | null
          trigger_feature?: string | null
          trigger_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      artboards: {
        Row: {
          brand_system: Json | null
          content: Json | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          height: number
          id: string
          image_url: string | null
          position_x: number
          position_y: number
          project_id: string
          title: string
          updated_at: string
          user_id: string
          width: number
        }
        Insert: {
          brand_system?: Json | null
          content?: Json | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          height?: number
          id?: string
          image_url?: string | null
          position_x?: number
          position_y?: number
          project_id: string
          title?: string
          updated_at?: string
          user_id: string
          width?: number
        }
        Update: {
          brand_system?: Json | null
          content?: Json | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          height?: number
          id?: string
          image_url?: string | null
          position_x?: number
          position_y?: number
          project_id?: string
          title?: string
          updated_at?: string
          user_id?: string
          width?: number
        }
        Relationships: [
          {
            foreignKeyName: "artboards_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_exports: {
        Row: {
          asset_id: string
          created_at: string | null
          export_metadata: Json | null
          exported_from: string
          exported_to: string
          id: string
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          export_metadata?: Json | null
          exported_from: string
          exported_to: string
          id?: string
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          export_metadata?: Json | null
          exported_from?: string
          exported_to?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "asset_exports_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "design_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      asset_references: {
        Row: {
          asset_id: string
          created_at: string | null
          id: string
          referenced_in_id: string
          referenced_in_type: string
          usage_context: Json | null
        }
        Insert: {
          asset_id: string
          created_at?: string | null
          id?: string
          referenced_in_id: string
          referenced_in_type: string
          usage_context?: Json | null
        }
        Update: {
          asset_id?: string
          created_at?: string | null
          id?: string
          referenced_in_id?: string
          referenced_in_type?: string
          usage_context?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "asset_references_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "design_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_assets: {
        Row: {
          asset_category: string | null
          asset_type: string
          block_id: string | null
          brand_id: string
          color_palette: Json | null
          created_at: string | null
          duration: number | null
          file_name: string
          file_path: string
          file_size: number
          height: number | null
          id: string
          mime_type: string
          section_id: string | null
          semantic_tags: string[] | null
          signed_url: string | null
          signed_url_expires_at: string | null
          storage_url: string
          updated_at: string | null
          usage_context: string | null
          user_id: string
          width: number | null
        }
        Insert: {
          asset_category?: string | null
          asset_type: string
          block_id?: string | null
          brand_id: string
          color_palette?: Json | null
          created_at?: string | null
          duration?: number | null
          file_name: string
          file_path: string
          file_size: number
          height?: number | null
          id?: string
          mime_type: string
          section_id?: string | null
          semantic_tags?: string[] | null
          signed_url?: string | null
          signed_url_expires_at?: string | null
          storage_url: string
          updated_at?: string | null
          usage_context?: string | null
          user_id: string
          width?: number | null
        }
        Update: {
          asset_category?: string | null
          asset_type?: string
          block_id?: string | null
          brand_id?: string
          color_palette?: Json | null
          created_at?: string | null
          duration?: number | null
          file_name?: string
          file_path?: string
          file_size?: number
          height?: number | null
          id?: string
          mime_type?: string
          section_id?: string | null
          semantic_tags?: string[] | null
          signed_url?: string | null
          signed_url_expires_at?: string | null
          storage_url?: string
          updated_at?: string | null
          usage_context?: string | null
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_assets_block_id_fkey"
            columns: ["block_id"]
            isOneToOne: false
            referencedRelation: "brand_content_blocks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_assets_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_assets_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "brand_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_cognition_memory: {
        Row: {
          brand_id: string | null
          campaign_style_clusters: Json | null
          channel_style_variations: Json | null
          color_relationship_vectors: Json | null
          confidence_score: number | null
          created_at: string | null
          design_risk_tolerance: number | null
          emotional_tone_mapping: Json | null
          id: string
          last_updated_at: string | null
          layout_density_patterns: Json | null
          total_designs_analyzed: number | null
          typography_usage: Json | null
          updated_at: string | null
          user_id: string
          visual_patterns: Json | null
        }
        Insert: {
          brand_id?: string | null
          campaign_style_clusters?: Json | null
          channel_style_variations?: Json | null
          color_relationship_vectors?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          design_risk_tolerance?: number | null
          emotional_tone_mapping?: Json | null
          id?: string
          last_updated_at?: string | null
          layout_density_patterns?: Json | null
          total_designs_analyzed?: number | null
          typography_usage?: Json | null
          updated_at?: string | null
          user_id: string
          visual_patterns?: Json | null
        }
        Update: {
          brand_id?: string | null
          campaign_style_clusters?: Json | null
          channel_style_variations?: Json | null
          color_relationship_vectors?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          design_risk_tolerance?: number | null
          emotional_tone_mapping?: Json | null
          id?: string
          last_updated_at?: string | null
          layout_density_patterns?: Json | null
          total_designs_analyzed?: number | null
          typography_usage?: Json | null
          updated_at?: string | null
          user_id?: string
          visual_patterns?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_cognition_memory_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_content_blocks: {
        Row: {
          ai_metadata: Json | null
          block_type: string
          content: Json
          created_at: string | null
          display_order: number
          font_file_path: string | null
          id: string
          section_id: string
          updated_at: string | null
        }
        Insert: {
          ai_metadata?: Json | null
          block_type: string
          content?: Json
          created_at?: string | null
          display_order?: number
          font_file_path?: string | null
          id?: string
          section_id: string
          updated_at?: string | null
        }
        Update: {
          ai_metadata?: Json | null
          block_type?: string
          content?: Json
          created_at?: string | null
          display_order?: number
          font_file_path?: string | null
          id?: string
          section_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_content_blocks_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "brand_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_design_events: {
        Row: {
          brand_id: string | null
          campaign_id: string | null
          channel: string | null
          created_at: string | null
          design_snapshot: Json | null
          event_type: string
          id: string
          project_id: string | null
          user_id: string
          visual_features: Json | null
        }
        Insert: {
          brand_id?: string | null
          campaign_id?: string | null
          channel?: string | null
          created_at?: string | null
          design_snapshot?: Json | null
          event_type: string
          id?: string
          project_id?: string | null
          user_id: string
          visual_features?: Json | null
        }
        Update: {
          brand_id?: string | null
          campaign_id?: string | null
          channel?: string | null
          created_at?: string | null
          design_snapshot?: Json | null
          event_type?: string
          id?: string
          project_id?: string | null
          user_id?: string
          visual_features?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_design_events_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_design_events_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_drift_alerts: {
        Row: {
          brand_id: string | null
          correction_suggestion: string | null
          created_at: string | null
          current_value: Json | null
          deviation_score: number
          drift_type: string
          expected_range: Json | null
          historical_variance: number | null
          id: string
          project_id: string | null
          responded_at: string | null
          severity: string | null
          user_id: string
          user_response: string | null
        }
        Insert: {
          brand_id?: string | null
          correction_suggestion?: string | null
          created_at?: string | null
          current_value?: Json | null
          deviation_score: number
          drift_type: string
          expected_range?: Json | null
          historical_variance?: number | null
          id?: string
          project_id?: string | null
          responded_at?: string | null
          severity?: string | null
          user_id: string
          user_response?: string | null
        }
        Update: {
          brand_id?: string | null
          correction_suggestion?: string | null
          created_at?: string | null
          current_value?: Json | null
          deviation_score?: number
          drift_type?: string
          expected_range?: Json | null
          historical_variance?: number | null
          id?: string
          project_id?: string | null
          responded_at?: string | null
          severity?: string | null
          user_id?: string
          user_response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_drift_alerts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_drift_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_export_history: {
        Row: {
          brand_id: string
          created_at: string | null
          export_data: Json | null
          export_type: string
          exported_by: string | null
          id: string
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          export_data?: Json | null
          export_type: string
          exported_by?: string | null
          id?: string
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          export_data?: Json | null
          export_type?: string
          exported_by?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_export_history_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_mcp_collections: {
        Row: {
          brand_ids: Json
          created_at: string | null
          default_brand_id: string | null
          description: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          brand_ids: Json
          created_at?: string | null
          default_brand_id?: string | null
          description?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          brand_ids?: Json
          created_at?: string | null
          default_brand_id?: string | null
          description?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_mcp_collections_default_brand_id_fkey"
            columns: ["default_brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_mcp_configs: {
        Row: {
          api_key_hash: string | null
          api_key_salt: string | null
          brand_id: string
          collection_id: string | null
          config_name: string
          created_at: string | null
          enabled_resources: Json | null
          enabled_tools: Json | null
          id: string
          is_active: boolean | null
          pinned_version_id: string | null
          rate_limit_per_hour: number | null
          share_token: string | null
          updated_at: string | null
          user_id: string
          version_mode: string | null
        }
        Insert: {
          api_key_hash?: string | null
          api_key_salt?: string | null
          brand_id: string
          collection_id?: string | null
          config_name: string
          created_at?: string | null
          enabled_resources?: Json | null
          enabled_tools?: Json | null
          id?: string
          is_active?: boolean | null
          pinned_version_id?: string | null
          rate_limit_per_hour?: number | null
          share_token?: string | null
          updated_at?: string | null
          user_id: string
          version_mode?: string | null
        }
        Update: {
          api_key_hash?: string | null
          api_key_salt?: string | null
          brand_id?: string
          collection_id?: string | null
          config_name?: string
          created_at?: string | null
          enabled_resources?: Json | null
          enabled_tools?: Json | null
          id?: string
          is_active?: boolean | null
          pinned_version_id?: string | null
          rate_limit_per_hour?: number | null
          share_token?: string | null
          updated_at?: string | null
          user_id?: string
          version_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_mcp_configs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_mcp_configs_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "brand_mcp_collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_mcp_configs_pinned_version_id_fkey"
            columns: ["pinned_version_id"]
            isOneToOne: false
            referencedRelation: "brand_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_mcp_insights: {
        Row: {
          brand_id: string
          created_at: string | null
          description: string
          evidence: Json | null
          id: string
          insight_type: string
          severity: string
          status: string | null
          suggestion: string | null
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          description: string
          evidence?: Json | null
          id?: string
          insight_type: string
          severity: string
          status?: string | null
          suggestion?: string | null
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          description?: string
          evidence?: Json | null
          id?: string
          insight_type?: string
          severity?: string
          status?: string | null
          suggestion?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_mcp_insights_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_mcp_marketplace: {
        Row: {
          brand_id: string
          category: string | null
          connection_count: number | null
          description: string
          id: string
          is_featured: boolean | null
          mcp_config_id: string
          published_at: string | null
          rating: number | null
          tags: Json | null
          title: string
          view_count: number | null
        }
        Insert: {
          brand_id: string
          category?: string | null
          connection_count?: number | null
          description: string
          id?: string
          is_featured?: boolean | null
          mcp_config_id: string
          published_at?: string | null
          rating?: number | null
          tags?: Json | null
          title: string
          view_count?: number | null
        }
        Update: {
          brand_id?: string
          category?: string | null
          connection_count?: number | null
          description?: string
          id?: string
          is_featured?: boolean | null
          mcp_config_id?: string
          published_at?: string | null
          rating?: number | null
          tags?: Json | null
          title?: string
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_mcp_marketplace_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_mcp_marketplace_mcp_config_id_fkey"
            columns: ["mcp_config_id"]
            isOneToOne: false
            referencedRelation: "brand_mcp_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_mcp_marketplace_reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          marketplace_id: string | null
          rating: number | null
          user_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          marketplace_id?: string | null
          rating?: number | null
          user_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          marketplace_id?: string | null
          rating?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_mcp_marketplace_reviews_marketplace_id_fkey"
            columns: ["marketplace_id"]
            isOneToOne: false
            referencedRelation: "brand_mcp_marketplace"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_mcp_usage: {
        Row: {
          brand_id: string
          client_info: Json | null
          created_at: string | null
          id: string
          mcp_config_id: string | null
          method: string
          resource_uri: string | null
        }
        Insert: {
          brand_id: string
          client_info?: Json | null
          created_at?: string | null
          id?: string
          mcp_config_id?: string | null
          method: string
          resource_uri?: string | null
        }
        Update: {
          brand_id?: string
          client_info?: Json | null
          created_at?: string | null
          id?: string
          mcp_config_id?: string | null
          method?: string
          resource_uri?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_mcp_usage_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_mcp_usage_mcp_config_id_fkey"
            columns: ["mcp_config_id"]
            isOneToOne: false
            referencedRelation: "brand_mcp_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_mcp_webhook_deliveries: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_code: number | null
          status: string
          webhook_id: string | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_code?: number | null
          status: string
          webhook_id?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_code?: number | null
          status?: string
          webhook_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_mcp_webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "brand_mcp_webhooks"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_mcp_webhooks: {
        Row: {
          brand_id: string
          created_at: string | null
          events: Json | null
          failure_count: number | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          mcp_config_id: string | null
          secret: string | null
          webhook_url: string
        }
        Insert: {
          brand_id: string
          created_at?: string | null
          events?: Json | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          mcp_config_id?: string | null
          secret?: string | null
          webhook_url: string
        }
        Update: {
          brand_id?: string
          created_at?: string | null
          events?: Json | null
          failure_count?: number | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          mcp_config_id?: string | null
          secret?: string | null
          webhook_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_mcp_webhooks_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "brand_mcp_webhooks_mcp_config_id_fkey"
            columns: ["mcp_config_id"]
            isOneToOne: false
            referencedRelation: "brand_mcp_configs"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_sections: {
        Row: {
          ai_context: Json | null
          brand_id: string
          created_at: string | null
          display_order: number
          icon_name: string | null
          id: string
          is_default: boolean | null
          section_name: string
          section_type: string
          updated_at: string | null
        }
        Insert: {
          ai_context?: Json | null
          brand_id: string
          created_at?: string | null
          display_order?: number
          icon_name?: string | null
          id?: string
          is_default?: boolean | null
          section_name: string
          section_type?: string
          updated_at?: string | null
        }
        Update: {
          ai_context?: Json | null
          brand_id?: string
          created_at?: string | null
          display_order?: number
          icon_name?: string | null
          id?: string
          is_default?: boolean | null
          section_name?: string
          section_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_sections_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_shares: {
        Row: {
          allowed_sections: string[] | null
          brand_id: string
          created_at: string | null
          created_by: string
          download_enabled: boolean | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          last_viewed_at: string | null
          password_hash: string | null
          password_salt: string | null
          share_name: string | null
          share_token: string
          unique_visitors: Json | null
          updated_at: string | null
          views_count: number | null
        }
        Insert: {
          allowed_sections?: string[] | null
          brand_id: string
          created_at?: string | null
          created_by: string
          download_enabled?: boolean | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_viewed_at?: string | null
          password_hash?: string | null
          password_salt?: string | null
          share_name?: string | null
          share_token: string
          unique_visitors?: Json | null
          updated_at?: string | null
          views_count?: number | null
        }
        Update: {
          allowed_sections?: string[] | null
          brand_id?: string
          created_at?: string | null
          created_by?: string
          download_enabled?: boolean | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          last_viewed_at?: string | null
          password_hash?: string | null
          password_salt?: string | null
          share_name?: string | null
          share_token?: string
          unique_visitors?: Json | null
          updated_at?: string | null
          views_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "brand_shares_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_system_presets: {
        Row: {
          brand_system: Json
          category: string
          created_at: string | null
          id: string
          is_default: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          brand_system: Json
          category: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          brand_system?: Json
          category?: string
          created_at?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      brand_versions: {
        Row: {
          brand_id: string
          change_summary: string | null
          changed_by: string | null
          created_at: string | null
          id: string
          snapshot: Json
          version_number: number
        }
        Insert: {
          brand_id: string
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          snapshot: Json
          version_number: number
        }
        Update: {
          brand_id?: string
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string | null
          id?: string
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "brand_versions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          brand_system_snapshot: Json | null
          brand_voice: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          extraction_metadata: Json | null
          id: string
          industry: string | null
          last_refined_at: string | null
          logo_primary_url: string | null
          logo_secondary_url: string | null
          name: string
          slug: string
          target_audience: string | null
          total_files_count: number | null
          updated_at: string | null
          user_id: string
          website_url: string | null
        }
        Insert: {
          brand_system_snapshot?: Json | null
          brand_voice?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          extraction_metadata?: Json | null
          id?: string
          industry?: string | null
          last_refined_at?: string | null
          logo_primary_url?: string | null
          logo_secondary_url?: string | null
          name: string
          slug: string
          target_audience?: string | null
          total_files_count?: number | null
          updated_at?: string | null
          user_id: string
          website_url?: string | null
        }
        Update: {
          brand_system_snapshot?: Json | null
          brand_voice?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          extraction_metadata?: Json | null
          id?: string
          industry?: string | null
          last_refined_at?: string | null
          logo_primary_url?: string | null
          logo_secondary_url?: string | null
          name?: string
          slug?: string
          target_audience?: string | null
          total_files_count?: number | null
          updated_at?: string | null
          user_id?: string
          website_url?: string | null
        }
        Relationships: []
      }
      canvas_components: {
        Row: {
          category: string
          created_at: string
          description: string | null
          fabric_json: Json
          height: number | null
          id: string
          name: string
          tags: string[]
          thumbnail_url: string | null
          updated_at: string
          usage_count: number
          user_id: string
          version: number
          width: number | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          fabric_json: Json
          height?: number | null
          id?: string
          name: string
          tags?: string[]
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number
          user_id: string
          version?: number
          width?: number | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          fabric_json?: Json
          height?: number | null
          id?: string
          name?: string
          tags?: string[]
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number
          user_id?: string
          version?: number
          width?: number | null
        }
        Relationships: []
      }
      canvas_fonts: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          preview_url: string | null
          reference_image_url: string | null
          style_json: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          preview_url?: string | null
          reference_image_url?: string | null
          style_json: Json
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          preview_url?: string | null
          reference_image_url?: string | null
          style_json?: Json
          user_id?: string
        }
        Relationships: []
      }
      canvas_objects: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          file_path: string | null
          id: string
          image_url: string | null
          object_data: Json
          object_id: string
          object_type: string
          position_x: number
          position_y: number
          project_id: string
          updated_at: string
          user_id: string
          z_index: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          file_path?: string | null
          id?: string
          image_url?: string | null
          object_data?: Json
          object_id?: string
          object_type: string
          position_x?: number
          position_y?: number
          project_id: string
          updated_at?: string
          user_id: string
          z_index?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          file_path?: string | null
          id?: string
          image_url?: string | null
          object_data?: Json
          object_id?: string
          object_type?: string
          position_x?: number
          position_y?: number
          project_id?: string
          updated_at?: string
          user_id?: string
          z_index?: number
        }
        Relationships: []
      }
      canvas_versions: {
        Row: {
          artboard_id: string | null
          created_at: string
          id: string
          label: string | null
          project_id: string
          snapshot: Json
          source: string
          thumbnail_url: string | null
          user_id: string
          version_number: number
        }
        Insert: {
          artboard_id?: string | null
          created_at?: string
          id?: string
          label?: string | null
          project_id: string
          snapshot: Json
          source?: string
          thumbnail_url?: string | null
          user_id: string
          version_number: number
        }
        Update: {
          artboard_id?: string | null
          created_at?: string
          id?: string
          label?: string | null
          project_id?: string
          snapshot?: Json
          source?: string
          thumbnail_url?: string | null
          user_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "canvas_versions_artboard_id_fkey"
            columns: ["artboard_id"]
            isOneToOne: false
            referencedRelation: "artboards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "canvas_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      canvas_workflow_exports: {
        Row: {
          created_at: string
          destination_id: string | null
          destination_type: string
          id: string
          image_url: string
          source_id: string
          source_type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          destination_id?: string | null
          destination_type: string
          id?: string
          image_url: string
          source_id: string
          source_type: string
          user_id: string
        }
        Update: {
          created_at?: string
          destination_id?: string | null
          destination_type?: string
          id?: string
          image_url?: string
          source_id?: string
          source_type?: string
          user_id?: string
        }
        Relationships: []
      }
      client_profiles: {
        Row: {
          budget_range: string | null
          company_type: string | null
          completion_state: string
          created_at: string
          id: string
          industry: string | null
          stage: string | null
          taste_picks: Json | null
          typical_needs: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_range?: string | null
          company_type?: string | null
          completion_state?: string
          created_at?: string
          id?: string
          industry?: string | null
          stage?: string | null
          taste_picks?: Json | null
          typical_needs?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_range?: string | null
          company_type?: string | null
          completion_state?: string
          created_at?: string
          id?: string
          industry?: string | null
          stage?: string | null
          taste_picks?: Json | null
          typical_needs?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          preferred_model: string | null
          project_id: string | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          preferred_model?: string | null
          project_id?: string | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          preferred_model?: string | null
          project_id?: string | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      cosmo_access: {
        Row: {
          granted_at: string
          granted_by: string | null
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cosmo_asset_library: {
        Row: {
          category: string
          created_at: string | null
          file_type: string | null
          file_url: string
          id: string
          is_premium: boolean | null
          name: string
          tags: string[] | null
          thumbnail_url: string | null
          uploaded_by: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          file_type?: string | null
          file_url: string
          id?: string
          is_premium?: boolean | null
          name: string
          tags?: string[] | null
          thumbnail_url?: string | null
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          file_type?: string | null
          file_url?: string
          id?: string
          is_premium?: boolean | null
          name?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cosmo_asset_library_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cosmo_collection_items: {
        Row: {
          collection_id: string
          created_at: string
          data: Json
          display_order: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          collection_id: string
          created_at?: string
          data?: Json
          display_order?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          collection_id?: string
          created_at?: string
          data?: Json
          display_order?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cosmo_collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "cosmo_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      cosmo_collections: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          presentation_id: string | null
          schema: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          presentation_id?: string | null
          schema?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          presentation_id?: string | null
          schema?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cosmo_collections_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "presentations"
            referencedColumns: ["id"]
          },
        ]
      }
      cosmo_components: {
        Row: {
          block_data: Json
          category: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          tags: string[] | null
          thumbnail_url: string | null
          updated_at: string
          usage_count: number
          user_id: string
          variants: Json | null
        }
        Insert: {
          block_data: Json
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number
          user_id: string
          variants?: Json | null
        }
        Update: {
          block_data?: Json
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          tags?: string[] | null
          thumbnail_url?: string | null
          updated_at?: string
          usage_count?: number
          user_id?: string
          variants?: Json | null
        }
        Relationships: []
      }
      cosmo_templates: {
        Row: {
          category: string
          created_at: string
          design_tokens: Json | null
          downloads_count: number
          format: string
          id: string
          is_featured: boolean
          slides: Json
          subcategory: string | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          design_tokens?: Json | null
          downloads_count?: number
          format?: string
          id?: string
          is_featured?: boolean
          slides?: Json
          subcategory?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          design_tokens?: Json | null
          downloads_count?: number
          format?: string
          id?: string
          is_featured?: boolean
          slides?: Json
          subcategory?: string | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      creative_attributes: {
        Row: {
          aspect_ratio: string | null
          color_palette_category: string | null
          creative_identity_id: string | null
          cta_style: string | null
          dominant_color: string | null
          duration_seconds: number | null
          extracted_at: string | null
          extraction_confidence: number | null
          extraction_model: string | null
          format_type: string | null
          has_discount: boolean | null
          has_human: boolean | null
          has_logo: boolean | null
          has_price: boolean | null
          has_product: boolean | null
          headline_length: string | null
          headline_tone: string | null
          human_type: string | null
          id: string
          layout_density: string | null
          offer_type: string | null
          primary_colors: Json | null
          primary_emotion: string | null
          text_ratio: number | null
          user_id: string
          visual_complexity_score: number | null
        }
        Insert: {
          aspect_ratio?: string | null
          color_palette_category?: string | null
          creative_identity_id?: string | null
          cta_style?: string | null
          dominant_color?: string | null
          duration_seconds?: number | null
          extracted_at?: string | null
          extraction_confidence?: number | null
          extraction_model?: string | null
          format_type?: string | null
          has_discount?: boolean | null
          has_human?: boolean | null
          has_logo?: boolean | null
          has_price?: boolean | null
          has_product?: boolean | null
          headline_length?: string | null
          headline_tone?: string | null
          human_type?: string | null
          id?: string
          layout_density?: string | null
          offer_type?: string | null
          primary_colors?: Json | null
          primary_emotion?: string | null
          text_ratio?: number | null
          user_id: string
          visual_complexity_score?: number | null
        }
        Update: {
          aspect_ratio?: string | null
          color_palette_category?: string | null
          creative_identity_id?: string | null
          cta_style?: string | null
          dominant_color?: string | null
          duration_seconds?: number | null
          extracted_at?: string | null
          extraction_confidence?: number | null
          extraction_model?: string | null
          format_type?: string | null
          has_discount?: boolean | null
          has_human?: boolean | null
          has_logo?: boolean | null
          has_price?: boolean | null
          has_product?: boolean | null
          headline_length?: string | null
          headline_tone?: string | null
          human_type?: string | null
          id?: string
          layout_density?: string | null
          offer_type?: string | null
          primary_colors?: Json | null
          primary_emotion?: string | null
          text_ratio?: number | null
          user_id?: string
          visual_complexity_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_attributes_creative_identity_id_fkey"
            columns: ["creative_identity_id"]
            isOneToOne: false
            referencedRelation: "creative_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_fatigue_signals: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          analyzed_at: string | null
          confidence_score: number | null
          creative_identity_id: string | null
          ctr_14day_trend: number | null
          ctr_7day_trend: number | null
          dismissed: boolean | null
          dismissed_reason: string | null
          frequency_current: number | null
          frequency_saturation: boolean | null
          id: string
          is_active: boolean | null
          master_creative_id: string
          matches_historical_pattern: boolean | null
          predicted_days_to_drop: number | null
          predicted_drop_percentage: number | null
          reach_saturation_pct: number | null
          recommended_action: string | null
          similar_creatives_avg_lifespan: number | null
          urgency: string | null
          user_id: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          analyzed_at?: string | null
          confidence_score?: number | null
          creative_identity_id?: string | null
          ctr_14day_trend?: number | null
          ctr_7day_trend?: number | null
          dismissed?: boolean | null
          dismissed_reason?: string | null
          frequency_current?: number | null
          frequency_saturation?: boolean | null
          id?: string
          is_active?: boolean | null
          master_creative_id: string
          matches_historical_pattern?: boolean | null
          predicted_days_to_drop?: number | null
          predicted_drop_percentage?: number | null
          reach_saturation_pct?: number | null
          recommended_action?: string | null
          similar_creatives_avg_lifespan?: number | null
          urgency?: string | null
          user_id: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          analyzed_at?: string | null
          confidence_score?: number | null
          creative_identity_id?: string | null
          ctr_14day_trend?: number | null
          ctr_7day_trend?: number | null
          dismissed?: boolean | null
          dismissed_reason?: string | null
          frequency_current?: number | null
          frequency_saturation?: boolean | null
          id?: string
          is_active?: boolean | null
          master_creative_id?: string
          matches_historical_pattern?: boolean | null
          predicted_days_to_drop?: number | null
          predicted_drop_percentage?: number | null
          reach_saturation_pct?: number | null
          recommended_action?: string | null
          similar_creatives_avg_lifespan?: number | null
          urgency?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_fatigue_signals_creative_identity_id_fkey"
            columns: ["creative_identity_id"]
            isOneToOne: false
            referencedRelation: "creative_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_identities: {
        Row: {
          body_text: string | null
          brand_id: string | null
          connection_id: string | null
          created_at: string | null
          creative_name: string | null
          creative_type: string | null
          cta_text: string | null
          embedding_vector: Json | null
          full_image_url: string | null
          headline_text: string | null
          id: string
          landing_url: string | null
          master_creative_id: string
          perceptual_hash: string | null
          platform: string
          platform_ad_id: string | null
          platform_campaign_id: string | null
          platform_creative_id: string
          thumbnail_url: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body_text?: string | null
          brand_id?: string | null
          connection_id?: string | null
          created_at?: string | null
          creative_name?: string | null
          creative_type?: string | null
          cta_text?: string | null
          embedding_vector?: Json | null
          full_image_url?: string | null
          headline_text?: string | null
          id?: string
          landing_url?: string | null
          master_creative_id: string
          perceptual_hash?: string | null
          platform: string
          platform_ad_id?: string | null
          platform_campaign_id?: string | null
          platform_creative_id: string
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body_text?: string | null
          brand_id?: string | null
          connection_id?: string | null
          created_at?: string | null
          creative_name?: string | null
          creative_type?: string | null
          cta_text?: string | null
          embedding_vector?: Json | null
          full_image_url?: string | null
          headline_text?: string | null
          id?: string
          landing_url?: string | null
          master_creative_id?: string
          perceptual_hash?: string | null
          platform?: string
          platform_ad_id?: string | null
          platform_campaign_id?: string | null
          platform_creative_id?: string
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_identities_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creative_identities_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "ad_platform_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_performance_daily: {
        Row: {
          age_group: string | null
          audience_segment: string | null
          campaign_stage: string | null
          clicks: number | null
          comments: number | null
          conversions: number | null
          cpa: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          creative_identity_id: string | null
          ctr: number | null
          device: string | null
          engagement_rate: number | null
          frequency: number | null
          gender: string | null
          geo_country: string | null
          geo_region: string | null
          id: string
          impressions: number | null
          likes: number | null
          master_creative_id: string
          placement: string | null
          platform: string
          reach: number | null
          recorded_date: string
          revenue: number | null
          roas: number | null
          saves: number | null
          shares: number | null
          spend: number | null
          user_id: string
          video_view_rate: number | null
          video_views: number | null
        }
        Insert: {
          age_group?: string | null
          audience_segment?: string | null
          campaign_stage?: string | null
          clicks?: number | null
          comments?: number | null
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          creative_identity_id?: string | null
          ctr?: number | null
          device?: string | null
          engagement_rate?: number | null
          frequency?: number | null
          gender?: string | null
          geo_country?: string | null
          geo_region?: string | null
          id?: string
          impressions?: number | null
          likes?: number | null
          master_creative_id: string
          placement?: string | null
          platform: string
          reach?: number | null
          recorded_date: string
          revenue?: number | null
          roas?: number | null
          saves?: number | null
          shares?: number | null
          spend?: number | null
          user_id: string
          video_view_rate?: number | null
          video_views?: number | null
        }
        Update: {
          age_group?: string | null
          audience_segment?: string | null
          campaign_stage?: string | null
          clicks?: number | null
          comments?: number | null
          conversions?: number | null
          cpa?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          creative_identity_id?: string | null
          ctr?: number | null
          device?: string | null
          engagement_rate?: number | null
          frequency?: number | null
          gender?: string | null
          geo_country?: string | null
          geo_region?: string | null
          id?: string
          impressions?: number | null
          likes?: number | null
          master_creative_id?: string
          placement?: string | null
          platform?: string
          reach?: number | null
          recorded_date?: string
          revenue?: number | null
          roas?: number | null
          saves?: number | null
          shares?: number | null
          spend?: number | null
          user_id?: string
          video_view_rate?: number | null
          video_views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_performance_daily_creative_identity_id_fkey"
            columns: ["creative_identity_id"]
            isOneToOne: false
            referencedRelation: "creative_identities"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_performance_insights: {
        Row: {
          actionability_score: number | null
          brand_id: string | null
          confidence_score: number
          created_at: string | null
          dismissed: boolean | null
          dismissed_at: string | null
          expires_at: string | null
          id: string
          insight_data: Json | null
          insight_text: string
          insight_title: string
          insight_type: string
          is_active: boolean | null
          priority: number | null
          related_creatives: string[] | null
          related_patterns: string[] | null
          related_platforms: string[] | null
          surfaced_at: string | null
          surfaced_count: number | null
          surfaced_in_chat: boolean | null
          user_feedback: string | null
          user_id: string
          user_rating: number | null
        }
        Insert: {
          actionability_score?: number | null
          brand_id?: string | null
          confidence_score: number
          created_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          insight_data?: Json | null
          insight_text: string
          insight_title: string
          insight_type: string
          is_active?: boolean | null
          priority?: number | null
          related_creatives?: string[] | null
          related_patterns?: string[] | null
          related_platforms?: string[] | null
          surfaced_at?: string | null
          surfaced_count?: number | null
          surfaced_in_chat?: boolean | null
          user_feedback?: string | null
          user_id: string
          user_rating?: number | null
        }
        Update: {
          actionability_score?: number | null
          brand_id?: string | null
          confidence_score?: number
          created_at?: string | null
          dismissed?: boolean | null
          dismissed_at?: string | null
          expires_at?: string | null
          id?: string
          insight_data?: Json | null
          insight_text?: string
          insight_title?: string
          insight_type?: string
          is_active?: boolean | null
          priority?: number | null
          related_creatives?: string[] | null
          related_patterns?: string[] | null
          related_platforms?: string[] | null
          surfaced_at?: string | null
          surfaced_count?: number | null
          surfaced_in_chat?: boolean | null
          user_feedback?: string | null
          user_id?: string
          user_rating?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_performance_insights_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_performance_patterns: {
        Row: {
          attribute: string
          attribute_value: string | null
          audience_type: string | null
          brand_id: string | null
          campaign_stage: string | null
          computed_at: string | null
          confidence_score: number | null
          correlation: number | null
          device: string | null
          geography: string | null
          id: string
          is_active: boolean | null
          lift_percentage: number | null
          outcome: string
          p_value: number | null
          platform: string | null
          sample_size: number
          user_id: string
          valid_until: string | null
        }
        Insert: {
          attribute: string
          attribute_value?: string | null
          audience_type?: string | null
          brand_id?: string | null
          campaign_stage?: string | null
          computed_at?: string | null
          confidence_score?: number | null
          correlation?: number | null
          device?: string | null
          geography?: string | null
          id?: string
          is_active?: boolean | null
          lift_percentage?: number | null
          outcome: string
          p_value?: number | null
          platform?: string | null
          sample_size: number
          user_id: string
          valid_until?: string | null
        }
        Update: {
          attribute?: string
          attribute_value?: string | null
          audience_type?: string | null
          brand_id?: string | null
          campaign_stage?: string | null
          computed_at?: string | null
          confidence_score?: number | null
          correlation?: number | null
          device?: string | null
          geography?: string | null
          id?: string
          is_active?: boolean | null
          lift_percentage?: number | null
          outcome?: string
          p_value?: number | null
          platform?: string | null
          sample_size?: number
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creative_performance_patterns_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      creative_sync_logs: {
        Row: {
          completed_at: string | null
          connection_id: string | null
          creatives_processed: number | null
          duration_ms: number | null
          error_details: Json | null
          error_message: string | null
          id: string
          records_created: number | null
          records_fetched: number | null
          records_updated: number | null
          retry_count: number | null
          started_at: string | null
          status: string | null
          sync_type: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          connection_id?: string | null
          creatives_processed?: number | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          records_created?: number | null
          records_fetched?: number | null
          records_updated?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          sync_type?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          connection_id?: string | null
          creatives_processed?: number | null
          duration_ms?: number | null
          error_details?: Json | null
          error_message?: string | null
          id?: string
          records_created?: number | null
          records_fetched?: number | null
          records_updated?: number | null
          retry_count?: number | null
          started_at?: string | null
          status?: string | null
          sync_type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creative_sync_logs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "ad_platform_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          description: string
          id: string
          metadata: Json | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: []
      }
      credits: {
        Row: {
          ai_balance: number
          balance: number
          bank_status: string
          cogent_runs_limit: number
          cogent_runs_reset_at: string
          cogent_runs_used: number
          created_at: string
          credit_rollover_limit: number | null
          escrow_balance: number
          id: string
          kyc_status: string
          last_credit_refill: string | null
          monthly_credit_allocation: number | null
          plan_status: string | null
          subscription_expires_at: string | null
          subscription_tier: Database["public"]["Enums"]["subscription_tier"]
          talent_balance: number
          updated_at: string
          user_id: string
          video_feature_access: boolean | null
          welcome_bonus_claimed: boolean | null
        }
        Insert: {
          ai_balance?: number
          balance?: number
          bank_status?: string
          cogent_runs_limit?: number
          cogent_runs_reset_at?: string
          cogent_runs_used?: number
          created_at?: string
          credit_rollover_limit?: number | null
          escrow_balance?: number
          id?: string
          kyc_status?: string
          last_credit_refill?: string | null
          monthly_credit_allocation?: number | null
          plan_status?: string | null
          subscription_expires_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          talent_balance?: number
          updated_at?: string
          user_id: string
          video_feature_access?: boolean | null
          welcome_bonus_claimed?: boolean | null
        }
        Update: {
          ai_balance?: number
          balance?: number
          bank_status?: string
          cogent_runs_limit?: number
          cogent_runs_reset_at?: string
          cogent_runs_used?: number
          created_at?: string
          credit_rollover_limit?: number | null
          escrow_balance?: number
          id?: string
          kyc_status?: string
          last_credit_refill?: string | null
          monthly_credit_allocation?: number | null
          plan_status?: string | null
          subscription_expires_at?: string | null
          subscription_tier?: Database["public"]["Enums"]["subscription_tier"]
          talent_balance?: number
          updated_at?: string
          user_id?: string
          video_feature_access?: boolean | null
          welcome_bonus_claimed?: boolean | null
        }
        Relationships: []
      }
      design_assets: {
        Row: {
          asset_type: string
          created_at: string | null
          file_path: string
          file_size: number | null
          height: number | null
          id: string
          metadata: Json | null
          mime_type: string | null
          project_id: string | null
          signed_url: string | null
          signed_url_expires_at: string | null
          source: string
          thumbnail_url: string | null
          updated_at: string | null
          user_id: string
          width: number | null
        }
        Insert: {
          asset_type: string
          created_at?: string | null
          file_path: string
          file_size?: number | null
          height?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          project_id?: string | null
          signed_url?: string | null
          signed_url_expires_at?: string | null
          source: string
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id: string
          width?: number | null
        }
        Update: {
          asset_type?: string
          created_at?: string | null
          file_path?: string
          file_size?: number | null
          height?: number | null
          id?: string
          metadata?: Json | null
          mime_type?: string | null
          project_id?: string | null
          signed_url?: string | null
          signed_url_expires_at?: string | null
          source?: string
          thumbnail_url?: string | null
          updated_at?: string | null
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "design_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      design_fingerprints: {
        Row: {
          alignment_style: string | null
          created_at: string
          focal_position: string | null
          grid_type: string | null
          id: string
          image_proportion: string | null
          style_mode: string | null
          text_placement: string | null
          user_id: string
          whitespace_ratio: number | null
        }
        Insert: {
          alignment_style?: string | null
          created_at?: string
          focal_position?: string | null
          grid_type?: string | null
          id?: string
          image_proportion?: string | null
          style_mode?: string | null
          text_placement?: string | null
          user_id: string
          whitespace_ratio?: number | null
        }
        Update: {
          alignment_style?: string | null
          created_at?: string
          focal_position?: string | null
          grid_type?: string | null
          id?: string
          image_proportion?: string | null
          style_mode?: string | null
          text_placement?: string | null
          user_id?: string
          whitespace_ratio?: number | null
        }
        Relationships: []
      }
      design_generations: {
        Row: {
          conversation_id: string | null
          created_at: string
          design_type: string | null
          enhanced_prompt: string | null
          error_message: string | null
          generation_time_ms: number | null
          id: string
          image_count: number | null
          metadata: Json | null
          model_used: string
          project_id: string | null
          prompt: string
          reference_used: boolean | null
          success: boolean
          training_knowledge_used: boolean | null
          user_id: string
        }
        Insert: {
          conversation_id?: string | null
          created_at?: string
          design_type?: string | null
          enhanced_prompt?: string | null
          error_message?: string | null
          generation_time_ms?: number | null
          id?: string
          image_count?: number | null
          metadata?: Json | null
          model_used: string
          project_id?: string | null
          prompt: string
          reference_used?: boolean | null
          success?: boolean
          training_knowledge_used?: boolean | null
          user_id: string
        }
        Update: {
          conversation_id?: string | null
          created_at?: string
          design_type?: string | null
          enhanced_prompt?: string | null
          error_message?: string | null
          generation_time_ms?: number | null
          id?: string
          image_count?: number | null
          metadata?: Json | null
          model_used?: string
          project_id?: string | null
          prompt?: string
          reference_used?: boolean | null
          success?: boolean
          training_knowledge_used?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_generations_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "design_generations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      design_illustrations: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_public: boolean | null
          subcategory: string | null
          svg_data: string
          thumbnail_url: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          subcategory?: string | null
          svg_data: string
          thumbnail_url: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          subcategory?: string | null
          svg_data?: string
          thumbnail_url?: string
          title?: string
        }
        Relationships: []
      }
      design_quality_signals: {
        Row: {
          artboard_id: string | null
          created_at: string | null
          design_generation_id: string | null
          edit_depth: number | null
          export_format: string | null
          id: string
          metadata: Json | null
          project_id: string | null
          revision_count: number | null
          selected_over_count: number | null
          signal_type: string
          time_on_design_ms: number | null
          user_id: string
          was_compared: boolean | null
        }
        Insert: {
          artboard_id?: string | null
          created_at?: string | null
          design_generation_id?: string | null
          edit_depth?: number | null
          export_format?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          revision_count?: number | null
          selected_over_count?: number | null
          signal_type: string
          time_on_design_ms?: number | null
          user_id: string
          was_compared?: boolean | null
        }
        Update: {
          artboard_id?: string | null
          created_at?: string | null
          design_generation_id?: string | null
          edit_depth?: number | null
          export_format?: string | null
          id?: string
          metadata?: Json | null
          project_id?: string | null
          revision_count?: number | null
          selected_over_count?: number | null
          signal_type?: string
          time_on_design_ms?: number | null
          user_id?: string
          was_compared?: boolean | null
        }
        Relationships: []
      }
      design_showcase: {
        Row: {
          created_at: string
          created_by: string | null
          creator_avatar_url: string | null
          creator_name: string
          id: string
          image_url: string
          is_visible: boolean
          likes_count: number
          sort_order: number
          tags: string[] | null
          title: string
          views_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          creator_avatar_url?: string | null
          creator_name?: string
          id?: string
          image_url: string
          is_visible?: boolean
          likes_count?: number
          sort_order?: number
          tags?: string[] | null
          title?: string
          views_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          creator_avatar_url?: string | null
          creator_name?: string
          id?: string
          image_url?: string
          is_visible?: boolean
          likes_count?: number
          sort_order?: number
          tags?: string[] | null
          title?: string
          views_count?: number
        }
        Relationships: []
      }
      design_stock_photos: {
        Row: {
          created_at: string | null
          height: number
          id: string
          image_url: string
          is_trending: boolean | null
          photographer: string | null
          source: string | null
          thumbnail_url: string
          title: string | null
          width: number
        }
        Insert: {
          created_at?: string | null
          height: number
          id?: string
          image_url: string
          is_trending?: boolean | null
          photographer?: string | null
          source?: string | null
          thumbnail_url: string
          title?: string | null
          width: number
        }
        Update: {
          created_at?: string | null
          height?: number
          id?: string
          image_url?: string
          is_trending?: boolean | null
          photographer?: string | null
          source?: string | null
          thumbnail_url?: string
          title?: string | null
          width?: number
        }
        Relationships: []
      }
      design_template_categories: {
        Row: {
          category_name: string
          created_at: string | null
          display_name: string
          display_order: number | null
          id: string
          is_active: boolean | null
          template_images: Json | null
          thumbnail_url: string | null
          updated_at: string | null
        }
        Insert: {
          category_name: string
          created_at?: string | null
          display_name: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          template_images?: Json | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Update: {
          category_name?: string
          created_at?: string | null
          display_name?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          template_images?: Json | null
          thumbnail_url?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      design_template_library: {
        Row: {
          canvas_data: Json
          category: string
          created_at: string | null
          downloads_count: number | null
          featured: boolean | null
          height: number
          id: string
          is_public: boolean | null
          section: string
          thumbnail_url: string
          title: string
          width: number
        }
        Insert: {
          canvas_data: Json
          category: string
          created_at?: string | null
          downloads_count?: number | null
          featured?: boolean | null
          height: number
          id?: string
          is_public?: boolean | null
          section: string
          thumbnail_url: string
          title: string
          width: number
        }
        Update: {
          canvas_data?: Json
          category?: string
          created_at?: string | null
          downloads_count?: number | null
          featured?: boolean | null
          height?: number
          id?: string
          is_public?: boolean | null
          section?: string
          thumbnail_url?: string
          title?: string
          width?: number
        }
        Relationships: []
      }
      design_templates: {
        Row: {
          canvas_data: Json
          category: string
          created_at: string
          created_by: string | null
          height: number
          id: string
          is_public: boolean | null
          thumbnail_url: string | null
          title: string
          width: number
        }
        Insert: {
          canvas_data?: Json
          category: string
          created_at?: string
          created_by?: string | null
          height?: number
          id?: string
          is_public?: boolean | null
          thumbnail_url?: string | null
          title: string
          width?: number
        }
        Update: {
          canvas_data?: Json
          category?: string
          created_at?: string
          created_by?: string | null
          height?: number
          id?: string
          is_public?: boolean | null
          thumbnail_url?: string | null
          title?: string
          width?: number
        }
        Relationships: []
      }
      design_text_templates: {
        Row: {
          category: string
          created_at: string | null
          id: string
          is_public: boolean | null
          text_data: Json
          thumbnail_url: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          text_data: Json
          thumbnail_url: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          is_public?: boolean | null
          text_data?: Json
          thumbnail_url?: string
          title?: string
        }
        Relationships: []
      }
      design_textures: {
        Row: {
          category: string
          created_at: string | null
          id: string
          image_url: string
          is_public: boolean | null
          seamless: boolean | null
          subcategory: string | null
          thumbnail_url: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          image_url: string
          is_public?: boolean | null
          seamless?: boolean | null
          subcategory?: string | null
          thumbnail_url: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          image_url?: string
          is_public?: boolean | null
          seamless?: boolean | null
          subcategory?: string | null
          thumbnail_url?: string
          title?: string
        }
        Relationships: []
      }
      design_tool_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          position_x: number
          position_y: number
          project_id: string
          resolved: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          position_x: number
          position_y: number
          project_id: string
          resolved?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          position_x?: number
          position_y?: number
          project_id?: string
          resolved?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_tool_comments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "design_tool_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      design_tool_cursors: {
        Row: {
          color: string
          id: string
          position_x: number
          position_y: number
          project_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color: string
          id?: string
          position_x: number
          position_y: number
          project_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          id?: string
          position_x?: number
          position_y?: number
          project_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_tool_cursors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "design_tool_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      design_tool_early_access: {
        Row: {
          email: string
          full_name: string
          id: string
          notified: boolean | null
          submitted_at: string | null
          user_id: string | null
        }
        Insert: {
          email: string
          full_name: string
          id?: string
          notified?: boolean | null
          submitted_at?: string | null
          user_id?: string | null
        }
        Update: {
          email?: string
          full_name?: string
          id?: string
          notified?: boolean | null
          submitted_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      design_tool_objects: {
        Row: {
          created_at: string
          id: string
          layer_order: number
          object_data: Json
          object_id: string
          object_type: string
          project_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          layer_order?: number
          object_data?: Json
          object_id: string
          object_type: string
          project_id: string
        }
        Update: {
          created_at?: string
          id?: string
          layer_order?: number
          object_data?: Json
          object_id?: string
          object_type?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "design_tool_objects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "design_tool_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      design_tool_projects: {
        Row: {
          canvas_data: Json | null
          created_at: string
          description: string | null
          height: number
          id: string
          template_id: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
          width: number
        }
        Insert: {
          canvas_data?: Json | null
          created_at?: string
          description?: string | null
          height?: number
          id?: string
          template_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id: string
          width?: number
        }
        Update: {
          canvas_data?: Json | null
          created_at?: string
          description?: string | null
          height?: number
          id?: string
          template_id?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          width?: number
        }
        Relationships: []
      }
      design_tool_versions: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          project_id: string
          snapshot: Json
          version_number: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          project_id: string
          snapshot: Json
          version_number: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          project_id?: string
          snapshot?: Json
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "design_tool_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "design_tool_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      design_user_folders: {
        Row: {
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      design_user_uploads: {
        Row: {
          created_at: string | null
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string
          folder_id: string | null
          height: number | null
          id: string
          thumbnail_url: string | null
          user_id: string
          width: number | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_path: string
          file_size?: number | null
          file_type: string
          folder_id?: string | null
          height?: number | null
          id?: string
          thumbnail_url?: string | null
          user_id: string
          width?: number | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string
          folder_id?: string | null
          height?: number | null
          id?: string
          thumbnail_url?: string | null
          user_id?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "design_user_uploads_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "design_user_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      digilocker_states: {
        Row: {
          created_at: string
          expires_at: string
          return_url: string | null
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          return_url?: string | null
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          return_url?: string | null
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      discount_code_usage: {
        Row: {
          code_id: string | null
          discount_amount: number
          final_amount: number
          id: string
          original_amount: number
          payment_id: string | null
          used_at: string | null
          user_id: string | null
        }
        Insert: {
          code_id?: string | null
          discount_amount: number
          final_amount: number
          id?: string
          original_amount: number
          payment_id?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Update: {
          code_id?: string | null
          discount_amount?: number
          final_amount?: number
          id?: string
          original_amount?: number
          payment_id?: string | null
          used_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_code_usage_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discount_code_usage_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          applicable_billing_periods: string[] | null
          applicable_plan_ids: string[] | null
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          max_uses_per_user: number | null
          min_purchase_amount: number | null
          updated_at: string | null
        }
        Insert: {
          applicable_billing_periods?: string[] | null
          applicable_plan_ids?: string[] | null
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_purchase_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          applicable_billing_periods?: string[] | null
          applicable_plan_ids?: string[] | null
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          max_uses_per_user?: number | null
          min_purchase_amount?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          created_at: string | null
          created_by: string
          id: string
          name: string
          recipient_filter: Json | null
          scheduled_at: string | null
          sent_at: string | null
          stats: Json | null
          status: string | null
          template_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          id?: string
          name: string
          recipient_filter?: Json | null
          scheduled_at?: string | null
          sent_at?: string | null
          stats?: Json | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          id?: string
          name?: string
          recipient_filter?: Json | null
          scheduled_at?: string | null
          sent_at?: string | null
          stats?: Json | null
          status?: string | null
          template_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "email_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_sends: {
        Row: {
          bounced: boolean | null
          campaign_id: string | null
          clicked_at: string | null
          id: string
          opened_at: string | null
          recipient_id: string
          sent_at: string | null
        }
        Insert: {
          bounced?: boolean | null
          campaign_id?: string | null
          clicked_at?: string | null
          id?: string
          opened_at?: string | null
          recipient_id: string
          sent_at?: string | null
        }
        Update: {
          bounced?: boolean | null
          campaign_id?: string | null
          clicked_at?: string | null
          id?: string
          opened_at?: string | null
          recipient_id?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_sends_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "email_campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      email_settings: {
        Row: {
          brand_name: string | null
          button_radius: string | null
          footer_text: string | null
          id: string
          logo_url: string | null
          magiclink_body: string | null
          magiclink_button: string | null
          magiclink_heading: string | null
          primary_color: string | null
          recovery_body: string | null
          recovery_button: string | null
          recovery_heading: string | null
          signup_body: string | null
          signup_button: string | null
          signup_heading: string | null
          support_email: string | null
          updated_at: string | null
          updated_by: string | null
          welcome_body: string | null
          welcome_heading: string | null
        }
        Insert: {
          brand_name?: string | null
          button_radius?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          magiclink_body?: string | null
          magiclink_button?: string | null
          magiclink_heading?: string | null
          primary_color?: string | null
          recovery_body?: string | null
          recovery_button?: string | null
          recovery_heading?: string | null
          signup_body?: string | null
          signup_button?: string | null
          signup_heading?: string | null
          support_email?: string | null
          updated_at?: string | null
          updated_by?: string | null
          welcome_body?: string | null
          welcome_heading?: string | null
        }
        Update: {
          brand_name?: string | null
          button_radius?: string | null
          footer_text?: string | null
          id?: string
          logo_url?: string | null
          magiclink_body?: string | null
          magiclink_button?: string | null
          magiclink_heading?: string | null
          primary_color?: string | null
          recovery_body?: string | null
          recovery_button?: string | null
          recovery_heading?: string | null
          signup_body?: string | null
          signup_button?: string | null
          signup_heading?: string | null
          support_email?: string | null
          updated_at?: string | null
          updated_by?: string | null
          welcome_body?: string | null
          welcome_heading?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_templates: {
        Row: {
          created_at: string | null
          html_content: string
          id: string
          json_design: Json | null
          name: string
          subject: string
          updated_at: string | null
          variables: string[] | null
        }
        Insert: {
          created_at?: string | null
          html_content: string
          id?: string
          json_design?: Json | null
          name: string
          subject: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Update: {
          created_at?: string | null
          html_content?: string
          id?: string
          json_design?: Json | null
          name?: string
          subject?: string
          updated_at?: string | null
          variables?: string[] | null
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      email_verifications: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          token: string
          user_id: string
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          token: string
          user_id: string
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          token?: string
          user_id?: string
          verified?: boolean | null
        }
        Relationships: []
      }
      feedback: {
        Row: {
          admin_notes: string | null
          assigned_admin_id: string | null
          browser_info: Json | null
          created_at: string
          description: string
          email: string | null
          id: string
          screenshot_url: string | null
          status: Database["public"]["Enums"]["feedback_status"] | null
          title: string
          type: Database["public"]["Enums"]["feedback_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_admin_id?: string | null
          browser_info?: Json | null
          created_at?: string
          description: string
          email?: string | null
          id?: string
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["feedback_status"] | null
          title: string
          type: Database["public"]["Enums"]["feedback_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          assigned_admin_id?: string | null
          browser_info?: Json | null
          created_at?: string
          description?: string
          email?: string | null
          id?: string
          screenshot_url?: string | null
          status?: Database["public"]["Enums"]["feedback_status"] | null
          title?: string
          type?: Database["public"]["Enums"]["feedback_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      freelancer_profiles: {
        Row: {
          availability: string | null
          communication_score: number | null
          completion_state: string
          created_at: string
          domain: string[] | null
          evaluation_submission: Json | null
          id: string
          portfolio_urls: string[] | null
          quality_score: number | null
          role_level: string | null
          tools: string[] | null
          updated_at: string
          user_id: string
          vetting_status: string
        }
        Insert: {
          availability?: string | null
          communication_score?: number | null
          completion_state?: string
          created_at?: string
          domain?: string[] | null
          evaluation_submission?: Json | null
          id?: string
          portfolio_urls?: string[] | null
          quality_score?: number | null
          role_level?: string | null
          tools?: string[] | null
          updated_at?: string
          user_id: string
          vetting_status?: string
        }
        Update: {
          availability?: string | null
          communication_score?: number | null
          completion_state?: string
          created_at?: string
          domain?: string[] | null
          evaluation_submission?: Json | null
          id?: string
          portfolio_urls?: string[] | null
          quality_score?: number | null
          role_level?: string | null
          tools?: string[] | null
          updated_at?: string
          user_id?: string
          vetting_status?: string
        }
        Relationships: []
      }
      generation_jobs: {
        Row: {
          completed_at: string | null
          completed_variations: number | null
          conversation_id: string | null
          created_at: string | null
          design_type: string | null
          error: string | null
          id: string
          prompt: string | null
          results: Json | null
          started_at: string | null
          status: string
          total_variations: number | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_variations?: number | null
          conversation_id?: string | null
          created_at?: string | null
          design_type?: string | null
          error?: string | null
          id?: string
          prompt?: string | null
          results?: Json | null
          started_at?: string | null
          status?: string
          total_variations?: number | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          completed_variations?: number | null
          conversation_id?: string | null
          created_at?: string | null
          design_type?: string | null
          error?: string | null
          id?: string
          prompt?: string | null
          results?: Json | null
          started_at?: string | null
          status?: string
          total_variations?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_code_usage: {
        Row: {
          code_id: string | null
          email: string | null
          id: string
          ip_address: string | null
          used_at: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          code_id?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          used_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          code_id?: string | null
          email?: string | null
          id?: string
          ip_address?: string | null
          used_at?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invite_code_usage_code_id_fkey"
            columns: ["code_id"]
            isOneToOne: false
            referencedRelation: "invite_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string | null
          created_by: string | null
          current_uses: number | null
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
        }
        Insert: {
          code: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
        }
        Update: {
          code?: string
          created_at?: string | null
          created_by?: string | null
          current_uses?: number | null
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
        }
        Relationships: []
      }
      landing_page_leads: {
        Row: {
          created_at: string
          email: string | null
          fields: Json
          form_id: string | null
          id: string
          ip_hash: string | null
          name: string | null
          notes: string | null
          page_id: string
          source_url: string | null
          status: string
          user_agent: string | null
          user_id: string
          utm: Json | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          fields?: Json
          form_id?: string | null
          id?: string
          ip_hash?: string | null
          name?: string | null
          notes?: string | null
          page_id: string
          source_url?: string | null
          status?: string
          user_agent?: string | null
          user_id: string
          utm?: Json | null
        }
        Update: {
          created_at?: string
          email?: string | null
          fields?: Json
          form_id?: string | null
          id?: string
          ip_hash?: string | null
          name?: string | null
          notes?: string | null
          page_id?: string
          source_url?: string | null
          status?: string
          user_agent?: string | null
          user_id?: string
          utm?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_leads_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "published_landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_page_visits: {
        Row: {
          country: string | null
          device: string | null
          id: number
          page_id: string
          referrer: string | null
          user_agent: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
          visited_at: string
        }
        Insert: {
          country?: string | null
          device?: string | null
          id?: number
          page_id: string
          referrer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visited_at?: string
        }
        Update: {
          country?: string | null
          device?: string | null
          id?: number
          page_id?: string
          referrer?: string | null
          user_agent?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
          visited_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "landing_page_visits_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "published_landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_queue: {
        Row: {
          content_id: string
          content_type: string
          content_url: string | null
          created_at: string | null
          flag_reason: string | null
          flag_source: string | null
          id: string
          notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          content_id: string
          content_type: string
          content_url?: string | null
          created_at?: string | null
          flag_reason?: string | null
          flag_source?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          content_id?: string
          content_type?: string
          content_url?: string | null
          created_at?: string | null
          flag_reason?: string | null
          flag_source?: string | null
          id?: string
          notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      node_execution_results: {
        Row: {
          created_at: string | null
          credits_used: number | null
          error_message: string | null
          execution_id: string
          execution_time_ms: number | null
          id: string
          node_id: string
          node_type: string
          result_data: Json | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credits_used?: number | null
          error_message?: string | null
          execution_id: string
          execution_time_ms?: number | null
          id?: string
          node_id: string
          node_type: string
          result_data?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credits_used?: number | null
          error_message?: string | null
          execution_id?: string
          execution_time_ms?: number | null
          id?: string
          node_id?: string
          node_type?: string
          result_data?: Json | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "node_execution_results_execution_id_fkey"
            columns: ["execution_id"]
            isOneToOne: false
            referencedRelation: "workflow_executions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          actioned_at: string | null
          created_at: string | null
          id: string
          message: string | null
          read_at: string | null
          resource_id: string | null
          resource_type: string | null
          sender_id: string | null
          share_id: string | null
          status: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          actioned_at?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          read_at?: string | null
          resource_id?: string | null
          resource_type?: string | null
          sender_id?: string | null
          share_id?: string | null
          status?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          actioned_at?: string | null
          created_at?: string | null
          id?: string
          message?: string | null
          read_at?: string | null
          resource_id?: string | null
          resource_type?: string | null
          sender_id?: string | null
          share_id?: string | null
          status?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          billing_period: string | null
          created_at: string
          currency: string | null
          discount_amount: number | null
          discount_code_id: string | null
          gateway_response: Json | null
          id: string
          metadata: Json | null
          original_amount: number | null
          payment_gateway: string | null
          plan_id: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          billing_period?: string | null
          created_at?: string
          currency?: string | null
          discount_amount?: number | null
          discount_code_id?: string | null
          gateway_response?: Json | null
          id?: string
          metadata?: Json | null
          original_amount?: number | null
          payment_gateway?: string | null
          plan_id?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          billing_period?: string | null
          created_at?: string
          currency?: string | null
          discount_amount?: number | null
          discount_code_id?: string | null
          gateway_response?: Json | null
          id?: string
          metadata?: Json | null
          original_amount?: number | null
          payment_gateway?: string | null
          plan_id?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      pinterest_tokens: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string | null
          id: string
          refresh_token: string | null
          scope: string | null
          token_type: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          refresh_token?: string | null
          scope?: string | null
          token_type?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      presentation_chats: {
        Row: {
          created_at: string
          id: string
          messages: Json
          presentation_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          messages?: Json
          presentation_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          messages?: Json
          presentation_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "presentation_chats_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "presentations"
            referencedColumns: ["id"]
          },
        ]
      }
      presentations: {
        Row: {
          created_at: string
          design_tokens: Json
          id: string
          is_public: boolean
          meta_description: string | null
          meta_title: string | null
          og_image_url: string | null
          publish_mode: string | null
          share_token: string | null
          slides: Json
          theme_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          design_tokens?: Json
          id?: string
          is_public?: boolean
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          publish_mode?: string | null
          share_token?: string | null
          slides?: Json
          theme_id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          design_tokens?: Json
          id?: string
          is_public?: boolean
          meta_description?: string | null
          meta_title?: string | null
          og_image_url?: string | null
          publish_mode?: string | null
          share_token?: string | null
          slides?: Json
          theme_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_size: string | null
          created_at: string
          current_challenges: string | null
          design_experience: string | null
          email: string
          full_name: string | null
          id: string
          industry: string | null
          onboarding_completed: boolean
          reduce_motion: boolean | null
          referral_source: string | null
          team_collaboration: boolean | null
          updated_at: string
          use_case: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_size?: string | null
          created_at?: string
          current_challenges?: string | null
          design_experience?: string | null
          email: string
          full_name?: string | null
          id: string
          industry?: string | null
          onboarding_completed?: boolean
          reduce_motion?: boolean | null
          referral_source?: string | null
          team_collaboration?: boolean | null
          updated_at?: string
          use_case?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_size?: string | null
          created_at?: string
          current_challenges?: string | null
          design_experience?: string | null
          email?: string
          full_name?: string | null
          id?: string
          industry?: string | null
          onboarding_completed?: boolean
          reduce_motion?: boolean | null
          referral_source?: string | null
          team_collaboration?: boolean | null
          updated_at?: string
          use_case?: string | null
        }
        Relationships: []
      }
      project_collaborators: {
        Row: {
          cursor_color: string | null
          id: string
          is_online: boolean | null
          joined_at: string | null
          joined_via_share_id: string | null
          last_active_at: string | null
          permission: string
          project_id: string
          user_id: string
        }
        Insert: {
          cursor_color?: string | null
          id?: string
          is_online?: boolean | null
          joined_at?: string | null
          joined_via_share_id?: string | null
          last_active_at?: string | null
          permission?: string
          project_id: string
          user_id: string
        }
        Update: {
          cursor_color?: string | null
          id?: string
          is_online?: boolean | null
          joined_at?: string | null
          joined_via_share_id?: string | null
          last_active_at?: string | null
          permission?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_collaborators_joined_via_share_id_fkey"
            columns: ["joined_via_share_id"]
            isOneToOne: false
            referencedRelation: "project_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_collaborators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_context_intel: {
        Row: {
          audience_confidence: number | null
          auto_context_enabled: boolean | null
          brand_id: string | null
          channel_confidence: number | null
          created_at: string | null
          goal_confidence: number | null
          id: string
          inferred_audience: string | null
          inferred_channel: string | null
          inferred_goal: string | null
          performance_benchmarks: Json | null
          project_id: string | null
          similar_campaign_ids: Json | null
          timeline_urgency: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          audience_confidence?: number | null
          auto_context_enabled?: boolean | null
          brand_id?: string | null
          channel_confidence?: number | null
          created_at?: string | null
          goal_confidence?: number | null
          id?: string
          inferred_audience?: string | null
          inferred_channel?: string | null
          inferred_goal?: string | null
          performance_benchmarks?: Json | null
          project_id?: string | null
          similar_campaign_ids?: Json | null
          timeline_urgency?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          audience_confidence?: number | null
          auto_context_enabled?: boolean | null
          brand_id?: string | null
          channel_confidence?: number | null
          created_at?: string | null
          goal_confidence?: number | null
          id?: string
          inferred_audience?: string | null
          inferred_channel?: string | null
          inferred_goal?: string | null
          performance_benchmarks?: Json | null
          project_id?: string | null
          similar_campaign_ids?: Json | null
          timeline_urgency?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_context_intel_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_context_intel_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_cursors: {
        Row: {
          color: string
          id: string
          position_x: number
          position_y: number
          project_id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string
          id?: string
          position_x?: number
          position_y?: number
          project_id: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string
          id?: string
          position_x?: number
          position_y?: number
          project_id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_cursors_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_shares: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          invited_email: string | null
          is_active: boolean | null
          permission: string
          project_id: string
          share_token: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          invited_email?: string | null
          is_active?: boolean | null
          permission?: string
          project_id: string
          share_token: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          invited_email?: string | null
          is_active?: boolean | null
          permission?: string
          project_id?: string
          share_token?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_shares_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          brand_id: string | null
          brand_system: Json | null
          canvas_data: Json | null
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          id: string
          is_featured: boolean | null
          is_template: boolean | null
          last_accessed_at: string | null
          remix_count: number | null
          template_category: string | null
          template_description: string | null
          template_tags: string[] | null
          thumbnail_url: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          brand_system?: Json | null
          canvas_data?: Json | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_template?: boolean | null
          last_accessed_at?: string | null
          remix_count?: number | null
          template_category?: string | null
          template_description?: string | null
          template_tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          brand_system?: Json | null
          canvas_data?: Json | null
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          id?: string
          is_featured?: boolean | null
          is_template?: boolean | null
          last_accessed_at?: string | null
          remix_count?: number | null
          template_category?: string | null
          template_description?: string | null
          template_tags?: string[] | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_code_redemptions: {
        Row: {
          id: string
          project_id: string | null
          promo_code_id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          id?: string
          project_id?: string | null
          promo_code_id: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          id?: string
          project_id?: string | null
          promo_code_id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_code_redemptions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "talent_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_code_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          active: boolean
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          max_uses: number | null
          scope: string
          used_count: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          description?: string | null
          discount_type: string
          discount_value: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          scope?: string
          used_count?: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          max_uses?: number | null
          scope?: string
          used_count?: number
        }
        Relationships: []
      }
      prompt_evolution_tracking: {
        Row: {
          common_additions: string[] | null
          common_removals: string[] | null
          created_at: string | null
          final_outcome: string | null
          final_successful_prompt: string | null
          generations_before_success: number | null
          id: string
          original_prompt: string
          project_id: string | null
          refined_prompts: string[] | null
          refinement_count: number | null
          session_id: string
          style_modifiers_used: string[] | null
          total_tokens_added: number | null
          total_tokens_removed: number | null
          user_id: string
        }
        Insert: {
          common_additions?: string[] | null
          common_removals?: string[] | null
          created_at?: string | null
          final_outcome?: string | null
          final_successful_prompt?: string | null
          generations_before_success?: number | null
          id?: string
          original_prompt: string
          project_id?: string | null
          refined_prompts?: string[] | null
          refinement_count?: number | null
          session_id: string
          style_modifiers_used?: string[] | null
          total_tokens_added?: number | null
          total_tokens_removed?: number | null
          user_id: string
        }
        Update: {
          common_additions?: string[] | null
          common_removals?: string[] | null
          created_at?: string | null
          final_outcome?: string | null
          final_successful_prompt?: string | null
          generations_before_success?: number | null
          id?: string
          original_prompt?: string
          project_id?: string | null
          refined_prompts?: string[] | null
          refinement_count?: number | null
          session_id?: string
          style_modifiers_used?: string[] | null
          total_tokens_added?: number | null
          total_tokens_removed?: number | null
          user_id?: string
        }
        Relationships: []
      }
      published_landing_pages: {
        Row: {
          analytics: Json
          custom_code: Json
          custom_domain: string | null
          domain_verification_token: string | null
          domain_verified: boolean
          favicon_url: string | null
          id: string
          integrations: Json
          is_active: boolean
          job_id: string | null
          meta_description: string | null
          og_image_url: string | null
          published_at: string
          settings: Json
          site_data: Json
          slug: string
          title: string | null
          unpublished_at: string | null
          updated_at: string
          user_id: string
          visit_count: number
        }
        Insert: {
          analytics?: Json
          custom_code?: Json
          custom_domain?: string | null
          domain_verification_token?: string | null
          domain_verified?: boolean
          favicon_url?: string | null
          id?: string
          integrations?: Json
          is_active?: boolean
          job_id?: string | null
          meta_description?: string | null
          og_image_url?: string | null
          published_at?: string
          settings?: Json
          site_data: Json
          slug: string
          title?: string | null
          unpublished_at?: string | null
          updated_at?: string
          user_id: string
          visit_count?: number
        }
        Update: {
          analytics?: Json
          custom_code?: Json
          custom_domain?: string | null
          domain_verification_token?: string | null
          domain_verified?: boolean
          favicon_url?: string | null
          id?: string
          integrations?: Json
          is_active?: boolean
          job_id?: string | null
          meta_description?: string | null
          og_image_url?: string | null
          published_at?: string
          settings?: Json
          site_data?: Json
          slug?: string
          title?: string | null
          unpublished_at?: string | null
          updated_at?: string
          user_id?: string
          visit_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "published_landing_pages_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "rumi_autonomous_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_images: {
        Row: {
          alt_text: string | null
          created_at: string | null
          description: string | null
          file_name: string
          id: string
          image_url: string
          project_id: string | null
          semantic_tags: string[] | null
          source: string | null
          style_keywords: string[] | null
          tags: string[] | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string | null
          description?: string | null
          file_name: string
          id?: string
          image_url: string
          project_id?: string | null
          semantic_tags?: string[] | null
          source?: string | null
          style_keywords?: string[] | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string | null
          description?: string | null
          file_name?: string
          id?: string
          image_url?: string
          project_id?: string | null
          semantic_tags?: string[] | null
          source?: string | null
          style_keywords?: string[] | null
          tags?: string[] | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reference_images_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_earnings: {
        Row: {
          id: string
          paid_out: number
          pending_payout: number
          successful_conversions: number
          total_credits_earned: number
          total_referrals: number
          total_revenue_earned: number
          updated_at: string
          user_id: string
        }
        Insert: {
          id?: string
          paid_out?: number
          pending_payout?: number
          successful_conversions?: number
          total_credits_earned?: number
          total_referrals?: number
          total_revenue_earned?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          id?: string
          paid_out?: number
          pending_payout?: number
          successful_conversions?: number
          total_credits_earned?: number
          total_referrals?: number
          total_revenue_earned?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_earnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          converted_at: string | null
          created_at: string
          credited_amount: number
          id: string
          plan_purchased: string | null
          referral_code_id: string
          referred_id: string | null
          referrer_id: string
          revenue_share_amount: number
          revenue_share_percent: number
          signed_up_at: string | null
          status: string
        }
        Insert: {
          converted_at?: string | null
          created_at?: string
          credited_amount?: number
          id?: string
          plan_purchased?: string | null
          referral_code_id: string
          referred_id?: string | null
          referrer_id: string
          revenue_share_amount?: number
          revenue_share_percent?: number
          signed_up_at?: string | null
          status?: string
        }
        Update: {
          converted_at?: string | null
          created_at?: string
          credited_amount?: number
          id?: string
          plan_purchased?: string | null
          referral_code_id?: string
          referred_id?: string | null
          referrer_id?: string
          revenue_share_amount?: number
          revenue_share_percent?: number
          signed_up_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      revenue_metrics: {
        Row: {
          active_users: number | null
          churned_subscriptions: number | null
          created_at: string | null
          credit_purchases: number | null
          id: string
          metric_date: string
          new_subscriptions: number | null
          new_users: number | null
          subscription_revenue: number | null
          total_credits_used: number | null
          total_generations: number | null
          total_revenue: number | null
        }
        Insert: {
          active_users?: number | null
          churned_subscriptions?: number | null
          created_at?: string | null
          credit_purchases?: number | null
          id?: string
          metric_date: string
          new_subscriptions?: number | null
          new_users?: number | null
          subscription_revenue?: number | null
          total_credits_used?: number | null
          total_generations?: number | null
          total_revenue?: number | null
        }
        Update: {
          active_users?: number | null
          churned_subscriptions?: number | null
          created_at?: string | null
          credit_purchases?: number | null
          id?: string
          metric_date?: string
          new_subscriptions?: number | null
          new_users?: number | null
          subscription_revenue?: number | null
          total_credits_used?: number | null
          total_generations?: number | null
          total_revenue?: number | null
        }
        Relationships: []
      }
      rumi_agent_actions: {
        Row: {
          action_data: Json
          action_type: string
          created_at: string
          error_message: string | null
          id: string
          job_id: string
          result_data: Json | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_data?: Json
          action_type: string
          created_at?: string
          error_message?: string | null
          id?: string
          job_id: string
          result_data?: Json | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_data?: Json
          action_type?: string
          created_at?: string
          error_message?: string | null
          id?: string
          job_id?: string
          result_data?: Json | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rumi_agent_actions_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "rumi_autonomous_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      rumi_autonomous_jobs: {
        Row: {
          asset_matrix: Json | null
          brand_id: string | null
          checkpoint: Json | null
          completed_at: string | null
          created_at: string | null
          error_message: string | null
          id: string
          objective: Json
          project_id: string | null
          scoring_output: Json | null
          started_at: string | null
          state: string
          strategy_output: Json | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          asset_matrix?: Json | null
          brand_id?: string | null
          checkpoint?: Json | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          objective: Json
          project_id?: string | null
          scoring_output?: Json | null
          started_at?: string | null
          state?: string
          strategy_output?: Json | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          asset_matrix?: Json | null
          brand_id?: string | null
          checkpoint?: Json | null
          completed_at?: string | null
          created_at?: string | null
          error_message?: string | null
          id?: string
          objective?: Json
          project_id?: string | null
          scoring_output?: Json | null
          started_at?: string | null
          state?: string
          strategy_output?: Json | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rumi_autonomous_jobs_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rumi_autonomous_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      rumi_content_proposals: {
        Row: {
          brand_id: string | null
          content_type: string
          copy_text: string | null
          created_at: string
          hashtags: string[] | null
          id: string
          image_prompt: string | null
          image_url: string | null
          iteration_count: number | null
          platform_specs: Json | null
          session_id: string | null
          status: string
          title: string
          user_feedback: string | null
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          content_type: string
          copy_text?: string | null
          created_at?: string
          hashtags?: string[] | null
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          iteration_count?: number | null
          platform_specs?: Json | null
          session_id?: string | null
          status?: string
          title: string
          user_feedback?: string | null
          user_id: string
        }
        Update: {
          brand_id?: string | null
          content_type?: string
          copy_text?: string | null
          created_at?: string
          hashtags?: string[] | null
          id?: string
          image_prompt?: string | null
          image_url?: string | null
          iteration_count?: number | null
          platform_specs?: Json | null
          session_id?: string | null
          status?: string
          title?: string
          user_feedback?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rumi_content_proposals_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rumi_content_proposals_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "rumi_creative_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      rumi_context_fusion_log: {
        Row: {
          brand_memory_used: boolean | null
          canvas_context_used: boolean | null
          created_at: string | null
          fusion_weights: Json | null
          historical_decisions_count: number | null
          id: string
          processing_time_ms: number | null
          result_summary: Json | null
          session_id: string | null
          tagged_assets_count: number | null
          tagged_projects_count: number | null
          user_id: string
        }
        Insert: {
          brand_memory_used?: boolean | null
          canvas_context_used?: boolean | null
          created_at?: string | null
          fusion_weights?: Json | null
          historical_decisions_count?: number | null
          id?: string
          processing_time_ms?: number | null
          result_summary?: Json | null
          session_id?: string | null
          tagged_assets_count?: number | null
          tagged_projects_count?: number | null
          user_id: string
        }
        Update: {
          brand_memory_used?: boolean | null
          canvas_context_used?: boolean | null
          created_at?: string | null
          fusion_weights?: Json | null
          historical_decisions_count?: number | null
          id?: string
          processing_time_ms?: number | null
          result_summary?: Json | null
          session_id?: string | null
          tagged_assets_count?: number | null
          tagged_projects_count?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rumi_context_fusion_log_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "rumi_creative_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      rumi_creative_sessions: {
        Row: {
          brand_id: string | null
          business_context: Json | null
          created_at: string
          id: string
          session_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          business_context?: Json | null
          created_at?: string
          id?: string
          session_type?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          business_context?: Json | null
          created_at?: string
          id?: string
          session_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rumi_creative_sessions_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      rumi_decision_cards: {
        Row: {
          brand_alignment_score: number | null
          business_reasoning: string | null
          created_at: string
          emotional_positioning: string | null
          id: string
          metadata: Json | null
          performance_probability: number | null
          risk_level: string
          session_id: string
          status: string
          title: string
          user_feedback: string | null
          visual_philosophy: string | null
        }
        Insert: {
          brand_alignment_score?: number | null
          business_reasoning?: string | null
          created_at?: string
          emotional_positioning?: string | null
          id?: string
          metadata?: Json | null
          performance_probability?: number | null
          risk_level?: string
          session_id: string
          status?: string
          title: string
          user_feedback?: string | null
          visual_philosophy?: string | null
        }
        Update: {
          brand_alignment_score?: number | null
          business_reasoning?: string | null
          created_at?: string
          emotional_positioning?: string | null
          id?: string
          metadata?: Json | null
          performance_probability?: number | null
          risk_level?: string
          session_id?: string
          status?: string
          title?: string
          user_feedback?: string | null
          visual_philosophy?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rumi_decision_cards_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "rumi_creative_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      rumi_decision_outcomes: {
        Row: {
          canvas_edits_count: number | null
          decision_card_id: string
          final_satisfaction: number | null
          id: string
          outcome_metadata: Json | null
          outcome_type: string
          recorded_at: string
        }
        Insert: {
          canvas_edits_count?: number | null
          decision_card_id: string
          final_satisfaction?: number | null
          id?: string
          outcome_metadata?: Json | null
          outcome_type: string
          recorded_at?: string
        }
        Update: {
          canvas_edits_count?: number | null
          decision_card_id?: string
          final_satisfaction?: number | null
          id?: string
          outcome_metadata?: Json | null
          outcome_type?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rumi_decision_outcomes_decision_card_id_fkey"
            columns: ["decision_card_id"]
            isOneToOne: false
            referencedRelation: "rumi_decision_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      rumi_job_logs: {
        Row: {
          agent_name: string
          confidence: number | null
          created_at: string | null
          duration_ms: number | null
          id: string
          input_summary: string | null
          job_id: string
          output_summary: string | null
          status: string
        }
        Insert: {
          agent_name: string
          confidence?: number | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          input_summary?: string | null
          job_id: string
          output_summary?: string | null
          status: string
        }
        Update: {
          agent_name?: string
          confidence?: number | null
          created_at?: string | null
          duration_ms?: number | null
          id?: string
          input_summary?: string | null
          job_id?: string
          output_summary?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "rumi_job_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "rumi_autonomous_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      rumi_learning_events: {
        Row: {
          brand_id: string | null
          context_snapshot: Json | null
          created_at: string | null
          decision_card_id: string | null
          id: string
          session_id: string | null
          signal_data: Json | null
          signal_type: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          context_snapshot?: Json | null
          created_at?: string | null
          decision_card_id?: string | null
          id?: string
          session_id?: string | null
          signal_data?: Json | null
          signal_type: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          context_snapshot?: Json | null
          created_at?: string | null
          decision_card_id?: string | null
          id?: string
          session_id?: string | null
          signal_data?: Json | null
          signal_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rumi_learning_events_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rumi_learning_events_decision_card_id_fkey"
            columns: ["decision_card_id"]
            isOneToOne: false
            referencedRelation: "rumi_decision_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rumi_learning_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "rumi_creative_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      rumi_taste_profile: {
        Row: {
          acceptance_rate: number | null
          brand_affinity: Json | null
          created_at: string
          decision_patterns: Json | null
          id: string
          preference_vectors: Json | null
          total_sessions: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          acceptance_rate?: number | null
          brand_affinity?: Json | null
          created_at?: string
          decision_patterns?: Json | null
          id?: string
          preference_vectors?: Json | null
          total_sessions?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          acceptance_rate?: number | null
          brand_affinity?: Json | null
          created_at?: string
          decision_patterns?: Json | null
          id?: string
          preference_vectors?: Json | null
          total_sessions?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_connectors: {
        Row: {
          access_token: string | null
          connected_at: string
          created_at: string
          id: string
          metadata: Json | null
          platform: string
          platform_user_id: string | null
          platform_username: string | null
          refresh_token: string | null
          status: string
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          connected_at?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          platform: string
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          connected_at?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          platform?: string
          platform_user_id?: string | null
          platform_username?: string | null
          refresh_token?: string | null
          status?: string
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_oauth_states: {
        Row: {
          code_verifier: string | null
          created_at: string
          expires_at: string
          id: string
          platform: string
          redirect_origin: string
          state_token: string
          user_id: string
        }
        Insert: {
          code_verifier?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          platform: string
          redirect_origin: string
          state_token: string
          user_id: string
        }
        Update: {
          code_verifier?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          platform?: string
          redirect_origin?: string
          state_token?: string
          user_id?: string
        }
        Relationships: []
      }
      social_post_analytics: {
        Row: {
          clicks: number | null
          comments: number | null
          fetched_at: string
          id: string
          impressions: number | null
          likes: number | null
          post_id: string
          reach: number | null
          shares: number | null
        }
        Insert: {
          clicks?: number | null
          comments?: number | null
          fetched_at?: string
          id?: string
          impressions?: number | null
          likes?: number | null
          post_id: string
          reach?: number | null
          shares?: number | null
        }
        Update: {
          clicks?: number | null
          comments?: number | null
          fetched_at?: string
          id?: string
          impressions?: number | null
          likes?: number | null
          post_id?: string
          reach?: number | null
          shares?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "social_post_analytics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "social_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_posts: {
        Row: {
          brand_id: string | null
          content_text: string | null
          created_at: string
          error_message: string | null
          id: string
          media_urls: Json | null
          platform: string
          post_url: string | null
          published_at: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          brand_id?: string | null
          content_text?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          media_urls?: Json | null
          platform: string
          post_url?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          brand_id?: string | null
          content_text?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          media_urls?: Json | null
          platform?: string
          post_url?: string | null
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_posts_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      style_guide_exports: {
        Row: {
          created_at: string | null
          expires_at: string | null
          export_data: Json
          export_format: string
          export_url: string | null
          id: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          export_data: Json
          export_format: string
          export_url?: string | null
          id?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          export_data?: Json
          export_format?: string
          export_url?: string | null
          id?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "style_guide_exports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          base_credits: number | null
          cogent_runs_monthly: number
          created_at: string
          credits_monthly: number
          description: string | null
          display_order: number | null
          features: Json | null
          id: string
          is_active: boolean | null
          name: string
          plan_tier: string | null
          price_inr: number
          price_usd: number | null
          tool_access: Json
          updated_at: string
          video_access: boolean | null
          video_cost_multiplier: number | null
        }
        Insert: {
          base_credits?: number | null
          cogent_runs_monthly?: number
          created_at?: string
          credits_monthly: number
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name: string
          plan_tier?: string | null
          price_inr: number
          price_usd?: number | null
          tool_access?: Json
          updated_at?: string
          video_access?: boolean | null
          video_cost_multiplier?: number | null
        }
        Update: {
          base_credits?: number | null
          cogent_runs_monthly?: number
          created_at?: string
          credits_monthly?: number
          description?: string | null
          display_order?: number | null
          features?: Json | null
          id?: string
          is_active?: boolean | null
          name?: string
          plan_tier?: string | null
          price_inr?: number
          price_usd?: number | null
          tool_access?: Json
          updated_at?: string
          video_access?: boolean | null
          video_cost_multiplier?: number | null
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          ticket_id: string
          user_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          ticket_id: string
          user_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          ticket_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_admin_id: string | null
          category: string
          created_at: string
          description: string
          escalated_at: string | null
          escalated_reason: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_admin_id?: string | null
          category: string
          created_at?: string
          description: string
          escalated_at?: string | null
          escalated_reason?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_admin_id?: string | null
          category?: string
          created_at?: string
          description?: string
          escalated_at?: string | null
          escalated_reason?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      system_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          created_at: string | null
          description: string | null
          id: string
          is_acknowledged: boolean | null
          is_active: boolean | null
          last_triggered_at: string | null
          severity: string | null
          threshold: Json
          title: string
          trigger_count: number | null
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_acknowledged?: boolean | null
          is_active?: boolean | null
          last_triggered_at?: string | null
          severity?: string | null
          threshold?: Json
          title: string
          trigger_count?: number | null
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_acknowledged?: boolean | null
          is_active?: boolean | null
          last_triggered_at?: string | null
          severity?: string | null
          threshold?: Json
          title?: string
          trigger_count?: number | null
        }
        Relationships: []
      }
      talent_call_notes: {
        Row: {
          action_items: Json
          created_at: string
          decisions: Json
          id: string
          meeting_id: string
          project_id: string
          risks: Json
          summary_md: string | null
          transcript_md: string | null
        }
        Insert: {
          action_items?: Json
          created_at?: string
          decisions?: Json
          id?: string
          meeting_id: string
          project_id: string
          risks?: Json
          summary_md?: string | null
          transcript_md?: string | null
        }
        Update: {
          action_items?: Json
          created_at?: string
          decisions?: Json
          id?: string
          meeting_id?: string
          project_id?: string
          risks?: Json
          summary_md?: string | null
          transcript_md?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "talent_call_notes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "talent_meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "talent_call_notes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "talent_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_escrow: {
        Row: {
          amount: number
          created_at: string
          freelancer_id: string | null
          id: string
          idempotency_key: string | null
          locked_at: string | null
          milestone_label: string | null
          project_id: string
          refunded_at: string | null
          released_at: string | null
          scheduled_for: string | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          freelancer_id?: string | null
          id?: string
          idempotency_key?: string | null
          locked_at?: string | null
          milestone_label?: string | null
          project_id: string
          refunded_at?: string | null
          released_at?: string | null
          scheduled_for?: string | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          freelancer_id?: string | null
          id?: string
          idempotency_key?: string | null
          locked_at?: string | null
          milestone_label?: string | null
          project_id?: string
          refunded_at?: string | null
          released_at?: string | null
          scheduled_for?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_escrow_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "talent_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_kyc: {
        Row: {
          ai_confidence: number | null
          ai_reasons: Json | null
          created_at: string
          digilocker_data: Json | null
          id: string
          id_back_path: string | null
          id_country: string | null
          id_front_path: string | null
          id_number_last4: string | null
          id_type: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          selfie_path: string | null
          status: string
          submitted_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_reasons?: Json | null
          created_at?: string
          digilocker_data?: Json | null
          id?: string
          id_back_path?: string | null
          id_country?: string | null
          id_front_path?: string | null
          id_number_last4?: string | null
          id_type?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_confidence?: number | null
          ai_reasons?: Json | null
          created_at?: string
          digilocker_data?: Json | null
          id?: string
          id_back_path?: string | null
          id_country?: string | null
          id_front_path?: string | null
          id_number_last4?: string | null
          id_type?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          selfie_path?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      talent_meeting_participants: {
        Row: {
          joined_at: string
          left_at: string | null
          meeting_id: string
          role: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          left_at?: string | null
          meeting_id: string
          role?: string
          user_id: string
        }
        Update: {
          joined_at?: string
          left_at?: string | null
          meeting_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_meeting_participants_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "talent_meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_meetings: {
        Row: {
          created_at: string
          duration_min: number
          ended_at: string | null
          host_user_id: string
          id: string
          project_id: string
          recording_url: string | null
          room_code: string
          scheduled_for: string | null
          started_at: string | null
          status: string
          title: string
        }
        Insert: {
          created_at?: string
          duration_min?: number
          ended_at?: string | null
          host_user_id: string
          id?: string
          project_id: string
          recording_url?: string | null
          room_code: string
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          title?: string
        }
        Update: {
          created_at?: string
          duration_min?: number
          ended_at?: string | null
          host_user_id?: string
          id?: string
          project_id?: string
          recording_url?: string | null
          room_code?: string
          scheduled_for?: string | null
          started_at?: string | null
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_meetings_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "talent_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_memory: {
        Row: {
          created_at: string
          id: string
          past_teams: Json | null
          preferences: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          past_teams?: Json | null
          preferences?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          past_teams?: Json | null
          preferences?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      talent_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          kind: string
          metadata: Json | null
          project_id: string
          read_at: string | null
          recipient_user_id: string | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json | null
          project_id: string
          read_at?: string | null
          recipient_user_id?: string | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json | null
          project_id?: string
          read_at?: string | null
          recipient_user_id?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "talent_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_payout_accounts: {
        Row: {
          account_holder: string
          account_number_encrypted: string
          account_number_last4: string
          bank_name: string
          country: string
          created_at: string
          currency: string
          id: string
          last_verification_at: string | null
          routing_or_ifsc: string | null
          swift: string | null
          updated_at: string
          user_id: string
          verification_attempts: number
          verification_details: Json | null
          verification_method: string | null
          verification_status: string
          verified: boolean
          verified_at: string | null
        }
        Insert: {
          account_holder: string
          account_number_encrypted: string
          account_number_last4: string
          bank_name: string
          country: string
          created_at?: string
          currency?: string
          id?: string
          last_verification_at?: string | null
          routing_or_ifsc?: string | null
          swift?: string | null
          updated_at?: string
          user_id: string
          verification_attempts?: number
          verification_details?: Json | null
          verification_method?: string | null
          verification_status?: string
          verified?: boolean
          verified_at?: string | null
        }
        Update: {
          account_holder?: string
          account_number_encrypted?: string
          account_number_last4?: string
          bank_name?: string
          country?: string
          created_at?: string
          currency?: string
          id?: string
          last_verification_at?: string | null
          routing_or_ifsc?: string | null
          swift?: string | null
          updated_at?: string
          user_id?: string
          verification_attempts?: number
          verification_details?: Json | null
          verification_method?: string | null
          verification_status?: string
          verified?: boolean
          verified_at?: string | null
        }
        Relationships: []
      }
      talent_payouts: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          payout_account_id: string
          processed_at: string | null
          provider_ref: string | null
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payout_account_id: string
          processed_at?: string | null
          provider_ref?: string | null
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          payout_account_id?: string
          processed_at?: string | null
          provider_ref?: string | null
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_payouts_payout_account_id_fkey"
            columns: ["payout_account_id"]
            isOneToOne: false
            referencedRelation: "talent_payout_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      talent_projects: {
        Row: {
          assigned_agency_id: string | null
          assigned_freelancer_id: string | null
          brief: Json | null
          client_signature_url: string | null
          client_signed_at: string | null
          compiled_brief_json: Json | null
          compiled_brief_md: string | null
          contract_md: string | null
          contract_meta: Json
          controls: Json | null
          created_at: string
          discount_amount: number
          explanation: Json | null
          extracted: Json | null
          freelancer_signature_url: string | null
          freelancer_signed_at: string | null
          freelancer_visible: boolean
          id: string
          linked_cosmo_id: string | null
          linked_project_id: string | null
          payment_plan: Json | null
          pricing: Json | null
          promo_code: string | null
          provider_preference: string
          reference_attachments: Json
          scope_md: string | null
          signed_contract_url: string | null
          status: string
          team_composition: Json | null
          timeline: Json | null
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_agency_id?: string | null
          assigned_freelancer_id?: string | null
          brief?: Json | null
          client_signature_url?: string | null
          client_signed_at?: string | null
          compiled_brief_json?: Json | null
          compiled_brief_md?: string | null
          contract_md?: string | null
          contract_meta?: Json
          controls?: Json | null
          created_at?: string
          discount_amount?: number
          explanation?: Json | null
          extracted?: Json | null
          freelancer_signature_url?: string | null
          freelancer_signed_at?: string | null
          freelancer_visible?: boolean
          id?: string
          linked_cosmo_id?: string | null
          linked_project_id?: string | null
          payment_plan?: Json | null
          pricing?: Json | null
          promo_code?: string | null
          provider_preference?: string
          reference_attachments?: Json
          scope_md?: string | null
          signed_contract_url?: string | null
          status?: string
          team_composition?: Json | null
          timeline?: Json | null
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_agency_id?: string | null
          assigned_freelancer_id?: string | null
          brief?: Json | null
          client_signature_url?: string | null
          client_signed_at?: string | null
          compiled_brief_json?: Json | null
          compiled_brief_md?: string | null
          contract_md?: string | null
          contract_meta?: Json
          controls?: Json | null
          created_at?: string
          discount_amount?: number
          explanation?: Json | null
          extracted?: Json | null
          freelancer_signature_url?: string | null
          freelancer_signed_at?: string | null
          freelancer_visible?: boolean
          id?: string
          linked_cosmo_id?: string | null
          linked_project_id?: string | null
          payment_plan?: Json | null
          pricing?: Json | null
          promo_code?: string | null
          provider_preference?: string
          reference_attachments?: Json
          scope_md?: string | null
          signed_contract_url?: string | null
          status?: string
          team_composition?: Json | null
          timeline?: Json | null
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "talent_projects_linked_project_id_fkey"
            columns: ["linked_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      think_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      think_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          metadata: Json | null
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "think_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "think_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_assets: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number
          height: number | null
          id: string
          mime_type: string
          project_id: string
          storage_url: string
          thumbnail_url: string | null
          user_id: string
          width: number | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size: number
          height?: number | null
          id?: string
          mime_type: string
          project_id: string
          storage_url: string
          thumbnail_url?: string | null
          user_id: string
          width?: number | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number
          height?: number | null
          id?: string
          mime_type?: string
          project_id?: string
          storage_url?: string
          thumbnail_url?: string | null
          user_id?: string
          width?: number | null
        }
        Relationships: []
      }
      user_activity_events: {
        Row: {
          created_at: string | null
          event_data: Json | null
          event_type: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          event_data?: Json | null
          event_type: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          event_data?: Json | null
          event_type?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_brand_systems: {
        Row: {
          brand_system: Json
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          brand_system: Json
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          brand_system?: Json
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_intent: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          intent: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          intent?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          intent?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_interaction_events: {
        Row: {
          active_tool: string | null
          canvas_x: number | null
          canvas_y: number | null
          event_category: string
          event_data: Json
          event_type: string
          id: string
          panel_states: Json | null
          project_id: string | null
          selected_object_types: string[] | null
          session_duration_ms: number | null
          session_id: string
          time_since_last_event_ms: number | null
          timestamp: string | null
          user_id: string
          viewport_x: number | null
          viewport_y: number | null
          zoom_level: number | null
        }
        Insert: {
          active_tool?: string | null
          canvas_x?: number | null
          canvas_y?: number | null
          event_category: string
          event_data?: Json
          event_type: string
          id?: string
          panel_states?: Json | null
          project_id?: string | null
          selected_object_types?: string[] | null
          session_duration_ms?: number | null
          session_id: string
          time_since_last_event_ms?: number | null
          timestamp?: string | null
          user_id: string
          viewport_x?: number | null
          viewport_y?: number | null
          zoom_level?: number | null
        }
        Update: {
          active_tool?: string | null
          canvas_x?: number | null
          canvas_y?: number | null
          event_category?: string
          event_data?: Json
          event_type?: string
          id?: string
          panel_states?: Json | null
          project_id?: string | null
          selected_object_types?: string[] | null
          session_duration_ms?: number | null
          session_id?: string
          time_since_last_event_ms?: number | null
          timestamp?: string | null
          user_id?: string
          viewport_x?: number | null
          viewport_y?: number | null
          zoom_level?: number | null
        }
        Relationships: []
      }
      user_notification_reads: {
        Row: {
          id: string
          notification_id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          id?: string
          notification_id: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          id?: string
          notification_id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "admin_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preference_vectors: {
        Row: {
          active_hours: Json | null
          color_preferences: Json | null
          confidence_score: number | null
          created_at: string | null
          id: string
          last_updated_at: string | null
          layout_preferences: Json | null
          preferred_models: Json | null
          prompt_style: Json | null
          session_patterns: Json | null
          style_affinities: Json | null
          tool_proficiency: Json | null
          total_generations: number | null
          total_interactions: number | null
          typography_preferences: Json | null
          user_id: string
        }
        Insert: {
          active_hours?: Json | null
          color_preferences?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          last_updated_at?: string | null
          layout_preferences?: Json | null
          preferred_models?: Json | null
          prompt_style?: Json | null
          session_patterns?: Json | null
          style_affinities?: Json | null
          tool_proficiency?: Json | null
          total_generations?: number | null
          total_interactions?: number | null
          typography_preferences?: Json | null
          user_id: string
        }
        Update: {
          active_hours?: Json | null
          color_preferences?: Json | null
          confidence_score?: number | null
          created_at?: string | null
          id?: string
          last_updated_at?: string | null
          layout_preferences?: Json | null
          preferred_models?: Json | null
          prompt_style?: Json | null
          session_patterns?: Json | null
          style_affinities?: Json | null
          tool_proficiency?: Json | null
          total_generations?: number | null
          total_interactions?: number | null
          typography_preferences?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      user_preferences: {
        Row: {
          created_at: string
          custom_sound_url: string | null
          notification_enabled: boolean
          notification_sound: string
          notification_volume: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_sound_url?: string | null
          notification_enabled?: boolean
          notification_sound?: string
          notification_volume?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_sound_url?: string | null
          notification_enabled?: boolean
          notification_sound?: string
          notification_volume?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          role?: Database["public"]["Enums"]["app_role"]
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
      user_sessions: {
        Row: {
          created_at: string | null
          device_type: string | null
          id: string
          ip_address: string | null
          is_active: boolean | null
          login_at: string | null
          logout_at: string | null
          session_token: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          login_at?: string | null
          logout_at?: string | null
          session_token?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          device_type?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean | null
          login_at?: string | null
          logout_at?: string | null
          session_token?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          auto_renew: boolean | null
          created_at: string
          end_date: string | null
          id: string
          payment_id: string | null
          plan_id: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean | null
          created_at?: string
          end_date?: string | null
          id?: string
          payment_id?: string | null
          plan_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean | null
          created_at?: string
          end_date?: string | null
          id?: string
          payment_id?: string | null
          plan_id?: string | null
          start_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      user_tour_progress: {
        Row: {
          completed_at: string | null
          current_step: number | null
          dropped_at_step: number | null
          id: string
          started_at: string | null
          tour_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          current_step?: number | null
          dropped_at_step?: number | null
          id?: string
          started_at?: string | null
          tour_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          current_step?: number | null
          dropped_at_step?: number | null
          id?: string
          started_at?: string | null
          tour_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tour_progress_tour_id_fkey"
            columns: ["tour_id"]
            isOneToOne: false
            referencedRelation: "app_tours"
            referencedColumns: ["id"]
          },
        ]
      }
      video_generation_jobs: {
        Row: {
          aspect_ratio: string | null
          completed_at: string | null
          created_at: string
          credits_charged: number
          duration: number
          error: string | null
          id: string
          output_video_url: string | null
          prediction_id: string
          progress: number | null
          project_id: string
          prompt: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          aspect_ratio?: string | null
          completed_at?: string | null
          created_at?: string
          credits_charged?: number
          duration?: number
          error?: string | null
          id?: string
          output_video_url?: string | null
          prediction_id: string
          progress?: number | null
          project_id: string
          prompt?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          aspect_ratio?: string | null
          completed_at?: string | null
          created_at?: string
          credits_charged?: number
          duration?: number
          error?: string | null
          id?: string
          output_video_url?: string | null
          prediction_id?: string
          progress?: number | null
          project_id?: string
          prompt?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      website_element_edits: {
        Row: {
          created_at: string
          edit_source: string
          field_path: string | null
          id: string
          instruction: string | null
          job_id: string | null
          new_value: Json | null
          page_id: string | null
          previous_value: Json | null
          section_index: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          edit_source?: string
          field_path?: string | null
          id?: string
          instruction?: string | null
          job_id?: string | null
          new_value?: Json | null
          page_id?: string | null
          previous_value?: Json | null
          section_index?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          edit_source?: string
          field_path?: string | null
          id?: string
          instruction?: string | null
          job_id?: string | null
          new_value?: Json | null
          page_id?: string | null
          previous_value?: Json | null
          section_index?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "website_element_edits_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "rumi_autonomous_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "website_element_edits_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "published_landing_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_collaborators: {
        Row: {
          cursor_color: string | null
          id: string
          is_online: boolean | null
          joined_at: string | null
          joined_via_share_id: string | null
          last_active_at: string | null
          permission: string
          user_id: string
          workflow_id: string
        }
        Insert: {
          cursor_color?: string | null
          id?: string
          is_online?: boolean | null
          joined_at?: string | null
          joined_via_share_id?: string | null
          last_active_at?: string | null
          permission?: string
          user_id: string
          workflow_id: string
        }
        Update: {
          cursor_color?: string | null
          id?: string
          is_online?: boolean | null
          joined_at?: string | null
          joined_via_share_id?: string | null
          last_active_at?: string | null
          permission?: string
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_collaborators_joined_via_share_id_fkey"
            columns: ["joined_via_share_id"]
            isOneToOne: false
            referencedRelation: "workflow_shares"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_collaborators_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_comment_replies: {
        Row: {
          comment_id: string
          content: string
          created_at: string | null
          id: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          comment_id: string
          content: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          comment_id?: string
          content?: string
          created_at?: string | null
          id?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_comment_replies_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "workflow_comments"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_comments: {
        Row: {
          content: string
          created_at: string | null
          id: string
          position_x: number
          position_y: number
          resolved: boolean | null
          updated_at: string | null
          user_id: string
          workflow_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          position_x: number
          position_y: number
          resolved?: boolean | null
          updated_at?: string | null
          user_id: string
          workflow_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          position_x?: number
          position_y?: number
          resolved?: boolean | null
          updated_at?: string | null
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_comments_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_edges: {
        Row: {
          created_at: string | null
          edge_id: string
          id: string
          source_handle: string | null
          source_node_id: string
          target_handle: string | null
          target_node_id: string
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          edge_id: string
          id?: string
          source_handle?: string | null
          source_node_id: string
          target_handle?: string | null
          target_node_id: string
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          edge_id?: string
          id?: string
          source_handle?: string | null
          source_node_id?: string
          target_handle?: string | null
          target_node_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_edges_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_executions: {
        Row: {
          completed_at: string | null
          credits_used: number | null
          error_message: string | null
          execution_data: Json | null
          id: string
          started_at: string | null
          status: string | null
          user_id: string
          workflow_id: string
        }
        Insert: {
          completed_at?: string | null
          credits_used?: number | null
          error_message?: string | null
          execution_data?: Json | null
          id?: string
          started_at?: string | null
          status?: string | null
          user_id: string
          workflow_id: string
        }
        Update: {
          completed_at?: string | null
          credits_used?: number | null
          error_message?: string | null
          execution_data?: Json | null
          id?: string
          started_at?: string | null
          status?: string | null
          user_id?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_executions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_forks: {
        Row: {
          created_at: string | null
          forked_by: string
          forked_workflow_id: string
          id: string
          original_workflow_id: string
        }
        Insert: {
          created_at?: string | null
          forked_by: string
          forked_workflow_id: string
          id?: string
          original_workflow_id: string
        }
        Update: {
          created_at?: string | null
          forked_by?: string
          forked_workflow_id?: string
          id?: string
          original_workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_forks_forked_workflow_id_fkey"
            columns: ["forked_workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_forks_original_workflow_id_fkey"
            columns: ["original_workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_nodes: {
        Row: {
          config: Json | null
          created_at: string | null
          id: string
          node_id: string
          node_type: string
          position_x: number
          position_y: number
          workflow_id: string
        }
        Insert: {
          config?: Json | null
          created_at?: string | null
          id?: string
          node_id: string
          node_type: string
          position_x: number
          position_y: number
          workflow_id: string
        }
        Update: {
          config?: Json | null
          created_at?: string | null
          id?: string
          node_id?: string
          node_type?: string
          position_x?: number
          position_y?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_nodes_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_shares: {
        Row: {
          created_at: string | null
          created_by: string
          expires_at: string | null
          id: string
          invited_email: string | null
          is_active: boolean | null
          permission: string
          share_token: string
          updated_at: string | null
          workflow_id: string
        }
        Insert: {
          created_at?: string | null
          created_by: string
          expires_at?: string | null
          id?: string
          invited_email?: string | null
          is_active?: boolean | null
          permission?: string
          share_token: string
          updated_at?: string | null
          workflow_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string
          expires_at?: string | null
          id?: string
          invited_email?: string | null
          is_active?: boolean | null
          permission?: string
          share_token?: string
          updated_at?: string | null
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_shares_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_versions: {
        Row: {
          change_description: string | null
          created_at: string | null
          created_by: string | null
          id: string
          snapshot: Json
          version_number: number
          workflow_id: string
        }
        Insert: {
          change_description?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          snapshot: Json
          version_number: number
          workflow_id: string
        }
        Update: {
          change_description?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          snapshot?: Json
          version_number?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_versions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          fork_count: number | null
          id: string
          is_public: boolean | null
          is_template: boolean | null
          tags: string[] | null
          template_category: string | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          user_id: string
          view_count: number | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          fork_count?: number | null
          id?: string
          is_public?: boolean | null
          is_template?: boolean | null
          tags?: string[] | null
          template_category?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id: string
          view_count?: number | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          fork_count?: number | null
          id?: string
          is_public?: boolean | null
          is_template?: boolean | null
          tags?: string[] | null
          template_category?: string | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          user_id?: string
          view_count?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      user_verification_status: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string | null
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_credits:
        | { Args: { _amount: number; _user_id: string }; Returns: undefined }
        | {
            Args: { _amount: number; _description?: string; _user_id: string }
            Returns: undefined
          }
      consume_cogent_run: { Args: { _user_id: string }; Returns: boolean }
      deduct_credits: {
        Args: { _amount: number; _description?: string; _user_id: string }
        Returns: boolean
      }
      deduct_talent_credits: {
        Args: { _amount: number; _description?: string; _user_id: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      generate_landing_slug: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_project_payouts_total: {
        Args: { _project_id: string }
        Returns: number
      }
      get_user_verification_status: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          expires_at: string
          id: string
          verified: boolean
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_landing_visit: {
        Args: { _page_id: string }
        Returns: undefined
      }
      is_project_owner: { Args: { p_project_id: string }; Returns: boolean }
      is_talent_project_participant: {
        Args: { _project_id: string; _user_id: string }
        Returns: boolean
      }
      lock_escrow_credits: {
        Args: {
          _amount: number
          _milestone?: string
          _project_id: string
          _user_id: string
        }
        Returns: string
      }
      lookup_active_referral_code: {
        Args: { _code: string }
        Returns: {
          code: string
          id: string
          is_active: boolean
        }[]
      }
      mark_payout_paid: {
        Args: { _payout_id: string; _provider_ref?: string }
        Returns: boolean
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      record_payment_completion: {
        Args: { _payment_id: string }
        Returns: Json
      }
      record_topup_completion: {
        Args: { _credits: number; _payment_id: string }
        Returns: Json
      }
      redeem_invite_code: { Args: { _code: string }; Returns: Json }
      refund_escrow_credits: { Args: { _escrow_id: string }; Returns: boolean }
      release_escrow_credits: { Args: { _escrow_id: string }; Returns: boolean }
      request_talent_payout: {
        Args: { _amount: number; _payout_account_id: string }
        Returns: string
      }
      tag_last_credit_transaction: {
        Args: { _event_type: string; _metadata?: Json; _user_id: string }
        Returns: string
      }
      update_block_display_orders: {
        Args: { block_orders: Json }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      feedback_status: "submitted" | "under_review" | "resolved" | "dismissed"
      feedback_type: "bug" | "improvement" | "feature" | "other"
      subscription_tier:
        | "free"
        | "pro"
        | "enterprise"
        | "starter"
        | "business"
        | "creator"
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
      app_role: ["admin", "user"],
      feedback_status: ["submitted", "under_review", "resolved", "dismissed"],
      feedback_type: ["bug", "improvement", "feature", "other"],
      subscription_tier: [
        "free",
        "pro",
        "enterprise",
        "starter",
        "business",
        "creator",
      ],
    },
  },
} as const
