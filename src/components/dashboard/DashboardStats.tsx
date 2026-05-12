import { StoredDocument } from "@/types/document";

type DashboardStatsProps = {
  documents: StoredDocument[];
};

type CurrencyTotal = {
  currency: string;
  count: number;
  total: number;
};

export function DashboardStats({ documents }: DashboardStatsProps) {
  const total = documents.length;

  const uploaded = documents.filter((doc) => doc.status === "uploaded").length;

  const needsReview = documents.filter(
    (doc) => doc.status === "needs_review"
  ).length;

  const validated = documents.filter((doc) => doc.status === "validated").length;

  const rejected = documents.filter((doc) => doc.status === "rejected").length;

  const totalIssues = documents.reduce(
    (sum, doc) => sum + doc.validationIssues.length,
    0
  );

  const currencyTotals = getCurrencyTotals(documents);

  return (
    <div className="mb-6 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard label="Total documents" value={total} />
        <StatCard label="Needs review" value={needsReview} />
        <StatCard label="Validated" value={validated} />
        <StatCard label="Rejected" value={rejected} />
        <StatCard label="Detected issues" value={totalIssues} />

        {uploaded > 0 ? <StatCard label="Uploaded" value={uploaded} /> : null}
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Totals by currency</h2>
            <p className="text-sm text-gray-500">
              Based on extracted document totals.
            </p>
          </div>
        </div>

        {currencyTotals.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {currencyTotals.map((item) => (
              <div
                key={item.currency}
                className="rounded-xl border border-gray-200 bg-gray-50 p-4"
              >
                <p className="text-sm font-medium text-gray-500">
                  {item.currency}
                </p>

                <p className="mt-2 text-2xl font-bold">
                  {formatMoney(item.total)}
                </p>

                <p className="mt-1 text-xs text-gray-500">
                  {item.count} document{item.count === 1 ? "" : "s"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-4 rounded-lg bg-gray-50 px-4 py-3 text-sm text-gray-600">
            No document totals available yet.
          </p>
        )}
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-3xl font-bold">{value}</p>
    </section>
  );
}

function getCurrencyTotals(documents: StoredDocument[]): CurrencyTotal[] {
  const totals = documents.reduce<Record<string, CurrencyTotal>>(
    (accumulator, document) => {
      if (typeof document.total !== "number") {
        return accumulator;
      }

      const currency = document.currency?.trim().toUpperCase() || "Unknown";

      if (!accumulator[currency]) {
        accumulator[currency] = {
          currency,
          count: 0,
          total: 0,
        };
      }

      accumulator[currency].count += 1;
      accumulator[currency].total += document.total;

      return accumulator;
    },
    {}
  );

  return Object.values(totals).sort((a, b) => {
    if (a.currency === "Unknown") {
      return 1;
    }

    if (b.currency === "Unknown") {
      return -1;
    }

    return a.currency.localeCompare(b.currency);
  });
}

function formatMoney(value: number) {
  return value.toFixed(2);
}