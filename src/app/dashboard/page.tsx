import { DashboardStats } from "@/components/dashboard/DashboardStats";
import { DocumentsTable } from "@/components/dashboard/DocumentsTable";
import { PageContainer } from "@/components/layout/PageContainer";
import { getDocuments } from "@/lib/documents/documentRepository";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const documents = await getDocuments();

  return (
    <PageContainer>
      <div className="mb-6 flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Document Dashboard</h1>

        <p className="max-w-2xl text-gray-600">
          View uploaded invoices and purchase orders, check validation status,
          and open documents that need review.
        </p>
      </div>

      <DashboardStats documents={documents} />

      <DocumentsTable documents={documents} />
    </PageContainer>
  );
}