export const EDITABLE_FUELS = [
  { key: "solar", label: "Solar PV", min: 0, max: 80, step: 1, color: "var(--solar)" },
  { key: "wind", label: "Wind", min: 0, max: 25, step: 0.5, color: "var(--wind)" },
  { key: "coal", label: "Coal", min: -10, max: 12, step: 0.5, color: "var(--coal)" },
  { key: "nuclear", label: "Nuclear", min: 0, max: 6, step: 0.25, color: "var(--nuclear)" },
  { key: "hydro", label: "Hydro", min: 0, max: 6, step: 0.25, color: "var(--hydro)" },
];

export const COAL_POLICIES = [
  { id: "baseline", label: "Baseline", sub: "+3.1 GW/yr", value: null },
  { id: "freeze", label: "No New", sub: "0 GW/yr", value: 0 },
  { id: "retire", label: "Retire", sub: "-3.0 GW/yr", value: -3.0 },
];

export const STORAGE_OPTIONS = [
  { value: 0, label: "0% · Baseline CUF" },
  { value: 10, label: "+10% · Moderate BESS" },
  { value: 15, label: "+15% · High Storage" },
  { value: 25, label: "+25% · Deep Hybrid" },
];

export function fmtNum(val, decimals = 1) {
  return Number(val).toLocaleString("en-IN", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function fmtSigned(val, decimals = 1) {
  const zeroThreshold = 0.5 * 10 ** -decimals;
  const normalized = Math.abs(val) < zeroThreshold ? 0 : val;
  const prefix = normalized > 0 ? "+" : "";
  return `${prefix}${fmtNum(normalized, decimals)}`;
}

// Returns neutral styling near zero so unchanged baselines aren't flagged green/red.
export function getDeltaTone(val, { lowerIsBetter = true } = {}) {
  if (Math.abs(val) < 0.05) {
    return {
      text: "var(--ink-muted)",
      bg: "var(--surface)",
      border: "var(--rule-strong)",
    };
  }
  const isFavorable = lowerIsBetter ? val < 0 : val > 0;
  return isFavorable
    ? {
        text: "var(--clean)",
        bg: "var(--clean-soft)",
        border: "var(--clean-border)",
      }
    : {
        text: "var(--fossil)",
        bg: "var(--fossil-soft)",
        border: "var(--fossil-border)",
      };
}

// Anchors signed tracks (like Coal: -10 to +12) at 0 instead of filling from the far left.
export function sliderStyle(val, min, max, color) {
  const clamp = (n) => Math.min(100, Math.max(0, n));
  const valPct = clamp(((val - min) / (max - min)) * 100);

  if (min < 0 && max > 0) {
    const zeroPct = clamp(((0 - min) / (max - min)) * 100);
    return {
      "--slider-start": `${Math.min(zeroPct, valPct)}%`,
      "--slider-end": `${Math.max(zeroPct, valPct)}%`,
      "--slider-color": color,
    };
  }

  return {
    "--slider-start": "0%",
    "--slider-end": `${valPct}%`,
    "--slider-color": color,
  };
}