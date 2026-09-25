import { useRef, useState, type ReactNode } from "react";
import { X, FileText, Image as ImageIcon, Upload, Loader2 } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent } from "@/shared/components/ui/dialog";

/**
 * Un adjunto ya guardado. Cada feature tiene su propio tipo en la base
 * (`BookingAttachmentMeta`, `InvoiceAttachment`…); todos coinciden en lo que hace
 * falta para pintarlo, así que el llamador adapta el suyo a esta forma.
 */
export interface AttachmentItem {
  /** Clave estable de la lista. */
  id:   string;
  name: string;
  url:  string;
  /** MIME. Decide si se muestra como miniatura o como fila de archivo. */
  type?: string;
}

export interface AttachmentsFieldProps {
  /** Adjuntos ya subidos. */
  existing:         AttachmentItem[];
  onRemoveExisting: (index: number) => void;
  /** Archivos elegidos en esta sesión, aún sin subir. */
  files:            File[];
  onAddFiles:       (files: File[]) => void;
  onRemoveFile:     (index: number) => void;
  /** Tipos aceptados por el input de archivo. */
  accept?:          string;
  /** Tope de archivos. Al alcanzarlo se deshabilita el botón de subir. */
  max?:             number;
  disabled?:        boolean;
  /**
   * El llamador está procesando lo recién elegido — comprimiendo imágenes, por
   * ejemplo. Bloquea el botón y avisa, porque `onAddFiles` puede ser asíncrono.
   */
  busy?:            boolean;
  busyLabel?:       string;
  uploadLabel?:     string;
  /** Línea de ayuda bajo el botón: límites de tamaño, formatos aceptados… */
  hint?:            ReactNode;
}

const isImage = (type?: string) => !!type?.startsWith("image/");

/**
 * Lista de adjuntos: los ya guardados y los recién elegidos, con su botón de
 * subida y su contador.
 *
 * Existe porque cada formulario se la escribía por su cuenta y no se parecían
 * entre sí: uno pintaba miniaturas y otro una lista de texto. Las imágenes se ven
 * como miniatura (y se abren en grande al pulsarlas) porque de una foto lo que
 * importa es qué muestra, no cómo se llama el archivo; lo demás va como fila con
 * el ícono de su tipo. Lo pendiente de subir se marca con borde punteado, para
 * que se distinga de lo que ya está guardado.
 */
export function AttachmentsField({
  existing,
  onRemoveExisting,
  files,
  onAddFiles,
  onRemoveFile,
  accept = "image/*,.pdf",
  max,
  disabled = false,
  busy = false,
  busyLabel = "Processing...",
  uploadLabel = "Add Photos or Files",
  hint,
}: AttachmentsFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const total   = existing.length + files.length;
  const isFull  = max !== undefined && total >= max;
  const isEmpty = total === 0;

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="hidden"
        onChange={(e) => {
          const picked = Array.from(e.target.files ?? []);
          const room = max === undefined ? picked : picked.slice(0, Math.max(0, max - total));
          if (room.length > 0) onAddFiles(room);
          e.target.value = "";
        }}
      />

      {existing.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {existing.map((att, idx) =>
            isImage(att.type) ? (
              <div key={att.id} className="relative rounded-md overflow-hidden border border-border aspect-square bg-muted">
                <img
                  src={att.url}
                  alt={att.name}
                  className="w-full h-full object-cover cursor-pointer"
                  onClick={() => setLightboxUrl(att.url)}
                />
                <button
                  type="button"
                  onClick={() => onRemoveExisting(idx)}
                  className="absolute top-1 right-1 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <a
                key={att.id}
                href={att.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-2 rounded-md border border-border bg-background"
              >
                <FileText className="h-4 w-4 text-destructive shrink-0" />
                <span className="truncate text-xs flex-1">{att.name}</span>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); onRemoveExisting(idx); }}
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </a>
            )
          )}
        </div>
      )}

      {files.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {files.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="flex items-center gap-2 p-2 rounded-md border border-dashed border-primary/40 bg-primary/5"
            >
              {isImage(file.type)
                ? <ImageIcon className="h-4 w-4 text-blue-500 shrink-0" />
                : <FileText  className="h-4 w-4 text-destructive shrink-0" />}
              <span className="truncate text-xs flex-1">{file.name}</span>
              <button
                type="button"
                onClick={() => onRemoveFile(idx)}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {isEmpty && (
        <p className="text-xs text-muted-foreground">No files attached yet.</p>
      )}

      <Button
        type="button"
        variant="field"
        className="w-full h-12"
        onClick={() => inputRef.current?.click()}
        disabled={disabled || busy || isFull}
      >
        {busy
          ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{busyLabel}</>
          : <><Upload className="mr-2 h-4 w-4" />{uploadLabel}</>}
      </Button>

      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}

      {/* Ver una foto en grande sin salir del formulario. */}
      <Dialog open={!!lightboxUrl} onOpenChange={(o) => !o && setLightboxUrl(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden">
          {lightboxUrl && <img src={lightboxUrl} alt="" className="w-full h-auto" />}
        </DialogContent>
      </Dialog>
    </>
  );
}
