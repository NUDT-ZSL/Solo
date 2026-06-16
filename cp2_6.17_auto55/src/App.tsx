import { Routes, Route } from 'react-router-dom';

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </div>
  );
}

function Home() {
  return (
    <div className="home">
      <h1>Welcome to React + TypeScript + Vite</h1>
    </div>
  );
}

export default App;
