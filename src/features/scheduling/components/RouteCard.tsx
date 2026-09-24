import { useState } from "react";
import { Pencil, Trash2, MapPin } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { ConfirmDialog } from "@/shared/components/common/ConfirmDialog";
import { useUpdateRoute, useDeleteRoute } from "../hooks/useRoutes";
import type { Route } from "../types/scheduling.types";

interface RouteCardProps {
  route: Route;
  appointmentCount: number;
}

export function RouteCard({ route, appointmentCount }: RouteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(route.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { mutate: updateRoute, isPending: isUpdating } = useUpdateRoute();
  const { mutate: deleteRoute, isPending: isDeleting } = useDeleteRoute();

  function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim() || editName.trim() === route.name) {
      setIsEditing(false);
      setEditName(route.name);
      return;
    }
    updateRoute(
      { id: route.id, name: editName },
      {
        onSuccess: () => setIsEditing(false),
        onError: () => setEditName(route.name),
      },
    );
  }

  function handleCancelEdit() {
    setEditName(route.name);
    setIsEditing(false);
  }

  return (
    <>
      <div className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/30 transition-colors">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <MapPin className="h-4 w-4 text-primary shrink-0" />
          {isEditing ? (
            <form onSubmit={handleRename} className="flex items-center gap-2 flex-1">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                autoFocus
                className="h-8 text-sm"
                disabled={isUpdating}
              />
              <Button type="submit" size="sm" disabled={isUpdating || !editName.trim()}>
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleCancelEdit}
                disabled={isUpdating}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{route.name}</p>
              <p className="text-xs text-muted-foreground">
                {appointmentCount} appointment{appointmentCount !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>

        {!isEditing && (
          <div className="flex items-center gap-1 ml-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsEditing(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title="Delete route?"
        description={`"${route.name}" and all its appointments will be permanently deleted.`}
        confirmLabel="Delete"
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={() => deleteRoute(route.id, { onSuccess: () => setConfirmDelete(false) })}
      />
    </>
  );
}
