import jsPDF from "jspdf";
import { eachDayOfInterval, format } from "date-fns";
import thunderProLogo from "@/assets/thunder-pro-logo.png";
import { parseDbTimeOrTimestamp } from "../utils/parseDbDateTime";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimesheetEntry {
  date: string;
  clock_in_time: string | null;
  break_start_time: string | null;
  break_end_time: string | null;
  clock_out_time: string | null;
  total_hours: number | null;
}

export interface EmployeeTimesheetData {
  employeeName: string;
  position: string;
  dateRange: string;
  dateFrom: Date;
  dateTo: Date;
  entries: TimesheetEntry[];
  totalHours: number;
  hourlyRate: number;
  totalPay: number;
}

export interface GeneralTimesheetData {
  dateRange: string;
  employees: Array<{ name: string; totalHours: number; totalPay: number }>;
  grandTotalHours: number;
  grandTotalPay: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtTime(ts: string | null) {
  if (!ts) return "--";
  const d = parseDbTimeOrTimestamp(ts);
  if (!d) return "--";
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmtHours(h: number | null) {
  if (!h) return "00:00";
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// ─── Employee timesheet (returns Blob for browser download) ───────────────────

export function generateEmployeeTimesheetPDF(data: EmployeeTimesheetData): Blob {
  const doc = new jsPDF("portrait");
  const pw  = doc.internal.pageSize.getWidth();
  const ph  = doc.internal.pageSize.getHeight();
  const m   = 15;
  let y     = m;

  // Header — avatar + name + date range
  const initials = data.employeeName.split(" ").map((n) => n[0]).join("").toUpperCase();
  doc.setFillColor(158, 158, 158);
  doc.circle(m + 5, y + 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.text(initials, m + 5, y + 4.5, { align: "center" });

  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.text(data.employeeName, m + 10, y + 4);

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.dateRange, pw / 2, y + 4, { align: "center" });
  y += 12;

  // Metrics cards
  const cw  = (pw - m * 2 - 15) / 4;
  const ch  = 15;
  const gap = 5;
  const metrics = [
    { label: "Work Hours",  value: fmtHours(data.totalHours),              bg: [220, 252, 231] as [number,number,number], fg: [22, 163, 74]  as [number,number,number] },
    { label: "Hourly Rate", value: `$${data.hourlyRate.toFixed(2)}/hr`,    bg: [96, 165, 250]  as [number,number,number], fg: [255, 255, 255] as [number,number,number] },
    { label: "Overtime",    value: fmtHours(Math.max(0, data.totalHours - 40)), bg: [191, 219, 254] as [number,number,number], fg: [37, 99, 235]   as [number,number,number] },
    { label: "Total Pay",   value: `$${data.totalPay.toFixed(2)}`,         bg: [220, 252, 231] as [number,number,number], fg: [22, 163, 74]  as [number,number,number] },
  ];
  metrics.forEach(({ label, value, bg, fg }, i) => {
    const x = m + (cw + gap) * i;
    doc.setFillColor(...bg);
    doc.roundedRect(x, y, cw, ch, 2, 2, "F");
    doc.setFontSize(7);
    doc.setTextColor(...fg);
    doc.setFont("helvetica", "normal");
    doc.text(label, x + cw / 2, y + 5, { align: "center" });
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(value, x + cw / 2, y + 12, { align: "center" });
  });
  y += ch + 8;

  // Table
  const allDays    = eachDayOfInterval({ start: data.dateFrom, end: data.dateTo });
  const entryMap   = new Map<string, TimesheetEntry>();
  data.entries.forEach((e) => entryMap.set(e.date, e));

  const tw     = pw - m * 2;
  const rh     = 7;
  const cols   = { day: 24, clockIn: 24, startBreak: 26, endBreak: 24, clockOut: 24, totalHours: 26, totalPay: 24 };

  doc.setFillColor(245, 245, 245);
  doc.rect(m, y, tw, 8, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");

  let x = m + 5;
  doc.text("Day",          x, y + 5.5); x += cols.day;
  doc.text("Clock In",     x, y + 5.5); x += cols.clockIn;
  doc.text("Start Break",  x, y + 5.5); x += cols.startBreak;
  doc.text("End Break",    x, y + 5.5); x += cols.endBreak;
  doc.text("Clock Out",    x, y + 5.5); x += cols.clockOut;
  doc.text("Total Hours",  x, y + 5.5); x += cols.totalHours;
  doc.text("Total Pay",    x, y + 5.5);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  allDays.forEach((day, idx) => {
    const ds    = format(day, "yyyy-MM-dd");
    const entry = entryMap.get(ds);
    if (y > ph - m - 10) { doc.addPage(); y = m; }
    if (idx % 2 === 1) { doc.setFillColor(248, 250, 252); doc.rect(m, y, tw, rh, "F"); }
    doc.setTextColor(0, 0, 0);
    x = m + 5;
    doc.text(format(day, "EEE M/d"), x, y + 4.5); x += cols.day;
    if (entry) {
      doc.text(fmtTime(entry.clock_in_time),    x, y + 4.5); x += cols.clockIn;
      doc.text(fmtTime(entry.break_start_time), x, y + 4.5); x += cols.startBreak;
      doc.text(fmtTime(entry.break_end_time),   x, y + 4.5); x += cols.endBreak;
      doc.text(fmtTime(entry.clock_out_time),   x, y + 4.5); x += cols.clockOut;
      doc.text(entry.total_hours ? fmtHours(entry.total_hours) : "--", x, y + 4.5); x += cols.totalHours;
      const pay = entry.total_hours && data.hourlyRate
        ? `$${(entry.total_hours * data.hourlyRate).toFixed(2)}`
        : "--";
      doc.text(pay, x, y + 4.5);
    } else {
      for (let i = 0; i < 6; i++) {
        doc.text("--", x, y + 4.5);
        x += [cols.clockIn, cols.startBreak, cols.endBreak, cols.clockOut, cols.totalHours, cols.totalPay][i];
      }
    }
    y += rh;
  });

  // Footer
  const fy = ph - m - 12;
  doc.addImage(thunderProLogo, "PNG", (pw - 25) / 2, fy, 25, 6);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128, 128, 128);
  doc.text("Service provided by Thunder Pro Inc www.thunderpro.co", pw / 2, fy + 11, { align: "center" });

  return doc.output("blob");
}

// ─── General payroll summary (saves directly) ─────────────────────────────────

export function generateGeneralTimesheetPDF(data: GeneralTimesheetData): void {
  const doc = new jsPDF();
  const pw  = doc.internal.pageSize.getWidth();
  const ph  = doc.internal.pageSize.getHeight();
  const m   = 20;
  let y     = m;
  const lb  = [147, 197, 253] as [number, number, number];

  const bump = (space: number) => {
    y += space;
    if (y > ph - m) { doc.addPage(); y = m; }
  };

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("PAYROLL SUMMARY", pw / 2, y, { align: "center" });
  bump(10);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text(data.dateRange, pw / 2, y, { align: "center" });
  bump(15);

  // Header row
  doc.setFillColor(...lb);
  doc.rect(m, y, pw - m * 2, 10, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("Employee Name", m + 5, y + 7);
  doc.text("Total Hours", pw / 2, y + 7, { align: "center" });
  doc.text("Total Pay", pw - m - 5, y + 7, { align: "right" });
  y += 10;

  doc.setFont("helvetica", "normal");
  data.employees.forEach((emp, i) => {
    if (y > ph - m - 20) { doc.addPage(); y = m; }
    if (i % 2 === 0) { doc.setFillColor(245, 245, 245); doc.rect(m, y, pw - m * 2, 8, "F"); }
    doc.setTextColor(0, 0, 0);
    doc.text(emp.name, m + 5, y + 6);
    doc.text(emp.totalHours.toFixed(2), pw / 2, y + 6, { align: "center" });
    doc.text(`$${emp.totalPay.toFixed(2)}`, pw - m - 5, y + 6, { align: "right" });
    y += 8;
  });

  bump(5);
  doc.setDrawColor(...lb);
  doc.setLineWidth(1);
  doc.line(m, y, pw - m, y);
  bump(8);

  doc.setFillColor(...lb);
  doc.rect(m, y, pw - m * 2, 12, "F");
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("GRAND TOTAL", m + 5, y + 8);
  doc.text(`${data.grandTotalHours.toFixed(2)} hrs`, pw / 2, y + 8, { align: "center" });
  doc.text(`$${data.grandTotalPay.toFixed(2)}`, pw - m - 5, y + 8, { align: "right" });

  const fy = ph - m - 12;
  doc.addImage(thunderProLogo, "PNG", (pw - 25) / 2, fy, 25, 6);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128, 128, 128);
  doc.text("Service provided by Thunder Pro Inc www.thunderpro.co", pw / 2, fy + 11, { align: "center" });

  doc.save(`Payroll_Summary_${data.dateRange.replace(/\s+/g, "_")}.pdf`);
}
