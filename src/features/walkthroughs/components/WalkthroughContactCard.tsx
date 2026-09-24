import { User, Mail, Phone as PhoneIcon, MapPin } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import type { ContactInfo } from "../utils/walkthroughUtils";

interface WalkthroughContactCardProps {
  info: ContactInfo;
  walkthroughType: string;
}

export function WalkthroughContactCard({ info, walkthroughType }: WalkthroughContactCardProps) {
  const title = walkthroughType === "client" ? "Client Information" : "Lead Information";
  const address = info.service_street
    ? `${info.service_street}, ${info.service_city}, ${info.service_state} ${info.service_zip}`
    : "—";

  return (
    <Card>
      <CardContent className="p-5 space-y-3">
        <h2 className="text-base font-semibold flex items-center gap-2">
          <User className="w-4 h-4" />
          {title}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <User className="w-3 h-3" /> Full Name
            </p>
            <p className="text-sm font-medium">{info.full_name || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Mail className="w-3 h-3" /> Email
            </p>
            <p className="text-sm font-medium">{info.email || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <PhoneIcon className="w-3 h-3" /> Phone
            </p>
            <p className="text-sm font-medium">{info.phone || "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Address
            </p>
            <p className="text-sm font-medium">{address}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
