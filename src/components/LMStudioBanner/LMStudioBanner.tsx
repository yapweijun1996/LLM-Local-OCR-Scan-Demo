import s from './LMStudioBanner.module.css';

interface Props {
  visible: boolean;
}

export default function LMStudioBanner({ visible }: Props) {
  if (!visible) return null;

  return (
    <div className={s.banner}>
      <span className={s.icon}>⚠</span>
      <div className={s.text}>
        <strong>LM Studio — Localhost Only</strong>
        This page is served over HTTPS. Browsers block requests to{' '}
        <code>http://localhost:1234</code> (mixed-content policy).
        To use LM Studio, run the app locally with{' '}
        <code>npm run dev</code>. Cloud providers (OpenAI, Gemini) work here.
      </div>
    </div>
  );
}
