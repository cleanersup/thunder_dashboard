import { useEffect, useRef } from "react";
import { MapPin } from "lucide-react";
import { SearchableSelect } from "@/shared/components/ui/searchable-select";
import { useClientProperties } from "@/features/crm/clients/hooks/useClientProperties";
import type { ClientProperty } from "@/features/crm/clients/types/clientProperty.types";

interface ServicePropertySelectorProps {
  clientId: string | null | undefined;
  value: ClientProperty | null;
  onChange: (property: ClientProperty | null) => void;
  preferredPropertyId?: string | null;
}

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

  if (!clientId || properties.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium text-foreground">Service Property</p>
        <p className="text-xs text-muted-foreground">Select where the service will be performed</p>
      </div>

      <SearchableSelect
        value={value?.id}
        onValueChange={(id) => {
          const prop = properties.find((p) => p.id === id);
          if (prop) onChange(prop);
        }}
        options={properties.map((p) => ({
          value:    p.id,
          label:    p.title ? `${p.title} — ${p.street}` : p.street,
          subtitle: `${p.city}, ${p.state} ${p.zip_code}${p.is_primary ? " · Primary" : ""}`,
        }))}
        placeholder="Select property..."
        title="Select Property"
        searchPlaceholder="Search properties..."
        emptyMessage="No properties found."
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
