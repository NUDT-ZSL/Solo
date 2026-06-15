import BookView from "./BookView";
import ControlPanel from "./ControlPanel";

export default function App() {
  return (
    <div className="relative min-h-screen">
      <BookView />
      <ControlPanel />
    </div>
  );
}
