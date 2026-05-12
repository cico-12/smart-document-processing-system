import Link from "next/link";

export function AppHeader() {
  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-lg font-bold text-gray-950">
          Smart Document Processing
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/upload" className="text-gray-600 hover:text-gray-950">
            Upload
          </Link>
          <Link href="/dashboard" className="text-gray-600 hover:text-gray-950">
            Dashboard
          </Link>
        </nav>
      </div>
    </header>
  );
}