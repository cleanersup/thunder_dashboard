/**
 * @module appointmentSteps.config
 * Step definitions for the appointment creation/edit wizard.
 */
import type { LucideIcon } from "lucide-react";
import {
  MapPin, User, Briefcase, CalendarDays, Users,
  DollarSign, FileText, MessageSquare, Eye, Send,
} from "lucide-react";

export interface StepConfig {
  key: string;
  icon: LucideIcon;
  label: string;
}

export const APPOINTMENT_STEPS: StepConfig[] = [
  { key: "route",        icon: MapPin,         label: "Route"        },
  { key: "client",       icon: User,           label: "Client"       },
  { key: "service",      icon: Briefcase,      label: "Service"      },
  { key: "schedule",     icon: CalendarDays,   label: "Schedule"     },
  { key: "employees",    icon: Users,          label: "Employees"    },
  { key: "deposit",      icon: DollarSign,     label: "Deposit"      },
  { key: "contract",     icon: FileText,       label: "Contract"     },
  { key: "instructions", icon: MessageSquare,  label: "Instructions" },
  { key: "preview",      icon: Eye,            label: "Preview"      },
  { key: "send",         icon: Send,           label: "Send"         },
];
