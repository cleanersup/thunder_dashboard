/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/integrations/supabase/client";
import type {
  ClientProperty,
  ClientPropertyFormData,
  ClientPropertyContact,
  ClientPropertyContactFormData,
} from "../types/clientProperty.types";

export const clientPropertyService = {
  /**
   * Fetches all active properties for a client, ordered primary first.
   * @param clientId - The client UUID
   */
  async getByClientId(clientId: string): Promise<ClientProperty[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await (supabase as any)
      .from("client_properties")
      .select("*, client_property_contacts(*)")
      .eq("client_id", clientId)
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) throw error;
    return data as ClientProperty[];
  },

  /**
   * Creates a new property for a client.
   * If is_primary is true, clears primary flag on all other properties first.
   * @param clientId - The client UUID
   * @param form - Property form data
   */
  async create(clientId: string, form: ClientPropertyFormData): Promise<ClientProperty> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    if (form.is_primary) {
      await (supabase as any)
        .from("client_properties")
        .update({ is_primary: false })
        .eq("client_id", clientId)
        .eq("user_id", user.id);
    }

    const { data, error } = await (supabase as any)
      .from("client_properties")
      .insert({
        user_id:   user.id,
        client_id: clientId,
        title:     form.title || null,
        street:    form.street,
        apt_suite: form.apt_suite || null,
        city:      form.city,
        state:     form.state,
        zip_code:  form.zip_code,
        country:   form.country || null,
        is_primary: form.is_primary,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ClientProperty;
  },

  /**
   * Updates an existing property.
   * @param id - The property UUID
   * @param form - Updated property data
   * @param clientId - Required when is_primary is true to clear other primaries
   */
  async update(id: string, form: ClientPropertyFormData, clientId?: string): Promise<ClientProperty> {
    if (form.is_primary && clientId) {
      await (supabase as any)
        .from("client_properties")
        .update({ is_primary: false })
        .eq("client_id", clientId)
        .neq("id", id);
    }

    const { data, error } = await (supabase as any)
      .from("client_properties")
      .update({
        title:     form.title || null,
        street:    form.street,
        apt_suite: form.apt_suite || null,
        city:      form.city,
        state:     form.state,
        zip_code:  form.zip_code,
        country:   form.country || null,
        is_primary: form.is_primary,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as ClientProperty;
  },

  /**
   * Soft-deletes a property by setting is_active = false.
   * @param id - The property UUID
   */
  async remove(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("client_properties")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Marks a property as primary.
   * @param id - The property UUID
   */
  async setPrimary(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("client_properties")
      .update({ is_primary: true })
      .eq("id", id);

    if (error) throw error;
  },

  /**
   * Creates a contact associated with a property.
   * @param propertyId - The property UUID
   * @param form - Contact form data
   */
  async createContact(propertyId: string, form: ClientPropertyContactFormData): Promise<ClientPropertyContact> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await (supabase as any)
      .from("client_property_contacts")
      .insert({
        user_id:            user.id,
        property_id:        propertyId,
        full_name:          form.full_name,
        phone:              form.phone || null,
        email:              form.email || null,
        role:               form.role || null,
        is_primary_contact: form.is_primary_contact,
      })
      .select()
      .single();

    if (error) throw error;
    return data as ClientPropertyContact;
  },

  /**
   * Updates an existing property contact.
   * @param id - The contact UUID
   * @param form - Updated contact data
   */
  async updateContact(id: string, form: ClientPropertyContactFormData): Promise<ClientPropertyContact> {
    const { data, error } = await (supabase as any)
      .from("client_property_contacts")
      .update({
        full_name:          form.full_name,
        phone:              form.phone || null,
        email:              form.email || null,
        role:               form.role || null,
        is_primary_contact: form.is_primary_contact,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    return data as ClientPropertyContact;
  },

  /**
   * Deletes a property contact.
   * @param id - The contact UUID
   */
  async deleteContact(id: string): Promise<void> {
    const { error } = await (supabase as any)
      .from("client_property_contacts")
      .delete()
      .eq("id", id);

    if (error) throw error;
  },
};
