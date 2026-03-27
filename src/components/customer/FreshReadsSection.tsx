import { freshReads } from "../../data/customerExperience";
import { navigateTo } from "../../utils/navigation";

export function FreshReadsSection() {
  return (
    <section className="experience-card fresh-reads-card">
      <div className="experience-card__header">
        <div>
          <p className="eyebrow">Fresh reads</p>
          <h2>Something to read while you browse</h2>
        </div>
        <span className="experience-count">{freshReads.length} quick notes</span>
      </div>

      <div className="fresh-read-grid">
        {freshReads.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="fresh-read-card"
            onClick={() => navigateTo(entry.to)}
          >
            <span className="fresh-read-card__tag">{entry.tag}</span>
            <h3>{entry.title}</h3>
            <p>{entry.description}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
