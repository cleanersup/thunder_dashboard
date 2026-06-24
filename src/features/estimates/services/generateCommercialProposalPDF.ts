/**
 * @module generateCommercialProposalPDF
 * Generates a multi-page jsPDF document for commercial cleaning proposals.
 * Ported from swift-slate/src/lib/pdfGenerator.ts — generateProposalPDF.
 */
import jsPDF from "jspdf";

// Translate stored Spanish keys → English display text
const translate = (value: string): string => {
  const map: Record<string, string> = {
    bajo: "Low", medio: "Medium", alto: "High",
    diurno: "Day Shift", nocturno: "Night Shift",
    "bien-mantenido": "Well Maintained", sucio: "Dirty", "muy-sucio": "Very Dirty",
    "one-time": "One Time", recurrent: "Recurring",
    hoods: "Hoods", windows: "Windows", refrigerators: "Refrigerators",
    "inside-windows": "Inside Windows", "outside-windows": "Outside Windows",
    sidewalks: "Sidewalks", store: "Store",
  };
  if (value.includes(",")) {
    return value.split(",").map((v) => map[v.trim()] ?? v.trim()).join(", ");
  }
  return map[value] ?? value;
};

export interface CommercialProposalData {
  companyLogo?: string;
  companyName:  string;
  companyPhone: string;
  companyEmail: string;
  clientName:    string;
  clientEmail:   string;
  clientPhone:   string;
  clientAddress: string;
  propertyType:        string;
  propertySize:        string;
  serviceType:         string;
  serviceSchedule:     string;
  greaseLevel?:        string;
  restaurantCondition?: string;
  extraServices:       string[];
  cleaningDuration:    number;
  startTime:           string;
  scopeDetails:        string;
  finalPrice:          string;
}

export const generateCommercialProposalPDF = (data: CommercialProposalData): jsPDF => {
  const doc        = new jsPDF();
  const pageWidth  = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin       = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  const deposit = (parseFloat(data.finalPrice.replace(/,/g, "")) * 0.5)
    .toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const addText = (text: string, fontSize = 10, bold = false, indent = 0) => {
    doc.setFontSize(fontSize);
    doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines = doc.splitTextToSize(text, contentWidth - indent);
    lines.forEach((line: string) => {
      if (y > pageHeight - margin) { doc.addPage(); y = margin; }
      doc.text(line, margin + indent, y);
      y += fontSize * 0.5;
    });
  };

  const addLine = () => {
    if (y > pageHeight - margin) { doc.addPage(); y = margin; }
    doc.line(margin, y, pageWidth - margin, y);
    y += 5;
  };

  const addSpace = (n = 5) => { y += n; };

  // ── Page 1 — Cover ─────────────────────────────────────────────────────────
  if (data.companyLogo) {
    try {
      const s = 40;
      doc.addImage(data.companyLogo, "PNG", (pageWidth - s) / 2, y, s, s);
      y += s + 10;
    } catch { /* logo load failure is non-fatal */ }
  }

  y = pageHeight / 3;
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("COMMERCIAL CLEANING SERVICES", pageWidth / 2, y, { align: "center" });
  y += 10;
  doc.text("PROPOSAL", pageWidth / 2, y, { align: "center" });

  // ── Page 2 — Service Provider, Client, Specifications ─────────────────────
  doc.addPage();
  y = margin;

  addText("SERVICE PROVIDER:", 12, true);
  addSpace(3);
  addText(data.companyName,  10, false, 5);
  addText(data.companyPhone, 10, false, 5);
  addText(data.companyEmail, 10, false, 5);
  addSpace(8);

  addText("CLIENT:", 12, true);
  addSpace(3);
  addText(data.clientName,    10, false, 5);
  addText(data.clientEmail,   10, false, 5);
  addText(data.clientPhone,   10, false, 5);
  addText(data.clientAddress, 10, false, 5);
  addSpace(8);

  addText("SERVICE SPECIFICATIONS:", 12, true);
  addSpace(3);
  addText(`Property Type: ${translate(data.propertyType)}`,         10, false, 5);
  addText(`Property Size: ${data.propertySize} sqft`,                10, false, 5);
  addText(`Service Type: ${translate(data.serviceType)}`,            10, false, 5);
  addText(`Service Schedule: ${translate(data.serviceSchedule)}`,    10, false, 5);
  if (data.greaseLevel)        addText(`Grease Level: ${translate(data.greaseLevel)}`,               10, false, 5);
  if (data.restaurantCondition) addText(`Restaurant Condition: ${translate(data.restaurantCondition)}`, 10, false, 5);
  if (data.extraServices.length > 0)
    addText(`Extra Services: ${translate(data.extraServices.join(", "))}`, 10, false, 5);
  addText(`Cleaning Duration: ${data.cleaningDuration} hours`, 10, false, 5);
  addText(`Time: ${data.startTime}`,                           10, false, 5);
  addText(`Service Scope: ${data.scopeDetails || "N/A"}`,      10, false, 5);

  // ── Page 3 — Contract Terms (1–3) ──────────────────────────────────────────
  doc.addPage();
  y = margin;

  addText("CONTRACT TERMS", 14, true);
  addLine();
  addSpace(5);

  addText("1) Price and Payment Terms", 11, true);
  addSpace(3);
  addText(`The total price for the commercial cleaning service described in this agreement is $${data.finalPrice} USD`, 10);
  addSpace(2);
  addText("Payment shall be divided into two equal installments as follows:", 10);
  addText(`• 50% deposit ($${deposit}) due prior to the start of the cleaning service.`, 10, false, 5);
  addText(`• Remaining 50% ($${deposit}) due immediately upon completion of the cleaning project.`, 10, false, 5);
  addSpace(2);
  addText("The cleaning service cannot begin without receipt of the initial 50% payment.", 10);
  addSpace(2);
  addText("Accepted payment methods include:", 10);
  addText("• Debit or credit card", 10, false, 5);
  addText("• Cash payment",         10, false, 5);
  addText(`• Checks made payable to ${data.companyName}`, 10, false, 5);
  addSpace(5);

  addText("2) 50% ADVANCE PAYMENT POLICY", 11, true);
  addSpace(3);
  addText("To initiate this contract and secure the first cleaning appointment, the client is required to make an advance payment of 50% of the first month's fee. This initial payment serves as a booking confirmation and is mandatory to activate the contract. Failure to provide the 50% advance will result in the inability to schedule or begin the cleaning services.", 10);
  addSpace(2);
  addText("The remaining balance for the first month will be due according to the agreed payment schedule.", 10);
  addSpace(5);

  addText("3) Cancellation Policy", 11, true);
  addSpace(3);
  addText(`In the event that the Client (${data.clientName}), wishes to cancel the services after making the initial deposit, he may do so without any issues.`, 10);
  addSpace(2);
  addText(`${data.companyName} will retain 15% of the initial deposit as a non-refundable administrative fee. The remaining 85% of the deposit will be returned to the Client.`, 10);
  addSpace(2);
  addText(`All cancellation notices must be submitted in writing, either via email to ${data.companyEmail} or by certified mail to the company address.`, 10);
  addSpace(5);

  // ── Page 4 — Contract Terms (4–6) ──────────────────────────────────────────
  doc.addPage();
  y = margin;

  addText("4) No Refund Clause", 11, true);
  addSpace(3);
  addText(`${data.companyName} maintains a strict no-refund policy. Under no circumstances will refunds be issued for dissatisfaction with the service or for any other reason, once the services have commenced or been completed as described in this Agreement.`, 10);
  addSpace(2);
  addText("By signing this Agreement, the Client acknowledges and agrees to this no-refund policy and waives any right to dispute charges or request reimbursement for services rendered.", 10);
  addSpace(5);

  addText("5) ACTIONS IN CASE OF NON-PAYMENT", 11, true);
  addSpace(3);
  addText("If the client fails or refuses to make the final payment as stipulated in this contract, our company reserves the right to initiate legal actions. This includes reporting the matter to the appropriate authorities and filing a formal claim with the Small Claims Court at the county level.", 10);
  addSpace(2);
  addText("Such measures will be pursued to recover the outstanding balance, and all related costs may be charged to the client.", 10);
  addSpace(5);

  addText("6) Non-Compete Clause", 11, true);
  addSpace(3);
  addText("The Client agrees that, for the duration of this Agreement and for a period of twelve (12) months following its termination or completion, they shall not:", 10);
  addText(`1. Directly or indirectly solicit, hire, or attempt to hire any employee, contractor, or subcontractor of ${data.companyName} who was involved in the performance of services under this Agreement.`, 10, false, 5);
  addText(`2. Engage with or contract any individual or third party using confidential or proprietary information obtained through this Agreement with the intention of replicating or continuing similar services without the involvement of ${data.companyName}.`, 10, false, 5);
  addSpace(2);
  addText("Violation of this clause will be considered a material breach of the Agreement and may result in legal action, including but not limited to injunctive relief and damages.", 10);
  addSpace(5);

  // ── Page 5 — Contract Terms (7–9) ──────────────────────────────────────────
  doc.addPage();
  y = margin;

  addText("7) PRODUCTS AND EQUIPMENT", 11, true);
  addSpace(3);
  addText("Our company will provide all necessary cleaning products and equipment required to perform the services at the client's property. The client is not responsible for supplying any cleaning materials.", 10);
  addSpace(2);
  addText("If the client requests that a specific or personal product be used, the company will not be held liable for the effectiveness, results, or any damage that may arise from the use of that product.", 10);
  addSpace(5);

  addText("8) Anti-Harassment and Respect Policy", 11, true);
  addSpace(3);
  addText(`The Client agrees to provide a safe, respectful, and harassment-free work environment for all employees and representatives of ${data.companyName} throughout the duration of the services.`, 10);
  addSpace(2);
  addText(`Any form of harassment, discrimination, verbal abuse, intimidation, or inappropriate behavior by the Client or its staff toward ${data.companyName} personnel will be considered a serious breach of this Agreement and may result in the immediate suspension or termination of services without refund or liability.`, 10);
  addSpace(2);
  addText(`${data.companyName} reserves the right to remove its staff from the job site at any time if working conditions are deemed unsafe, hostile, or inappropriate.`, 10);
  addSpace(5);

  addText("9) INSURANCE COVERAGE", 11, true);
  addSpace(3);
  addText("To ensure a high standard of service and provide peace of mind to our clients, our company maintains active insurance coverage that protects the client's property against potential damages or incidents that may occur during the execution of our cleaning services.", 10);
  addSpace(2);
  addText("Proof of insurance can be provided upon request.", 10);
  addSpace(5);

  addText("10) LIABILITY AND DAMAGES", 11, true);
  addSpace(3);
  addText("Our company will exercise reasonable care in providing cleaning services at the client's property. However, the company shall not be held liable for any pre-existing damages or for any damages resulting from conditions beyond our control.", 10);
  addSpace(2);
  addText("The client agrees to notify the company immediately of any delicate or valuable items, and the company will take necessary precautions to avoid damage.", 10);
  addSpace(2);
  addText("In the event of any damage directly caused by our employees during the performance of the contracted services, the company will take responsibility for repairing or compensating the client, provided that the damage is reported within 48 hours of service completion.", 10);
  addSpace(2);
  addText("The company's total liability for damages under this contract shall not exceed the amount paid by the client for the service during the month in which the incident occurred.", 10);
  addSpace(5);

  addText("11) Confidentiality", 11, true);
  addSpace(3);
  addText("Both parties agree to maintain the confidentiality of any proprietary, sensitive, or confidential information disclosed during the term of this Agreement. Neither party shall disclose such information to any third party without the prior written consent of the other, except as required by law.", 10);
  addSpace(2);
  addText("This obligation shall survive the termination or expiration of this Agreement and remain in effect indefinitely.", 10);
  addSpace(5);

  addText("12) WORK SCHEDULE AND CHANGES", 11, true);
  addSpace(3);
  addText("The cleaning services will be provided according to the agreed-upon schedule specified in this contract.", 10);
  addSpace(2);
  addText("Should the client require any changes to the work schedule, they must notify the company at least seven (7) days in advance by submitting a written notice either via letter or email.", 10);
  addSpace(2);
  addText("The company will make reasonable efforts to accommodate schedule changes, subject to availability and prior confirmation.", 10);
  addSpace(5);

  addText("13) EMPLOYEE CONDUCT AND DRESS CODE", 11, true);
  addSpace(3);
  addText("Our company is committed to maintaining the highest standards of professionalism and appearance. All employees are expected to adhere to a strict dress code and conduct themselves respectfully while on the client's property.", 10);
  addSpace(2);
  addText("The client has the full right to report any employee behavior they consider inappropriate or unprofessional. Such reports should be communicated promptly to our company's management for immediate internal review and action.", 10);
  addSpace(2);
  addText("We take all complaints seriously and will investigate and address any incidents to ensure the integrity and quality of our services.", 10);
  addSpace(5);

  // ── Final Page — Agreement Execution ───────────────────────────────────────
  doc.addPage();
  y = margin;

  addText("14) AGREEMENT EXECUTION", 11, true);
  addSpace(10);

  const colWidth = contentWidth / 2 - 5;
  const clientX  = pageWidth / 2 + 5;

  // Service Provider column
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("SERVICE PROVIDER:", margin, y); y += 7;
  doc.setFont("helvetica", "normal");
  doc.text(data.companyName,  margin, y); y += 5;
  doc.text(data.companyPhone, margin, y); y += 5;
  doc.text(data.companyEmail, margin, y); y += 15;
  doc.line(margin, y, margin + colWidth, y); y += 5;
  doc.setFontSize(8); doc.text("Signature", margin, y); y += 10;
  doc.line(margin, y, margin + colWidth, y); y += 5;
  doc.text("Date", margin, y);

  // Client column
  y = margin + 18;
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("CLIENT:", clientX, y); y += 7;
  doc.setFont("helvetica", "normal");
  doc.text(data.clientName,  clientX, y); y += 5;
  doc.text(data.clientPhone, clientX, y); y += 5;
  doc.text(data.clientEmail, clientX, y); y += 15;
  doc.line(clientX, y, clientX + colWidth, y); y += 5;
  doc.setFontSize(8); doc.text("Signature", clientX, y); y += 10;
  doc.line(clientX, y, clientX + colWidth, y); y += 5;
  doc.text("Date", clientX, y);

  return doc;
};
