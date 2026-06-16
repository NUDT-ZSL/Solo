import { BookProvider } from '@/store/bookStore';
import Gallery from '@/components/Gallery';

export default function App() {
  return (
    <BookProvider>
      <Gallery />
    </BookProvider>
  );
}
