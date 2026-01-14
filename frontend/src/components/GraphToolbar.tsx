const ALL_CATEGORIES = [
  "compute",
  "networking",
  "storage",
  "data",
  "iam",
  "security",
  "observability",
  "dns",
  "billing",
  "other",
];


type Props = {
  activeCategories: Set<string>;
  onToggleCategory: (category: string) => void;
};

export function GraphToolbar({ activeCategories, onToggleCategory }: Props) {
  return (
    <div className="toolbar">
      {ALL_CATEGORIES.map(cat => (
        <label key={cat}>
          <input
            type="checkbox"
            checked={activeCategories.has(cat)}
            onChange={() => onToggleCategory(cat)}
          />
          {cat}
        </label>
      ))}
    </div>
  );
}
