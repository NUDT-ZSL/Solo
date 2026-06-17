import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

interface StarEntry {
  name: string;
  constellation: string;
  magnitude: number;
  observationMethod: string;
  photos: string[];
}

interface LocationData {
  lat: number;
  lng: number;
  name: string;
}

const weatherColors: Record<string, string> = {
  晴朗: "#e3f2fd",
  多云: "#cfd8dc",
  有云: "#b0bec5",
  有月光: "#fff3e0",
};

const weatherIcons: Record<string, string> = {
  晴朗: "☀️",
  多云: "⛅",
  有云: "☁️",
  有月光: "🌙",
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    backgroundColor: "#0d1b2a",
    padding: "24px 16px",
    boxSizing: "border-box",
  },
  card: {
    background: "#1b2838",
    borderRadius: 12,
    padding: 24,
    maxWidth: 600,
    margin: "0 auto",
  },
  label: {
    color: "#90caf9",
    display: "block",
    marginBottom: 4,
    fontSize: 14,
  },
  input: {
    background: "#0d1b2a",
    border: "1px solid #2a3f5f",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#e0e0e0",
    width: "100%",
    boxSizing: "border-box",
    fontSize: 14,
  },
  select: {
    background: "#0d1b2a",
    border: "1px solid #2a3f5f",
    borderRadius: 8,
    padding: "8px 12px",
    color: "#e0e0e0",
    width: "100%",
    boxSizing: "border-box",
    fontSize: 14,
  },
  button: {
    background: "#1565c0",
    border: "none",
    borderRadius: 8,
    color: "#fff",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: 14,
  },
  sectionTitle: {
    color: "#90caf9",
    fontSize: 18,
    marginTop: 16,
    marginBottom: 8,
  },
  starCard: {
    background: "#1f3044",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  deleteBtn: {
    background: "none",
    border: "none",
    color: "red",
    cursor: "pointer",
    padding: "4px 8px",
    fontSize: 14,
  },
  row: {
    display: "flex",
    gap: 8,
    alignItems: "center",
  },
  fieldGroup: {
    marginBottom: 12,
  },
};

export default function NewRecordPage() {
  const navigate = useNavigate();
  const [date, setDate] = useState("");
  const [lat, setLat] = useState<number | "">("");
  const [lng, setLng] = useState<number | "">("");
  const [locationName, setLocationName] = useState("");
  const [weather, setWeather] = useState("");
  const [stars, setStars] = useState<StarEntry[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});

  const getLocation = () => {
    if (!navigator.geolocation) {
      alert("浏览器不支持地理定位");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(Math.round(pos.coords.latitude * 10000) / 10000);
        setLng(Math.round(pos.coords.longitude * 10000) / 10000);
      },
      () => {
        alert("无法获取当前位置");
      }
    );
  };

  const addStar = () => {
    setStars((prev) => [
      ...prev,
      { name: "", constellation: "", magnitude: 0, observationMethod: "肉眼", photos: [] },
    ]);
  };

  const removeStar = (index: number) => {
    setStars((prev) => prev.filter((_, i) => i !== index));
  };

  const updateStar = (index: number, field: keyof StarEntry, value: string | number) => {
    setStars((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const handlePhotoChange = (index: number, files: FileList | null) => {
    if (!files) return;
    if (files.length > 3) {
      alert("每颗星星最多上传3张照片");
      return;
    }
    const currentPhotos = stars[index].photos.length;
    if (currentPhotos + files.length > 3) {
      alert("每颗星星最多上传3张照片");
      return;
    }
    const readers: Promise<string>[] = [];
    for (let i = 0; i < files.length; i++) {
      readers.push(
        new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(files[i]);
        })
      );
    }
    Promise.all(readers).then((base64List) => {
      setStars((prev) =>
        prev.map((s, i) =>
          i === index ? { ...s, photos: [...s.photos, ...base64List] } : s
        )
      );
    });
  };

  const handleSubmit = async () => {
    if (!date) {
      alert("请填写观测日期");
      return;
    }
    if (stars.length === 0 || !stars.some((s) => s.name.trim())) {
      alert("请至少添加一颗星星并填写名称");
      return;
    }

    const activity = {
      date,
      location: {
        lat: lat === "" ? 0 : lat,
        lng: lng === "" ? 0 : lng,
        name: locationName,
      },
      weather,
      stars,
      photos: [],
    };

    setSubmitting(true);
    try {
      const res = await fetch("/api/stars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(activity),
      });
      if (res.ok) {
        navigate("/");
      } else {
        alert("提交失败");
      }
    } catch {
      alert("提交失败");
    } finally {
      setSubmitting(false);
    }
  };

  const weatherBg = weather ? weatherColors[weather] || "#1b2838" : "#1b2838";
  const weatherTextColor = weather ? "#1b2838" : "#e0e0e0";

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ color: "#e0e0e0", margin: 0 }}>新建观测记录</h2>
          <button style={styles.button} onClick={() => navigate("/")}>
            返回首页
          </button>
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>观测日期 *</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={styles.input}
          />
        </div>

        <h3 style={styles.sectionTitle}>观测地点</h3>
        <div style={styles.fieldGroup}>
          <button style={styles.button} onClick={getLocation}>
            获取当前位置
          </button>
        </div>
        <div style={{ ...styles.row, marginBottom: 8 }}>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>纬度</label>
            <input
              type="number"
              step="0.0001"
              value={lat}
              onChange={(e) => setLat(e.target.value === "" ? "" : parseFloat(e.target.value))}
              style={styles.input}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={styles.label}>经度</label>
            <input
              type="number"
              step="0.0001"
              value={lng}
              onChange={(e) => setLng(e.target.value === "" ? "" : parseFloat(e.target.value))}
              style={styles.input}
            />
          </div>
        </div>
        <div style={styles.fieldGroup}>
          <label style={styles.label}>地点名称</label>
          <input
            type="text"
            placeholder="地点名称"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            style={styles.input}
          />
        </div>

        <h3 style={styles.sectionTitle}>天气状况</h3>
        <div
          style={{
            background: weatherBg,
            borderRadius: 8,
            padding: 16,
            marginBottom: 12,
            transition: "background-color 0.3s",
          }}
        >
          <div style={{ color: weatherTextColor, marginBottom: 8, fontSize: 16 }}>
            {weather ? `${weatherIcons[weather]} ${weather}` : "请选择天气"}
          </div>
          <select
            value={weather}
            onChange={(e) => setWeather(e.target.value)}
            style={styles.select}
          >
            <option value="">-- 请选择 --</option>
            <option value="晴朗">晴朗</option>
            <option value="多云">多云</option>
            <option value="有云">有云</option>
            <option value="有月光">有月光</option>
          </select>
        </div>

        <h3 style={styles.sectionTitle}>星星列表</h3>
        {stars.map((star, index) => (
          <div key={index} style={styles.starCard}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ color: "#90caf9", fontWeight: "bold" }}>星星 #{index + 1}</span>
              <button style={styles.deleteBtn} onClick={() => removeStar(index)}>
                删除
              </button>
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>名称</label>
              <input
                type="text"
                value={star.name}
                onChange={(e) => updateStar(index, "name", e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>星座</label>
              <input
                type="text"
                value={star.constellation}
                onChange={(e) => updateStar(index, "constellation", e.target.value)}
                style={styles.input}
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>视星等</label>
              <input
                type="number"
                min={-1.46}
                max={6.0}
                step={0.01}
                value={star.magnitude}
                onChange={(e) => updateStar(index, "magnitude", parseFloat(e.target.value) || 0)}
                style={styles.input}
              />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>观测方式</label>
              <select
                value={star.observationMethod}
                onChange={(e) => updateStar(index, "observationMethod", e.target.value)}
                style={styles.select}
              >
                <option value="肉眼">肉眼</option>
                <option value="双筒望远镜">双筒望远镜</option>
                <option value="天文望远镜">天文望远镜</option>
              </select>
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>照片（最多3张）</label>
              <input
                ref={(el) => { fileInputRefs.current[index] = el; }}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handlePhotoChange(index, e.target.files)}
                style={{ color: "#e0e0e0", marginTop: 4 }}
              />
              {star.photos.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  {star.photos.map((photo, pi) => (
                    <img
                      key={pi}
                      src={photo}
                      alt={`照片${pi + 1}`}
                      style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 4, border: "1px solid #2a3f5f" }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        <button style={{ ...styles.button, marginBottom: 16 }} onClick={addStar}>
          添加星星
        </button>

        <button
          style={{ ...styles.button, width: "100%", padding: "12px 16px", fontSize: 16, marginTop: 8 }}
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "提交中..." : "提交记录"}
        </button>
      </div>
    </div>
  );
}
