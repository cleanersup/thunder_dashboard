import * as React from "react";
import { Check, ChevronDown, Plus, Search, X } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { FORM_CONTROL_ERROR } from "@/shared/constants/formTokens";
import { withRequiredMark } from "@/shared/utils/formLabel";

export interface SearchableSelectOption {
  value: string;
  label: string;
  subtitle?: string;
  /** Extra text matched by the search box (e.g. email + company). Falls back to label + subtitle. */
  searchText?: string;
}

interface SearchableSelectBaseProps {
  options: SearchableSelectOption[];
  placeholder?: string;
  title?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  /** Añade el asterisco de obligatorio al placeholder (una sola convención en la app). */
  required?: boolean;
  /** Optional footer action rendered below the list (e.g. "Add New Client"). */
  onAddNew?: () => void;
  addNewLabel?: string;
}

/**
 * Una sola opción o varias, discriminado en el tipo: `value` y `onValueChange` cambian
 * de forma con `multiple`, así que no hay manera de usarlo mal. Ambos modos comparten
 * diálogo, buscador y lista — elegir un cliente y elegir empleados se ven y se operan
 * igual porque son literalmente el mismo componente.
 */
type SearchableSelectProps = SearchableSelectBaseProps & (
  | { multiple?: false; value?: string;   onValueChange: (value: string) => void }
  | { multiple: true;   value?: string[]; onValueChange: (value: string[]) => void }
);

export const SearchableSelect = React.forwardRef<
  HTMLButtonElement,
  SearchableSelectProps
>((props, ref) => {
    const {
      options,
      placeholder = "Select an option",
      title = "Select Option",
      emptyMessage = "No options found",
      searchPlaceholder = "Search...",
      className,
      disabled = false,
      error = false,
      required = false,
      onAddNew,
      addNewLabel = "Add New",
    } = props;

    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");

    const isMulti = props.multiple === true;

    // Selección normalizada a array — el resto del componente no distingue modos.
    const selectedValues = React.useMemo<string[]>(() => {
      if (props.multiple) return props.value ?? [];
      return props.value ? [props.value] : [];
    }, [props.multiple, props.value]);

    // Etiqueta del trigger: vacío → placeholder; uno → su nombre; varios → "N selected".
    const displayValue = (() => {
      if (selectedValues.length === 0) return withRequiredMark(placeholder, required);
      if (selectedValues.length === 1) {
        return options.find((o) => o.value === selectedValues[0])?.label
          ?? withRequiredMark(placeholder, required);
      }
      return `${selectedValues.length} selected`;
    })();

    const hasValue = selectedValues.length > 0;

    // Filter options based on search query
    const filteredOptions = React.useMemo(() => {
      if (!searchQuery) return options;
      const query = searchQuery.toLowerCase();
      return options.filter((option) =>
        (option.searchText ?? `${option.label} ${option.subtitle ?? ""}`)
          .toLowerCase()
          .includes(query),
      );
    }, [options, searchQuery]);

    // Footer action (e.g. "Add New Client") — closes the select, then fires.
    const AddNewButton = () =>
      onAddNew ? (
        <button
          type="button"
          onClick={() => { setOpen(false); onAddNew(); }}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-semibold text-primary hover:bg-accent transition-colors"
        >
          <Plus className="h-4 w-4 shrink-0" />
          {addNewLabel}
        </button>
      ) : null;

    // Reset search when modal/popover closes
    React.useEffect(() => {
      if (!open) {
        setSearchQuery("");
      }
    }, [open]);

    // Multi: alterna y deja el diálogo abierto (se eligen varios de una vez).
    // Single: elige y cierra.
    const handleSelect = (optionValue: string) => {
      if (props.multiple) {
        const next = selectedValues.includes(optionValue)
          ? selectedValues.filter((v) => v !== optionValue)
          : [...selectedValues, optionValue];
        props.onValueChange(next);
        return;
      }
      props.onValueChange(optionValue);
      setOpen(false);
    };

    // Shared options list component
    const OptionsList = () => (
      <div className="space-y-1">
        {filteredOptions.map((option) => {
          const isSelected = selectedValues.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={cn(
                "w-full flex items-center justify-between px-4 py-3 rounded-md text-left transition-colors text-sm",
                "hover:bg-accent hover:text-accent-foreground",
                isSelected && "bg-primary/10 text-primary"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{option.label}</div>
                {option.subtitle && (
                  <div className="text-xs text-muted-foreground truncate mt-0.5">
                    {option.subtitle}
                  </div>
                )}
              </div>
              {isSelected && <Check className="ml-2 h-4 w-4 shrink-0" />}
            </button>
          );
        })}
      </div>
    );

    // Shared search input component
    const SearchInput = ({ autoFocus = false }: { autoFocus?: boolean }) => (
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 pr-9"
          autoFocus={autoFocus}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    );

    // Dialog picker (swift-slate parity) — works inside FullScreenModal; Popover scroll breaks there.
    return (
      <>
        <Button
          ref={ref}
          type="button"
          variant="field"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={cn(
            "w-full justify-between h-10",
            !hasValue && "text-muted-foreground",
            error && FORM_CONTROL_ERROR,
            className
          )}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="z-[60] max-w-md max-h-[80vh] flex flex-col p-0 gap-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>

            <div className="px-6 py-4 border-b">
              <SearchInput autoFocus />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-2 py-2 overscroll-contain">
              {filteredOptions.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                <OptionsList />
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t space-y-2">
              {onAddNew && (
                <div className="rounded-md border">
                  <AddNewButton />
                </div>
              )}
              {/* Multi: el diálogo no se cierra al elegir, así que el botón confirma. */}
              <Button
                type="button"
                variant={isMulti ? "default" : "ghost"}
                onClick={() => setOpen(false)}
                className="w-full"
              >
                {isMulti ? "Done" : "Cancel"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

SearchableSelect.displayName = "SearchableSelect";
