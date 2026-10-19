"use client";

import { useState, useCallback, useRef } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useFileUpload } from "../hooks/useFileUpload";
import { Button } from "@/shared/components/ui/button";
import { Avatar, AvatarFallback } from "@/shared/components/ui/avatar";
import { PrivateAvatarImage } from "@/shared/files/components/PrivateImage";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogBody,
  ResponsiveDialogFooter,
} from "@/shared/components/ui/responsive-dialog";
import { Slider } from "@/shared/components/ui/slider";
import { Camera, Trash2, ZoomIn } from "lucide-react";

interface PhotoUploadProps {
  folder: string;
  entityId: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  fallback?: string;
}

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  const size = Math.min(pixelCrop.width, pixelCrop.height);
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d")!;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    size,
    size,
    0,
    0,
    512,
    512
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Falha ao gerar imagem"))),
      "image/jpeg",
      0.8
    );
  });
}

export function PhotoUpload({ folder, entityId, value, onChange, fallback }: PhotoUploadProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { upload } = useFileUpload();

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setDialogOpen(true);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be selected again
    e.target.value = "";
  }, []);

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const blob = await getCroppedImg(imageSrc, croppedAreaPixels);
      const file = new File([blob], "foto.jpg", { type: "image/jpeg" });
      const url = await upload(file, folder, entityId);
      onChange(url);
      setDialogOpen(false);
      setImageSrc(null);
    } catch {
      // Error handled by upload hook
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = () => {
    onChange(null);
  };

  return (
    <>
      <div className="flex items-center gap-4">
        <button
          type="button"
          className="relative group shrink-0 rounded-full cursor-pointer"
          onClick={() => inputRef.current?.click()}
          aria-label={value ? "Trocar foto" : "Adicionar foto"}
        >
          <Avatar className="h-20 w-20">
            {value && <PrivateAvatarImage src={value} />}
            <AvatarFallback className="text-2xl">{fallback?.charAt(0)?.toUpperCase() || "?"}</AvatarFallback>
          </Avatar>
          <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
            <Camera className="h-5 w-5 text-white" />
          </span>
          <span className="absolute -bottom-0.5 -right-0.5 flex size-7 items-center justify-center rounded-full border bg-background shadow-sm md:hidden">
            <Camera className="h-4 w-4 text-foreground" />
          </span>
        </button>
        <div className="space-y-1">
          <Button type="button" variant="outline" size="sm" className="h-11 md:h-8" onClick={() => inputRef.current?.click()}>
            {value ? "Trocar foto" : "Adicionar foto"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" className="h-11 md:h-8 text-destructive" onClick={handleRemove}>
              <Trash2 className="h-3 w-3 mr-1" />
              Remover
            </Button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileSelect}
      />

      <ResponsiveDialog open={dialogOpen} onOpenChange={(open) => { if (!saving) setDialogOpen(open); }}>
        <ResponsiveDialogContent className="sm:max-w-md">
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Ajustar foto</ResponsiveDialogTitle>
          </ResponsiveDialogHeader>

          <ResponsiveDialogBody className="space-y-4">
            <div className="relative w-full aspect-square bg-muted rounded-md overflow-hidden">
              {imageSrc && (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              )}
            </div>

            <div className="flex items-center gap-3 px-1">
              <ZoomIn className="h-4 w-4 text-muted-foreground shrink-0" />
              <Slider
                min={1}
                max={3}
                step={0.05}
                value={[zoom]}
                onValueChange={([v]) => setZoom(v)}
                className="flex-1"
              />
            </div>
          </ResponsiveDialogBody>

          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>
    </>
  );
}
