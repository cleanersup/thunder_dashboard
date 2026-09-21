import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import { PropertySelect } from "./PropertySelect";
import { useClientProperties } from "@/features/crm/clients/hooks/useClientProperties";
import type { ClientProperty } from "@/features/crm/clients/types/clientProperty.types";

interface ServicePropertySelectorProps {
  clientId: string | null | undefined;
  value: ClientProperty | null;
  onChange: (property: ClientProperty | null) => void;
  preferredPropertyId?: string | null;
}

/**
 * Campo "Service Property" — el selector canónico ([PropertySelect]) más la
 * preselección automática y el resumen de la dirección elegida.
 *
 * Auto-selecciona al cargar: la propiedad indicada (edit / conversión) o la primary,
 * porque en la práctica casi siempre es esa y obligar a elegirla sería ruido.
 */
export function ServicePropertySelector({
  clientId,
  value,
  onChange,
  preferredPropertyId,
}: ServicePropertySelectorProps) {
  const { data: properties = [] } = useClientProperties(clientId ?? undefined);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!clientId) {
      onChangeRef.current(null);
      return;
    }
    if (properties.length === 0) return;
    if (value && properties.some((p) => p.id === value.id)) return;

    if (preferredPropertyId) {
      const preferred = properties.find((p) => p.id === preferredPropertyId);
      if (preferred) {
        onChangeRef.current(preferred);
        return;
      }
    }

    const primary = properties.find((p) => p.is_primary) ?? properties[0];
    onChangeRef.current(primary);
  }, [clientId, properties, value, preferredPropertyId]);

  // Sin cliente no hay nada que elegir. Con cliente el campo se muestra SIEMPRE,
  // aunque no tenga propiedades todavía: es desde aquí que se crea la primera.
  if (!clientId) return null;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Service Property</p>
        <p className="text-xs text-muted-foreground">Select the property where the service will be performed</p>
      </div>

      <PropertySelect
        clientId={clientId}
        value={value}
        onChange={onChange}
        placeholder={properties.length === 0 ? "No properties yet — add one" : "Select property"}
      />

      {value && (
        <div className="flex items-start gap-2 text-sm">
          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div>
            <p className="text-xs text-muted-foreground">Selected Address</p>
            <p className="font-medium">
              {value.street}{value.apt_suite ? ` ${value.apt_suite}` : ""}
            </p>
            <p className="text-muted-foreground">{value.city}, {value.state} {value.zip_code}</p>
          </div>
        </div>
      )}
    </div>
  );
}
