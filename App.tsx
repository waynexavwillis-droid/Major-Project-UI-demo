
import React, { useState, useMemo, useEffect } from 'react';
import { LayoutGrid, Map as MapIcon, Box, Settings, Search, Plus, ChevronRight, Filter, Activity, AlertTriangle, CheckCircle2, Moon, Sun, Signal, Battery, XCircle, Crosshair, Trash2, MapPin } from 'lucide-react';

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
  // Initialize as empty to rely solely on Firebase data
  const [zones, setZones] = useState<Zone[]>([]);
  const [hudTarget, setHudTarget] = useState<Trolley | null>(null);
  
  // Dashboard Filters
  const [dashboardZoneFilter, setDashboardZoneFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Map Search State
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
            setZones([]); // Clear zones if data is empty
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
    // 1. Prepare Data
    const autoId = `TR-${Math.floor(Math.random() * 9000) + 1000}`;
    const finalId = newBeaconId.trim() || autoId;
    
    // 2. Set Pending State
    setPendingBeaconData({ id: finalId, zoneId: newBeaconZone });
    setPlacementMode('BEACON');

    // 3. Close Modal & Switch to Map
    setShowAddModal(false);
    setActiveTab('MAP');
    setNewBeaconId('');
  };

  const handleStartZonePlacement = () => {
      if (!newZoneName.trim()) {
          alert("Please enter a zone name");
          return;
      }
      // Generate ID if not provided, else use provided ID
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
        // Write Beacon to Firebase
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
        // Write Zone to Firebase
        // Using strict .child() to handle custom IDs with spaces/special chars
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

      // Optimistic UI update so it disappears immediately from the list
      setZones(prev => prev.filter(z => z.id !== id));

      // 1) Delete the zone from /Zones (using update to set to null is robust)
      db.ref('Zones').update({ [id]: null })
        .then(() => {
          console.log(`Zone ${id} successfully deleted.`);
          
          // 2) Clean up any trolleys/beacons that still reference this zone
          // We need to query tracking data to find matches
          return db.ref('/Tracking').orderByChild('zoneId').equalTo(id).once('value');
        })
        .then((snapshot: any) => {
          const updates: Record<string, any> = {};
          
          snapshot.forEach((childSnap: any) => {
             // For each trolley in this zone, set zoneId to null (or "Unknown")
             updates[`/Tracking/${childSnap.key}/zoneId`] = null; 
          });

          // Only send update if there is something to change
          if (Object.keys(updates).length > 0) {
            return db.ref().update(updates);
          }
          return null;
        })
        .catch((error: any) => {
          console.error("Delete failed:", error);
          alert(`Failed to delete zone: ${error.message}`);
          // If critical, could revert optimistic update here by re-fetching
        });
  };

  const handleCloseModal = () => {
      setShowAddModal(false);
      setShowZoneModal(false);
      setNewBeaconId('');
      setNewZoneName('');
      setNewZoneId('');
  };

  // --- Derived State for Dashboard ---
  const dashboardList = useMemo(() => {
    return trolleys.filter(t => {
      const matchZone = dashboardZoneFilter === 'ALL' || t.zoneId === dashboardZoneFilter;
      const query = searchQuery.toLowerCase();
      const matchSearch = t.id.toLowerCase().includes(query) || t.name.toLowerCase().includes(query);
      return matchZone && matchSearch;
    });
  }, [trolleys, dashboardZoneFilter, searchQuery]);

  // --- Derived State for Map Search ---
  const mapSearchResults = useMemo(() => {
      if (!mapSearchQuery.trim()) return [];
      const q = mapSearchQuery.toLowerCase();
      // Filter trolleys by ID or Name
      return trolleys.filter(t => t.id.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)).slice(0, 5);
  }, [trolleys, mapSearchQuery]);


  // --- Render Functions ---

  const renderDashboard = () => (
    <div className="relative h-full p-4 pb-36 animate-fade-in flex flex-col gap-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3 relative z-10 shrink-0">
        <div className="bg-readex-white dark:bg-zinc-900/80 p-4 rounded-[30px] border border-gray-200 dark:border-zinc-800 shadow-sm dark:shadow-lg flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute top-3 right-3 opacity-20 group-hover:opacity-50 transition-opacity text-black dark:text-white"><Box className="w-4 h-4" /></div>
          <div className="text-gray-500 dark:text-zinc-500 text-[10px] font-mono uppercase tracking-widest mb-2">Total Beacon</div>
          <div className="text-3xl font-bold text-readex-black dark:text-white font-mono tracking-tighter">{trolleys.length}</div>
        </div>
        <div className="bg-readex-white dark:bg-zinc-900/80 p-4 rounded-[30px] border border-gray-200 dark:border-zinc-800 shadow-sm dark:shadow-lg flex flex-col justify-between group hover:-translate-y-1 transition-transform duration-300">
          <div className="absolute top-3 right-3 text-readex-green dark:text-lime-500 opacity-80 group-hover:opacity-100 transition-opacity"><Activity className="w-4 h-4" /></div>
          <div className="text-gray-500 dark:text-zinc-500 text-[10px] font-mono uppercase tracking-widest mb-2">Active</div>
          <div className="text-3xl font-bold text-readex-black dark:text-lime-400 font-mono tracking-tighter text-shadow-glow">
            {trolleys.filter(t => t.status === TrolleyStatus.ACTIVE).length}
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-4 shrink-0 relative z-10">
        <div className="relative">
            <Search className="absolute left-4 top-3.5 w-4 h-4 text-gray-400 dark:text-zinc-400" />
            <input 
                type="text" 
                placeholder="Search Beacon ID or Name..." 
                className="w-full bg-readex-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-700 rounded-[24px] pl-10 pr-4 py-3 text-sm text-readex-black dark:text-white outline-none focus:border-readex-green dark:focus:border-lime-500 shadow-sm transition-all placeholder:text-gray-400 dark:placeholder:text-zinc-400"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-4 top-3.5 text-gray-400 hover:text-black dark:text-zinc-400 dark:hover:text-white">
                    <XCircle className="w-4 h-4" />
                </button>
            )}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 flex flex-col min-h-0 relative z-10">
        <div className="flex items-center justify-between px-1 mb-4 shrink-0">
          <h3 className="text-sm font-bold text-readex-black dark:text-zinc-100 uppercase tracking-widest flex items-center gap-2">
             <Filter className="w-4 h-4 text-readex-black dark:text-lime-500" />
             List Overview
          </h3>
          <div className="relative group">
             <select 
              className="appearance-none bg-readex-white dark:bg-zinc-900/90 border border-gray-200 dark:border-zinc-700 text-readex-black dark:text-white text-xs font-mono py-2.5 pl-4 pr-10 rounded-[24px] focus:border-readex-green dark:focus:border-lime-500 outline-none uppercase shadow-sm dark:shadow-lg transition-all cursor-pointer hover:bg-gray-50 dark:hover:bg-zinc-800"
              value={dashboardZoneFilter}
              onChange={(e) => setDashboardZoneFilter(e.target.value)}
             >
               <option value="ALL" className="dark:bg-zinc-900">All Zones</option>
               {zones.map(z => <option key={z.id} value={z.id} className="dark:bg-zinc-900">{z.name}</option>)}
             </select>
             <ChevronRight className="w-3 h-3 text-gray-500 dark:text-zinc-500 absolute right-3 top-3.5 pointer-events-none rotate-90 group-hover:text-black dark:group-hover:text-white transition-colors" />
          </div>
        </div>

        <div className="flex-1 bg-readex-white dark:bg-zinc-900/40 border border-gray-200 dark:border-zinc-800/50 rounded-[30px] overflow-hidden shadow-sm dark:shadow-xl flex flex-col">
            <div className="bg-white dark:bg-zinc-900/80 px-5 py-4 border-b border-gray-100 dark:border-zinc-800/50 flex justify-between items-center shrink-0">
                <span className="text-xs font-mono text-readex-black dark:text-lime-400 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-3 h-3 text-readex-green dark:text-lime-500" />
                  {dashboardList.length} UNITS FOUND
                </span>
                <div className="flex items-center gap-2">
                     <span className="text-[9px] text-gray-500 dark:text-zinc-500 font-mono border border-gray-100 dark:border-zinc-800 px-2 py-0.5 rounded bg-gray-50 dark:bg-black/20 animate-pulse">LIVE DB</span>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto no-scrollbar">
                <div className="divide-y divide-gray-100 dark:divide-zinc-800/50">
                    {dashboardList.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 dark:text-zinc-500 flex flex-col items-center gap-3">
                            <Search className="w-8 h-8 opacity-20" />
                            <div className="text-xs font-mono">No assets found matching criteria.</div>
                        </div>
                    ) : (
                        dashboardList.map(t => (
                        <div key={t.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-white/5 transition-all duration-200 group border-l-2 border-transparent hover:border-readex-green dark:hover:border-lime-500 cursor-pointer" onClick={() => handleLocate(t)}>
                            <div className="flex items-center gap-4">
                            <div className={`w-2.5 h-2.5 rounded-sm rotate-45 shadow-sm transition-colors duration-300 ${t.status === 'ACTIVE' ? 'bg-readex-green dark:bg-lime-500 dark:shadow-lime-500/50' : 'bg-gray-300 dark:bg-zinc-600'}`} />
                            <div>
                                <div className="text-sm font-bold text-readex-black dark:text-zinc-200 dark:group-hover:text-white font-mono tracking-tight">{t.id}</div>
                                <div className="text-[10px] text-gray-400 dark:text-zinc-500 font-medium uppercase tracking-wider mt-0.5 group-hover:text-gray-600 dark:group-hover:text-zinc-400">{t.name}</div>
                            </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <StatusBadge status={t.status} />
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

        {/* Modal: Add Beacon */}
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

                        <div>
                             <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-zinc-500 mb-1.5 block">Firmware</label>
                             <div className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-800 rounded-[20px] px-3 py-2.5 text-sm text-gray-400 dark:text-zinc-400 font-mono">
                                v2.5.0-stable
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

        {/* Modal: Add Zone */}
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
                        <div className="p-3 bg-gray-50 dark:bg-zinc-800/50 rounded-xl text-xs text-gray-500 dark:text-zinc-500">
                            Next step: You will need to tap the map to set the center point of this zone.
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
                {/* SEARCH BAR OVERLAY FOR MAP */}
                <div className="absolute top-4 left-4 right-4 z-[1000] max-w-md mx-auto">
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
                    
                    {/* Results Dropdown */}
                    {mapSearchResults.length > 0 && (
                        <div className="mt-2 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-zinc-700/50 shadow-xl overflow-hidden animate-slide-up">
                            {mapSearchResults.map(t => (
                                <div 
                                    key={t.id}
                                    className="px-4 py-3 border-b border-gray-100 dark:border-zinc-800/50 last:border-0 hover:bg-readex-green/20 dark:hover:bg-lime-500/10 cursor-pointer flex items-center justify-between group"
                                    onClick={() => {
                                        handleLocate(t);
                                        setMapSearchQuery('');
                                    }}
                                >
                                    <div>
                                        <div className="text-sm font-bold text-readex-black dark:text-white font-mono">{t.id}</div>
                                        <div className="text-[10px] text-gray-500 dark:text-zinc-500 uppercase tracking-wider">{t.name}</div>
                                    </div>
                                     <ChevronRight className="w-4 h-4 text-gray-400 dark:text-zinc-400 group-hover:text-readex-black dark:group-hover:text-lime-500" />
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <MapComponent 
                    trolleys={trolleys} 
                    zones={zones}
                    selectedTrolleyId={selectedTrolleyId}
                    onTrolleySelect={(id) => setSelectedTrolleyId(id === selectedTrolleyId ? null : id)}
                    theme="dark"
                    placementMode={placementMode}
                    onMapClick={handleMapClick}
                />
                
                {/* Map Selected Card */}
                {selectedTrolleyId && activeTab === 'MAP' && (
                    <div className="absolute bottom-32 left-4 right-4 z-[1000]">
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
