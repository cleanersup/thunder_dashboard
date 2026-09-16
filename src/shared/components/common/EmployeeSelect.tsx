/**
 * @module EmployeeSelect
 * Selector canónico de empleados — el gemelo de [ClientSelect] para la cuadrilla.
 *
 * Usa el mismo `SearchableSelect` en modo múltiple, así que buscar un empleado se ve
 * y se opera igual que buscar un cliente. No construir pickers de empleados a mano.
 *
 * Usage:
 *   <EmployeeSelect value={employeeIds} onChange={setEmployeeIds} />
 */
import { useState } from "react";
import { SearchableSelect } from "@/shared/components/ui/searchable-select";
import { EmployeeForm } from "@/features/employees/components/EmployeeForm";
import { useAllEmployees } from "@/features/employees/hooks/useEmployees";

export interface EmployeeSelectProps {
  /** IDs seleccionados. */
  value: string[];
  onChange: (ids: string[]) => void;
  error?: boolean;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
}

export function EmployeeSelect({
  value,
  onChange,
  error = false,
  disabled = false,
  required = false,
  placeholder = "Select employees",
}: EmployeeSelectProps) {
  const [showNew, setShowNew] = useState(false);
  const { data: employees = [], isLoading } = useAllEmployees();

  // Solo se puede asignar personal activo — pero un empleado ya asignado que luego se
  // dio de baja sigue en la lista, o al editar un registro viejo desaparecería sin aviso.
  const selectable = employees.filter(
    (e) => e.status === "active" || value.includes(e.id),
  );

  const options = selectable.map((e) => {
    const name = `${e.first_name} ${e.last_name}`.trim();
    const inactive = e.status !== "active";
    return {
      value:      e.id,
      label:      inactive ? `${name} (inactive)` : name,
      subtitle:   e.position || undefined,
      searchText: `${name} ${e.position ?? ""} ${e.email ?? ""}`,
    };
  });

  return (
    <>
      <SearchableSelect
        multiple
        value={value}
        onValueChange={onChange}
        options={options}
        placeholder={placeholder}
        title="Select Employees"
        searchPlaceholder="Search by name or position..."
        emptyMessage={isLoading ? "Loading employees..." : "No employees found"}
        error={error}
        disabled={disabled}
        required={required}
        onAddNew={() => setShowNew(true)}
        addNewLabel="Add New Employee"
      />
      <EmployeeForm
        open={showNew}
        onClose={() => setShowNew(false)}
        onCreated={(employee) => onChange([...value, employee.id])}
      />
    </>
  );
}
