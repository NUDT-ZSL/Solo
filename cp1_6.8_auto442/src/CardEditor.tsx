import React, { useState, useEffect, useRef } from "react";
import { Card } from "./api";

interface Props {
  card: Card;
  onSave: (data: { title: string; description: string; color: string }) => void;
  onClose: () => void;
  colorTags: { label: string; value: string }[];
}

export const CardEditor: React.FC<Props> = ({ card, onSave, onClose, colorTags }) => {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [color, setColor] = useState(card.color);
  const [visible, setVisible] = useState(false);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    setTimeout(() => titleRef.current?.focus(), 100);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setTimeout(onClose, 250);
  };

  const handleSave = () => {
    onSave({ title: title.trim() || "未命名", description: description.trim(), color });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") {
      handleClose();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        background: "rgba(0,0,0,0.4)",
        backdropFilter: "blur(4px)",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.25s ease",
      }}
      onClick={handleClose}
      onKeyDown={handleKeyDown}
    >
      <div
        style={{
          background: "rgba(30,30,50,0.92)",
          backdropFilter: "blur(24px)",
          borderRadius: 18,
          padding: 28,
          width: "min(400px, 90vw)",
          border: `1.5px solid ${color}55`,
          boxShadow: `0 0 32px ${color}22, 0 16px 64px rgba(0,0,0,0.4)`,
          transform: visible ? "scale(1) translateY(0)" : "scale(0.9) translateY(20px)",
          transition: "transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            color: "rgba(255,255,255,0.85)",
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              background: color,
              boxShadow: `0 0 8px ${color}`,
            }}
          />
          编辑灵感卡片
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            标题
          </label>
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入灵感标题..."
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.06)",
              border: `1px solid rgba(255,255,255,0.1)`,
              borderRadius: 10,
              padding: "10px 14px",
              color: "rgba(255,255,255,0.9)",
              fontSize: 14,
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = `${color}88`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.1)";
            }}
          />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label
            style={{
              display: "block",
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            描述
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="简要描述你的灵感..."
            rows={3}
            style={{
              width: "100%",
              background: "rgba(255,255,255,0.06)",
              border: `1px solid rgba(255,255,255,0.1)`,
              borderRadius: 10,
              padding: "10px 14px",
              color: "rgba(255,255,255,0.9)",
              fontSize: 13,
              outline: "none",
              resize: "vertical",
              fontFamily: "inherit",
              lineHeight: 1.5,
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = `${color}88`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = "rgba(255,255,255,0.1)";
            }}
          />
        </div>

        <div style={{ marginBottom: 20 }}>
          <label
            style={{
              display: "block",
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            颜色标签
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            {colorTags.map((tag) => (
              <button
                key={tag.value}
                onClick={() => setColor(tag.value)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 10,
                  border: color === tag.value ? "2.5px solid #fff" : "2px solid rgba(255,255,255,0.15)",
                  background: tag.value,
                  cursor: "pointer",
                  transition: "all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
                  transform: color === tag.value ? "scale(1.15)" : "scale(1)",
                  boxShadow: color === tag.value ? `0 0 12px ${tag.value}` : "none",
                }}
                title={tag.label}
              />
            ))}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            justifyContent: "flex-end",
          }}
        >
          <button
            onClick={handleClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              padding: "8px 20px",
              color: "rgba(255,255,255,0.6)",
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = "rgba(255,255,255,0.1)";
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = "rgba(255,255,255,0.06)";
            }}
          >
            取消
          </button>
          <button
            onClick={handleSave}
            style={{
              background: `${color}44`,
              border: `1px solid ${color}66`,
              borderRadius: 10,
              padding: "8px 20px",
              color: "rgba(255,255,255,0.9)",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.15s",
              boxShadow: `0 0 12px ${color}22`,
            }}
            onMouseEnter={(e) => {
              (e.target as HTMLElement).style.background = `${color}66`;
            }}
            onMouseLeave={(e) => {
              (e.target as HTMLElement).style.background = `${color}44`;
            }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
};
