import React from 'react';
import { TrolleyStatus } from '../types';

export const StatusBadge: React.FC<{ status: TrolleyStatus }> = ({ status }) => {
  const styles = {
    [TrolleyStatus.ACTIVE]: "bg-lime-500/10 text-lime-400 border-lime-500/30 shadow-[0_0_10px_rgba(132,204,22,0.1)]",
    [TrolleyStatus.IDLE]: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
    [TrolleyStatus.MAINTENANCE]: "bg-rose-500/10 text-rose-400 border-rose-500/30 shadow-[0_0_10px_rgba(244,63,94,0.1)] animate-pulse",
    [TrolleyStatus.LOW_BATTERY]: "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]",
    [TrolleyStatus.LOST]: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  };

  return (
    <span className={`px-2.5 py-1 text-[9px] font-mono font-bold uppercase border rounded-md tracking-wider backdrop-blur-sm ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
};