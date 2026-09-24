/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { toast } from "sonner";
import { generateEstimateShareToken } from "../services/estimatesService";

/**
 * Generates a public share link for an estimate and copies it to the clipboard.
 * @returns generateShareLink function and isGeneratingLink boolean
 */
export function useEstimateShare() {
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const generateShareLink = async (estimateId: string) => {
    setIsGeneratingLink(true);
    try {
      const token   = await generateEstimateShareToken(estimateId);
      const baseUrl = import.meta.env.VITE_PUBLIC_APP_URL || import.meta.env.VITE_APP_URL || window.location.origin;
      const shareUrl = `${baseUrl}/public/estimate/${token}`;

      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard");
      return { success: true, url: shareUrl };
    } catch (err: any) {
      console.error("Error generating share link:", err);
      toast.error("Failed to generate share link");
      return { success: false, error: err.message };
    } finally {
      setIsGeneratingLink(false);
    }
  };

  return { generateShareLink, isGeneratingLink };
}
