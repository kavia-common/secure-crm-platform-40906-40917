import { motion } from "framer-motion";
import React from "react";

const navItems = [
  { name: "Dashboard" },
  { name: "Customers" },
  { name: "Service Requests" },
  { name: "Workflows" },
  { name: "Reports & Analytics" },
  { name: "Audit & Compliance" },
  { name: "Settings" }
];

// PUBLIC_INTERFACE
/**
 * Sidebar navigation placeholder for the CRM app.
 */
export default function Sidebar() {
  return (
    <aside className="bg-surface border-r border-amber-200/70 w-64 min-w-64 h-full shadow-soft">
      <div className="p-4 border-b border-amber-200/70">
        <h1 className="text-lg font-semibold text-primary">Secure CRM</h1>
        <p className="text-xs text-neutral-600">Heritage Brown Theme</p>
      </div>
      <nav className="p-2">
        {navItems.map((item) => (
          <motion.button
            key={item.name}
            whileHover={{ x: 4 }}
            className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-secondary/80 hover:text-primary transition"
          >
            {item.name}
          </motion.button>
        ))}
      </nav>
    </aside>
  );
}
