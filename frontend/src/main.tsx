import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App.tsx';
import './index.css';

// Note: StrictMode is intentionally omitted — React 18 StrictMode double-invokes
// effects in development which breaks @dnd-kit sensor registration.
// See: https://github.com/clauderic/dnd-kit/issues/840
createRoot(document.getElementById('root')!).render(
  <Provider store={store}>
    <App />
  </Provider>,
);
