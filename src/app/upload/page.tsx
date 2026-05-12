import { PageContainer } from "@/components/layout/PageContainer";
import { UploadBox } from "@/components/upload/UploadBox";

export default function UploadPage() {
  return (
    <PageContainer>
      <h1 className="text-3xl font-bold">Upload Document</h1>

      <p className="mt-2 max-w-2xl text-gray-600">
        Upload an invoice, purchase order, image, CSV, or TXT file. The system
        will extract structured data, validate it, and save the result for
        review.
      </p>

      <UploadBox />
    </PageContainer>
  );
}