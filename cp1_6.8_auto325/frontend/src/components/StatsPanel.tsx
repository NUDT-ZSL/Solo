import { useEffect } from "react";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { Pie } from "react-chartjs-2";
import { useStore } from "@/store";
import { SCENT_COLORS } from "@/types";
import { FileText, Heart } from "lucide-react";

ChartJS.register(ArcElement, Tooltip, Legend);

export default function StatsPanel() {
  const { userStats, fetchUserData, userId } = useStore();

  useEffect(() => {
    fetchUserData();
  }, [userId]);

  if (!userStats) return null;

  const labels = Object.keys(userStats.scent_type_distribution);
  const values = Object.values(userStats.scent_type_distribution);
  const colors = labels.map((l) => SCENT_COLORS[l] || "#E5E7EB");

  const chartData = {
    labels,
    datasets: [
      {
        data: values,
        backgroundColor: colors.map((c) => c + "CC"),
        borderColor: colors.map((c) => c),
        borderWidth: 2,
        hoverOffset: 8,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
      legend: {
        position: "bottom" as const,
        labels: {
          padding: 12,
          usePointStyle: true,
          pointStyleWidth: 8,
          font: { size: 11, family: "'Noto Sans SC', sans-serif" },
          color: "#8B7355",
        },
      },
      tooltip: {
        backgroundColor: "rgba(255,248,240,0.95)",
        titleColor: "#6B5B4E",
        bodyColor: "#8B7355",
        borderColor: "rgba(212,165,116,0.3)",
        borderWidth: 1,
        cornerRadius: 8,
        padding: 10,
      },
    },
  };

  return (
    <div
      className="rounded-2xl p-5 border border-white/30 backdrop-blur-xl"
      style={{
        background: "linear-gradient(135deg, rgba(255,248,240,0.85), rgba(255,240,212,0.75))",
        boxShadow: "0 4px 20px rgba(212,165,116,0.15), inset 0 1px 0 rgba(255,255,255,0.6)",
      }}
    >
      <h3
        className="text-base font-bold mb-4"
        style={{ color: "#6B5B4E", fontFamily: "'Noto Serif SC', serif" }}
      >
        📊 我的气味统计
      </h3>

      <div className="grid grid-cols-2 gap-3 mb-5">
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: "rgba(255,255,255,0.4)" }}
        >
          <FileText size={20} className="mx-auto mb-1 text-amber-600" />
          <div className="text-2xl font-bold" style={{ color: "#6B5B4E" }}>
            {userStats.total_published}
          </div>
          <div className="text-xs" style={{ color: "#A89888" }}>发布数</div>
        </div>
        <div
          className="rounded-xl p-3 text-center"
          style={{ background: "rgba(255,255,255,0.4)" }}
        >
          <Heart size={20} className="mx-auto mb-1 text-rose-400" />
          <div className="text-2xl font-bold" style={{ color: "#6B5B4E" }}>
            {userStats.total_resonated}
          </div>
          <div className="text-xs" style={{ color: "#A89888" }}>共鸣数</div>
        </div>
      </div>

      {labels.length > 0 && (
        <div className="max-w-[240px] mx-auto">
          <Pie data={chartData} options={chartOptions} />
        </div>
      )}

      {labels.length === 0 && (
        <p className="text-center text-sm py-4" style={{ color: "#A89888" }}>
          还没有气味记录，去投一个漂流瓶吧 ✨
        </p>
      )}
    </div>
  );
}
