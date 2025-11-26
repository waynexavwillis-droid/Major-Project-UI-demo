import React from 'react';
import { TrolleyStatus } from '../types';

export const StatusBadge: React.FC<{ status: TrolleyStatus }> = ({ status }) => {
  const styles = {
    // Light: Solid high contrast or soft pastel. Dark: Neon glow.
    [TrolleyStatus.ACTIVE]: "bg-readex-green text-readex-black border-transparent dark:bg-lime-500/10 dark:text-lime-400 dark:border-lime-500/30 dark:shadow-[0_0_10px_rgba(132,204,22,0.1)]",
    [TrolleyStatus.IDLE]: "bg-gray-200 text-gray-600 border-transparent dark:bg-zinc-500/10 dark:text-zinc-400 dark:border-zinc-500/30",
    [TrolleyStatus.MAINTENANCE]: "bg-red-100 text-red-700 border-transparent dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/30 dark:shadow-[0_0_10px_rgba(244,63,94,0.1)] dark:animate-pulse",
    [TrolleyStatus.LOW_BATTERY]: "bg-amber-100 text-amber-700 border-transparent dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30 dark:shadow-[0_0_10px_rgba(245,158,11,0.1)]",
    [TrolleyStatus.LOST]: "bg-purple-100 text-purple-700 border-transparent dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/30",
  };

  return (
    <span className={`px-2.5 py-1 text-[9px] font-mono font-bold uppercase border rounded-md tracking-wider backdrop-blur-sm ${styles[status]}`}>
      {status.replace('_', ' ')}
    </span>
  );
};