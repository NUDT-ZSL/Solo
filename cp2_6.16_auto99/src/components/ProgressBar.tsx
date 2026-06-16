import './ProgressBar.css';

interface ProgressBarProps {
  collected: number;
  total: number;
}

export default function ProgressBar({ collected, total }: ProgressBarProps) {
  const percentage = (collected / total) * 100;

  return (
    <div className="progress-container">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${percentage}%`,
            transition: 'width 1s ease-out',
          }}
        />
      </div>
      <span className="progress-text">{collected}/{total}</span>
    </div>
  );
}
