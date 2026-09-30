/**
 * @module PricingFields
 * Descuento, impuesto y depósito sobre un subtotal.
 *
 * El patrón es el de Jobs: cada concepto empieza apagado con un interruptor y
 * solo despliega sus campos cuando se activa. Un documento sin descuento —que
 * son casi todos— se queda en tres líneas en lugar de enseñar campos vacíos que
 * hay que leer para descartar.
 *
 * Invoices lo hacía al revés, con los campos siempre a la vista y los totales en
 * una caja aparte, así que la misma operación se veía distinta según dónde se
 * cobrara.
 */
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { FloatingInput } from "./FloatingInput";
import { SelectField, type SelectFieldOption } from "./SelectField";

/** Importe con su rótulo. `tone` tiñe de rojo lo que resta. */
function AmountRow({
  label, amount, tone = "normal", strong = false,
}: {
  label: string;
  amount: number;
  tone?: "normal" | "negative";
  strong?: boolean;
}) {
  return (
    <div className={`flex justify-between text-sm ${strong ? "border-t pt-2 font-bold" : ""}`}>
      <span className={tone === "negative" ? "text-destructive" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={`tabular-nums ${tone === "negative" ? "text-destructive" : "font-medium"}`}>
        {tone === "negative" ? "-" : ""}${Math.abs(amount).toFixed(2)}
      </span>
    </div>
  );
}

/** Interruptor de un concepto opcional. */
function ToggleRow({
  label, checked, onCheckedChange, disabled,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />
    </div>
  );
}

/** Un concepto con tipo (porcentaje o monto) y valor. */
export interface RateBlock {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  /** Valor del tipo, tal y como lo guarda cada tabla ("amount", "fixed"…). */
  type: string;
  onTypeChange: (v: string) => void;
  typeOptions: readonly SelectFieldOption[];
  /** Decimal en texto. */
  value: string;
  onValueChange: (v: string) => void;
  /** Importe ya calculado por el formulario, que es quien sabe las reglas. */
  amount: number;
}

export interface PricingFieldsProps {
  /** Prefijo de los `id` de los campos, para que no choquen entre formularios. */
  idPrefix: string;
  subtotal: number;
  discount: RateBlock;
  tax: {
    enabled: boolean;
    onEnabledChange: (v: boolean) => void;
    /** Porcentaje en texto. */
    rate: string;
    onRateChange: (v: string) => void;
    amount: number;
  };
  total: number;
  /** Solo donde se cobra por adelantado; una factura no lleva depósito. */
  deposit?: RateBlock & { balanceDue: number };
  disabled?: boolean;
}

export function PricingFields({
  idPrefix, subtotal, discount, tax, total, deposit, disabled = false,
}: PricingFieldsProps) {
  return (
    <>
      <AmountRow label="Subtotal" amount={subtotal} />

      <ToggleRow
        label="Discount"
        checked={discount.enabled}
        onCheckedChange={discount.onEnabledChange}
        disabled={disabled}
      />
      {discount.enabled && (
        <>
          <div className="grid grid-cols-[100px_1fr] gap-2">
            <SelectField
              placeholder="Type"
              value={discount.type}
              onChange={discount.onTypeChange}
              options={discount.typeOptions}
              disabled={disabled}
            />
            <FloatingInput
              id={`${idPrefix}-discount-value`}
              label="Discount value"
              type="decimal"
              value={discount.value}
              onChange={discount.onValueChange}
              disabled={disabled}
            />
          </div>
          {discount.amount > 0 && (
            <AmountRow label="Discount" amount={discount.amount} tone="negative" />
          )}
        </>
      )}

      <ToggleRow
        label="Tax"
        checked={tax.enabled}
        onCheckedChange={tax.onEnabledChange}
        disabled={disabled}
      />
      {tax.enabled && (
        <>
          <FloatingInput
            id={`${idPrefix}-tax-rate`}
            label="Tax rate (%)"
            type="decimal"
            value={tax.rate}
            onChange={tax.onRateChange}
            disabled={disabled}
          />
          {tax.amount > 0 && <AmountRow label="Tax" amount={tax.amount} />}
        </>
      )}

      <AmountRow label="Total" amount={total} strong />

      {deposit && (
        <>
          <ToggleRow
            label="Deposit Required"
            checked={deposit.enabled}
            onCheckedChange={deposit.onEnabledChange}
            disabled={disabled}
          />
          {deposit.enabled && (
            <>
              <div className="grid grid-cols-[100px_1fr] gap-2">
                <SelectField
                  placeholder="Type"
                  value={deposit.type}
                  onChange={deposit.onTypeChange}
                  options={deposit.typeOptions}
                  disabled={disabled}
                />
                <FloatingInput
                  id={`${idPrefix}-deposit-value`}
                  label="Deposit value"
                  type="decimal"
                  value={deposit.value}
                  onChange={deposit.onValueChange}
                  disabled={disabled}
                />
              </div>
              <AmountRow label="Deposit" amount={deposit.amount} />
              <AmountRow label="Balance Due" amount={deposit.balanceDue} />
            </>
          )}
        </>
      )}
    </>
  );
}
