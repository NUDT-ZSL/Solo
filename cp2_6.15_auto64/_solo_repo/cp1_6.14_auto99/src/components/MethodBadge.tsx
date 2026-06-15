import React from 'react';
import type { HttpMethod } from '../types';

interface MethodBadgeProps {
  method: HttpMethod;
}

const methodColors: Record<HttpMethod, string> = {
  GET: 'method-get',
  POST: 'method-post',
  PUT: 'method-put',
  DELETE: 'method-delete',
};

export const MethodBadge: React.FC<MethodBadgeProps> = React.memo(({ method }) => {
  return (
    <span className={`method-badge ${methodColors[method]}`}>
      {method}
    </span>
  );
});

MethodBadge.displayName = 'MethodBadge';
