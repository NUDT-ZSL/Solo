import { useState, useRef } from 'react';
import { X, Upload, Image as ImageIcon } from 'lucide-react';
import { ALL_TAGS, TAG_COLORS } from '@/types';
import type { EmotionTag } from '@/types';

interface CreateMarkerProps {
  lng: number;
  lat: number;
  onClose: () => void;
  onSubmit: (data: FormData) => void;
}

export default function CreateMarker({ lng, lat, onClose, onSubmit }: CreateMarkerProps) {
  const [note, setNote] = useState('');
  const [tag, setTag] = useState<EmotionTag>('宁静');
  const [title, setTitle] = useState('');
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [audioPreview, setAudioPreview] = useState('');
  const [imagePreview, setImagePreview] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/x-wav'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload WAV or MP3 format');
      return;
    }
    setAudioFile(file);
    setAudioPreview(URL.createObjectURL(file));
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (!validTypes.includes(file.type)) {
      alert('Please upload JPG or PNG format');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    if (!audioFile) {
      alert('Please upload an audio file');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('audio', audioFile);
    if (imageFile) formData.append('image', imageFile);
    formData.append('lng', lng.toString());
    formData.append('lat', lat.toString());
    formData.append('note', note);
    formData.append('tag', tag);
    formData.append('title', title || `Sound at ${lng.toFixed(4)}, ${lat.toFixed(4)}`);
    formData.append('isPublic', isPublic.toString());
    formData.append('userId', 'current_user');

    try {
      await onSubmit(formData);
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="card sound-card-enter"
      style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 340,
        maxHeight: '85vh',
        overflow: 'auto',
        zIndex: 150,
        padding: 20,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700 }}>Create Sound Marker</h3>
        <button
          onClick={onClose}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#3E2723' }}
        >
          <X size={20} />
        </button>
      </div>

      <div style={{ fontSize: 12, color: '#8D6E63', marginBottom: 12 }}>
        📍 {lng.toFixed(4)}, {lat.toFixed(4)}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Give this soundscape a name..."
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #D4A373',
            background: '#FFF8E7',
          }}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
          Audio (WAV/MP3, max 15s) *
        </label>
        <input
          ref={audioInputRef}
          type="file"
          accept="audio/wav,audio/mpeg,audio/mp3"
          onChange={handleAudioChange}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => audioInputRef.current?.click()}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <Upload size={14} /> {audioFile ? audioFile.name : 'Upload Audio'}
        </button>
        {audioPreview && (
          <audio src={audioPreview} controls style={{ width: '100%', marginTop: 8, height: 36 }} />
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
          Image (JPG/PNG, max 2MB)
        </label>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/jpeg,image/png"
          onChange={handleImageChange}
          style={{ display: 'none' }}
        />
        <button
          onClick={() => imageInputRef.current?.click()}
          className="btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}
        >
          <ImageIcon size={14} /> {imageFile ? imageFile.name : 'Upload Image'}
        </button>
        {imagePreview && (
          <img
            src={imagePreview}
            alt="preview"
            style={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 8, marginTop: 8 }}
          />
        )}
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 4 }}>
          Note (max 200 chars)
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 200))}
          placeholder="Describe the soundscape..."
          rows={3}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: 8,
            border: '1px solid #D4A373',
            background: '#FFF8E7',
            resize: 'none',
          }}
        />
        <div style={{ fontSize: 10, color: '#8D6E63', textAlign: 'right' }}>{note.length}/200</div>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>
          Emotion Tag
        </label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ALL_TAGS.map((t) => (
            <button
              key={t}
              onClick={() => setTag(t)}
              style={{
                padding: '4px 10px',
                borderRadius: 12,
                border: tag === t ? `2px solid ${TAG_COLORS[t]}` : '1px solid #D4A373',
                background: tag === t ? `${TAG_COLORS[t]}20` : '#FFF8E7',
                color: tag === t ? TAG_COLORS[t] : '#5D4037',
                fontSize: 12,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: tag === t ? 700 : 400,
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              <span
                className="tag-dot"
                style={{ background: TAG_COLORS[t], width: 8, height: 8, margin: 0 }}
              />
              {t}
            </button>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Public</label>
        <button
          onClick={() => setIsPublic(!isPublic)}
          style={{
            width: 40,
            height: 22,
            borderRadius: 11,
            border: 'none',
            background: isPublic ? '#6ECB63' : '#ccc',
            position: 'relative',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              background: 'white',
              position: 'absolute',
              top: 2,
              left: isPublic ? 20 : 2,
              transition: 'left 0.2s',
            }}
          />
        </button>
      </div>

      <button
        className="btn-primary"
        onClick={handleSubmit}
        disabled={submitting}
        style={{
          width: '100%',
          padding: '10px 0',
          fontSize: 14,
          opacity: submitting ? 0.6 : 1,
        }}
      >
        {submitting ? 'Creating...' : 'Create Sound Marker'}
      </button>
    </div>
  );
}
