import { MapPin, Star, Edit, Trash2, User, Phone, Mail } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { useState } from "react";
import { useDeleteClientProperty, useSetPrimaryClientProperty } from "../hooks/useClientProperties";
import type { ClientProperty } from "../types/clientProperty.types";

interface PropertyCardProps {
  property: ClientProperty;
  clientId: string;
  onEdit: (property: ClientProperty) => void;
}

export function PropertyCard({ property, clientId, onEdit }: PropertyCardProps) {
  const [showDelete, setShowDelete] = useState(false);
  const { mutate: remove } = useDeleteClientProperty(clientId);
  const { mutate: setPrimary, isPending: settingPrimary } = useSetPrimaryClientProperty(clientId);

  const primaryContact = property.client_property_contacts?.find((c) => c.is_primary_contact)
    ?? property.client_property_contacts?.[0];

  return (
    <>
      <div className="rounded-lg border border-border p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2 min-w-0">
            <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="min-w-0">
              {property.title && (
                <p className="text-sm font-semibold truncate">{property.title}</p>
              )}
              <p className="text-sm">{property.street}{property.apt_suite ? `, ${property.apt_suite}` : ""}</p>
              <p className="text-xs text-muted-foreground">{property.city}, {property.state} {property.zip_code}</p>
            </div>
          </div>
          {property.is_primary && (
            <Badge variant="secondary" className="shrink-0 bg-primary/10 text-primary border-primary/20">
              Primary
            </Badge>
          )}
        </div>

        {/* On-site contact */}
        {primaryContact && (
          <div className="flex items-start gap-2 pt-1 border-t border-border/50">
            <User className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0 text-xs space-y-0.5">
              <p className="font-medium">{primaryContact.full_name}{primaryContact.role ? ` · ${primaryContact.role}` : ""}</p>
              {primaryContact.phone && (
                <a href={`tel:${primaryContact.phone}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  <Phone className="h-3 w-3" /> {primaryContact.phone}
                </a>
              )}
              {primaryContact.email && (
                <a href={`mailto:${primaryContact.email}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground">
                  <Mail className="h-3 w-3" /> {primaryContact.email}
                </a>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1.5 pt-1">
          {!property.is_primary && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs gap-1"
              onClick={() => setPrimary(property.id)}
              disabled={settingPrimary}
            >
              <Star className="h-3 w-3" /> Set Primary
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs gap-1"
            onClick={() => onEdit(property)}
          >
            <Edit className="h-3 w-3" /> Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => setShowDelete(true)}
          >
            <Trash2 className="h-3 w-3" /> Delete
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={showDelete}
        onOpenChange={setShowDelete}
        title="Delete Property"
        description="This property will be permanently deleted."
        onConfirm={() => remove(property.id, { onSuccess: () => setShowDelete(false) })}
        confirmLabel="Delete"
        variant="destructive"
      />
    </>
  );
}
