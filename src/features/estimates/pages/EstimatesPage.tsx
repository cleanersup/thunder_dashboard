/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { QK } from "@/shared/config/queryKeys";
import { format } from "date-fns";
import { formatDateOnly } from "@/shared/utils/formatters";
import { cn } from "@/shared/utils/cn";
import { toast } from "sonner";
import {
  Plus, Search, CheckCircle, Clock, FileText, DollarSign,
  MoreHorizontal, Edit, Mail, Share, Download, X, ChevronLeft, ChevronRight,
  BookOpen, FileSignature, Play, RefreshCw, Trash2, Calendar as CalendarIcon, MessageSquare,
} from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Badge } from "@/shared/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Calendar } from "@/shared/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { useEstimates, useUpdateEstimateStatus } from "../hooks/useEstimates";
import { useEstimateShare } from "../hooks/useEstimateShare";
import { useSendEstimateEmail } from "../hooks/useSendEstimateEmail";
import { useSendEstimateSMS }   from "../hooks/useSendEstimateSMS";
import { EstimateDetailPanel } from "../components/EstimateDetailPanel";
import { CreateResidentialEstimatePage } from "./CreateResidentialEstimatePage";
import { CreateCommercialEstimatePage } from "./CreateCommercialEstimatePage";
import { useProfile } from "@/shared/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { PDFService } from "@/shared/services/pdf.service";
import { deleteDraftEstimate } from "../services/estimatesService";

// ─── Status badge ─────────────────────────────────────────────────────────────

function getStatusBadge(status: string) {
  switch (status) {
    case "Pending":
    case "Viewed":   return "bg-warning-subtle text-warning-subtle-foreground border-warning-subtle-border";
    case "Accepted": return "bg-success-subtle text-success-subtle-foreground border-success-subtle-border";
    case "Draft":    return "bg-info-subtle text-info-subtle-foreground border-info-subtle-border";
    case "Invoiced": return "bg-info-subtle text-info-subtle-foreground border-info-subtle-border";
    case "Canceled": return "bg-destructive/10 text-destructive border-destructive/30";
    default:         return "bg-muted text-muted-foreground border-border";
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function EstimatesPage() {
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();
  const { data: rawEstimates = [], isLoading } = useEstimates();

  // ── Real-time: refetch list when estimates change (viewed_at, status, etc.) ─
  useEffect(() => {
    let ch: ReturnType<typeof supabase.channel> | null = null;
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      ch = supabase
        .channel("estimates-list-realtime")
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "estimates", filter: `user_id=eq.${user.id}` },
          () => queryClient.invalidateQueries({ queryKey: QK.estimates }))
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "estimates", filter: `user_id=eq.${user.id}` },
          () => queryClient.invalidateQueries({ queryKey: QK.estimates }))
        .on("postgres_changes", { event: "DELETE", schema: "public", table: "estimates", filter: `user_id=eq.${user.id}` },
          () => queryClient.invalidateQueries({ queryKey: QK.estimates }))
        .subscribe();
    });
    return () => { if (ch) supabase.removeChannel(ch); };
  }, [queryClient]);
  const { generateShareLink, isGeneratingLink } = useEstimateShare();
  const { sendEstimateEmail, isSending }        = useSendEstimateEmail();
  const { sendEstimateSMS, isSendingSMS }       = useSendEstimateSMS();
  const updateStatus = useUpdateEstimateStatus();

  // ── Filters + pagination ──────────────────────────────────────────────────
  const [searchQuery,    setSearchQuery]    = useState("");
  const [statusFilter,   setStatusFilter]   = useState<"All" | "Pending" | "Accepted" | "Draft" | "Canceled">("All");
  const [selectedDate,   setSelectedDate]   = useState<Date | undefined>();
  const [currentPage,    setCurrentPage]    = useState(1);
  const itemsPerPage = 10;

  // ── Dialogs ───────────────────────────────────────────────────────────────
  const [selectedEstimateId, setSelectedEstimateId] = useState<string | null>(null);
  const [isDetailPanelOpen,  setIsDetailPanelOpen]  = useState(false);
  const [isAcceptDialogOpen,      setIsAcceptDialogOpen]      = useState(false);
  const [isCancelDialogOpen,      setIsCancelDialogOpen]      = useState(false);
  const [isDeleteDraftDialogOpen, setIsDeleteDraftDialogOpen] = useState(false);
  const [actionEstimate,          setActionEstimate]          = useState<any>(null);

  // ── Estimate form modals ──────────────────────────────────────────────────
  const [formModal, setFormModal] = useState<{
    type: "residential" | "commercial" | null;
    editState?: { isEditing: boolean; estimateId: string; estimateData: any };
    continueDraft?: boolean;
  }>({ type: null });

  // ── Format rows ───────────────────────────────────────────────────────────
  const formattedEstimates = rawEstimates.map((e) => ({
    id:             e.id,
    estimateNumber: `EST-${e.id.slice(0, 6)}`,
    shortDate:      format(new Date(e.created_at), "MMM dd, yyyy"),
    clientName:     e.client_name,
    serviceType:    e.service_type,
    serviceSubType: e.service_sub_type ?? "",
    total:          e.total,
    status:         e.status,
    phone:          (e as any).phone as string | null,
  }));

  // ── KPI stats ─────────────────────────────────────────────────────────────
  const accepted       = formattedEstimates.filter((e) => e.status === "Accepted");
  const pending        = formattedEstimates.filter((e) => e.status === "Pending");
  const totalValue     = formattedEstimates.reduce((s, e) => s + e.total, 0);
  const acceptanceRate = formattedEstimates.length > 0 ? ((accepted.length / formattedEstimates.length) * 100).toFixed(1) : "0.0";

  const kpiCards = [
    { title: "Total Estimates", value: formattedEstimates.length.toString(), subtitle: "All time",         icon: FileText,     borderColor: "hsl(var(--primary))" },
    { title: "Total Value",     value: `$${totalValue.toLocaleString()}`,    subtitle: "Combined",          icon: DollarSign,   borderColor: "hsl(var(--blue-vibrant))" },
    { title: "Accepted",        value: accepted.length.toString(),           subtitle: `${acceptanceRate}% rate`, icon: CheckCircle, borderColor: "hsl(var(--green-vibrant))" },
    { title: "Pending",         value: pending.length.toString(),            subtitle: "Awaiting response", icon: Clock,        borderColor: "hsl(var(--orange-vibrant))" },
  ];

  // ── Filter + paginate ─────────────────────────────────────────────────────
  const filtered = formattedEstimates
    .filter((e) => e.clientName.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((e) => statusFilter === "All" || e.status === statusFilter)
    .filter((e) => {
      if (!selectedDate) return true;
      const d = new Date(e.shortDate);
      return d.getDate() === selectedDate.getDate() && d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear();
    });

  const totalPages    = Math.ceil(filtered.length / itemsPerPage);
  const paginated     = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Opens the residential or commercial estimate wizard modal.
   *  Optionally sets edit state when editing an existing estimate. */
  function openEstimateForm(
    serviceType: string,
    editState?: { isEditing: boolean; estimateId: string; estimateData: any },
    continueDraft?: boolean,
  ) {
    setFormModal({
      type: serviceType === "Commercial" ? "commercial" : "residential",
      editState,
      continueDraft,
    });
  }

  // ── Row actions ───────────────────────────────────────────────────────────
  function openDetail(id: string) {
    setSelectedEstimateId(id);
    setIsDetailPanelOpen(true);
  }

  async function handleAcceptEstimate() {
    if (!actionEstimate) return;
    await updateStatus.mutateAsync({ id: actionEstimate.id, status: "Accepted", estimate: { client_name: actionEstimate.clientName, total: actionEstimate.total } });
    setIsAcceptDialogOpen(false);
    setActionEstimate(null);
    toast.success("Estimate accepted");
  }

  async function handleCancelEstimate() {
    if (!actionEstimate) return;
    await updateStatus.mutateAsync({ id: actionEstimate.id, status: "Canceled", estimate: { client_name: actionEstimate.clientName, total: actionEstimate.total } });
    setIsCancelDialogOpen(false);
    setActionEstimate(null);
    toast.success("Estimate canceled");
  }

  async function handleSendSMSFromTable(estimate: any) {
    if (!estimate.phone) return;
    await sendEstimateSMS({
      phoneNumber:   estimate.phone,
      clientName:    estimate.clientName,
      estimateId:    estimate.id,
      estimateTotal: estimate.total,
      isUpdate:      true,
    });
  }

  async function handleSendEmail(estimate: any) {
    const { data } = await supabase.from("estimates").select("*").eq("id", estimate.id).single();
    if (!data) return;
    const result = await sendEstimateEmail({
      estimateData: { ...data, company_logo: profile?.company_logo, company_email: profile?.company_email, company_phone: profile?.company_phone, company_name: profile?.company_name },
      recipientEmail: data.email,
      estimateType: "residential",
    });
    if (result.success) toast.success(`Estimate sent to ${data.email}`);
    else toast.error(result.error ?? "Failed to send email");
  }

  async function handleDownloadPDF(estimate: any) {
    const { data } = await supabase.from("estimates").select("*").eq("id", estimate.id).single();
    if (!data || !profile) return;
    try {
      toast.info("Generating PDF...");
      const doc = await PDFService.generateEstimatePDF({
        companyLogo: profile.company_logo ?? undefined, companyName: profile.company_name ?? "",
        companyPhone: profile.company_phone ?? "", companyEmail: profile.company_email ?? "",
        companyAddress: profile.company_address ?? "", companyCity: profile.company_city ?? "",
        companyState: profile.company_state ?? "", companyZip: profile.company_zip ?? "",
        clientName: data.client_name, clientPhone: data.phone, clientEmail: data.email,
        clientAddress: data.address, clientApt: data.apt ?? undefined,
        clientCity: data.city, clientState: data.state, clientZip: data.zip,
        estimateNumber: data.id.substring(0, 8).toUpperCase(),
        estimateDate: formatDateOnly(data.estimate_date, "MMMM dd, yyyy"),
        serviceType: data.service_type, serviceSubType: data.service_sub_type ?? undefined,
        serviceScope: data.service_scope ?? undefined,
        mainData: (data.main_data as Record<string, any>) ?? undefined,
        additionalData: (data.additional_data as Record<string, any>) ?? undefined,
        extraServices: (data.extra_services as Record<string, boolean>) ?? undefined,
        subtotal: data.subtotal, discountType: data.discount_type ?? undefined,
        discountValue: data.discount_value ?? undefined, total: data.total,
      });
      doc.save(`Estimate_${data.id.substring(0, 8).toUpperCase()}_${data.client_name.replace(/\s+/g, "_")}.pdf`);
      toast.success("PDF downloaded!");
    } catch { toast.error("Failed to generate PDF"); }
  }

  async function handleEditEstimate(estimate: any) {
    const { data } = await supabase.from("estimates").select("*").eq("id", estimate.id).single();
    if (data) {
      openEstimateForm(estimate.serviceType, { isEditing: true, estimateId: data.id, estimateData: data });
    }
  }

  function handleContinueDraft(estimate: any) {
    openEstimateForm(estimate.serviceType, undefined, true);
  }

  async function handleStartFreshDraft(estimate: any) {
    try {
      await deleteDraftEstimate(estimate.id);
      queryClient.invalidateQueries({ queryKey: QK.estimates });
      openEstimateForm(estimate.serviceType);
    } catch {
      toast.error("Failed to delete draft");
    }
  }

  async function handleDeleteDraft() {
    if (!actionEstimate) return;
    try {
      await deleteDraftEstimate(actionEstimate.id);
      queryClient.invalidateQueries({ queryKey: QK.estimates });
      toast.success("Draft deleted");
    } catch {
      toast.error("Failed to delete draft");
    } finally {
      setIsDeleteDraftDialogOpen(false);
      setActionEstimate(null);
    }
  }

  async function handleConvertToInvoice(estimate: any) {
    const { data } = await supabase.from("estimates").select("*").eq("id", estimate.id).single();
    if (!data) return;
    const today = new Date(); const dueDate = new Date(); dueDate.setDate(today.getDate() + 7);
    navigate("/invoices/new", {
      state: {
        selectedClient: { full_name: data.client_name, company: data.company_name, phone: data.phone, email: data.email, service_street: data.address, service_apt: data.apt, service_city: data.city, service_state: data.state, service_zip: data.zip },
        invoiceType: "single", issueDate: today, dueDate,
        invoiceTitle: `Service (${data.service_type})`,
        lineItems: [{ id: Math.random().toString(36).slice(2, 9), description: data.service_type, price: data.total.toString(), qty: "1", total: data.total }],
        discountType: data.discount_type ?? "", discountValue: data.discount_value?.toString() ?? "",
        notes: data.service_scope ?? "",
      },
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-background p-2.5 space-y-2.5">
      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((card) => (
              <div key={card.title} className="border-l-4 pl-4" style={{ borderLeftColor: card.borderColor }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: card.borderColor }}>{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary/50">
                    <card.icon className="w-5 h-5" style={{ color: card.borderColor }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            {/* Left: filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setCurrentPage(1); }}>
                <SelectTrigger className="w-[140px] h-9 text-sm bg-white">
                  <SelectValue placeholder="Status: All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">Status: All</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Accepted">Accepted</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Canceled">Canceled</SelectItem>
                </SelectContent>
              </Select>

              <div className="relative w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search client..." value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-9 h-9 bg-white" />
              </div>

              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className={cn("h-9 whitespace-nowrap", !selectedDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "MMM d") : "Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={selectedDate} onSelect={(d) => { setSelectedDate(d); setCurrentPage(1); }}
                    initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Right: New */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="h-9">
                  <Plus className="w-4 h-4 mr-1" /> New
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onClick={() => openEstimateForm("Residential")}>
                  <BookOpen className="w-4 h-4 mr-2" /> Residential
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openEstimateForm("Commercial")}>
                  <FileSignature className="w-4 h-4 mr-2" /> Commercial
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>

      {/* ── Date filter badge ─────────────────────────────────────────────── */}
      {selectedDate && (
        <div className="flex items-center justify-between bg-accent/50 p-2 rounded-md">
          <span className="text-sm text-muted-foreground">Filtered by: {format(selectedDate, "PPP")}</span>
          <Button variant="ghost" size="sm" onClick={() => setSelectedDate(undefined)} className="h-6 px-2 text-xs">Clear</Button>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Estimate</TableHead>
              <TableHead className="font-bold">Full Name</TableHead>
              <TableHead className="font-bold">Date</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold">Amount</TableHead>
              <TableHead className="font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading estimates...</TableCell></TableRow>
            ) : paginated.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No estimates found</TableCell></TableRow>
            ) : (
              paginated.map((estimate) => (
                <TableRow key={estimate.id} className="cursor-pointer hover:bg-muted/50 border-b border-border/50"
                  onClick={() => openDetail(estimate.id)}>
                  <TableCell className="font-medium py-2 px-4">{estimate.serviceType}</TableCell>
                  <TableCell className="py-2 px-4">{estimate.clientName}</TableCell>
                  <TableCell className="py-2 px-4">{estimate.shortDate}</TableCell>
                  <TableCell className="py-2 px-4">
                    <Badge variant="outline" className={cn("font-medium text-[13px]", getStatusBadge(estimate.status))}>
                      {estimate.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold py-2 px-4">
                    {estimate.status === "Draft" ? "—" : `$${estimate.total.toFixed(2)}`}
                  </TableCell>
                  <TableCell className="text-right py-2 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {estimate.status === "Draft" ? (
                          <>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleContinueDraft(estimate); }}>
                              <Play className="w-4 h-4 mr-2" /> Continue
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleStartFreshDraft(estimate); }}>
                              <RefreshCw className="w-4 h-4 mr-2" /> Start Fresh
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive focus:text-destructive"
                              onClick={(e) => { e.stopPropagation(); setActionEstimate(estimate); setIsDeleteDraftDialogOpen(true); }}>
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </>
                        ) : (
                          <>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openDetail(estimate.id); }}>
                              <FileText className="w-4 h-4 mr-2" /> View Details
                            </DropdownMenuItem>
                            {(estimate.status === "Pending" || estimate.status === "Viewed") && (
                              <>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleEditEstimate(estimate); }}>
                                  <Edit className="w-4 h-4 mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setActionEstimate(estimate); setIsAcceptDialogOpen(true); }}>
                                  <CheckCircle className="w-4 h-4 mr-2 text-success" /> Mark as Accepted
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSendEmail(estimate); }} disabled={isSending}>
                                  <Mail className="w-4 h-4 mr-2" /> {isSending ? "Sending..." : "Send reminder by email"}
                                </DropdownMenuItem>
                                {estimate.phone && (
                                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleSendSMSFromTable(estimate); }} disabled={isSendingSMS}>
                                    <MessageSquare className="w-4 h-4 mr-2" /> {isSendingSMS ? "Sending..." : "Send reminder by SMS"}
                                  </DropdownMenuItem>
                                )}
                              </>
                            )}
                            {estimate.status === "Accepted" && (
                              <>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); navigate("/create-route"); }}>
                                  <CalendarIcon className="w-4 h-4 mr-2" /> Add to Route
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleConvertToInvoice(estimate); }}>
                                  <FileText className="w-4 h-4 mr-2" /> Convert to Invoice
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); generateShareLink(estimate.id); }} disabled={isGeneratingLink}>
                              <Share className="w-4 h-4 mr-2" /> Share
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadPDF(estimate); }}>
                              <Download className="w-4 h-4 mr-2" /> Download PDF
                            </DropdownMenuItem>
                            {(estimate.status === "Pending" || estimate.status === "Viewed" || estimate.status === "Accepted") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-destructive focus:text-destructive"
                                  onClick={(e) => { e.stopPropagation(); setActionEstimate(estimate); setIsCancelDialogOpen(true); }}>
                                  <X className="w-4 h-4 mr-2" /> Cancel Estimate
                                </DropdownMenuItem>
                              </>
                            )}
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
            <span className="text-[13px] text-muted-foreground">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filtered.length)} of {filtered.length} estimates
            </span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))} disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-[13px] text-muted-foreground">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Dialogs ────────────────────────────────────────────────────────── */}
      <EstimateDetailPanel
        open={isDetailPanelOpen}
        onClose={() => setIsDetailPanelOpen(false)}
        estimateId={selectedEstimateId}
        onEdit={(estimate) =>
          openEstimateForm(estimate.service_type, {
            isEditing: true,
            estimateId: estimate.id,
            estimateData: estimate,
          })
        }
        onOpenEstimateWizard={(serviceType, continueDraft) => openEstimateForm(serviceType, undefined, continueDraft)}
      />

      <AlertDialog open={isAcceptDialogOpen} onOpenChange={setIsAcceptDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Accept Estimate?</AlertDialogTitle>
            <AlertDialogDescription>Mark this estimate as accepted?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleAcceptEstimate} style={{ backgroundColor: "hsl(var(--green-vibrant))", color: "white" }}>Accept</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Estimate</AlertDialogTitle>
            <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancelEstimate} className="bg-destructive text-destructive-foreground">Cancel Estimate</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isDeleteDraftDialogOpen} onOpenChange={setIsDeleteDraftDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft?</AlertDialogTitle>
            <AlertDialogDescription>
              This draft will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setActionEstimate(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDraft} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Estimate form modals ──────────────────────────────────────────── */}
      {formModal.type === "residential" && (
        <CreateResidentialEstimatePage
          open
          onClose={() => setFormModal({ type: null })}
          initialState={{ ...formModal.editState, continueDraft: formModal.continueDraft }}
        />
      )}
      {formModal.type === "commercial" && (
        <CreateCommercialEstimatePage
          open
          onClose={() => setFormModal({ type: null })}
          initialState={{ ...formModal.editState, continueDraft: formModal.continueDraft }}
        />
      )}
    </div>
  );
}

export default EstimatesPage;
