/**
 * RenderedResume
 * ==============
 * Converts the Redux resume state into styled HTML that visually approximates
 * the reconstructed DOCX output.
 *
 * Rules that mirror the backend reconstructor:
 *  - Only nodes that are visible in the selection map are rendered
 *  - Section / job / bullet ordering follows the sectionOrder / jobOrder /
 *    bulletOrder arrays from the store
 *  - Inline edits replace original text
 *  - Run-level styles (bold, italic, font size, font name, color) are applied
 *    as inline CSS via <span> elements
 *  - The body font size override from settings applies to all body text;
 *    heading sizes are preserved from run_styles (clamped ≥ body size)
 *  - Combination format: experience jobs rendered title+date only (no bullets)
 */
import { useDispatch } from 'react-redux';
import { useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { applyInlineEdit } from '../../store/resumeSlice';
import type {
  RunStyle,
  Section,
  Job,
  Bullet,
  FreeParagraph,
} from '../../types/resume';

// ---------------------------------------------------------------------------
// Run renderer
// ---------------------------------------------------------------------------

interface RunsProps {
  runs: RunStyle[];
  fallbackText?: string;
  bodySize: number;
  isHeading: boolean;
}

function Runs({ runs, fallbackText, bodySize, isHeading }: RunsProps) {
  if (!runs || runs.length === 0) {
    return (
      <span style={{ fontSize: `${bodySize}pt` }}>{fallbackText ?? ''}</span>
    );
  }
  return (
    <>
      {runs.map((r, i) => {
        const storedSize = r.font_size_pt ?? bodySize;
        const effectiveSize = isHeading
          ? Math.max(storedSize, bodySize)
          : bodySize;

        return (
          <span
            key={i}
            style={{
              fontWeight: r.bold ? 'bold' : undefined,
              fontStyle: r.italic ? 'italic' : undefined,
              textDecoration: r.underline ? 'underline' : undefined,
              fontFamily: r.font_name ?? undefined,
              fontSize: `${effectiveSize}pt`,
              color: r.color_hex ? `#${r.color_hex}` : undefined,
            }}
          >
            {r.text}
          </span>
        );
      })}
    </>
  );
}

// ---------------------------------------------------------------------------
// Editable paragraph wrapper
// ---------------------------------------------------------------------------

interface EditableProps {
  nodeId: string;
  originalText: string;
  children: React.ReactNode;
  style?: React.CSSProperties;
}

function EditableParagraph({ nodeId, originalText, children, style }: EditableProps) {
  const dispatch = useDispatch<AppDispatch>();
  const editedText = useSelector(
    (s: RootState) => s.resume.inlineEdits[nodeId]
  );

  // If there's an active inline edit, display the edited text as plain text
  // instead of the run-styled version
  if (editedText !== undefined) {
    return (
      <div
        contentEditable
        suppressContentEditableWarning
        onBlur={e => {
          const newText = e.currentTarget.textContent ?? '';
          if (newText !== editedText) {
            dispatch(applyInlineEdit({ nodeId, text: newText }));
          }
        }}
        style={{ ...style, outline: 'none', cursor: 'text' }}
      >
        {editedText}
      </div>
    );
  }

  return (
    <div
      contentEditable
      suppressContentEditableWarning
      onBlur={e => {
        const newText = e.currentTarget.textContent ?? '';
        if (newText !== originalText) {
          dispatch(applyInlineEdit({ nodeId, text: newText }));
        }
      }}
      style={{ ...style, outline: 'none', cursor: 'text' }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section heading
// ---------------------------------------------------------------------------

interface HeadingProps {
  section: Section;
  bodySize: number;
}

function SectionHeading({ section, bodySize }: HeadingProps) {
  if (!section.heading) return null;
  return (
    <EditableParagraph
      nodeId={section.id}
      originalText={section.heading}
      style={{ marginBottom: '2px', marginTop: '8px' }}
    >
      <Runs
        runs={section.heading_run_styles}
        fallbackText={section.heading}
        bodySize={bodySize}
        isHeading
      />
    </EditableParagraph>
  );
}

// ---------------------------------------------------------------------------
// Job header (title + company/date line)
// ---------------------------------------------------------------------------

interface JobHeaderProps {
  job: Job;
  bodySize: number;
  inlineEdits: Record<string, string>;
}

function JobHeader({ job, bodySize, inlineEdits }: JobHeaderProps) {
  // Detect whether title and date are on the same line
  // (run_styles equality is checked by reference — same object stored during parse)
  const titleText = inlineEdits[job.id + '_title'] ?? job.title;
  const companyText = inlineEdits[job.id + '_company'] ?? job.company;
  const dateText = inlineEdits[job.id + '_date'] ?? job.date_range;

  const titleFromDateLine =
    job.title_run_styles.length > 0 &&
    job.date_run_styles.length > 0 &&
    JSON.stringify(job.title_run_styles) ===
      JSON.stringify(job.date_run_styles);

  if (titleFromDateLine) {
    // Single line: "Title  date_range"
    const combinedText = `${titleText}  ${dateText}`;
    return (
      <div style={{ marginBottom: '1px', marginTop: '6px' }}>
        <EditableParagraph
          nodeId={job.id + '_title'}
          originalText={combinedText}
          style={{ margin: 0 }}
        >
          <Runs
            runs={job.title_run_styles}
            fallbackText={combinedText}
            bodySize={bodySize}
            isHeading={false}
          />
        </EditableParagraph>
      </div>
    );
  }

  // Two lines: title, then company+location+date
  const companyLine = [companyText, job.location, dateText]
    .filter(Boolean)
    .join('\t');

  return (
    <div style={{ marginBottom: '1px', marginTop: '6px' }}>
      {titleText && (
        <EditableParagraph
          nodeId={job.id + '_title'}
          originalText={titleText}
          style={{ margin: 0 }}
        >
          <Runs
            runs={job.title_run_styles}
            fallbackText={titleText}
            bodySize={bodySize}
            isHeading={false}
          />
        </EditableParagraph>
      )}
      {companyLine && (
        <EditableParagraph
          nodeId={job.id + '_company'}
          originalText={companyLine}
          style={{ margin: 0 }}
        >
          <Runs
            runs={job.company_run_styles.length ? job.company_run_styles : job.date_run_styles}
            fallbackText={companyLine}
            bodySize={bodySize}
            isHeading={false}
          />
        </EditableParagraph>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Bullet line
// ---------------------------------------------------------------------------

interface BulletLineProps {
  bullet: Bullet;
  bodySize: number;
  inlineEdits: Record<string, string>;
}

function BulletLine({ bullet, bodySize, inlineEdits }: BulletLineProps) {
  const text = inlineEdits[bullet.id] ?? bullet.text;
  return (
    <EditableParagraph
      nodeId={bullet.id}
      originalText={text}
      style={{ display: 'flex', gap: '4px', marginBottom: '1px' }}
    >
      <span style={{ flexShrink: 0, fontSize: `${bodySize}pt` }}>•</span>
      <span style={{ flex: 1 }}>
        <Runs
          runs={bullet.run_styles}
          fallbackText={bullet.text}
          bodySize={bodySize}
          isHeading={false}
        />
      </span>
    </EditableParagraph>
  );
}

// ---------------------------------------------------------------------------
// Free paragraph line
// ---------------------------------------------------------------------------

interface FreeParaProps {
  fp: FreeParagraph;
  bodySize: number;
  inlineEdits: Record<string, string>;
}

function FreeParagraphLine({ fp, bodySize, inlineEdits }: FreeParaProps) {
  const text = inlineEdits[fp.id] ?? fp.text;
  return (
    <EditableParagraph
      nodeId={fp.id}
      originalText={text}
      style={{ marginBottom: '1px' }}
    >
      <Runs
        runs={fp.run_styles}
        fallbackText={fp.text}
        bodySize={bodySize}
        isHeading={false}
      />
    </EditableParagraph>
  );
}

// ---------------------------------------------------------------------------
// Section renderer
// ---------------------------------------------------------------------------

interface SectionProps {
  section: Section;
  bodySize: number;
  selection: Record<string, boolean>;
  jobOrder: string[];
  bulletOrder: Record<string, string[]>;
  inlineEdits: Record<string, string>;
  isCollapsed: boolean; // combination format: collapse experience jobs
}

function RenderedSection({
  section,
  bodySize,
  selection,
  jobOrder,
  bulletOrder,
  inlineEdits,
  isCollapsed,
}: SectionProps) {
  const jobMap = Object.fromEntries(section.jobs.map(j => [j.id, j]));

  return (
    <div style={{ marginBottom: '6px' }}>
      <SectionHeading section={section} bodySize={bodySize} />

      {/* Jobs */}
      {section.jobs.length > 0 &&
        jobOrder.map(jid => {
          const job = jobMap[jid];
          if (!job) return null;
          if (!(selection[jid] ?? true)) return null;

          const bOrder = bulletOrder[jid] ?? job.bullets.map(b => b.id);
          const bulletMap = Object.fromEntries(job.bullets.map(b => [b.id, b]));

          return (
            <div key={jid} style={{ marginBottom: '4px' }}>
              <JobHeader job={job} bodySize={bodySize} inlineEdits={inlineEdits} />
              {/* In combination format, experience bullets are hidden */}
              {!isCollapsed &&
                bOrder.map(bid => {
                  const bullet = bulletMap[bid];
                  if (!bullet) return null;
                  if (!(selection[bid] ?? true)) return null;
                  return (
                    <BulletLine
                      key={bid}
                      bullet={bullet}
                      bodySize={bodySize}
                      inlineEdits={inlineEdits}
                    />
                  );
                })}
            </div>
          );
        })}

      {/* Free paragraphs */}
      {section.free_paragraphs.map(fp => {
        if (!(selection[fp.id] ?? true)) return null;
        return (
          <FreeParagraphLine
            key={fp.id}
            fp={fp}
            bodySize={bodySize}
            inlineEdits={inlineEdits}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

interface RenderedResumeProps {
  /** ref forwarded to the outermost div — used by usePageOverflow */
  contentRef: React.RefObject<HTMLDivElement>;
}

export default function RenderedResume({ contentRef }: RenderedResumeProps) {
  const resume = useSelector((s: RootState) => s.resume.resume);
  const selection = useSelector((s: RootState) => s.resume.selection);
  const sectionOrder = useSelector((s: RootState) => s.resume.sectionOrder);
  const jobOrder = useSelector((s: RootState) => s.resume.jobOrder);
  const bulletOrder = useSelector((s: RootState) => s.resume.bulletOrder);
  const inlineEdits = useSelector((s: RootState) => s.resume.inlineEdits);
  const { fontSizePt, selectedFormat } = useSelector((s: RootState) => s.ui);

  if (!resume) return null;

  const sectionMap = Object.fromEntries(resume.sections.map(s => [s.id, s]));
  const isCombination = selectedFormat === 'combination';

  return (
    <div ref={contentRef}>
      {sectionOrder.map(sid => {
        const section = sectionMap[sid];
        if (!section) return null;
        if (!(selection[sid] ?? true)) return null;

        // In combination format, experience section jobs are collapsed
        const collapseJobs =
          isCombination && section.section_type === 'experience';

        return (
          <RenderedSection
            key={sid}
            section={section}
            bodySize={fontSizePt}
            selection={selection}
            jobOrder={jobOrder[sid] ?? section.jobs.map(j => j.id)}
            bulletOrder={bulletOrder}
            inlineEdits={inlineEdits}
            isCollapsed={collapseJobs}
          />
        );
      })}
    </div>
  );
}
