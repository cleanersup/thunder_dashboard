/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * @module AppointmentDetailModal
 * Detail view for a single appointment — two-column layout matching
 * thunder-web-version/src/components/RouteInformationModal.tsx.
 *
 * Left  : Title + Service Date | Schedule | Service Information | Client Information | Deposit
 * Right : Route Map (Google Maps A→B with distance + drive time) |
 *         Assigned Employees (individual pay + Total Labor Cost) |
 *         Notes | Delivery Method | Quick Actions
 */
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  User, Phone, Mail, MapPin, Clock, Calendar,
  MessageSquare, Edit, Trash2, Navigation, RefreshCcw,
  FileText, Download,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  Dialog,
  DialogContent,
} from "@/shared/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";
import { Label }       from "@/shared/components/ui/label";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button }      from "@/shared/components/ui/button";
import { ScrollArea }  from "@/shared/components/ui/scroll-area";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { toast } from "sonner";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { supabase }    from "@/integrations/supabase/client";
import { useGoogleMaps } from "@/shared/hooks/useGoogleMaps";
import { QK } from "@/shared/config/queryKeys";
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

interface AppointmentDetailModalProps {
  open: boolean;
  onClose: () => void;
  appointment: AppointmentWithClient | null;
  companyAddress: string;
  onAppointmentChange?: () => void;
  /** Called with appointmentId when Edit is clicked — parent decides how to open the wizard */
  onEdit?: (appointmentId: string) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(firstName: string, lastName: string): string {
  return `${firstName[0] ?? ""}${lastName[0] ?? ""}`.toUpperCase();
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppointmentDetailModal({
  open,
  onClose,
  appointment,
  companyAddress,
  onAppointmentChange,
  onEdit,
}: AppointmentDetailModalProps) {
  const navigate  = useNavigate();
  const [deleteOpen, setDeleteOpen]   = useState(false);
  const [deleteMode, setDeleteMode]   = useState<DeleteAppointmentMode>("single");
  const [routeInfo, setRouteInfo]     = useState<RouteInfo | null>(null);

  const mapContainerRef  = useRef<HTMLDivElement>(null);
  const mapInstanceRef   = useRef<any>(null);
  const dirRendererRef   = useRef<any>(null);

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
      // Reset map state when closed so it re-initializes on next open
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

    // Defer map init until after Dialog open animation (~300ms) so the
    // container has real dimensions when google.maps.Map() is called.
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

      // Ensure map repaints after any layout shift
      google.maps.event.trigger(mapInstanceRef.current, "resize");

      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin:     companyAddress,
          destination: clientAddress,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result: any, status: any) => {
          if (status === "OK" && result) {
            dirRendererRef.current?.setDirections(result);
            const leg = result.routes?.[0]?.legs?.[0];
            if (leg) {
              setRouteInfo({ distance: leg.distance.text, duration: leg.duration.text });
            }
          } else {
            setRouteInfo(null);
            // Fallback: geocode client address and center map there
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
    }, 350);

    return () => clearTimeout(timer);
  }, [open, mapsLoaded, google, appointment, companyAddress]);

  // ── Computed values ───────────────────────────────────────────────────────

  if (!appointment) return null;

  const client = appointment.clients;

  const clientAddress  = buildClientAddress(client);
  const mapsLink       = clientAddress
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(clientAddress)}`
    : null;
  const totalHours     = calculateTotalHours(appointment.scheduled_time, appointment.end_time);
  const totalLaborCost = calculateLaborCost(employees, totalHours) ?? 0;

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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
          {/* Header */}
          <div className="flex items-center gap-2 px-6 pr-12 py-3 border-b border-border/50 bg-sidebar">
            <h2 className="text-lg font-bold text-white">
              {appointment.routes?.name ?? "Route Information"}
            </h2>
          </div>

          <ScrollArea className="max-h-[calc(90vh-56px)]">
            <div className="p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* ── Left Column ─────────────────────────────────────────── */}
                <div className="space-y-4">

                  {/* Title + Service Date */}
                  <Card>
                    <CardContent className="p-5 text-center">
                      <h2 className="text-xl font-bold text-foreground mb-3">
                        {client?.full_name ?? "—"}
                      </h2>
                      <div className="border-t border-border/30 mb-3" />
                      <p className="text-xs text-muted-foreground mb-1">Service Date</p>
                      <p className="text-sm font-semibold">
                        {format(parseISO(appointment.scheduled_date), "EEEE, MMMM do, yyyy")}
                      </p>
                    </CardContent>
                  </Card>

                  {/* Schedule */}
                  <Card>
                    <CardContent className="p-5">
                      <h4 className="text-sm font-semibold text-foreground mb-4">Schedule</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-primary" />
                            <span className="text-xs text-muted-foreground">Date</span>
                          </div>
                          <span className="text-sm font-medium">
                            {format(parseISO(appointment.scheduled_date), "PPP")}
                          </span>
                        </div>

                        {appointment.scheduled_time && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Clock className="w-4 h-4 text-primary" />
                              <span className="text-xs text-muted-foreground">Start Time</span>
                            </div>
                            <span className="text-sm font-medium">
                              {formatTime(appointment.scheduled_time)}
                            </span>
                          </div>
                        )}

                        {appointment.end_time && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Clock className="w-4 h-4 text-primary" />
                              <span className="text-xs text-muted-foreground">End Time</span>
                            </div>
                            <span className="text-sm font-medium">
                              {formatTime(appointment.end_time)}
                            </span>
                          </div>
                        )}

                        {appointment.recurring_frequency && (
                          <>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <RefreshCcw className="w-4 h-4 text-primary" />
                                <span className="text-xs text-muted-foreground">Recurring</span>
                              </div>
                              <span className="text-sm font-medium capitalize">
                                {appointment.recurring_frequency}
                              </span>
                            </div>

                            {appointment.recurring_duration && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground pl-7">Duration</span>
                                <span className="text-sm font-medium">
                                  {appointment.recurring_duration}{" "}
                                  {appointment.recurring_duration_unit}
                                </span>
                              </div>
                            )}

                            {(appointment.selected_week_days ?? []).length > 0 && (
                              <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground pl-7">Days</span>
                                <span className="text-sm font-medium">
                                  {(appointment.selected_week_days as string[]).join(", ")}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Service Information */}
                  <Card>
                    <CardContent className="p-5">
                      <h4 className="text-sm font-semibold text-foreground mb-4">
                        Service Information
                      </h4>
                      <div className="space-y-3">
                        {appointment.service_type && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Service Type</span>
                            <span className="text-sm font-medium capitalize">
                              {appointment.service_type}
                            </span>
                          </div>
                        )}
                        {appointment.cleaning_type && (
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Cleaning Type</span>
                            <span className="text-sm font-medium capitalize">
                              {appointment.cleaning_type}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Status</span>
                          <span className="text-sm font-medium capitalize">
                            {appointment.status}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Client Information */}
                  {client && (
                    <Card>
                      <CardContent className="p-5">
                        <h4 className="text-sm font-semibold text-foreground mb-4">
                          Client Information
                        </h4>
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <User className="w-4 h-4 text-primary shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Full Name</p>
                              <p className="text-sm font-medium">{client.full_name}</p>
                            </div>
                          </div>

                          {/* Phone with SMS + call actions */}
                          {client.phone && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Phone className="w-4 h-4 text-primary shrink-0" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Phone</p>
                                  <p className="text-sm font-medium">{client.phone}</p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <a
                                  href={`sms:${client.phone}`}
                                  className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 text-primary" />
                                </a>
                                <a
                                  href={`tel:${client.phone}`}
                                  className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                                >
                                  <Phone className="w-3.5 h-3.5 text-primary" />
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Email with mailto action */}
                          {client.email && (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Mail className="w-4 h-4 text-primary shrink-0" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Email</p>
                                  <p className="text-sm font-medium">{client.email}</p>
                                </div>
                              </div>
                              <a
                                href={`mailto:${client.email}`}
                                className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors"
                              >
                                <Mail className="w-3.5 h-3.5 text-primary" />
                              </a>
                            </div>
                          )}

                          {/* Address with maps link */}
                          {client.service_street && (
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-xs text-muted-foreground">Address</p>
                                  <p className="text-sm font-medium">{clientAddress}</p>
                                </div>
                              </div>
                              {mapsLink && (
                                <a
                                  href={mapsLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors shrink-0"
                                >
                                  <MapPin className="w-3.5 h-3.5 text-primary" />
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Documents & Photos */}
                  {(appointment.uploaded_file || (appointment.photos && appointment.photos.length > 0)) && (
                    <Card>
                      <CardContent className="p-5">
                        <h4 className="text-sm font-semibold text-foreground mb-4">
                          Documents & Photos
                        </h4>
                        <div className="space-y-3">
                          {appointment.uploaded_file && (() => {
                            const path = appointment.uploaded_file;
                            const docName = path.split("/").pop() ?? "contract";
                            const clientName = (client?.full_name ?? "appointment").replace(/\s+/g, "_");
                            const ext = docName.split(".").pop() ?? "pdf";
                            const filename = `${clientName}_contract.${ext}`;
                            const url = resolveStorageUrl("route-files", path);
                            return (
                              <div className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 bg-secondary/20">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                                    <FileText className="w-4 h-4 text-primary" />
                                  </div>
                                  <div className="min-w-0">
                                    <p className="text-sm font-medium text-foreground truncate">
                                      Contract / Estimate
                                    </p>
                                    <a
                                      href={url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline"
                                    >
                                      View file
                                    </a>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="shrink-0 h-8 w-8"
                                  onClick={() => {
                                    downloadAppointmentFile("route-files", path, filename).catch(() =>
                                      toast.error("Failed to download document"),
                                    );
                                  }}
                                  title="Download"
                                >
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
                              const ext = path.split(".").pop() ?? "jpg";
                              const filename = `${clientName}_photo_${idx + 1}.${ext}`;
                              const url = resolveStorageUrl("route-files", path);
                              return (
                                <div
                                  key={idx}
                                  className="flex items-center justify-between rounded-lg border border-border/50 px-3 py-2 bg-secondary/20"
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                                      <img
                                        src={url}
                                        alt={`Photo ${idx + 1}`}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                    <p className="text-sm font-medium text-foreground">
                                      Photo {idx + 1}
                                    </p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="shrink-0 h-8 w-8"
                                    onClick={() => {
                                      downloadAppointmentFile("route-files", path, filename).catch(() =>
                                        toast.error("Failed to download photo"),
                                      );
                                    }}
                                    title="Download"
                                  >
                                    <Download className="w-4 h-4" />
                                  </Button>
                                </div>
                              );
                            })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Deposit Information */}
                  <Card>
                    <CardContent className="p-5">
                      <h4 className="text-sm font-semibold text-foreground mb-4">
                        Deposit Information
                      </h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">Deposit Required</span>
                          <span className="text-sm font-medium capitalize">
                            {appointment.deposit_required ?? "No"}
                          </span>
                        </div>
                        {appointment.deposit_required === "yes" &&
                          appointment.deposit_amount != null && (
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Amount</span>
                              <span className="text-sm font-medium text-green-600">
                                ${appointment.deposit_amount.toFixed(2)}
                              </span>
                            </div>
                          )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* ── Right Column ────────────────────────────────────────── */}
                <div className="space-y-4">

                  {/* Route Map */}
                  <Card>
                    <CardContent className="p-5">
                      <h4 className="text-sm font-semibold text-foreground mb-4">Route Map</h4>
                      <div className="space-y-3">
                        {mapsLoaded ? (
                          <div
                            ref={mapContainerRef}
                            className="w-full h-[200px] rounded-lg overflow-hidden border border-border"
                          />
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
                                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                                  {routeInfo.distance}
                                </p>
                              </div>
                            </div>
                            <div className="w-px h-6 bg-blue-300 dark:bg-blue-700" />
                            <div className="flex items-center gap-2">
                              <Clock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                              <div>
                                <p className="text-[10px] text-blue-600 dark:text-blue-400">Drive Time</p>
                                <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                                  {routeInfo.duration}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Assigned Employees */}
                  {(empLoading || employees.length > 0) && (
                    <Card>
                      <CardContent className="p-5">
                        <h4 className="text-sm font-semibold text-foreground mb-4">
                          Assigned Employees
                        </h4>

                        {empLoading ? (
                          <div className="flex justify-center py-4">
                            <LoadingSpinner />
                          </div>
                        ) : (
                          <>
                            <div className="space-y-2">
                              {employees.map((emp) => {
                                const pay =
                                  emp.hourly_rate && totalHours !== null && totalHours > 0
                                    ? (emp.hourly_rate * totalHours).toFixed(2)
                                    : null;
                                return (
                                  <div
                                    key={emp.id}
                                    className="flex items-center gap-3 p-2 bg-secondary/20 rounded-lg"
                                  >
                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold shrink-0">
                                      {getInitials(emp.first_name, emp.last_name)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-sm font-medium">
                                        {emp.first_name} {emp.last_name}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {emp.position}
                                      </p>
                                    </div>
                                    {pay && (
                                      <p className="text-sm font-bold text-green-600">${pay}</p>
                                    )}
                                  </div>
                                );
                              })}
                            </div>

                            {totalLaborCost > 0 && (
                              <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50">
                                <span className="text-sm font-medium">Total Labor Cost</span>
                                <span className="text-lg font-bold text-green-600">
                                  ${totalLaborCost.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Notes */}
                  {appointment.notes && (
                    <Card>
                      <CardContent className="p-5">
                        <h4 className="text-sm font-semibold text-foreground mb-4">
                          Appointment Notes
                        </h4>
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {appointment.notes}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Delivery Method */}
                  {appointment.delivery_method && (
                    <Card>
                      <CardContent className="p-5">
                        <h4 className="text-sm font-semibold text-foreground mb-4">
                          Delivery Method
                        </h4>
                        <p className="text-sm font-medium capitalize">
                          {appointment.delivery_method}
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Quick Actions */}
                  <Card>
                    <CardContent className="p-5">
                      <h4 className="text-sm font-semibold text-foreground mb-4">Quick Actions</h4>
                      <div className="space-y-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start h-10"
                          onClick={() => {
                            onClose();
                            if (onEdit) onEdit(appointment.id);
                            else navigate(`/create-route/${appointment.id}/edit`);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2 text-primary" />
                          Edit Appointment
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full justify-start h-10 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                          onClick={() => setDeleteOpen(true)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>

                </div>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
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
