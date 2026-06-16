import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GlassHeader } from '../components/GlassHeader';
import { Skeleton } from '../components/Skeleton';
import { usePlantDetail, useFavorites } from '../hooks';
import { Heart, HeartOff, ChevronLeft, ChevronRight } from 'lucide-react';

const galleryCategories = [
  { key: 'leaves', label: '叶片' },
  { key: 'bark', label: '树皮' },
  { key: 'fruits', label: '果实' },
  { key: 'flowers', label: '花朵' },
] as const;

type GalleryKey = (typeof galleryCategories)[number]['key'];

export function PlantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { plant, loading } = usePlantDetail(id);
  const { add, remove, check } = useFavorites();
  const [activeCategory, setActiveCategory] = useState<GalleryKey>('leaves');
  const [imgLoadedMap, setImgLoadedMap] = useState<Record<string, boolean>>({});
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    setCurrentSlideIndex(0);
    setImgLoadedMap({});
  }, [activeCategory, id]);

  if (loading || !plant) {
    return (
      <div className="min-h-screen pb-20">
        <GlassHeader title="详情" onBack={() => navigate(-1)} />
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <Skeleton className="w-full aspect-[3/2] rounded-2xl" />
          <Skeleton width="50%" height={28} rounded="rounded-md" />
          <Skeleton width="70%" height={18} rounded="rounded-md" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} height={16} rounded="rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const isFav = check(plant.id);
  const toggleFavorite = () => {
    if (isFav) remove(plant.id);
    else add(plant.id);
  };

  const currentGallery = plant.gallery[activeCategory] || [];
  const totalSlides = currentGallery.length;

  const prevSlide = () => {
    setCurrentSlideIndex((i) => (i - 1 + totalSlides) % totalSlides);
  };

  const nextSlide = () => {
    setCurrentSlideIndex((i) => (i + 1) % totalSlides);
  };

  const allGalleryImages: { url: string; category: string; key: string }[] = [];
  galleryCategories.forEach((cat) => {
    plant.gallery[cat.key].forEach((url, idx) => {
      allGalleryImages.push({ url, category: cat.label, key: `${cat.key}-${idx}` });
    });
  });

  return (
    <div className="min-h-screen pb-20">
      <GlassHeader
        title={plant.name}
        onBack={() => navigate(-1)}
        rightContent={
          <button
            onClick={toggleFavorite}
            className="w-9 h-9 rounded-full bg-white/80 flex items-center justify-center hover:scale-110 transition-transform"
          >
            {isFav ? (
              <Heart size={18} className="text-red-500 fill-red-500" />
            ) : (
              <HeartOff size={18} className="text-gray-500" />
            )}
          </button>
        }
      />

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-text-primary">{plant.name}</h1>
          <p className="text-base italic text-gray-500">{plant.scientificName}</p>
        </div>

        <div className="flex gap-2 border-b border-gray-200 pb-1 overflow-x-auto hide-scrollbar">
          {galleryCategories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg whitespace-nowrap transition-colors ${
                activeCategory === cat.key
                  ? 'text-primary border-b-2 border-primary -mb-px'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {totalSlides > 0 && (
          <div className="relative rounded-2xl overflow-hidden bg-skeleton group">
            {!imgLoadedMap[`${activeCategory}-${currentSlideIndex}`] && (
              <Skeleton className="w-full aspect-[16/10] rounded-none" rounded="" />
            )}
            <img
              src={currentGallery[currentSlideIndex]}
              alt={`${plant.name}-${galleryCategories.find((c) => c.key === activeCategory)?.label}`}
              onLoad={() =>
                setImgLoadedMap((m) => ({ ...m, [`${activeCategory}-${currentSlideIndex}`]: true }))
              }
              className={`w-full aspect-[16/10] object-cover transition-opacity duration-300 ${
                imgLoadedMap[`${activeCategory}-${currentSlideIndex}`] ? 'opacity-100' : 'opacity-0 absolute inset-0'
              }`}
            />
            {totalSlides > 1 && (
              <>
                <button
                  onClick={prevSlide}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  aria-label="上一张"
                >
                  <ChevronLeft size={20} className="text-gray-700" />
                </button>
                <button
                  onClick={nextSlide}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/80 backdrop-blur-sm flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  aria-label="下一张"
                >
                  <ChevronRight size={20} className="text-gray-700" />
                </button>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                  {currentGallery.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCurrentSlideIndex(i)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        i === currentSlideIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                      aria-label={`第${i + 1}张`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        <div className="bg-white rounded-2xl p-6 shadow-[0_2px_12px_rgba(0,0,0,0.10)] space-y-5">
          <div>
            <h3 className="text-sm font-semibold text-primary mb-2">分布地区</h3>
            <p className="text-text-body text-[15px]" style={{ lineHeight: 1.8 }}>
              {plant.distribution}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-primary mb-2">常见用途</h3>
            <p className="text-text-body text-[15px]" style={{ lineHeight: 1.8 }}>
              {plant.uses}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-primary mb-2">详细介绍</h3>
            <p className="text-text-body text-[15px]" style={{ lineHeight: 1.8 }}>
              {plant.description}
            </p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-text-primary mb-4">全部图片</h3>
          <div className="masonry-grid">
            {allGalleryImages.map((item) => (
              <div key={item.key} className="masonry-item relative rounded-xl overflow-hidden bg-skeleton">
                {!imgLoadedMap[`all-${item.key}`] && <Skeleton className="w-full h-40 rounded-none" rounded="" />}
                <img
                  src={item.url}
                  alt={item.category}
                  loading="lazy"
                  onLoad={() =>
                    setImgLoadedMap((m) => ({ ...m, [`all-${item.key}`]: true }))
                  }
                  className={`w-full h-auto rounded-xl object-cover transition-opacity duration-300 ${
                    imgLoadedMap[`all-${item.key}`] ? 'opacity-100' : 'opacity-0'
                  }`}
                />
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/50 text-white text-xs backdrop-blur-sm">
                  {item.category}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
