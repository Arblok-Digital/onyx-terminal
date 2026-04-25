/**
 * @file App.tsx
 * @layer ui
 * @desc Entry point — pure layout orchestration. NO business logic here.
 * @exposes default App component
 * @deps ui/Terminal
 */
import Terminal from "@/ui/Terminal";

export default function App() {
  return <Terminal />;
}
