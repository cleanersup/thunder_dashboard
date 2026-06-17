import React from "react";
import {
  Clock, Calendar, CheckCircle, AlertCircle, XCircle, Play, List,
} from "lucide-react";
import type { JobStatus } from "../types/job.types";

export type JobStatusFilter = "All" | JobStatus;

export const JOB_STATUS_COLOR: Record<JobStatus, string> = {
  Draft:     "hsl(45 80% 45%)",
  Scheduled: "hsl(220 80% 55%)",
  Upcoming:  "hsl(210 80% 55%)",
  Today:     "hsl(var(--green-vibrant))",
  Ongoing:   "hsl(220 80% 55%)",
  Completed: "hsl(174 60% 38%)",
  Missed:    "hsl(var(--destructive))",
  Cancelled: "hsl(var(--muted-foreground))",
};

export const JOB_STATUS_BG: Record<JobStatus, string> = {
  Draft:     "hsl(45 80% 45% / 0.1)",
  Scheduled: "hsl(220 80% 55% / 0.1)",
  Upcoming:  "hsl(210 80% 55% / 0.1)",
  Today:     "hsl(var(--green-vibrant) / 0.1)",
  Ongoing:   "hsl(220 80% 55% / 0.1)",
  Completed: "hsl(174 60% 38% / 0.1)",
  Missed:    "hsl(var(--destructive) / 0.1)",
  Cancelled: "hsl(var(--muted-foreground) / 0.1)",
};

export const JOB_STATUS_BORDER: Record<JobStatus, string> = {
  Draft:     "hsl(45 80% 45% / 0.3)",
  Scheduled: "hsl(220 80% 55% / 0.3)",
  Upcoming:  "hsl(210 80% 55% / 0.3)",
  Today:     "hsl(var(--green-vibrant) / 0.3)",
  Ongoing:   "hsl(220 80% 55% / 0.3)",
  Completed: "hsl(174 60% 38% / 0.3)",
  Missed:    "hsl(var(--destructive) / 0.3)",
  Cancelled: "hsl(var(--muted-foreground) / 0.3)",
};

export const JOB_STATUS_BADGE: Record<JobStatus, string> = {
  Draft:     "bg-amber-50 text-amber-700 border-amber-200",
  Scheduled: "bg-blue-50 text-blue-700 border-blue-200",
  Upcoming:  "bg-sky-50 text-sky-700 border-sky-200",
  Today:     "bg-green-50 text-green-700 border-green-200",
  Ongoing:   "bg-blue-50 text-blue-700 border-blue-200",
  Completed: "bg-teal-50 text-teal-700 border-teal-200",
  Missed:    "bg-red-50 text-red-700 border-red-200",
  Cancelled: "bg-gray-50 text-gray-600 border-gray-200",
};

export const JOB_STATUS_ICON: Record<JobStatus, React.ReactNode> = {
  Draft:     <Clock className="w-3 h-3" />,
  Scheduled: <Calendar className="w-3 h-3" />,
  Upcoming:  <Calendar className="w-3 h-3" />,
  Today:     <Clock className="w-3 h-3" />,
  Ongoing:   <Play className="w-3 h-3" />,
  Completed: <CheckCircle className="w-3 h-3" />,
  Missed:    <AlertCircle className="w-3 h-3" />,
  Cancelled: <XCircle className="w-3 h-3" />,
};

export const JOB_STATUS_FILTER_OPTIONS: { value: JobStatusFilter; label: string; icon: React.ReactNode }[] = [
  { value: "All",       label: "All",       icon: <List className="w-3 h-3" /> },
  { value: "Draft",     label: "Draft",     icon: <Clock className="w-3 h-3" /> },
  { value: "Scheduled", label: "Scheduled", icon: <Calendar className="w-3 h-3" /> },
  { value: "Upcoming",  label: "Upcoming",  icon: <Calendar className="w-3 h-3" /> },
  { value: "Today",     label: "Today",     icon: <Clock className="w-3 h-3" /> },
  { value: "Completed", label: "Completed", icon: <CheckCircle className="w-3 h-3" /> },
  { value: "Missed",    label: "Missed",    icon: <AlertCircle className="w-3 h-3" /> },
  { value: "Cancelled", label: "Cancelled", icon: <XCircle className="w-3 h-3" /> },
];
