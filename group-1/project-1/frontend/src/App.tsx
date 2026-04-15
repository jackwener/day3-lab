import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import ErrorBoundary from './components/ErrorBoundary';
import SkillList from './pages/SkillList';
import SkillDetail from './pages/SkillDetail';
import SkillCreate from './pages/SkillCreate';
import SkillUpload from './pages/SkillUpload';

export default function App() {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<SkillList />} />
            <Route path="/skills/:id" element={<SkillDetail />} />
            <Route path="/create" element={<SkillCreate />} />
            <Route path="/upload" element={<SkillUpload />} />
          </Routes>
        </BrowserRouter>
      </ErrorBoundary>
    </ThemeProvider>
  );
}
