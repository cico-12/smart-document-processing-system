"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LineItemsEditor } from "@/components/documents/LineItemsEditor";
import { ExtractedDocument, StoredDocument } from "@/types/document";

type DocumentFormProps = {
  document: StoredDocument;
};

export function DocumentForm({ document }: DocumentFormProps) {
  const router = useRouter();

  const [form, setForm] = useState<ExtractedDocument>({
    documentType: document.documentType,
    supplierName: document.supplierName ?? "",
    documentNumber: document.documentNumber ?? "",
    issueDate: document.issueDate ?? "",
    dueDate: document.dueDate ?? "",
    currency: document.currency ?? "",
    lineItems: document.lineItems ?? [],
    subtotal: document.subtotal,
    tax: document.tax,
    total: document.total,
  });

  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const updateField = <K extends keyof ExtractedDocument>(
    field: K,
    value: ExtractedDocument[K]
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const parseOptionalNumber = (value: string) => {
    if (value === "") {
      return undefined;
    }

    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const saveCorrections = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/documents/${document.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to save corrections.");
      }

      setMessage("Corrections saved. Validation was re-run.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to save corrections."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDocument = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/documents/${document.id}/confirm`, {
        method: "PATCH",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to confirm document.");
      }

      setMessage("Document confirmed as validated.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to confirm document."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const rejectDocument = async () => {
    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/documents/${document.id}/reject`, {
        method: "PATCH",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to reject document.");
      }

      setMessage("Document rejected.");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to reject document."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deleteDocument = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this document? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/documents/${document.id}/delete`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to delete document.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to delete document."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">Review and correct data</h2>

          <p className="mt-1 text-sm text-gray-500">
            Edit extracted values, save corrections, then confirm or reject the
            document.
          </p>
        </div>
      </div>

      {message ? (
        <p className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">
          {message}
        </p>
      ) : null}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="Document type">
          <Select
            value={form.documentType}
            onChange={(event) =>
              updateField(
                "documentType",
                event.target.value as ExtractedDocument["documentType"]
              )
            }
          >
            <option value="invoice">Invoice</option>
            <option value="purchase_order">Purchase order</option>
            <option value="unknown">Unknown</option>
          </Select>
        </Field>

        <Field label="Supplier / company">
          <Input
            value={form.supplierName ?? ""}
            onChange={(event) =>
              updateField("supplierName", event.target.value)
            }
          />
        </Field>

        <Field label="Document number">
          <Input
            value={form.documentNumber ?? ""}
            onChange={(event) =>
              updateField("documentNumber", event.target.value)
            }
          />
        </Field>

        <Field label="Currency">
          <Input
            value={form.currency ?? ""}
            onChange={(event) => updateField("currency", event.target.value)}
            placeholder="EUR, USD, BAM..."
          />
        </Field>

        <Field label="Issue date">
          <Input
            type="date"
            value={form.issueDate ?? ""}
            onChange={(event) => updateField("issueDate", event.target.value)}
          />
        </Field>

        <Field label="Due date">
          <Input
            type="date"
            value={form.dueDate ?? ""}
            onChange={(event) => updateField("dueDate", event.target.value)}
          />
        </Field>

        <Field label="Subtotal">
          <Input
            type="number"
            value={form.subtotal ?? ""}
            onChange={(event) =>
              updateField("subtotal", parseOptionalNumber(event.target.value))
            }
          />
        </Field>

        <Field label="Tax">
          <Input
            type="number"
            value={form.tax ?? ""}
            onChange={(event) =>
              updateField("tax", parseOptionalNumber(event.target.value))
            }
          />
        </Field>

        <Field label="Total">
          <Input
            type="number"
            value={form.total ?? ""}
            onChange={(event) =>
              updateField("total", parseOptionalNumber(event.target.value))
            }
          />
        </Field>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold">Line items</h3>

        <LineItemsEditor
          lineItems={form.lineItems}
          onChange={(lineItems) => updateField("lineItems", lineItems)}
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button type="button" onClick={saveCorrections} disabled={isSaving}>
          {isSaving ? "Saving..." : "Save corrections"}
        </Button>

        <Button
          type="button"
          variant="secondary"
          onClick={confirmDocument}
          disabled={isSaving}
        >
          Confirm as validated
        </Button>

        <Button
          type="button"
          variant="danger"
          onClick={rejectDocument}
          disabled={isSaving}
        >
          Reject
        </Button>

        <Button
          type="button"
          variant="danger"
          onClick={deleteDocument}
          disabled={isSaving}
        >
          Delete
        </Button>
      </div>
    </Card>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </span>

      {children}
    </label>
  );
}