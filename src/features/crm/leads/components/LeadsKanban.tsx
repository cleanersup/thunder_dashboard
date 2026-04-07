import { useState } from "react";
import { GripVertical } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useDraggable, useDroppable } from "@dnd-kit/core";
import { useLeads, useUpdateLead } from "../hooks/useLeads";
import { formatPhoneDisplay, isPhoneValid } from "@/shared/utils/phoneInput";
import { LeadForm } from "./LeadForm";
import { LeadDetailModal } from "./LeadDetailModal";
import { LEAD_CARD_BG, PRIORITY_BADGE } from "@/shared/constants/styleTokens";
import type { Lead, LeadStatus } from "../../types/crm.types";

// ─── Config ───────────────────────────────────────────────────────────────────
const COLUMNS: { status: LeadStatus; label: string }[] = [
  { status: "new",           label: "New" },
  { status: "contacted",     label: "Contacted" },
  { status: "walkthrough",   label: "Walkthrough" },
  { status: "estimate send", label: "Estimate Send" },
  { status: "decision",      label: "Decision" },
];

// ─── Draggable Card ───────────────────────────────────────────────────────────
interface LeadCardProps {
  lead: Lead;
  onClick: () => void;
  isDragging?: boolean;
}

function LeadCard({ lead, onClick, isDragging = false }: LeadCardProps) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: lead.id, data: { lead } });

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`
        rounded-lg border p-3 transition-shadow select-none
        cursor-grab active:cursor-grabbing
        ${LEAD_CARD_BG[lead.priority_level] ?? "bg-card border-border"}
        ${isDragging ? "opacity-40 shadow-none" : "hover:shadow-md"}
      `}
    >
      {/* Name + grip icon */}
      <div className="flex items-start justify-between gap-1 mb-1">
        <p className="text-sm font-semibold text-foreground leading-tight line-clamp-2 flex-1">
          {lead.full_name}
        </p>
        <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/50 mt-0.5" />
      </div>

      {lead.company_name && (
        <p className="text-xs text-muted-foreground truncate mb-1">{lead.company_name}</p>
      )}
      <p className={`text-xs mb-2${isPhoneValid(lead.phone) ? " text-muted-foreground" : " text-destructive"}`}>{formatPhoneDisplay(lead.phone)}</p>

      <div className="flex justify-end">
        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full capitalize ${PRIORITY_BADGE[lead.priority_level] ?? "bg-secondary text-secondary-foreground"}`}>
          {lead.priority_level}
        </span>
      </div>
    </div>
  );
}

// ─── Droppable Column ─────────────────────────────────────────────────────────
interface ColumnProps {
  status: LeadStatus;
  label: string;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
  draggingId: string | null;
}

function KanbanColumn({ status, label, leads, onCardClick, draggingId }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="min-w-[220px] flex-shrink-0 flex flex-col min-h-400">
      <div
        ref={setNodeRef}
        className={`
          flex-1 rounded-xl p-3 space-y-2 transition-colors
          bg-muted/40 h-full
          ${isOver ? "ring-2 ring-primary/40 bg-muted/60" : ""}
        `}
      >
      <h3 className="text-sm font-semibold text-foreground mb-3 px-1">{label}</h3>

        {leads.map((lead) => (
          <LeadCard
            key={lead.id}
            lead={lead}
            onClick={() => onCardClick(lead)}
            isDragging={draggingId === lead.id}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Kanban ───────────────────────────────────────────────────────────────────
interface LeadsKanbanProps {
  showForm: boolean;
  onCloseForm: () => void;
}

/**
 * Kanban board for leads with drag-and-drop between columns.
 * Dragging a card to a different column updates its status via React Query mutation.
 * Clicking a card opens a detail modal (no page navigation).
 */
export function LeadsKanban({ showForm, onCloseForm }: LeadsKanbanProps) {
  const { data: leads = [], isLoading } = useLeads();
  const { mutate: updateLead } = useUpdateLead();

  const [draggingLead, setDraggingLead] = useState<Lead | null>(null);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [modalOpen, setModalOpen]       = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const byStatus = (status: LeadStatus) => leads.filter((l) => l.status === status);

  const handleDragStart = (event: DragStartEvent) => {
    const lead = event.active.data.current?.lead as Lead;
    setDraggingLead(lead ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDraggingLead(null);

    if (!over) return;

    const leadId       = active.id as string;
    const targetStatus = over.id as LeadStatus;
    const lead         = leads.find((l) => l.id === leadId);

    if (lead && lead.status !== targetStatus) {
      updateLead({ id: leadId, payload: { status: targetStatus } });
    }
  };

  const handleCardClick = (lead: Lead) => {
    setSelectedLead(lead);
    setModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2 min-h-[400px] lg:min-h-[calc(100vh-370px)] items-stretch">
        {COLUMNS.map((col) => (
          <div key={col.status} className="min-w-[220px] flex-1 rounded-xl bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-2 min-h-[400px] lg:min-h-[calc(100vh-370px)] items-stretch">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.status}
              status={col.status}
              label={col.label}
              leads={byStatus(col.status)}
              onCardClick={handleCardClick}
              draggingId={draggingLead?.id ?? null}
            />
          ))}
        </div>

        {/* Ghost card while dragging */}
        <DragOverlay>
          {draggingLead && (
            <div className={`rounded-lg border p-3 shadow-lg cursor-grabbing ${LEAD_CARD_BG[draggingLead.priority_level] ?? "bg-card border-border"}`}>
              <p className="text-sm font-semibold text-foreground">{draggingLead.full_name}</p>
              {draggingLead.company_name && (
                <p className="text-xs text-muted-foreground truncate">{draggingLead.company_name}</p>
              )}
              <p className={`text-xs${isPhoneValid(draggingLead.phone) ? " text-muted-foreground" : " text-destructive"}`}>{formatPhoneDisplay(draggingLead.phone)}</p>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {/* Lead detail modal */}
      <LeadDetailModal
        lead={selectedLead}
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelectedLead(null); }}
      />

      {/* Add lead form */}
      <LeadForm open={showForm} onClose={onCloseForm} />
    </>
  );
}
