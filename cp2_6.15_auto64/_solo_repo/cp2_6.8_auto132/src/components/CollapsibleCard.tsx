import React, { useState, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleCardProps {
  title: string;
  icon: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
}

const CollapsibleCard: React.FC<CollapsibleCardProps> = ({
  title,
  icon,
  defaultOpen = true,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`collapsible-card ${isOpen ? 'open' : ''}`}>
      <button
        className="card-header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="card-title">
          {icon}
          <span>{title}</span>
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      <div className={`card-content ${isOpen ? 'visible' : ''}`}>
        {children}
      </div>
    </div>
  );
};

export default CollapsibleCard;
