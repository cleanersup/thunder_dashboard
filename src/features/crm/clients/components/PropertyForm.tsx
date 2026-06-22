import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { clientPropertySchema, type ClientPropertySchema } from "../schemas/clientPropertySchema";
import { useCreateClientProperty, useUpdateClientProperty } from "../hooks/useClientProperties";
import type { ClientProperty } from "../types/clientProperty.types";

interface PropertyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  property?: ClientProperty;
}

export function PropertyForm({ open, onOpenChange, clientId, property }: PropertyFormProps) {
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
      country:    "",
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
              country:    property.country    ?? "",
              is_primary: property.is_primary,
            }
          : {
              title: "", street: "", apt_suite: "", city: "",
              state: "", zip_code: "", country: "", is_primary: false,
            }
      );
    }
  }, [open, property, form]);

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
      create(payload, { onSuccess: () => onOpenChange(false) });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Property" : "Add Property"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="title">Title (optional)</Label>
            <Input id="title" placeholder="e.g. Main Office" {...form.register("title")} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="street">Street *</Label>
            <Input id="street" placeholder="123 Main St" {...form.register("street")} />
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

          <div className="space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <Input id="country" placeholder="US" {...form.register("country")} />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Primary property</p>
              <p className="text-xs text-muted-foreground">Used as default for new jobs and estimates</p>
            </div>
            <Switch
              checked={form.watch("is_primary")}
              onCheckedChange={(v) => form.setValue("is_primary", v)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEdit ? "Save Changes" : "Add Property"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
