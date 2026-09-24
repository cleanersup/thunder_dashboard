import { useState } from "react";
import {
  User, Building2, Phone, Mail, MapPin, TrendingUp, Briefcase, Tag, Calendar, FileText,
  Edit, Trash2, UserCheck, Paperclip, ExternalLink,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { SidePanel } from "@/shared/components/common/SidePanel";
import { LeadForm } from "./LeadForm";
import { useQueryClient } from "@tanstack/react-query";
import { QK } from "@/shared/config/queryKeys";
import { useDeleteLead, useLead, useUpdateLead } from "../hooks/useLeads";
import { convertLeadToClient, checkClientDuplicate } from "../services/leadsService";
import { LEAD_STATUS_BADGE, PRIORITY_BADGE } from "@/shared/constants/styleTokens";
import { formatPhoneDisplay, isPhoneValid } from "@/shared/utils/phoneInput";
import { toast } from "sonner";
import type { Lead } from "../../types/crm.types";
import type { LeadFileMeta } from "../services/leadFilesService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeLeadFiles(raw: unknown): LeadFileMeta[] {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is LeadFileMeta =>
      !!item &&
      typeof item === "object" &&
      typeof (item as LeadFileMeta).name === "string" &&
      typeof (item as LeadFileMeta).url === "string",
  );
}

function isImageFile(f: LeadFileMeta): boolean {
  if ((f.type ?? "").startsWith("image/")) return true;
  return /\.(jpe?g|png|gif|webp|bmp|svg)(\?|$)/i.test(f.url);
}

function getMissingFields(l: Lead): string[] {
  const missing: string[] = [];
  if (!l.phone?.trim())    missing.push("Phone");
  if (!l.email?.trim())    missing.push("Email");
  if (!l.address?.trim())  missing.push("Address");
  if (!l.city?.trim())     missing.push("City");
  if (!l.state?.trim())    missing.push("State");
  if (!l.zip_code?.trim()) missing.push("Zip Code");
  return missing;
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value ?? "—"}</p>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

interface LeadDetailPanelProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
}

export function LeadDetailPanel({ lead, open, onClose }: LeadDetailPanelProps) {
  const queryClient = useQueryClient();
  const { mutate: deleteLead } = useDeleteLead();
  const { mutate: updateLead } = useUpdateLead();
  const [showEdit, setShowEdit]     = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [converting, setConverting] = useState(false);

  const [showMissingAlert, setShowMissingAlert] = useState(false);
  const [missingFields, setMissingFields]       = useState<string[]>([]);

  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [duplicateName, setDuplicateName]           = useState("");

  const { data: liveLead } = useLead(lead?.id);
  const l = liveLead ?? lead;

  const handleDelete = () => {
    if (!l) return;
    deleteLead(l.id, { onSuccess: onClose });
  };

  const handleConvert = async () => {
    if (!l) return;
    const missing = getMissingFields(l);
    if (missing.length > 0) {
      setMissingFields(missing);
      setShowMissingAlert(true);
      return;
    }

    setConverting(true);
    try {
      const duplicate = await checkClientDuplicate(l.email, l.user_id);
      if (duplicate) {
        setDuplicateName(duplicate.full_name);
        setShowDuplicateAlert(true);
        return;
      }
      await convertLeadToClient(l);
      updateLead({ id: l.id, payload: { status: "decision", decision_result: "won" } });
      queryClient.invalidateQueries({ queryKey: QK.clients });
      toast.success(`${l.full_name} converted to client`);
      onClose();
    } catch {
      toast.error("Failed to convert lead to client");
    } finally {
      setConverting(false);
    }
  };

  const badge = l
    ? {
        label: l.status,
        color: "text-white",
        bg: LEAD_STATUS_BADGE[l.status] ?? "bg-secondary text-secondary-foreground",
      }
    : undefined;

  const footer = l ? (
    <div className="flex items-center gap-2">
      {l.decision_result !== "won" && (
        <Button size="sm" onClick={handleConvert} disabled={converting} className="flex-1">
          <UserCheck className="h-3.5 w-3.5 mr-1.5" />
          {converting ? "Converting..." : "Convert to Client"}
        </Button>
      )}
      <Button size="sm" variant="outline" onClick={() => setShowEdit(true)} className="flex-1">
        <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button size="sm" variant="outline" className="px-2.5">···</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  ) : undefined;

  if (!l) return null;

  const addressLine = [
    l.address + (l.apt_suite ? `, ${l.apt_suite}` : ""),
    `${l.city}, ${l.state} ${l.zip_code}`,
  ]
    .filter(Boolean)
    .join("\n");

  const leadFiles = normalizeLeadFiles(l.files);

  return (
    <>
      <SidePanel
        open={open}
        onClose={onClose}
        title={l.full_name}
        badge={badge}
        footer={footer}
      >
        <div className="p-4 space-y-6">

          {/* Personal Info */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Personal Information</h3>
            <InfoRow icon={User}      label="Full Name" value={l.full_name} />
            {l.company_name && <InfoRow icon={Building2} label="Company" value={l.company_name} />}
            <InfoRow icon={Phone} label="Phone" value={
              <span className={isPhoneValid(l.phone) ? undefined : "text-destructive"}>
                {formatPhoneDisplay(l.phone)}
              </span>
            } />
            <InfoRow icon={Mail} label="Email" value={l.email} />
          </section>

          <hr className="border-border" />

          {/* Address */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Address</h3>
            {addressLine.trim() ? (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <p className="text-sm font-medium whitespace-pre-line">{addressLine}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No address on file</p>
            )}
          </section>

          {/* Attachments */}
          {leadFiles.length > 0 && (
            <>
              <hr className="border-border" />
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                  <Paperclip className="h-4 w-4 text-primary" />
                  Attachments
                </h3>
                <div className="space-y-2">
                  {leadFiles.map((f, idx) =>
                    isImageFile(f) ? (
                      <a
                        key={`${f.url}-${idx}`}
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block rounded-md border border-border overflow-hidden bg-muted/30"
                      >
                        <img
                          src={f.url}
                          alt={f.name}
                          className="max-h-48 w-full object-contain bg-background"
                        />
                        <p className="text-xs text-muted-foreground px-2 py-1.5 truncate">{f.name}</p>
                      </a>
                    ) : (
                      <a
                        key={`${f.url}-${idx}`}
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 p-3 rounded-md bg-secondary/30 border border-border hover:bg-secondary/50 transition-colors"
                      >
                        <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm font-medium flex-1 truncate">{f.name}</span>
                        {f.size > 0 && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {(f.size / 1024).toFixed(1)} KB
                          </span>
                        )}
                        <ExternalLink className="h-4 w-4 text-primary shrink-0" />
                      </a>
                    ),
                  )}
                </div>
              </section>
            </>
          )}

          <hr className="border-border" />

          {/* Lead Details */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Lead Details</h3>
            <InfoRow icon={TrendingUp} label="Lead Source"        value={<span className="capitalize">{l.lead_source}</span>} />
            <InfoRow icon={Briefcase}  label="Service Interested" value={<span className="capitalize">{l.service_interested}</span>} />
            <div className="flex items-start gap-3">
              <Tag className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Priority</p>
                  <p className="text-sm font-medium capitalize">{l.priority_level}</p>
                </div>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${PRIORITY_BADGE[l.priority_level] ?? "bg-secondary text-secondary-foreground"}`}>
                  {l.priority_level}
                </span>
              </div>
            </div>
          </section>

          <hr className="border-border" />

          {/* Follow-up */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Follow-up</h3>
            {l.next_followup_date ? (
              <InfoRow icon={Calendar} label="Next Follow-up" value={l.next_followup_date} />
            ) : (
              <p className="text-xs text-muted-foreground">No follow-up scheduled</p>
            )}
            {l.internal_notes && (
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Notes</p>
                  <p className="text-sm text-foreground">{l.internal_notes}</p>
                </div>
              </div>
            )}
          </section>

        </div>
      </SidePanel>

      <LeadForm open={showEdit} onClose={() => setShowEdit(false)} lead={l} />

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Lead"
        description={`Are you sure? ${l.full_name} will be permanently deleted.`}
        onConfirm={handleDelete}
        confirmLabel="Delete"
        variant="destructive"
      />

      {/* Missing fields alert */}
      <AlertDialog open={showMissingAlert} onOpenChange={setShowMissingAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Incomplete Lead Information</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-3">
                  The following required fields must be filled in before converting this lead to a client:
                </p>
                <ul className="list-disc list-inside space-y-1">
                  {missingFields.map((f) => (
                    <li key={f} className="text-sm font-medium text-foreground">{f}</li>
                  ))}
                </ul>
                <p className="mt-3">Please edit the lead and complete the missing information first.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => { setShowMissingAlert(false); setShowEdit(true); }}>
              Edit Lead
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Duplicate client alert */}
      <AlertDialog open={showDuplicateAlert} onOpenChange={setShowDuplicateAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Client Already Exists</AlertDialogTitle>
            <AlertDialogDescription>
              A client with this email address already exists
              {duplicateName ? ` (${duplicateName})` : ""}. Converting this lead would create a duplicate.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowDuplicateAlert(false)}>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
