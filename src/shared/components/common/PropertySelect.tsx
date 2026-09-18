/**
 * @module PropertySelect
 * Selector canónico de propiedades de un cliente — el tercero de la familia,
 * junto a [ClientSelect] y [EmployeeSelect].
 *
 * Mismo `SearchableSelect` y mismo atajo "+ Add New Property" que sus hermanos: se
 * crea la propiedad desde el panel lateral y queda seleccionada en el campo que la
 * pidió, sin salir del formulario.
 *
 * Usage:
 *   <PropertySelect clientId={client.id} value={property} onChange={setProperty} />
 */
import { useState } from "react";
import { SearchableSelect } from "@/shared/components/ui/searchable-select";
import { PropertyForm } from "@/features/crm/clients/components/PropertyForm";
import { useClientProperties } from "@/features/crm/clients/hooks/useClientProperties";
import { formatPropertyLabel } from "@/shared/utils/propertyLabel";
import type { ClientProperty } from "@/features/crm/clients/types/clientProperty.types";

export interface PropertySelectProps {
  /** Cliente dueño de las propiedades. Sin él no hay nada que elegir ni que crear. */
  clientId: string | null | undefined;
  value: ClientProperty | null;
  onChange: (property: ClientProperty | null) => void;
  error?: boolean;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

export function PropertySelect({
  clientId,
  value,
  onChange,
  error = false,
  disabled = false,
  required = false,
  placeholder = "Select property",
}: PropertySelectProps) {
  const [showNew, setShowNew] = useState(false);
  const { data: properties = [], isLoading } = useClientProperties(clientId ?? undefined);

  const options = properties.map((p) => ({
    value:      p.id,
    label:      formatPropertyLabel(p),
    subtitle:   `${p.city}, ${p.state} ${p.zip_code}${p.is_primary ? " · Primary" : ""}`,
    searchText: `${p.title ?? ""} ${p.street} ${p.city} ${p.state} ${p.zip_code}`,
  }));

  return (
    <>
      <SearchableSelect
        value={value?.id}
        onValueChange={(id) => {
          const prop = properties.find((p) => p.id === id);
          if (prop) onChange(prop);
        }}
        options={options}
        placeholder={placeholder}
        title="Select Property"
        searchPlaceholder="Search properties..."
        emptyMessage={isLoading ? "Loading properties..." : "No properties found"}
        error={error}
        // Sin cliente no hay propiedades: el campo queda inerte en vez de abrir un
        // diálogo vacío o un formulario que no sabría a quién asociar la propiedad.
        disabled={disabled || !clientId}
        required={required}
        onAddNew={clientId ? () => setShowNew(true) : undefined}
        addNewLabel="Add New Property"
      />

      {clientId && (
        <PropertyForm
          open={showNew}
          onOpenChange={setShowNew}
          clientId={clientId}
          onSuccess={(created) => onChange(created)}
        />
      )}
    </>
  );
}
