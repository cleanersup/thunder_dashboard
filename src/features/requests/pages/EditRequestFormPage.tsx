import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Info, Trash2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Calendar } from "@/shared/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/shared/components/ui/dialog";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/shared/utils/cn";
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

function FloatingInput({ id, label, type = "text" }: { id: string; label: string; type?: string }) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={type}
        placeholder=" "
        className="h-12 rounded-md border border-border focus-visible:ring-0 focus-visible:border-primary px-3 bg-white peer"
      />
      <Label
        htmlFor={id}
        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground bg-white px-1 transition-all pointer-events-none peer-focus:top-0 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs peer-[:not(:placeholder-shown)]:text-primary"
      >
        {label}
      </Label>
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

  const toggleService = (s: string) =>
    setAdditionalServices((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );

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
                <FloatingInput id="fullName" label="Full Name" />
                <FloatingInput id="email"    label="Email" type="email" />
                <FloatingInput id="phone"    label="Phone" />
              </div>
            </CardContent>
          </Card>

          {/* ── Address ─────────────────────────────────────────────── */}
          <Card className="rounded-none border-0">
            <CardContent className="p-4 space-y-6">
              <h3 className="text-base font-semibold">Address</h3>
              <div className="space-y-6">
                <FloatingInput id="street" label="Street" />
                <div className="grid grid-cols-2 gap-3">
                  <FloatingInput id="apt"  label="Apt/Suite" />
                  <FloatingInput id="city" label="City" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <FloatingInput id="state" label="State" />
                  <FloatingInput id="zip"   label="Zip Code" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Preferred Date & Time / Service Type ────────────────── */}
          <Card className="rounded-none border-0">
            <CardContent className="p-4 space-y-6">
              <h3 className="text-base font-semibold">Preferred Cleaning Date & Time</h3>
              <div className="space-y-6">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-12 justify-start text-left font-normal rounded-md bg-white hover:bg-primary/10 hover:text-primary hover:border-primary",
                        !selectedDate && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : "Select Preferred Date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>

                <Select>
                  <SelectTrigger className="h-12 rounded-md border border-border bg-white">
                    <SelectValue placeholder="Time Preference" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="am">AM</SelectItem>
                    <SelectItem value="pm">PM</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={serviceType} onValueChange={(v) => setServiceType(v as ServiceType)}>
                  <SelectTrigger className="h-12 rounded-md border border-border bg-white">
                    <SelectValue placeholder="Service Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="residential">Residential</SelectItem>
                    <SelectItem value="commercial">Commercial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* ── Residential Section ─────────────────────────────────── */}
          {serviceType === "residential" && (
            <Card className="rounded-none border-0">
              <CardContent className="p-4 space-y-6">
                <h3 className="text-base font-semibold">Residential Service Details</h3>
                <div className="space-y-6">
                  <FloatingInput id="bedrooms"  label="How many bedrooms" type="text" />
                  <FloatingInput id="bathrooms" label="How many bathrooms" type="text" />

                  <div>
                    <Label className="text-sm font-medium mb-3 block">Additional Services</Label>
                    <div className="grid grid-cols-2 gap-3">
                      {ADDITIONAL_SERVICES.map((s) => (
                        <div
                          key={s}
                          onClick={() => toggleService(s)}
                          className={cn(
                            "flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all",
                            additionalServices.includes(s)
                              ? "border-primary bg-primary/10 text-primary font-medium"
                              : "border-border bg-white hover:border-primary/50",
                          )}
                        >
                          <span className="text-sm">{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Service Details</Label>
                    <Textarea
                      placeholder="Service details..."
                      className="min-h-[100px] rounded-md border border-border bg-white"
                    />
                  </div>

                  {questions.filter((q) => q.formType === "residential").map((q) => (
                    <div key={q.id} className="relative">
                      <Input
                        id={q.id}
                        placeholder=" "
                        className="h-12 rounded-md border border-border px-3 bg-white pr-10 peer"
                      />
                      <Label
                        htmlFor={q.id}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground bg-white px-1 transition-all pointer-events-none peer-focus:top-0 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs"
                      >
                        {q.question}
                      </Label>
                      <button
                        onClick={() => removeQuestion(q.id)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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
                  <div className="grid grid-cols-2 gap-3">
                    {COMMERCIAL_TYPES.map((t) => (
                      <div
                        key={t}
                        onClick={() => setCommercialType(t)}
                        className={cn(
                          "flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-all",
                          commercialType === t
                            ? "border-primary bg-primary/10 text-primary font-medium"
                            : "border-border bg-white hover:border-primary/50",
                        )}
                      >
                        <span className="text-sm">{t}</span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <Label className="text-sm font-medium mb-2 block">Service Details</Label>
                    <Textarea
                      placeholder="Service details..."
                      className="min-h-[100px] rounded-md border border-border bg-white"
                    />
                  </div>

                  {questions.filter((q) => q.formType === "commercial").map((q) => (
                    <div key={q.id} className="relative">
                      <Input
                        id={q.id}
                        placeholder=" "
                        className="h-12 rounded-md border border-border px-3 bg-white pr-10 peer"
                      />
                      <Label
                        htmlFor={q.id}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground bg-white px-1 transition-all pointer-events-none peer-focus:top-0 peer-focus:text-xs peer-focus:text-primary peer-[:not(:placeholder-shown)]:top-0 peer-[:not(:placeholder-shown)]:text-xs"
                      >
                        {q.question}
                      </Label>
                      <button
                        onClick={() => removeQuestion(q.id)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
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

      {/* ── Add Question Dialog ──────────────────────────────────────── */}
      <Dialog open={isAddQuestionOpen} onOpenChange={setIsAddQuestionOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Add New Question</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newQ" className="text-sm font-medium">Question</Label>
              <Input
                id="newQ"
                placeholder="Enter your question"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddQuestion()}
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qFormType" className="text-sm font-medium">Add to Form</Label>
              <Select value={questionFormType} onValueChange={(v) => setQuestionFormType(v as ServiceType)}>
                <SelectTrigger id="qFormType" className="h-12">
                  <SelectValue placeholder="Select form type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <div className="grid grid-cols-2 gap-3 w-full">
              <Button variant="outline" className="h-12" onClick={() => setIsAddQuestionOpen(false)}>
                Cancel
              </Button>
              <Button
                className="h-12"
                onClick={handleAddQuestion}
                disabled={!newQuestion.trim() || !questionFormType}
              >
                Add Question
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
