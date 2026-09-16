import { Label } from "@/shared/components/ui/label";
import { cn } from "@/shared/utils/cn";

export type OptionGridItem = string | { value: string; label: string };

interface OptionGridBaseProps {
  /** Etiqueta del grupo (ej. "Additional Services", "Property Type"). */
  label?:     string;
  options:    readonly OptionGridItem[];
  columns?:   2 | 3 | 4;
  disabled?:  boolean;
  className?: string;
}

type OptionGridProps = OptionGridBaseProps & (
  | { multiple: true;   value: readonly string[];  onChange: (value: string[]) => void }
  | { multiple?: false; value: string | null;      onChange: (value: string) => void }
);

const COLUMN_CLASS = {
  2: "grid-cols-2",
  3: "grid-cols-3",
  4: "grid-cols-4",
} as const;

const normalize = (option: OptionGridItem) =>
  typeof option === "string" ? { value: option, label: option } : option;

/**
 * Rejilla de opciones tipo chip — la alternativa a un select cuando las opciones son
 * pocas y conviene verlas todas (servicios adicionales, tipo de propiedad, horario).
 *
 * Una sola opción o varias según `multiple`, discriminado en el tipo: `value` y
 * `onChange` cambian de forma con él, así que no hay manera de usarlo mal.
 */
export function OptionGrid(props: OptionGridProps) {
  const { label, options, columns = 2, disabled = false, className } = props;

  const isSelected = (value: string) =>
    props.multiple ? props.value.includes(value) : props.value === value;

  const handleClick = (value: string) => {
    if (disabled) return;
    if (props.multiple) {
      props.onChange(
        props.value.includes(value)
          ? props.value.filter((v) => v !== value)
          : [...props.value, value],
      );
    } else {
      props.onChange(value);
    }
  };

  return (
    <div className={className}>
      {label && <Label className="text-sm font-medium mb-3 block">{label}</Label>}
      <div className={cn("grid gap-2", COLUMN_CLASS[columns])}>
        {options.map((option) => {
          const { value, label: optionLabel } = normalize(option);
          return (
            <button
              key={value}
              type="button"
              disabled={disabled}
              onClick={() => handleClick(value)}
              className={cn(
                "flex items-center justify-center p-3 rounded-lg border text-sm transition-colors",
                "disabled:cursor-not-allowed disabled:opacity-50",
                isSelected(value)
                  ? "border-primary bg-primary/10 text-primary font-medium"
                  : "border-input bg-background enabled:hover:border-primary/60",
              )}
            >
              {optionLabel}
            </button>
          );
        })}
      </div>
    </div>
  );
}
