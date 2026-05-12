import { ValidationIssue } from "@/types/document";

type ValidationIssuesProps = {
  issues: ValidationIssue[];
};

export function ValidationIssues({ issues }: ValidationIssuesProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Validation issues</h2>

      {!issues.length ? (
        <p className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
          No validation issues detected.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {issues.map((issue, index) => (
            <li
              key={`${issue.type}-${issue.field}-${index}`}
              className={
                issue.severity === "error"
                  ? "rounded-lg border border-red-200 bg-red-50 px-4 py-3"
                  : "rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3"
              }
            >
              <div className="flex items-center justify-between gap-3">
                <p
                  className={
                    issue.severity === "error"
                      ? "text-sm font-semibold text-red-800"
                      : "text-sm font-semibold text-yellow-800"
                  }
                >
                  {issue.type.replaceAll("_", " ")}
                </p>

                <span
                  className={
                    issue.severity === "error"
                      ? "rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700"
                      : "rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-semibold text-yellow-700"
                  }
                >
                  {issue.severity}
                </span>
              </div>

              <p
                className={
                  issue.severity === "error"
                    ? "mt-1 text-sm text-red-700"
                    : "mt-1 text-sm text-yellow-700"
                }
              >
                {issue.message}
              </p>

              {issue.field ? (
                <p className="mt-1 text-xs text-gray-500">Field: {issue.field}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}