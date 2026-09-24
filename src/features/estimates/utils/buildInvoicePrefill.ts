import type { InvoicePrefill } from "@/features/invoices/pages/CreateInvoicePage";

interface EstimateForPrefill {
  client_name:    string;
  company_name?:  string | null;
  phone:          string;
  email:          string;
  address:        string;
  apt?:           string | null;
  city:           string;
  state:          string;
  zip:            string;
  service_type:   string;
  total:          number;
  discount_type?:  string | null;
  discount_value?: number | null;
  service_scope?:  string | null;
}

export function buildInvoicePrefillFromEstimate(estimate: EstimateForPrefill): InvoicePrefill {
  const today   = new Date();
  const dueDate = new Date();
  dueDate.setDate(today.getDate() + 7);

  return {
    selectedClient: {
      full_name:      estimate.client_name,
      company:        estimate.company_name ?? undefined,
      phone:          estimate.phone,
      email:          estimate.email,
      service_street: estimate.address,
      service_apt:    estimate.apt ?? undefined,
      service_city:   estimate.city,
      service_state:  estimate.state,
      service_zip:    estimate.zip,
    },
    invoiceType:   "single",
    issueDate:     today,
    dueDate,
    invoiceTitle:  `Service (${estimate.service_type})`,
    lineItems: [{
      id:          Math.random().toString(36).slice(2, 9),
      description: estimate.service_type,
      price:       estimate.total.toString(),
      qty:         "1",
      total:       estimate.total,
    }],
    discountType:  estimate.discount_type  ?? "",
    discountValue: estimate.discount_value?.toString() ?? "",
    notes:         estimate.service_scope  ?? "",
  };
}
