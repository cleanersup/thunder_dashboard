import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Info, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import {
  FormSheet, FloatingInput, SelectField, DateField, TextareaField, OptionGrid,
} from "@/shared/components/forms";
import { useProfile } from "@/shared/hooks/useProfile";
import { useRequestForms, useSaveRequestForms } from "../hooks/useRequests";
import type { CustomQuestion, ServiceType } from "../types/request.types";

const ADDITIONAL_SERVICES = [
  "Kitchen", "Oven", "Refrigerator", "Living Room", "Dining Room",
  "Patio", "Garage", "Pets", "Laundry", "Windows",
];

const COMMERCIAL_TYPES = [
  "School", "Church", "Office", "Warehouse", "Restaurant", "Other",
];

const SERVICE_TYPE_OPTIONS = [
  { value: "residential", label: "Residential" },
  { value: "commercial",  label: "Commercial" },
];

const TIME_PREFERENCE_PREVIEW = [
  { value: "am", label: "AM" },
  { value: "pm", label: "PM" },
];

/**
 * Campo de la vista previa.
 *
 * Es lo que verá el cliente, así que usa la misma molécula que el formulario
 * público. Guarda lo que se teclee en su propio estado y no lo manda a ningún
 * sitio: aquí solo se está mirando cómo queda el formulario, no rellenándolo.
 */
function PreviewField({ id, label, type }: { id: string; label: string; type?: "text" | "email" }) {
  const [value, setValue] = useState("");
  return <FloatingInput id={id} label={label} type={type} value={value} onChange={setValue} />;
}

/**
 * Pregunta añadida por el dueño, dentro de la vista previa.
 *
 * La papelera va fuera del campo, no encima: borrarla es una acción del dueño,
 * y el cliente que rellene el formulario no verá nada de esto. Dentro del campo
 * se leería como parte del formulario.
 */
function CustomQuestionRow({
  question, onRemove,
}: { question: CustomQuestion; onRemove: (id: string) => void }) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex-1">
        <PreviewField id={question.id} label={question.question} />
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={`Remove "${question.question}"`}
        onClick={() => onRemove(question.id)}
        className="h-12 w-10 shrink-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

export function EditRequestFormPage() {
  const navigate  = useNavigate();
  const { data: profile }  = useProfile();
  const { data: formData = [], isLoading } = useRequestForms();
  const { mutate: save, isPending }        = useSaveRequestForms();

  const [questions, setQuestions]           = useState<CustomQuestion[]>([]);
  const [serviceType, setServiceType]       = useState<ServiceType | "">("");
  const [selectedDate, setSelectedDate]     = useState<Date | undefined>(undefined);
  const [commercialType, setCommercialType] = useState("");
  const [timePreference, setTimePreference] = useState("");
  const [additionalServices, setAdditionalServices] = useState<string[]>([]);

  const [isAddQuestionOpen, setIsAddQuestionOpen] = useState(false);
  const [newQuestion, setNewQuestion]             = useState("");
  const [questionFormType, setQuestionFormType]   = useState<ServiceType | "">("");

  useEffect(() => {
    if (formData.length > 0) {
      const all = formData.flatMap((f) =>
        Array.isArray(f.custom_questions)
          ? (f.custom_questions as unknown as CustomQuestion[])
          : []
      );
      setQuestions(all);
    }
  }, [formData]);

  const handleAddQuestion = () => {
    if (!newQuestion.trim() || !questionFormType) return;
    setQuestions((prev) => [
      ...prev,
      { id: crypto.randomUUID(), question: newQuestion.trim(), formType: questionFormType as ServiceType },
    ]);
    setNewQuestion("");
    setQuestionFormType("");
    setIsAddQuestionOpen(false);
  };

  const removeQuestion = (id: string) =>
    setQuestions((prev) => prev.filter((q) => q.id !== id));

  const companyName = profile?.company_name ?? "Your Company";
  const companyLogo = profile?.company_logo;

  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-muted">
      <div className="max-w-3xl mx-auto">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="bg-sidebar px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate("/requests")}
            className="p-2 -ml-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Edit Request Form</h1>
          <div className="w-10" />
        </div>

        <div className="space-y-[5px] pt-[5px]">

          {/* ── Info Banner ────────────────────────────────────────── */}
          <div className="px-4 py-3 bg-info-subtle">
            <h3 className="text-sm font-semibold text-primary mb-1 flex items-center gap-2">
              <Info className="w-4 h-4" />
              Client Request Form Preview
            </h3>
            <p className="text-xs text-primary/80">
              This is what your clients will see when submitting a request. Add questions below to customize your form.
            </p>
          </div>

          {/* ── Company Logo & Name ─────────────────────────────────── */}
          <Card className="rounded-none border-0">
            <CardContent className="p-6 flex flex-col items-center justify-center">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-3 overflow-hidden">
                {companyLogo ? (
                  <img src={companyLogo} alt="Company Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl font-bold text-primary">{companyName.charAt(0)}</span>
                )}
              </div>
              <h2 className="text-xl font-bold text-center">{companyName}</h2>
            </CardContent>
          </Card>

          {/* ── Personal Information ────────────────────────────────── */}
          <Card className="rounded-none border-0">
            <CardContent className="p-4 space-y-6">
              <h3 className="text-base font-semibold">Personal Information</h3>
              <div className="space-y-6">
                <PreviewField id="fullName" label="Full Name" />
                <PreviewField id="email" label="Email" type="email" />
                <PreviewField id="phone" label="Phone" />
              </div>
            </CardContent>
          </Card>

          {/* ── Address ─────────────────────────────────────────────── */}
          <Card className="rounded-none border-0">
            <CardContent className="p-4 space-y-6">
              <h3 className="text-base font-semibold">Address</h3>
              <div className="space-y-6">
                <PreviewField id="street" label="Street" />
                <div className="grid grid-cols-2 gap-3">
                  <PreviewField id="apt" label="Apt/Suite" />
                  <PreviewField id="city" label="City" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <PreviewField id="state" label="State" />
                  <PreviewField id="zip" label="Zip Code" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Preferred Date & Time / Service Type ────────────────── */}
          <Card className="rounded-none border-0">
            <CardContent className="p-4 space-y-6">
              <h3 className="text-base font-semibold">Preferred Cleaning Date & Time</h3>
              <div className="space-y-6">
                <DateField
                  placeholder="Select Preferred Date"
                  value={selectedDate}
                  onChange={setSelectedDate}
                />

                <SelectField
                  placeholder="Time Preference"
                  value={timePreference}
                  onChange={setTimePreference}
                  options={TIME_PREFERENCE_PREVIEW}
                />

                <SelectField
                  placeholder="Service Type"
                  value={serviceType}
                  onChange={(v) => setServiceType(v as ServiceType)}
                  options={SERVICE_TYPE_OPTIONS}
                />
              </div>
            </CardContent>
          </Card>

          {/* ── Residential Section ─────────────────────────────────── */}
          {serviceType === "residential" && (
            <Card className="rounded-none border-0">
              <CardContent className="p-4 space-y-6">
                <h3 className="text-base font-semibold">Residential Service Details</h3>
                <div className="space-y-6">
                  <PreviewField id="bedrooms" label="How many bedrooms" />
                  <PreviewField id="bathrooms" label="How many bathrooms" />

                  <OptionGrid
                    label="Additional Services"
                    multiple
                    options={ADDITIONAL_SERVICES}
                    value={additionalServices}
                    onChange={setAdditionalServices}
                  />

                  <TextareaField
                    id="preview-details"
                    label="Service Details"
                    placeholder="Service details..."
                    value=""
                    onChange={() => {}}
                  />

                  {questions.filter((q) => q.formType === "residential").map((q) => (
                    <CustomQuestionRow key={q.id} question={q} onRemove={removeQuestion} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Commercial Section ──────────────────────────────────── */}
          {serviceType === "commercial" && (
            <Card className="rounded-none border-0">
              <CardContent className="p-4 space-y-6">
                <h3 className="text-base font-semibold">Select the property type</h3>
                <div className="space-y-6">
                  <OptionGrid
                    options={COMMERCIAL_TYPES}
                    value={commercialType}
                    onChange={setCommercialType}
                  />

                  <TextareaField
                    id="preview-details"
                    label="Service Details"
                    placeholder="Service details..."
                    value=""
                    onChange={() => {}}
                  />

                  {questions.filter((q) => q.formType === "commercial").map((q) => (
                    <CustomQuestionRow key={q.id} question={q} onRemove={removeQuestion} />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Action Buttons ──────────────────────────────────────── */}
          <Card className="rounded-none border-0">
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant="outline"
                  className="h-12 rounded-md"
                  onClick={() => setIsAddQuestionOpen(true)}
                >
                  Add New Question
                </Button>
                <Button
                  className="h-12 rounded-md"
                  onClick={() => save(questions)}
                  disabled={isPending}
                >
                  {isPending ? "Saving..." : "Save Form"}
                </Button>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>

      {/* ── Alta de pregunta ─────────────────────────────────────────── */}
      <FormSheet
        open={isAddQuestionOpen}
        onClose={() => setIsAddQuestionOpen(false)}
        title="Add New Question"
        subtitle="It will show up in the form your clients fill in"
        submitLabel="Add Question"
        onSubmit={handleAddQuestion}
        submitDisabled={!newQuestion.trim() || !questionFormType}
      >
        <FloatingInput
          id="newQ"
          label="Question"
          required
          value={newQuestion}
          onChange={setNewQuestion}
        />
        <SelectField
          placeholder="Add to Form"
          required
          value={questionFormType}
          onChange={(v) => setQuestionFormType(v as ServiceType)}
          options={SERVICE_TYPE_OPTIONS}
        />
      </FormSheet>
    </div>
  );
}
