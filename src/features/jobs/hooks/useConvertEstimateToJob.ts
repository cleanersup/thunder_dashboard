/* eslint-disable @typescript-eslint/no-explicit-any */
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { QK } from "@/shared/config/queryKeys";

interface ConvertOptions {
  estimate: Record<string, unknown>;
  serviceLabel?: string;
  onStart: () => void;
  onFinally: () => void;
  onSuccess?: () => void;
}

function computeDiscountAmount(subtotal: number, discountType: string, discountValue: number): number {
  if (discountType === "percent" || discountType === "percentage") {
    return subtotal * discountValue / 100;
  }
  return discountValue;
}

function resolveTotal(estimate: Record<string, unknown>): number {
  const subtotal = Number(estimate.subtotal) || 0;
  const discountValue = Number(estimate.discount_value) || 0;
  const discountType = (estimate.discount_type as string) || "amount";
  const hasDiscount = discountValue > 0;
  const discount = hasDiscount ? computeDiscountAmount(subtotal, discountType, discountValue) : 0;
  const taxRate = Number(estimate.tax_rate) || 0;
  const afterDiscount = subtotal - discount;
  const tax = taxRate > 0 ? afterDiscount * taxRate / 100 : 0;
  return afterDiscount + tax;
}

export function useConvertEstimateToJob() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  return async ({ estimate, serviceLabel, onStart, onFinally, onSuccess }: ConvertOptions) => {
    onStart();
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const additionalData = (estimate.additional_data as Record<string, unknown>) || {};
      const propertyId = additionalData.propertyId as string | undefined;

      let propertyStreet = (estimate.address as string) || null;
      let propertyApt    = (estimate.apt as string)     || null;
      let propertyCity   = (estimate.city as string)    || null;
      let propertyState  = (estimate.state as string)   || null;
      let propertyZip    = (estimate.zip as string)     || null;

      if (propertyId) {
        const { data: property } = await (supabase as any)
          .from("client_properties")
          .select("street, apt_suite, city, state, zip_code")
          .eq("id", propertyId)
          .maybeSingle();
        if (property) {
          propertyStreet = property.street;
          propertyApt    = property.apt_suite ?? null;
          propertyCity   = property.city;
          propertyState  = property.state;
          propertyZip    = property.zip_code;
        }
      }

      const subtotal = Number(estimate.subtotal) || 0;
      const resolvedTotal = resolveTotal(estimate);
      const discountValue = Number(estimate.discount_value) || 0;
      const hasDiscount = discountValue > 0 && !!estimate.discount_type;
      const rawDiscountType = (estimate.discount_type as string) || "amount";
      const discountType = (rawDiscountType === "percentage" || rawDiscountType === "percent")
        ? "percent"
        : "amount";
      const discountAmount = hasDiscount
        ? computeDiscountAmount(subtotal, rawDiscountType, discountValue)
        : 0;

      const depositRequired = (additionalData.deposit_required as boolean) || false;
      const rawDepositType  = (additionalData.deposit_type as string) || "amount";
      const depositType     = rawDepositType === "percentage" ? "percent" : rawDepositType;
      const depositValue    = (additionalData.deposit_value as number) || 0;
      const depositAmount   = depositRequired && depositValue
        ? depositType === "percent"
          ? (resolvedTotal * depositValue) / 100
          : depositValue
        : 0;

      const lineItems = [{
        name:        serviceLabel || (estimate.service_sub_type as string) || (estimate.service_type as string) || "Cleaning Service",
        quantity:    1,
        unit_price:  subtotal,
        description: (estimate.service_scope as string) || "",
      }];

      const { data: newJob, error: jobError } = await (supabase as any)
        .from("jobs")
        .insert({
          user_id:            user.id,
          client_id:          (estimate.client_id as string) || null,
          lead_id:            (estimate.lead_id as string)   || null,
          contact_type:       estimate.client_id ? "client" : (estimate.lead_id ? "lead" : "client"),
          client_name:        estimate.client_name,
          client_email:       (estimate.email as string)     || null,
          client_phone:       (estimate.phone as string)     || null,
          property_street:    propertyStreet,
          property_apt:       propertyApt,
          property_city:      propertyCity,
          property_state:     propertyState,
          property_zip:       propertyZip,
          service_type:       (estimate.service_type as string)?.toLowerCase(),
          job_type:           "one_time",
          selected_week_days: [],
          assigned_employees: [],
          scheduled_date:     (estimate.estimate_date as string)?.slice(0, 10) || format(new Date(), "yyyy-MM-dd"),
          line_items:         lineItems,
          service_details:    (estimate.service_scope as string) || "",
          subtotal,
          discount_type:      hasDiscount ? discountType : "amount",
          discount_value:     hasDiscount ? discountValue : 0,
          discount_amount:    Math.round(discountAmount * 100) / 100,
          tax_type:           "percent",
          tax_value:          0,
          tax_amount:         0,
          total_amount:       Math.round(resolvedTotal * 100) / 100,
          deposit_required:   depositRequired,
          deposit_type:       depositType,
          deposit_value:      depositValue,
          deposit_amount:     depositAmount,
          balance_due:        Math.round((resolvedTotal - depositAmount) * 100) / 100,
          payment_status:     depositRequired ? "pending_deposit" : "no_deposit_required",
          amount_paid:        0,
          status:             "draft",
          estimate_id:        estimate.id,
        })
        .select("id")
        .single();

      if (jobError) throw jobError;

      const { error: rpcError } = await (supabase as any).rpc("finalize_estimate_to_job_conversion", {
        p_estimate_id: estimate.id,
        p_job_id:      newJob.id,
      });

      if (rpcError) {
        await (supabase as any).from("jobs").delete().eq("id", newJob.id);
        throw rpcError;
      }

      qc.invalidateQueries({ queryKey: QK.jobs });
      qc.invalidateQueries({ queryKey: QK.job(newJob.id) });
      qc.invalidateQueries({ queryKey: QK.estimates });
      onSuccess?.();
      navigate("/jobs", { state: { openId: newJob.id } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Something went wrong. Please try again.";
      toast.error(message);
    } finally {
      onFinally();
    }
  };
}
