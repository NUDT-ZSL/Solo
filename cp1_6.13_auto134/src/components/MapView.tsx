import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { v4 as uuidv4 } from 'uuid';
import { Waypoint, Trail, Activity } from '../types';

interface MapViewProps {
  waypoints: Waypoint[];
  selectedWaypointId: string | null;
  onWaypointsChange: (waypoints: Waypoint[]) => void;
  onWaypointSelect: (id: string | null) => void;
  onWaypointUpdate: (id: string, updates: Partial<Waypoint>) => void;
  trail?: Trail | null;
  liveActivities: Activity[];
  locationSharingEnabled: boolean;
}

function WaypointMarker({
  waypoint,
  index,
  isSelected,
  onSelect,
  onDragStart,
  onDragEnd
}: {
  waypoint: Waypoint;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDragStart: (id: string) => void;
  onDragEnd: (id: string, lat: number, lng: number) => void;
}) {
  const markerRef = useRef<L.Marker>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartTimeout = useRef<number | null>(null);

  const customIcon = L.divIcon({
    className: `waypoint-marker ${isSelected ? 'selected' : ''} ${isDragging ? 'dragging' : ''}`,
    html: `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:#fff;font-size:11px;font-weight:600;">${index + 1}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });

  const handleMouseDown = useCallback(() => {
    dragStartTimeout.current = window.setTimeout(() => {
      setIsDragging(true);
      onDragStart(waypoint.id);
    }, 150);
  }, [waypoint.id, onDragStart]);

  const handleMouseUp = useCallback(() => {
    if (dragStartTimeout.current) {
      clearTimeout(dragStartTimeout.current);
      dragStartTimeout.current = null;
    }
    if (!isDragging) {
      onSelect();