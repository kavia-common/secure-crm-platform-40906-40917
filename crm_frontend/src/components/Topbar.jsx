import React from "react";

// PUBLIC_INTERFACE
/**
 * Top bar with search input and user placeholder.
 */
export default function Topbar() {
  return (
    <div className="h-14 bg-surface border-b border-amber-200/70 px-4 flex items-center justify-between">
      <input
        className="w-72 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        placeholder="Search customers, tickets, workflows..."
        aria-label="Global search"
      />
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-700">Hello, Agent</span>
        <div className="w-8 h-8 rounded-full bg-secondary border border-amber-200/70" />
      </div>
    </div>
  );
}
