import { MapPin } from 'lucide-react';
import type { SoundMarker } from '../../shared/types';
import { EMOTION_LABELS, EMOTION_COLORS } from '../../shared/types';

interface SidebarListProps {
  markers: SoundMarker[];
  userLocation: { lat: number; lng: number } | null;
  mapCenter: { lat: number; lng: number };
  onMarkerClick: (marker: SoundMarker) => void;
  isMobile: boolean;
}

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function SidebarList({
  markers,
  userLocation,
  mapCenter,
  onMarkerClick,
  isMobile,
}: SidebarListProps) {
  const ref = userLocation || mapCenter;

  const sorted = [...markers]
    .map((m) => ({
      ...m,
      distance: haversineDistance(ref.lat, ref.lng, m.lat, m.lng),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 20);

  if (isMobile) return null;

  return (
    <div className="absolute right-3 top-20 bottom-4 w-64 z-20">
      <div className="bg-earth-cream/95 backdrop-blur-sm rounded-map shadow-map p-3 h-full overflow-y-auto">
        <h3 className="text-sm font-semibold text-earth-brown mb-2">
          附近声景 ({sorted.length})
        </h3>
        <div className="space-y-2">
          {sorted.map((m) => (
            <button
              key={m.id}
              onClick={() => onMarkerClick(m)}
              className="w-full text-left p-2 rounded-lg hover:bg-earth-warm/50 transition-colors duration-300"
            >
              <div className="flex items-start gap-2">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                  style={{
                    backgroundColor: EMOTION_COLORS[m.emotionTag],
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-earth-brown truncate">
                    {m.title}
                  </div>
                  <div className="text-xs text-earth-brown/50 flex items-center gap-1">
                    <MapPin size={10} />
                    {m.distance.toFixed(1)} km · {EMOTION_LABELS[m.emotionTag]}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
