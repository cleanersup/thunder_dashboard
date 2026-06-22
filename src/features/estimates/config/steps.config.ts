/**
 * @module steps.config
 * Step definitions for estimate creation forms.
 * Add/remove steps here without touching page logic.
 */
import type { LucideIcon } from "lucide-react";
import {
  User, Briefcase, Home, Sparkles, Package, PawPrint,
  Shirt, ClipboardList, Calculator, Eye, Send, Building2,
  FileText, Users,
} from "lucide-react";

export interface StepConfig {
  /** Machine key (used for aria labels / debugging) */
  key: string;
  icon: LucideIcon;
  label: string;
}

// ─── Residential (11 steps) ───────────────────────────────────────────────────

export const RESIDENTIAL_STEPS: StepConfig[] = [
  { key: "client",             icon: User,          label: "Client"              },
  { key: "service",            icon: Briefcase,     label: "Service"             },
  { key: "project",            icon: Home,          label: "Project"             },
  { key: "additional",         icon: Sparkles,      label: "Additional"          },
  { key: "labor",              icon: Package,       label: "Labor"               },
  { key: "pets",               icon: PawPrint,      label: "Pets"                },
  { key: "laundry",            icon: Shirt,         label: "Laundry"             },
  { key: "specialInstruction", icon: ClipboardList, label: "Special Instruction" },
  { key: "summary",            icon: Calculator,    label: "Summary"             },
  { key: "preview",            icon: Eye,           label: "Preview"             },
  { key: "send",               icon: Send,          label: "Send"                },
];

// ─── Commercial (8 steps) ─────────────────────────────────────────────────────

export const COMMERCIAL_STEPS: StepConfig[] = [
  { key: "client",   icon: User,          label: "Client"   },
  { key: "property", icon: Building2,     label: "Property" },
  { key: "details",  icon: FileText,      label: "Details"  },
  { key: "main",     icon: Users,         label: "Main"     },
  { key: "scope",    icon: ClipboardList, label: "Scope"    },
  { key: "summary",  icon: Calculator,    label: "Summary"  },
  { key: "preview",  icon: Eye,           label: "Preview"  },
  { key: "send",     icon: Send,          label: "Send"     },
];
