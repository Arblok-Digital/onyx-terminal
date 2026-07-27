/**
 * @file App.tsx
 * @layer ui
 * @desc Entry point — pure layout orchestration with ErrorBoundary safety.
 *       Catches render crashes so the terminal never goes white-screen.
 * @exposes default App component
 * @deps components/ErrorBoundary, ui/Terminal, pages/LandingPage
 */
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Terminal from "@/ui/Terminal";
import LandingPage from "@/pages/LandingPage";

export default function App() {
  return (
    <ErrorBoundary name="AppShell">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/terminal" element={<Terminal />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
