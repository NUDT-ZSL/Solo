import React, { useRef, useState } from 'react';
import { GlassHeader } from '../components/GlassHeader';
import { useRecognition } from '../hooks';
import { useFavorites } from '../hooks';
import { Heart, HeartOff, Camera, Upload, RefreshCw, Loader2, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Recognition() {
  const { imageDataUrl, result, loading, error, recognize, reset } = useRecognition();
  const { add, remove, check } = useFavorites();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('请上传图片文件');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      recognize(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const isFav = result ? check(result.plant.id) : false;

  const toggleFavorite = () => {
    if (!result) return;
    if (isFav) remove(result.plant.id);
    else add(result.plant.id);
  };

  const confidencePct = result ? Math.round(result.confidence * 100) : 0;

  return (
    <div className="min-h-screen pb-20">
      <GlassHeader title="叶片识别" />
      <div className="max-w-5xl mx-auto px-4 py-6">
        {!imageDataUrl && (
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDrop}
            className={`w-full aspect-[4/3] max-w-lg mx-auto rounded-2xl border-2 border-dashed flex flex-col items-center justify-center gap-4 transition-all cursor-pointer ${
              isDragOver ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-gray-300 bg-white hover:border-primary/60 hover:bg-white/80'
            }`}
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Upload size={28} strokeWidth={1.8} />
            </div>
            <div className="text-center">
              <p className="text-text-primary font-medium">点击或拖拽上传叶片照片</p>
              <p className="text-sm text-gray-500 mt-1">支持 JPG、PNG 格式</p>
            </div>
            <div className="flex gap-3 mt-2">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-4 py-2 rounded-lg bg-primary text-white font-medium hover:bg-secondary transition-colors flex items-center gap-2"
              >
                <Upload size={16} />
                上传图片
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  cameraInputRef.current?.click();
                }}
                className="px-4 py-2 rounded-lg bg-white border border-gray-200 text-text-primary font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Camera size={16} />
                相机拍摄
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleInputChange}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleInputChange}
            />
          </div>
        )}

        {imageDataUrl && !result && !loading && (
          <div className="max-w-lg mx-auto space-y-4">
            <div className="w-full rounded-2xl overflow-hidden bg-white shadow-md">
              <img src={imageDataUrl} alt="上传的叶片" className="w-full h-auto" />
            </div>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => recognize(imageDataUrl)}
                className="px-6 py-3 rounded-xl bg-primary text-white font-medium hover:bg-secondary transition-colors flex items-center gap-2"
              >
                开始识别
              </button>
              <button
                onClick={reset}
                className="px-6 py-3 rounded-xl bg-white border border-gray-200 text-text-primary font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={16} />
                重新上传
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="max-w-lg mx-auto space-y-4">
            <div className="w-full rounded-2xl overflow-hidden bg-white shadow-md">
              <img src={imageDataUrl!} alt="上传的叶片" className="w-full h-auto opacity-70" />
            </div>
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Loader2 size={24} className="text-primary animate-spin" />
              </div>
              <p className="text-text-primary font-medium">正在识别中...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="max-w-lg mx-auto p-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-center">
            {error}
          </div>
        )}

        {result && (
          <div className="max-w-2xl mx-auto animate-[slide-in-right_0.4s_ease-out]">
            <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.10)] overflow-hidden">
              <div className="relative">
                <img src={result.plant.leafImage} alt={result.plant.name} className="w-full aspect-[16/9] object-cover" />
                <button
                  onClick={toggleFavorite}
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:scale-110 transition-transform shadow-md"
                >
                  {isFav ? (
                    <Heart size={20} className="text-red-500 fill-red-500" />
                  ) : (
                    <HeartOff size={20} className="text-gray-500" />
                  )}
                </button>
              </div>

              <div className="p-6 space-y-5">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-text-primary">{result.plant.name}</h2>
                    <p className="text-sm italic text-gray-500 mt-1">{result.plant.scientificName}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">识别置信度</span>
                    <span className="font-semibold text-primary">{confidencePct}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
                      style={{ width: `${confidencePct}%` }}
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Info size={14} className="text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">分布地区</p>
                      <p className="text-sm text-text-body mt-0.5" style={{ lineHeight: 1.8 }}>{result.plant.distribution}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-secondary/10 flex items-center justify-center flex-shrink-0">
                      <Info size={14} className="text-secondary" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">常见用途</p>
                      <p className="text-sm text-text-body mt-0.5" style={{ lineHeight: 1.8 }}>{result.plant.uses}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/encyclopedia/${result.plant.id}`)}
                  className="w-full py-3 rounded-xl bg-bg text-primary font-medium hover:bg-primary/10 transition-colors border border-primary/20"
                >
                  查看详细百科 →
                </button>
              </div>
            </div>

            <div className="mt-4 flex justify-center">
              <button
                onClick={reset}
                className="px-6 py-2.5 rounded-xl bg-white border border-gray-200 text-text-primary font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={16} />
                重新识别
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
