/**
 * @module ContractsPage
 * CON-2: Main contracts list page — KPI cards, toolbar, table with actions.
 */
import { useState } from "react";
import { format } from "date-fns";
import {
  Plus, Search, MoreHorizontal, ChevronLeft, ChevronRight,
  Calendar as CalendarIcon, Edit, RotateCcw, Trash2,
  ShieldCheck, Clock, AlertTriangle, Send, Eye,
} from "lucide-react";
import { Card, CardContent }    from "@/shared/components/ui/card";
import { Button }               from "@/shared/components/ui/button";
import { Input }                from "@/shared/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/components/ui/select";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/shared/components/ui/popover";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { Calendar }        from "@/shared/components/ui/calendar";
import { cn }              from "@/shared/utils/cn";
import { formatCurrency }  from "@/shared/utils/formatters";
import { useIsMobile }     from "@/shared/hooks/useIsMobile";
import { useContracts, useDeleteContract } from "../hooks/useContracts";
import { CreateContractStep1Page }  from "./CreateContractStep1Page";
import { useSendContractEmail }     from "../hooks/useSendContractEmail";
import { useContractAccess }        from "../hooks/useContractAccess";
import { ContractDetailModal }      from "../components/ContractDetailModal";
import { RenewContractModal }       from "../components/RenewContractModal";
import { ContractStatusBadge, CONTRACT_STATUS_COLOR } from "../components/ContractStatusBadge";
import type { Contract, ContractStatus } from "../types/contract.types";

const ITEMS_PER_PAGE = 10;

const FREQ_LABEL: Record<string, string> = {
  "one-time": "One-time",
  weekly:     "Weekly",
  biweekly:   "Biweekly",
  monthly:    "Monthly",
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ContractsPage() {
  const isMobile  = useIsMobile();

  // ── Filters ──────────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | ContractStatus>("All");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [currentPage,  setCurrentPage]  = useState(1);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [showCreate,    setShowCreate]    = useState(false);
  const [editId,        setEditId]        = useState<string | undefined>();
  const [viewContract,  setViewContract]  = useState<Contract | null>(null);
  const [renewTarget,   setRenewTarget]   = useState<Contract | null>(null);

  // ── Confirm delete ────────────────────────────────────────────────────────
  const [deleteContract, setDeleteContract] = useState<Contract | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: allContracts = [], isLoading } = useContracts();
  const deleteM    = useDeleteContract();
  const sendEmail  = useSendContractEmail();
  const { hasAccess, daysRemaining, reason } = useContractAccess();

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const active   = allContracts.filter((c) => c.status === "Active");
  const pending  = allContracts.filter((c) => c.status === "Pending");
  const expiring = allContracts.filter((c) => c.status === "Expiring");
  const expired  = allContracts.filter((c) => c.status === "Expired");

  const kpiCards = [
    {
      title: "Active",
      value: active.length,
      subtitle: "Currently active",
      icon: ShieldCheck,
      color: CONTRACT_STATUS_COLOR.Active,
    },
    {
      title: "Pending",
      value: pending.length,
      subtitle: "Awaiting signature",
      icon: Clock,
      color: CONTRACT_STATUS_COLOR.Pending,
    },
    {
      title: "Expiring Soon",
      value: expiring.length,
      subtitle: "Within 30 days",
      icon: AlertTriangle,
      color: CONTRACT_STATUS_COLOR.Expiring,
    },
    {
      title: "Expired",
      value: expired.length,
      subtitle: "Need renewal",
      icon: AlertTriangle,
      color: CONTRACT_STATUS_COLOR.Expired,
    },
  ];

  // ── Filtering + pagination ────────────────────────────────────────────────
  const filtered = allContracts
    .filter((c) =>
      c.recipient_name.toLowerCase().includes(search.toLowerCase()) ||
      c.contract_number.toLowerCase().includes(search.toLowerCase())
    )
    .filter((c) => statusFilter === "All" || c.status === statusFilter)
    .filter((c) => {
      if (!selectedDate) return true;
      const d = new Date(c.created_at);
      return (
        d.getDate()     === selectedDate.getDate() &&
        d.getMonth()    === selectedDate.getMonth() &&
        d.getFullYear() === selectedDate.getFullYear()
      );
    });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginated  = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // ── Action helpers ────────────────────────────────────────────────────────
  const handleSend = (contract: Contract) => {
    if (contract.recipient_email) {
      sendEmail.mutate({ contractId: contract.id, recipientEmail: contract.recipient_email });
    }
  };

  const isSending = sendEmail.isPending;

  const canEdit   = (s: ContractStatus) => s === "Draft" || s === "Pending";
  const canSend   = (s: ContractStatus) => s === "Pending" || s === "Active" || s === "Expiring";
  const canRenew  = (s: ContractStatus) => s === "Active" || s === "Expiring";
  const canDelete = (s: ContractStatus) => s === "Draft" || s === "Pending" || s === "Expired";

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-full bg-background p-2.5">

      {/* CON-12: Trial notice banner */}
      {hasAccess && reason === "basic_trial" && daysRemaining !== null && (
        <div className="mb-2.5 px-4 py-2.5 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-800 text-sm flex items-center justify-between">
          <span>
            <span className="font-semibold">Trial:</span> Contracts feature available for{" "}
            <span className="font-semibold">{daysRemaining} more day{daysRemaining !== 1 ? "s" : ""}</span>.
            Upgrade to keep access.
          </span>
        </div>
      )}

      {/* CON-12: No access banner */}
      {!hasAccess && (
        <div className="mb-2.5 px-4 py-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <span className="font-semibold">Contracts requires an Essential or Professional plan.</span>{" "}
          Upgrade to create and manage contracts.
        </div>
      )}

      {/* ── KPI Cards ─────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none mb-2.5">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {kpiCards.map((card) => (
              <div
                key={card.title}
                className="border-l-4 pl-4"
                style={{ borderLeftColor: card.color }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold mt-1" style={{ color: card.color }}>
                      {card.value}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary/50">
                    <card.icon className="w-5 h-5" style={{ color: card.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Toolbar ───────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none mb-2.5">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Status filter */}
              <Select
                value={statusFilter}
                onValueChange={(v) => { setStatusFilter(v as typeof statusFilter); setCurrentPage(1); }}
              >
                <SelectTrigger className="w-[140px] h-9 text-sm bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">Status: All</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Expiring">Expiring Soon</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                </SelectContent>
              </Select>

              {/* Search */}
              <div className="relative w-56">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search client or #..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                  className="pl-9 h-9 border-border/50 text-sm bg-white"
                />
              </div>

              {/* Date picker */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn("h-9 whitespace-nowrap", !selectedDate && "text-muted-foreground")}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "MMM d") : "Date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); setCurrentPage(1); }}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* New contract */}
            <Button onClick={() => { setEditId(undefined); setShowCreate(true); }} className="h-9">
              <Plus className="w-4 h-4 mr-1" />
              New Contract
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Active date filter pill */}
      {selectedDate && (
        <div className="flex items-center justify-between bg-accent/50 p-2 rounded-md mb-2.5 text-sm">
          <span className="text-muted-foreground">
            Filtered by: {format(selectedDate, "PPP")}
          </span>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => setSelectedDate(undefined)}>
            Clear
          </Button>
        </div>
      )}

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <Table className="text-[13px]">
          <TableHeader>
            <TableRow>
              <TableHead className="h-10 font-bold text-[13px]">Client Name</TableHead>
              <TableHead className="h-10 font-bold text-[13px]">Contract #</TableHead>
              <TableHead className={cn("h-10 font-bold text-[13px]", isMobile && "hidden")}>Period</TableHead>
              <TableHead className={cn("h-10 font-bold text-[13px]", isMobile && "hidden")}>Frequency</TableHead>
              <TableHead className="h-10 font-bold text-[13px]">Status</TableHead>
              <TableHead className={cn("h-10 font-bold text-[13px]", isMobile && "hidden")}>Total</TableHead>
              <TableHead className="h-10 font-bold text-[13px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Loading contracts...
                </TableCell>
              </TableRow>
            ) : paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                  {filtered.length === 0 && allContracts.length === 0
                    ? "No contracts yet. Create your first contract."
                    : "No contracts match your filters."}
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((contract) => (
                <TableRow
                  key={contract.id}
                  className="cursor-pointer hover:bg-muted/50 border-b border-border/50"
                  onClick={() => setViewContract(contract)}
                >
                  <TableCell className="py-2 px-4 font-medium">{contract.recipient_name}</TableCell>
                  <TableCell className="py-2 px-4 font-mono text-xs">{contract.contract_number}</TableCell>
                  <TableCell className={cn("py-2 px-4 text-muted-foreground", isMobile && "hidden")}>
                    {contract.start_date
                      ? `${format(new Date(contract.start_date), "MMM d")} – ${format(new Date(contract.end_date), "MMM d, yyyy")}`
                      : "—"}
                  </TableCell>
                  <TableCell className={cn("py-2 px-4", isMobile && "hidden")}>
                    {FREQ_LABEL[contract.payment_frequency] ?? contract.payment_frequency}
                  </TableCell>
                  <TableCell className="py-2 px-4">
                    <ContractStatusBadge status={contract.status} />
                  </TableCell>
                  <TableCell className={cn("py-2 px-4 font-semibold", isMobile && "hidden")}>
                    ${formatCurrency(contract.total)}
                  </TableCell>
                  <TableCell className="py-2 px-4 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">

                        {/* View */}
                        <DropdownMenuItem
                          onClick={(e) => { e.stopPropagation(); setViewContract(contract); }}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>

                        {/* Edit */}
                        {canEdit(contract.status) && (
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); setEditId(contract.id); setShowCreate(true); }}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                        )}

                        {/* Send / Resend */}
                        {canSend(contract.status) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={isSending}
                              onClick={(e) => { e.stopPropagation(); handleSend(contract); }}
                            >
                              <Send className="w-4 h-4 mr-2" />
                              {contract.sent_at ? "Resend" : "Send"}
                            </DropdownMenuItem>
                          </>
                        )}

                        {/* Renew */}
                        {canRenew(contract.status) && (
                          <DropdownMenuItem
                            onClick={(e) => { e.stopPropagation(); setRenewTarget(contract); }}
                          >
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Renew
                          </DropdownMenuItem>
                        )}

                        {/* Delete */}
                        {canDelete(contract.status) && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={(e) => { e.stopPropagation(); setDeleteContract(contract); }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
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
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
              {Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)} of {filtered.length} contracts
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline" size="sm"
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-[13px] text-muted-foreground">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline" size="sm"
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* ── Detail modal (CON-6) ───────────────────────────────────────────── */}
      <ContractDetailModal
        contract={viewContract}
        open={!!viewContract}
        onClose={() => setViewContract(null)}
        onEdit={(c) => { setEditId(c.id); setShowCreate(true); }}
      />

      {/* ── Create / Edit modal ────────────────────────────────────────────── */}
      <CreateContractStep1Page
        open={showCreate}
        onClose={() => { setShowCreate(false); setEditId(undefined); }}
        editId={editId}
      />

      {/* ── Renew modal (CON-8) ────────────────────────────────────────────── */}
      <RenewContractModal
        contract={renewTarget}
        open={!!renewTarget}
        onClose={() => setRenewTarget(null)}
      />

      {/* ── Delete confirmation ────────────────────────────────────────────── */}
      <AlertDialog
        open={!!deleteContract}
        onOpenChange={(open) => { if (!open) setDeleteContract(null); }}
      >
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contract</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-medium">{deleteContract?.contract_number}</span> for{" "}
              <span className="font-medium">{deleteContract?.recipient_name}</span>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteContract(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteM.isPending}
              onClick={() => {
                if (!deleteContract) return;
                deleteM.mutate(deleteContract.id, {
                  onSuccess: () => setDeleteContract(null),
                });
              }}
            >
              {deleteM.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
