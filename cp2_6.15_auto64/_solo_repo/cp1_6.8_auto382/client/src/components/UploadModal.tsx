import { useState, useRef, type DragEvent } from 'react';
import { useGalleryStore } from '@/lib/store';
import { X, Upload, ImagePlus, Link, Check } from 'lucide-react';

export default function UploadModal({ onClose }: { onClose: () => void }) {
  const { upload, uploading, uploadResult, clearUploadResult } = useGalleryStore();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selected: File) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(selected.type)) {
      setError('仅支持 JPG/PNG/GIF/WebP 格式');
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError('图片大小不能超过 10MB');
      return;
    }
    setError('');
    setFile(selected);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(selected);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleSubmit = async () => {
    if (!file) return;
    await upload(file, description.trim() || undefined);
  };

  const handleCopy = async () => {
    if (!uploadResult) return;
    const url = `${window.location.origin}/detail/${uploadResult.id}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = () => {
    clearUploadResult();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm animate-fade-in" />

      <div
        className="glass-panel relative w-full max-w-md p-6 sm:p-8 animate-scale-in z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X size={20} />
        </button>

        {!uploadResult ? (
          <>
            <h2 className="font-display text-xl font-bold bg-gradient-to-r from-[#7C83FD] to-[#A855F7] bg-clip-text text-transparent mb-6">
              上传图片
            </h2>

            <div
              onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className="relative border-2 border-dashed border-gray-200/80 rounded-2xl
                hover:border-[#7C83FD]/40 transition-colors cursor-pointer
                flex flex-col items-center justify-center min-h-[200px]"
            >
              {preview ? (
                <img src={preview} alt="预览" className="max-h-56 rounded-xl object-contain p-2" />
              ) : (
                <div className="text-center py-8">
                  <ImagePlus size={48} strokeWidth={1} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm text-gray-400 font-body">
                    拖拽图片到此处，或点击选择
                  </p>
                  <p className="text-xs text-gray-300 font-body mt-1">
                    支持 JPG/PNG/GIF/WebP，最大 10MB
                  </p>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
                className="hidden"
              />
            </div>

            {error && (
              <p className="mt-2 text-sm text-red-400 font-body">{error}</p>
            )}

            <textarea
              value={description}
              onChange={(e) => {
                if (e.target.value.length <= 200) setDescription(e.target.value);
              }}
              placeholder="添加一段描述（可选，最多200字）"
              maxLength={200}
              rows={3}
              className="w-full mt-4 px-4 py-3 rounded-xl border border-gray-200/60 bg-white/40
                text-sm font-body text-gray-700 placeholder:text-gray-300 resize-none
                focus:outline-none focus:border-[#7C83FD]/40 focus:ring-2 focus:ring-[#7C83FD]/10
                transition-all"
            />

            <button
              onClick={handleSubmit}
              disabled={!file || uploading}
              className="btn-gradient w-full mt-4 py-3 text-sm flex items-center justify-center gap-2
                disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {uploading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Upload size={16} />
                  上传
                </>
              )}
            </button>
          </>
        ) : (
          <div className="text-center py-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-r from-[#7C83FD] to-[#A855F7] flex items-center justify-center mx-auto mb-4">
              <Check size={32} className="text-white" />
            </div>

            <h3 className="font-display text-lg font-bold text-gray-700 mb-2">
              上传成功！
            </h3>

            <p className="text-sm text-gray-400 font-body mb-4">
              你的图片已加入画廊
            </p>

            <div className="flex items-center gap-2 p-3 rounded-xl bg-white/40 border border-gray-200/40">
              <Link size={14} className="text-[#7C83FD] flex-shrink-0" />
              <span className="text-sm text-gray-600 font-body truncate flex-1">
                {window.location.origin}/detail/{uploadResult.id}
              </span>
              <button
                onClick={handleCopy}
                className="text-xs text-[#7C83FD] hover:text-[#A855F7] transition-colors flex-shrink-0 font-body"
              >
                {copied ? '已复制' : '复制'}
              </button>
            </div>

            <button
              onClick={handleClose}
              className="btn-gradient w-full mt-6 py-3 text-sm"
            >
              继续浏览
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
