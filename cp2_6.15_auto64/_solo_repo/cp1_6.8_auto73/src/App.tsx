import React, { useState, useCallback } from "react";
import { StarField } from "./StarField";
import { UserDashboard } from "./UserDashboard";
import { Star } from "./StarEngine";
import { ApiClient } from "./ApiClient";

type Page = "starfield" | "mine" | "leaderboard";

const USER_ID_KEY = "starwish_uid";

function getUserId(): string {
  let uid = localStorage.getItem(USER_ID_KEY);
  if (!uid) {
    uid = "u_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem(USER_ID_KEY, uid);
  }
  return uid;
}

export const App: React.FC = () => {
  const [page, setPage] = useState<Page>("starfield");
  const [selectedStar, setSelectedStar] = useState<Star | null>(null);
  const [blessing, setBlessing] = useState(false);
  const [blessDone, setBlessDone] = useState(false);
  const userId = getUserId();

  const handleStarClick = useCallback((star: Star) => {
    setSelectedStar(star);
    setBlessDone(false);
  }, []);

  const handleBless = async () => {
    if (!selectedStar || blessing) return;
    setBlessing(true);
    try {
      const updated = await ApiClient.blessWish(selectedStar.id, userId);
      selectedStar.blessings = updated.blessings;
      selectedStar.targetSize = selectedStar.baseSize + updated.blessings * 0.8;
      setBlessDone(true);
    } catch (e) {
      console.error(e);
    } finally {
      setBlessing(false);
    }
  };

  const closeStarDetail = () => {
    setSelectedStar(null);
    setBlessDone(false);
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", overflow: "hidden" }}>
      {page === "starfield" && (
        <StarField userId={userId} onStarClick={handleStarClick} />
      )}

      {page !== "starfield" && (
        <UserDashboard userId={userId} activeTab={page} />
      )}

      {selectedStar && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 300,
            animation: "fadeIn 0.25s ease",
          }}
          onClick={closeStarDetail}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "rgba(13,13,58,0.88)",
              backdropFilter: "blur(24px)",
              borderRadius: 20,
              padding: "28px 24px",
              width: "min(380px, 88vw)",
              border: `1px solid ${selectedStar.color}40`,
              boxShadow: `0 0 40px ${selectedStar.color}20, inset 0 0 30px ${selectedStar.color}08`,
              animation: "popIn 0.3s cubic-bezier(0.175,0.885,0.32,1.275)",
            }}
          >
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: selectedStar.color,
                  boxShadow: `0 0 30px ${selectedStar.color}, 0 0 60px ${selectedStar.color}60`,
                  margin: "0 auto 16px",
                }}
              />
              <div
                style={{
                  color: "#fff",
                  fontSize: 17,
                  lineHeight: 1.6,
                  wordBreak: "break-all",
                  textShadow: `0 0 8px ${selectedStar.color}40`,
                }}
              >
                {selectedStar.text}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 20,
                color: "rgba(255,255,255,0.45)",
                fontSize: 13,
                marginBottom: 20,
              }}
            >
              <span>{selectedStar.createdAt}</span>
              <span style={{ color: "#FFD700" }}>✦ {selectedStar.blessings} 祝福</span>
            </div>

            <button
              onClick={handleBless}
              disabled={blessing || blessDone}
              style={{
                width: "100%",
                padding: "11px 0",
                borderRadius: 12,
                border: blessDone
                  ? "1px solid rgba(105,240,174,0.3)"
                  : `1px solid ${selectedStar.color}50`,
                background: blessDone
                  ? "rgba(105,240,174,0.1)"
                  : `${selectedStar.color}15`,
                color: blessDone ? "#69F0AE" : selectedStar.color,
                fontSize: 15,
                fontWeight: 600,
                cursor: blessDone ? "default" : "pointer",
                transition: "all 0.3s ease",
                boxShadow: blessDone
                  ? "0 0 12px rgba(105,240,174,0.2)"
                  : `0 0 12px ${selectedStar.color}20`,
              }}
            >
              {blessing ? "送出中…" : blessDone ? "✦ 已祝福" : "✦ 送出祝福"}
            </button>
          </div>
        </div>
      )}

      <nav
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 60,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 0,
          background: "rgba(10,10,46,0.85)",
          backdropFilter: "blur(16px)",
          borderTop: "1px solid rgba(255,215,0,0.12)",
          zIndex: 150,
        }}
      >
        {[
          { key: "starfield" as Page, label: "星河", icon: "✦" },
          { key: "mine" as Page, label: "我的", icon: "◈" },
          { key: "leaderboard" as Page, label: "排行", icon: "★" },
        ].map((item) => (
          <button
            key={item.key}
            onClick={() => setPage(item.key)}
            style={{
              flex: 1,
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 3,
              background: "none",
              border: "none",
              cursor: "pointer",
              color: page === item.key ? "#FFD700" : "rgba(255,255,255,0.4)",
              transition: "color 0.25s ease",
              fontSize: 12,
              textShadow: page === item.key ? "0 0 8px rgba(255,215,0,0.5)" : "none",
            }}
          >
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};
