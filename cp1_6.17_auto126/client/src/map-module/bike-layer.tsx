import React, { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Bike } from '../App';

interface BikeLayerProps {
  bikeData: Bike[];
}

interface AnimationState {
  startTime: number;
  startLat: number;
  startLng: number;
  targetLat: number;
  targetLng: number;
  rafId: number | null;
}

const ANIMATION_DURATION = 1200;
const ICON_SIZE = 28;

function getBatteryColor(battery: number): string {
  const clamped = Math.max(20, Math.min(100, battery));
  const ratio = (clamped - 20) / 80;
  const hue = ratio * 120;
  return `hsl(${hue}, 100%, 45%)`;
}

function formatLastUsed(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚使用';
  if (mins < 60) return `${mins}分钟前`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}小时前`;
  const days = Math.floor(hrs / 24);
  return `${days}天前`;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function createBikeIcon(battery: number): L.DivIcon {
  const color = getBatteryColor(battery);
  const svgBike = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="${color}">
      <path d="M5 20.5A3.5 3.5 0 0 1 1.5 17 3.5 3.5 0 0 1 5 13.5a3.5 3.5 0 0 1 3.5 3.5A3.5 3.5 0 0 1 5 20.5m0-5A1.5 1.5 0 0 0 3.5 17 1.5 1.5 0 0 0 5 18.5 1.5 1.5 0 0 0 6.5 17 1.5 1.5 0 0 0 5 15.5M14.8 10l1.8-2.9-1.4-1-2.6 4.2L10.5 9l-.6-1H6v1.5h3l1.8 3H7v1.5h4.2c.4.5 1 .9 1.8 1L12 17.5l1.5.5 2-4.6c.8-.5 1.3-1.2 1.5-2h-2.7l-.8-1.9zM19 20.5A3.5 3.5 0 0 1 15.5 17 3.5 3.5 0 0 1 19 13.5a3.5 3.5 0 0 1 3.5 3.5A3.5 3.5 0 0 1 19 20.5m0-5A1.5 1.5 0 0 0 17.5 17 1.5 1.5 0 0 0 19 18.5 1.5 1.5 0 0 0 20.5 17 1.5 1.5 0 0 0 19 15.5zM13 4l.8 1.5L14.9 5.7l-.9-1.7L13 4z"/>
    </svg>
  `;
  return L.divIcon({
    className: 'bike-marker',
    iconSize: [ICON_SIZE, ICON_SIZE],
    iconAnchor: [ICON_SIZE / 2, ICON_SIZE / 2],
    html: `
      <div
        style="
          width: ${ICON_SIZE}px;
          height: ${ICON_SIZE}px;
          border-radius: 50%;
          background: rgba(255,255,255,0.95);
          border: 2px solid ${color};
          box-shadow: 0 0 8px ${color}cc, 0 2px 6px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: box-shadow 0.2s ease, transform 0.15s ease;
        "
        onmouseover="this.style.boxShadow='0 0 14px ${color}ee, 0 3px 10px rgba(0,0,0,0.5)';this.style.transform='scale(1.15)'"
        onmouseout="this.style.boxShadow='0 0 8px ${color}cc, 0 2px 6px rgba(0,0,0,0.35)';this.style.transform='scale(1)'"
      >
        ${svgBike}
      </div>
    `
  });
}

const BikeLayer: React.FC<BikeLayerProps> = ({ bikeData }) => {
  const map = useMap();
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const popupsRef = useRef<Map<string, L.Popup>>(new Map());
  const tooltipsRef = useRef<Map<string, L.Tooltip>>(new Map());
  const animationsRef = useRef<Map<string, AnimationState>>(new Map());

  useEffect(() => {
    const currentIds = new Set(bikeData.map((b) => b.id));

    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        const anim = animationsRef.current.get(id);
        if (anim && anim.rafId !== null) {
          cancelAnimationFrame(anim.rafId);
        }
        animationsRef.current.delete(id);
        map.removeLayer(marker);
        markersRef.current.delete(id);
        popupsRef.current.delete(id);
        tooltipsRef.current.delete(id);
      }
    });

    bikeData.forEach((bike) => {
      const existing = markersRef.current.get(bike.id);
      const batteryColor = getBatteryColor(bike.battery);

      const tooltipOptions: L.TooltipOptions = {
        direction: 'top',
        offset: [0, -ICON_SIZE / 2 - 4],
        opacity: 0.95,
        className: 'bike-tooltip'
      };

      const tooltipContent = `
        <div style="
          background: #1e1e1e;
          color: #fff;
          padding: 4px 10px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          border: 1px solid #555;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
        ">
          🚲 ${bike.id}
        </div>
      `;

      const popupContent = `
        <div style="
          background: #2D2D2D;
          border-radius: 10px;
          padding: 14px;
          color: #fff;
          min-width: 200px;
          font-family: sans-serif;
          user-select: none;
        ">
          <div style="font-size: 15px; font-weight: 600; margin-bottom: 10px; color: #fff;">
            🚲 单车编号：${bike.id}
          </div>
          <div style="margin-bottom: 10px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px; color: #ccc;">
              <span>电量</span>
              <span style="color: ${batteryColor}; font-weight: 600;">${bike.battery}%</span>
            </div>
            <div style="
              width: 100%;
              height: 8px;
              background: #444;
              border-radius: 4px;
              overflow: hidden;
            ">
              <div style="
                width: ${bike.battery}%;
                height: 100%;
                background: ${batteryColor};
                transition: width 0.5s ease;
              "></div>
            </div>
          </div>
          <div style="margin-bottom: 10px; display: flex; align-items: center;">
            <span style="font-size: 12px; color: #ccc; margin-right: 8px;">状态：</span>
            <span style="
              display: inline-block;
              padding: 2px 10px;
              border-radius: 4px;
              font-size: 12px;
              font-weight: 600;
              background: ${bike.rented ? '#FFA50033' : '#00FF0033'};
              color: ${bike.rented ? '#FFA500' : '#00FF00'};
              border: 1px solid ${bike.rented ? '#FFA500' : '#00FF00'};
            ">
              ${bike.rented ? '租出' : '可用'}
            </span>
          </div>
          <div style="font-size: 12px; color: #aaa;">
            🕒 上次使用：${formatLastUsed(bike.lastUsed)}
          </div>
        </div>
      `;

      const popupOptions: L.PopupOptions = {
        className: 'bike-popup',
        closeButton: true,
        autoPan: true,
        offset: [0, -8],
        maxWidth: 260
      };

      if (existing) {
        const prevLatLng = existing.getLatLng();
        const newLat = bike.lat;
        const newLng = bike.lng;
        const distance = prevLatLng.distanceTo(L.latLng(newLat, newLng));

        if (distance > 0.0001) {
          const existingAnim = animationsRef.current.get(bike.id);
          if (existingAnim && existingAnim.rafId !== null) {
            cancelAnimationFrame(existingAnim.rafId);
          }

          const animState: AnimationState = {
            startTime: performance.now(),
            startLat: prevLatLng.lat,
            startLng: prevLatLng.lng,
            targetLat: newLat,
            targetLng: newLng,
            rafId: null
          };

          const animate = (now: number) => {
            const elapsed = now - animState.startTime;
            const progress = Math.min(elapsed / ANIMATION_DURATION, 1);
            const eased = easeInOutCubic(progress);

            const curLat = animState.startLat + (animState.targetLat - animState.startLat) * eased;
            const curLng = animState.startLng + (animState.targetLng - animState.startLng) * eased;
            existing.setLatLng([curLat, curLng]);

            if (progress < 1) {
              animState.rafId = requestAnimationFrame(animate);
            } else {
              animState.rafId = null;
            }
          };

          animState.rafId = requestAnimationFrame(animate);
          animationsRef.current.set(bike.id, animState);
        }

        existing.setIcon(createBikeIcon(bike.battery));
        const existingPopup = popupsRef.current.get(bike.id);
        if (existingPopup) {
          existingPopup.setContent(popupContent);
        } else {
          const popup = L.popup(popupOptions).setContent(popupContent);
          existing.bindPopup(popup);
          popupsRef.current.set(bike.id, popup);
        }
        const existingTooltip = tooltipsRef.current.get(bike.id);
        if (existingTooltip) {
          existingTooltip.setContent(tooltipContent);
        } else {
          const tooltip = L.tooltip(tooltipOptions).setContent(tooltipContent);
          existing.bindTooltip(tooltip);
          tooltipsRef.current.set(bike.id, tooltip);
        }
      } else {
        const marker = L.marker([bike.lat, bike.lng], {
          icon: createBikeIcon(bike.battery)
        });
        const popup = L.popup(popupOptions).setContent(popupContent);
        const tooltip = L.tooltip(tooltipOptions).setContent(tooltipContent);
        marker.bindPopup(popup);
        marker.bindTooltip(tooltip);
        marker.addTo(map);
        markersRef.current.set(bike.id, marker);
        popupsRef.current.set(bike.id, popup);
        tooltipsRef.current.set(bike.id, tooltip);
      }
    });
  }, [bikeData, map]);

  useEffect(() => {
    return () => {
      animationsRef.current.forEach((anim) => {
        if (anim.rafId !== null) cancelAnimationFrame(anim.rafId);
      });
      animationsRef.current.clear();
      markersRef.current.forEach((m) => map.removeLayer(m));
      markersRef.current.clear();
      popupsRef.current.clear();
      tooltipsRef.current.clear();
    };
  }, [map]);

  return null;
};

export default BikeLayer;
