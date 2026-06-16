import React from "react";
import { Album } from "@/types";

interface AlbumTimelineProps {
  albums: Album[];
  onPlay: (albumId: string) => void;
}

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) =>
    Math.round(255 * x)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}

function getComplementaryColor(hex: string): string {
  const [h, s, l] = hexToHsl(hex);

  if (l <= 5) return '#ffffff';
  if (l >= 95) return '#000000';

  const compH = (h + 180) % 360;
  const compS = Math.min(Math.max(s, 70), 100);
  const compL = l > 50 ? 25 : 85;
  return hslToHex(compH, compS, compL);
}

function getLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function getPlayButtonTextColor(hex: string): string {
  const l = getLuminance(hex);
  if (l <= 0.05) return '#000000';
  if (l >= 0.95) return '#ffffff';
  return hex;
}

export default function AlbumTimeline({ albums, onPlay }: AlbumTimelineProps) {
  return (
    <div className="relative w-full max-w-4xl mx-auto py-12">
      <div
        className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-0.5 hidden md:block"
        style={{ backgroundColor: "#3a3a4a" }}
      />
      <div
        className="absolute left-4 top-0 bottom-0 w-0.5 md:hidden"
        style={{ backgroundColor: "#3a3a4a" }}
      />

      <div className="space-y-12">
        {albums.map((album, index) => {
          const isLeft = index % 2 === 0;
          const complementaryColor = getComplementaryColor(album.coverColor);
          const luminance = getLuminance(album.coverColor);
          const textColor = luminance > 0.5 ? "#000000" : "#ffffff";
          const btnTextColor = getPlayButtonTextColor(album.coverColor);

          return (
            <div
              key={album.id}
              className={`relative flex items-center ${
                isLeft ? "md:justify-start" : "md:justify-end"
              } justify-start pl-12 md:pl-0`}
            >
              <div
                className={`absolute w-4 h-4 rounded-full border-4 hidden md:block left-1/2 -translate-x-1/2 z-10`}
                style={{
                  backgroundColor: album.coverColor,
                  borderColor: "#1a1a2e",
                }}
              />
              <div
                className={`absolute w-4 h-4 rounded-full border-4 md:hidden left-4 -translate-x-1/2 z-10`}
                style={{
                  backgroundColor: album.coverColor,
                  borderColor: "#1a1a2e",
                }}
              />

              <div className="relative">
                <div
                  className="font-bold mb-2 hidden md:block"
                  style={{
                    fontSize: "48px",
                    color: "#808080",
                    opacity: 0.5,
                    lineHeight: 1,
                  }}
                >
                  {album.year}
                </div>

                <div
                  className={`relative transition-all duration-300 ease hover:-translate-y-1 hover:shadow-2xl`}
                  style={{
                    width: "280px",
                    borderRadius: "16px",
                    padding: "20px",
                    backgroundColor: album.coverColor,
                    color: textColor,
                    boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
                  }}
                >
                  <div
                    className={`absolute top-6 w-0 h-0 border-t-8 border-b-8 border-y-transparent md:block hidden ${
                      isLeft
                        ? "right-0 translate-x-full border-l-8"
                        : "left-0 -translate-x-full border-r-8"
                    }`}
                    style={{
                      borderLeftColor: isLeft ? album.coverColor : "transparent",
                      borderRightColor: !isLeft
                        ? album.coverColor
                        : "transparent",
                    }}
                  />
                  <div
                    className="absolute top-6 w-0 h-0 border-t-8 border-b-8 border-y-transparent md:hidden left-0 -translate-x-full border-r-8"
                    style={{
                      borderRightColor: album.coverColor,
                    }}
                  />

                  <h3 className="text-xl font-bold mb-2">{album.title}</h3>
                  <p className="text-sm opacity-80 mb-4">
                    {album.trackList.length} 首歌曲
                  </p>
                  <div className="text-xs opacity-60 mb-4">
                    {album.trackList.slice(0, 3).join(" • ")}
                    {album.trackList.length > 3 && " • ..."}
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlay(album.id);
                    }}
                    className="flex items-center justify-center rounded-full transition-all duration-200 ease hover:rotate-15"
                    style={{
                      width: "40px",
                      height: "40px",
                      backgroundColor: complementaryColor,
                      color: btnTextColor,
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#ffffff";
                      e.currentTarget.style.color = "#000000";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = complementaryColor;
                      e.currentTarget.style.color = btnTextColor;
                    }}
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                      className="w-5 h-5 ml-0.5"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
