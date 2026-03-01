import React from 'react';

interface StatusBadgeProps {
  status: string;
  type: 'payment' | 'report' | 'account';
}

const STATUS_MAP: Record<string, Record<string, { label: string; className: string }>> = {
  payment: {
    pending: { label: 'Pending', className: 'badge-pill badge-warning' },
    confirmed: { label: 'Confirmed', className: 'badge-pill badge-success' },
    failed: { label: 'Failed', className: 'badge-pill badge-danger' },
  },
  report: {
    not_uploaded: { label: 'No Report', className: 'badge-pill badge-neutral' },
    uploaded: { label: 'Report Ready', className: 'badge-pill badge-info' },
    completed: { label: 'Completed', className: 'badge-pill badge-success' },
  },
  account: {
    true: { label: 'Active', className: 'badge-pill badge-success' },
    false: { label: 'Inactive', className: 'badge-pill badge-danger' },
  },
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type }) => {
  const config = STATUS_MAP[type]?.[String(status)] || { label: status, className: 'badge-pill badge-neutral' };
  return <span className={config.className}>{config.label}</span>;
};

export default StatusBadge;
