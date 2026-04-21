import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { toggleBullet } from '../../store/resumeSlice';
import type { Bullet, BulletScore } from '../../types/resume';
import ScoreBadge from '../shared/ScoreBadge';

interface Props {
  bullet: Bullet;
  score?: BulletScore;
  jobId: string;
}

export default function BulletNode({ bullet, score }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const visible = useSelector(
    (s: RootState) => s.resume.selection[bullet.id] ?? true
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: bullet.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        display: 'flex',
        alignItems: 'flex-start',
        gap: '6px',
        padding: '4px 6px',
        borderRadius: '4px',
        background: isDragging ? '#f0f9ff' : 'transparent',
        marginBottom: '2px',
      }}
    >
      {/* Drag handle */}
      <span
        {...attributes}
        {...listeners}
        style={{
          cursor: 'grab',
          color: '#94a3b8',
          fontSize: '14px',
          paddingTop: '1px',
          flexShrink: 0,
          userSelect: 'none',
          touchAction: 'none',
        }}
        title="Drag to reorder"
      >
        ⠿
      </span>

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={visible}
        onChange={() => dispatch(toggleBullet(bullet.id))}
        style={{ marginTop: '3px', flexShrink: 0, cursor: 'pointer' }}
      />

      {/* Bullet text */}
      <span
        style={{
          fontSize: '12px',
          color: visible ? '#1e293b' : '#94a3b8',
          textDecoration: visible ? 'none' : 'line-through',
          lineHeight: 1.4,
          flex: 1,
        }}
      >
        {bullet.text}
      </span>

      {/* Score badge from LLM analysis */}
      {score && (
        <ScoreBadge
          score={score.relevance_score}
          recommendation={score.recommendation}
          reason={score.reason}
        />
      )}
    </div>
  );
}
