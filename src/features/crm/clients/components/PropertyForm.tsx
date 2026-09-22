import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormSheet, FormBand } from "@/shared/components/forms";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import { AddressAutocomplete } from "@/shared/components/AddressAutocomplete";
import { COUNTRY_OPTIONS } from "@/shared/constants/countries";
import { clientPropertySchema, type ClientPropertySchema } from "../schemas/clientPropertySchema";
import { useCreateClientProperty, useUpdateClientProperty } from "../hooks/useClientProperties";
import type { ClientProperty } from "../types/clientProperty.types";

interface PropertyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  property?: ClientProperty;
  /** Recibe la propiedad recién creada — quien la pidió la deja seleccionada. */
  onSuccess?: (property: ClientProperty) => void;
}

export function PropertyForm({ open, onOpenChange, clientId, property, onSuccess }: PropertyFormProps) {
  const isEdit = !!property;
  const { mutate: create, isPending: creating } = useCreateClientProperty(clientId);
  const { mutate: update, isPending: updating } = useUpdateClientProperty(clientId);
  const isPending = creating || updating;

  const form = useForm<ClientPropertySchema>({
    resolver: zodResolver(clientPropertySchema),
    defaultValues: {
      title:      "",
      street:     "",
      apt_suite:  "",
      city:       "",
      state:      "",
      zip_code:   "",
      country:    "us",
      is_primary: false,
    },
  });

  useEffect(() => {
    if (open) {
      form.reset(
        property
          ? {
              title:      property.title      ?? "",
              street:     property.street,
              apt_suite:  property.apt_suite  ?? "",
              city:       property.city,
              state:      property.state,
              zip_code:   property.zip_code,
              country:    property.country    ?? "us",
              is_primary: property.is_primary,
            }
          : {
              title: "", street: "", apt_suite: "", city: "",
              state: "", zip_code: "", country: "us", is_primary: false,
            }
      );
    }
  }, [open, property, form]);

  const country = form.watch("country") || "us";
  // 'all' = no country restriction on autocomplete suggestions.
  const autocompleteCountry = country === "all" ? "" : country;

  const onSubmit = (data: ClientPropertySchema) => {
    const payload = {
      title:      data.title      ?? "",
      street:     data.street,
      apt_suite:  data.apt_suite  ?? "",
      city:       data.city,
      state:      data.state,
      zip_code:   data.zip_code,
      country:    data.country    ?? "",
      is_primary: data.is_primary,
    };

    if (isEdit) {
      update({ id: property!.id, form: payload }, { onSuccess: () => onOpenChange(false) });
    } else {
      create(payload, {
        onSuccess: (created) => { onSuccess?.(created); onOpenChange(false); },
      });
    }
  };

  return (
    <FormSheet
      open={open}
      onClose={() => onOpenChange(false)}
      title={isEdit ? "Edit Property" : "Add Property"}
      submitLabel={isEdit ? "Save Changes" : "Add Property"}
      onSubmit={form.handleSubmit(onSubmit)}
      isPending={isPending}
    >
      <div className="contents" onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}>
        <FormBand title="Property Details">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title (optional)</Label>
            <Input id="title" placeholder="e.g. Main Office" {...form.register("title")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <Select value={country} onValueChange={(v) => form.setValue("country", v)}>
              <SelectTrigger id="country"><SelectValue placeholder="Select country" /></SelectTrigger>
              <SelectContent>
                {COUNTRY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </FormBand>

        <FormBand title="Address">
          <div className="space-y-1.5">
            <Label htmlFor="street">Street *</Label>
            <AddressAutocomplete
              value={form.watch("street") ?? ""}
              onChange={(v) => form.setValue("street", v)}
              onAddressSelect={(c) => {
                form.setValue("street",   c.street);
                form.setValue("city",     c.city);
                form.setValue("state",    c.state);
                form.setValue("zip_code", c.zip);
              }}
              country={autocompleteCountry}
              error={!!form.formState.errors.street}
            />
            {form.formState.errors.street && (
              <p className="text-xs text-destructive">{form.formState.errors.street.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="apt_suite">Apt/Suite</Label>
              <Input id="apt_suite" placeholder="Apt 4B" {...form.register("apt_suite")} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City *</Label>
              <Input id="city" placeholder="Miami" {...form.register("city")} />
              {form.formState.errors.city && (
                <p className="text-xs text-destructive">{form.formState.errors.city.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="state">State *</Label>
              <Input id="state" placeholder="FL" {...form.register("state")} />
              {form.formState.errors.state && (
                <p className="text-xs text-destructive">{form.formState.errors.state.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zip_code">ZIP Code *</Label>
              <Input id="zip_code" placeholder="33101" {...form.register("zip_code")} />
              {form.formState.errors.zip_code && (
                <p className="text-xs text-destructive">{form.formState.errors.zip_code.message}</p>
              )}
            </div>
          </div>

        </FormBand>

        {/* Banda propia: no es un dato más de la dirección, es una decisión sobre
            cómo se usará esta propiedad en el resto de la app. */}
        <FormBand title="Default">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Primary property</p>
              <p className="text-xs text-muted-foreground">Used as default for new jobs and estimates</p>
            </div>
            <Switch
              checked={form.watch("is_primary")}
              onCheckedChange={(v) => form.setValue("is_primary", v)}
            />
          </div>
        </FormBand>
      </div>
    </FormSheet>
  );
}
