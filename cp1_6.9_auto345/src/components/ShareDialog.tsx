import { useEffect, useState, useRef } from 'react';
import { useGalleryStore } from '@/hooks/useGalleryStore';
import { api, encodeViewParams } from '@/utils/api';
import type { CaptureResponse } from '@/types';

interface ShareDialogProps {
  open: boolean;
}

export default function ShareDialog({ open }: ShareDialogProps) {
  const setShareDialogOpen = useGalleryStore((s) => s.setShareDialogOpen);
  const showToast = useGalleryStore((s) => s.showToast);
  const cameraState = useGalleryStore((s) => s.cameraState);
  const selectedSculptureId = useGalleryStore((s) => s.selectedSculptureId);
  const sculptures = useGalleryStore((s) => s.sculptures);

  const [loading, setLoading] = useState(false);
  const [capture, setCapture] = useState<CaptureResponse | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && selectedSculptureId) {
      setLoading(true);
      setCapture(null);
      setCopied(false);
      api
        .captureView({
          sculptureId: selectedSculptureId,
          position: cameraState.position,
          target: cameraState.target,
          zoom: cameraState.zoom
        })
        .then((res) => {
          setCapture(res);
          const params = encodeViewParams({
            position: cameraState.position,
            target: cameraState.target,
            zoom: cameraState.zoom,
            sculptureId: selectedSculptureId
          });
          const url = `${window.location.origin}/view?${params}`;
          setShareUrl(url);
        })
        .catch((err) => {
          showToast('生成快照失败，请重试');
          console.error(err);
        })
        .finally(() => setLoading(false));
    } else {
      setCapture(null);
      setShareUrl('');
    }
  }, [open, selectedSculptureId, cameraState.position.x, cameraState.position.y, cameraState.position.z, cameraState.target.x, cameraState.target.y, cameraState.target.z, cameraState.zoom]);

  const handleCopy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToast('已复制分享链接');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      urlInputRef.current?.select();
      document.execCommand('copy');
      setCopied(true);
      showToast('已复制分享链接');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const sculpture = sculptures.find((s) => s.id === selectedSculptureId);

  return (
    <div
      className={`modal-overlay ${open ? 'open' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) setShareDialogOpen(false);
      }}
    >
      <div className="modal-content">
        <div className="modal-header">
          <h3 className="modal-title">分享视角 · {sculpture?.title || '雕塑'}</h3>
          <button className="modal-close" onClick={() => setShareDialogOpen(false)}>
            ✕
          </button>
        </div>

        {loading ? (
          <div className="loading-state" style={{ minHeight: 300 }}>
            <div className="loading-spinner" />
            <span>正在生成快照...</span>
          </div>
        ) : capture ? (
          <>
            <div className="share-preview">
              {capture.imageBase64 && (
                <img src={`data:image/png;base64,${capture.imageBase64}`} alt="视角快照" />
              )}
            </div>
            <div className="share-url-row">
              <input
                ref={urlInputRef}
                className="share-url-input"
                value={shareUrl}
                readOnly
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <button
                className={`btn ${copied ? 'btn-ghost' : 'btn-primary'}`}
                onClick={handleCopy}
              >
                {copied ? '✓ 已复制' : '复制链接'}
              </button>
            </div>
            <p className="share-tips">
              将链接发送给好友，对方打开即可看到完全相同的雕塑视角
            </p>
          </>
        ) : null}
      </div>
    </div>
  );
}
