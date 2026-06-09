import React, { useEffect, useRef, useMemo } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
  useMapEvents
} from 'react-leaflet';
import L from 'leaflet';
import type { Card } from './types';
import { formatDate, getEmotionColor } from './utils';

interface MapViewProps {
  cards: Card[];
  visibleCardIds: Set<string>;
  selectedCardId: string | null;
  onSelectCard: (card: Card) => void;
  onDeleteCard: (card: Card) => void;
  focusCardId: string | null;
}

function createColoredIcon(color: string): L.DivIcon {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: ${color};
      border: 3px solid white;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      cursor: pointer;
      transition: transform 0.2s ease;
    " class="marker-circle"></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });
}

function MapEvents({ onMapClick }: { onMapClick: () => void }) {
  useMapEvents({
    click: () => onMapClick()
  });
  return null;
}

function MapController({
  focusCardId,
  cards
}: {
  focusCardId: string | null;
  cards: Card[];
}) {
  const map = useMap();

  useEffect(() => {
    if (focusCardId) {
      const card = cards.find((c) => c.id === focusCardId);
      if (card) {
        map.flyTo([card.lat, card.lng], 10, {
          duration: 0.8
        });
      }
    }
  }, [focusCardId, cards, map]);

  return null;
}

const MapView: React.FC<MapViewProps> = ({
  cards,
  visibleCardIds,
  selectedCardId,
  onSelectCard,
  onDeleteCard,
  focusCardId
}) => {
  const popupRef = useRef<L.Popup | null>(null);

  const center: [number, number] = useMemo(() => {
    if (cards.length > 0) {
      const avgLat = cards.reduce((sum, c) => sum + c.lat, 0) / cards.length;
      const avgLng = cards.reduce((sum, c) => sum + c.lng, 0) / cards.length;
      return [avgLat, avgLng];
    }
    return [30, 100];
  }, [cards]);

  const renderMarker = (card: Card) => {
    const isVisible = visibleCardIds.has(card.id);
    const isSelected = selectedCardId === card.id;
    const icon = createColoredIcon(card.dominantColor);

    return (
      <Marker
        key={card.id}
        position={[card.lat, card.lng]}
        icon={icon}
        opacity={isVisible ? 1 : 0.15}
        zIndexOffset={isSelected ? 1000 : isVisible ? 100 : 0}
        eventHandlers={{
          click: () => {
            if (isVisible) {
              onSelectCard(card);
            }
          }
        }}
      >
        {isVisible && (
          <Popup
            ref={(el) => {
              if (el) {
                popupRef.current = el as unknown as L.Popup;
              }
            }}
            closeButton={true}
            maxWidth={320}
            minWidth={280}
            className="card-popup"
          >
            <div className="popup-content">
              {card.image && (
                <div className="popup-image-wrapper">
                  <img
                    src={card.image}
                    alt={card.title}
                    className="popup-image"
                    id={`popup-img-${card.id}`}
                    draggable={false}
                  />
                  <span
                    className="emotion-badge"
                    style={{ backgroundColor: getEmotionColor(card.emotion) }}
                  >
                    {card.emotion}
                  </span>
                </div>
              )}
              <div className="popup-body">
                <h3 className="popup-title">{card.title}</h3>
                <div className="popup-meta">
                  <span className="popup-city">📍 {card.city}</span>
                  <span className="popup-date">{formatDate(card.date)}</span>
                </div>
                {card.note && (
                  <p className="popup-note">{card.note}</p>
                )}
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    const imgEl = document.getElementById(`popup-img-${card.id}`);
                    if (imgEl) {
                      imgEl.classList.add('shatter-animation');
                      setTimeout(() => {
                        onDeleteCard(card);
                      }, 1500);
                    } else {
                      onDeleteCard(card);
                    }
                  }}
                >
                  🗑️ 删除卡片
                </button>
              </div>
            </div>
          </Popup>
        )}
      </Marker>
    );
  };

  return (
    <div className="map-wrapper">
      <MapContainer
        center={center}
        zoom={cards.length > 0 ? 3 : 2}
        className="leaflet-map"
        zoomControl={false}
        worldCopyJump={true}
        preferCanvas={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          updateInterval={200}
          keepBuffer={8}
        />
        <L.Control.Zoom position="topright" />
        <MapEvents onMapClick={() => onSelectCard({} as Card)} />
        <MapController focusCardId={focusCardId} cards={cards} />
        {cards.map(renderMarker)}
      </MapContainer>
    </div>
  );
};

export default MapView;
