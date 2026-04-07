import { useState, useMemo } from "react";
import { MoreVertical, Edit, FileText, Route, Receipt, UserX, UserCheck, Trash2 } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { DataTable, type ColumnDef } from "@/shared/components/common/DataTable";
import { InitialsAvatar } from "@/shared/components/common/Avatar";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { useClients, useDeleteClient, useUpdateClient } from "../hooks/useClients";
import { ClientForm } from "./ClientForm";
import { ClientDetailModal } from "./ClientDetailModal";
import { CLIENT_STATUS_TABLE } from "@/shared/constants/styleTokens";
import { formatPhoneDisplay, isPhoneValid } from "@/shared/utils/phoneInput";
import { toast } from "sonner";
import type { Client } from "../../types/crm.types";

// ─── Actions dropdown ─────────────────────────────────────────────────────────
interface ActionsCellProps {
  client: Client;
  onOpenDetails: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function ActionsCell({ client, onOpenDetails, onEdit, onDelete }: ActionsCellProps) {
  const { mutate: updateClient } = useUpdateClient();

  const handleToggleStatus = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = client.status === "active" ? "inactive" : "active";
    updateClient({ id: client.id, payload: { status: next } });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* Always visible */}
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onOpenDetails(); }}>
          View Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
          <Edit className="h-3.5 w-3.5 mr-2" /> Edit
        </DropdownMenuItem>

        {/* Active-only actions */}
        {client.status === "active" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.info("Coming soon"); }}>
              <FileText className="h-3.5 w-3.5 mr-2" /> Send Estimate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.info("Coming soon"); }}>
              <Route className="h-3.5 w-3.5 mr-2" /> Add to Route
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); toast.info("Coming soon"); }}>
              <Receipt className="h-3.5 w-3.5 mr-2" /> Send Invoice
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleToggleStatus}>
              <UserX className="h-3.5 w-3.5 mr-2 text-warning" /> Deactivate
            </DropdownMenuItem>
          </>
        )}

        {/* Inactive-only actions */}
        {client.status === "inactive" && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleToggleStatus}>
              <UserCheck className="h-3.5 w-3.5 mr-2 text-success" /> Activate
            </DropdownMenuItem>
          </>
        )}

        {/* Always visible */}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
        >
          <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
interface ClientsTableProps {
  searchQuery: string;
  showForm: boolean;
  onCloseForm: () => void;
}

export function ClientsTable({ searchQuery, showForm, onCloseForm }: ClientsTableProps) {
  const { data: clients = [], isLoading } = useClients();
  const { mutate: deleteClient } = useDeleteClient();

  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [modalOpen, setModalOpen]           = useState(false);
  const [editingClient, setEditingClient]   = useState<Client | null>(null);
  const [deletingClient, setDeletingClient] = useState<Client | null>(null);

  const openDetails = (client: Client) => { setSelectedClient(client); setModalOpen(true); };
  const closeModal  = () => { setModalOpen(false); setSelectedClient(null); };

  const columns = useMemo<ColumnDef<Client>[]>(() => [
    {
      key: "full_name",
      header: "Client Name",
      cell: (c) => (
        <div className="flex items-center gap-2.5">
          <InitialsAvatar name={c.full_name} />
          <span className="font-medium text-sm">{c.full_name}</span>
        </div>
      ),
    },
    {
      key: "company",
      header: "Company",
      cell: (c) => <span className="text-muted-foreground">{c.company ?? "-"}</span>,
      hideOnMobile: true,
    },
    {
      key: "email",
      header: "Email",
      cell: (c) => c.email,
      hideOnMobile: true,
    },
    {
      key: "phone",
      header: "Phone",
      cell: (c) => (
        <span className={isPhoneValid(c.phone) ? undefined : "text-destructive"}>
          {formatPhoneDisplay(c.phone)}
        </span>
      ),
      hideOnMobile: true,
    },
    {
      key: "status",
      header: "Status",
      cell: (c) => (
        <Badge
          className={CLIENT_STATUS_TABLE[c.status] ?? ""}
          variant="outline"
        >
          {c.status === "active" ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      cell: (c) => (
        <ActionsCell
          client={c}
          onOpenDetails={() => openDetails(c)}
          onEdit={() => setEditingClient(c)}
          onDelete={() => setDeletingClient(c)}
        />
      ),
      className: "w-12 text-right",
    },
  ], []);

  const filteredClients = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(
      (c) =>
        c.full_name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.company ?? "").toLowerCase().includes(q)
    );
  }, [clients, searchQuery]);

  return (
    <>
      <DataTable
        columns={columns}
        data={filteredClients}
        keyExtractor={(c) => c.id}
        isLoading={isLoading}
        paginated
        onRowClick={openDetails}
        emptyTitle="No clients yet"
        emptyDescription="Add your first client to get started."
      />

      {/* Detail modal */}
      <ClientDetailModal
        client={selectedClient}
        open={modalOpen}
        onClose={closeModal}
      />

      {/* Add / Edit form */}
      <ClientForm open={showForm} onClose={onCloseForm} />
      <ClientForm open={!!editingClient} onClose={() => setEditingClient(null)} client={editingClient ?? undefined} />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deletingClient}
        onOpenChange={(v) => { if (!v) setDeletingClient(null); }}
        title="Delete Client"
        description={`Are you sure? ${deletingClient?.full_name} will be permanently deleted.`}
        onConfirm={() => {
          if (deletingClient) deleteClient(deletingClient.id, { onSuccess: () => setDeletingClient(null) });
        }}
        confirmLabel="Delete"
        variant="destructive"
      />
    </>
  );
}
