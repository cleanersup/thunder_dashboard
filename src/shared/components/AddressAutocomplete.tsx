/**
 * @module AddressAutocomplete
 * Street input with Google Places autocomplete.
 * Selecting a suggestion fills street, city, state, and zip via onAddressSelect.
 * Mirrors swift-slate/src/components/AddressAutocomplete.tsx.
 */
import { useEffect, useRef, useState } from "react";
import { Input } from "@/shared/components/ui/input";
import { useGoogleMaps } from "@/shared/hooks/useGoogleMaps";

declare global {
  interface Window { google: any; }
}

export interface AddressComponents {
  street: string;
  city:   string;
  state:  string;
  zip:    string;
}

interface AddressAutocompleteProps {
  value:           string;
  onChange:        (value: string) => void;
  onAddressSelect: (components: AddressComponents) => void;
  placeholder?:    string;
  error?:          boolean;
  disabled?:       boolean;
  className?:      string;
}

export function AddressAutocomplete({
  value,
  onChange,
  onAddressSelect,
  placeholder = "123 Main St",
  error       = false,
  disabled    = false,
  className   = "",
}: AddressAutocompleteProps) {
  const inputRef        = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const { loaded, google } = useGoogleMaps();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (!loaded || !google || !inputRef.current || isInitialized) return;
    if (!google.maps.places) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types:                ["address"],
      componentRestrictions: { country: "us" },
      fields:               ["address_components", "formatted_address"],
    });

    const processPlace = () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place?.address_components) return;

      let streetNumber = "";
      let route        = "";
      let city         = "";
      let state        = "";
      let zip          = "";

      place.address_components.forEach((c: any) => {
        const t = c.types;
        if (t.includes("street_number"))             streetNumber = c.long_name;
        if (t.includes("route"))                     route        = c.long_name;
        if (t.includes("locality"))                  city         = c.long_name;
        if (t.includes("administrative_area_level_1")) state      = c.short_name;
        if (t.includes("postal_code"))               zip          = c.long_name;
      });

      const street = `${streetNumber} ${route}`.trim();
      onChange(street);
      onAddressSelect({ street, city, state, zip });
    };

    autocompleteRef.current.addListener("place_changed", processPlace);

    // Mobile: observe pac-container clicks
    const handleClick = () => setTimeout(processPlace, 100);
    const observer = new MutationObserver(() => {
      document.querySelectorAll(".pac-container").forEach((el) => {
        if (!el.hasAttribute("data-ac-listener")) {
          el.setAttribute("data-ac-listener", "true");
          el.addEventListener("click",    handleClick);
          el.addEventListener("touchend", handleClick);
        }
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    setIsInitialized(true);

    return () => {
      observer.disconnect();
      document.querySelectorAll(".pac-container").forEach((el) => {
        el.removeEventListener("click",    handleClick);
        el.removeEventListener("touchend", handleClick);
      });
    };
  }, [loaded, google, isInitialized, onChange, onAddressSelect]);

  return (
    <>
      <Input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        disabled={disabled}
        className={`${error ? "border-destructive" : ""} ${className}`}
      />
      {/* Google Places dropdown styles */}
      <style>{`
        .pac-container {
          z-index: 99999 !important;
          border-radius: 8px;
          margin-top: 4px !important;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
          border: 1px solid hsl(var(--border));
          font-family: inherit;
          pointer-events: auto !important;
          -webkit-overflow-scrolling: touch;
        }
        .pac-container:after { display: none; }
        .pac-item {
          padding: 10px 14px;
          cursor: pointer;
          font-size: 14px;
          border-top: none;
          line-height: 1.5;
        }
        .pac-item:hover, .pac-item:active, .pac-item-selected {
          background-color: hsl(var(--accent)) !important;
        }
        .pac-item-query {
          font-size: 14px;
          color: hsl(var(--foreground));
        }
        .pac-matched { font-weight: 600; }
        .pac-icon { margin-top: 2px; }
      `}</style>
    </>
  );
}
