import s from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={s.footer}>
      <span>LocalScan · On-device document intelligence demo</span>
      <span className={s.colophon}>System UI · Built for offline operation</span>
    </footer>
  );
}
