import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Users, Cake, UserCheck, UserX, Plus, Search,
  MoreHorizontal, Edit, Download, Trash2, CheckCircle, XCircle,
} from "lucide-react";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";
import { Badge } from "@/shared/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/shared/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/shared/components/ui/alert-dialog";
import { LoadingSpinner } from "@/shared/components/common/LoadingSpinner";
import { useAllEmployees, useUpdateEmployeeStatus, useDeleteEmployee } from "../hooks/useEmployees";
import { EmployeeForm } from "../components/EmployeeForm";
import { EmployeeDetailsModal } from "../components/EmployeeDetailsModal";
import { generateEmployeeSheetPDF } from "../services/generateEmployeeSheetPDF";
import { formatPhoneDisplay, isPhoneValid } from "@/shared/utils/phoneInput";
import { useProfile } from "@/shared/hooks/useProfile";
import type { Employee } from "../services/employeesService";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(first: string, last: string) {
  return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase();
}

function statusBadgeClass(status: string) {
  if (status === "active")   return "bg-success-subtle text-success-subtle-foreground border-success-subtle-border";
  if (status === "inactive") return "bg-destructive/10 text-destructive border-destructive/30";
  return "bg-warning-subtle text-warning-subtle-foreground border-warning-subtle-border";
}

function getBirthdayToday(employees: Employee[]): string {
  const today = format(new Date(), "MM-dd");
  const match = employees.find((e) => {
    if (!e.birthday) return false;
    const [, mm, dd] = e.birthday.split("-");
    return `${mm}-${dd}` === today;
  });
  return match ? `${match.first_name} ${match.last_name}` : "None";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmployeesPage() {
  const { data: employees = [], isLoading, refetch } = useAllEmployees();
  const { data: profile } = useProfile();
  const updateStatus = useUpdateEmployeeStatus();
  const deleteEmployee = useDeleteEmployee();

  const [search, setSearch]                         = useState("");
  const [tab, setTab]                               = useState("all");
  const [addOpen, setAddOpen]                       = useState(false);
  const [selectedEmployee, setSelectedEmployee]     = useState<Employee | null>(null);
  const [detailOpen, setDetailOpen]                 = useState(false);
  const [editEmployee, setEditEmployee]             = useState<Employee | null>(null);
  const [editOpen, setEditOpen]                     = useState(false);
  const [deleteTarget, setDeleteTarget]             = useState<Employee | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen]   = useState(false);

  // ── KPI ────────────────────────────────────────────────────────────────────
  const total        = employees.length;
  const active       = employees.filter((e) => e.status === "active").length;
  const inactive     = employees.filter((e) => e.status === "inactive").length;
  const birthdayName = useMemo(() => getBirthdayToday(employees), [employees]);

  const kpiCards = [
    { title: "Total Employees", value: total.toString(),    subtitle: "Current employees", icon: Users,      borderColor: "hsl(var(--primary))" },
    { title: "Birthday Today",  value: birthdayName,        subtitle: "celebrating today", icon: Cake,       borderColor: "hsl(var(--green-vibrant))" },
    { title: "Active",          value: active.toString(),   subtitle: "active employees",  icon: UserCheck,  borderColor: "hsl(var(--green-vibrant))" },
    { title: "Inactive",        value: inactive.toString(), subtitle: "inactive employees",icon: UserX,      borderColor: "hsl(var(--orange-vibrant))" },
  ];

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const name = `${e.first_name} ${e.last_name}`.toLowerCase();
      const matchSearch = name.includes(search.toLowerCase());
      const matchTab =
        tab === "all" ||
        (tab === "men"   && e.gender === "male") ||
        (tab === "women" && e.gender === "female");
      return matchSearch && matchTab;
    });
  }, [employees, search, tab]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function openDetail(emp: Employee) {
    setSelectedEmployee(emp);
    setDetailOpen(true);
  }

  function openEdit(emp: Employee) {
    setEditEmployee(emp);
    setEditOpen(true);
  }

  function handleDownloadPDF(emp: Employee) {
    generateEmployeeSheetPDF({
      companyLogo:    profile?.company_logo   ?? undefined,
      companyName:    profile?.company_name   ?? "",
      companyPhone:   profile?.company_phone  ?? "",
      companyEmail:   profile?.company_email  ?? "",
      companyAddress: profile?.company_address ?? "",
      companyCity:    profile?.company_city   ?? "",
      companyState:   profile?.company_state  ?? "",
      companyZip:     profile?.company_zip    ?? "",
      firstName:      emp.first_name,
      lastName:       emp.last_name,
      email:          emp.email     ?? undefined,
      phone:          emp.phone     ?? undefined,
      birthday:       emp.birthday  ?? undefined,
      gender:         emp.gender    ?? "",
      position:       emp.position  ?? "",
      hourlyRate:     emp.hourly_rate ?? undefined,
      status:         emp.status,
      street:         emp.street    ?? undefined,
      aptSuite:       emp.apt_suite ?? undefined,
      city:           emp.city      ?? undefined,
      state:          emp.state     ?? undefined,
      zip:            emp.zip       ?? undefined,
      availability:   emp.available_days as Record<string, { AM: boolean; PM: boolean; NIGHT: boolean }> | undefined,
      additionalNotes: emp.additional_notes ?? undefined,
    });
  }

  function confirmDelete(emp: Employee) {
    setDeleteTarget(emp);
    setDeleteConfirmOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    await deleteEmployee.mutateAsync(deleteTarget.id);
    setDeleteConfirmOpen(false);
    setDeleteTarget(null);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-full bg-background p-2.5 space-y-2.5">

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {kpiCards.map((card) => (
              <div key={card.title} className="border-l-4 pl-4" style={{ borderLeftColor: card.borderColor }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{card.title}</p>
                    <p className="text-2xl font-bold mt-1 truncate" style={{ color: card.borderColor }}>{card.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{card.subtitle}</p>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary/50">
                    <card.icon className="w-5 h-5" style={{ color: card.borderColor }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* ── Toolbar ────────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: gender tabs */}
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="men">Men</TabsTrigger>
                <TabsTrigger value="women">Women</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Right: search + Add */}
            <div className="flex items-center gap-2">
              <div className="relative w-52">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search employees"
                  className="pl-9 h-9 bg-white"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button className="h-9" onClick={() => setAddOpen(true)}>
                <Plus className="w-4 h-4 mr-1" /> Add Employee
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <Card className="border border-border/50 shadow-none rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-bold">Employee</TableHead>
              <TableHead className="font-bold">Position</TableHead>
              <TableHead className="font-bold">Email</TableHead>
              <TableHead className="font-bold">Phone</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="py-8">
                  <div className="flex justify-center">
                    <LoadingSpinner />
                  </div>
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {employees.length === 0 ? "No employees yet. Add your first employee." : "No employees found."}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((employee) => (
                <TableRow
                  key={employee.id}
                  className="cursor-pointer hover:bg-muted/50 border-b border-border/50"
                  onClick={() => openDetail(employee)}
                >
                  {/* Employee name + avatar */}
                  <TableCell className="py-2 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="flex-shrink-0">
                        {employee.avatar_url && (
                          <AvatarImage
                            src={employee.avatar_url}
                            alt={`${employee.first_name} ${employee.last_name}`}
                          />
                        )}
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                          {getInitials(employee.first_name, employee.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium text-sm">
                        {employee.first_name} {employee.last_name}
                      </span>
                    </div>
                  </TableCell>

                  {/* Position */}
                  <TableCell className="py-2 px-4 text-sm text-muted-foreground capitalize">
                    {employee.position || "—"}
                  </TableCell>

                  {/* Email */}
                  <TableCell className="py-2 px-4 text-sm text-muted-foreground">
                    {employee.email || "—"}
                  </TableCell>

                  {/* Phone */}
                  <TableCell className="py-2 px-4 text-sm">
                    <span className={isPhoneValid(employee.phone) ? "text-muted-foreground" : "text-destructive"}>
                      {formatPhoneDisplay(employee.phone) || "—"}
                    </span>
                  </TableCell>

                  {/* Status badge */}
                  <TableCell className="py-2 px-4">
                    <Badge variant="outline" className={`font-medium text-[13px] ${statusBadgeClass(employee.status)}`}>
                      {employee.status}
                    </Badge>
                  </TableCell>

                  {/* Actions */}
                  <TableCell className="text-right py-2 px-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(employee); }}>
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDownloadPDF(employee); }}>
                          <Download className="w-4 h-4 mr-2" /> Download PDF
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {employee.status === "active" ? (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: employee.id, status: "inactive" }); }}>
                            <XCircle className="w-4 h-4 mr-2 text-warning" /> Mark Inactive
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); updateStatus.mutate({ id: employee.id, status: "active" }); }}>
                            <CheckCircle className="w-4 h-4 mr-2 text-success" /> Mark Active
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={(e) => { e.stopPropagation(); confirmDelete(employee); }}
                        >
                          <Trash2 className="w-4 h-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>

      {/* ── Add Employee modal ─────────────────────────────────────────────── */}
      <EmployeeForm
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => refetch()}
      />

      {/* ── Edit Employee modal ────────────────────────────────────────────── */}
      <EmployeeForm
        open={editOpen}
        employeeId={editEmployee?.id}
        onClose={() => { setEditOpen(false); setEditEmployee(null); }}
        onCreated={() => refetch()}
      />

      {/* ── Employee Detail modal ──────────────────────────────────────────── */}
      <EmployeeDetailsModal
        employee={selectedEmployee}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEmployeeUpdated={() => refetch()}
      />

      {/* ── Delete confirmation ────────────────────────────────────────────── */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.first_name} {deleteTarget?.last_name}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteTarget(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
