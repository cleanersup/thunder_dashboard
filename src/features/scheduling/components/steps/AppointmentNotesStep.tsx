import { useRef } from "react";
import { Upload, X, MessageSquare, ImageIcon, Download, Trash2 } from "lucide-react";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card";

interface Props {
  notes: string | null;
  photos: File[];
  existingPhotoUrls?: string[];
  existingPhotoPaths?: string[];
  clientName?: string | null;
  onChange: (notes: string | null) => void;
  onPhotosChange: (photos: File[]) => void;
  onDownloadPhoto?: (path: string, filename: string) => void;
  onRemoveExistingPhoto?: (path: string) => void;
}

export function AppointmentNotesStep({
  notes,
  photos,
  existingPhotoUrls = [],
  existingPhotoPaths = [],
  clientName,
  onChange,
  onPhotosChange,
  onDownloadPhoto,
  onRemoveExistingPhoto,
}: Props) {
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
    <div className="space-y-4">

      {/* ── Instructions for Team ────────────────────────────────── */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            Instructions for Team
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Add any special instructions or requirements for the team
          </p>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {/* ── Upload Photos ────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
            Upload Photos
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Attach reference photos for the team
          </p>
        </CardHeader>
        <CardContent className="space-y-4">

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

          {/* Existing photos (edit mode) */}
          {existingPhotoUrls.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                {photos.length > 0 ? "Previously uploaded photos" : "Uploaded photos"}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {existingPhotoUrls.map((url, index) => {
                  const path = existingPhotoPaths[index];
                  const name = (clientName ?? "photo").replace(/\s+/g, "_");
                  const ext = path?.split(".").pop() ?? "jpg";
                  const filename = `${name}_photo_${index + 1}.${ext}`;
                  return (
                    <div key={`existing-${index}`} className="relative group">
                      <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                        <img
                          src={url}
                          alt={`Existing photo ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {path && onDownloadPhoto && (
                          <Button
                            type="button"
                            variant="secondary"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onDownloadPhoto(path, filename)}
                            title="Download"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {path && onRemoveExistingPhoto && (
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => onRemoveExistingPhoto(path)}
                            title="Remove"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 truncate">Photo {index + 1}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* New photo uploads */}
          {photos.length > 0 && (
            <div className="space-y-2">
              {existingPhotoUrls.length > 0 && <p className="text-xs text-muted-foreground">New photos to add</p>}
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
            </div>
          )}

        </CardContent>
      </Card>

    </div>
  );
}
