import { Upload, FileText, X, ExternalLink, Download, Trash2 } from "lucide-react";
import { cn } from "@/shared/utils/cn";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

interface Props {
  contractFile: File | null;
  existingContractUrl?: string | null;
  existingContractPath?: string | null;
  clientName?: string | null;
  onChange: (file: File | null) => void;
  onDownload?: (path: string, filename: string) => void;
  onRemoveExisting?: () => void;
}

const ACCEPTED = ".pdf,.doc,.docx,.txt";
const ACCEPTED_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const MAX_MB = 10;

export function AppointmentContractStep({
  contractFile,
  existingContractUrl,
  existingContractPath,
  clientName,
  onChange,
  onDownload,
  onRemoveExisting,
}: Props) {
  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!ACCEPTED_MIME.includes(file.type)) return;
    if (file.size > MAX_MB * 1024 * 1024) return;
    onChange(file);
  }

  const fileSizeKB = contractFile ? (contractFile.size / 1024).toFixed(1) : null;
  const hasContract = contractFile || existingContractUrl;

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <FileText className="h-5 w-5 text-muted-foreground" />
            Upload Contract or Estimate
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Optional: Attach a contract or estimate document for the client
          </p>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Existing contract (edit mode) */}
          {existingContractUrl && !contractFile && (
            <div className="border rounded-lg p-4 bg-muted/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="h-8 w-8 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">Existing contract attached</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <a
                      href={existingContractUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View file <ExternalLink className="h-3 w-3" />
                    </a>
                    {existingContractPath && onDownload && (
                      <button
                        type="button"
                        onClick={() => {
                          const name = (clientName ?? "contract").replace(/\s+/g, "_");
                          const ext = existingContractPath.split(".").pop() ?? "pdf";
                          const filename = `${name}_contract.${ext}`;
                          onDownload(existingContractPath, filename);
                        }}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </button>
                    )}
                  </div>
                </div>
              </div>
              {onRemoveExisting && (
                <button
                  type="button"
                  onClick={onRemoveExisting}
                  className="shrink-0 p-2 text-muted-foreground hover:text-destructive transition-colors"
                  title="Remove document"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          )}

          <div
            className={cn(
              "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
              contractFile
                ? "border-primary/40 bg-primary/5"
                : "border-border hover:border-primary/50 hover:bg-muted/30 cursor-pointer",
            )}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
          >
            {contractFile ? (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-8 w-8 shrink-0 text-primary" />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {contractFile.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{fileSizeKB} KB</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onChange(null); }}
                  className="shrink-0 text-muted-foreground hover:text-destructive transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <label htmlFor="contract-upload" className="cursor-pointer">
                <input
                  id="contract-upload"
                  type="file"
                  className="hidden"
                  accept={ACCEPTED}
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <div className="flex flex-col items-center gap-3">
                  <Upload className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">Click to upload file</p>
                  <p className="text-xs text-muted-foreground">
                    PDF, DOC, DOCX, or TXT (Max 10MB)
                  </p>
                </div>
              </label>
            )}
          </div>

          {!hasContract && (
            <p className="text-xs text-center text-muted-foreground">
              You can skip this step if you don't have a document to attach
            </p>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
