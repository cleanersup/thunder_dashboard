/**
 * @module ResPreviewStep — Step 9 (Residential)
 * Read-only preview of all form data before sending.
 */
import {
  Eye, User, Briefcase, Sparkles, Plus,
  PawPrint, Shirt, ClipboardList, DollarSign,
} from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import type { ExtrasState } from "./ResExtrasStep";

interface ClientInfo {
  name:    string;
  company: string;
  email:   string;
  phone:   string;
  address: string;
  city:    string;
  state:   string;
  zip:     string;
}

export interface ResPreviewStepProps {
  client:         ClientInfo | null;
  selectedService: string;
  bedrooms:        number;
  kitchens:        number;
  livingRooms:     number;
  diningRooms:     number;
  offices:         number;
  fullBaths:       number;
  halfBaths:       number;
  fans:            number;
  oven:            number;
  refrigerator:    number;
  blinds:          number;
  windowsInside:   number;
  windowsOutside:  number;
  extras:          ExtrasState;
  pets:            "yes" | "no" | null;
  laundryService:  "wash-dry" | "wash-dry-fold" | null;
  laundryPounds:   number;
  scope:           string;
  total:           number;
  subtotal:        number;
  applyDiscount:   boolean;
  discountType:    "percentage" | "amount";
  discountValue:   string;
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm text-muted-foreground">{label}:</span>
      <span className="text-sm font-medium text-right">{value}</span>
    </div>
  );
}

function Section({ icon: Icon, title, children }: {
  icon: React.ElementType; title: string; children: React.ReactNode;
}) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Icon className="h-4 w-4" />
          {title}
        </h3>
        {children}
      </CardContent>
    </Card>
  );
}

export function ResPreviewStep({
  client, selectedService,
  bedrooms, kitchens, livingRooms, diningRooms, offices, fullBaths, halfBaths,
  fans, oven, refrigerator, blinds, windowsInside, windowsOutside,
  extras, pets, laundryService, laundryPounds, scope,
  total, subtotal, applyDiscount, discountType, discountValue,
}: ResPreviewStepProps) {

  const hasAdditional = fans > 0 || oven > 0 || refrigerator > 0 || blinds > 0 || windowsInside > 0 || windowsOutside > 0;
  const hasExtras = Object.values(extras).some(Boolean);

  const discountAmount = applyDiscount && discountValue
    ? discountType === "percentage"
      ? (subtotal * parseFloat(discountValue)) / 100
      : parseFloat(discountValue)
    : 0;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Eye className="h-5 w-5" />
          Preview
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Review all the information before sending to the client
        </p>
      </div>

      {/* Client Information */}
      {client && (
        <Section icon={User} title="Client Information">
          <Row label="Name"    value={client.name} />
          {client.company && <Row label="Company" value={client.company} />}
          <Row label="Email"   value={client.email} />
          <Row label="Phone"   value={client.phone} />
          <Row label="Address" value={`${client.address}, ${client.city}, ${client.state} ${client.zip}`} />
        </Section>
      )}

      {/* Service Details */}
      <Section icon={Briefcase} title="Service Details">
        <Row label="Service Type" value={selectedService} />
        {bedrooms > 0    && <Row label="Bedrooms"        value={bedrooms} />}
        {kitchens > 0    && <Row label="Kitchens"        value={kitchens} />}
        {livingRooms > 0 && <Row label="Living Rooms"    value={livingRooms} />}
        {diningRooms > 0 && <Row label="Dining Rooms"    value={diningRooms} />}
        {offices > 0     && <Row label="Offices"         value={offices} />}
        {fullBaths > 0   && <Row label="Full Bathrooms"  value={fullBaths} />}
        {halfBaths > 0   && <Row label="Half Bathrooms"  value={halfBaths} />}
      </Section>

      {/* Additional Services */}
      {hasAdditional && (
        <Section icon={Sparkles} title="Additional Services">
          {fans > 0          && <Row label="Ceiling Fans"      value={fans} />}
          {oven > 0          && <Row label="Oven"              value={oven} />}
          {refrigerator > 0  && <Row label="Refrigerator"      value={refrigerator} />}
          {blinds > 0        && <Row label="Blinds"            value={blinds} />}
          {windowsInside > 0 && <Row label="Windows (Inside)"  value={windowsInside} />}
          {windowsOutside > 0 && <Row label="Windows (Outside)" value={windowsOutside} />}
        </Section>
      )}

      {/* Extra Services */}
      {hasExtras && (
        <Section icon={Plus} title="Extra Services">
          <div className="space-y-1">
            {extras.baseboard     && <p className="text-sm text-muted-foreground">• Baseboard cleaning</p>}
            {extras.patio         && <p className="text-sm text-muted-foreground">• Patio cleaning</p>}
            {extras.walls         && <p className="text-sm text-muted-foreground">• Wall cleaning</p>}
            {extras.stairs        && <p className="text-sm text-muted-foreground">• Stairs cleaning</p>}
            {extras.cabinetInside && <p className="text-sm text-muted-foreground">• Cabinet inside cleaning</p>}
            {extras.cabinetOutside && <p className="text-sm text-muted-foreground">• Cabinet outside cleaning</p>}
            {extras.washDishes    && <p className="text-sm text-muted-foreground">• Wash dishes</p>}
            {extras.hallways      && <p className="text-sm text-muted-foreground">• Hallways cleaning</p>}
            {extras.basement      && <p className="text-sm text-muted-foreground">• Basement cleaning</p>}
          </div>
        </Section>
      )}

      {/* Pets */}
      {pets === "yes" && (
        <Section icon={PawPrint} title="Pets">
          <p className="text-sm text-muted-foreground">Property has pets</p>
        </Section>
      )}

      {/* Laundry */}
      {laundryService && (
        <Section icon={Shirt} title="Laundry Service">
          <Row label="Service" value={laundryService === "wash-dry" ? "Wash and dry" : "Wash, dry and fold"} />
          {laundryPounds > 0 && <Row label="Pounds" value={laundryPounds} />}
        </Section>
      )}

      {/* Scope */}
      {scope && (
        <Section icon={ClipboardList} title="Service Scope">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">{scope}</p>
        </Section>
      )}

      {/* Price Summary */}
      <Section icon={DollarSign} title="Price Summary">
        {applyDiscount && discountAmount > 0 && (
          <>
            <Row label="Subtotal" value={`$${subtotal.toFixed(2)}`} />
            <Row
              label={`Discount (${discountType === "percentage" ? `${discountValue}%` : `$${discountValue}`})`}
              value={<span className="text-destructive">-${discountAmount.toFixed(2)}</span>}
            />
            <div className="border-t" />
          </>
        )}
        <div className="flex justify-between">
          <span className="text-base font-semibold">Total:</span>
          <span className="text-base font-bold text-primary">${total.toFixed(2)}</span>
        </div>
      </Section>
    </div>
  );
}
