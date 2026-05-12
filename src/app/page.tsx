import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";

export default function HomePage() {
  return (
    <PageContainer>
      <section className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">

        <h1 className="mt-3 max-w-3xl text-4xl font-bold tracking-tight">
          Smart Document Processing System
        </h1>

        <p className="mt-4 max-w-2xl text-gray-600">
          Upload invoices, purchase orders, images, CSV files, or TXT files.
          The system extracts structured data, validates it, highlights issues,
          and allows manual review.
        </p>

        <div className="mt-6 flex gap-3">
          <Link
            href="/upload"
            className="rounded-lg bg-gray-950 px-5 py-3 text-sm font-medium text-white hover:bg-gray-800"
          >
            Upload document
          </Link>

          <Link
            href="/dashboard"
            className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-medium text-gray-800 hover:bg-gray-100"
          >
            View dashboard
          </Link>
        </div>
      </section>
    </PageContainer>
  );
}