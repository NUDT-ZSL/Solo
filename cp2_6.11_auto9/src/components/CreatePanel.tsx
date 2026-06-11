import { useState, useRef, useCallback } from 'react';
import { X, Upload, Image, Mic } from 'lucide-react';
import type { EmotionTag } from '../../shared/types';
import { ALL_EMOTION_TAGS, EMOTION_LABELS, EMOTION_COLORS } from '../../shared/types';

interface CreatePanelProps {
  lat: number;
  lng: number;
  onSubmit: (data: FormData) => void;
  onClose: () => void;
}

export default function CreatePanel({ lat, lng, onSubmit, onClose }: CreatePanelProps) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [emotionTag, setEmotionTag] = useState<EmotionTag>('serene');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState<string>('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [error, setError] = useState('');

  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleAudioChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!['audio/wav', 'audio/mpeg', 'audio/mp3'].includes(file.type)) {
        setError('仅支持 WAV/MP3 格式');
        return;
      }

      const url = URL.createObjectURL(file);
      const audio = new Audio(url);
      audio.onloadedmetadata = () => {
        if (audio.duration > 15) {
          setError('音频最长15秒');
          URL.revokeObjectURL(url);
          return;
        }
        setAudioFile(file);
        setAudioPreview(url);
        setError('');
      };
    },
    []
  );

  const handleImageChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        setError('仅支持 JPG/PNG 格式');
        return;
      }

      if (file.size > 2 * 1024 * 1024) {
        setError('图片最大2MB');
        return;
      }

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
    },
    []
  );

  const handleSubmit = useCallback(() => {
    if (!audioFile) {
      setError('请上传音频文件');
      return;
    }
    if (!title.trim()) {
      setError('请填写标题');
      return;
    }

    const formData = new FormData();
    formData.append('lat', lat.toString());
    formData.append('lng', lng.toString());
    formData.append('title', title.trim());
    formData.append('note', note.trim());
    formData.append('emotionTag', emotionTag);
    formData.append('audio', audioFile);
    if (imageFile) {
      formData.append('image', imageFile);
    }

    onSubmit(formData);
  }, [audioFile, imageFile, title, note, emotionTag, lat, lng, onSubmit]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-earth-brown/40">
      <div
        className="bg-earth-cream rounded-map shadow-map w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        <div className="flex items-center justify-between p-4 border-b border-earth-brown/10">
          <h2 className="font-display text-lg font-semibold text-earth-brown">
            创建声景标记
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-earth-brown/60 hover:text-earth-brown transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          <div className="text-xs text-earth-brown/50">
            位置：{lat.toFixed(4)}, {lng.toFixed(4)}
          </div>

          <div>
            <label className="block text-sm font-medium text-earth-brown mb-1">
              标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给这个声景起个名字"
              className="w-full px-3 py-2 text-sm bg-earth-warm/50 rounded-lg border border-earth-brown/10 text-earth-brown placeholder:text-earth-brown/40 focus:outline-none focus:border-earth-wheat"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-earth-brown mb-1">
              音频文件（WAV/MP3，最长15秒）
            </label>
            <input
              ref={audioInputRef}
              type="file"
              accept=".wav,.mp3,audio/wav,audio/mpeg"
              onChange={handleAudioChange}
              className="hidden"
            />
            <button
              onClick={() => audioInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-earth-wheat/50 text-earth-brown rounded-lg hover:bg-earth-wheat/70 transition-colors text-sm w-full justify-center"
            >
              <Mic size={16} />
              {audioFile ? audioFile.name : '选择音频文件'}
            </button>
            {audioPreview && (
              <audio src={audioPreview} controls className="mt-2 w-full h-8" />
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-earth-brown mb-1">
              文字笔记（最多200字）
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 200))}
              placeholder="描述你在这里听到的声音..."
              rows={3}
              className="w-full px-3 py-2 text-sm bg-earth-warm/50 rounded-lg border border-earth-brown/10 text-earth-brown placeholder:text-earth-brown/40 focus:outline-none focus:border-earth-wheat resize-none"
            />
            <div className="text-xs text-earth-brown/40 text-right">
              {note.length}/200
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-earth-brown mb-1">
              情绪标签
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_EMOTION_TAGS.map((tag) => (
                <button
                  key={tag}
                  onClick={() => setEmotionTag(tag)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors duration-300 ${
                    emotionTag === tag
                      ? 'bg-earth-brown text-white'
                      : 'bg-earth-warm/60 text-earth-brown hover:bg-earth-warm'
                  }`}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{
                      backgroundColor: EMOTION_COLORS[tag],
                    }}
                  />
                  {EMOTION_LABELS[tag]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-earth-brown mb-1">
              现场图片（JPG/PNG，最大2MB）
            </label>
            <input
              ref={imageInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              onChange={handleImageChange}
              className="hidden"
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              className="flex items-center gap-2 px-4 py-2 bg-earth-wheat/50 text-earth-brown rounded-lg hover:bg-earth-wheat/70 transition-colors text-sm w-full justify-center"
            >
              <Image size={16} />
              {imageFile ? imageFile.name : '选择图片'}
            </button>
            {imagePreview && (
              <img
                src={imagePreview}
                alt="preview"
                className="mt-2 w-full h-32 object-cover rounded-lg"
              />
            )}
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            className="w-full py-2.5 bg-earth-wheat text-earth-brown font-medium rounded-lg hover:bg-earth-wheatHover transition-colors duration-300"
          >
            创建标记
          </button>
        </div>
      </div>
    </div>
  );
}
