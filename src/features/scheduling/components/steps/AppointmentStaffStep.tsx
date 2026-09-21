import { Check, Users } from "lucide-react";
import { EmployeeSelect } from "@/shared/components/common/EmployeeSelect";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";
import { calculateTotalHours, calculateLaborCost } from "../../utils/appointmentHelpers";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  position: string | null;
  hourly_rate: number | null;
}

interface Props {
  employees: Employee[];
  selected: string[];
  scheduledTime: string;
  endTime: string | null | undefined;
  onToggle: (id: string) => void;
  error?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppointmentStaffStep({
  employees,
  selected,
  scheduledTime,
  endTime,
  onToggle,
  error,
}: Props) {
  // El padre dueña la selección con un toggle por id: traducimos la lista nueva a
  // los toggles que hacen falta para no cambiar su API.
  function handleSelectionChange(nextIds: string[]) {
    const next    = new Set(nextIds);
    const current = new Set(selected);
    [...next].filter((id) => !current.has(id)).forEach(onToggle);
    [...current].filter((id) => !next.has(id)).forEach(onToggle);
  }

  const assignedEmployees = employees.filter((e) => selected.includes(e.id));

  // ─── Labor cost ────────────────────────────────────────────────────────────

  const totalHours = calculateTotalHours(scheduledTime, endTime);
  const laborCost  = calculateLaborCost(assignedEmployees, totalHours);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Select employees
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">Choose one or more employees for this service</p>
        </CardHeader>
        <CardContent>
          <EmployeeSelect value={selected} onChange={handleSelectionChange} />

        {/* Selected employees summary card */}
      {assignedEmployees.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3 dark:bg-blue-950/30 dark:border-blue-800">
          <p className="text-sm font-medium text-foreground">
            {assignedEmployees.length} employee{assignedEmployees.length > 1 ? "s" : ""} selected
          </p>
          <div className="space-y-2">
            {assignedEmployees.map((emp) => (
              <div key={emp.id} className="flex items-center gap-2 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium">{emp.first_name} {emp.last_name}</span>
                {emp.position && (
                  <span className="text-muted-foreground">— {emp.position}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

        {error && (
          <p className="text-sm text-destructive font-medium">{error}</p>
        )}
        </CardContent>
      </Card>



      {/* Total Labor Cost card — shown when times are set and at least one employee has an hourly rate */}
      {laborCost !== null && laborCost > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between dark:bg-green-950/30 dark:border-green-800">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              Total Labor Cost
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Full labor expense for this project
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-green-700 dark:text-green-400">
              ${laborCost.toFixed(2)}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
