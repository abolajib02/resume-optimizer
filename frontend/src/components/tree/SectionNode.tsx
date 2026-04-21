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
  type DragEndEvent,
} from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { toggleSection, reorderJobs } from '../../store/resumeSlice';
import type { Section, SectionScore } from '../../types/resume';
import JobNode from './JobNode';
import FreeParagraphNode from './FreeParagraphNode';

const SECTION_LABEL: Record<string, string> = {
  contact: 'Contact',
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  certifications: 'Certifications',
  projects: 'Projects',
  military: 'Military',
  other: 'Other',
};

interface Props {
  section: Section;
  score?: SectionScore;
}

export default function SectionNode({ section, score }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const [collapsed, setCollapsed] = useState(false);

  const sectionVisible = useSelector(
    (s: RootState) => s.resume.selection[section.id] ?? true
  );
  const jobOrder = useSelector(
    (s: RootState) =>
      s.resume.jobOrder[section.id] ?? section.jobs.map(j => j.id)
  );

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  const jobMap = Object.fromEntries(section.jobs.map(j => [j.id, j]));
  const jobScoreMap = Object.fromEntries(
    (score?.job_scores ?? []).map(js => [js.job_id, js])
  );

  function handleJobDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = jobOrder.indexOf(String(active.id));
    const newIdx = jobOrder.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    const next = [...jobOrder];
    next.splice(oldIdx, 1);
    next.splice(newIdx, 0, String(active.id));
    dispatch(reorderJobs({ sectionId: section.id, orderedIds: next }));
  }

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });

  const hasChildren = section.jobs.length > 0 || section.free_paragraphs.length > 0;
  const typeLabel = SECTION_LABEL[section.section_type] ?? 'Other';

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        marginBottom: '8px',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {/* Section header row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 10px',
          background: sectionVisible ? '#e2e8f0' : '#f1f5f9',
          cursor: 'default',
        }}
      >
        {/* Drag handle */}
        <span
          {...attributes}
          {...listeners}
          style={{ cursor: 'grab', color: '#64748b', fontSize: '16px', flexShrink: 0, userSelect: 'none', touchAction: 'none' }}
          title="Drag to reorder section"
        >
          ⠿
        </span>

        {/* Visibility checkbox */}
        <input
          type="checkbox"
          checked={sectionVisible}
          onChange={() => dispatch(toggleSection(section.id))}
          style={{ flexShrink: 0, cursor: 'pointer' }}
        />

        {/* Type chip */}
        <span
          style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: '#475569',
            background: '#cbd5e1',
            padding: '1px 6px',
            borderRadius: '4px',
            flexShrink: 0,
          }}
        >
          {typeLabel}
        </span>

        {/* Heading text */}
        <span
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: sectionVisible ? '#0f172a' : '#94a3b8',
            textDecoration: sectionVisible ? 'none' : 'line-through',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {section.heading || '(header)'}
        </span>

        {/* Relevance score */}
        {score && (
          <span style={{ fontSize: '10px', color: '#64748b', flexShrink: 0 }}>
            {Math.round(score.relevance_score * 100)}%
          </span>
        )}

        {/* Collapse toggle */}
        {hasChildren && (
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
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            {collapsed ? '▶' : '▼'}
          </button>
        )}
      </div>

      {/* Children */}
      {!collapsed && hasChildren && (
        <div style={{ padding: '6px 8px' }}>
          {/* Jobs (drag-sortable within this section) */}
          {section.jobs.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleJobDragEnd}
            >
              <SortableContext
                items={jobOrder}
                strategy={verticalListSortingStrategy}
              >
                {jobOrder.map(jid => {
                  const job = jobMap[jid];
                  if (!job) return null;
                  return (
                    <JobNode
                      key={jid}
                      job={job}
                      score={jobScoreMap[jid]}
                    />
                  );
                })}
              </SortableContext>
            </DndContext>
          )}

          {/* Free paragraphs (skills, education, summary, etc.) — locked in place */}
          {section.free_paragraphs.length > 0 && (
            <div>
              {section.free_paragraphs.map(fp => (
                <FreeParagraphNode key={fp.id} fp={fp} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
