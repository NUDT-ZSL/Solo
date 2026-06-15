export type SentimentType = "positive" | "negative" | "neutral";

export interface SentimentScores {
  positive: number;
  negative: number;
  neutral: number;
}

export interface SentimentData {
  sentiment: SentimentType;
  scores: SentimentScores;
}

export interface WaveParams {
  amplitude: number;
  frequency: number;
  harmonics: number[];
  phase: number;
  noise: number;
}

export interface EchoCard {
  id: string;
  url: string;
  title: string;
  summary: string;
  sentiment: SentimentData;
  wave_params: WaveParams;
  poetic_comment: string;
  resonances: number;
  created_at: string;
}

const API_BASE = "/api";

export async function createCard(url: string): Promise<EchoCard> {
  const resp = await fetch(`${API_BASE}/cards`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!resp.ok) throw new Error("Failed to create card");
  return resp.json();
}

export async function fetchCards(
  sentiment?: string,
  search?: string
): Promise<EchoCard[]> {
  const params = new URLSearchParams();
  if (sentiment && sentiment !== "all") params.set("sentiment", sentiment);
  if (search) params.set("search", search);
  const qs = params.toString();
  const url = `${API_BASE}/cards${qs ? `?${qs}` : ""}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Failed to fetch cards");
  return resp.json();
}

export async function resonateCard(cardId: string): Promise<{ resonances: number }> {
  const resp = await fetch(`${API_BASE}/cards/${cardId}/resonate`, {
    method: "POST",
  });
  if (!resp.ok) throw new Error("Failed to resonate");
  return resp.json();
}

export function mapSentimentToColors(sentiment: SentimentType): {
  primary: string;
  secondary: string;
  glow: string;
} {
  switch (sentiment) {
    case "positive":
      return {
        primary: "#ff6b35",
        secondary: "#ffa62b",
        glow: "rgba(255, 107, 53, 0.4)",
      };
    case "negative":
      return {
        primary: "#6c5ce7",
        secondary: "#a29bfe",
        glow: "rgba(108, 92, 231, 0.4)",
      };
    case "neutral":
      return {
        primary: "#636e72",
        secondary: "#b2bec3",
        glow: "rgba(99, 110, 114, 0.4)",
      };
  }
}

export function mapSentimentToGradient(
  ctx: CanvasRenderingContext2D,
  sentiment: SentimentType,
  height: number
): CanvasGradient {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  switch (sentiment) {
    case "positive":
      gradient.addColorStop(0, "rgba(255, 107, 53, 0.8)");
      gradient.addColorStop(0.5, "rgba(255, 166, 43, 0.6)");
      gradient.addColorStop(1, "rgba(255, 200, 50, 0.1)");
      break;
    case "negative":
      gradient.addColorStop(0, "rgba(108, 92, 231, 0.8)");
      gradient.addColorStop(0.5, "rgba(162, 155, 254, 0.6)");
      gradient.addColorStop(1, "rgba(162, 155, 254, 0.1)");
      break;
    case "neutral":
      gradient.addColorStop(0, "rgba(99, 110, 114, 0.8)");
      gradient.addColorStop(0.5, "rgba(178, 190, 195, 0.5)");
      gradient.addColorStop(1, "rgba(178, 190, 195, 0.1)");
      break;
  }
  return gradient;
}
