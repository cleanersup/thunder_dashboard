/**
 * @module LineItemsFields
 * Las líneas de un documento que cobra: concepto, cantidad y precio.
 *
 * Jobs, invoices y estimates cobran lo mismo de la misma forma, pero cada uno
 * había dibujado sus filas por su cuenta y no se parecían: uno las ponía en una
 * sola línea y otro metía cada una en una tarjeta con su encabezado. Esto es la
 * versión de Jobs, que es la que lleva tiempo en uso.
 *
 * La fila es de una sola línea a propósito: un documento con ocho conceptos se
 * lee de un vistazo, y la comparación entre precios —que es lo que se está
 * mirando al revisar— queda en columna.
 */
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { FloatingInput } from "./FloatingInput";

/** Una línea, con los importes como texto porque salen de campos. */
export interface LineItemValue {
  /** Clave estable de la fila; no se muestra. */
  id: string;
  description: string;
  /** Entero en texto. */
  quantity: string;
  /** Decimal en texto. */
  unitPrice: string;
}

export type LineItemField = "description" | "quantity" | "unitPrice";

export interface LineItemsFieldsProps {
  items: readonly LineItemValue[];
  onChange: (index: number, field: LineItemField, value: string) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  /** Nombre de la primera columna: "Service" en jobs, "Description" en invoices. */
  descriptionLabel?: string;
  /**
   * Muestra el importe de cada línea. Una factura lo necesita porque el cliente
   * comprueba línea a línea; un job, que es interno, se queda con el total.
   */
  showLineTotal?: boolean;
  /** Marca en rojo las filas sin concepto. */
  invalid?: boolean;
  disabled?: boolean;
}

const lineTotal = (item: LineItemValue) =>
  (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0);

/** Botón para añadir una línea — va en el `action` del `FormSection`. */
export function AddLineItemButton({ onClick, disabled }: { onClick: () => void; disabled?: boolean }) {
  return (
    <Button type="button" size="sm" variant="outline" onClick={onClick} disabled={disabled}>
      <Plus className="h-3.5 w-3.5 mr-1" /> Add
    </Button>
  );
}

export function LineItemsFields({
  items,
  onChange,
  onRemove,
  onAdd,
  descriptionLabel = "Description",
  showLineTotal = false,
  invalid = false,
  disabled = false,
}: LineItemsFieldsProps) {
  // La papelera ocupa una columna fija para que todas las filas terminen
  // alineadas aunque el importe cambie de ancho.
  const columns = showLineTotal
    ? "grid-cols-[1fr_64px_88px_88px_32px]"
    : "grid-cols-[1fr_80px_100px_32px]";

  return (
    <>
      {items.map((item, idx) => (
        <div key={item.id} className={`grid ${columns} gap-2 items-start`}>
          <FloatingInput
            id={`item-desc-${item.id}`}
            label={descriptionLabel}
            value={item.description}
            onChange={(v) => onChange(idx, "description", v)}
            error={invalid && !item.description.trim()}
            disabled={disabled}
          />
          <FloatingInput
            id={`item-qty-${item.id}`}
            label="Qty"
            type="integer"
            value={item.quantity}
            onChange={(v) => onChange(idx, "quantity", v)}
            disabled={disabled}
          />
          <FloatingInput
            id={`item-price-${item.id}`}
            label="Price"
            type="decimal"
            value={item.unitPrice}
            onChange={(v) => onChange(idx, "unitPrice", v)}
            disabled={disabled}
          />

          {showLineTotal && (
            <div className="relative">
              <div className="flex h-12 items-center justify-end rounded-md border border-input bg-muted/40 px-2 text-sm font-medium tabular-nums">
                {lineTotal(item).toFixed(2)}
              </div>
              {/* El total es resultado, no campo: se nombra igual que los demás
                  para que la fila se lea, pero no se puede escribir en él. */}
              <Label className="pointer-events-none absolute left-2 top-0 -translate-y-1/2 bg-background px-1 text-xs text-muted-foreground">
                Total
              </Label>
            </div>
          )}

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Remove item"
            className="h-12 w-8 text-destructive hover:text-destructive"
            onClick={() => onRemove(idx)}
            disabled={disabled || items.length === 1}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      ))}

      {items.length === 0 && (
        <Button type="button" variant="outline" size="sm" onClick={onAdd} disabled={disabled}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add item
        </Button>
      )}
    </>
  );
}
