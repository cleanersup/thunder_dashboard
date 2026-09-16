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
import {
  FORM_CONTROL_ERROR, FORM_CONTROL_FOCUS, FORM_CONTROL_HOVER,
} from "@/shared/constants/formTokens";

export interface SearchableSelectOption {
  value: string;
  label: string;
  subtitle?: string;
  /** Extra text matched by the search box (e.g. email + company). Falls back to label + subtitle. */
  searchText?: string;
}

interface SearchableSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  options: SearchableSelectOption[];
  placeholder?: string;
  title?: string;
  emptyMessage?: string;
  searchPlaceholder?: string;
  className?: string;
  disabled?: boolean;
  error?: boolean;
  /** Optional footer action rendered below the list (e.g. "Add New Client"). */
  onAddNew?: () => void;
  addNewLabel?: string;
}

export const SearchableSelect = React.forwardRef<
  HTMLButtonElement,
  SearchableSelectProps
>(
  (
    {
      value,
      onValueChange,
      options,
      placeholder = "Select an option",
      title = "Select Option",
      emptyMessage = "No options found",
      searchPlaceholder = "Search...",
      className,
      disabled = false,
      error = false,
      onAddNew,
      addNewLabel = "Add New",
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");

    // Get selected option label
    const selectedOption = options.find((opt) => opt.value === value);
    const displayValue = selectedOption?.label || placeholder;

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

    const handleSelect = (optionValue: string) => {
      onValueChange(optionValue);
      setOpen(false);
    };

    // Shared options list component
    const OptionsList = () => (
      <div className="space-y-1">
        {filteredOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => handleSelect(option.value)}
            className={cn(
              "w-full flex items-center justify-between px-4 py-3 rounded-md text-left transition-colors text-sm",
              "hover:bg-accent hover:text-accent-foreground",
              value === option.value && "bg-primary/10 text-primary"
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
            {value === option.value && (
              <Check className="ml-2 h-4 w-4 shrink-0" />
            )}
          </button>
        ))}
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
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={cn(
            // Se comporta como un campo, no como un botón: mismo hover/foco de borde
            // que Input/Select en lugar del relleno del variant "outline".
            "w-full justify-between h-10 bg-background font-normal hover:bg-background hover:text-foreground",
            FORM_CONTROL_HOVER,
            FORM_CONTROL_FOCUS,
            !value && "text-muted-foreground",
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
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="w-full"
              >
                Cancel
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  }
);

SearchableSelect.displayName = "SearchableSelect";
