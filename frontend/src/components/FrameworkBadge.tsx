const FRAMEWORK_COLORS: Record<string, string> = {
  socratic: "bg-blue-600",
  first_principles: "bg-emerald-600",
  mece: "bg-amber-600",
  second_order: "bg-purple-600",
  inversion: "bg-red-600",
};

const FRAMEWORK_LABELS: Record<string, string> = {
  socratic: "Socratic",
  first_principles: "First Principles",
  mece: "MECE",
  second_order: "Second-Order",
  inversion: "Inversion",
};

export function FrameworkBadge({ framework }: { framework: string }) {
  const color = FRAMEWORK_COLORS[framework] || "bg-gray-600";
  const label = FRAMEWORK_LABELS[framework] || framework;

  return (
    <span
      className={`${color} text-white text-xs font-medium px-2 py-0.5 rounded-full`}
    >
      {label}
    </span>
  );
}
