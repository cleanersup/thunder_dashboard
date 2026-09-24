import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, X, Plus, Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { cn } from "@/shared/utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EntityOption {
  id: string;
  label: string;
}

interface EntityPickerFieldProps {
  /** Available options to pick from */
  options: EntityOption[];
  /** Currently selected options (always an array; max 1 when multiple=false) */
  selected: EntityOption[];
  onChange: (selected: EntityOption[]) => void;
  /** Allow selecting multiple options. Default: false */
  multiple?: boolean;
  /** If provided, shows a "Create new" button at the bottom of the list */
  onCreateNew?: () => void;
  /** Label for the create-new button. Default: "Create new" */
  createNewLabel?: string;
  /** Placeholder when nothing is selected */
  placeholder?: string;
  /** Message shown when the options list is empty */
  emptyMessage?: string;
  isLoading?: boolean;
  /** Show clear option for single-select (useful when field is optional) */
  allowClear?: boolean;
  clearLabel?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Generic reusable picker for selecting one or multiple entities (employees,
 * clients, leads, etc.) with an optional inline "Create new" shortcut.
 *
 * Usage (multi):
 *   <EntityPickerField multiple options={employees} selected={sel} onChange={setSel}
 *     onCreateNew={() => setShowCreate(true)} createNewLabel="Add Employee" />
 *
 * Usage (single, optional):
 *   <EntityPickerField options={clients} selected={sel} onChange={setSel}
 *     allowClear clearLabel="No client" onCreateNew={() => setShowCreate(true)} />
 */
export function EntityPickerField({
  options,
  selected,
  onChange,
  multiple = false,
  onCreateNew,
  createNewLabel = "Create new",
  placeholder = "Select...",
  emptyMessage = "No options available",
  isLoading = false,
  allowClear = false,
  clearLabel = "None",
}: EntityPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, search]);

  const isSelected = (id: string) => selected.some((s) => s.id === id);

  const toggle = (option: EntityOption) => {
    if (multiple) {
      onChange(
        isSelected(option.id)
          ? selected.filter((s) => s.id !== option.id)
          : [...selected, option],
      );
    } else {
      onChange(isSelected(option.id) ? [] : [option]);
      setOpen(false);
    }
  };

  const remove = (id: string) => onChange(selected.filter((s) => s.id !== id));

  const clear = () => { onChange([]); setOpen(false); };

  // Trigger label for single-select
  const triggerLabel =
    !multiple && selected.length === 1 ? selected[0].label : null;

  // Trigger label for multi-select
  const multiLabel =
    multiple && selected.length > 0
      ? `${selected.length} selected`
      : null;

  const showSearch = options.length > 5;

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setSearch(""); }}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between font-normal text-sm h-9"
          >
            <span className={cn(!triggerLabel && !multiLabel && "text-muted-foreground")}>
              {triggerLabel ?? multiLabel ?? placeholder}
            </span>
            <ChevronsUpDown className="h-4 w-4 opacity-50 ml-2 shrink-0" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
        >
          {/* Search */}
          {showSearch && (
            <div className="flex items-center gap-2 px-2 py-1.5 border-b border-border">
              <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <input
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          )}

          {/* Options list */}
          <div className="max-h-52 overflow-y-auto py-1">
            {isLoading ? (
              <p className="text-sm text-muted-foreground text-center py-4">Loading...</p>
            ) : filtered.length === 0 && !allowClear ? (
              <p className="text-sm text-muted-foreground text-center py-4">{emptyMessage}</p>
            ) : (
              <>
                {/* Clear / None option (single-select only) */}
                {allowClear && !multiple && (
                  <button
                    type="button"
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted transition-colors"
                    onClick={clear}
                  >
                    <span className="flex-1 text-left">{clearLabel}</span>
                    {selected.length === 0 && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                  </button>
                )}

                {filtered.map((option) => {
                  const checked = isSelected(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-muted transition-colors"
                      onClick={() => toggle(option)}
                    >
                      {multiple && (
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggle(option)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      )}
                      <span className="flex-1 text-left">{option.label}</span>
                      {!multiple && checked && (
                        <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                      )}
                    </button>
                  );
                })}

                {filtered.length === 0 && allowClear && (
                  <p className="text-sm text-muted-foreground text-center py-2">{emptyMessage}</p>
                )}
              </>
            )}
          </div>

          {/* Create new button */}
          {onCreateNew && (
            <div className="border-t border-border p-1">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-primary hover:bg-primary/10 rounded transition-colors font-medium"
                onClick={() => { onCreateNew(); setOpen(false); }}
              >
                <Plus className="h-3.5 w-3.5 shrink-0" />
                {createNewLabel}
              </button>
            </div>
          )}
        </PopoverContent>
      </Popover>

      {/* Selected pills */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full"
            >
              {s.label}
              <button
                type="button"
                onClick={() => remove(s.id)}
                className="hover:text-destructive transition-colors"
                aria-label={`Remove ${s.label}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
