import { BrowserRouter, Routes, Route, useParams } from 'react-router-dom';
import FilmRollList from './client/components/FilmRoll';
import Upload from './client/components/Upload';
import Editor from './client/components/Editor';
import Player from './client/components/Player';

function EditorWrapper() {
  const { id } = useParams<{ id: string }>();
  return <Editor id={id as string} />;
}

function PlayerWrapper() {
  const { link } = useParams<{ link: string }>();
  return <Player link={link as string} />;
}

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
