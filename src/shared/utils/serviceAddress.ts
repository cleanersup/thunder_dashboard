/**
 * @module serviceAddress
 * Dirección de servicio denormalizada que se guarda EN el registro (walkthrough, job…).
 *
 * No basta con el FK a la propiedad: el detalle, el mapa y los PDFs leen estos campos
 * directamente, y deben seguir mostrando la dirección correcta aunque la propiedad se
 * edite o se borre después. Es lo que hace swift-slate — replicarlo o el mapa del
 * detalle queda vacío.
 */
import { formatPropertyTitle } from "./bookingPropertyLabel";

export interface ServiceAddressFields {
  service_street: string;
  service_apt:    string | null;
  service_city:   string;
  service_state:  string;
  service_zip:    string;
  property_title: string;
}

type PropertyLike = {
  street:      string;
  apt_suite?:  string | null;
  city:        string;
  state:       string;
  zip_code:    string;
  title?:      string | null;
  is_primary?: boolean;
};

/** Campos de dirección a partir de la propiedad elegida. `{}` si no hay propiedad. */
export function serviceAddressFieldsFromProperty(
  property: PropertyLike | null | undefined,
): ServiceAddressFields | Record<string, never> {
  if (!property) return {};

  return {
    service_street: property.street,
    service_apt:    property.apt_suite ?? null,
    service_city:   property.city,
    service_state:  property.state,
    service_zip:    property.zip_code,
    property_title: formatPropertyTitle(property.title ?? null, property.is_primary ?? false),
  };
}

/** Campos de dirección a partir de la dirección denormalizada de un booking. */
export function serviceAddressFieldsFromBooking(
  booking: {
    street?:    string | null;
    apt_suite?: string | null;
    city?:      string | null;
    state?:     string | null;
    zip_code?:  string | null;
  } | null | undefined,
  propertyTitle?: string | null,
): ServiceAddressFields | Record<string, never> {
  if (!booking?.street) return {};

  return {
    service_street: booking.street,
    service_apt:    booking.apt_suite ?? null,
    service_city:   booking.city     ?? "",
    service_state:  booking.state    ?? "",
    service_zip:    booking.zip_code ?? "",
    property_title: formatPropertyTitle(propertyTitle ?? null, false),
  };
}
