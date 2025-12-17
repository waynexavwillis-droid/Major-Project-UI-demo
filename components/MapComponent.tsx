import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Trolley, TrolleyStatus, Zone } from '../types';

interface MapProps {
  trolleys: Trolley[];
  zones: Zone[];
  selectedTrolleyId: string | null;
  onTrolleySelect: (id: string) => void;
  theme: 'light' | 'dark';
  placementMode: 'BEACON' | 'ZONE' | null;
  onMapClick: (lat: number, lng: number) => void;
}

export const MapComponent: React.FC<MapProps> = ({ 
  trolleys, 
  zones, 
  selectedTrolleyId, 
  onTrolleySelect,
  theme,
  placementMode,
  onMapClick
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const zonesRef = useRef<L.LayerGroup>(L.layerGroup());
  const mapClickRef = useRef<((e: L.LeafletMouseEvent) => void) | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const map = L.map(mapContainer.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([1.3455, 103.9323], 17);

    zonesRef.current.addTo(map);
    mapInstance.current = map;

    // Cleanup function to destroy map on unmount
    return () => {
      map.remove();
      mapInstance.current = null;
      tileLayerRef.current = null;
      markersRef.current.clear();
      zonesRef.current.clearLayers();
    };
  }, []);

  // Handle Map Click Events (Bound to current props)
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    // Remove old listener if exists
    if (mapClickRef.current) {
        map.off('click', mapClickRef.current);
    }

    // Create new listener
    mapClickRef.current = (e: L.LeafletMouseEvent) => {
        // Only trigger onMapClick if we are in placement mode
        if (placementMode) {
            onMapClick(e.latlng.lat, e.latlng.lng);
        } else {
            // If clicking empty space (not a marker), we might want to deselect
            // But MapComponent doesn't handle deselect directly, usually App handles it via onTrolleySelect(null) logic
        }
    };

    map.on('click', mapClickRef.current);

    // Cursor Styling
    if (placementMode) {
        L.DomUtil.addClass(map.getContainer(), 'leaflet-crosshair');
    } else {
        L.DomUtil.removeClass(map.getContainer(), 'leaflet-crosshair');
    }

  }, [placementMode, onMapClick]);

  // Handle Theme Changes (Tile Layer)
  useEffect(() => {
    if (!mapInstance.current) return;
    
    if (tileLayerRef.current) {
        tileLayerRef.current.remove();
        tileLayerRef.current = null;
    }

    const darkTiles = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const lightTiles = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    const url = theme === 'dark' ? darkTiles : lightTiles;

    tileLayerRef.current = L.tileLayer(url, {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        maxZoom: 20,
        subdomains: 'abcd',
    }).addTo(mapInstance.current);
    
  }, [theme]);

  // Handle Data Updates & Focus Logic
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;
    const accentColor = theme === 'dark' ? '#a3e635' : '#65a30d';

    // 1. Draw Zones
    zonesRef.current.clearLayers();
    zones.forEach(zone => {
      L.circle([zone.center.lat, zone.center.lng], {
        color: accentColor, 
        fillColor: accentColor,
        fillOpacity: theme === 'dark' ? 0.05 : 0.1,
        weight: 1,
        radius: zone.radius,
        dashArray: '4, 6',
        interactive: false // FIX: Allow events to pass through to markers
      }).addTo(zonesRef.current);
    });

    // 2. Draw/Update Markers
    trolleys.forEach(t => {
      let marker = markersRef.current.get(t.id);
      const isSelected = t.id === selectedTrolleyId;
      const isAnySelected = selectedTrolleyId !== null;

      let opacity = 1;
      let fillOpacity = 0.9;
      let radius = 6;
      let weight = 1;
      let color = theme === 'dark' ? '#000' : '#fff';
      
      if (isAnySelected) {
        if (isSelected) {
            opacity = 1;
            fillOpacity = 1;
            radius = 12;
            weight = 3;
            color = theme === 'dark' ? '#fff' : '#000';
        } else {
            opacity = 0.4;
            fillOpacity = 0.4;
            radius = 6;
            weight = 1;
        }
      }

      const getStatusColor = (s: TrolleyStatus) => {
          if (s === TrolleyStatus.MAINTENANCE) return '#f43f5e';
          if (s === TrolleyStatus.LOW_BATTERY) return '#f59e0b';
          return accentColor;
      };
      
      const statusColorHex = getStatusColor(t.status);

      if (!marker) {
        marker = L.circleMarker([t.location.lat, t.location.lng]).addTo(map);
        marker.on('click', (e) => {
             L.DomEvent.stopPropagation(e); // Stop map click from firing
             onTrolleySelect(t.id);
        });
        markersRef.current.set(t.id, marker);
      }

      marker.setLatLng([t.location.lat, t.location.lng]);
      marker.setStyle({
        radius,
        color,
        weight,
        opacity,
        fillColor: statusColorHex,
        fillOpacity,
      });

      if (isSelected) marker.bringToFront();

      // Tooltip construction
      const zoneName = zones.find(z => z.id === t.zoneId)?.name || 'UNASSIGNED';
      const bg = theme === 'dark' ? 'rgba(9, 9, 11, 0.95)' : 'rgba(255, 255, 255, 0.95)';
      const border = theme === 'dark' ? '#3f3f46' : '#e4e4e7';
      const textMain = theme === 'dark' ? '#fff' : '#18181b';
      const textSub = theme === 'dark' ? '#a1a1aa' : '#71717a';

      const tooltipContent = `
        <div style="
            font-family: 'JetBrains Mono', monospace; 
            background: ${bg}; 
            backdrop-filter: blur(8px);
            border: 1px solid ${border}; 
            padding: 0; 
            border-radius: 8px; 
            color: ${textMain}; 
            min-width: 200px;
            overflow: hidden;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.2);
        ">
            <div style="
                background: ${statusColorHex}20; 
                padding: 8px 12px; 
                border-bottom: 1px solid ${border};
                display: flex;
                justify-content: space-between;
                align-items: center;
            ">
                <span style="font-weight: bold; color: ${textMain};">${t.id}</span>
                <span style="font-size: 9px; background: ${statusColorHex}; color: black; padding: 2px 6px; border-radius: 2px; font-weight: bold;">${t.status}</span>
            </div>
            <div style="padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;">
                <div style="display: flex; justify-content: space-between; font-size: 10px; color: ${textSub};">
                    <span>ZONE</span>
                    <span style="color: ${accentColor}; font-weight: 600;">${zoneName}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 10px; color: ${textSub};">
                    <span>SIGNAL</span>
                    <span style="color: ${textMain};">${t.signalStrength} dBm</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 10px; color: ${textSub};">
                    <span>BATTERY</span>
                    <span style="color: ${t.batteryLevel < 20 ? '#f43f5e' : accentColor};">${t.batteryLevel}%</span>
                </div>
            </div>
        </div>
      `;
      
      const existingTooltip = marker.getTooltip();
      if (existingTooltip) {
          marker.setTooltipContent(tooltipContent);
      } else {
          marker.bindTooltip(tooltipContent, {
              direction: 'top',
              offset: [0, -15],
              opacity: 1,
              className: 'leaflet-industrial-tooltip' 
          });
      }
    });

    // Cleanup removed markers
    markersRef.current.forEach((marker, id) => {
        if (!trolleys.find(t => t.id === id)) {
            marker.remove();
            markersRef.current.delete(id);
        }
    });

    if (selectedTrolleyId) {
      const t = trolleys.find(x => x.id === selectedTrolleyId);
      if (t) {
        map.flyTo([t.location.lat, t.location.lng], 18, { animate: true, duration: 0.8 });
      }
    }

  }, [trolleys, zones, selectedTrolleyId, onTrolleySelect, theme]);

  return (
    <>
        <style>{`
            .leaflet-crosshair { cursor: crosshair !important; }
        `}</style>
        <div ref={mapContainer} className={`w-full h-full transition-colors duration-500 ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-100'}`} />
    </>
  );
};