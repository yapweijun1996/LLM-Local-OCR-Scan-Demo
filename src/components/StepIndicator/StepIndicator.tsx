import s from './StepIndicator.module.css';

const STEPS = [
  { n: '01', label: 'Configure', sub: 'Choose AI engine' },
  { n: '02', label: 'Upload', sub: 'Documents to analyze' },
  { n: '03', label: 'Extract', sub: 'Vision-language OCR' },
  { n: '04', label: 'Verify', sub: 'Truth match & export' },
];

interface Props {
  current: number;
}

export default function StepIndicator({ current }: Props) {
  return (
    <nav className={`${s.steps} anim-in anim-in-4`}>
      {STEPS.map((step, i) => {
        const n = i + 1;
        const isActive = n === current;
        const isDone = n < current;
        const cls = [s.pill, isActive ? s.active : '', isDone ? s.done : ''].filter(Boolean).join(' ');
        return (
          <div key={step.n} className={cls} data-step={n}>
            <div className={s.num}>{isDone ? `${step.n} ✓` : step.n}</div>
            <div className={s.labelText}>
              {step.label}
              <small>{step.sub}</small>
            </div>
          </div>
        );
      })}
    </nav>
  );
}
