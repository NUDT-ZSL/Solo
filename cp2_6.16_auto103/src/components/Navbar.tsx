import React from 'react';

interface NavbarProps {
  ra: number;
  dec: number;
}

const Navbar: React.FC<NavbarProps> = ({ ra, dec }) => {
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
    <nav className="navbar">
      <div className="navbar-left">
        <span className="app-name">多波段星图</span>
      </div>
      <div className="navbar-right">
        <div className="coord-display">
          <span className="coord-label">RA</span>
          <span className="coord-value">{formatRA(ra)}</span>
        </div>
        <div className="coord-display">
          <span className="coord-label">Dec</span>
          <span className="coord-value">{formatDec(dec)}</span>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
