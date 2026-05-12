import Link from "next/link";
import { notFound } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { getDocumentById } from "@/lib/documents/documentRepository";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ValidationIssues } from "@/components/documents/ValidationIssues";
import { DocumentForm } from "@/components/documents/DocumentForm";

type DocumentDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function DocumentDetailsPage({
  params,
}: DocumentDetailsPageProps) {
  const { id } = await params;
  const document = await getDocumentById(id);

  if (!document) {
    notFound();
  }

  return (
    <PageContainer>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to dashboard
          </Link>

          <h1 className="mt-2 text-3xl font-bold">Review Document</h1>

          <p className="mt-1 text-sm text-gray-500">
            Uploaded file: {document.originalFileName}
          </p>

          {document.hasOriginalFile ? (
            <a
              href={`/api/documents/${document.id}/file`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100"
            >
              Open original file
            </a>
          ) : (
            <p className="mt-3 rounded-lg bg-yellow-50 px-4 py-2 text-sm text-yellow-800">
              Original file is not available for this older upload. Re-upload
              the document to enable file preview.
            </p>
          )}
        </div>

        <StatusBadge status={document.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <DocumentForm document={document} />

        <aside className="space-y-6">
          <ValidationIssues issues={document.validationIssues} />

          <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold">Document metadata</h2>

            <div className="mt-4 space-y-3 text-sm">
              <InfoItem label="Document ID" value={document.id} />
              <InfoItem label="File type" value={document.fileType} />
              <InfoItem
                label="File size"
                value={
                  document.originalFileSize
                    ? `${(document.originalFileSize / 1024).toFixed(1)} KB`
                    : "—"
                }
              />
              <InfoItem label="Created" value={document.createdAt} />
              <InfoItem label="Updated" value={document.updatedAt} />
            </div>
          </section>
        </aside>
      </div>
    </PageContainer>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value?: string | number | null;
}) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="break-words text-sm font-medium">{value ?? "—"}</p>
    </div>
  );
}