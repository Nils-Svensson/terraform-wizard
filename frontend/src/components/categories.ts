export interface CategoryMeta {
  label: string;
  tailwind: string;
  hex: string;
}

export const CATEGORY_META: Record<string, CategoryMeta> = {
  module:           { label: "Module",        tailwind: "bg-amber-500",   hex: "#f59e0b" },
  compute:          { label: "Compute",        tailwind: "bg-blue-500",    hex: "#3b82f6" },
  networking:       { label: "Networking",     tailwind: "bg-green-500",   hex: "#22c55e" },
  storage:          { label: "Storage",        tailwind: "bg-orange-500",  hex: "#f97316" },
  data:             { label: "Data",           tailwind: "bg-purple-500",  hex: "#a855f7" },
  messaging:        { label: "Messaging",      tailwind: "bg-teal-500",    hex: "#14b8a6" },
  ai:               { label: "AI",             tailwind: "bg-pink-500",    hex: "#ec4899" },
  iam:              { label: "IAM",            tailwind: "bg-yellow-500",  hex: "#eab308" },
  security:         { label: "Security",       tailwind: "bg-red-500",     hex: "#ef4444" },
  observability:    { label: "Observability",  tailwind: "bg-indigo-500",  hex: "#6366f1" },
  dns:              { label: "DNS",            tailwind: "bg-cyan-500",    hex: "#06b6d4" },
  billing:          { label: "Billing",        tailwind: "bg-emerald-500", hex: "#10b981" },
  other:            { label: "Other",          tailwind: "bg-gray-500",    hex: "#6b7280" },
};

export const CATEGORY_OPTIONS = Object.entries(CATEGORY_META).map(([value, meta]) => ({
  value,
  label: meta.label,
  color: meta.tailwind,
  hex: meta.hex,
}));
