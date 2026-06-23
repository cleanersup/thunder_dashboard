/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module AppointmentDetailPanel
 * F23g: Side panel for a single appointment — replaces AppointmentDetailModal.
 *
 * Sections: Title + Service Date | Schedule | Service Info | Client Info |
 *           Deposit | Documents & Photos | Route Map | Assigned Employees | Notes | Delivery Method
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  User, Phone, Mail, MapPin, Clock,
  MessageSquare, Edit, Trash2, Navigation,
  FileText, Download,
} from "lucide-react";
import { formatDisplayDate } from "@/shared/utils/formatters";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Label }         from "@/shared/components/ui/label";
import { Button }        from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { SidePanel }     from "@/shared/components/common/SidePanel";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { toast }          from "sonner";
import { supabase }       from "@/integrations/supabase/client";
import { useGoogleMaps }  from "@/shared/hooks/useGoogleMaps";
import { QK }             from "@/shared/config/queryKeys";
import { useDeleteAppointment } from "../hooks/useAppointments";
import { resolveStorageUrl, downloadAppointmentFile } from "../services/appointmentsService";
import { formatTime, calculateTotalHours, calculateLaborCost, buildClientAddress } from "../utils/appointmentHelpers";
import type { AppointmentWithClient, DeleteAppointmentMode } from "../types/scheduling.types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  position: string;
  hourly_rate: number | null;
}

interface RouteInfo {
  distance: string;
  duration: string;
}

interface AppointmentDetailPanelProps {
  open: boolean;
  onClose: () => void;
  appointment: AppointmentWithClient | null;
  companyAddress: string;
  onAppointmentChange?: () => void;
  onEdit?: (appointmentId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

function InfoLabel({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppointmentDetailPanel({
  open,
  onClose,
  appointment,
  companyAddress,
  onAppointmentChange,
  onEdit,
}: AppointmentDetailPanelProps) {
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMode, setDeleteMode] = useState<DeleteAppointmentMode>("single");
  const [routeInfo, setRouteInfo]   = useState<RouteInfo | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef  = useRef<any>(null);
  const dirRendererRef  = useRef<any>(null);

  const { loaded: mapsLoaded, google } = useGoogleMaps();
  const { mutate: deleteAppointment, isPending: isDeleting } = useDeleteAppointment();

  const isRecurring = !!appointment?.recurring_frequency;

  // ── Employee query ────────────────────────────────────────────────────────

  const empIds = appointment?.assigned_employees ?? [];
  const { data: employees = [], isLoading: empLoading } = useQuery<Employee[]>({
    queryKey: QK.appointmentEmployees(empIds),
    queryFn: async () => {
      if (empIds.length === 0) return [];
      const { data, error } = await supabase
        .from("employees")
        .select("id, first_name, last_name, position, hourly_rate")
        .in("id", empIds);
      if (error) throw error;
      return (data ?? []) as Employee[];
    },
    enabled: open && empIds.length > 0,
    staleTime: 60_000,
  });

  // ── Map initialization ────────────────────────────────────────────────────

  useEffect(() => {
    if (!open) {
      mapInstanceRef.current = null;
      dirRendererRef.current = null;
      setRouteInfo(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !mapsLoaded || !google || !appointment) return;

    const client = appointment.clients;
    if (!client?.service_street || !client?.service_city) return;
    if (!companyAddress) return;

    const clientAddress = [
      client.service_street,
      client.service_apt ? ` ${client.service_apt}` : "",
      `, ${client.service_city}, ${client.service_state} ${client.service_zip}`,
    ].join("").trim();

    // Delay so the panel slide-in animation completes and the container has real dimensions.
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = new google.maps.Map(mapContainerRef.current, {
          center: { lat: 39.8283, lng: -98.5795 },
          zoom: 12,
          mapTypeControl:    false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        dirRendererRef.current = new google.maps.DirectionsRenderer({
          map: mapInstanceRef.current,
          suppressMarkers: false,
        });
      }

      google.maps.event.trigger(mapInstanceRef.current, "resize");

      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        { origin: companyAddress, destination: clientAddress, travelMode: google.maps.TravelMode.DRIVING },
        (result: any, status: any) => {
          if (status === "OK" && result) {
            dirRendererRef.current?.setDirections(result);
            const leg = result.routes?.[0]?.legs?.[0];
            if (leg) setRouteInfo({ distance: leg.distance.text, duration: leg.duration.text });
          } else {
            setRouteInfo(null);
            const geocoder = new google.maps.Geocoder();
            geocoder.geocode({ address: clientAddress }, (results: any, gs: any) => {
              if (gs === "OK" && results?.[0]) {
                mapInstanceRef.current?.setCenter(results[0].geometry.location);
                mapInstanceRef.current?.setZoom(15);
              }
            });
          }
        },
      );
    }, 400);

    return () => clearTimeout(timer);
  }, [open, mapsLoaded, google, appointment, companyAddress]);

  // ── Handlers ─────────────────────────────────────────────────────────────

  function handleDelete() {
    deleteAppointment(
      { id: appointment!.id, mode: deleteMode },
      {
        onSuccess: () => {
          setDeleteOpen(false);
          onClose();
          onAppointmentChange?.();
        },
      },
    );
  }

  // ── Footer ────────────────────────────────────────────────────────────────

  const footer = appointment ? (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant="outline"
        className="flex-1 gap-1.5"
        onClick={() => {
          onClose();
          if (onEdit) onEdit(appointment.id);
          else navigate(`/create-route/${appointment.id}/edit`);
        }}
      >
        <Edit className="h-3.5 w-3.5" /> Edit
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="px-2.5 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setDeleteOpen(true)}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  ) : undefined;

  if (!appointment) return null;

  const client         = appointment.clients;
  const clientAddress  = buildClientAddress(client);
  const mapsLink       = clientAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clientAddress)}`
    : null;
  const totalHours     = calculateTotalHours(appointment.scheduled_time, appointment.end_time);
  const totalLaborCost = calculateLaborCost(employees, totalHours) ?? 0;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <SidePanel
        open={open}
        onClose={onClose}
        title={appointment.routes?.name ?? "Route Information"}
        footer={footer}
      >
        <div className="p-4 space-y-6">

          {/* Title + Service Date */}
          <div className="text-center py-2">
            <h2 className="text-xl font-bold text-foreground mb-1">{client?.full_name ?? "—"}</h2>
            <p className="text-xs text-muted-foreground">Service Date</p>
            <p className="text-sm font-semibold">
              {formatDisplayDate(appointment.scheduled_date)}
            </p>
          </div>

          <hr className="border-border" />

          {/* Schedule */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Schedule</h3>
            <InfoLabel label="Date" value={formatDisplayDate(appointment.scheduled_date)} />
            {appointment.scheduled_time && (
              <InfoLabel label="Start Time" value={formatTime(appointment.scheduled_time)} />
            )}
            {appointment.end_time && (
              <InfoLabel label="End Time" value={formatTime(appointment.end_time)} />
            )}
            {appointment.recurring_frequency && (
              <>
                <InfoLabel label="Recurring" value={<span className="capitalize">{appointment.recurring_frequency}</span>} />
                {appointment.recurring_duration && (
                  <InfoLabel label="Duration" value={`${appointment.recurring_duration} ${appointment.recurring_duration_unit}`} />
                )}
                {(appointment.selected_week_days ?? []).length > 0 && (
                  <InfoLabel label="Days" value={(appointment.selected_week_days as string[]).join(", ")} />
                )}
              </>
            )}
          </section>

          <hr className="border-border" />

          {/* Service Information */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Service Information</h3>
            {appointment.service_type && (
              <InfoLabel label="Service Type" value={<span className="capitalize">{appointment.service_type}</span>} />
            )}
            {appointment.cleaning_type && (
              <InfoLabel label="Cleaning Type" value={<span className="capitalize">{appointment.cleaning_type}</span>} />
            )}
            <InfoLabel label="Status" value={<span className="capitalize">{appointment.status}</span>} />
          </section>

          {/* Client Information */}
          {client && (
            <>
              <hr className="border-border" />
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Client Information</h3>

                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Full Name</p>
                    <p className="text-sm font-medium">{client.full_name}</p>
                  </div>
                </div>

                {client.phone && (
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{client.phone}</p>
                        <div className="flex gap-1.5 shrink-0">
                          <a href={`sms:${client.phone}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors" aria-label="SMS">
                            <MessageSquare className="h-3.5 w-3.5 text-primary" />
                          </a>
                          <a href={`tel:${client.phone}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors" aria-label="Call">
                            <Phone className="h-3.5 w-3.5 text-primary" />
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {client.email && (
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Email</p>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{client.email}</p>
                        <a href={`mailto:${client.email}`} className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors shrink-0" aria-label="Email">
                          <Mail className="h-3.5 w-3.5 text-primary" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {client.service_street && (
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <div className="flex-1 flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Address</p>
                        <p className="text-sm font-medium">{clientAddress}</p>
                      </div>
                      {mapsLink && (
                        <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded bg-primary/10 hover:bg-primary/20 transition-colors shrink-0" aria-label="Open in Maps">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </section>
            </>
          )}

          <hr className="border-border" />

          {/* Deposit Information */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Deposit Information</h3>
            <InfoLabel label="Deposit Required" value={<span className="capitalize">{appointment.deposit_required ?? "No"}</span>} />
            {appointment.deposit_required === "yes" && appointment.deposit_amount != null && (
              <InfoLabel label="Amount" value={<span className="text-green-600 font-bold">${appointment.deposit_amount.toFixed(2)}</span>} />
            )}
          </section>

          {/* Documents & Photos */}
          {(appointment.uploaded_file || (appointment.photos && appointment.photos.length > 0)) && (
            <>
              <hr className="border-border" />
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Documents & Photos</h3>
                <div className="space-y-2">
                  {appointment.uploaded_file && (() => {
                    const path       = appointment.uploaded_file;
                    const docName    = path.split("/").pop() ?? "contract";
                    const clientName = (client?.full_name ?? "appointment").replace(/\s+/g, "_");
                    const ext        = docName.split(".").pop() ?? "pdf";
                    const filename   = `${clientName}_contract.${ext}`;
                    const url        = resolveStorageUrl("route-files", path);
                    return (
                      <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 bg-secondary/20">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="p-2 rounded-lg bg-primary/10 shrink-0"><FileText className="w-4 h-4 text-primary" /></div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">Contract / Estimate</p>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">View file</a>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" title="Download"
                          onClick={() => downloadAppointmentFile("route-files", path, filename).catch(() => toast.error("Failed to download"))}>
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })()}
                  {appointment.photos &&
                    Array.isArray(appointment.photos) &&
                    appointment.photos.map((p, idx) => {
                      const path = typeof p === "string" && p.trim() ? p : (p && typeof p === "object" && "url" in p ? (p as { url: string }).url : null);
                      if (!path) return null;
                      const clientName = (client?.full_name ?? "appointment").replace(/\s+/g, "_");
                      const ext        = path.split(".").pop() ?? "jpg";
                      const filename   = `${clientName}_photo_${idx + 1}.${ext}`;
                      const url        = resolveStorageUrl("route-files", path);
                      return (
                        <div key={idx} className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 bg-secondary/20">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                              <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                            </div>
                            <p className="text-sm font-medium">Photo {idx + 1}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8" title="Download"
                            onClick={() => downloadAppointmentFile("route-files", path, filename).catch(() => toast.error("Failed to download photo"))}>
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      );
                    })}
                </div>
              </section>
            </>
          )}

          <hr className="border-border" />

          {/* Route Map */}
          <section className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Route Map</h3>
            {mapsLoaded ? (
              <div ref={mapContainerRef} className="w-full h-[200px] rounded-lg overflow-hidden border border-border" />
            ) : (
              <div className="w-full h-[200px] rounded-lg bg-muted flex items-center justify-center">
                <LoadingSpinner />
              </div>
            )}
            {routeInfo && (
              <div className="flex items-center justify-center gap-4 py-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <Navigation className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400">Distance</p>
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">{routeInfo.distance}</p>
                  </div>
                </div>
                <div className="w-px h-6 bg-blue-300 dark:bg-blue-700" />
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-[10px] text-blue-600 dark:text-blue-400">Drive Time</p>
                    <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">{routeInfo.duration}</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Assigned Employees */}
          {(empLoading || employees.length > 0) && (
            <>
              <hr className="border-border" />
              <section className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned Employees</h3>
                {empLoading ? (
                  <div className="flex justify-center py-4"><LoadingSpinner /></div>
                ) : (
                  <>
                    <div className="space-y-2">
                      {employees.map((emp) => {
                        const pay = emp.hourly_rate && totalHours !== null && totalHours > 0
                          ? (emp.hourly_rate * totalHours).toFixed(2)
                          : null;
                        return (
                          <div key={emp.id} className="flex items-center gap-3 p-2 bg-secondary/20 rounded-lg">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                              {getInitials(emp.first_name, emp.last_name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">{emp.first_name} {emp.last_name}</p>
                              <p className="text-xs text-muted-foreground">{emp.position}</p>
                            </div>
                            {pay && <p className="text-sm font-bold text-green-600">${pay}</p>}
                          </div>
                        );
                      })}
                    </div>
                    {totalLaborCost > 0 && (
                      <div className="flex items-center justify-between pt-3 border-t border-border/50">
                        <span className="text-sm font-medium">Total Labor Cost</span>
                        <span className="text-lg font-bold text-green-600">${totalLaborCost.toFixed(2)}</span>
                      </div>
                    )}
                  </>
                )}
              </section>
            </>
          )}

          {/* Notes */}
          {appointment.notes && (
            <>
              <hr className="border-border" />
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Appointment Notes</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">{appointment.notes}</p>
              </section>
            </>
          )}

          {/* Delivery Method */}
          {appointment.delivery_method && (
            <>
              <hr className="border-border" />
              <section className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Delivery Method</h3>
                <p className="text-sm font-medium capitalize">{appointment.delivery_method}</p>
              </section>
            </>
          )}

        </div>
      </SidePanel>

      {/* Delete confirmation */}
      {isRecurring ? (
        <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete appointment</AlertDialogTitle>
              <AlertDialogDescription>
                This is a recurring appointment. Which appointments do you want to delete?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <RadioGroup
              value={deleteMode}
              onValueChange={(v) => setDeleteMode(v as DeleteAppointmentMode)}
              className="px-4 pb-2 space-y-3"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single"    id="del-single" />
                <Label htmlFor="del-single">This appointment only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="following" id="del-following" />
                <Label htmlFor="del-following">This and all following appointments</Label>
              </div>
            </RadioGroup>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting ? "Deleting…" : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      ) : (
        <ConfirmDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          title="Delete appointment?"
          description="This action cannot be undone."
          confirmLabel="Delete"
          variant="destructive"
          isLoading={isDeleting}
          onConfirm={handleDelete}
        />
      )}
    </>
  );
}
