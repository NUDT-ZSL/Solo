import React from 'react';
import { MethodBadge } from './MethodBadge';
import { formatRelativeTime } from '../utils';
import type { Endpoint } from '../types';

interface EndpointCardProps {
  endpoint: Endpoint;
  onClick: () => void;
}

export const EndpointCard: React.FC<EndpointCardProps> = React.memo(({ endpoint, onClick }) => {
  return (
    <div className="endpoint-card" onClick={onClick}>
      <MethodBadge method={endpoint.method} />
      <div className="endpoint-path">{endpoint.path}</div>
      <div className="endpoint-time">
        {formatRelativeTime(endpoint.updatedAt)}
      </div>
    </div>
  );
});

EndpointCard.displayName = 'EndpointCard';
