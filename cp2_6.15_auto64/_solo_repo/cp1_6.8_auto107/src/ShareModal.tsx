import React, { useState, useEffect, useRef, useCallback } from "react";
import QRCode from "qrcode";
import { EchoCard, mapSentimentToColors } from "./EchoCardEngine";

interface ShareModalProps {
  card: EchoCard;
  onClose: () => void;
}

const ShareModal: React.FC<ShareModalProps> = ({ card, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [embedCopied, setEmbedCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const shareUrl = `${window.location.origin}/card/${card.id}`;
  const embedCode = `<iframe src="${shareUrl}" width="400" height="300" frameborder="0" style="border-radius:12px;"></iframe>`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, shareUrl, {
        width: 160,
        margin: 2,
        color: { dark: "#c9a96e", light: "#0a0e1a" },
      });
    }
  }, [shareUrl]);

  const handleCopyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = shareUrl;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [shareUrl]);

  const handleCopyEmbed = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(embedCode);
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = embedCode;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setEmbedCopied(true);
      setTimeout(() => setEmbedCopied(false), 2000);
    }
  }, [embedCode]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === overlayRef.current) onClose();
    },
    [onClose]
  );

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const colors = mapSentimentToColors(card.sentiment.sentiment);

  return (
    <div className="modal-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="modal">
        <button className="modal__close" onClick={onClose}>×</button>

        <h2 className="modal__title" style={{ color: colors.primary }}>
          分享回声
        </h2>

        <div className="modal__card-preview">
          <h3 className="modal__card-title">{card.title}</h3>
          <p className="modal__card-poem">{card.poetic_comment}</p>
        </div>

        <div className="modal__qr">
          <canvas ref={canvasRef} />
        </div>

        <div className="modal__section">
          <label className="modal__label">分享链接</label>
          <div className="modal__copy-row">
            <input
              className="modal__input"
              type="text"
              value={shareUrl}
              readOnly
            />
            <button className="modal__copy-btn" onClick={handleCopyLink}>
              {copied ? "已复制 ✓" : "复制"}
            </button>
          </div>
        </div>

        <div className="modal__section">
          <label className="modal__label">嵌入代码</label>
          <div className="modal__copy-row">
            <input
              className="modal__input modal__input--code"
              type="text"
              value={embedCode}
              readOnly
            />
            <button className="modal__copy-btn" onClick={handleCopyEmbed}>
              {embedCopied ? "已复制 ✓" : "复制"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
