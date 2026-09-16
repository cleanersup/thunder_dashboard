/**
 * @module ClientPropertyField
 * Sección **Client + Service Property** — la forma única de elegir a quién y dónde.
 *
 * Todo documento del negocio (request, walkthrough, estimate, job) necesita lo mismo:
 * un cliente, la propiedad donde ocurre el servicio y un resumen de contacto. Antes
 * cada formulario recomponía esas tres piezas a mano; aquí viven juntas una sola vez.
 *
 * Es controlado: el padre dueña `client` y `property` y arma su propio payload — este
 * componente no sabe nada de requests ni de walkthroughs (OCP).
 */
import { User, Mail, Phone, MapPin } from "lucide-react";
import { FormSection } from "@/shared/components/forms";
import { ClientSelect } from "./ClientSelect";
import { ServicePropertySelector } from "./ServicePropertySelector";
import type { ClientEntity } from "@/shared/types/entities";
import type { ClientProperty } from "@/features/crm/clients/types/clientProperty.types";

export interface ClientPropertyFieldProps {
  client:           ClientEntity | null;
  onClientChange:   (client: ClientEntity | null) => void;
  property:         ClientProperty | null;
  onPropertyChange: (property: ClientProperty | null) => void;
  /** Propiedad a preseleccionar cuando carguen las del cliente (edit / conversión). */
  preferredPropertyId?: string | null;
  /** Marca el título y el selector en rojo. */
  invalid?:   boolean;
  /** Mensaje bajo el selector cuando falta el cliente. */
  errorMessage?: string;
  subtitle?:  string;
  /** Sin bordes — modo página. */
  flush?:     boolean;
}

export function ClientPropertyField({
  client,
  onClientChange,
  property,
  onPropertyChange,
  preferredPropertyId,
  invalid = false,
  errorMessage = "Please select a client.",
  subtitle = "Who this is for and where the service happens",
  flush = false,
}: ClientPropertyFieldProps) {
  const addrLine1 = client
    ? [client.service_street, client.service_apt].filter(Boolean).join(" ")
    : "";
  const addrLine2 = client
    ? [client.service_city, `${client.service_state ?? ""} ${client.service_zip ?? ""}`.trim()]
        .filter(Boolean).join(", ")
    : "";

  return (
    <FormSection
      icon={User}
      title="Client"
      subtitle={subtitle}
      invalid={invalid}
      flush={flush}
    >
      <ClientSelect
        value={client?.id}
        selected={client}
        onChange={onClientChange}
        error={invalid}
        required
      />
      {invalid && <p className="text-xs text-destructive">{errorMessage}</p>}

      <ServicePropertySelector
        clientId={client?.id}
        value={property}
        onChange={onPropertyChange}
        preferredPropertyId={preferredPropertyId}
      />

      {client && (
        <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
          {[
            { icon: User,  label: "Full Name", value: client.full_name },
            { icon: Mail,  label: "Email",     value: client.email },
            { icon: Phone, label: "Phone",     value: client.phone },
          ].map(({ icon: Icon, label, value }) => value && (
            <div key={label} className="flex items-start gap-3">
              <Icon className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-medium">{value}</p>
              </div>
            </div>
          ))}
          {(addrLine1 || addrLine2) && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Address</p>
                <p className="text-sm font-medium">
                  {addrLine1}{addrLine1 && addrLine2 && <br />}{addrLine2}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </FormSection>
  );
}
