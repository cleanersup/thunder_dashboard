import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/shared/components/ui/use-toast";
import {
  updatePersonalInfo,
  updateCompanyInfo,
  updatePassword,
  uploadLogo,
  fetchPublicProfile,
} from "../services/settingsService";
import type { EditProfileFormData, EditCompanyFormData } from "../schemas/settingsSchemas";
import { supabase } from "@/integrations/supabase/client";

// ─── Personal Info ────────────────────────────────────────────────────────────

export function useUpdatePersonalInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EditProfileFormData) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      return updatePersonalInfo(user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

// ─── Company Info ─────────────────────────────────────────────────────────────

export function useUpdateCompanyInfo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EditCompanyFormData) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      return updateCompanyInfo(user.id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}

// ─── Password ─────────────────────────────────────────────────────────────────

export function useUpdatePassword() {
  return useMutation({
    mutationFn: ({
      currentPassword,
      newPassword,
    }: {
      currentPassword: string;
      newPassword: string;
    }) => updatePassword(currentPassword, newPassword),
  });
}

// ─── Logo Upload ──────────────────────────────────────────────────────────────

export function useUploadLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      return uploadLogo(user.id, file);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast({ title: "Logo updated" });
    },
    onError: () => {
      toast({ title: "Failed to upload logo", variant: "destructive" });
    },
  });
}

// ─── Public Profile ───────────────────────────────────────────────────────────

export function usePublicProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["public-profile", userId],
    queryFn: () => fetchPublicProfile(userId!),
    enabled: !!userId,
    staleTime: 5 * 60 * 1000,
  });
}
