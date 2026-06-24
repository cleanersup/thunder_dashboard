/**
 * @module CommPreviewStep — Step 6 (Commercial)
 * Full proposal preview (COMMERCIAL CLEANING SERVICES / PROPOSAL) + Download PDF.
 * Mirrors swift-slate ProposalPreview.tsx exactly.
 */
import { useState } from "react";
import { Download, Building2, Mail, Phone, MapPin } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { generateCommercialProposalPDF } from "../../services/generateCommercialProposalPDF";

// Translate stored Spanish keys → English display
const tr = (v: string): string => {
  const m: Record<string, string> = {
    bajo: "Low", medio: "Medium", alto: "High",
    diurno: "Day Shift", nocturno: "Night Shift",
    "bien-mantenido": "Well Maintained", sucio: "Dirty", "muy-sucio": "Very Dirty",
    "one-time": "One Time", recurrent: "Recurring",
    hoods: "Hoods", windows: "Windows", refrigerators: "Refrigerators",
    "inside-windows": "Inside Windows", "outside-windows": "Outside Windows",
    sidewalks: "Sidewalks", store: "Store",
  };
  if (v.includes(",")) return v.split(",").map((x) => m[x.trim()] ?? x.trim()).join(", ");
  return m[v] ?? v;
};

interface ClientInfo {
  name:     string;
  company?: string;
  email:    string;
  phone:    string;
  address?: string;
  city?:    string;
  state?:   string;
  zip?:     string;
}

interface CompanyInfo {
  name?:  string;
  phone?: string;
  email?: string;
  logo?:  string;
}

export interface CommPreviewStepProps {
  client:                 ClientInfo | null;
  company:                CompanyInfo;
  propertyType:           string;
  propertySize:           string;
  serviceType:            "one-time" | "recurrent" | "";
  recurringFrequency:     string;
  contractDuration:       string;
  contractTimeUnit:       string;
  groupB:                 boolean;
  serviceSchedule:        string;
  greaseLevel:            string;
  restaurantCondition:    string;
  dustLevel:              string;
  propertyCondition:      string;
  clientProvidesSupplies: boolean;
  extraServices:          string[];
  employeeCount:          number;
  hourlyRate:             string;
  cleaningDuration:       number;
  startTime:              string;
  scope:                  string;
  total:                  number;
  subtotal:               number;
  applyDiscount:          boolean;
  discountType:           "percentage" | "amount";
  discountValue:          string;
}

export function CommPreviewStep({
  client, company,
  propertyType, propertySize, serviceType,
  groupB, serviceSchedule, greaseLevel, restaurantCondition, dustLevel, propertyCondition,
  extraServices, cleaningDuration, startTime, scope, total,
}: CommPreviewStepProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const clientAddress = [client?.address, client?.city, client?.state, client?.zip]
    .filter(Boolean).join(", ");

  const finalPrice = total.toLocaleString("en-US", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

  const deposit = (total * 0.5).toLocaleString("en-US", {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  });

  const isRestaurant = ["restaurant", "food-truck", "food truck"].includes(
    propertyType.toLowerCase()
  );

  async function handleDownloadPDF() {
    setIsGenerating(true);
    try {
      const doc = generateCommercialProposalPDF({
        companyLogo:         company.logo,
        companyName:         company.name  ?? "",
        companyPhone:        company.phone ?? "",
        companyEmail:        company.email ?? "",
        clientName:          client?.name    ?? "",
        clientEmail:         client?.email   ?? "",
        clientPhone:         client?.phone   ?? "",
        clientAddress,
        propertyType,
        propertySize,
        serviceType,
        serviceSchedule,
        greaseLevel:         groupB ? greaseLevel        : undefined,
        restaurantCondition: groupB ? restaurantCondition : undefined,
        extraServices,
        cleaningDuration,
        startTime,
        scopeDetails: scope,
        finalPrice,
      });
      doc.save(`Commercial_Proposal_${client?.name ?? "Client"}.pdf`);
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Download button */}
      <Button
        onClick={handleDownloadPDF}
        disabled={isGenerating}
        className="w-full"
      >
        <Download className="w-4 h-4 mr-2" />
        {isGenerating ? "Generating PDF…" : "Download PDF"}
      </Button>

      {/* Proposal preview — hardcoded bg-white/text-black to match document style */}
      <div className="bg-white text-black p-8 space-y-8 max-h-[600px] overflow-y-auto overflow-x-hidden w-full rounded-lg border border-gray-200 text-sm">

        {/* Cover */}
        <div className="min-h-[300px] flex flex-col items-center justify-center space-y-6 border-b border-gray-300 pb-8">
          {company.logo && (
            <img src={company.logo} alt="Company Logo" className="w-32 h-32 object-contain" />
          )}
          <h1 className="text-3xl font-bold text-center">
            COMMERCIAL CLEANING SERVICES<br />PROPOSAL
          </h1>
        </div>

        {/* Service Provider + Client + Specifications */}
        <div className="space-y-6 border-b border-gray-300 pb-8">
          <div className="space-y-2">
            <h2 className="text-xl font-bold border-b border-gray-400 pb-2">SERVICE PROVIDER:</h2>
            <div className="space-y-1 pl-4">
              <p className="flex items-center gap-2"><Building2 className="w-4 h-4" /> {company.name}</p>
              <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> {company.phone}</p>
              <p className="flex items-center gap-2"><Mail className="w-4 h-4" /> {company.email}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold border-b border-gray-400 pb-2">CLIENT:</h2>
            <div className="space-y-1 pl-4">
              <p>{client?.name}</p>
              <p className="flex items-center gap-2"><Mail className="w-4 h-4" /> {client?.email}</p>
              <p className="flex items-center gap-2"><Phone className="w-4 h-4" /> {client?.phone}</p>
              {clientAddress && <p className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {clientAddress}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold border-b border-gray-400 pb-2">SERVICE SPECIFICATIONS:</h2>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2 pl-4">
              <div><span className="font-semibold">Property Type:</span> {tr(propertyType)}</div>
              <div><span className="font-semibold">Property Size:</span> {propertySize} sqft</div>
              <div><span className="font-semibold">Service Type:</span> {tr(serviceType)}</div>
              <div><span className="font-semibold">Service Schedule:</span> {tr(serviceSchedule)}</div>
              {isRestaurant && greaseLevel && (
                <div><span className="font-semibold">Grease Level:</span> {tr(greaseLevel)}</div>
              )}
              {isRestaurant && restaurantCondition && (
                <div><span className="font-semibold">Restaurant Condition:</span> {tr(restaurantCondition)}</div>
              )}
              {!isRestaurant && dustLevel && (
                <div><span className="font-semibold">Dust Level:</span> {tr(dustLevel)}</div>
              )}
              {!isRestaurant && propertyCondition && (
                <div><span className="font-semibold">Property Condition:</span> {tr(propertyCondition)}</div>
              )}
              {extraServices.length > 0 && (
                <div className="col-span-2"><span className="font-semibold">Extra Services:</span> {extraServices.map(tr).join(", ")}</div>
              )}
              <div><span className="font-semibold">Cleaning Duration:</span> {cleaningDuration} hours</div>
              <div><span className="font-semibold">Time:</span> {startTime}</div>
              <div className="col-span-2"><span className="font-semibold">Service Scope:</span> {scope || "N/A"}</div>
            </div>
          </div>
        </div>

        {/* Contract Terms */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold border-b border-gray-400 pb-2">CONTRACT TERMS</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-base mb-2">1) Price and Payment Terms</h3>
              <p className="mb-2">The total price for the commercial cleaning service described in this agreement is <span className="font-bold">${finalPrice} USD</span></p>
              <p className="mb-2">Payment shall be divided into two equal installments as follows:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>50% deposit (${deposit}) due prior to the start of the cleaning service.</li>
                <li>Remaining 50% (${deposit}) due immediately upon completion of the cleaning project.</li>
              </ul>
              <p className="mt-2">The cleaning service cannot begin without receipt of the initial 50% payment.</p>
              <p className="mt-2">Accepted payment methods include:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Debit or credit card</li>
                <li>Cash payment</li>
                <li>Checks made payable to {company.name}</li>
              </ul>
              <p className="mt-2">The client may choose whichever payment method is most convenient.</p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">2) 50% ADVANCE PAYMENT POLICY</h3>
              <p>To initiate this contract and secure the first cleaning appointment, the client is required to make an advance payment of 50% of the first month's fee. This initial payment serves as a booking confirmation and is mandatory to activate the contract. Failure to provide the 50% advance will result in the inability to schedule or begin the cleaning services.</p>
              <p className="mt-2">The remaining balance for the first month will be due according to the agreed payment schedule.</p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">3) Cancellation Policy</h3>
              <p>In the event that the Client ({client?.name}), wishes to cancel the services after making the initial deposit, he may do so without any issues.</p>
              <p className="mt-2">{company.name} will retain 15% of the initial deposit as a non-refundable administrative fee. The remaining 85% of the deposit will be returned to the Client.</p>
              <p className="mt-2">All cancellation notices must be submitted in writing, either via email to {company.email} or by certified mail to the company address.</p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">4) No Refund Clause</h3>
              <p>{company.name} maintains a strict no-refund policy. Under no circumstances will refunds be issued for dissatisfaction with the service or for any other reason, once the services have commenced or been completed as described in this Agreement.</p>
              <p className="mt-2">By signing this Agreement, the Client acknowledges and agrees to this no-refund policy and waives any right to dispute charges or request reimbursement for services rendered.</p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">5) ACTIONS IN CASE OF NON-PAYMENT</h3>
              <p>If the client fails or refuses to make the final payment as stipulated in this contract, our company reserves the right to initiate legal actions. This includes reporting the matter to the appropriate authorities and filing a formal claim with the Small Claims Court at the county level.</p>
              <p className="mt-2">Such measures will be pursued to recover the outstanding balance, and all related costs may be charged to the client.</p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">6) Non-Compete Clause</h3>
              <p>The Client agrees that, for the duration of this Agreement and for a period of twelve (12) months following its termination or completion, they shall not:</p>
              <ol className="list-decimal pl-6 space-y-1 mt-2">
                <li>Directly or indirectly solicit, hire, or attempt to hire any employee, contractor, or subcontractor of {company.name} who was involved in the performance of services under this Agreement.</li>
                <li>Engage with or contract any individual or third party using confidential or proprietary information obtained through this Agreement with the intention of replicating or continuing similar services without the involvement of {company.name}.</li>
              </ol>
              <p className="mt-2">Violation of this clause will be considered a material breach of the Agreement and may result in legal action, including but not limited to injunctive relief and damages.</p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">7) PRODUCTS AND EQUIPMENT</h3>
              <p>Our company will provide all necessary cleaning products and equipment required to perform the services at the client's property. The client is not responsible for supplying any cleaning materials.</p>
              <p className="mt-2">If the client requests that a specific or personal product be used, the company will not be held liable for the effectiveness, results, or any damage that may arise from the use of that product.</p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">8) Anti-Harassment and Respect Policy</h3>
              <p>The Client agrees to provide a safe, respectful, and harassment-free work environment for all employees and representatives of {company.name} throughout the duration of the services.</p>
              <p className="mt-2">Any form of harassment, discrimination, verbal abuse, intimidation, or inappropriate behavior by the Client or its staff toward {company.name} personnel will be considered a serious breach of this Agreement and may result in the immediate suspension or termination of services without refund or liability.</p>
              <p className="mt-2">{company.name} reserves the right to remove its staff from the job site at any time if working conditions are deemed unsafe, hostile, or inappropriate.</p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">9) INSURANCE COVERAGE</h3>
              <p>To ensure a high standard of service and provide peace of mind to our clients, our company maintains active insurance coverage that protects the client's property against potential damages or incidents that may occur during the execution of our cleaning services.</p>
              <p className="mt-2">Proof of insurance can be provided upon request.</p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">10) LIABILITY AND DAMAGES</h3>
              <p>Our company will exercise reasonable care in providing cleaning services at the client's property. However, the company shall not be held liable for any pre-existing damages or for any damages resulting from conditions beyond our control.</p>
              <p className="mt-2">The client agrees to notify the company immediately of any delicate or valuable items, and the company will take necessary precautions to avoid damage.</p>
              <p className="mt-2">In the event of any damage directly caused by our employees during the performance of the contracted services, the company will take responsibility for repairing or compensating the client, provided that the damage is reported within 48 hours of service completion.</p>
              <p className="mt-2">The company's total liability for damages under this contract shall not exceed the amount paid by the client for the service during the month in which the incident occurred.</p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">11) Confidentiality</h3>
              <p>Both parties agree to maintain the confidentiality of any proprietary, sensitive, or confidential information disclosed during the term of this Agreement. Neither party shall disclose such information to any third party without the prior written consent of the other, except as required by law.</p>
              <p className="mt-2">This obligation shall survive the termination or expiration of this Agreement and remain in effect indefinitely.</p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">12) WORK SCHEDULE AND CHANGES</h3>
              <p>The cleaning services will be provided according to the agreed-upon schedule specified in this contract.</p>
              <p className="mt-2">Should the client require any changes to the work schedule, they must notify the company at least seven (7) days in advance by submitting a written notice either via letter or email.</p>
              <p className="mt-2">The company will make reasonable efforts to accommodate schedule changes, subject to availability and prior confirmation.</p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">13) EMPLOYEE CONDUCT AND DRESS CODE</h3>
              <p>Our company is committed to maintaining the highest standards of professionalism and appearance. All employees are expected to adhere to a strict dress code and conduct themselves respectfully while on the client's property.</p>
              <p className="mt-2">The client has the full right to report any employee behavior they consider inappropriate or unprofessional. Such reports should be communicated promptly to our company's management for immediate internal review and action.</p>
              <p className="mt-2">We take all complaints seriously and will investigate and address any incidents to ensure the integrity and quality of our services.</p>
            </div>

            <div>
              <h3 className="font-bold text-base mb-2">14) AGREEMENT EXECUTION</h3>
              <div className="grid grid-cols-2 gap-4 mt-3">
                <div className="space-y-2">
                  <p className="font-bold text-sm">SERVICE PROVIDER:</p>
                  <div className="space-y-0.5 text-xs">
                    <p>{company.name}</p>
                    <p>{company.phone}</p>
                    <p>{company.email}</p>
                  </div>
                  <div className="border-t border-black pt-1 mt-4">
                    <p className="text-xs">Signature</p>
                  </div>
                  <div className="border-t border-black pt-1">
                    <p className="text-xs">Date</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="font-bold text-sm">CLIENT:</p>
                  <div className="space-y-0.5 text-xs">
                    <p>{client?.name}</p>
                    <p>{client?.phone}</p>
                    <p>{client?.email}</p>
                  </div>
                  <div className="border-t border-black pt-1 mt-4">
                    <p className="text-xs">Signature</p>
                  </div>
                  <div className="border-t border-black pt-1">
                    <p className="text-xs">Date</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
