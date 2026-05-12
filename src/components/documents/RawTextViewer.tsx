type RawTextViewerProps = {
  rawText: string;
};

export function RawTextViewer({ rawText }: RawTextViewerProps) {
  return (
    <section className="mt-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Raw extracted text</h2>

      <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-xl bg-gray-950 p-4 text-sm text-gray-100">
        {rawText || "No raw text extracted."}
      </pre>
    </section>
  );
}