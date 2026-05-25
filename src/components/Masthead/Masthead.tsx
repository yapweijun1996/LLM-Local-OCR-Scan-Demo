import s from './Masthead.module.css';

export default function Masthead() {
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '.');

  return (
    <header className={`${s.masthead} anim-in anim-in-1`}>
      <div className={s.mastheadTop}>
        <span>LocalScan OCR Workspace</span>
        <span className={s.live}>Local Inference Active</span>
      </div>
      <div className={s.mastheadTitle}>
        <div className={s.brandmark}>
          <div className={s.glyph}>L</div>
          <div>
            <h1 className={s.brandName}>LocalScan</h1>
            <div className={s.tagline}>Private document intelligence</div>
          </div>
        </div>
        <div className={s.mastheadMeta}>
          <div><strong>Build</strong> {today}</div>
          <div><strong>Engine</strong> Multi-provider</div>
          <div><strong>Status</strong> Air-gapped capable</div>
        </div>
      </div>
    </header>
  );
}
