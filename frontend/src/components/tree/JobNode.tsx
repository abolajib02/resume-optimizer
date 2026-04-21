import { useState } from 'react';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { toggleJob, reorderBullets } from '../../store/resumeSlice';
import type { Job, JobScore } from '../../types/resume';
import BulletNode from './BulletNode';

interface Props {
  job: Job;
  score?: JobScore;
}

export default function JobNode({ job, score }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const [collapsed, setCollapsed] = useState(false);

  const jobVisible = useSelector(
    (s: RootState) => s.resume.selection[job.id] ?? true
  );
  const bulletOrder = useSelector(
    (s: RootState) => s.resume.bulletOrder[job.id] ?? job.bullets.map(b => b.id)
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const bulletMap = Object.fromEntries(job.bullets.map(b => [b.id, b]));
  const bulletScoreMap = Object.fromEntries(
    (score?.bullet_scores ?? []).map(bs => [bs.bullet_id, bs])
  );

  function handleBulletDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = bulletOrder.indexOf(String(active.id));
    const newIdx = bulletOrder.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    const next = [...bulletOrder];
    next.splice(oldIdx, 1);
    next.splice(newIdx, 0, String(active.id));
    dispatch(reorderBullets({ jobId: job.id, orderedIds: next }));
  }

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: job.id });

  const headerText = [job.title, job.company, job.date_range]
    .filter(Boolean)
    .join(' · ');

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        marginBottom: '4px',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        overflow: 'hidden',
        background: jobVisible ? '#fff' : '#f8fafc',
      }}
    >
      {/* Job header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 8px',
          background: '#f1f5f9',
          cursor: 'default',
        }}
      >
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', color: '#94a3b8', fontSize: '14px', flexShrink: 0, userSelect: 'none', touchAction: 'none' }}
          title="Drag to reorder"
        >
          ⠿
        </span>

        {/* Visibility checkbox */}
        <input
          type="checkbox"
          checked={jobVisible}
          onChange={() => dispatch(toggleJob(job.id))}
          style={{ flexShrink: 0, cursor: 'pointer' }}
        />

        {/* Title */}
        <span
          style={{
            fontSize: '12px',
            fontWeight: 600,
            color: jobVisible ? '#0f172a' : '#94a3b8',
            textDecoration: jobVisible ? 'none' : 'line-through',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={headerText}
        >
          {headerText}
        </span>

        {/* Score badge */}
        {score && (
          <span
            style={{
              fontSize: '10px',
              color: '#64748b',
              flexShrink: 0,
            }}
          >
            {Math.round(score.relevance_score * 100)}%
          </span>
        )}

        {/* Collapse toggle */}
        {job.bullets.length > 0 && (
          <button
            onClick={() => setCollapsed(c => !c)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              fontSize: '12px',
              padding: '0 2px',
              flexShrink: 0,
            }}
            title={collapsed ? 'Expand bullets' : 'Collapse bullets'}
          >
            {collapsed ? '▶' : '▼'}
          </button>
        )}
      </div>

      {/* Bullets */}
      {!collapsed && job.bullets.length > 0 && (
        <div style={{ padding: '4px 4px 4px 20px' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleBulletDragEnd}
          >
            <SortableContext
              items={bulletOrder}
              strategy={verticalListSortingStrategy}
            >
              {bulletOrder.map(bid => {
                const bullet = bulletMap[bid];
                if (!bullet) return null;
                return (
                  <BulletNode
                    key={bid}
                    bullet={bullet}
                    jobId={job.id}
                    score={bulletScoreMap[bid]}
                  />
                );
              })}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
