import { DocumentStatus } from "@/types/document";

type StatusBadgeProps = {
  status: DocumentStatus;
};

const statusLabels: Record<DocumentStatus, string> = {
  uploaded: "Uploaded",
  needs_review: "Needs Review",
  validated: "Validated",
  rejected: "Rejected",
};

const statusClasses: Record<DocumentStatus, string> = {
  uploaded: "bg-gray-100 text-gray-700 ring-gray-200",
  needs_review: "bg-yellow-100 text-yellow-800 ring-yellow-200",
  validated: "bg-green-100 text-green-800 ring-green-200",
  rejected: "bg-red-100 text-red-800 ring-red-200",
};

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${statusClasses[status]}`}
    >
      {statusLabels[status]}
    </span>
  );
}