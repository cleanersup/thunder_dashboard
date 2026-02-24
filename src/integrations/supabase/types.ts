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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activities: {
        Row: {
          amount: number | null
          client_name: string | null
          created_at: string
          estimate_number: string | null
          id: string
          invoice_number: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          client_name?: string | null
          created_at?: string
          estimate_number?: string | null
          id?: string
          invoice_number?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number | null
          client_name?: string | null
          created_at?: string
          estimate_number?: string | null
          id?: string
          invoice_number?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      appointment_reminders_sent: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          reminder_type: string
          sent_at: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          reminder_type: string
          sent_at?: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          reminder_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_sent_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "route_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      booking_forms: {
        Row: {
          created_at: string
          custom_questions: Json
          form_type: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          custom_questions?: Json
          form_type: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          custom_questions?: Json
          form_type?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          additional_services: Json | null
          apt_suite: string | null
          bathrooms: number | null
          bedrooms: number | null
          business_owner_id: string
          city: string
          commercial_property_type: string | null
          created_at: string
          custom_answers: Json | null
          email: string
          id: string
          lead_name: string
          other_commercial_type: string | null
          phone: string
          preferred_date: string | null
          service_details: string | null
          service_type: string
          state: string
          status: string
          street: string
          time_preference: string | null
          updated_at: string
          zip_code: string
        }
        Insert: {
          additional_services?: Json | null
          apt_suite?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          business_owner_id: string
          city: string
          commercial_property_type?: string | null
          created_at?: string
          custom_answers?: Json | null
          email: string
          id?: string
          lead_name: string
          other_commercial_type?: string | null
          phone: string
          preferred_date?: string | null
          service_details?: string | null
          service_type: string
          state: string
          status?: string
          street: string
          time_preference?: string | null
          updated_at?: string
          zip_code: string
        }
        Update: {
          additional_services?: Json | null
          apt_suite?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          business_owner_id?: string
          city?: string
          commercial_property_type?: string | null
          created_at?: string
          custom_answers?: Json | null
          email?: string
          id?: string
          lead_name?: string
          other_commercial_type?: string | null
          phone?: string
          preferred_date?: string | null
          service_details?: string | null
          service_type?: string
          state?: string
          status?: string
          street?: string
          time_preference?: string | null
          updated_at?: string
          zip_code?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          billing_apt: string | null
          billing_city: string
          billing_state: string
          billing_street: string
          billing_zip: string
          client_type: string
          company: string | null
          contact_preference: string
          created_at: string
          email: string
          full_name: string
          id: string
          instructions: string | null
          phone: string
          service_apt: string | null
          service_city: string
          service_state: string
          service_street: string
          service_zip: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_apt?: string | null
          billing_city: string
          billing_state: string
          billing_street: string
          billing_zip: string
          client_type: string
          company?: string | null
          contact_preference: string
          created_at?: string
          email: string
          full_name: string
          id?: string
          instructions?: string | null
          phone: string
          service_apt?: string | null
          service_city: string
          service_state: string
          service_street: string
          service_zip: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_apt?: string | null
          billing_city?: string
          billing_state?: string
          billing_street?: string
          billing_zip?: string
          client_type?: string
          company?: string | null
          contact_preference?: string
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          instructions?: string | null
          phone?: string
          service_apt?: string | null
          service_city?: string
          service_state?: string
          service_street?: string
          service_zip?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      commercial_walkthrough_data: {
        Row: {
          cleaning_duration: string | null
          client_provides_supplies: boolean | null
          created_at: string
          employee_count: string | null
          extra_services: Json | null
          grease_level: string | null
          hourly_rate: string | null
          id: string
          notes: string | null
          photos: Json | null
          property_size: string | null
          property_type: string | null
          recurring_frequency: string | null
          restaurant_condition: string | null
          selected_week_days: Json | null
          service_schedule: string | null
          service_type: string | null
          start_time: string | null
          updated_at: string
          user_id: string
          walkthrough_id: string
        }
        Insert: {
          cleaning_duration?: string | null
          client_provides_supplies?: boolean | null
          created_at?: string
          employee_count?: string | null
          extra_services?: Json | null
          grease_level?: string | null
          hourly_rate?: string | null
          id?: string
          notes?: string | null
          photos?: Json | null
          property_size?: string | null
          property_type?: string | null
          recurring_frequency?: string | null
          restaurant_condition?: string | null
          selected_week_days?: Json | null
          service_schedule?: string | null
          service_type?: string | null
          start_time?: string | null
          updated_at?: string
          user_id: string
          walkthrough_id: string
        }
        Update: {
          cleaning_duration?: string | null
          client_provides_supplies?: boolean | null
          created_at?: string
          employee_count?: string | null
          extra_services?: Json | null
          grease_level?: string | null
          hourly_rate?: string | null
          id?: string
          notes?: string | null
          photos?: Json | null
          property_size?: string | null
          property_type?: string | null
          recurring_frequency?: string | null
          restaurant_condition?: string | null
          selected_week_days?: Json | null
          service_schedule?: string | null
          service_type?: string | null
          start_time?: string | null
          updated_at?: string
          user_id?: string
          walkthrough_id?: string
        }
        Relationships: []
      }
      employees: {
        Row: {
          additional_notes: string | null
          address: string | null
          apt_suite: string | null
          available_days: Json | null
          avatar_url: string | null
          birthday: string | null
          city: string | null
          created_at: string
          documents: Json | null
          email: string | null
          first_name: string
          gender: string
          hourly_pay: number | null
          hourly_rate: number | null
          id: string
          last_name: string
          phone: string | null
          position: string
          state: string | null
          status: string
          street: string | null
          timezone: string | null
          updated_at: string
          user_id: string
          zip: string | null
        }
        Insert: {
          additional_notes?: string | null
          address?: string | null
          apt_suite?: string | null
          available_days?: Json | null
          avatar_url?: string | null
          birthday?: string | null
          city?: string | null
          created_at?: string
          documents?: Json | null
          email?: string | null
          first_name: string
          gender: string
          hourly_pay?: number | null
          hourly_rate?: number | null
          id?: string
          last_name: string
          phone?: string | null
          position: string
          state?: string | null
          status?: string
          street?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
          zip?: string | null
        }
        Update: {
          additional_notes?: string | null
          address?: string | null
          apt_suite?: string | null
          available_days?: Json | null
          avatar_url?: string | null
          birthday?: string | null
          city?: string | null
          created_at?: string
          documents?: Json | null
          email?: string | null
          first_name?: string
          gender?: string
          hourly_pay?: number | null
          hourly_rate?: number | null
          id?: string
          last_name?: string
          phone?: string | null
          position?: string
          state?: string | null
          status?: string
          street?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
          zip?: string | null
        }
        Relationships: []
      }
      estimates: {
        Row: {
          additional_data: Json | null
          additional_items: Json | null
          address: string
          apt: string | null
          city: string
          client_name: string
          company_name: string | null
          created_at: string
          discount_type: string | null
          discount_value: number | null
          email: string
          estimate_date: string
          extra_services: Json | null
          id: string
          labor_cost: number | null
          laundry: string | null
          main_data: Json | null
          overhead_cost: number | null
          pets: string | null
          phone: string
          public_share_token: string | null
          service_scope: string | null
          service_sub_type: string | null
          service_type: string
          state: string
          status: string
          subtotal: number
          supplies_cost: number | null
          total: number
          total_operation_cost: number | null
          updated_at: string
          user_id: string
          viewed_at: string | null
          zip: string
        }
        Insert: {
          additional_data?: Json | null
          additional_items?: Json | null
          address: string
          apt?: string | null
          city: string
          client_name: string
          company_name?: string | null
          created_at?: string
          discount_type?: string | null
          discount_value?: number | null
          email: string
          estimate_date?: string
          extra_services?: Json | null
          id?: string
          labor_cost?: number | null
          laundry?: string | null
          main_data?: Json | null
          overhead_cost?: number | null
          pets?: string | null
          phone: string
          public_share_token?: string | null
          service_scope?: string | null
          service_sub_type?: string | null
          service_type: string
          state: string
          status?: string
          subtotal: number
          supplies_cost?: number | null
          total: number
          total_operation_cost?: number | null
          updated_at?: string
          user_id: string
          viewed_at?: string | null
          zip: string
        }
        Update: {
          additional_data?: Json | null
          additional_items?: Json | null
          address?: string
          apt?: string | null
          city?: string
          client_name?: string
          company_name?: string | null
          created_at?: string
          discount_type?: string | null
          discount_value?: number | null
          email?: string
          estimate_date?: string
          extra_services?: Json | null
          id?: string
          labor_cost?: number | null
          laundry?: string | null
          main_data?: Json | null
          overhead_cost?: number | null
          pets?: string | null
          phone?: string
          public_share_token?: string | null
          service_scope?: string | null
          service_sub_type?: string | null
          service_type?: string
          state?: string
          status?: string
          subtotal?: number
          supplies_cost?: number | null
          total?: number
          total_operation_cost?: number | null
          updated_at?: string
          user_id?: string
          viewed_at?: string | null
          zip?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          address: string
          apt: string | null
          attachments: Json | null
          cheque_number: string | null
          city: string
          client_name: string
          company_name: string | null
          created_at: string
          discount_type: string | null
          discount_value: number | null
          due_date: string
          email: string
          id: string
          invoice_date: string
          invoice_name: string | null
          invoice_number: string
          line_items: Json | null
          notes: string | null
          paid_date: string | null
          payment_method: string | null
          phone: string
          reminder_sent: boolean
          service_type: string
          state: string
          status: string
          tax_rate: number | null
          total: number
          updated_at: string
          user_id: string
          viewed_at: string | null
          zip: string
        }
        Insert: {
          address: string
          apt?: string | null
          attachments?: Json | null
          cheque_number?: string | null
          city: string
          client_name: string
          company_name?: string | null
          created_at?: string
          discount_type?: string | null
          discount_value?: number | null
          due_date: string
          email: string
          id?: string
          invoice_date: string
          invoice_name?: string | null
          invoice_number: string
          line_items?: Json | null
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          phone: string
          reminder_sent?: boolean
          service_type: string
          state: string
          status: string
          tax_rate?: number | null
          total: number
          updated_at?: string
          user_id: string
          viewed_at?: string | null
          zip: string
        }
        Update: {
          address?: string
          apt?: string | null
          attachments?: Json | null
          cheque_number?: string | null
          city?: string
          client_name?: string
          company_name?: string | null
          created_at?: string
          discount_type?: string | null
          discount_value?: number | null
          due_date?: string
          email?: string
          id?: string
          invoice_date?: string
          invoice_name?: string | null
          invoice_number?: string
          line_items?: Json | null
          notes?: string | null
          paid_date?: string | null
          payment_method?: string | null
          phone?: string
          reminder_sent?: boolean
          service_type?: string
          state?: string
          status?: string
          tax_rate?: number | null
          total?: number
          updated_at?: string
          user_id?: string
          viewed_at?: string | null
          zip?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          address: string
          apt_suite: string | null
          city: string
          company_name: string | null
          created_at: string
          decision_result: string | null
          email: string
          estimate_budget: number | null
          files: Json | null
          full_name: string
          id: string
          internal_notes: string | null
          lead_source: string
          next_followup_date: string | null
          phone: string
          priority_level: string
          referral_company: string | null
          referral_name: string | null
          service_interested: string
          state: string
          status: string
          updated_at: string
          user_id: string
          walkthrough_date: string | null
          walkthrough_time: string | null
          zip_code: string
        }
        Insert: {
          address: string
          apt_suite?: string | null
          city: string
          company_name?: string | null
          created_at?: string
          decision_result?: string | null
          email: string
          estimate_budget?: number | null
          files?: Json | null
          full_name: string
          id?: string
          internal_notes?: string | null
          lead_source: string
          next_followup_date?: string | null
          phone: string
          priority_level: string
          referral_company?: string | null
          referral_name?: string | null
          service_interested: string
          state: string
          status?: string
          updated_at?: string
          user_id: string
          walkthrough_date?: string | null
          walkthrough_time?: string | null
          zip_code: string
        }
        Update: {
          address?: string
          apt_suite?: string | null
          city?: string
          company_name?: string | null
          created_at?: string
          decision_result?: string | null
          email?: string
          estimate_budget?: number | null
          files?: Json | null
          full_name?: string
          id?: string
          internal_notes?: string | null
          lead_source?: string
          next_followup_date?: string | null
          phone?: string
          priority_level?: string
          referral_company?: string | null
          referral_name?: string | null
          service_interested?: string
          state?: string
          status?: string
          updated_at?: string
          user_id?: string
          walkthrough_date?: string | null
          walkthrough_time?: string | null
          zip_code?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          related_id: string | null
          related_type: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          related_id?: string | null
          related_type?: string | null
          title: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          attempts: number | null
          created_at: string | null
          employee_id: string | null
          expires_at: string
          id: string
          otp_code: string
          phone_number: string
          verified: boolean | null
        }
        Insert: {
          attempts?: number | null
          created_at?: string | null
          employee_id?: string | null
          expires_at: string
          id?: string
          otp_code: string
          phone_number: string
          verified?: boolean | null
        }
        Update: {
          attempts?: number | null
          created_at?: string | null
          employee_id?: string | null
          expires_at?: string
          id?: string
          otp_code?: string
          phone_number?: string
          verified?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "otp_codes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      paid_periods: {
        Row: {
          created_at: string
          employee_id: string
          end_date: string
          id: string
          start_date: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          end_date: string
          id?: string
          start_date: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          end_date?: string
          id?: string
          start_date?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          company_address: string | null
          company_apt_suite: string | null
          company_city: string | null
          company_email: string | null
          company_logo: string | null
          company_name: string | null
          company_phone: string | null
          company_state: string | null
          company_zip: string | null
          created_at: string
          first_name: string
          id: string
          last_name: string
          phone_number: string | null
          referral_code: string | null
          state: string | null
          timezone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          company_address?: string | null
          company_apt_suite?: string | null
          company_city?: string | null
          company_email?: string | null
          company_logo?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_state?: string | null
          company_zip?: string | null
          created_at?: string
          first_name: string
          id?: string
          last_name: string
          phone_number?: string | null
          referral_code?: string | null
          state?: string | null
          timezone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          company_address?: string | null
          company_apt_suite?: string | null
          company_city?: string | null
          company_email?: string | null
          company_logo?: string | null
          company_name?: string | null
          company_phone?: string | null
          company_state?: string | null
          company_zip?: string | null
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          phone_number?: string | null
          referral_code?: string | null
          state?: string | null
          timezone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      residential_walkthrough_data: {
        Row: {
          bedrooms: string | null
          blinds: string | null
          created_at: string
          dining_room: string | null
          extra_services: Json | null
          fans: string | null
          full_bath: string | null
          half_bath: string | null
          has_pets: string | null
          id: string
          kitchen: string | null
          living_room: string | null
          notes: string | null
          office: string | null
          oven: string | null
          photos: Json | null
          property_type: string | null
          refrigerator: string | null
          service_type: string | null
          square_footage: string | null
          updated_at: string
          user_id: string
          walkthrough_id: string
          windows_inside: string | null
          windows_outside: string | null
        }
        Insert: {
          bedrooms?: string | null
          blinds?: string | null
          created_at?: string
          dining_room?: string | null
          extra_services?: Json | null
          fans?: string | null
          full_bath?: string | null
          half_bath?: string | null
          has_pets?: string | null
          id?: string
          kitchen?: string | null
          living_room?: string | null
          notes?: string | null
          office?: string | null
          oven?: string | null
          photos?: Json | null
          property_type?: string | null
          refrigerator?: string | null
          service_type?: string | null
          square_footage?: string | null
          updated_at?: string
          user_id: string
          walkthrough_id: string
          windows_inside?: string | null
          windows_outside?: string | null
        }
        Update: {
          bedrooms?: string | null
          blinds?: string | null
          created_at?: string
          dining_room?: string | null
          extra_services?: Json | null
          fans?: string | null
          full_bath?: string | null
          half_bath?: string | null
          has_pets?: string | null
          id?: string
          kitchen?: string | null
          living_room?: string | null
          notes?: string | null
          office?: string | null
          oven?: string | null
          photos?: Json | null
          property_type?: string | null
          refrigerator?: string | null
          service_type?: string | null
          square_footage?: string | null
          updated_at?: string
          user_id?: string
          walkthrough_id?: string
          windows_inside?: string | null
          windows_outside?: string | null
        }
        Relationships: []
      }
      route_appointments: {
        Row: {
          assigned_employees: Json | null
          cleaning_type: string | null
          client_id: string
          created_at: string
          delivery_method: string | null
          deposit_amount: number | null
          deposit_required: string | null
          end_datetime: string | null
          end_time: string | null
          estimate_id: string | null
          id: string
          notes: string | null
          photos: Json | null
          recurring_duration: string | null
          recurring_duration_unit: string | null
          recurring_frequency: string | null
          route_id: string
          scheduled_date: string
          scheduled_datetime: string | null
          scheduled_time: string | null
          selected_week_days: Json | null
          service_type: string | null
          status: string
          updated_at: string
          uploaded_file: string | null
          user_id: string
        }
        Insert: {
          assigned_employees?: Json | null
          cleaning_type?: string | null
          client_id: string
          created_at?: string
          delivery_method?: string | null
          deposit_amount?: number | null
          deposit_required?: string | null
          end_datetime?: string | null
          end_time?: string | null
          estimate_id?: string | null
          id?: string
          notes?: string | null
          photos?: Json | null
          recurring_duration?: string | null
          recurring_duration_unit?: string | null
          recurring_frequency?: string | null
          route_id: string
          scheduled_date: string
          scheduled_datetime?: string | null
          scheduled_time?: string | null
          selected_week_days?: Json | null
          service_type?: string | null
          status?: string
          updated_at?: string
          uploaded_file?: string | null
          user_id: string
        }
        Update: {
          assigned_employees?: Json | null
          cleaning_type?: string | null
          client_id?: string
          created_at?: string
          delivery_method?: string | null
          deposit_amount?: number | null
          deposit_required?: string | null
          end_datetime?: string | null
          end_time?: string | null
          estimate_id?: string | null
          id?: string
          notes?: string | null
          photos?: Json | null
          recurring_duration?: string | null
          recurring_duration_unit?: string | null
          recurring_frequency?: string | null
          route_id?: string
          scheduled_date?: string
          scheduled_datetime?: string | null
          scheduled_time?: string | null
          selected_week_days?: Json | null
          service_type?: string | null
          status?: string
          updated_at?: string
          uploaded_file?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "route_appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_appointments_estimate_id_fkey"
            columns: ["estimate_id"]
            isOneToOne: false
            referencedRelation: "estimates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "route_appointments_route_id_fkey"
            columns: ["route_id"]
            isOneToOne: false
            referencedRelation: "routes"
            referencedColumns: ["id"]
          },
        ]
      }
      routes: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_employees: Json | null
          client_id: string | null
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_employees?: Json | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority: string
          status: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_employees?: Json | null
          client_id?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      time_entries: {
        Row: {
          break_end_time: string | null
          break_start_time: string | null
          clock_in_latitude: number | null
          clock_in_longitude: number | null
          clock_in_time: string | null
          clock_out_latitude: number | null
          clock_out_longitude: number | null
          clock_out_time: string | null
          created_at: string
          date: string
          employee_id: string
          id: string
          notes: string | null
          route_appointment_id: string | null
          status: string
          total_break_minutes: number | null
          total_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          break_end_time?: string | null
          break_start_time?: string | null
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_in_time?: string | null
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          clock_out_time?: string | null
          created_at?: string
          date?: string
          employee_id: string
          id?: string
          notes?: string | null
          route_appointment_id?: string | null
          status?: string
          total_break_minutes?: number | null
          total_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          break_end_time?: string | null
          break_start_time?: string | null
          clock_in_latitude?: number | null
          clock_in_longitude?: number | null
          clock_in_time?: string | null
          clock_out_latitude?: number | null
          clock_out_longitude?: number | null
          clock_out_time?: string | null
          created_at?: string
          date?: string
          employee_id?: string
          id?: string
          notes?: string | null
          route_appointment_id?: string | null
          status?: string
          total_break_minutes?: number | null
          total_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_time_entries_employee"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_route_appointment_id_fkey"
            columns: ["route_appointment_id"]
            isOneToOne: false
            referencedRelation: "route_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      walkthrough_reminders_sent: {
        Row: {
          created_at: string
          id: string
          reminder_type: string
          sent_at: string
          walkthrough_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reminder_type: string
          sent_at?: string
          walkthrough_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reminder_type?: string
          sent_at?: string
          walkthrough_id?: string
        }
        Relationships: []
      }
      walkthroughs: {
        Row: {
          assigned_employees: Json | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          duration: number | null
          estimate_sent_at: string | null
          id: string
          lead_id: string | null
          notes: string | null
          scheduled_date: string
          scheduled_time: string
          service_type: string
          status: string
          updated_at: string
          user_id: string
          walkthrough_type: string
        }
        Insert: {
          assigned_employees?: Json | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration?: number | null
          estimate_sent_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          scheduled_date: string
          scheduled_time: string
          service_type: string
          status?: string
          updated_at?: string
          user_id: string
          walkthrough_type: string
        }
        Update: {
          assigned_employees?: Json | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration?: number | null
          estimate_sent_at?: string | null
          id?: string
          lead_id?: string | null
          notes?: string | null
          scheduled_date?: string
          scheduled_time?: string
          service_type?: string
          status?: string
          updated_at?: string
          user_id?: string
          walkthrough_type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      cleanup_expired_otps: { Args: never; Returns: undefined }
      generate_estimate_share_token: {
        Args: { estimate_id: string }
        Returns: string
      }
      is_valid_employee_for_entry: {
        Args: { _employee_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
