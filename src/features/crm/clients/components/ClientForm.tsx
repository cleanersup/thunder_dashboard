import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { clientSchema, type ClientFormData } from "../schemas/clientSchema";
import { useCreateClient, useUpdateClient } from "../hooks/useClients";
import type { Client } from "../../types/crm.types";

interface ClientFormProps {
  open: boolean;
  onClose: () => void;
  client?: Client;
}

export function ClientForm({ open, onClose, client }: ClientFormProps) {
  const isEdit = !!client;
  const { mutate: create, isPending: creating } = useCreateClient();
  const { mutate: update, isPending: updating } = useUpdateClient();
  const isPending = creating || updating;

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: { client_type: "individual", contact_preference: "phone", status: "active" },
  });

  useEffect(() => {
    if (client) {
      reset({
        full_name: client.full_name,
        company: client.company ?? undefined,
        phone: client.phone,
        email: client.email,
        service_street: client.service_street,
        service_apt: client.service_apt ?? undefined,
        service_city: client.service_city,
        service_state: client.service_state,
        service_zip: client.service_zip,
        billing_street: client.billing_street,
        billing_apt: client.billing_apt ?? undefined,
        billing_city: client.billing_city,
        billing_state: client.billing_state,
        billing_zip: client.billing_zip,
        client_type: client.client_type as ClientFormData["client_type"],
        contact_preference: client.contact_preference as ClientFormData["contact_preference"],
        instructions: client.instructions ?? undefined,
        status: client.status as ClientFormData["status"],
      });
    } else {
      reset({ client_type: "individual", contact_preference: "phone", status: "active" });
    }
  }, [client, reset]);

  const onSubmit = (data: ClientFormData) => {
    if (isEdit && client) {
      update({ id: client.id, payload: data }, { onSuccess: onClose });
    } else {
      create(data, { onSuccess: onClose });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Client" : "Add Client"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Personal Information</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Full Name *</Label>
              <Input {...register("full_name")} placeholder="John Doe" />
              {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name.message}</p>}
            </div>
            <div>
              <Label>Company</Label>
              <Input {...register("company")} placeholder="Company name" />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input {...register("phone")} placeholder="(555) 000-0000" />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
            </div>
            <div className="col-span-2">
              <Label>Email *</Label>
              <Input {...register("email")} type="email" placeholder="email@example.com" />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Service Address</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Street *</Label>
              <Input {...register("service_street")} placeholder="123 Main St" />
              {errors.service_street && <p className="text-xs text-destructive mt-1">{errors.service_street.message}</p>}
            </div>
            <div>
              <Label>Apt/Suite</Label>
              <Input {...register("service_apt")} placeholder="Apt 4B" />
            </div>
            <div>
              <Label>City *</Label>
              <Input {...register("service_city")} />
              {errors.service_city && <p className="text-xs text-destructive mt-1">{errors.service_city.message}</p>}
            </div>
            <div>
              <Label>State *</Label>
              <Input {...register("service_state")} />
              {errors.service_state && <p className="text-xs text-destructive mt-1">{errors.service_state.message}</p>}
            </div>
            <div>
              <Label>Zip *</Label>
              <Input {...register("service_zip")} />
              {errors.service_zip && <p className="text-xs text-destructive mt-1">{errors.service_zip.message}</p>}
            </div>
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Billing Address</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Street *</Label>
              <Input {...register("billing_street")} placeholder="123 Main St" />
              {errors.billing_street && <p className="text-xs text-destructive mt-1">{errors.billing_street.message}</p>}
            </div>
            <div>
              <Label>Apt/Suite</Label>
              <Input {...register("billing_apt")} />
            </div>
            <div>
              <Label>City *</Label>
              <Input {...register("billing_city")} />
              {errors.billing_city && <p className="text-xs text-destructive mt-1">{errors.billing_city.message}</p>}
            </div>
            <div>
              <Label>State *</Label>
              <Input {...register("billing_state")} />
              {errors.billing_state && <p className="text-xs text-destructive mt-1">{errors.billing_state.message}</p>}
            </div>
            <div>
              <Label>Zip *</Label>
              <Input {...register("billing_zip")} />
              {errors.billing_zip && <p className="text-xs text-destructive mt-1">{errors.billing_zip.message}</p>}
            </div>
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Business Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Client Type</Label>
              <Select defaultValue="individual" onValueChange={(v) => setValue("client_type", v as ClientFormData["client_type"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Individual</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Contact Preference</Label>
              <Select defaultValue="phone" onValueChange={(v) => setValue("contact_preference", v as ClientFormData["contact_preference"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="phone">Phone</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2">
              <Label>Instructions</Label>
              <Textarea {...register("instructions")} placeholder="Any special instructions..." rows={3} />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Add Client")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
