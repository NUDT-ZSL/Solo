import React, { useEffect, useState } from 'react';

interface StarBand {
  band: string;
  magnitude: number;
}

interface StarData {
  name: string;
  ra: number;
  dec: number;
  bands: StarBand[];
  distance: number;
}

interface StarTooltipProps {
  star: StarData | null;
  mouseX: number;
  mouseY: number;
}

const StarTooltip: React.FC<StarTooltipProps> = ({ star, mouseX, mouseY }) => {
  const [position, setPosition] = useState({ x: mouseX, y: mouseY });
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (star) {
      const padding = 15;
      const tooltipWidth = 260;
      const tooltipHeight = 220;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let x = mouseX + 15;
      let y = mouseY + 15;

      if (x + tooltipWidth + padding > viewportWidth) {
        x = mouseX - tooltipWidth - 15;
      }
      if (y + tooltipHeight + padding > viewportHeight) {
        y = mouseY - tooltipHeight - 15;
      }
      if (x < padding) x = padding;
      if (y < padding) y = padding;

      setPosition({ x, y });
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [star, mouseX, mouseY]);

  if (!star) return null;

  const formatRA = (value: number) => {
    const h = Math.floor(value);
    const m = Math.floor((value - h) * 60);
    const s = ((value - h) * 60 - m) * 60;
    return `${h}h ${m}m ${s.toFixed(1)}s`;
  };

  const formatDec = (value: number) => {
    const sign = value >= 0 ? '+' : '-';
    const abs = Math.abs(value);
    const d = Math.floor(abs);
    const m = Math.floor((abs - d) * 60);
    const s = ((abs - d) * 60 - m) * 60;
    return `${sign}${d}° ${m}' ${s.toFixed(1)}"`;
  };

  return (
    <div
      className={`tooltip ${visible ? 'tooltip-visible' : ''}`}
      style={{ left: position.x, top: position.y }}
    >
      <div className="tooltip-title">{star.name}</div>
      <div className="tooltip-row">
        <span className="tooltip-label">RA</span>
        <span className="tooltip-value">{formatRA(star.ra)}</span>
      </div>
      <div className="tooltip-row">
        <span className="tooltip-label">Dec</span>
        <span className="tooltip-value">{formatDec(star.dec)}</span>
      </div>
      <div className="tooltip-divider" />
      <div className="tooltip-section-title">四波段亮度</div>
      <div className="tooltip-bands">
        {star.bands.map((band) => (
          <div key={band.band} className="tooltip-band">
            <span className="tooltip-band-name">{band.band}</span>
            <span className="tooltip-band-value">{band.magnitude.toFixed(2)} mag</span>
          </div>
        ))}
      </div>
      <div className="tooltip-divider" />
      <div className="tooltip-row">
        <span className="tooltip-label">距离</span>
        <span className="tooltip-value">{star.distance.toFixed(2)} 光年</span>
      </div>
    </div>
  );
};

export default StarTooltip;
