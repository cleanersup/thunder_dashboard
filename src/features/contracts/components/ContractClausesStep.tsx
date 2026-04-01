/**
 * @module ContractClausesStep
 * Step 2 of the contract wizard: drag-to-reorder clauses, AI generate, save as default, custom policies.
 */
import { useState, useEffect, useRef } from "react";
import {
  X, Plus, ClipboardList, FileSignature, DollarSign, Check,
  MapPin, Building2, Globe, Sparkles, Loader2, Save,
  GripVertical, FileText, Trash2, RotateCcw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button }   from "@/shared/components/ui/button";
import { Input }    from "@/shared/components/ui/input";
import { Label }    from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/shared/components/ui/alert-dialog";
import { cn }    from "@/shared/utils/cn";
import { toast } from "sonner";
import { DEFAULT_SECTIONS, CLAUSE_PROFILE_MAP, MANUAL_ONLY_KEYS } from "../config/contracts.config";
import { useContractClauses } from "../hooks/useContractClauses";
import type { ContractFormData, ContractClause } from "../types/contract.types";

// ─── Section icon map ─────────────────────────────────────────────────────────

const SECTION_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  scope_of_work:        ClipboardList,
  purpose_of_agreement: FileSignature,
  price_and_payment:    DollarSign,
  cancellation_policy:  X,
  no_refund:            X,
  non_compete:          Globe,
  anti_harassment:      Check,
  liability_insurance:  Building2,
  confidentiality:      MapPin,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ContractClausesStepProps {
  formData:  ContractFormData;
  onChange:  (partial: Partial<ContractFormData>) => void;
  /** Profile data needed for AI generation (companyName) and clause initialization. */
  profile:   Record<string, unknown> | null;
  onBack:    () => void;
  onNext:    () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContractClausesStep({
  formData,
  onChange,
  profile,
  onBack,
  onNext,
}: ContractClausesStepProps) {
  const { generateClause, saveClause, generatingKey, savingKey } = useContractClauses();

  // ── Clause initialization (runs once when sections are empty) ─────────────
  const initialized = useRef(false);
  const [savedClauseKeys, setSavedClauseKeys] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialized.current || !profile || formData.sections.length > 0) return;
    initialized.current = true;
    const saved: Record<string, string> = {};
    const clauses: ContractClause[] = DEFAULT_SECTIONS.map((s, i) => {
      const profileCol = CLAUSE_PROFILE_MAP[s.key];
      const val = profileCol ? ((profile[profileCol] as string) ?? "") : "";
      if (val) saved[s.key] = val;
      return { key: s.key, title: s.title, body: val, enabled: true, order: i };
    });
    const rawCustom = profile.custom_clauses as Array<{ key: string; title: string; content: string }> | null;
    if (Array.isArray(rawCustom)) {
      for (const c of rawCustom) {
        saved[c.key] = c.content;
        clauses.push({ key: c.key, title: c.title, body: c.content, enabled: true, order: clauses.length });
      }
    }
    setSavedClauseKeys(saved);
    onChange({ sections: clauses });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  // When editing, seed savedClauseKeys from the loaded sections (run once)
  const editSeedDone = useRef(false);
  useEffect(() => {
    if (editSeedDone.current || formData.sections.length === 0) return;
    editSeedDone.current = true;
    const saved: Record<string, string> = {};
    for (const s of formData.sections) {
      if (s.body?.trim()) saved[s.key] = s.body;
    }
    setSavedClauseKeys(saved);
  }, [formData.sections]);

  // ── Clause editing state ──────────────────────────────────────────────────
  const [clauseErrors,    setClauseErrors]    = useState<Set<string>>(new Set());
  const [showAddPolicy,   setShowAddPolicy]   = useState(false);
  const [newPolicyTitle,  setNewPolicyTitle]  = useState("");
  const [newPolicyDesc,   setNewPolicyDesc]   = useState("");
  const [deleteClauseKey, setDeleteClauseKey] = useState<string | null>(null);

  // ── Drag-to-reorder ───────────────────────────────────────────────────────
  const dragItem     = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  const handleDragStart = (idx: number) => { dragItem.current = idx; setDraggingIdx(idx); };
  const handleDragEnter = (idx: number) => { dragOverItem.current = idx; };
  const handleDragEnd   = () => {
    if (dragItem.current === null || dragOverItem.current === null) { setDraggingIdx(null); return; }
    const arr = [...formData.sections];
    const [moved] = arr.splice(dragItem.current, 1);
    arr.splice(dragOverItem.current, 0, moved);
    onChange({ sections: arr.map((c, i) => ({ ...c, order: i })) });
    dragItem.current = null; dragOverItem.current = null; setDraggingIdx(null);
  };

  // ── Clause helpers ────────────────────────────────────────────────────────

  const updateClause = (key: string, body: string) => {
    onChange({ sections: formData.sections.map((c) => c.key === key ? { ...c, body } : c) });
    setClauseErrors((prev) => { const n = new Set(prev); n.delete(key); return n; });
  };

  const clauseHasUnsavedChanges = (key: string) => {
    const current = formData.sections.find((c) => c.key === key)?.body?.trim() ?? "";
    const saved   = savedClauseKeys[key]?.trim() ?? "";
    return !!current && current !== saved;
  };

  const handleGenerate = async (key: string, title: string) => {
    const companyName = (profile?.company_name as string) ?? "";
    const generated = await generateClause(key, title, companyName);
    if (generated) updateClause(key, generated);
  };

  const handleSaveClause = async (key: string, title: string) => {
    const clause = formData.sections.find((c) => c.key === key);
    if (!clause) return;
    await saveClause(key, title, clause.body, formData.sections);
    if (key.startsWith("custom_")) {
      const newSaved = { ...savedClauseKeys };
      for (const c of formData.sections.filter((s) => s.key.startsWith("custom_"))) {
        newSaved[c.key] = c.body;
      }
      setSavedClauseKeys(newSaved);
    } else {
      setSavedClauseKeys((prev) => ({ ...prev, [key]: clause.body }));
    }
  };

  const handleAddCustomPolicy = () => {
    if (!newPolicyTitle.trim()) { toast.error("Please enter a policy title"); return; }
    const key = `custom_${Date.now()}`;
    const newClause: ContractClause = {
      key, title: newPolicyTitle.trim(), body: newPolicyDesc.trim(),
      enabled: true, order: formData.sections.length,
    };
    onChange({ sections: [...formData.sections, newClause] });
    setNewPolicyTitle(""); setNewPolicyDesc("");
    setShowAddPolicy(false);
    toast.success("Custom policy added");
  };

  const handleDeleteClause = (key: string) => {
    onChange({ sections: formData.sections.filter((c) => c.key !== key) });
    toast.success("Policy removed");
  };

  const validateStep = (): boolean => {
    const errs = new Set<string>();
    for (const c of formData.sections) { if (!c.body?.trim()) errs.add(c.key); }
    setClauseErrors(errs);
    if (errs.size > 0) { toast.error("Please complete all highlighted sections"); return false; }
    return true;
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {formData.sections.map((clause, idx) => {
        const isCustom = clause.key.startsWith("custom_");
        const isManual = MANUAL_ONLY_KEYS.has(clause.key);
        const Icon     = SECTION_ICON[clause.key] ?? (isCustom ? FileText : ClipboardList);
        const hasError = clauseErrors.has(clause.key);
        const unsaved  = clauseHasUnsavedChanges(clause.key);
        const sec      = DEFAULT_SECTIONS.find((s) => s.key === clause.key);
        const placeholder = sec?.placeholder ?? `Describe ${clause.title}...`;

        return (
          <Card
            key={clause.key}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragEnter={() => handleDragEnter(idx)}
            onDragEnd={handleDragEnd}
            onDragOver={(e) => e.preventDefault()}
            className={cn(
              "rounded-lg border transition-opacity",
              hasError && "ring-1 ring-inset ring-destructive",
              draggingIdx === idx && "opacity-50",
            )}
          >
            <CardHeader className="px-6 py-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2 min-w-0">
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{clause.title}</span>
                  {isCustom && (
                    <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-normal flex-shrink-0">
                      Custom
                    </span>
                  )}
                </CardTitle>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost" size="sm"
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => setDeleteClauseKey(clause.key)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                  <GripVertical className="w-4 h-4 text-muted-foreground cursor-grab active:cursor-grabbing" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="px-6 pb-4 pt-0 space-y-2">
              <Textarea
                value={clause.body}
                onChange={(e) => updateClause(clause.key, e.target.value)}
                placeholder={placeholder}
                className="min-h-[100px] resize-y"
              />
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  {!isManual && (
                    <Button
                      variant="outline" size="sm"
                      className="h-7 text-xs gap-1"
                      disabled={generatingKey !== null}
                      onClick={() => handleGenerate(clause.key, clause.title)}
                    >
                      {generatingKey === clause.key
                        ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                        : <><Sparkles className="w-3 h-3" /> Auto Generate</>}
                    </Button>
                  )}
                  {savedClauseKeys[clause.key] && (
                    <Button
                      variant="outline" size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => updateClause(clause.key, savedClauseKeys[clause.key])}
                    >
                      <RotateCcw className="w-3 h-3" /> Use Default
                    </Button>
                  )}
                </div>
                {clause.body?.trim() && (
                  <div className="flex items-center gap-1.5">
                    {unsaved && (
                      <Button
                        variant="outline" size="sm"
                        className="h-7 text-xs gap-1 border-primary text-primary hover:bg-primary/10"
                        disabled={savingKey !== null}
                        onClick={() => handleSaveClause(clause.key, clause.title)}
                      >
                        {savingKey === clause.key
                          ? <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>
                          : <><Save className="w-3 h-3" /> Save as Default</>}
                      </Button>
                    )}
                    <Button
                      variant="ghost" size="sm"
                      className="h-7 text-xs gap-1 text-muted-foreground"
                      onClick={() => updateClause(clause.key, "")}
                    >
                      <X className="w-3 h-3" /> Clear
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Add Custom Policy */}
      <Card className="rounded-lg border">
        <CardContent className="px-6 py-4">
          <Button
            variant="outline"
            className="w-full border-dashed gap-2"
            onClick={() => setShowAddPolicy(true)}
          >
            <Plus className="w-4 h-4" /> Add Custom Policy
          </Button>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="flex-shrink-0 bg-white rounded-lg border p-4 flex items-center justify-between gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>Back</Button>
        <Button size="sm" onClick={() => { if (validateStep()) onNext(); }}>Next</Button>
      </div>

      {/* Add Custom Policy dialog */}
      <Dialog open={showAddPolicy} onOpenChange={setShowAddPolicy}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4" /> Add Custom Policy
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Policy Title</Label>
              <Input
                value={newPolicyTitle}
                onChange={(e) => setNewPolicyTitle(e.target.value)}
                placeholder="e.g. Property Damage Policy"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Description (optional)</Label>
              <Textarea
                value={newPolicyDesc}
                onChange={(e) => setNewPolicyDesc(e.target.value)}
                placeholder="Write the content of this policy..."
                className="min-h-[120px] resize-y"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowAddPolicy(false); setNewPolicyTitle(""); setNewPolicyDesc(""); }}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomPolicy}>Add Policy</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete clause confirm */}
      <AlertDialog open={!!deleteClauseKey} onOpenChange={(o) => { if (!o) setDeleteClauseKey(null); }}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Policy?</AlertDialogTitle>
            <AlertDialogDescription>This policy will be removed from the contract.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => { if (deleteClauseKey) { handleDeleteClause(deleteClauseKey); setDeleteClauseKey(null); } }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
