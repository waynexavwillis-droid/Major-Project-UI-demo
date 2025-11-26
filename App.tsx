
import React, { useState, useMemo, useEffect } from 'react';
import { LayoutGrid, Map as MapIcon, Box, Settings, Search, Plus, ChevronRight, Filter, Activity, AlertTriangle, CheckCircle2, Moon, Sun, Signal, Battery, XCircle, Crosshair, Trash2, MapPin, List, ArrowUp, Zap } from 'lucide-react';

import { APP_NAME } from './constants';
import { Trolley, TabView, TrolleyStatus, Zone, ZoneType } from './types';
import { Button } from './components/Button';
import { MapComponent } from './components/MapComponent';
import { HudOverlay } from './components/HudOverlay';
import { db } from './firebase';
import { StatusBadge } from './components/StatusBadge';

// --- Components for Modals ---
const ModalBackdrop = ({ children, onClose }: { children?: React.ReactNode; onClose: () => void }) => (
  <div className="fixed inset-0 z-[2000] bg-black/20 dark:bg-black/60 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
    <div className="absolute inset-0" onClick={onClose} />
    {children}
  </div>
);

const App: React.FC = () => {
  // --- State ---
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [activeTab, setActiveTab] = useState<TabView>('DASHBOARD');
  const [selectedTrolleyId, setSelectedTrolleyId] = useState<string | null>(null);
  const [trolleys, setTrolleys] = useState<Trolley[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [hudTarget, setHudTarget] = useState<Trolley | null>(null);
  
  // Dashboard Filter State
  const [dashboardCategory, setDashboardCategory] = useState<string>('ALL');

  // Filters (Shared for Map List)
  const [listZoneFilter, setListZoneFilter] = useState<string>('ALL');

  // Unified Search State (Controls both Map Search Bar and List Filter)
  const [mapSearchQuery, setMapSearchQuery] = useState<string>('');
  
  // Add Beacon Logic
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBeaconId, setNewBeaconId] = useState<string>('');
  const [newBeaconZone, setNewBeaconZone] = useState<string>('ZONE-A');
  
  // Add Zone Logic
  const [showZoneModal, setShowZoneModal] = useState(false);
  const [newZoneId, setNewZoneId] = useState<string>('');
  const [newZoneName, setNewZoneName] = useState<string>('');

  // Placement State
  const [placementMode, setPlacementMode] = useState<'BEACON' | 'ZONE' | null>(null);
  const [pendingBeaconData, setPendingBeaconData] = useState<{id: string, zoneId: string} | null>(null);
  const [pendingZoneData, setPendingZoneData] = useState<{id: string, name: string} | null>(null);

  // --- Firebase Listeners ---
  useEffect(() => {
    if (!db) {
        console.error("Firebase not initialized");
        return;
    }

    const trackingRef = db.ref('/Tracking');
    const zonesRef = db.ref('/Zones');

    // Listener for Trolleys
    const handleTrackingUpdate = (snapshot: any) => {
        const data = snapshot.val();
        if (!data) {
            setTrolleys([]);
            return;
        }

        const loadedTrolleys: Trolley[] = Object.keys(data).map(key => {
            const raw = data[key];
            const lastSeenDate = raw.timestamp ? new Date(raw.timestamp) : new Date();
            const isRecent = (Date.now() - lastSeenDate.getTime()) < 1000 * 60 * 60;
            
            let status = TrolleyStatus.ACTIVE;
            if (!isRecent) {
                status = TrolleyStatus.LOST;
            } else if (raw.battery && raw.battery < 20) {
                status = TrolleyStatus.LOW_BATTERY;
            }

            return {
                id: key,
                name: `Unit ${key}`,
                status: status,
                batteryLevel: raw.battery || 100,
                lastSeen: raw.timestamp || new Date().toISOString(),
                location: {
                    lat: parseFloat(raw.latitude || raw.lat || 0),
                    lng: parseFloat(raw.longitude || raw.lng || 0)
                },
                zoneId: raw.zoneId || null,
                signalStrength: raw.rssi || -60,
                firmware: 'v2.5.0'
            };
        });

        setTrolleys(loadedTrolleys);
    };

    // Listener for Zones
    const handleZonesUpdate = (snapshot: any) => {
        const data = snapshot.val();
        if (!data) {
            setZones([]); 
            return;
        }

        const newZonesList: Zone[] = [];
        Object.keys(data).forEach(key => {
            const raw = data[key];
            const center = {
                lat: parseFloat(raw.centerLat || 0),
                lng: parseFloat(raw.centerLng || 0)
            };
            newZonesList.push({
                id: key,
                name: raw.name || `Zone ${key}`,
                type: ZoneType.PARKING,
                center,
                radius: 40,
                capacity: 50,
                currentCount: 0
            });
        });
        
        setZones(newZonesList);
    };

    trackingRef.on('value', handleTrackingUpdate);
    zonesRef.on('value', handleZonesUpdate);

    return () => {
        trackingRef.off('value', handleTrackingUpdate);
        zonesRef.off('value', handleZonesUpdate);
    };
  }, []);

  // --- Actions ---
  const handleLocate = (t: Trolley) => {
    setActiveTab('MAP');
    setSelectedTrolleyId(t.id);
  };

  const handleStartBeaconPlacement = () => {
    const autoId = `TR-${Math.floor(Math.random() * 9000) + 1000}`;
    const finalId = newBeaconId.trim() || autoId;
    
    setPendingBeaconData({ id: finalId, zoneId: newBeaconZone });
    setPlacementMode('BEACON');

    setShowAddModal(false);
    setActiveTab('MAP');
    setNewBeaconId('');
  };

  const handleStartZonePlacement = () => {
      if (!newZoneName.trim()) {
          alert("Please enter a zone name");
          return;
      }
      const autoId = `Z-${Math.floor(Date.now() / 1000).toString(16).toUpperCase()}`;
      const finalId = newZoneId.trim() || autoId;

      setPendingZoneData({ id: finalId, name: newZoneName });
      setPlacementMode('ZONE');
      setShowZoneModal(false);
      setActiveTab('MAP');
      setNewZoneName('');
      setNewZoneId('');
  };

  const handleMapClick = (lat: number, lng: number) => {
    if (!db) return;

    if (placementMode === 'BEACON' && pendingBeaconData) {
        db.ref(`/Tracking/${pendingBeaconData.id}`).set({
            zoneId: pendingBeaconData.zoneId,
            latitude: lat,
            longitude: lng,
            rssi: -(Math.floor(Math.random() * 40) + 40),
            battery: 100,
            timestamp: new Date().toISOString()
        }).then(() => {
            console.log("Beacon placed successfully");
        }).catch(err => {
            console.error("Firebase Write Error: ", err);
            alert("Failed to write to database. Check console/permissions.");
        });

        setPlacementMode(null);
        setPendingBeaconData(null);

    } else if (placementMode === 'ZONE' && pendingZoneData) {
        db.ref('/Zones').child(pendingZoneData.id).set({
            name: pendingZoneData.name,
            centerLat: lat,
            centerLng: lng
        }).then(() => {
            console.log("Zone created successfully");
        }).catch(err => {
            console.error("Firebase Write Error: ", err);
            alert("Failed to create zone.");
        });

        setPlacementMode(null);
        setPendingZoneData(null);
    }
  };

  const handleDeleteBeacon = (id: string) => {
      if (!db || !window.confirm(`Delete beacon ${id}?`)) return;
      db.ref(`/Tracking/${id}`).remove();
      if (selectedTrolleyId === id) setSelectedTrolleyId(null);
  };
  
  const handleDeleteZone = (id: string) => {
      if (!window.confirm(`Are you sure you want to delete Zone "${id}"?`)) return;

      if (!db) {
        alert("Database connection not ready.");
        return;
      }

      setZones(prev => prev.filter(z => z.id !== id));

      db.ref('Zones').update({ [id]: null })
        .then(() => {
          console.log(`Zone ${id} successfully deleted.`);
          return db.ref('/Tracking').orderByChild('zoneId').equalTo(id).once('value');
        })
        .then((snapshot: any) => {
          const updates: Record<string, any> = {};
          
          snapshot.forEach((childSnap: any) => {
             updates[`/Tracking/${childSnap.key}/zoneId`] = null; 
          });

          if (Object.keys(updates).length > 0) {
            return db.ref().update(updates);
          }
          return null;
        })
        .catch((error: any) => {
          console.error("Delete failed:", error);
          alert(`Failed to delete zone: ${error.message}`);
        });
  };

  const handleCloseModal = () => {
      setShowAddModal(false);
      setShowZoneModal(false);
      setNewBeaconId('');
      setNewZoneName('');
      setNewZoneId('');
  };

  // --- Derived State for Lists ---
  const filteredTrolleys = useMemo(() => {
    return trolleys.filter(t => {
      const matchZone = listZoneFilter === 'ALL' || t.zoneId === listZoneFilter;
      const query = mapSearchQuery.toLowerCase();
      const matchSearch = t.id.toLowerCase().includes(query) || t.name.toLowerCase().includes(query);
      return matchZone && matchSearch;
    });
  }, [trolleys, listZoneFilter, mapSearchQuery]);

  // --- Render Functions ---

  const renderDashboard = () => {
    const dashboardTrolleys = trolleys.filter(t => 
        dashboardCategory === 'ALL' || t.zoneId === dashboardCategory
    );

    const getGradient = (index: number) => {
        const gradients = [
            'bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500', 
            'bg-gradient-to-br from-orange-400 via-pink-500 to-rose-500',
            'bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500',
            'bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-500'
        ];
        return gradients[index % gradients.length];
    };

    return (
        <div className="h-full flex flex-col pb-36 animate-fade-in overflow-hidden bg-gray-50 dark:bg-zinc-950">
            {/* Header Area */}
            <div className="flex-none pt-6 px-6 pb-2">
                 <h2 className="text-2xl font-black text-readex-black dark:text-white mb-4 tracking-tighter uppercase">Operations</h2>
                 
                 {/* Yellow Hero Card - Total Beacons */}
                 <div className="w-full bg-[#E2F700] rounded-[32px] p-6 mb-8 relative overflow-hidden shadow-lg group transition-transform active:scale-95 duration-200">
                    <div className="relative z-10 flex justify-between items-start">
                        <div className="flex flex-col">
                            <span className="text-xs font-bold text-black uppercase tracking-widest mb-1 opacity-70">Fleet Status</span>
                            <span className="text-6xl font-black text-black tracking-tighter leading-none">{trolleys.length}</span>
                            <span className="text-sm font-bold text-black mt-2">Active Beacons Online</span>
                        </div>
                        <div className="bg-black/10 p-3 rounded-full">
                            <Activity className="w-6 h-6 text-black" />
                        </div>
                    </div>
                    {/* Decorative waves */}
                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/20 blur-3xl rounded-full"></div>
                 </div>

                 {/* Zone Filters - Pill Style */}
                 <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 mask-linear-fade">
                    {/* ALL Button */}
                    <button 
                        onClick={() => setDashboardCategory('ALL')}
                        className={`flex items-center gap-2 px-5 py-3 rounded-full border transition-all duration-300 whitespace-nowrap ${
                            dashboardCategory === 'ALL' 
                            ? 'bg-[#E2F700] border-[#E2F700] text-black shadow-[0_0_20px_rgba(226,247,0,0.3)]' 
                            : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-700'
                        }`}
                    >
                        <span className="text-sm font-bold">All Zones</span>
                    </button>

                    {/* Zone Buttons */}
                    {zones.map((z) => {
                        const count = trolleys.filter(t => t.zoneId === z.id).length;
                        const isActive = dashboardCategory === z.id;
                        return (
                            <button 
                                key={z.id}
                                onClick={() => setDashboardCategory(z.id)}
                                className={`flex items-center gap-2 px-5 py-3 rounded-full border transition-all duration-300 whitespace-nowrap group ${
                                    isActive 
                                    ? 'bg-[#E2F700] border-[#E2F700] text-black shadow-[0_0_20px_rgba(226,247,0,0.3)]' 
                                    : 'bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-500 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-700'
                                }`}
                            >
                                <span className="text-sm font-bold">{z.name}</span>
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                    isActive 
                                    ? 'bg-black/10 text-black' 
                                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500 group-hover:bg-gray-200 dark:group-hover:bg-zinc-700'
                                }`}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                 </div>
            </div>

            {/* List Header */}
            <div className="flex-none px-6 py-2 flex justify-between items-center mt-2">
                <h3 className="text-lg font-bold text-readex-black dark:text-white tracking-tight">Active Results</h3>
            </div>

            {/* Cards List Scroll */}
            <div className="flex-1 overflow-y-auto px-6 py-2 space-y-4 no-scrollbar pb-32">
                {dashboardTrolleys.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400 dark:text-zinc-600">
                        <Activity className="w-12 h-12 mb-2 opacity-50" />
                        <p className="text-sm font-medium">No beacons in this zone</p>
                    </div>
                ) : (
                    dashboardTrolleys.map((t, index) => (
                        <div 
                            key={t.id}
                            onClick={() => handleLocate(t)}
                            className={`w-full ${getGradient(index)} rounded-[32px] p-6 relative overflow-hidden shadow-xl group cursor-pointer transition-transform duration-300 hover:scale-[1.02]`}
                        >
                            {/* Abstract Background Shapes */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                            
                            <div className="flex justify-between items-start relative z-10">
                                <div>
                                    <h4 className="text-2xl font-bold text-white tracking-tight mb-1">{t.name}</h4>
                                    <p className="text-white/70 text-sm font-medium mb-5">{t.zoneId ? zones.find(z => z.id === t.zoneId)?.name : 'Unassigned Zone'}</p>
                                    
                                    <div className="flex gap-2">
                                        <div className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs text-white font-medium border border-white/10">
                                            <Battery className="w-3.5 h-3.5" />
                                            {t.batteryLevel}%
                                        </div>
                                        <div className="bg-white/20 backdrop-blur-md rounded-full px-3 py-1.5 flex items-center gap-1.5 text-xs text-white font-medium border border-white/10">
                                            <Signal className="w-3.5 h-3.5" />
                                            {t.signalStrength}
                                        </div>
                                    </div>

                                    <div className="mt-6 text-3xl font-bold text-white flex items-end gap-1">
                                        <span className="text-sm opacity-80 mb-1 font-medium bg-black/20 px-2 py-0.5 rounded">ID</span>
                                        <span className="tracking-tighter">{t.id.replace('TR-', '')}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-end gap-4">
                                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg transform -rotate-45 group-hover:rotate-0 transition-transform duration-300 text-black">
                                        <ArrowUp className="w-5 h-5 stroke-[3px]" />
                                    </div>
                                    
                                    {/* 3D-like Icon representation */}
                                    <div className="mt-2 opacity-90 drop-shadow-2xl filter transform group-hover:scale-110 transition-transform duration-500">
                                        <Box className="w-28 h-28 text-white/90 stroke-1" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
  };

  const renderSettings = () => (
    <div className="relative p-6 flex flex-col items-center h-full space-y-8 animate-fade-in overflow-y-auto pb-36">
      <div className="w-full max-w-md space-y-6 relative z-10 mt-12">
        <div className="text-center mb-8">
            <div className="w-20 h-20 mx-auto rounded-full bg-readex-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-800 flex items-center justify-center shadow-lg mb-4">
                <Settings className="w-8 h-8 text-readex-black dark:text-zinc-500" />
            </div>
            <h3 className="text-readex-black dark:text-white font-bold text-xl">System Configuration</h3>
            <p className="text-gray-400 dark:text-zinc-500 text-xs font-mono mt-1">Firebase Connected</p>
        </div>

        {/* Theme Card */}
        <div className="bg-readex-white dark:bg-zinc-900/80 backdrop-blur p-4 rounded-[30px] border border-gray-200 dark:border-zinc-800 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400">
                    {isDarkMode ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </div>
                <div>
                    <div className="text-sm font-bold text-readex-black dark:text-white">Interface Theme</div>
                    <div className="text-[10px] text-gray-500 dark:text-zinc-500 uppercase tracking-wider">
                        {isDarkMode ? 'Dark Mode Active' : 'Light Mode Active'}
                    </div>
                </div>
            </div>
            <button 
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${isDarkMode ? 'bg-lime-500' : 'bg-readex-green'}`}
            >
                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-300 ${isDarkMode ? 'translate-x-6' : 'translate-x-0'}`} />
            </button>
        </div>

        {/* Zone Management Card */}
        <div className="bg-readex-white dark:bg-zinc-900/80 backdrop-blur rounded-[30px] border border-gray-200 dark:border-zinc-800 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                 <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 dark:text-zinc-400" />
                    <span className="text-sm font-bold text-readex-black dark:text-white">Zone Management</span>
                 </div>
                 <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-readex-green dark:hover:bg-lime-500 hover:text-black" onClick={() => setShowZoneModal(true)}>
                    <Plus className="w-4 h-4" />
                 </Button>
            </div>
            <div className="max-h-60 overflow-y-auto no-scrollbar">
                {zones.length === 0 ? (
                    <div className="p-6 text-center text-xs text-gray-400 dark:text-zinc-400">No zones configured.</div>
                ) : (
                    zones.map(z => (
                        <div key={z.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 group border-b border-gray-100 dark:border-zinc-800/50 last:border-0 relative">
                            <div>
                                <div className="text-sm font-bold text-gray-700 dark:text-zinc-300">{z.name}</div>
                                <div className="text-[9px] font-mono text-gray-400 dark:text-zinc-400">{z.id}</div>
                            </div>
                            <Button 
                                type="button"
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDeleteZone(z.id)}
                                className="h-8 w-8 p-0 rounded-full hover:bg-red-50 text-gray-400 hover:text-red-500 dark:hover:bg-rose-500/20 dark:text-zinc-400 dark:hover:text-rose-500"
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))
                )}
            </div>
        </div>

        {/* Status Card */}
        <div className="bg-readex-white dark:bg-zinc-900/80 backdrop-blur p-4 rounded-[30px] border border-gray-200 dark:border-zinc-800 space-y-4 opacity-90 shadow-sm">
             <div className="flex items-center justify-between">
                 <span className="text-xs font-mono text-gray-400 dark:text-zinc-500">BACKEND</span>
                 <span className="text-xs font-bold text-readex-green dark:text-lime-500">Firebase RTDB</span>
             </div>
             <div className="flex items-center justify-between">
                 <span className="text-xs font-mono text-gray-400 dark:text-zinc-500">SYNC STATUS</span>
                 <span className="text-xs font-bold text-readex-black dark:text-zinc-300">Live Socket</span>
             </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`${isDarkMode ? 'dark' : ''} h-full`}>
        <div className="fixed inset-0 w-full h-[100dvh] bg-readex-bg dark:bg-zinc-950 flex flex-col overflow-hidden font-sans selection:bg-readex-green/30 dark:selection:bg-lime-500/30 transition-colors duration-500">
        
        {hudTarget && (
            <HudOverlay target={hudTarget} onClose={() => setHudTarget(null)} />
        )}

        {/* Modals for Adding Beacon/Zone */}
        {showAddModal && (
            <ModalBackdrop onClose={handleCloseModal}>
                <div className="bg-readex-white dark:bg-zinc-900 w-full max-w-xs rounded-[30px] p-6 border border-gray-200 dark:border-zinc-800 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-readex-green/20 dark:bg-lime-500/10 flex items-center justify-center text-readex-black dark:text-lime-500">
                            <Plus className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-readex-black dark:text-white">Add Beacon</h3>
                            <p className="text-xs text-gray-500 dark:text-zinc-500">Deploy new asset to grid</p>
                        </div>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-500 mb-1.5 block">Beacon ID / Name</label>
                            <input 
                                type="text"
                                className="w-full bg-readex-input dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-[20px] px-3 py-2.5 text-sm text-readex-black dark:text-white outline-none focus:border-readex-green dark:focus:border-lime-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                                placeholder="e.g. TR-1042"
                                value={newBeaconId}
                                onChange={(e) => setNewBeaconId(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-500 mb-1.5 block">Deployment Zone</label>
                            <div className="relative">
                                <select 
                                    className="w-full appearance-none bg-readex-input dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-[20px] px-3 py-2.5 pr-10 text-sm text-readex-black dark:text-white outline-none focus:border-readex-green dark:focus:border-lime-500 transition-colors"
                                    value={newBeaconZone}
                                    onChange={(e) => setNewBeaconZone(e.target.value)}
                                >
                                    {zones.map(z => <option key={z.id} value={z.id} className="dark:bg-zinc-900">{z.name}</option>)}
                                </select>
                                <ChevronRight className="w-4 h-4 text-gray-500 dark:text-zinc-500 absolute right-3 top-3 pointer-events-none rotate-90" />
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="ghost" className="flex-1" onClick={handleCloseModal}>Cancel</Button>
                        <Button variant="primary" className="flex-1" onClick={handleStartBeaconPlacement}>Deploy</Button>
                    </div>
                </div>
            </ModalBackdrop>
        )}

        {showZoneModal && (
            <ModalBackdrop onClose={handleCloseModal}>
                <div className="bg-readex-white dark:bg-zinc-900 w-full max-w-xs rounded-[30px] p-6 border border-gray-200 dark:border-zinc-800 shadow-2xl animate-slide-up" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 rounded-full bg-readex-green/20 dark:bg-lime-500/10 flex items-center justify-center text-readex-black dark:text-lime-500">
                            <MapPin className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-readex-black dark:text-white">Add Zone</h3>
                            <p className="text-xs text-gray-500 dark:text-zinc-500">Create new geofence</p>
                        </div>
                    </div>

                    <div className="space-y-4 mb-6">
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-500 mb-1.5 block">Zone ID (Optional)</label>
                            <input 
                                type="text"
                                className="w-full bg-readex-input dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-[20px] px-3 py-2.5 text-sm text-readex-black dark:text-white outline-none focus:border-readex-green dark:focus:border-lime-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-zinc-500 font-mono"
                                placeholder="e.g. ZONE-E"
                                value={newZoneId}
                                onChange={(e) => setNewZoneId(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-500 mb-1.5 block">Zone Name</label>
                            <input 
                                type="text"
                                className="w-full bg-readex-input dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-[20px] px-3 py-2.5 text-sm text-readex-black dark:text-white outline-none focus:border-readex-green dark:focus:border-lime-500 transition-colors placeholder:text-gray-400 dark:placeholder:text-zinc-500"
                                placeholder="e.g. Arrival Hall B"
                                value={newZoneName}
                                onChange={(e) => setNewZoneName(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <Button variant="ghost" className="flex-1" onClick={handleCloseModal}>Cancel</Button>
                        <Button variant="primary" className="flex-1" onClick={handleStartZonePlacement}>Next</Button>
                    </div>
                </div>
            </ModalBackdrop>
        )}

        {/* PLACEMENT MODE BANNER */}
        {placementMode && (
             <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[2000] bg-readex-green dark:bg-lime-500 text-black px-6 py-3 rounded-full shadow-2xl animate-slide-up flex items-center gap-3 border-2 border-white/20">
                 <Crosshair className="w-5 h-5 animate-spin-slow" />
                 <span className="font-bold text-sm tracking-wide uppercase">
                     {placementMode === 'BEACON' 
                        ? `Tap map to place ${pendingBeaconData?.id}`
                        : `Tap map to set center for ${pendingZoneData?.name}`
                     }
                 </span>
                 <button onClick={() => { setPlacementMode(null); setPendingBeaconData(null); setPendingZoneData(null); }} className="bg-black/20 rounded-full p-1 hover:bg-black/40 ml-2"><XIcon /></button>
             </div>
        )}

        {/* Header */}
        <header className="h-16 shrink-0 bg-white/50 dark:bg-zinc-950/80 backdrop-blur-xl border-b border-white dark:border-zinc-800/50 flex items-center justify-between px-4 z-20 transition-colors duration-500">
            <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-readex-green dark:bg-gradient-to-br dark:from-lime-400 dark:to-lime-600 rounded-[12px] flex items-center justify-center shadow-[0_4px_12px_rgba(163,230,53,0.3)]">
                <Box className="text-readex-black dark:text-black w-5 h-5 stroke-[2.5px]" />
            </div>
            <div>
                <h1 className="font-black text-lg tracking-tighter text-readex-black dark:text-white uppercase leading-none">{APP_NAME.split(' ')[0]}</h1>
                <span className="text-[10px] font-bold text-readex-black dark:text-lime-500 tracking-[0.2em] uppercase block">Operations</span>
            </div>
            </div>
            
            <Button 
            size="sm" 
            variant="primary" 
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setShowAddModal(true)}
            className="shadow-none border-transparent bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-300 hover:text-readex-black dark:hover:text-white hover:bg-gray-50 dark:hover:bg-zinc-700"
            >
            ADD BEACON
            </Button>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 relative overflow-hidden transition-colors duration-500">
            {activeTab === 'DASHBOARD' && renderDashboard()}
            
            <div className={`absolute inset-0 transition-opacity duration-500 ${activeTab === 'MAP' ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                
                {/* SEARCH BAR OVERLAY (Top Center) */}
                <div className="absolute top-4 left-4 right-4 md:right-auto md:w-96 z-[1000]">
                    <div className="relative">
                        <div className="absolute left-4 top-3.5 text-gray-400 dark:text-zinc-400">
                            <Search className="w-4 h-4" />
                        </div>
                        <input 
                            type="text" 
                            placeholder="Find Beacon..." 
                            className="w-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-gray-200 dark:border-zinc-700/50 rounded-2xl pl-10 pr-10 py-3 text-sm font-medium text-readex-black dark:text-white shadow-lg outline-none focus:ring-2 focus:ring-readex-green dark:focus:ring-lime-500/50 transition-all"
                            value={mapSearchQuery}
                            onChange={e => setMapSearchQuery(e.target.value)}
                        />
                         {mapSearchQuery && (
                            <button onClick={() => setMapSearchQuery('')} className="absolute right-3 top-3.5 text-gray-400 hover:text-black dark:text-zinc-400 dark:hover:text-white">
                                <XCircle className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                {/* LIST OVERVIEW (Right Side Panel) */}
                <div className="hidden md:flex absolute top-4 right-4 bottom-32 w-80 z-[900] flex-col pointer-events-none">
                    <div className="pointer-events-auto flex-1 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-[30px] shadow-2xl border border-gray-200 dark:border-zinc-800/50 flex flex-col overflow-hidden">
                        
                        {/* Panel Header */}
                        <div className="p-4 border-b border-gray-100 dark:border-zinc-800/50 bg-white/50 dark:bg-zinc-900/50 flex justify-between items-center">
                            <h3 className="text-xs font-bold text-readex-black dark:text-zinc-100 uppercase tracking-widest flex items-center gap-2">
                                <List className="w-4 h-4" />
                                Overview
                            </h3>
                            <div className="relative group">
                                <select 
                                    className="appearance-none bg-transparent text-xs font-mono font-bold text-gray-500 dark:text-zinc-400 py-1 pr-6 pl-2 outline-none cursor-pointer hover:text-black dark:hover:text-white transition-colors"
                                    value={listZoneFilter}
                                    onChange={(e) => setListZoneFilter(e.target.value)}
                                >
                                    <option value="ALL" className="dark:bg-zinc-900">ALL ZONES</option>
                                    {zones.map(z => <option key={z.id} value={z.id} className="dark:bg-zinc-900">{z.name.toUpperCase()}</option>)}
                                </select>
                                <ChevronRight className="w-3 h-3 text-gray-400 dark:text-zinc-500 absolute right-1 top-1.5 pointer-events-none rotate-90" />
                            </div>
                        </div>

                        {/* Stats Strip */}
                        <div className="px-4 py-2 bg-gray-50/50 dark:bg-zinc-950/30 flex justify-between text-[9px] font-mono text-gray-400 dark:text-zinc-500 uppercase tracking-wider">
                            <span>{filteredTrolleys.length} Matches</span>
                            <span>Live</span>
                        </div>

                        {/* List Content */}
                        <div className="flex-1 overflow-y-auto no-scrollbar">
                             {filteredTrolleys.length === 0 ? (
                                <div className="p-8 text-center text-gray-400 dark:text-zinc-500 flex flex-col items-center gap-3 opacity-50">
                                    <Search className="w-6 h-6" />
                                    <div className="text-[10px] font-mono">No units found</div>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100 dark:divide-zinc-800/50">
                                    {filteredTrolleys.map(t => (
                                        <div 
                                            key={t.id} 
                                            onClick={() => handleLocate(t)}
                                            className="p-3 hover:bg-readex-green/10 dark:hover:bg-white/5 transition-colors cursor-pointer group flex items-center justify-between"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-1.5 h-1.5 rounded-full ${t.status === 'ACTIVE' ? 'bg-readex-green dark:bg-lime-500' : 'bg-gray-300 dark:bg-zinc-600'}`} />
                                                <div>
                                                    <div className="text-xs font-bold text-readex-black dark:text-zinc-200 group-hover:text-readex-green dark:group-hover:text-lime-400 font-mono transition-colors">{t.id}</div>
                                                    <div className="text-[9px] text-gray-400 dark:text-zinc-500 uppercase">{t.zoneId || 'Unassigned'}</div>
                                                </div>
                                            </div>
                                            <StatusBadge status={t.status} />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <MapComponent 
                    trolleys={trolleys} 
                    zones={zones}
                    selectedTrolleyId={selectedTrolleyId}
                    onTrolleySelect={(id) => setSelectedTrolleyId(id === selectedTrolleyId ? null : id)}
                    theme="dark" // Map always dark
                    placementMode={placementMode}
                    onMapClick={handleMapClick}
                />
                
                {/* Map Selected Card (Bottom) */}
                {selectedTrolleyId && activeTab === 'MAP' && (
                    <div className="absolute bottom-32 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:w-96 z-[1000]">
                        <div className="bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl border border-gray-200 dark:border-white/10 p-5 rounded-[30px] shadow-[0_20px_60px_-10px_rgba(0,0,0,0.1)] dark:shadow-[0_20px_60px_-10px_rgba(0,0,0,0.8)] animate-slide-up ring-1 ring-black/5 dark:ring-white/5">
                        <div className="flex justify-between items-start mb-5">
                            <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-readex-green/20 dark:bg-lime-500/10 flex items-center justify-center border border-readex-green/30 dark:border-lime-500/20">
                                <Activity className="w-5 h-5 text-readex-black dark:text-lime-500" />
                            </div>
                            <div>
                                <div className="text-[10px] font-bold text-readex-black dark:text-lime-500 uppercase tracking-widest mb-0.5">Target Locked</div>
                                <div className="text-2xl font-bold text-readex-black dark:text-white tracking-tight font-mono">{selectedTrolleyId}</div>
                                <div className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-readex-green dark:bg-lime-500 animate-pulse"></span>
                                Online • {trolleys.find(t => t.id === selectedTrolleyId)?.zoneId || 'Unknown Zone'}
                                </div>
                            </div>
                            </div>
                            <div className="flex gap-2">
                                 <Button variant="ghost" size="sm" onClick={() => handleDeleteBeacon(selectedTrolleyId!)} className="h-8 w-8 p-0 rounded-full text-red-500 hover:bg-red-50 dark:hover:bg-rose-500/10">
                                    <AlertTriangle className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedTrolleyId(null)} className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-800">
                                    <XIcon />
                                </Button>
                            </div>
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
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[1500]">
          <nav className="bg-readex-black dark:bg-[#1C1C1E] p-2 rounded-full shadow-2xl flex items-center gap-2 border border-white/5 ring-1 ring-black/20">
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
    className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 ${active ? 'bg-readex-green dark:bg-lime-400 text-black shadow-[0_0_20px_rgba(191,230,153,0.4)] dark:shadow-[0_0_20px_rgba(163,230,53,0.4)] scale-105' : 'text-gray-500 dark:text-zinc-500 hover:text-gray-300 dark:hover:text-zinc-300 hover:bg-white/5'}`}
  >
    {React.cloneElement(icon, { size: 24, strokeWidth: active ? 2.5 : 2 })}
  </button>
);

// Helper icon for the close button
const XIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
);

export default App;
