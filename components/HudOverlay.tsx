import React, { useState, useEffect } from 'react';
import { Trolley } from '../types';
import { ArrowUp, Locate, X, Wifi, Battery, Radar } from 'lucide-react';
import { Button } from './Button';

interface HudProps {
  target: Trolley;
  onClose: () => void;
}

export const HudOverlay: React.FC<HudProps> = ({ target, onClose }) => {
  const [distance, setDistance] = useState(145);
  const [rssi, setRssi] = useState(target.signalStrength);

  // Simulate live data
  useEffect(() => {
    const interval = setInterval(() => {
      setDistance(prev => Math.max(0, prev - Math.random() * 2 + 0.5));
      setRssi(prev => Math.min(-30, Math.max(-90, prev + (Math.random() * 10 - 5))));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const signalPercent = Math.min(100, Math.max(0, (rssi + 100) * 2));

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-black text-white animate-fade-in font-mono">
      {/* Background Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />

      {/* Top HUD Bar */}
      <div className="relative z-10 pt-safe p-4 flex justify-between items-start bg-gradient-to-b from-zinc-900/90 to-transparent backdrop-blur-md">
        <div>
          <div className="flex items-center gap-2 text-emerald-500 mb-1 animate-pulse">
            <Radar className="w-4 h-4" />
            <span className="text-xs font-bold tracking-widest uppercase">Signal Locked</span>
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tighter">{target.id}</h2>
          <div className="text-xs text-zinc-500 mt-1 tracking-widest uppercase">{target.zoneId || 'Unknown Sector'}</div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} className="bg-zinc-900/50 border border-zinc-800 hover:border-zinc-600 backdrop-blur">
          <X className="w-6 h-6 text-white" />
        </Button>
      </div>

      {/* Central AR View */}
      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        {/* Radar Elements */}
        <div className="absolute border border-emerald-500/20 rounded-full w-[28rem] h-[28rem] animate-pulse-ring" />
        <div className="absolute border border-zinc-800 rounded-full w-64 h-64" />
        <div className="absolute border border-zinc-800 rounded-full w-96 h-96" />
        <div className="absolute border-l border-r border-zinc-800/50 h-full w-px" />
        <div className="absolute border-t border-b border-zinc-800/50 w-full h-px" />
        
        {/* Scanner Sweep */}
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/10 to-transparent h-1/2 w-full animate-radar origin-bottom-right opacity-50" />

        {/* Directional Arrow */}
        <div className="relative z-10 flex flex-col items-center group cursor-pointer transition-transform hover:scale-105">
          <div className="relative">
             <ArrowUp className="w-32 h-32 text-emerald-500 filter drop-shadow-[0_0_15px_rgba(16,185,129,0.6)]" />
             <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-12 w-1 h-12 bg-gradient-to-t from-emerald-500 to-transparent opacity-50"></div>
          </div>
          <div className="mt-6 flex items-end gap-2">
             <span className="text-6xl font-bold tracking-tighter text-white tabular-nums leading-none">{Math.round(distance)}</span>
             <span className="text-xl text-zinc-500 font-bold mb-2">M</span>
          </div>
          <div className="text-xs text-emerald-500/70 uppercase tracking-[0.2em] mt-2">Distance to Target</div>
        </div>
      </div>

      {/* Bottom Telemetry */}
      <div className="relative z-10 bg-zinc-900/90 border-t border-white/10 backdrop-blur-xl pb-safe p-6 rounded-t-3xl shadow-[0_-10px_50px_rgba(0,0,0,0.7)]">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-black/50 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold mb-3 uppercase tracking-widest">
              <Wifi className="w-3 h-3" />
              Signal Strength
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden mb-2 relative">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/10"></div>
              <div 
                className="h-full bg-emerald-500 transition-all duration-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                style={{ width: `${signalPercent}%` }} 
              />
            </div>
            <div className="text-right text-xs text-emerald-400">{Math.round(rssi)} dBm</div>
          </div>

          <div className="bg-black/50 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-zinc-500 text-[10px] font-bold mb-3 uppercase tracking-widest">
              <Battery className="w-3 h-3" />
              Battery Level
            </div>
            <div className="flex items-end justify-between">
               <div className="text-2xl font-bold text-white">
                 {target.batteryLevel}%
               </div>
               <div className={`text-[10px] px-2 py-0.5 rounded border ${target.batteryLevel > 20 ? 'border-emerald-500/30 text-emerald-400' : 'border-rose-500/30 text-rose-400'}`}>
                 {target.batteryLevel > 20 ? 'OPTIMAL' : 'CRITICAL'}
               </div>
            </div>
          </div>
        </div>

        <Button 
          variant="primary" 
          className="w-full py-4 text-base tracking-widest uppercase font-bold"
          onClick={() => {
            alert('Trolley Retrieved successfully.');
            onClose();
          }}
        >
          <Locate className="w-5 h-5 mr-2" />
          Confirm Visual
        </Button>
      </div>
    </div>
  );
};