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

function getBatteryColor(battery: number): string {
  if (battery >= 70) return '#00FF00';
  if (battery >= 40) return '#FFA500';
  return '#FF0000';
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
  return L.divIcon({
    className: 'bike-marker',
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    html: `
      <div
        style="
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid #fff;
          box-shadow: 0 0 6px ${color}99, 0 0 2px #000;
        "
      ></div>
    `
  });
}

const BikeLayer: React.FC<BikeLayerProps> = ({ bikeData }) => {
  const map = useMap();
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const popupsRef = useRef<Map<string, L.Popup>>(new Map());
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
      }
    });

    bikeData.forEach((bike) => {
      const existing = markersRef.current.get(bike.id);
      const batteryColor = getBatteryColor(bike.battery);

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
      } else {
        const marker = L.marker([bike.lat, bike.lng], {
          icon: createBikeIcon(bike.battery)
        });
        const popup = L.popup(popupOptions).setContent(popupContent);
        marker.bindPopup(popup);
        marker.addTo(map);
        markersRef.current.set(bike.id, marker);
        popupsRef.current.set(bike.id, popup);
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
    };
  }, [map]);

  return null;
};

export default BikeLayer;
