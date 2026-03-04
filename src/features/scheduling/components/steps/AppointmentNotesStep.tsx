import { useRef } from "react";
import { Upload, X } from "lucide-react";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";

interface Props {
  notes: string | null;
  photos: File[];
  onChange: (notes: string | null) => void;
  onPhotosChange: (photos: File[]) => void;
}

export function AppointmentNotesStep({ notes, photos, onChange, onPhotosChange }: Props) {
  const photoInputRef = useRef<HTMLInputElement>(null);

  function handlePhotoUpload(files: FileList | null) {
    if (!files) return;
    const newPhotos = Array.from(files).filter((f) => f.type.startsWith("image/"));
    onPhotosChange([...photos, ...newPhotos]);
  }

  function removePhoto(index: number) {
    onPhotosChange(photos.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-6">

      {/* ── Instructions for Team ────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Instructions for Team</h2>

        <div className="space-y-2">
          <Label htmlFor="instructions">Instructions</Label>
          <Textarea
            id="instructions"
            placeholder="Enter any special instructions, requirements, or notes for the team..."
            value={notes ?? ""}
            onChange={(e) => onChange(e.target.value || null)}
            rows={6}
            className="resize-none"
          />
        </div>
      </div>

      <hr className="border-border" />

      {/* ── Upload Photos ────────────────────────────────────────── */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Upload Photos</h2>

        {/* Drop zone */}
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
          <label htmlFor="photo-upload" className="cursor-pointer">
            <input
              ref={photoInputRef}
              id="photo-upload"
              type="file"
              className="hidden"
              accept="image/*"
              multiple
              onChange={(e) => handlePhotoUpload(e.target.files)}
            />
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
                <Upload className="h-6 w-6 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Click to upload photos
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, JPEG, or WEBP
                </p>
              </div>
            </div>
          </label>
        </div>

        {/* Photo grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {photos.map((photo, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img
                    src={URL.createObjectURL(photo)}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => removePhoto(index)}
                  className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </Button>
                <p className="text-xs text-muted-foreground mt-1 truncate">{photo.name}</p>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
