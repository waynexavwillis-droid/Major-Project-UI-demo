import React, { useState, useMemo } from 'react';
import { LayoutGrid, Map as MapIcon, Box, Settings, Search, Plus, ChevronRight, Filter, Activity, AlertTriangle, CheckCircle2, Moon, Sun, Signal, Battery, XCircle } from 'lucide-react';

import { MOCK_TROLLEYS, ZONES, APP_NAME } from './constants';
import { Trolley, TabView, TrolleyStatus } from './types';
import { Button } from './components/Button';
import { StatusBadge } from './components/StatusBadge';
import { MapComponent } from './components/MapComponent';
import { HudOverlay } from './components/HudOverlay';

// --- Components for Modals ---
const ModalBackdrop = ({ children, onClose }: { children?: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
    <div className="absolute inset-0" onClick={onClose} />
    {children}
  </div>
);

const App: React.FC = () => {
  // --- State ---
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<TabView>('DASHBOARD');
  const [selectedTrolleyId, setSelectedTrolleyId] = useState<string | null>(null);
  const [trolleys, setTrolleys] = useState<Trolley[]>(MOCK_TROLLEYS);
  const [hudTarget, setHudTarget] = useState<Trolley | null>(null);
  
  // Dashboard Filters
  const [dashboardZoneFilter, setDashboardZoneFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<TrolleyStatus | 'ALL'>('ALL');
  
  // Add Beacon Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBeaconId, setNewBeaconId] = useState<string>('');
  const [newBeaconZone, setNewBeaconZone] = useState<string>('ZONE-A');

  // --- Derived State ---
  const dashboardList = useMemo(() => {
    return trolleys.filter(t => {
      // 1. Filter by Zone
      const matchZone = dashboardZoneFilter === 'ALL' || t.zoneId === dashboardZoneFilter;
      // 2. Filter by Search (ID or Name)
      const query = searchQuery.toLowerCase();
      const matchSearch = t.id.toLowerCase().includes(query) || t.name.toLowerCase().includes(query);
      // 3. Filter by Status
      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;

      return matchZone && matchSearch && matchStatus;
    });
  }, [trolleys, dashboardZoneFilter, searchQuery, statusFilter]);

  // --- Actions ---
  const handleLocate = (t: Trolley) => {
    setActiveTab('MAP');
    setSelectedTrolleyId(t.id);
  };

  const handleAddBeacon = () => {
    const autoId = `TR-${Math.floor(Math.random() * 9000) + 1000}`;
    const finalId = newBeaconId.trim() || autoId;
    
    const zone = ZONES.find(z => z.id === newBeaconZone);
    const targetZone = zone || ZONES[0];
    const center = targetZone.center;
    
    const jitterLat = (Math.random() - 0.5) * 0.0005;
    const jitterLng = (Math.random() - 0.5) * 0.0005;

    const newTrolley: Trolley = {
      id: finalId,
      name: `Unit ${finalId}`,
      status: TrolleyStatus.ACTIVE,
      batteryLevel: 100,
      lastSeen: new Date().toISOString(),
      location: {
        lat: center.lat + jitterLat,
        lng: center.lng + jitterLng
      },
      zoneId: targetZone.id,
      signalStrength: -45,
      firmware: 'v2.5.0'
    };

    setTrolleys(prev => [newTrolley, ...prev]);
    setShowAddModal(false);
    setNewBeaconId(''); 
    setNewBeaconZone('ZONE-A');
    alert(`Beacon ${finalId} activated in ${targetZone.name}`);
  };

  const handleCloseModal = () => {
      setShowAddModal(false);
      setNewBeaconId('');
  };

  // --- Renders ---

  const renderDashboard = () => (
    <div className="relative h-full p-4 pb-36 animate-fade-in flex flex-col gap-6">
      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-3 relative z-10 shrink-0">
        <div className="bg-white dark:bg-zinc-900/80 p-4 rounded-[30px] border border-zinc-100 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-lg flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute top-3 right-3 opacity-20 group-hover:opacity-50 transition-opacity text-black dark:text-white"><Box className="w-4 h-4" /></div>
          <div className="text-zinc-400 dark:text-zinc-500 text-[10px] font-mono uppercase tracking-widest mb-2">Total Beacon</div>
          <div className="text-3xl font-bold text-zinc-900 dark:text-white font-mono tracking-tighter">{trolleys.length}</div>
        </div>
        <div className="bg-white dark:bg-zinc-900/80 p-4 rounded-[30px] border border-zinc-100 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-lg flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute top-3 right-3 text-lime-500 opacity-20 group-hover:opacity-50 transition-opacity"><Activity className="w-4 h-4" /></div>
          <div className="text-zinc-400 dark:text-zinc-500 text-[10px] font-mono uppercase tracking-widest mb-2">Active</div>
          <div className="text-3xl font-bold text-lime-600 dark:text-lime-400 font-mono tracking-tighter text-shadow-glow">
            {trolleys.filter(t => t.status === TrolleyStatus.ACTIVE).length}
          </div>
        </div>
        <div className="bg-white dark:bg-zinc-900/80 p-4 rounded-[30px] border border-zinc-100 dark:border-zinc-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-lg flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute top-3 right-3 text-rose-500 opacity-20 group-hover:opacity-50 transition-opacity"><AlertTriangle className="w-4 h-4" /></div>
          <div className="text-zinc-400 dark:text-zinc-500 text-[10px] font-mono uppercase tracking-widest mb-2">Issues</div>
          <div className="text-3xl font-bold text-rose-600 dark:text-rose-400 font-mono tracking-tighter">
            {trolleys.filter(t => t.status === TrolleyStatus.MAINTENANCE).length}
          </div>
        </div>
      </div>

      {/* Search & Filters Section */}
      <div className="flex flex-col gap-4 shrink-0 relative z-10">
        {/* Search Bar */}
        <div className="relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-zinc-400" />
            <input 
                type="text" 
                placeholder="Search Beacon ID or Name..." 
                className="w-full bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-700 rounded-[24px] pl-10 pr-4 py-3 text-sm text-zinc-900 dark:text-white outline-none focus:border-lime-500 shadow-sm transition-all placeholder:text-zinc-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-3.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white">
                    <XCircle className="w-4 h-4" />
                </button>
            )}
        </div>

        {/* Status Filter Chips */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            {[
                { label: 'All Units', value: 'ALL' },
                { label: 'Active', value: TrolleyStatus.ACTIVE },
                { label: 'Maintenance', value: TrolleyStatus.MAINTENANCE },
                { label: 'Low Battery', value: TrolleyStatus.LOW_BATTERY },
                { label: 'Idle', value: TrolleyStatus.IDLE }
            ].map((chip) => (
                <button
                    key={chip.value}
                    onClick={() => setStatusFilter(chip.value as TrolleyStatus | 'ALL')}
                    className={`
                        whitespace-nowrap px-4 py-2 rounded-full text-[10px] font-bold uppercase tracking-wide border transition-all
                        ${statusFilter === chip.value 
                            ? 'bg-lime-500 text-black border-lime-400 shadow-[0_0_15px_rgba(132,204,22,0.4)]' 
                            : 'bg-white dark:bg-zinc-900/50 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-600'}
                    `}
                >
                    {chip.label}
                </button>
            ))}
        </div>
      </div>

      {/* Zone Filter Dropdown Section (Retained for specific zone filtering) */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        <div className="flex items-center justify-between px-1 mb-4 shrink-0">
          <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-100 uppercase tracking-widest flex items-center gap-2">
             <Filter className="w-4 h-4 text-lime-600 dark:text-lime-500" />
             List Overview
          </h3>
          <div className="relative group">
             <select 
              className="appearance-none bg-white dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-white text-xs font-mono py-2.5 pl-4 pr-10 rounded-[24px] focus:border-lime-500 outline-none uppercase shadow-sm dark:shadow-lg transition-all cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800"
              value={dashboardZoneFilter}
              onChange={(e) => setDashboardZoneFilter(e.target.value)}
             >
               <option value="ALL" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">All Zones</option>
               {ZONES.map(z => (
                 <option key={z.id} value={z.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">{z.name}</option>
               ))}
             </select>
             <ChevronRight className="w-3 h-3 text-zinc-500 absolute right-3 top-3.5 pointer-events-none rotate-90 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors" />
          </div>
        </div>

        {/* Scrollable List Panel */}
        <div className="flex-1 bg-white dark:bg-zinc-900/40 border border-zinc-100 dark:border-zinc-800/50 rounded-[30px] overflow-hidden shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-xl flex flex-col">
            {/* Fixed Header inside Panel */}
            <div className="bg-white dark:bg-zinc-900/80 px-5 py-4 border-b border-zinc-100 dark:border-zinc-800/50 flex justify-between items-center shrink-0">
                <span className="text-xs font-mono text-lime-600 dark:text-lime-400 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3" />
                  {dashboardList.length} UNITS FOUND
                </span>
                <span className="text-[9px] text-zinc-500 font-mono border border-zinc-100 dark:border-zinc-800 px-2 py-0.5 rounded bg-zinc-50 dark:bg-black/20">LIVE FEED</span>
            </div>
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800/50">
                    {dashboardList.length === 0 ? (
                        <div className="p-12 text-center text-zinc-400 dark:text-zinc-500 flex flex-col items-center gap-3">
                            <Search className="w-8 h-8 opacity-20" />
                            <div className="text-xs font-mono">No assets found matching criteria.</div>
                        </div>
                    ) : (
                        dashboardList.map(t => (
                        <div key={t.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-white/5 transition-all duration-200 group border-l-2 border-transparent hover:border-lime-500 cursor-pointer" onClick={() => handleLocate(t)}>
                            <div className="flex items-center gap-4">
                            <div className={`w-2.5 h-2.5 rounded-sm rotate-45 shadow-lg transition-colors duration-300 ${t.status === 'ACTIVE' ? 'bg-lime-500 shadow-lime-500/50' : 'bg-zinc-300 dark:bg-zinc-600'}`} />
                            <div>
                                <div className="text-sm font-bold text-zinc-700 dark:text-zinc-200 group-hover:text-black dark:group-hover:text-white font-mono tracking-tight">{t.id}</div>
                                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium uppercase tracking-wider mt-0.5 group-hover:text-zinc-600 dark:group-hover:text-zinc-400">{t.name}</div>
                            </div>
                            </div>
                            <div className="flex items-center gap-3">
                            <StatusBadge status={t.status} />
                            <div className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800/50 text-zinc-400 dark:text-zinc-500 group-hover:bg-lime-500 group-hover:text-black transition-all">
                                <ChevronRight className="w-4 h-4" />
                            </div>
                            </div>
                        </div>
                        ))
                    )}
                </div>
            </div>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="relative p-6 flex flex-col items-center h-full space-y-8 animate-fade-in overflow-y-auto pb-36">
      <div className="w-full max-w-md space-y-6 relative z-10 mt-12">
        <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-white dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 flex items-center justify-center shadow-lg mb-4">
                <Settings className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-zinc-900 dark:text-white font-bold text-xl">System Configuration</h3>
            <p className="text-zinc-400 dark:text-zinc-500 text-xs font-mono mt-1">v2.4.1-stable</p>
        </div>

        {/* Theme Toggle */}
        <div className="bg-white dark:bg-zinc-900/80 backdrop-blur p-4 rounded-[30px] border border-zinc-100 dark:border-zinc-800 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                    {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <div>
                    <div className="text-sm font-bold text-zinc-900 dark:text-white">Interface Theme</div>
                    <div className="text-[10px] text-zinc-500 uppercase tracking-wider">
                        {isDarkMode ? 'Dark Mode Active' : 'Light Mode Active'}
                    </div>
                </div>
            </div>
            <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${isDarkMode ? 'bg-lime-500' : 'bg-zinc-300'}`}
            >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>

        {/* Read Only Info */}
        <div className="bg-white dark:bg-zinc-900/80 backdrop-blur p-4 rounded-[30px] border border-zinc-100 dark:border-zinc-800 space-y-4 opacity-70 pointer-events-none grayscale shadow-sm">
             <div className="flex items-center justify-between">
                 <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">API ENDPOINT</span>
                 <span className="text-xs font-bold text-zinc-900 dark:text-zinc-300">api.trolleyops.io</span>
             </div>
             <div className="flex items-center justify-between">
                 <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">DATA REFRESH</span>
                 <span className="text-xs font-bold text-zinc-900 dark:text-zinc-300">30s (Real-time)</span>
             </div>
             <div className="flex items-center justify-between">
                 <span className="text-xs font-mono text-zinc-400 dark:text-zinc-500">USER ROLE</span>
                 <span className="text-xs font-bold text-zinc-900 dark:text-zinc-300">OPERATOR</span>
             </div>
        </div>

         <div className="text-center">
             <p className="font-mono text-[10px] text-zinc-400 max-w-[200px] mx-auto">
                Admin clearance required for advanced network configuration.
             </p>
         </div>
      </div>
    </div>
  );

  return (
    <div className={`${isDarkMode ? 'dark' : ''} h-full`}>
        <div className="fixed inset-0 w-full h-[100dvh] bg-[#F2F4F7] dark:bg-zinc-950 flex flex-col overflow-hidden font-sans selection:bg-lime-500/30 transition-colors duration-500">
        {hudTarget && (
            <HudOverlay target={hudTarget} onClose={() => setHudTarget(null)} />
        )}

        {/* Modal: Add Beacon */}
        {showAddModal && (
            <ModalBackdrop onClose={handleCloseModal}>
                <div className="bg-white dark:bg-zinc-900 w-full max-w-xs rounded-[30px] p-6 border border-zinc-200 dark:border-zinc-800 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-lime-500/10 flex items-center justify-center text-lime-600 dark:text-lime-500">
                            <Plus className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Add Beacon</h3>
                            <p className="text-xs text-zinc-500">Deploy new asset to grid</p>
                        </div>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div>
                            {/* FIELD 1: Beacon ID Input */}
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Beacon ID / Name</label>
                            <input 
                                type="text"
                                className="w-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-[20px] px-3 py-2.5 text-sm text-zinc-900 dark:text-white outline-none focus:border-lime-500 transition-colors placeholder:text-zinc-500"
                                placeholder="e.g. TR-1042"
                                value={newBeaconId}
                                onChange={(e) => setNewBeaconId(e.target.value)}
                            />
                        </div>

                        <div>
                            {/* FIELD 2: Zone Select (Restored) */}
                            <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Deployment Zone</label>
                            <div className="relative">
                                <select 
                                    className="w-full appearance-none bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-[20px] px-3 py-2.5 pr-10 text-sm text-zinc-900 dark:text-white outline-none focus:border-lime-500 transition-colors"
                                    value={newBeaconZone}
                                    onChange={(e) => setNewBeaconZone(e.target.value)}
                                >
                                    {ZONES.map(z => <option key={z.id} value={z.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">{z.name}</option>)}
                                </select>
                                <ChevronRight className="w-4 h-4 text-zinc-500 absolute right-3 top-3 pointer-events-none rotate-90" />
                            </div>
                        </div>

                        <div>
                             <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Firmware</label>
                             <div className="w-full bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-[20px] px-3 py-2.5 text-sm text-zinc-400 font-mono">
                                v2.5.0-stable
                             </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="ghost" className="flex-1" onClick={handleCloseModal}>Cancel</Button>
                        <Button variant="primary" className="flex-1" onClick={handleAddBeacon}>Deploy</Button>
                    </div>
                </div>
            </ModalBackdrop>
        )}

        {/* Header */}
        <header className="h-16 shrink-0 bg-white/50 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-white dark:border-zinc-800/50 flex items-center justify-between px-4 z-20 transition-colors duration-500">
            <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-lime-400 to-lime-600 rounded-[12px] flex items-center justify-center shadow-[0_4px_12px_rgba(163,230,53,0.3)]">
                <Box className="text-black w-5 h-5 stroke-[2.5px]" />
            </div>
            <div>
                <h1 className="font-black text-lg tracking-tighter text-zinc-900 dark:text-white uppercase leading-none">{APP_NAME.split(' ')[0]}</h1>
                <span className="text-[10px] font-bold text-lime-600 dark:text-lime-500 tracking-[0.2em] uppercase block">Operations</span>
            </div>
            </div>
            
            <Button 
            size="sm" 
            variant="primary" 
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowAddModal(true)}
            className="shadow-none border-transparent bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-50 dark:hover:bg-zinc-700"
            >
            ADD BEACON
            </Button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 relative overflow-hidden transition-colors duration-500">
            {activeTab === 'DASHBOARD' && renderDashboard()}
            
            <div className={`absolute inset-0 transition-opacity duration-500 ${activeTab === 'MAP' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
            <MapComponent 
                trolleys={trolleys} 
                zones={ZONES}
                selectedTrolleyId={selectedTrolleyId}
                onTrolleySelect={(id) => setSelectedTrolleyId(id === selectedTrolleyId ? null : id)}
                theme="dark" // FORCE MAP TO ALWAYS BE DARK
            />
            
            {/* Map Selected Card */}
            {selectedTrolleyId && activeTab === 'MAP' && (
                <div className="absolute bottom-32 left-4 right-4 z-[1000]">
                    <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-zinc-200 dark:border-white/10 p-5 rounded-[30px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)] animate-slide-up ring-1 ring-black/5 dark:ring-white/5">
                    <div className="flex justify-between items-start mb-5">
                        <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-lime-100 dark:bg-lime-500/10 flex items-center justify-center border border-lime-500/20">
                            <Activity className="w-5 h-5 text-lime-600 dark:text-lime-500" />
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-lime-600 dark:text-lime-500 uppercase tracking-widest mb-0.5">Target Locked</div>
                            <div className="text-2xl font-bold text-zinc-900 dark:text-white tracking-tight font-mono">{selectedTrolleyId}</div>
                            <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-pulse"></span>
                            Online • {trolleys.find(t => t.id === selectedTrolleyId)?.zoneId || 'Unknown Zone'}
                            </div>
                        </div>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setSelectedTrolleyId(null)} className="h-8 w-8 p-0 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800">
                            <XIcon />
                        </Button>
                    </div>
                    <Button 
                        className="w-full font-bold uppercase tracking-widest text-sm py-3.5" 
                        variant="primary"
                        onClick={() => {
                            const t = trolleys.find(x => x.id === selectedTrolleyId);
                            if(t) setHudTarget(t);
                        }}
                    >
                        Start Tracking
                    </Button>
                    </div>
                </div>
            )}
            </div>

            {activeTab === 'SETTINGS' && renderSettings()}
        </main>

        {/* Floating Dock Navigation */}
        {/* INCREASED Z-INDEX TO 1500 TO PREVENT MAP ZOOMING FROM HIDING IT */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1500]">
          <nav className="bg-[#1C1C1E] p-2 rounded-full shadow-2xl flex items-center gap-2 border border-white/5 ring-1 ring-black/20">
            <NavBtn 
              active={activeTab === 'DASHBOARD'} 
              onClick={() => setActiveTab('DASHBOARD')} 
              icon={<LayoutGrid />} 
            />
            <NavBtn 
              active={activeTab === 'MAP'} 
              onClick={() => setActiveTab('MAP')} 
              icon={<MapIcon />} 
            />
            <NavBtn 
              active={activeTab === 'SETTINGS'} 
              onClick={() => setActiveTab('SETTINGS')} 
              icon={<Settings />} 
            />
          </nav>
        </div>
        </div>
    </div>
  );
};

// Simplified Icon-Only Nav Button for floating dock
const NavBtn: React.FC<{active: boolean; onClick: () => void; icon: React.ReactElement<any>}> = ({ active, onClick, icon }) => (
  <button 
    onClick={onClick}
    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${active ? 'bg-lime-400 text-black shadow-[0_0_20px_rgba(163,230,53,0.4)] scale-105' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'}`}
  >
    {React.cloneElement(icon, { size: 24, strokeWidth: active ? 2.5 : 2 })}
  </button>
);

// Helper icon for the close button
const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

export default App;