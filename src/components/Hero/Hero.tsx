import s from './Hero.module.css';

export default function Hero() {
  return (
    <section className={`${s.hero} anim-in anim-in-3`}>
      <div>
        <h2 className={s.headline}>
          Extract tables from documents with local control.
        </h2>
        <p className={s.sub}>
          Stage purchase orders, invoices, or contracts; run a configured
          vision-language model; then review structured output, math checks,
          and benchmark accuracy from one workspace.
        </p>
      </div>
      <aside className={s.heroMeta}>
        <div className={s.metaItem}>
          <div className={s.metaLabel}>Default Engine</div>
          <div className={s.metaValue}>olmOCR-2 · 7B</div>
        </div>
        <div className={s.metaItem}>
          <div className={s.metaLabel}>Specialization</div>
          <div className={s.metaValue}>Trained on 270K Docs</div>
        </div>
        <div className={s.metaItem}>
          <div className={s.metaLabel}>Export Formats</div>
          <div className={s.metaValue}>JSON · CSV · Markdown</div>
        </div>
      </aside>
    </section>
  );
}
