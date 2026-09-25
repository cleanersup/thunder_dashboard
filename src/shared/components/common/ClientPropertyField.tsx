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
import { User, Mail, Phone, Building2 } from "lucide-react";
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
  /** Título de la sección. Por defecto "Client". */
  title?:     string;
  /**
   * Oculta el selector de propiedad. Para el caso en que el cliente no es un
   * registro real — una factura antigua cuyo cliente ya no existe, por ejemplo:
   * no hay propiedades que ofrecer y el selector solo confundiría.
   */
  showProperty?: boolean;
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
  title = "Client",
  showProperty = true,
  flush = false,
}: ClientPropertyFieldProps) {
  return (
    <FormSection
      icon={User}
      title={title}
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

      {showProperty && (
      <ServicePropertySelector
        clientId={client?.id}
        value={property}
        onChange={onPropertyChange}
        preferredPropertyId={preferredPropertyId}
      />
      )}

      {/* Resumen de contacto — sin dirección: dónde ocurre el servicio ya lo dice
          el selector de propiedad de arriba, y repetir aquí la dirección por defecto
          del cliente además contradice a la propiedad elegida cuando son distintas. */}
      {client && (
        <div className="space-y-3 rounded-md border border-border bg-muted/30 p-4">
          {[
            { icon: User,      label: "Full Name", value: client.full_name },
            { icon: Building2, label: "Company",   value: client.company ?? "" },
            { icon: Mail,      label: "Email",     value: client.email },
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
        </div>
      )}
    </FormSection>
  );
}
