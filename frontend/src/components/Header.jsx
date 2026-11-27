import { Check, Download, Moon, RotateCcw, Share2, Sun } from "lucide-react";
import { SCENARIO_PRESETS } from "../utils/simulateGrid";
import { fmtSigned, getDeltaTone } from "../utils/format";

export default function Header({
  theme,
  onThemeChange,
  presetId,
  onSelectPreset,
  finalDeltaCo2,
  copiedMsg,
  onShare,
  onExportCsv,
  onReset,
}) {
  const deltaTone = getDeltaTone(finalDeltaCo2, { lowerIsBetter: true });

  return (
    <header className="bg-[var(--surface)] border-b border-[var(--rule)]">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[var(--ink-muted)]">
            <span>India Power Sector</span>
            <span className="text-[var(--rule-strong)]">/</span>
            <span>Ember 2019–2024 Calibration</span>
            <span className="text-[var(--rule-strong)]">/</span>
            <span className="font-mono-num text-[var(--clean)] font-semibold">
              2025–2040
            </span>
          </div>
          <h1 className="mt-0.5 text-xl sm:text-2xl font-bold tracking-tight text-[var(--ink)]">
            India Grid &amp; Emissions Workbench
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div
            className="inline-flex rounded-lg border border-[var(--rule)] bg-[var(--subtle)] p-0.5 mr-1"
            role="group"
            aria-label="Color theme"
          >
            {[
              { id: "light", label: "Light", icon: Sun },
              { id: "dark", label: "Dark", icon: Moon },
            ].map((t) => {
              const active = theme === t.id;
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onThemeChange(t.id)}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer transition"
                  style={{
                    backgroundColor: active
                      ? "var(--surface-elevated)"
                      : "transparent",
                    color: active ? "var(--ink)" : "var(--ink-muted)",
                    boxShadow: active ? "var(--shadow-pill)" : "none",
                  }}
                >
                  <Icon size={13} />
                  {t.label}
                </button>
              );
            })}
          </div>

          <button type="button" onClick={onShare} className="btn-flat">
            {copiedMsg ? (
              <Check size={13} className="text-[var(--clean)]" />
            ) : (
              <Share2 size={13} />
            )}
            {copiedMsg || "Share"}
          </button>
          <button type="button" onClick={onExportCsv} className="btn-flat">
            <Download size={13} />
            CSV
          </button>
          <button type="button" onClick={onReset} className="btn-flat">
            <RotateCcw size={13} />
            Reset
          </button>
        </div>
      </div>

      <div className="border-t border-[var(--rule)] bg-[var(--subtle)]">
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)] mr-1.5">
              Preset
            </span>
            {SCENARIO_PRESETS.map((preset) => {
              const isSelected = presetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectPreset(preset)}
                  className="px-3 py-1.5 text-xs font-medium rounded-md border transition cursor-pointer"
                  style={{
                    backgroundColor: isSelected
                      ? "var(--btn-active-bg)"
                      : "var(--surface)",
                    color: isSelected ? "var(--btn-active-fg)" : "var(--ink)",
                    borderColor: isSelected
                      ? "var(--btn-active-bg)"
                      : "var(--rule-strong)",
                  }}
                >
                  {preset.label}
                </button>
              );
            })}
            {presetId === "custom" && (
              <span
                className="ml-1 px-2.5 py-1 text-[11px] font-mono-num font-semibold border rounded-md"
                style={{
                  backgroundColor: "var(--clean-soft)",
                  color: "var(--clean)",
                  borderColor: "var(--clean-border)",
                }}
              >
                Custom
              </span>
            )}
          </div>

          <div
            className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-mono-num"
            style={{
              backgroundColor: deltaTone.bg,
              borderColor: deltaTone.border,
              color: "var(--ink-muted)",
            }}
          >
            <span>2040 vs Baseline</span>
            <strong className="font-semibold" style={{ color: deltaTone.text }}>
              {fmtSigned(finalDeltaCo2, 1)} MT CO₂
            </strong>
          </div>
        </div>
      </div>
    </header>
  );
}