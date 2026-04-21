import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { reorderSections } from '../../store/resumeSlice';
import SectionNode from './SectionNode';

export default function ResumeTree() {
  const dispatch = useDispatch<AppDispatch>();
  const resume = useSelector((s: RootState) => s.resume.resume);
  const sectionOrder = useSelector((s: RootState) => s.resume.sectionOrder);
  const analysisResult = useSelector((s: RootState) => s.analysis.result);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } }),
  );

  if (!resume) return null;

  const sectionMap = Object.fromEntries(resume.sections.map(s => [s.id, s]));
  const sectionScoreMap = Object.fromEntries(
    (analysisResult?.section_scores ?? []).map(ss => [ss.section_id, ss])
  );

  function handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = sectionOrder.indexOf(String(active.id));
    const newIdx = sectionOrder.indexOf(String(over.id));
    if (oldIdx === -1 || newIdx === -1) return;
    const next = [...sectionOrder];
    next.splice(oldIdx, 1);
    next.splice(newIdx, 0, String(active.id));
    dispatch(reorderSections(next));
  }

  return (
    <div style={{ padding: '12px' }}>
      <div
        style={{
          fontSize: '11px',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#64748b',
          marginBottom: '10px',
        }}
      >
        Resume Structure
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleSectionDragEnd}
      >
        <SortableContext
          items={sectionOrder}
          strategy={verticalListSortingStrategy}
        >
          {sectionOrder.map(sid => {
            const section = sectionMap[sid];
            if (!section) return null;
            return (
              <SectionNode
                key={sid}
                section={section}
                score={sectionScoreMap[sid]}
              />
            );
          })}
        </SortableContext>
      </DndContext>
    </div>
  );
}
