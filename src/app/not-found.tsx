import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-brand-navy-100 flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl font-bold text-brand-navy-400">?</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Page not found</h1>
        <p className="text-sm text-slate-500 mb-8">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-4 py-2 bg-brand-navy-800 text-white text-sm font-medium rounded-md hover:bg-brand-navy-700 transition-colors"
          >
            <Home className="w-4 h-4" /> Go to Dashboard
          </Link>
          <Link
            href="javascript:history.back()"
            className="flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-600 text-sm font-medium rounded-md hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Go back
          </Link>
        </div>
      </div>
    </div>
  );
}
