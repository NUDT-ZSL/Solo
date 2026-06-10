import { BrowserRouter, Routes, Route, Link, useParams } from 'react-router-dom';
import FilmRollList from '../components/FilmRollList';
import Upload from '../components/Upload';
import Editor from '../components/Editor';
import Player from '../components/Player';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FilmRollList />} />
        <Route path="/create" element={<Upload />} />
        <Route path="/edit/:id" element={<EditorWrapper />} />
        <Route path="/share/:link" element={<PlayerWrapper />} />
      </Routes>
    </BrowserRouter>
  );
}

function EditorWrapper() {
  const { id } = useParams<{ id: string }>();
  return <Editor id={id as string} />;
}

function PlayerWrapper() {
  const { link } = useParams<{ link: string }>();
  return <Player link={link as string} />;
}

export { Link };
