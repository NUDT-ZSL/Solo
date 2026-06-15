import { useState, useEffect, useCallback } from 'react';
import MapView from '@/components/MapView';
import SoundCard from '@/components/SoundCard';
import CreatePanel from '@/components/CreatePanel';
import SearchBar from '@/components/SearchBar';
import SidebarList from '@/components/SidebarList';
import MobileFilterPanel from '@/components/MobileFilterPanel';
import { useStore } from '@/store/useStore';
import type { SoundMarker } from '../../shared/types';

export default function Home() {
  const {
    user,
    markers,
    setMarkers,
    addMarker,
    selectedMarker,
    selectMarker,
    isCreating,
    setIsCreating,
    createLatLng,
    setCreateLatLng,
    updateMarker,
    userLocation,
    setUserLocation,
    searchQuery,
    setSearchQuery,
    filterTag,
    setFilterTag,
    sortBy,
    setSortBy,
    mobileFilterOpen,
    setMobileFilterOpen,
  } = useStore();

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [mapCenter, setMapCenter] = useState({ lat: 39.908, lng: 116.397 });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
          setMapCenter(loc);
        },
        () => {
          setUserLocation(null);
        }
      );
    }
  }, [setUserLocation]);

  const fetchMarkers = useCallback(async () => {
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (filterTag) params.set('tag', filterTag);
    if (sortBy) params.set('sort', sortBy);
    if (userLocation) {
      params.set('lat', userLocation.lat.toString());
      params.set('lng', userLocation.lng.toString());
    }
    params.set('limit', '20');

    try {
      const res = await fetch(`/api/markers?${params}`);
      const data = await res.json();
      setMarkers(data.markers || []);
    } catch {
      setMarkers([]);
    }
  }, [searchQuery, filterTag, sortBy, userLocation, setMarkers]);

  useEffect(() => {
    fetchMarkers();
  }, [fetchMarkers]);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (!user) return;
      setCreateLatLng({ lat, lng });
      setIsCreating(true);
    },
    [user, setCreateLatLng, setIsCreating]
  );

  const handleMarkerClick = useCallback(
    (marker: SoundMarker) => {
      selectMarker(marker);
    },
    [selectMarker]
  );

  const handleMarkerDragEnd = useCallback(
    (id: string, lat: number, lng: number) => {
      updateMarker(id, { lat, lng });
      fetch(`/api/markers/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      }).catch(() => {});
    },
    [updateMarker]
  );

  const handleCreate = useCallback(
    async (formData: FormData) => {
      try {
        const res = await fetch('/api/markers', {
          method: 'POST',
          body: formData,
        });
        const marker = await res.json();
        addMarker(marker);
        setIsCreating(false);
        setCreateLatLng(null);
      } catch {
        // handle error
      }
    },
    [addMarker, setIsCreating, setCreateLatLng]
  );

  const handleLike = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/markers/${id}/like`, { method: 'POST' });
        const data = await res.json();
        updateMarker(id, { likes: data.likes, likesToday: data.likesToday });
      } catch {
        // handle error
      }
    },
    [updateMarker]
  );

  const handleComment = useCallback(
    async (id: string, content: string) => {
      try {
        const res = await fetch(`/api/markers/${id}/comment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        });
        const comment = await res.json();
        const marker = markers.find((m) => m.id === id);
        if (marker) {
          updateMarker(id, {
            comments: [...marker.comments, comment],
          });
        }
      } catch {
        // handle error
      }
    },
    [markers, updateMarker]
  );

  const handleFavorite = useCallback(
    async (id: string, note?: string) => {
      try {
        await fetch(`/api/favorites/${id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note }),
        });
      } catch {
        // handle error
      }
    },
    []
  );

  return (
    <div className="relative w-full h-screen bg-earth-warm font-body overflow-hidden">
      <div className="absolute inset-0">
        <MapView
          markers={markers}
          onMarkerClick={handleMarkerClick}
          onMapClick={handleMapClick}
          onMarkerDragEnd={handleMarkerDragEnd}
          userLocation={userLocation}
          searchQuery={searchQuery}
        />
      </div>

      <SearchBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterTag={filterTag}
        onFilterTagChange={setFilterTag}
        sortBy={sortBy}
        onSortChange={setSortBy}
        isMobile={isMobile}
        onToggleMobileFilter={() => setMobileFilterOpen(!mobileFilterOpen)}
      />

      <SidebarList
        markers={markers}
        userLocation={userLocation}
        mapCenter={mapCenter}
        onMarkerClick={handleMarkerClick}
        isMobile={isMobile}
      />

      {selectedMarker && (
        <SoundCard
          marker={selectedMarker}
          onClose={() => selectMarker(null)}
          onLike={handleLike}
          onComment={handleComment}
          onFavorite={handleFavorite}
          isMobile={isMobile}
        />
      )}

      {isCreating && createLatLng && (
        <CreatePanel
          lat={createLatLng.lat}
          lng={createLatLng.lng}
          onSubmit={handleCreate}
          onClose={() => {
            setIsCreating(false);
            setCreateLatLng(null);
          }}
        />
      )}

      {mobileFilterOpen && (
        <MobileFilterPanel
          filterTag={filterTag}
          onFilterTagChange={setFilterTag}
          sortBy={sortBy}
          onSortChange={setSortBy}
          onClose={() => setMobileFilterOpen(false)}
        />
      )}
    </div>
  );
}
