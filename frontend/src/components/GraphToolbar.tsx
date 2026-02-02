const ALL_CATEGORIES = [
  "compute",
  "networking",
  "storage",
  "data",
  "machine_learning",
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
        <label key={cat} className="toolbar-item">
          <input
            type="checkbox"
            checked={activeCategories.has(cat)}
            onChange={() => onToggleCategory(cat)}
          />
          {cat}
        </label>
      ))}

      <span className="info-icon">
        i
        <span className="tooltip">
          The filter has basic support for providers
          <br />
          GCP, AWS, and Azure for now.
        </span>
      </span>
    </div>
  );
}



