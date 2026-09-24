import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QK } from "@/shared/config/queryKeys";
import { Plus, Building2, Phone, Mail, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { SearchableSelect } from "@/shared/components/ui/searchable-select";
import { ClientForm } from "@/features/crm/clients/components/ClientForm";
import type { ClientEntity } from "@/shared/types/entities";

interface Props {
  clients:          ClientEntity[];
  isLoadingClients?: boolean;
  selectedClient:   ClientEntity | null;
  onClientSelect:   (client: ClientEntity) => void;
  error?:           string;
}

function buildAddress(c: ClientEntity): string {
  const apt = c.service_apt ? ` ${c.service_apt}` : "";
  return `${c.service_street}${apt}, ${c.service_city}, ${c.service_state} ${c.service_zip}`;
}

export function AppointmentClientStep({
  clients,
  isLoadingClients,
  selectedClient,
  onClientSelect,
  error,
}: Props) {
  const qc = useQueryClient();
  const [showNewClient, setShowNewClient] = useState(false);

  const options = clients.map((c) => ({
    value: c.id,
    label: c.full_name,
    subtitle: c.company ?? undefined,
  }));

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Select Client
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Choose the client for this appointment</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">

            <SearchableSelect
              value={selectedClient?.id ?? ""}
              onValueChange={(id) => {
                const client = clients.find((c) => c.id === id);
                if (client) onClientSelect(client);
              }}
              options={options}
              placeholder="Select a client"
              title="Select Client"
              disabled={isLoadingClients}
            />

            {error && <p className="text-xs text-destructive">{error}</p>}

            <Button
              type="button"
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setShowNewClient(true)}
            >
              <Plus className="w-4 h-4" />
              Add New Client
            </Button>

            {selectedClient && (
              <Card>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-base">Client Information</CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 space-y-3">
                  {selectedClient.company && (
                    <div className="flex items-start gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">Company</p>
                        <p className="text-sm font-medium">{selectedClient.company}</p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                    <Phone className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm font-medium">{selectedClient.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm font-medium">{selectedClient.email}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Service Address</p>
                      <p className="text-sm font-medium">{buildAddress(selectedClient)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <ClientForm
              open={showNewClient}
              onClose={() => setShowNewClient(false)}
              onSuccess={(client) => {
                onClientSelect(client);
                qc.invalidateQueries({ queryKey: QK.clients });
                setShowNewClient(false);
              }}
            />
          </div>

        </CardContent>
      </Card>

    </div>
  );
}
