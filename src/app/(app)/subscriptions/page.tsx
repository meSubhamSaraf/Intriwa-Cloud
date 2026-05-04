"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CreditCard, TrendingUp, AlertTriangle, Clock, ArrowRight, Search, Info,
} from "lucide-react";

type ApiCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  createdAt: string;
};

function fmtRupee(n: number) {
  return "₹" + n.toLocaleString("en-IN");
}

export default function SubscriptionsPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<ApiCustomer[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => r.json())
      .then((data: ApiCustomer[]) => setCustomers(data))
      .catch(() => {});
  }, []);

  const filtered = customers.filter(
    (c) => !query || c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query)
  );

  return (
    <div className="p-4 max-w-4xl">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-base font-semibold text-slate-800">Subscriptions</h1>
        <p className="text-[11px] text-slate-500">Manage customer plans, renewals, and billing</p>
      </div>

      {/* Notice */}
      <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-5">
        <Info className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-blue-800">Subscription tracking not yet configured</p>
          <p className="text-[11px] text-blue-600 mt-0.5">
            Subscription plans (AMC, Wash-scription, Fleet) will appear here once the subscription schema is set up. Customer list below is live.
          </p>
        </div>
      </div>

      {/* KPI row — placeholders */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp className="w-3.5 h-3.5 text-brand-navy-600" />
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">MRR</p>
          </div>
          <p className="text-2xl font-bold text-brand-navy-800 tabular-nums">{fmtRupee(0)}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">ARR: {fmtRupee(0)}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-1">Customers</p>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">{customers.length}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">total registered</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Active Plans</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 tabular-nums">—</p>
          <p className="text-[11px] text-slate-400 mt-0.5">pending setup</p>
        </div>
        <div className="bg-white border border-red-100 rounded-lg px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1">
            <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">At Risk</p>
          </div>
          <p className="text-2xl font-bold text-red-700 tabular-nums">—</p>
          <p className="text-[11px] text-slate-400 mt-0.5">pending setup</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4 w-64">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        <input
          type="text"
          placeholder="Search customer…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 pl-8 pr-3 text-sm bg-white border border-slate-200 rounded-md text-slate-600 placeholder:text-slate-400 focus:outline-none focus:border-brand-navy-400 w-full transition-colors"
        />
      </div>

      {/* Customer list */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              {["Customer", "Phone", "Since", "Plan", "Actions"].map((h) => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => (
              <tr
                key={c.id}
                onClick={() => router.push(`/customers/${c.id}`)}
                className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <td className="px-3 py-2.5">
                  <p className="font-medium text-slate-800">{c.name}</p>
                  {c.email && <p className="text-[11px] text-slate-400">{c.email}</p>}
                </td>
                <td className="px-3 py-2.5 text-[12px] text-slate-600 tabular-nums">{c.phone}</td>
                <td className="px-3 py-2.5 text-[12px] text-slate-500">
                  {new Date(c.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-[10px] text-slate-400 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                    Not set up
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Link
                      href={`/customers/${c.id}`}
                      className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-brand-navy-600 hover:bg-brand-navy-50 transition-colors"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-slate-400">
            <CreditCard className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{query ? "No customers match your search." : "No customers yet."}</p>
          </div>
        )}
      </div>
    </div>
  );
}
