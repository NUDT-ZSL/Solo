import { useState, useMemo, useEffect } from 'react';
import { X, Plus, Trash2, Calendar, Clock } from 'lucide-react';
import { usePhotoStore } from '@/store/usePhotoStore';
import { getAllTagStats } from '@/modules/TagManager';
import { cn } from '@/lib/utils';

export function PhotoModal() {
  const {
    photos,
    isModalOpen,
    currentPhotoId,
    closeModal,
    addTagToPhoto,
    removeTagFromPhoto,
  } = usePhotoStore();

  const [newTag, setNewTag] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const photo = useMemo(() =>
    photos.find(p => p.id === currentPhotoId),
    [photos, currentPhotoId]
  );

  const allTags = useMemo(() => getAllTagStats(photos).map(t => t.tag), [photos]);

  const filteredSuggestions = useMemo(() => {
    if (!searchQuery) return [];
    return allTags.filter(
      tag => tag.includes(searchQuery) && !photo?.tags.includes(tag)
    ).slice(0, 5);
  }, [allTags, searchQuery, photo?.tags]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
    };

    if (isModalOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isModalOpen, closeModal]);

  if (!isModalOpen || !photo) return null;

  const handleAddTag = (tag?: string) => {
    const tagToAdd = tag || newTag.trim();
    if (!tagToAdd || tagToAdd.length > 8) return;
    if (photo.tags.includes(tagToAdd)) return;
    if (photo.tags.length >= 10) {
      alert('每张照片最多10个标签');
      return;
    }

    addTagToPhoto(photo.id, tagToAdd);
    setNewTag('');
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={closeModal}
    >
      <div
        className="bg-white w-full md:max-w-4xl md:rounded-2xl overflow-hidden shadow-2xl"
        style={{
          animation: 'slideUp 0.3s ease-out',
          borderTopLeftRadius: '16px',
          borderTopRightRadius: '16px',
        }}
        onClick={e => e.stopPropagation()}
      >
        <style>{`
          @keyframes slideUp {
            from {
              transform: translateY(100%);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
        `}</style>

        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-[#1e293b] truncate pr-4">
            {photo.fileName}
          </h3>
          <button
            onClick={closeModal}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex flex-col md:flex-row max-h-[80vh] overflow-y-auto">
          <div className="md:w-2/3 bg-gray-900">
            <img
              src={photo.dataUrl}
              alt={photo.fileName}
              className="w-full h-auto"
            />
          </div>

          <div className="md:w-1/3 p-4 md:p-6">
            <div className="flex items-center gap-4 mb-4 text-sm text-gray-500">
              <div className="flex items-center gap-1">
                <Calendar size={14} />
                <span>{formatDate(photo.uploadTime)}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock size={14} />
                <span>{formatTime(photo.uploadTime)}</span>
              </div>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-[#1e293b]">标签</h4>
                <span className="text-xs text-gray-500">
                  {photo.tags.length}/10
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {photo.tags.map(tag => (
                  <div
                    key={tag}
                    className="group flex items-center gap-1 px-3 py-1.5 bg-[#e0e7ff] text-[#4338ca] rounded-full text-sm"
                  >
                    <span>{tag}</span>
                    <button
                      onClick={() => removeTagFromPhoto(photo.id, tag)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity hover:text-red-500"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}

                {photo.tags.length === 0 && (
                  <p className="text-sm text-gray-400">暂无标签</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[#1e293b] mb-2">
                添加标签
              </label>

              <div className="relative">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={e => {
                      setNewTag(e.target.value);
                      setSearchQuery(e.target.value);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="输入标签（最多8字）"
                    maxLength={8}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#4338ca] focus:ring-1 focus:ring-[#4338ca]"
                  />
                  <button
                    onClick={() => handleAddTag()}
                    disabled={!newTag.trim() || photo.tags.length >= 10}
                    className={cn(
                      'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                      'flex items-center gap-1',
                      newTag.trim() && photo.tags.length < 10
                        ? 'bg-[#4338ca] text-white hover:bg-[#3730a3]'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    )}
                  >
                    <Plus size={16} />
                    添加
                  </button>
                </div>

                {filteredSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden z-10">
                    {filteredSuggestions.map(suggestion => (
                      <button
                        key={suggestion}
                        onClick={() => handleAddTag(suggestion)}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-[#e0e7ff] transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 p-3 bg-gray-50 rounded-lg">
              <h5 className="text-xs font-medium text-gray-500 mb-2">图像特征</h5>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">主色调：</span>
                  <div className="inline-flex items-center gap-1">
                    <div
                      className="w-4 h-4 rounded border border-gray-200"
                      style={{
                        backgroundColor: `rgb(${photo.features.dominantColor.r}, ${photo.features.dominantColor.g}, ${photo.features.dominantColor.b})`,
                      }}
                    />
                    <span>
                      RGB({photo.features.dominantColor.r}, {photo.features.dominantColor.g}, {photo.features.dominantColor.b})
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-gray-500">纹理复杂度：</span>
                  <span>{photo.features.textureComplexity.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
