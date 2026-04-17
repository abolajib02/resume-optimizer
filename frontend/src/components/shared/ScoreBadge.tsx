interface Props {
  score: number; // 0.0 – 1.0
  recommendation: 'keep' | 'remove' | 'deprioritize' | 'collapse';
  reason?: string;
}

const COLOR: Record<string, string> = {
  keep: '#16a34a',
  deprioritize: '#ca8a04',
  remove: '#dc2626',
  collapse: '#6b7280',
};

export default function ScoreBadge({ score, recommendation, reason }: Props) {
  const pct = Math.round(score * 100);
  const color = COLOR[recommendation] ?? '#6b7280';

  return (
    <span
      title={reason ?? recommendation}
      style={{
        display: 'inline-block',
        fontSize: '10px',
        fontWeight: 600,
        padding: '1px 5px',
        borderRadius: '9999px',
        background: color,
        color: '#fff',
        marginLeft: '6px',
        cursor: reason ? 'help' : 'default',
        userSelect: 'none',
      }}
    >
      {pct}%
    </span>
  );
}
