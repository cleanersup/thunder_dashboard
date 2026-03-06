import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  User, Calendar, Clock, Mail, Phone, MapPin,
  Home, Building2, CheckCircle2, XCircle,
  Navigation, Users, UserPlus, Trash2, MessageSquare,
} from "lucide-react";
import { Dialog, DialogContent } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { AddressRouteMap } from "@/shared/components/common/AddressRouteMap";
import { useProfile } from "@/shared/hooks/useProfile";
import {
  useConvertToLead, useConvertToClient,
  useCancelBooking, useDeleteBooking,
} from "../hooks/useBookings";
import type { Booking } from "../types/booking.types";

interface BookingDetailModalProps {
  booking: Booking | null;
  open: boolean;
  onClose: () => void;
}

const getStatusStyles = (status: string) => {
  if (status === "new")       return "bg-success/20 text-success-subtle-foreground";
  if (status === "cancelled") return "bg-destructive/20 text-destructive";
  return "bg-secondary/20 text-secondary-foreground";
};

export function BookingDetailModal({ booking, open, onClose }: BookingDetailModalProps) {
  const { mutate: toLead   } = useConvertToLead();
  const { mutate: toClient } = useConvertToClient();
  const { mutate: cancel   } = useCancelBooking();
  const { mutate: remove   } = useDeleteBooking();
  const { data: profile } = useProfile();

  const [confirmAction, setConfirmAction] = useState<"lead" | "client" | "cancel" | "delete" | null>(null);

  if (!booking) return null;

  const handleConfirm = () => {
    if (!confirmAction) return;
    if (confirmAction === "lead")   toLead(booking,    { onSuccess: onClose });
    if (confirmAction === "client") toClient(booking,  { onSuccess: onClose });
    if (confirmAction === "cancel") cancel(booking.id, { onSuccess: onClose });
    if (confirmAction === "delete") remove(booking.id, { onSuccess: onClose });
    setConfirmAction(null);
  };

  const confirmMessages: Record<string, { title: string; description: string; label: string; variant?: "destructive" }> = {
    lead:   { title: "Move to CRM",       description: "A new lead will be created and this booking will be deleted.",   label: "Move to CRM"     },
    client: { title: "Convert to Client", description: "A new client will be created and this booking will be deleted.", label: "Convert"         },
    cancel: { title: "Cancel Booking",    description: "This booking will be marked as cancelled.",                       label: "Cancel Booking", variant: "destructive" },
    delete: { title: "Delete Booking",    description: "This booking will be permanently deleted.",                       label: "Delete",         variant: "destructive" },
  };

  const confirm = confirmAction ? confirmMessages[confirmAction] : null;

  const additionalServices = Array.isArray(booking.additional_services)
    ? (booking.additional_services as string[])
    : [];

  const customAnswers = booking.custom_answers as Record<string, string> | null;

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${booking.street}${booking.apt_suite ? " " + booking.apt_suite : ""}, ${booking.city}, ${booking.state} ${booking.zip_code}`
  )}`;

  const targetAddress = [
    booking.street,
    booking.apt_suite,
    booking.city,
    booking.state,
    booking.zip_code,
  ].filter(Boolean).join(", ");

  const companyAddress = [
    profile?.company_address,
    profile?.company_city,
    profile?.company_state,
    profile?.company_zip,
  ].filter(Boolean).join(", ");

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="max-w-3xl h-[85vh] p-0 gap-0 overflow-hidden">

          {/* ── Header ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-2 px-6 pr-12 py-2.5 border-b border-border/50 bg-sidebar">
            <h2 className="text-lg font-bold text-white">{booking.lead_name}</h2>
            <Badge
              variant="secondary"
              className={`font-semibold capitalize ${getStatusStyles(booking.status)}`}
            >
              {booking.status === "new" ? (
                <><CheckCircle2 className="w-3 h-3 mr-1" /> New</>
              ) : (
                <><XCircle className="w-3 h-3 mr-1" /> Cancelled</>
              )}
            </Badge>
          </div>

          {/* ── Content ─────────────────────────────────────────────── */}
          <ScrollArea className="flex-1 h-[calc(85vh-56px)]">
            <div className="p-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* ── Left Column ──────────────────────────────────── */}
                <div className="space-y-4">

                  {/* Contact Information */}
                  <Card className="border border-border/50">
                    <CardContent className="p-5">
                      <h4 className="text-sm font-semibold text-foreground mb-4">Contact Information</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <User className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="text-xs text-muted-foreground">Name</p>
                            <p className="text-sm font-medium">{booking.lead_name}</p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Email</p>
                              <p className="text-sm font-medium truncate max-w-[150px]">{booking.email}</p>
                            </div>
                          </div>
                          <a href={`mailto:${booking.email}`} className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
                            <Mail className="w-4 h-4 text-primary" />
                          </a>
                        </div>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Phone className="w-4 h-4 text-muted-foreground shrink-0" />
                            <div>
                              <p className="text-xs text-muted-foreground">Phone</p>
                              <p className="text-sm font-medium">{booking.phone}</p>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <a href={`sms:${booking.phone}`} className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
                              <MessageSquare className="w-4 h-4 text-primary" />
                            </a>
                            <a href={`tel:${booking.phone}`} className="p-2 rounded-lg bg-primary/10 hover:bg-primary/20 transition-colors">
                              <Phone className="w-4 h-4 text-primary" />
                            </a>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Service Address */}
                  <Card className="border border-border/50">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                          <div>
                            <h4 className="text-sm font-semibold mb-2">Service Address</h4>
                            <p className="text-sm">{booking.street}{booking.apt_suite && `, ${booking.apt_suite}`}</p>
                            <p className="text-sm">{booking.city}, {booking.state} {booking.zip_code}</p>
                          </div>
                        </div>
                        <a
                          href={mapsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg bg-info/10 hover:bg-info/20 text-info transition-colors"
                        >
                          <Navigation className="w-4 h-4" />
                        </a>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Route Map */}
                  {targetAddress && (
                    <AddressRouteMap
                      targetAddress={targetAddress}
                      companyAddress={companyAddress || undefined}
                      className="w-full h-[200px] rounded-lg overflow-hidden"
                    />
                  )}

                  {/* Service Information */}
                  <Card className="border border-border/50">
                    <CardContent className="p-5">
                      <h4 className="text-sm font-semibold mb-4">Service Information</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          {booking.service_type === "residential"
                            ? <Home className="w-4 h-4 text-muted-foreground" />
                            : <Building2 className="w-4 h-4 text-muted-foreground" />
                          }
                          <div>
                            <p className="text-xs text-muted-foreground">Service Type</p>
                            <p className="text-sm font-medium capitalize">{booking.service_type}</p>
                          </div>
                        </div>
                        {booking.commercial_property_type && (
                          <div className="flex items-center gap-3">
                            <Building2 className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Property Type</p>
                              <p className="text-sm font-medium">
                                {booking.commercial_property_type === "Other"
                                  ? booking.other_commercial_type ?? "Other"
                                  : booking.commercial_property_type}
                              </p>
                            </div>
                          </div>
                        )}
                        {booking.bedrooms != null && (
                          <div className="flex items-center gap-3">
                            <Home className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Size</p>
                              <p className="text-sm font-medium">{booking.bedrooms} bed / {booking.bathrooms ?? 0} bath</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Schedule */}
                  {(booking.preferred_date || booking.time_preference) && (
                    <Card className="border border-border/50">
                      <CardContent className="p-5">
                        <h4 className="text-sm font-semibold mb-4">Schedule</h4>
                        <div className="space-y-3">
                          {booking.preferred_date && (
                            <div className="flex items-center gap-3">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Preferred Date</p>
                                <p className="text-sm font-medium">
                                  {format(parseISO(booking.preferred_date), "MMMM dd, yyyy")}
                                </p>
                              </div>
                            </div>
                          )}
                          {booking.time_preference && (
                            <div className="flex items-center gap-3">
                              <Clock className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="text-xs text-muted-foreground">Time Preference</p>
                                <p className="text-sm font-medium uppercase">{booking.time_preference}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* ── Right Column ─────────────────────────────────── */}
                <div className="space-y-4">

                  {/* Additional Services */}
                  {additionalServices.length > 0 && (
                    <Card className="border border-border/50">
                      <CardContent className="p-5">
                        <h4 className="text-sm font-semibold mb-4">Additional Services</h4>
                        <div className="flex flex-wrap gap-2">
                          {additionalServices.map((s) => (
                            <Badge key={s} variant="secondary" className="bg-primary/10 text-primary border border-primary/20">
                              {s}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Service Details */}
                  {booking.service_details && (
                    <Card className="border border-border/50">
                      <CardContent className="p-5">
                        <h4 className="text-sm font-semibold mb-4">Service Details</h4>
                        <p className="text-sm leading-relaxed">{booking.service_details}</p>
                      </CardContent>
                    </Card>
                  )}

                  {/* Custom Answers */}
                  {customAnswers && Object.keys(customAnswers).length > 0 && (
                    <Card className="border border-border/50">
                      <CardContent className="p-5">
                        <h4 className="text-sm font-semibold mb-4">Additional Information</h4>
                        <div className="space-y-3">
                          {Object.entries(customAnswers).map(([q, a]) => (
                            <div key={q}>
                              <p className="text-xs text-muted-foreground mb-1">{q}</p>
                              <p className="text-sm">{a}</p>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Timeline */}
                  <Card className="border border-border/50">
                    <CardContent className="p-5">
                      <h4 className="text-sm font-semibold mb-4">Timeline</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <div>
                            <p className="text-xs text-muted-foreground">Booking Created</p>
                            <p className="text-sm font-medium">
                              {format(parseISO(booking.created_at), "MMMM dd, yyyy - h:mm a")}
                            </p>
                          </div>
                        </div>
                        {booking.updated_at !== booking.created_at && (
                          <div className="flex items-center gap-3">
                            <Clock className="w-4 h-4 text-muted-foreground" />
                            <div>
                              <p className="text-xs text-muted-foreground">Last Updated</p>
                              <p className="text-sm font-medium">
                                {format(parseISO(booking.updated_at), "MMMM dd, yyyy - h:mm a")}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card className="border border-border/50">
                    <CardContent className="p-5">
                      <h4 className="text-sm font-semibold mb-4">Quick Actions</h4>
                      <div className="space-y-2">
                        <Button
                          variant="outline" size="sm"
                          className="w-full justify-start h-10"
                          onClick={() => setConfirmAction("lead")}
                        >
                          <Users className="w-4 h-4 mr-2 text-primary" /> Move to CRM
                        </Button>
                        <Button
                          variant="outline" size="sm"
                          className="w-full justify-start h-10 text-success hover:text-success"
                          onClick={() => setConfirmAction("client")}
                        >
                          <UserPlus className="w-4 h-4 mr-2" /> Convert to Client
                        </Button>
                        {booking.status !== "cancelled" && (
                          <Button
                            variant="outline" size="sm"
                            className="w-full justify-start h-10 text-warning hover:text-warning"
                            onClick={() => setConfirmAction("cancel")}
                          >
                            <XCircle className="w-4 h-4 mr-2" /> Cancel Booking
                          </Button>
                        )}
                        <Button
                          variant="outline" size="sm"
                          className="w-full justify-start h-10 text-destructive hover:text-destructive"
                          onClick={() => setConfirmAction("delete")}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
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

      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(v) => { if (!v) setConfirmAction(null); }}
        title={confirm?.title ?? ""}
        description={confirm?.description ?? ""}
        onConfirm={handleConfirm}
        confirmLabel={confirm?.label ?? "Confirm"}
        variant={confirm?.variant}
      />
    </>
  );
}
