/**
 * @module ScheduleMapPanel
 * Las paradas del día en lista, agrupadas por cuadrilla.
 *
 * El mapa enseña dónde cae cada parada pero no de quién es: dos chinchetas
 * juntas pueden ser de dos personas distintas. Esta lista contesta eso, y de
 * paso da la cuenta por persona, que es el dato con el que se reparte el día.
 *
 * Un job con varios empleados aparece bajo cada uno — la misma parada cuenta
 * para todos los que van a ella, igual que en la realidad.
 */
import { ChevronRight, MapPin, Users } from "lucide-react";
import { Badge } from "@/shared/components/ui/badge";
import { formatDisplayTime } from "@/shared/utils/formatters";
import { InitialsAvatar } from "@/shared/components/common/Avatar";
import { eventPalette, type ScheduleEvent } from "../types/scheduleEvent";

const UNASSIGNED = "__unassigned__";

interface ScheduleMapPanelProps {
  /** Paradas en el mismo orden con el que el mapa las numera. */
  events: ScheduleEvent[];
  /** Id de empleado → nombre legible. */
  crewNames: Map<string, string>;
  /**
   * Número de parada por `event.id`. Solo lo tienen las que se pudieron situar
   * en el mapa: una parada sin dirección se lista, pero no ocupa número.
   */
  stopNumbers: Map<string, number>;
  selectedId: string | null;
  /** Resalta la parada y centra el mapa en ella. */
  onSelect: (event: ScheduleEvent) => void;
  /** Abre el detalle completo del job o de la task. */
  onOpen: (event: ScheduleEvent) => void;
}

interface CrewGroup {
  id: string;
  name: string;
  stops: ScheduleEvent[];
}

export function ScheduleMapPanel({
  events, crewNames, stopNumbers, selectedId, onSelect, onOpen,
}: ScheduleMapPanelProps) {

  const groups: CrewGroup[] = [];
  const byId = new Map<string, CrewGroup>();

  events.forEach((event) => {
    const owners = event.crew.length > 0 ? event.crew : [UNASSIGNED];

    owners.forEach((ownerId) => {
      let group = byId.get(ownerId);
      if (!group) {
        group = {
          id: ownerId,
          name: ownerId === UNASSIGNED ? "Unassigned" : crewNames.get(ownerId) ?? "Employee",
          stops: [],
        };
        byId.set(ownerId, group);
        groups.push(group);
      }
      group.stops.push(event);
    });
  });

  // "Unassigned" al final: es el cajón de lo que falta repartir, no una cuadrilla.
  groups.sort((a, b) => {
    if (a.id === UNASSIGNED) return 1;
    if (b.id === UNASSIGNED) return -1;
    return a.name.localeCompare(b.name);
  });

  if (events.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
        <MapPin className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No stops for this period</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2.5">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Crews</span>
        <Badge variant="outline" className="ml-auto h-5 px-1.5 text-[11px]">
          {events.length} {events.length === 1 ? "stop" : "stops"}
        </Badge>
      </div>

      <div className="flex-1 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.id} className="border-b border-border last:border-b-0">

            <div className="flex items-center gap-2 bg-secondary/40 px-3 py-2">
              <InitialsAvatar name={group.name} size="sm" />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{group.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {group.stops.length} {group.stops.length === 1 ? "stop" : "stops"}
              </span>
            </div>

            {group.stops.map((event) => {
              const color      = eventPalette(event).color;
              const selected   = event.id === selectedId;
              const stopNumber = stopNumbers.get(event.id);

              return (
                <div
                  key={`${group.id}-${event.id}`}
                  onClick={() => onSelect(event)}
                  className={`flex cursor-pointer items-start gap-2.5 px-3 py-2.5 transition-colors ${
                    selected ? "bg-primary/5" : "hover:bg-secondary/50"
                  }`}
                >
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
                    style={{ backgroundColor: stopNumber ? color : "hsl(var(--muted-foreground))" }}
                    title={stopNumber ? undefined : "No address to place on the map"}
                  >
                    {stopNumber ?? "–"}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{event.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {event.startTime
                        ? `${formatDisplayTime(event.startTime)}${event.endTime ? ` – ${formatDisplayTime(event.endTime)}` : ""}`
                        : "All day"}
                    </p>
                    {event.address && (
                      <p className="truncate text-xs text-muted-foreground/80">{event.address}</p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOpen(event); }}
                    aria-label={`Open ${event.title}`}
                    className="mt-0.5 shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
