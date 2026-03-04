import { format } from "date-fns";
import {
  MapPin, User, Briefcase, CalendarDays, UserCheck,
  DollarSign, FileText, MessageSquare, Phone, Mail, MapPinned, ImageIcon,
} from "lucide-react";
import type { AppointmentFormData, Route } from "../../types/scheduling.types";
import type { ClientEntity } from "@/shared/types/entities";

// ─── Constants ────────────────────────────────────────────────────────────────

const FREQ_LABELS: Record<string, string> = {
  multiple:  "Multiple times per week",
  weekly:    "Once per week",
  biweekly:  "Every 2 weeks",
  triweekly: "Every 3 weeks",
  monthly:   "Once per month",
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  hourly_rate: number | null;
}

interface Props {
  form: AppointmentFormData;
  routes: Route[];
  selectedClient: ClientEntity | null;
  employees: Employee[];
  contractFile: File | null;
  uploadedPhotos: File[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(t: string | null | undefined): string {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

function calcTotalHours(start: string, end: string | null | undefined): number | null {
  if (!start || !end) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = (eh * 60 + em) - (sh * 60 + sm);
  return diff > 0 ? diff / 60 : null;
}

// ─── Section header ──────────────────────────────────────────────────────────

function SectionTitle({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppointmentPreviewStep({
  form,
  routes,
  selectedClient,
  employees,
  contractFile,
  uploadedPhotos,
}: Props) {
  const route = routes.find((r) => r.id === form.route_id);

  const assignedEmployees = employees.filter((e) =>
    (form.assigned_employees ?? []).includes(e.id),
  );

  const totalHours = calcTotalHours(form.scheduled_time, form.end_time);

  const laborCost = totalHours !== null && assignedEmployees.length > 0
    ? assignedEmployees.reduce((sum, emp) => {
        if (!emp.hourly_rate) return sum;
        return sum + totalHours * emp.hourly_rate;
      }, 0)
    : null;

  const clientAddress = selectedClient
    ? [
        selectedClient.service_street,
        selectedClient.service_apt,
        selectedClient.service_city,
        selectedClient.service_state,
        selectedClient.service_zip,
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  const recurringLabel =
    form.service_type === "Recurring" &&
    form.recurring_frequency &&
    form.recurring_frequency !== "none"
      ? `${FREQ_LABELS[form.recurring_frequency] ?? form.recurring_frequency}${
          form.recurring_duration
            ? ` · ${form.recurring_duration} ${form.recurring_duration_unit ?? "months"}`
            : ""
        }`
      : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Route Preview</h2>
        <p className="text-sm text-muted-foreground">
          Review all information before finalizing
        </p>
      </div>

      <div className="bg-card border rounded-xl p-5 space-y-5">

        {/* Route */}
        <div className="space-y-1">
          <SectionTitle icon={MapPin} label="Route" />
          <p className="text-sm text-foreground pl-6">{route?.name ?? "—"}</p>
        </div>

        {/* Client */}
        {selectedClient && (
          <div className="space-y-2">
            <SectionTitle icon={User} label="Client" />
            <div className="pl-6 space-y-2">
              <p className="text-sm font-medium text-foreground">{selectedClient.full_name}</p>
              <div className="space-y-1 text-sm text-muted-foreground">
                {selectedClient.phone && (
                  <p className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {selectedClient.phone}
                  </p>
                )}
                {selectedClient.email && (
                  <p className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {selectedClient.email}
                  </p>
                )}
                {clientAddress && (
                  <p className="flex items-center gap-2">
                    <MapPinned className="h-3.5 w-3.5 shrink-0" />
                    {clientAddress}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Service */}
        {(form.service_type || form.cleaning_type) && (
          <div className="space-y-2">
            <SectionTitle icon={Briefcase} label="Service" />
            <div className="pl-6 space-y-1 text-sm text-foreground">
              {form.service_type && (
                <p>
                  <span className="font-medium">Type:</span>{" "}
                  {form.service_type}
                </p>
              )}
              {form.cleaning_type && (
                <p>
                  <span className="font-medium">Cleaning Type:</span>{" "}
                  {form.cleaning_type}
                </p>
              )}
              {recurringLabel && (
                <p>
                  <span className="font-medium">Frequency:</span>{" "}
                  {recurringLabel}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Date & Time */}
        {form.scheduled_date && (
          <div className="space-y-2">
            <SectionTitle icon={CalendarDays} label="Date & Time" />
            <div className="pl-6 space-y-1 text-sm text-foreground">
              <p>
                <span className="font-medium">Date:</span>{" "}
                {format(new Date(form.scheduled_date + "T00:00:00"), "PPP")}
              </p>
              <p>
                <span className="font-medium">Time:</span>{" "}
                {formatTime(form.scheduled_time)}
                {form.end_time && ` – ${formatTime(form.end_time)}`}
              </p>
              {totalHours !== null && (
                <p>
                  <span className="font-medium">Duration:</span>{" "}
                  {totalHours.toFixed(2)} hours
                </p>
              )}
            </div>
          </div>
        )}

        {/* Team Members */}
        {assignedEmployees.length > 0 && (
          <div className="space-y-2">
            <SectionTitle icon={UserCheck} label="Team Members" />
            <div className="pl-6 space-y-1">
              {assignedEmployees.map((emp) => (
                <p key={emp.id} className="text-sm text-foreground">
                  • {emp.first_name} {emp.last_name}
                  {emp.position ? ` — ${emp.position}` : ""}
                </p>
              ))}
              {laborCost !== null && laborCost > 0 && (
                <p className="text-sm font-semibold text-green-700 dark:text-green-400 pt-1">
                  Total Labor Cost: ${laborCost.toFixed(2)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Deposit */}
        {form.deposit_required === "yes" && form.deposit_amount != null && (
          <div className="space-y-1">
            <SectionTitle icon={DollarSign} label="Deposit" />
            <p className="text-sm text-foreground pl-6">
              ${form.deposit_amount.toFixed(2)}
            </p>
          </div>
        )}

        {/* Contract / Estimate */}
        {contractFile && (
          <div className="space-y-1">
            <SectionTitle icon={FileText} label="Contract/Estimate" />
            <p className="text-sm text-foreground pl-6 flex items-center gap-2">
              <FileText className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              {contractFile.name}
            </p>
          </div>
        )}

        {/* Instructions */}
        {form.notes && (
          <div className="space-y-1">
            <SectionTitle icon={MessageSquare} label="Instructions" />
            <p className="text-sm text-muted-foreground pl-6 whitespace-pre-wrap">
              {form.notes}
            </p>
          </div>
        )}

        {/* Reference Photos */}
        {uploadedPhotos.length > 0 && (
          <div className="space-y-2">
            <SectionTitle icon={ImageIcon} label="Reference Photos" />
            <div className="pl-6 grid grid-cols-3 gap-2">
              {uploadedPhotos.map((photo, idx) => (
                <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Photo ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
