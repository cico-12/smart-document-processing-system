"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function UploadBox() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) {
      setMessage("Please select a file first.");
      return;
    }

    setIsUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Upload failed.");
      }

      router.push(`/documents/${result.document.id}`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <label className="block text-sm font-medium text-gray-700">
        Select document
      </label>

      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.csv,.txt"
        className="mt-3 block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null);
          setMessage(null);
        }}
      />

      {file ? (
        <p className="mt-3 text-sm text-gray-600">
          Selected: <span className="font-medium">{file.name}</span>
        </p>
      ) : null}

      {message ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleUpload}
        disabled={isUploading}
        className="mt-5 rounded-lg bg-gray-950 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isUploading ? "Processing..." : "Upload and process"}
      </button>

      <p className="mt-4 text-xs text-gray-500">
        Supported formats: PDF, PNG, JPG, JPEG, CSV, TXT.
      </p>
    </div>
  );
}