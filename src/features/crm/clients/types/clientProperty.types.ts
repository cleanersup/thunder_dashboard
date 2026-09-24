export interface ClientPropertyContact {
  id: string;
  user_id: string;
  property_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  role: string | null;
  is_primary_contact: boolean;
  created_at: string;
  updated_at: string;
}

export interface ClientPropertyContactFormData {
  full_name: string;
  phone: string;
  email: string;
  role: string;
  is_primary_contact: boolean;
}

export interface ClientProperty {
  id: string;
  user_id: string;
  client_id: string;
  title: string | null;
  street: string;
  apt_suite: string | null;
  city: string;
  state: string;
  zip_code: string;
  country: string | null;
  is_primary: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  client_property_contacts?: ClientPropertyContact[];
}

export interface ClientPropertyFormData {
  title: string;
  street: string;
  apt_suite: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  is_primary: boolean;
}
