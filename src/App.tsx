/**
 * @file App.tsx
 * @layer ui
 * @desc Entry point — pure layout orchestration with ErrorBoundary safety.
 *       Catches render crashes so the terminal never goes white-screen.
 * @exposes default App component
 * @deps ui/Terminal, components/ErrorBoundary
 */
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Terminal from "@/ui/Terminal";

export default function App() {
  return (
    <ErrorBoundary name="AppShell">
      <Terminal />
    </ErrorBoundary>
  );
}
