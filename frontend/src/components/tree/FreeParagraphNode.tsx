import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../store';
import { toggleFreeParagraph } from '../../store/resumeSlice';
import type { FreeParagraph } from '../../types/resume';

interface Props {
  fp: FreeParagraph;
}

export default function FreeParagraphNode({ fp }: Props) {
  const dispatch = useDispatch<AppDispatch>();
  const visible = useSelector(
    (s: RootState) => s.resume.selection[fp.id] ?? true
  );

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '6px',
        padding: '3px 6px',
        borderRadius: '4px',
        marginBottom: '2px',
      }}
    >
      <input
        type="checkbox"
        checked={visible}
        onChange={() => dispatch(toggleFreeParagraph(fp.id))}
        style={{ marginTop: '3px', flexShrink: 0, cursor: 'pointer' }}
      />
      <span
        style={{
          fontSize: '12px',
          color: visible ? '#1e293b' : '#94a3b8',
          textDecoration: visible ? 'none' : 'line-through',
          lineHeight: 1.4,
          flex: 1,
        }}
      >
        {fp.text}
      </span>
    </div>
  );
}
