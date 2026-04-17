import { useSelector } from 'react-redux';
import type { RootState } from './store';
import UploadPanel from './components/upload/UploadPanel';
import ResumeTree from './components/tree/ResumeTree';
import FormattingToolbar from './components/toolbar/FormattingToolbar';
import ResumePreview from './components/preview/ResumePreview';
import FormatModal from './components/analysis/FormatModal';
import AnalysisBanner from './components/analysis/AnalysisBanner';
import { useAnalysisPoller } from './hooks/useAnalysisPoller';

function Workspace() {
  // Start polling as soon as Workspace mounts (taskId lives in Redux)
  useAnalysisPoller();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      <FormattingToolbar />
      <AnalysisBanner />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left: Tree panel — fixed 380px, scrollable */}
        <div
          style={{
            width: '380px',
            flexShrink: 0,
            overflow: 'auto',
            background: '#fff',
            borderRight: '1px solid #e2e8f0',
          }}
        >
          <ResumeTree />
        </div>

        {/* Right: Preview panel */}
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <ResumePreview />
        </div>
      </div>

      {/* Format modal — rendered at root so it overlays everything */}
      <FormatModal />
    </div>
  );
}

export default function App() {
  const step = useSelector((s: RootState) => s.ui.step);

  return step === 'upload' ? <UploadPanel /> : <Workspace />;
}
