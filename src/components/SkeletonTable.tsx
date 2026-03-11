import React from 'react';

const SkeletonTable: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 5 }) => {
  return (
    <div className="w-full">
      <div className="flex gap-4 px-4 py-3 border-b border-border">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-3 bg-muted rounded animate-skeleton-pulse" style={{ width: `${100 / cols}%` }} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-4 py-4 border-b border-border">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className="h-3 bg-muted rounded animate-skeleton-pulse"
              style={{ width: `${Math.random() * 30 + 40}%`, animationDelay: `${(r * cols + c) * 0.05}s` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

export default SkeletonTable;
