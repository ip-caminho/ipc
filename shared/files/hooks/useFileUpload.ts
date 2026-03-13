"use client";

import { useState } from "react";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useFileUpload() {
  const getUploadUrl = useAction(api.files.upload.getUploadUrl);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  async function upload(
    file: File,
    folder: string,
    entityId: string
  ): Promise<string> {
    setIsUploading(true);
    setProgress(10);

    try {
      const { uploadUrl, publicUrl } = await getUploadUrl({
        folder,
        entityId,
        mimeType: file.type,
        fileName: file.name,
      });

      setProgress(30);

      const response = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
          "Cache-Control": "public, max-age=31536000",
        },
        body: file,
      });

      if (!response.ok) {
        throw new Error(`Upload falhou: ${response.status}`);
      }

      setProgress(100);
      return publicUrl;
    } finally {
      setIsUploading(false);
      setProgress(0);
    }
  }

  return { upload, isUploading, progress };
}
