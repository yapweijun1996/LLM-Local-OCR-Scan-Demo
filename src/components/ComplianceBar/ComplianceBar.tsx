import s from './ComplianceBar.module.css';

const BADGES = [
  { icon: null, dot: true, label: 'Zero Cloud Upload' },
  { icon: '⏻', dot: false, label: 'Local-First Inference' },
  { icon: '§', dot: false, label: 'PDPA / GDPR Ready' },
  { icon: '⌘', dot: false, label: 'Data Sovereign' },
  { icon: '∎', dot: false, label: 'Zero API Cost' },
];

export default function ComplianceBar() {
  return (
    <div className={`${s.complianceBar} anim-in anim-in-2`}>
      {BADGES.map(b => (
        <span key={b.label} className={s.badge}>
          {b.dot && <span className={s.dot} />}
          {b.icon && <span className={s.icon}>{b.icon}</span>}
          {b.label}
        </span>
      ))}
    </div>
  );
}
