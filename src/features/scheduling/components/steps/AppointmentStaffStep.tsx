import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { QK } from "@/shared/config/queryKeys";
import { Check, Users } from "lucide-react";
import { EntityPickerField } from "@/shared/components/common/EntityPickerField";
import type { EntityOption } from "@/shared/components/common/EntityPickerField";
import { EmployeeForm } from "@/features/employees/components/EmployeeForm";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

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
  isLoading: boolean;
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculateTotalHours(startTime: string, endTime: string): number | null {
  if (!startTime || !endTime) return null;
  const [startH, startM] = startTime.split(":").map(Number);
  const [endH,   endM]   = endTime.split(":").map(Number);
  const diff = (endH * 60 + endM) - (startH * 60 + startM);
  return diff > 0 ? diff / 60 : null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AppointmentStaffStep({
  employees,
  selected,
  scheduledTime,
  endTime,
  onToggle,
  isLoading,
  error,
}: Props) {
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);

  const options: EntityOption[] = employees.map((e) => ({
    id: e.id,
    label: `${e.first_name} ${e.last_name}`,
  }));

  const selectedOptions: EntityOption[] = options.filter((o) => selected.includes(o.id));

  function handleSelectionChange(next: EntityOption[]) {
    const nextIds    = new Set(next.map((o) => o.id));
    const currentIds = new Set(selected);
    [...nextIds].filter((id) => !currentIds.has(id)).forEach(onToggle);
    [...currentIds].filter((id) => !nextIds.has(id)).forEach(onToggle);
  }

  const assignedEmployees = employees.filter((e) => selected.includes(e.id));

  // ─── Labor cost ────────────────────────────────────────────────────────────

  const totalHours = calculateTotalHours(scheduledTime, endTime ?? "");

  const laborCost = totalHours !== null && assignedEmployees.length > 0
    ? assignedEmployees.reduce((sum, emp) => {
        if (!emp.hourly_rate) return sum;
        return sum + totalHours * emp.hourly_rate;
      }, 0)
    : null;

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
          <EntityPickerField
          multiple
          options={options}
          selected={selectedOptions}
          onChange={handleSelectionChange}
          onCreateNew={() => setShowCreate(true)}
          createNewLabel="Add New Employee"
          placeholder="Select employees"
          emptyMessage="No employee found."
          isLoading={isLoading}
        />

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

      {/* Create employee modal */}
      <EmployeeForm
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(emp) => {
          onToggle(emp.id);
          qc.invalidateQueries({ queryKey: QK.employeesForAppointment });
          setShowCreate(false);
        }}
      />
    </div>
  );
}
