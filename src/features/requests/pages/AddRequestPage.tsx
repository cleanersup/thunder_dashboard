import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createRequest } from "../services/requestsService";
import { useCustomQuestions } from "../hooks/useCustomQuestions";
import { RequestForm } from "../components/RequestForm";
import { QK } from "@/shared/config/queryKeys";
import type { RequestPayload } from "../types/request.types";

export function AddRequestPage() {
  const navigate        = useNavigate();
  const qc              = useQueryClient();
  const [isSaving, setIsSaving] = useState(false);
  const { data: customQuestions = [] } = useCustomQuestions();

  const handleSave = async (payload: RequestPayload) => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      await createRequest(user.id, payload);
      qc.invalidateQueries({ queryKey: QK.requests });
      toast.success("Request created");
      navigate("/requests");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create request";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <RequestForm
      title="New Request"
      mode="create"
      customQuestions={customQuestions}
      isSaving={isSaving}
      onSave={handleSave}
      onCancel={() => navigate("/requests")}
    />
  );
}
