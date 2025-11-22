import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Trolley, TrolleyStatus, Zone } from '../types';

interface MapProps {
  trolleys: Trolley[];
  zones: Zone[];
  selectedTrolleyId: string | null;
  onTrolleySelect: (id: string) => void;
  theme: 'light' | 'dark';
}

export const MapComponent: React.FC<MapProps> = ({ 
  trolleys, 
  zones, 
  selectedTrolleyId, 
  onTrolleySelect,
  theme
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<Map<string, L.CircleMarker>>(new Map());
  const zonesRef = useRef<L.LayerGroup>(L.layerGroup());

  // Initialize Map
  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return;

    const map = L.map(mapContainer.current, {
      zoomControl: false,
      attributionControl: false
    }).setView([1.3455, 103.9323], 17);

    zonesRef.current.addTo(map);
    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  // Handle Theme Changes (Tile Layer)
  useEffect(() => {
    if (!mapInstance.current) return;
    
    const darkTiles = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    const lightTiles = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    
    const url = theme === 'dark' ? darkTiles : lightTiles;

    if (tileLayerRef.current) {
        tileLayerRef.current.setUrl(url);
    } else {
        tileLayerRef.current = L.tileLayer(url, {
            maxZoom: 20,
            subdomains: 'abcd',
        }).addTo(mapInstance.current);
    }
  }, [theme]);

  // Handle Data Updates & Focus Logic
  useEffect(() => {
    if (!mapInstance.current) return;
    const map = mapInstance.current;

    // 1. Draw Zones (Faint Outlines)
    zonesRef.current.clearLayers();
    zones.forEach(zone => {
      L.circle([zone.center.lat, zone.center.lng], {
        color: theme === 'dark' ? '#fbbf24' : '#d97706', // Yellow
        fillColor: '#fbbf24',
        fillOpacity: theme === 'dark' ? 0.05 : 0.1,
        weight: 1,
        radius: zone.radius,
        dashArray: '4, 6'
      }).addTo(zonesRef.current);
    });

    // 2. Draw/Update Markers with Spotlight Logic
    trolleys.forEach(t => {
      let marker = markersRef.current.get(t.id);
      const isSelected = t.id === selectedTrolleyId;
      const isAnySelected = selectedTrolleyId !== null;

      // Determine Visual State
      let opacity = 1;
      let fillOpacity = 0.9;
      let radius = 5;
      let weight = 1;
      let color = theme === 'dark' ? '#000' : '#fff';
      
      if (isAnySelected) {
        if (isSelected) {
            // Spotlight: Selected
            opacity = 1;
            fillOpacity = 1;
            radius = 12;
            weight = 3;
            color = theme === 'dark' ? '#fff' : '#000'; // Halo
        } else {
            // Spotlight: Background (Dimmed)
            opacity = 0.2;
            fillOpacity = 0.2;
            radius = 3;
            weight = 0;
        }
      }

      const getStatusColor = (s: TrolleyStatus) => {
          if (s === TrolleyStatus.MAINTENANCE) return '#f43f5e'; // Rose
          if (s === TrolleyStatus.LOW_BATTERY) return '#f59e0b'; // Amber
          return '#10b981'; // Emerald
      };
      
      const statusColorHex = getStatusColor(t.status);

      if (!marker) {
        marker = L.circleMarker([t.location.lat, t.location.lng]).addTo(map);
        marker.on('click', () => onTrolleySelect(t.id));
        markersRef.current.set(t.id, marker);
      }

      // Apply Styles
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

      // Detailed Industrial Tooltip Content
      const zoneName = zones.find(z => z.id === t.zoneId)?.name || 'UNASSIGNED';
      
      // Styles for tooltip based on theme
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
                    <span style="color: ${theme === 'dark' ? '#fbbf24' : '#d97706'}; font-weight: 600;">${zoneName}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 10px; color: ${textSub};">
                    <span>SIGNAL</span>
                    <span style="color: ${textMain};">${t.signalStrength} dBm</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-size: 10px; color: ${textSub};">
                    <span>BATTERY</span>
                    <span style="color: ${t.batteryLevel < 20 ? '#f43f5e' : '#10b981'};">${t.batteryLevel}%</span>
                </div>
                <div style="height: 1px; background: ${border}; margin: 4px 0;"></div>
                <div style="font-size: 9px; color: ${textSub}; text-align: center;">
                    ${t.location.lat.toFixed(5)}, ${t.location.lng.toFixed(5)}
                </div>
            </div>
        </div>
      `;
      
      marker.unbindTooltip();
      marker.bindTooltip(tooltipContent, {
          direction: 'top',
          offset: [0, -15],
          opacity: 1,
          className: 'leaflet-industrial-tooltip' 
      });
    });

    // Fly to selection
    if (selectedTrolleyId) {
      const t = trolleys.find(x => x.id === selectedTrolleyId);
      if (t) {
        map.flyTo([t.location.lat, t.location.lng], 18, {
          animate: true,
          duration: 0.8
        });
      }
    }

  }, [trolleys, zones, selectedTrolleyId, onTrolleySelect, theme]);

  return <div ref={mapContainer} className={`w-full h-full transition-colors duration-500 ${theme === 'dark' ? 'bg-zinc-950' : 'bg-zinc-100'}`} />;
};