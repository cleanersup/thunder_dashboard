import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useCreateRoute } from "../hooks/useRoutes";

interface CreateRouteDialogProps {
  open: boolean;
  onClose: () => void;
}

export function CreateRouteDialog({ open, onClose }: CreateRouteDialogProps) {
  const [name, setName] = useState("");
  const { mutate: createRoute, isPending } = useCreateRoute();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createRoute(name, {
      onSuccess: () => {
        setName("");
        onClose();
      },
    });
  }

  function handleClose() {
    if (isPending) return;
    setName("");
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Route</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="route-name">Route name</Label>
            <Input
              id="route-name"
              placeholder="e.g. Monday Morning"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              disabled={isPending}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={!name.trim() || isPending}>
              {isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
