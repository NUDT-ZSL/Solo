import React, { useEffect, useState, useCallback } from "react";
import { ApiClient, Wish } from "./ApiClient";

interface UserDashboardProps {
  userId: string;
  activeTab: "mine" | "leaderboard";
}

export const UserDashboard: React.FC<UserDashboardProps> = ({ userId, activeTab }) => {
  if (activeTab === "mine") {
    return <MyStars userId={userId} />;
  }
  return <Leaderboard />;
};

const MyStars: React.FC<{ userId: string }> = ({ userId }) => {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await ApiClient.getMyWishes(userId);
      setWishes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  const handleDelete = async (id: string) => {
    try {
      await ApiClient.deleteWish(id, userId);
      setWishes((prev) => prev.filter((w) => w.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: 60 }}>
          加载中…
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>✦ 我的星星 ✦</h2>
      {wishes.length === 0 ? (
        <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: 60 }}>
          还没有许下心愿，去星河投放一颗吧 ✦
        </div>
      ) : (
        <div style={gridStyle}>
          {wishes.map((w, i) => (
            <div
              key={w.id}
              style={{
                ...cardStyle,
                animation: `slideIn 0.4s ease ${i * 0.06}s both`,
              }}
            >
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: w.color,
                  boxShadow: `0 0 12px ${w.color}`,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#fff", fontSize: 14, wordBreak: "break-all" }}>
                  {w.text}
                </div>
                <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 6 }}>
                  {w.created_at} · ✦{w.blessings} 祝福
                </div>
              </div>
              <button
                onClick={() => handleDelete(w.id)}
                style={{
                  background: "none",
                  border: "1px solid rgba(255,100,100,0.3)",
                  color: "rgba(255,100,100,0.7)",
                  borderRadius: 8,
                  padding: "4px 10px",
                  fontSize: 12,
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,100,100,0.7)";
                  e.currentTarget.style.color = "#ff6464";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255,100,100,0.3)";
                  e.currentTarget.style.color = "rgba(255,100,100,0.7)";
                }}
              >
                删除
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const Leaderboard: React.FC = () => {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await ApiClient.getLeaderboard();
      setWishes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) {
    return (
      <div style={containerStyle}>
        <div style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", padding: 60 }}>
          加载中…
        </div>
      </div>
    );
  }

  return (
    <div style={containerStyle}>
      <h2 style={titleStyle}>✦ 星光排行 ✦</h2>
      {wishes.length === 0 ? (
        <div style={{ color: "rgba(255,255,255,0.4)", textAlign: "center", padding: 60 }}>
          还没有星星收到祝福
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {wishes.map((w, i) => (
            <div
              key={w.id}
              style={{
                ...leaderCardStyle,
                animation: `slideInRight 0.5s ease ${i * 0.08}s both`,
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 700,
                  fontSize: 16,
                  flexShrink: 0,
                  background:
                    i === 0
                      ? "linear-gradient(135deg, #FFD700, #FFA000)"
                      : i === 1
                      ? "linear-gradient(135deg, #C0C0C0, #9E9E9E)"
                      : i === 2
                      ? "linear-gradient(135deg, #CD7F32, #A0522D)"
                      : "rgba(255,255,255,0.08)",
                  color: i < 3 ? "#0a0a2e" : "rgba(255,255,255,0.6)",
                }}
              >
                {i + 1}
              </div>
              <div
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  background: w.color,
                  boxShadow: `0 0 10px ${w.color}`,
                  flexShrink: 0,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "#fff", fontSize: 14, wordBreak: "break-all" }}>
                  {w.text}
                </div>
                <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 4 }}>
                  {w.created_at}
                </div>
              </div>
              <div
                style={{
                  color: "#FFD700",
                  fontSize: 15,
                  fontWeight: 600,
                  flexShrink: 0,
                  textShadow: "0 0 8px rgba(255,215,0,0.4)",
                }}
              >
                ✦{w.blessings}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const containerStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  overflowY: "auto",
  padding: "20px 16px 80px",
  background: "linear-gradient(180deg, rgba(10,10,46,0.97), rgba(26,10,46,0.97))",
};

const titleStyle: React.CSSProperties = {
  color: "#FFD700",
  fontSize: 20,
  fontWeight: 600,
  textAlign: "center",
  marginBottom: 20,
  textShadow: "0 0 10px rgba(255,215,0,0.5)",
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
  gap: 12,
};

const cardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "14px 16px",
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.08)",
  transition: "all 0.2s ease",
};

const leaderCardStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  padding: "14px 16px",
  background: "rgba(255,255,255,0.04)",
  backdropFilter: "blur(12px)",
  borderRadius: 14,
  border: "1px solid rgba(255,215,0,0.1)",
  transition: "all 0.2s ease",
};
