import { useParams } from "react-router-dom";
import { Building2, Mail, Phone, UserCircle2 } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Button } from "@/shared/components/ui/button";
import { Loader2 } from "lucide-react";
import { usePublicProfile } from "../hooks/useSettings";

// ─── vCard generation ─────────────────────────────────────────────────────────

function downloadVCard(data: {
  firstName: string;
  lastName: string;
  companyPhone?: string | null;
  companyEmail?: string | null;
  companyName?: string | null;
}) {
  const vCard = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    `FN:${data.firstName} ${data.lastName}`,
    data.companyPhone ? `TEL;TYPE=WORK:${data.companyPhone}` : "",
    data.companyEmail ? `EMAIL:${data.companyEmail}` : "",
    data.companyName ? `ORG:${data.companyName}` : "",
    "END:VCARD",
  ]
    .filter(Boolean)
    .join("\r\n");

  const blob = new Blob([vCard], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${data.firstName}_${data.lastName}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContactCardPage() {
  const { userId } = useParams<{ userId: string }>();
  const { data: profile, isLoading, isError } = usePublicProfile(userId);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (isError || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20">
        <p className="text-muted-foreground">Contact not found.</p>
      </div>
    );
  }

  const initials = `${profile.first_name?.[0] ?? ""}${profile.last_name?.[0] ?? ""}`.toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-sm shadow-lg border border-border/50">
        <CardContent className="p-6 flex flex-col items-center gap-4 text-center">
          {/* Avatar / Logo */}
          <Avatar className="w-24 h-24 ring-2 ring-primary/20">
            <AvatarImage src={profile.company_logo ?? undefined} alt="Company logo" />
            <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
              {initials || <Building2 className="w-8 h-8" />}
            </AvatarFallback>
          </Avatar>

          {/* Name */}
          <div>
            <h1 className="text-xl font-bold">
              {profile.first_name} {profile.last_name}
            </h1>
            {profile.company_name && (
              <p className="text-sm text-muted-foreground mt-0.5">{profile.company_name}</p>
            )}
          </div>

          {/* Contact info */}
          <div className="w-full space-y-2">
            {profile.company_phone && (
              <a
                href={`tel:${profile.company_phone}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <Phone className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium">{profile.company_phone}</span>
              </a>
            )}
            {profile.company_email && (
              <a
                href={`mailto:${profile.company_email}`}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
              >
                <Mail className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-sm font-medium truncate">{profile.company_email}</span>
              </a>
            )}
          </div>

          {/* Add to Contacts button */}
          <Button
            className="w-full mt-2"
            onClick={() =>
              downloadVCard({
                firstName: profile.first_name,
                lastName: profile.last_name,
                companyPhone: profile.company_phone,
                companyEmail: profile.company_email,
                companyName: profile.company_name,
              })
            }
          >
            <UserCircle2 className="w-4 h-4 mr-2" />
            Add to Contacts
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
