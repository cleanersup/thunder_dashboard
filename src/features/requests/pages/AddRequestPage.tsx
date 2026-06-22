import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { createRequest } from "../services/requestsService";
import { useCustomQuestions } from "../hooks/useCustomQuestions";
import { RequestForm } from "../components/RequestForm";
import { FullScreenModal } from "@/shared/components/common/FullScreenModal";
import { Button } from "@/shared/components/ui/button";
import { QK } from "@/shared/config/queryKeys";
import type { RequestPayload } from "../types/request.types";

interface AddRequestPageProps {
  open?: boolean;
  onClose?: () => void;
}

export function AddRequestPage({ open, onClose }: AddRequestPageProps = {}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const { data: customQuestions = [] } = useCustomQuestions();

  const isModal = onClose !== undefined;

  const handleClose = () => {
    if (isModal) onClose?.();
    else navigate("/requests");
  };

  const handleSave = async (payload: RequestPayload) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      await createRequest(user.id, payload);
      qc.invalidateQueries({ queryKey: QK.requests });
      toast.success("Request created");
      handleClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create request";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isModal) {
    return (
      <FullScreenModal open={open ?? false} onClose={handleClose}>
        {/* Header */}
        <div className="border-b flex-shrink-0 bg-white">
          <div className="max-w-2xl mx-auto">
            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="w-1/3" />
              <div className="w-1/3 text-center">
                <h1 className="font-semibold text-base leading-tight">New Request</h1>
              </div>
              <div className="flex items-center w-1/3 justify-end">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto bg-background">
          <div className="max-w-2xl mx-auto px-4 space-y-4 py-6 pb-4">
            <RequestForm
              isModal
              title="New Request"
              mode="create"
              customQuestions={customQuestions}
              isSaving={isSaving}
              onSave={handleSave}
              onCancel={handleClose}
            />
          </div>
        </div>
      </FullScreenModal>
    );
  }

  return (
    <RequestForm
      title="New Request"
      mode="create"
      customQuestions={customQuestions}
      isSaving={isSaving}
      onSave={handleSave}
      onCancel={handleClose}
    />
  );
}
