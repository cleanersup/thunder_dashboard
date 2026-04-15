import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Link2, Search, Users } from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { PageHeader } from "@/shared/components/common/PageHeader";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { useClientsWithSavedCards } from "../clients/hooks/useClients";
import { useIssueClientWalletLink } from "../clients/hooks/useClientWallet";
import type { ClientWithSavedCardRow } from "../clients/services/clientsService";

function formatCardDisplay(row: ClientWithSavedCardRow) {
  const brand = row.card_brand ? row.card_brand.toUpperCase() : "Card";
  const last4 = row.card_last4 ?? "••••";
  return `${brand} •••• ${last4}`;
}

function formatExpiry(row: ClientWithSavedCardRow) {
  if (row.card_exp_month == null || row.card_exp_year == null) return "—";
  const m = String(row.card_exp_month).padStart(2, "0");
  const y = String(row.card_exp_year).slice(-2);
  return `${m}/${y}`;
}

function clientDisplayName(row: ClientWithSavedCardRow) {
  if (row.company?.trim()) return `${row.full_name} (${row.company})`;
  return row.full_name;
}

export default function SavedClientCardsPage() {
  const { data: rows = [], isLoading, isError, refetch } = useClientsWithSavedCards();
  const issueWalletLink = useIssueClientWalletLink();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const blob = [r.full_name, r.company, r.email, r.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [rows, search]);

  return (
    <div className="p-2.5 space-y-2.5">
      <PageHeader
        title="Saved client cards"
        subtitle="Clients who saved a card when paying an invoice (Stripe on file)."
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link to="/crm?tab=clients">Open CRM</Link>
          </Button>
        }
      />

      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-4">
          <div className="border-l-4 border-l-primary pl-4 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Cards on file</p>
              <p className="text-2xl font-bold mt-1 text-foreground">{rows.length}</p>
              <p className="text-xs text-muted-foreground mt-1">Ready for invoice charges</p>
            </div>
            <div className="p-2 rounded-lg bg-secondary/50">
              <CreditCard className="w-5 h-5 text-primary" />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search by name, company, email, or phone…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-border/50 shadow-none overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <LoadingSpinner />
            </div>
          ) : isError ? (
            <div className="p-8 text-center space-y-3">
              <p className="text-sm text-destructive">Could not load saved cards.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Users className="h-10 w-10 mx-auto text-muted-foreground" />
              <p className="font-medium text-foreground">
                {rows.length === 0 ? "No saved cards yet" : "No matches"}
              </p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {rows.length === 0 ? (
                  <>
                    Requires: the payer agreed to save the card on Stripe’s checkout screen, the
                    payment synced back to Thunder successfully, and a CRM client exists with the
                    same email as the invoice (case-insensitive). Open any client in CRM to see
                    &quot;Card on file&quot; when present.
                  </>
                ) : (
                  "Try a different search."
                )}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Card</TableHead>
                    <TableHead className="w-[100px]">Expires</TableHead>
                    <TableHead className="w-[140px] text-right">Client link</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">{clientDisplayName(row)}</TableCell>
                      <TableCell className="text-muted-foreground">{row.email}</TableCell>
                      <TableCell>{formatCardDisplay(row)}</TableCell>
                      <TableCell className="text-muted-foreground">{formatExpiry(row)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1"
                          disabled={issueWalletLink.isPending}
                          onClick={() => issueWalletLink.mutate(row.id)}
                        >
                          <Link2 className="h-3.5 w-3.5" />
                          Copy link
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
