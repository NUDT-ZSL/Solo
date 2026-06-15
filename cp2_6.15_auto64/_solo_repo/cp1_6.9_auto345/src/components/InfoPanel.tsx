import { useGalleryStore } from '@/hooks/useGalleryStore';

export default function InfoPanel() {
  const selectedSculptureId = useGalleryStore((s) => s.selectedSculptureId);
  const sculptures = useGalleryStore((s) => s.sculptures);
  const selectSculpture = useGalleryStore((s) => s.selectSculpture);
  const setShareDialogOpen = useGalleryStore((s) => s.setShareDialogOpen);

  const sculpture = sculptures.find((s) => s.id === selectedSculptureId);
  const open = !!sculpture;

  return (
    <div
      className={`info-panel ${open ? 'open' : ''}`}
      onClick={(e) => e.stopPropagation()}
    >
      {sculpture && (
        <>
          <div className="info-panel-header">
            <div>
              <h2 className="info-title">{sculpture.title}</h2>
              <div className="info-artist">艺术家：{sculpture.artist}</div>
            </div>
            <button
              className="info-close-btn"
              onClick={() => selectSculpture(null)}
              aria-label="关闭"
            >
              ✕
            </button>
          </div>

          <div className="info-body">
            <div className="info-meta">
              <p className="info-description">{sculpture.description}</p>
              <span className="info-material">材质：{sculpture.materialType}</span>
            </div>
            <div className="info-actions">
              <button
                className="btn btn-primary"
                onClick={() => setShareDialogOpen(true)}
              >
                📷 生成快照
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
