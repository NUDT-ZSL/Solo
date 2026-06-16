import React from 'react';
import WorkCard from './WorkCard';
import { origamiWorks } from '../data';
import { useAppContext } from '../context/AppContext';

const WorkGrid: React.FC = () => {
  const { filterStyle } = useAppContext();

  const filteredWorks = filterStyle === 'all' 
    ? origamiWorks 
    : origamiWorks.filter(work => work.style === filterStyle);

  return (
    <div className="work-grid">
      {filteredWorks.map(work => (
        <WorkCard key={work.id} work={work} />
      ))}
    </div>
  );
};

export default WorkGrid;
