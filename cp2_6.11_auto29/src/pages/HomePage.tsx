import StoryForm from '../components/StoryForm';
import TimeWall from '../components/TimeWall';

export default function HomePage() {
  return (
    <div>
      <StoryForm />
      <h2 style={{ fontSize: 20, marginBottom: 20, fontFamily: "'Noto Serif SC', serif" }}>
        🕰️ 时光墙
      </h2>
      <TimeWall />
    </div>
  );
}
