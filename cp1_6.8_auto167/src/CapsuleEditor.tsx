import { useState, useRef } from "react";
import { X, ImagePlus, Mic, Calendar, Globe, Lock, Plus } from "lucide-react";
import { useCapsuleStore } from "@/store/capsuleStore";
import { getCountdown } from "@/TimeCapsuleEngine";

interface CapsuleEditorProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CapsuleEditor({ isOpen, onClose }: CapsuleEditorProps) {
  const addCapsule = useCapsuleStore((s) => s.addCapsule);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [unlockDate, setUnlockDate] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [audioName, setAudioName] = useState<string | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageFilesRef = useRef<File[]>([]);
  const audioFileRef = useRef<File | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !unlockDate) return;

    addCapsule({
      title: title.trim(),
      content: content.trim(),
      images: [],
      audioUrl: null,
      unlockDate,
      isPublic,
      tags,
      creatorId: "current_user",
    });

    setTitle("");
    setContent("");
    setUnlockDate("");
    setIsPublic(false);
    setTags([]);
    setImagePreviews([]);
    setAudioName(null);
    imageFilesRef.current = [];
    audioFileRef.current = null;
    onClose();
  };

  const handleAddTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    imageFilesRef.current = [...imageFilesRef.current, ...files];
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setImagePreviews([...imagePreviews, ...newPreviews]);
  };

  const handleRemoveImage = (index: number) => {
    const newFiles = [...imageFilesRef.current];
    const newPreviews = [...imagePreviews];
    newFiles.splice(index, 1);
    newPreviews.splice(index, 1);
    imageFilesRef.current = newFiles;
    setImagePreviews(newPreviews);
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      audioFileRef.current = file;
      setAudioName(file.name);
    }
  };

  const unlockDateObj = unlockDate ? new Date(unlockDate) : null;
  const isFutureDate = unlockDateObj ? unlockDateObj > new Date() : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white/80 backdrop-blur-xl shadow-2xl border border-[#C9B99A]/30 animate-editor-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/60 backdrop-blur-xl border-b border-[#C9B99A]/20 rounded-t-2xl">
          <h2 className="text-xl font-serif text-[#5C4A32]">封存时间胶囊</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-[#C9B99A]/20 transition-colors"
          >
            <X size={20} className="text-[#8B7355]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-[#6B5B45] mb-1.5">
              胶囊标题
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="给你的时间胶囊起个名字..."
              className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8F0]/60 border border-[#C9B99A]/30 text-[#3D3024] placeholder:text-[#B8A88A] focus:outline-none focus:ring-2 focus:ring-[#D4A574]/40 focus:border-[#D4A574] transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#6B5B45] mb-1.5">
              写给未来的话
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="把你想说的话封存在这里..."
              rows={6}
              className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8F0]/60 border border-[#C9B99A]/30 text-[#3D3024] placeholder:text-[#B8A88A] focus:outline-none focus:ring-2 focus:ring-[#D4A574]/40 focus:border-[#D4A574] transition-all resize-none leading-relaxed"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#6B5B45] mb-1.5">
              图片记忆
            </label>
            <div className="flex flex-wrap gap-3">
              {imagePreviews.map((src, i) => (
                <div
                  key={i}
                  className="relative w-20 h-20 rounded-lg overflow-hidden border border-[#C9B99A]/30"
                >
                  <img
                    src={src}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(i)}
                    className="absolute top-0.5 right-0.5 p-0.5 bg-black/50 rounded-full text-white"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                className="w-20 h-20 rounded-lg border-2 border-dashed border-[#C9B99A]/40 flex items-center justify-center hover:border-[#D4A574] hover:bg-[#D4A574]/5 transition-all"
              >
                <ImagePlus size={24} className="text-[#B8A88A]" />
              </button>
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#6B5B45] mb-1.5">
              声音留念
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => audioInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FFF8F0]/60 border border-[#C9B99A]/30 hover:border-[#D4A574] transition-all"
              >
                <Mic size={18} className="text-[#B8A88A]" />
                <span className="text-sm text-[#8B7355]">
                  {audioName || "上传录音"}
                </span>
              </button>
              {audioName && (
                <button
                  type="button"
                  onClick={() => {
                    setAudioName(null);
                    audioFileRef.current = null;
                  }}
                  className="p-1 rounded-full hover:bg-red-50 transition-colors"
                >
                  <X size={16} className="text-red-400" />
                </button>
              )}
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/*"
                onChange={handleAudioChange}
                className="hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#6B5B45] mb-1.5">
              <Calendar
                size={14}
                className="inline mr-1 -mt-0.5 text-[#D4A574]"
              />
              开启日期
            </label>
            <input
              type="date"
              value={unlockDate}
              onChange={(e) => setUnlockDate(e.target.value)}
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-4 py-2.5 rounded-xl bg-[#FFF8F0]/60 border border-[#C9B99A]/30 text-[#3D3024] focus:outline-none focus:ring-2 focus:ring-[#D4A574]/40 focus:border-[#D4A574] transition-all"
              required
            />
            {isFutureDate && (
              <p className="mt-1.5 text-xs text-[#D4A574]">
                距离开启还有 {getCountdown(unlockDate)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#6B5B45] mb-1.5">
              标签
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D4A574]/15 text-[#8B7355] text-xs"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="输入标签后回车"
                className="flex-1 px-3 py-2 rounded-lg bg-[#FFF8F0]/60 border border-[#C9B99A]/30 text-sm text-[#3D3024] placeholder:text-[#B8A88A] focus:outline-none focus:ring-2 focus:ring-[#D4A574]/40 transition-all"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="px-3 py-2 rounded-lg bg-[#D4A574]/15 text-[#8B7355] hover:bg-[#D4A574]/25 transition-colors"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between py-3 px-4 rounded-xl bg-[#FFF8F0]/40 border border-[#C9B99A]/20">
            <div className="flex items-center gap-2">
              {isPublic ? (
                <Globe size={18} className="text-[#D4A574]" />
              ) : (
                <Lock size={18} className="text-[#B8A88A]" />
              )}
              <span className="text-sm text-[#6B5B45]">
                {isPublic ? "公开分享到时间线墙" : "仅自己可见"}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPublic(!isPublic)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                isPublic ? "bg-[#D4A574]" : "bg-[#C9B99A]/40"
              }`}
            >
              <span
                className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                  isPublic ? "translate-x-5.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4A574] to-[#C9956B] text-white font-medium shadow-lg shadow-[#D4A574]/20 hover:shadow-xl hover:shadow-[#D4A574]/30 active:scale-[0.98] transition-all"
          >
            封存胶囊
          </button>
        </form>
      </div>
    </div>
  );
}
