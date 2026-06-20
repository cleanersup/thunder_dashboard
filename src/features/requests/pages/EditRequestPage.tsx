import { X } from "lucide-react";
import { parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/shared/components/ui/button";
import { FullScreenModal } from "@/shared/components/common/FullScreenModal";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { RequestForm } from "../components/RequestForm";
import { useRequest, useUpdateRequest } from "../hooks/useRequests";
import { useCustomQuestions } from "../hooks/useCustomQuestions";
import type { RequestPayload, BookingAttachmentMeta } from "../types/request.types";

interface EditRequestPageProps {
  bookingId: string | null;
  open: boolean;
  onClose: () => void;
}

export function EditRequestPage({ bookingId, open, onClose }: EditRequestPageProps) {
  const { data: request, isLoading } = useRequest(bookingId ?? undefined);
  const { data: customQuestions = [] } = useCustomQuestions();
  const { mutate: update, isPending } = useUpdateRequest();

  const handleSave = (payload: RequestPayload) => {
    if (!bookingId) return;
    update({ id: bookingId, payload }, { onSuccess: onClose });
  };

  return (
    <FullScreenModal open={open} onClose={onClose}>
      {/* Header */}
      <div className="border-b flex-shrink-0 bg-white">
        <div className="max-w-2xl mx-auto">
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="w-1/3" />
            <div className="w-1/3 text-center">
              <h1 className="font-semibold text-base leading-tight">Edit Request</h1>
            </div>
            <div className="flex items-center w-1/3 justify-end">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto bg-background">
        {isLoading || !request ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner />
          </div>
        ) : (
          <div className="max-w-2xl mx-auto px-4 space-y-4 py-6 pb-4">
            <RequestForm
              isModal
              title="Edit Request"
              mode="edit"
              initialValues={{
                fullName:           request.lead_name   ?? "",
                email:              request.email       ?? "",
                phone:              request.phone       ?? "",
                street:             request.street      ?? "",
                apt:                request.apt_suite   ?? "",
                city:               request.city        ?? "",
                state:              request.state       ?? "",
                zip:                request.zip_code    ?? "",
                serviceType:        request.service_type ?? "",
                selectedDate:       request.preferred_date ? parseISO(request.preferred_date) : undefined,
                timePreference:     request.time_preference ?? "",
                bedrooms:           request.bedrooms  != null ? String(request.bedrooms)  : "",
                bathrooms:          request.bathrooms != null ? String(request.bathrooms) : "",
                additionalServices: (request.additional_services as string[]) ?? [],
                commercialType:     request.commercial_property_type ?? "",
                otherCommercialType: request.other_commercial_type   ?? "",
                serviceDetails:     request.service_details          ?? "",
                customAnswers:      (request.custom_answers as Record<string, string>) ?? {},
                existingAttachments: ((request as any).attachments as BookingAttachmentMeta[] ?? []).map(
                  (att) => ({
                    ...att,
                    public_url: supabase.storage.from("route-files").getPublicUrl(att.path).data.publicUrl,
                  })
                ),
                initialContactType: ((request as any).contact_type === "client" || (request as any).contact_type === "lead")
                  ? (request as any).contact_type as "client" | "lead"
                  : null,
                initialClientId: (request as any).client_id ?? null,
                initialLeadId:   (request as any).lead_id   ?? null,
              }}
              customQuestions={customQuestions}
              isSaving={isPending}
              onSave={handleSave}
              onCancel={onClose}
            />
          </div>
        )}
      </div>
    </FullScreenModal>
  );
}
