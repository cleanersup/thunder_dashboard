import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

export interface SearchableSelectOption {
  value: string;
  label: string;
  subtitle?: string;
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
    },
    ref
  ) => {
    const [open, setOpen] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState("");
    const isMobile = useIsMobile();

    // Get selected option label
    const selectedOption = options.find((opt) => opt.value === value);
    const displayValue = selectedOption?.label || placeholder;

    // Filter options based on search query
    const filteredOptions = React.useMemo(() => {
      if (!searchQuery) return options;
      const query = searchQuery.toLowerCase();
      return options.filter(
        (option) =>
          option.label.toLowerCase().includes(query) ||
          option.subtitle?.toLowerCase().includes(query)
      );
    }, [options, searchQuery]);

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

    // Web version: Dropdown with Popover
    if (!isMobile) {
      return (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={ref}
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              disabled={disabled}
              className={cn(
                "w-full justify-between h-10 bg-background font-normal",
                !value && "text-muted-foreground",
                error && "border-red-500 border-2",
                className
              )}
            >
              <span className="truncate">{displayValue}</span>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent 
            className="w-[var(--radix-popover-trigger-width)] p-0 bg-background border shadow-lg z-50" 
            align="start"
            sideOffset={4}
          >
            {/* Search Input */}
            <div className="p-3 border-b">
              <SearchInput autoFocus />
            </div>

            {/* Options List */}
            <div className="max-h-[300px] overflow-y-auto p-2">
              {filteredOptions.length === 0 ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                <OptionsList />
              )}
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    // Mobile/Tablet version: Modal Dialog
    return (
      <>
        {/* Trigger Button */}
        <Button
          ref={ref}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          onClick={() => setOpen(true)}
          className={cn(
            "w-full justify-between h-10 bg-background font-normal",
            !value && "text-muted-foreground",
            error && "border-red-500 border-2",
            className
          )}
        >
          <span className="truncate">{displayValue}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>

        {/* Modal */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0 gap-0">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
              <DialogTitle>{title}</DialogTitle>
            </DialogHeader>

            {/* Search Input */}
            <div className="px-6 py-4 border-b">
              <SearchInput autoFocus />
            </div>

            {/* Options List */}
            <div className="flex-1 overflow-y-auto px-2 py-2">
              {filteredOptions.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              ) : (
                <OptionsList />
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t">
              <Button
                type="button"
                variant="outline"
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
