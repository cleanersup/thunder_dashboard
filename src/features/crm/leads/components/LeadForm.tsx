import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Textarea } from "@/shared/components/ui/textarea";
import { leadSchema, type LeadFormData } from "../schemas/leadSchema";
import { toDecimalString } from "@/shared/utils/numericInput";
import { useCreateLead, useUpdateLead } from "../hooks/useLeads";
import type { Lead } from "../../types/crm.types";

interface LeadFormProps {
  open: boolean;
  onClose: () => void;
  lead?: Lead;
}

export function LeadForm({ open, onClose, lead }: LeadFormProps) {
  const isEdit = !!lead;
  const { mutate: create, isPending: creating } = useCreateLead();
  const { mutate: update, isPending: updating } = useUpdateLead();
  const isPending = creating || updating;

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: { status: "new", priority_level: "medium", lead_source: "website", service_interested: "residential" },
  });

  const leadSource = watch("lead_source");

  useEffect(() => {
    if (lead) {
      reset({
        full_name: lead.full_name, company_name: lead.company_name ?? undefined, phone: lead.phone,
        email: lead.email, address: lead.address, apt_suite: lead.apt_suite ?? undefined,
        city: lead.city, state: lead.state, zip_code: lead.zip_code,
        lead_source: lead.lead_source as LeadFormData["lead_source"],
        referral_name: lead.referral_name ?? undefined, referral_company: lead.referral_company ?? undefined,
        service_interested: lead.service_interested as LeadFormData["service_interested"],
        estimate_budget: lead.estimate_budget ?? undefined,
        priority_level: lead.priority_level as LeadFormData["priority_level"],
        status: lead.status as LeadFormData["status"],
        next_followup_date: lead.next_followup_date ?? undefined,
        internal_notes: lead.internal_notes ?? undefined,
      });
    } else {
      reset({ status: "new", priority_level: "medium", lead_source: "website", service_interested: "residential" });
    }
  }, [lead, reset]);

  const onSubmit = (data: LeadFormData) => {
    if (isEdit && lead) {
      update({ id: lead.id, payload: data }, { onSuccess: onClose });
    } else {
      create(data, { onSuccess: onClose });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Lead" : "Add Lead"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Personal Information</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Full Name *</Label>
              <Input {...register("full_name")} placeholder="Jane Smith" />
              {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name.message}</p>}
            </div>
            <div>
              <Label>Company Name</Label>
              <Input {...register("company_name")} />
            </div>
            <div>
              <Label>Phone *</Label>
              <Input {...register("phone")} placeholder="(555) 000-0000" />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone.message}</p>}
            </div>
            <div className="col-span-2">
              <Label>Email *</Label>
              <Input {...register("email")} type="email" />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email.message}</p>}
            </div>
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Address</p>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <Label>Street *</Label>
              <Input {...register("address")} />
              {errors.address && <p className="text-xs text-destructive mt-1">{errors.address.message}</p>}
            </div>
            <div><Label>Apt/Suite</Label><Input {...register("apt_suite")} /></div>
            <div><Label>City *</Label><Input {...register("city")} />{errors.city && <p className="text-xs text-destructive mt-1">{errors.city.message}</p>}</div>
            <div><Label>State *</Label><Input {...register("state")} />{errors.state && <p className="text-xs text-destructive mt-1">{errors.state.message}</p>}</div>
            <div><Label>Zip *</Label><Input {...register("zip_code")} />{errors.zip_code && <p className="text-xs text-destructive mt-1">{errors.zip_code.message}</p>}</div>
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Lead Details</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Lead Source *</Label>
              <Select defaultValue="website" onValueChange={(v) => setValue("lead_source", v as LeadFormData["lead_source"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["facebook","google","instagram","website","referral","flyer","other"].map(s => (
                    <SelectItem key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Service Interested *</Label>
              <Select defaultValue="residential" onValueChange={(v) => setValue("service_interested", v as LeadFormData["service_interested"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {leadSource === "referral" && (
              <>
                <div><Label>Referral Name</Label><Input {...register("referral_name")} /></div>
                <div><Label>Referral Company</Label><Input {...register("referral_company")} /></div>
              </>
            )}
            <div>
              <Label>Priority Level *</Label>
              <Select defaultValue="medium" onValueChange={(v) => setValue("priority_level", v as LeadFormData["priority_level"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select defaultValue="new" onValueChange={(v) => setValue("status", v as LeadFormData["status"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="walkthrough">Walkthrough</SelectItem>
                  <SelectItem value="estimate send">Estimate Send</SelectItem>
                  <SelectItem value="decision">Decision</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Estimate Budget</Label>
              {(() => {
                const field = register("estimate_budget", { setValueAs: (v) => v === "" ? null : parseFloat(v) });
                return (
                  <Input
                    type="text"
                    inputMode="decimal"
                    {...field}
                    onChange={(e) => { e.target.value = toDecimalString(e.target.value); field.onChange(e); }}
                    placeholder="0.00"
                  />
                );
              })()}
            </div>
            <div>
              <Label>Next Follow-up Date</Label>
              <Input type="date" {...register("next_followup_date")} />
            </div>
            <div className="col-span-2">
              <Label>Internal Notes</Label>
              <Textarea {...register("internal_notes")} rows={3} placeholder="Internal notes..." />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button type="submit" className="flex-1" disabled={isPending}>
              {isPending ? (isEdit ? "Saving..." : "Creating...") : (isEdit ? "Save Changes" : "Add Lead")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
