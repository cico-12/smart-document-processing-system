"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DocumentStatus, StoredDocument } from "@/types/document";

type DocumentsTableProps = {
  documents: StoredDocument[];
};

type StatusFilter = "all" | DocumentStatus;

type SortKey = "createdAt" | "status" | "issues";

const statusOrder: Record<DocumentStatus, number> = {
  needs_review: 1,
  uploaded: 2,
  validated: 3,
  rejected: 4,
};

export function DocumentsTable({ documents }: DocumentsTableProps) {
  const router = useRouter();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const visibleDocuments = useMemo(() => {
    const filtered =
      statusFilter === "all"
        ? documents
        : documents.filter((document) => document.status === statusFilter);

    return [...filtered].sort((a, b) => {
      if (sortKey === "status") {
        return statusOrder[a.status] - statusOrder[b.status];
      }

      if (sortKey === "issues") {
        return b.validationIssues.length - a.validationIssues.length;
      }

      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [documents, statusFilter, sortKey]);

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this document? This cannot be undone."
    );

    if (!confirmed) {
      return;
    }

    setDeletingId(id);

    try {
      const response = await fetch(`/api/documents/${id}/delete`, {
        method: "POST",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to delete document.");
      }

      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete document.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-gray-200 p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Processed documents</h2>

          <p className="text-sm text-gray-500">
            Showing {visibleDocuments.length} of {documents.length} documents.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <label className="text-sm">
            <span className="mb-1 block text-gray-500">Filter by status</span>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="all">All statuses</option>
              <option value="needs_review">Needs Review</option>
              <option value="validated">Validated</option>
              <option value="rejected">Rejected</option>
              <option value="uploaded">Uploaded</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block text-gray-500">Sort by</span>

            <select
              value={sortKey}
              onChange={(event) => setSortKey(event.target.value as SortKey)}
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="createdAt">Newest first</option>
              <option value="status">Status priority</option>
              <option value="issues">Most issues</option>
            </select>
          </label>
        </div>
      </div>

      {visibleDocuments.length ? (
        <table className="w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[32%]" />
            <col className="w-[22%]" />
            <col className="w-[12%]" />
            <col className="w-[14%]" />
            <col className="w-[8%]" />
            <col className="w-[12%]" />
          </colgroup>

          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Document</th>
              <th className="px-4 py-3 font-medium">Reference</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Issues</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200">
            {visibleDocuments.map((document) => (
              <tr key={document.id} className="hover:bg-gray-50">
                <td className="px-4 py-4 align-top">
                  <p
                    className="truncate font-medium"
                    title={document.originalFileName}
                  >
                    {document.originalFileName}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {formatDocumentType(document.documentType)} ·{" "}
                    {formatDate(document.createdAt)}
                  </p>
                </td>

                <td className="px-4 py-4 align-top">
                  <p className="truncate font-medium">
                    {document.documentNumber ?? "No number"}
                  </p>

                  <p
                    className="mt-1 truncate text-xs text-gray-500"
                    title={document.supplierName ?? ""}
                  >
                    {document.supplierName ?? "No supplier"}
                  </p>
                </td>

                <td className="px-4 py-4 align-top">
                  <p className="font-medium">{formatMoney(document.total)}</p>

                  <p className="mt-1 text-xs text-gray-500">
                    {document.currency ?? "—"}
                  </p>
                </td>

                <td className="px-4 py-4 align-top">
                  <StatusBadge status={document.status} />
                </td>

                <td className="px-4 py-4 align-top">
                  <span
                    className={
                      document.validationIssues.length > 0
                        ? "font-semibold text-red-600"
                        : "font-semibold text-green-700"
                    }
                  >
                    {document.validationIssues.length}
                  </span>
                </td>

                <td className="px-4 py-4 align-top">
                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/documents/${document.id}`}
                      className="rounded-lg border border-gray-300 px-3 py-2 text-center text-xs font-medium hover:bg-gray-100"
                    >
                      Review
                    </Link>

                    <button
                      type="button"
                      onClick={() => handleDelete(document.id)}
                      disabled={deletingId === document.id}
                      className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === document.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="p-8 text-center">
          <p className="font-medium">No documents found.</p>

          <p className="mt-1 text-sm text-gray-500">
            Upload a document first or change the selected filter.
          </p>
        </div>
      )}
    </section>
  );
}

function formatMoney(value?: number | null) {
  if (typeof value !== "number") {
    return "—";
  }

  return value.toFixed(2);
}

function formatDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleDateString();
}

function formatDocumentType(value: string) {
  if (value === "purchase_order") {
    return "Purchase order";
  }

  if (value === "invoice") {
    return "Invoice";
  }

  return "Unknown";
}