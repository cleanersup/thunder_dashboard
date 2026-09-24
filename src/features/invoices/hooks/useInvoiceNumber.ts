/**
 * @module useInvoiceNumber
 * Hook to generate the next sequential invoice number.
 * Never caches the result — each mount fetches a fresh number.
 */
import { useQuery } from "@tanstack/react-query";
import { generateInvoiceNumber } from "../services/invoicesService";

export function useInvoiceNumber(enabled: boolean = true) {
  return useQuery({
    queryKey: ["invoice-number-next"],
    queryFn: generateInvoiceNumber,
    enabled,
    staleTime: 0,
    gcTime: 0,
  });
}
