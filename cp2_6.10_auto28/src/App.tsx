import Board from './components/Board';
import Toolbar from './components/Toolbar';
import CreateModal from './components/CreateModal';
import DetailPanel from './components/DetailPanel';
import './App.css';

function App() {
  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">团队工作流看板</h1>
      </header>
      <Toolbar />
      <main className="app-main">
        <Board />
      </main>
      <CreateModal />
      <DetailPanel />
    </div>
  );
}

export default App;
