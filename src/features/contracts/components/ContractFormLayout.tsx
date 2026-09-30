/**
 * @module ContractFormLayout
 * Marco del formulario de contrato: cabecera fija y cuerpo con scroll.
 *
 * Ya no hay barra de pasos: el formulario es un hub, se ve entero de una vez y
 * cada sección se edita en su modal. Mantener el indicador de progreso sobre un
 * hub prometía un recorrido que no existe.
 */
import type { ReactNode } from "react";
import { ChevronLeft, X, FileSignature } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface ContractFormLayoutProps {
  isEditing?: boolean;
  /** When true, uses flex h-full (fits inside FullScreenModal). */
  isModal?: boolean;
  /** Called when the back/X button in the header is pressed. */
  onExit: () => void;
  children: ReactNode;
}

export function ContractFormLayout({
  isEditing,
  isModal,
  onExit,
  children,
}: ContractFormLayoutProps) {
  const title = isEditing ? "Edit Contract" : "New Contract";

  // ── Modal layout (matches Invoice/Estimate modal header) ───────────────────
  if (isModal) {
    return (
      <div className="h-full flex flex-col bg-background">
        {/* Header — same structure as CreateInvoicePage modal */}
        <div className="flex-shrink-0 border-b bg-card">
          <div className="max-w-2xl mx-auto">
            <div className="px-4 py-3 flex items-center justify-between gap-4">
              <div className="w-1/6" />
              <div className="w-4/6 text-center">
                <h1 className="font-semibold text-base leading-tight flex items-center justify-center gap-2">
                  {title}
                </h1>
              </div>
              <div className="flex items-center w-1/6 justify-end">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onExit}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Scrollable content */}
          <div className="max-w-2xl mx-auto px-4 space-y-4">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // ── Page layout ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="sticky top-0 z-20 flex-shrink-0 border-b bg-card">
        <div className="max-w-2xl mx-auto">
          <div className="px-4 py-3 flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onExit}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <h1 className="flex-1 text-base font-semibold flex items-center gap-2">
              <FileSignature className="w-4 h-4" />
              {title}
            </h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center">
        <div className="w-full max-w-2xl px-4 py-6 space-y-1">
          {children}
        </div>
      </div>
    </div>
  );
}
