import { fmtNum, fmtSigned, getDeltaTone } from "../utils/format";

export default function KpiStrip({ summary, hist2024Intensity }) {
  const { finalYear, peakYear, peakCo2Mt, isPeakedBefore2040, fiftyPctYear } =
    summary;
  const rangeMin = Math.min(summary.co2RangeLow, summary.co2RangeHigh);
  const rangeMax = Math.max(summary.co2RangeLow, summary.co2RangeHigh);
  const gapTone = getDeltaTone(finalYear.supply_gap_bu, { lowerIsBetter: false });

  return (
    <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <div className="kpi-card">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
          2040 CO₂
        </div>
        <div className="mt-1 font-mono-num text-2xl font-bold tracking-tight text-[var(--ink)]">
          {fmtNum(finalYear.total_co2_mt, 0)}
          <span className="ml-1 text-xs font-normal text-[var(--ink-muted)]">
            MT
          </span>
        </div>
        <div className="mt-1 text-[11px] font-mono-num text-[var(--ink-dim)]">
          Range {fmtNum(rangeMin, 0)}–{fmtNum(rangeMax, 0)}
        </div>
      </div>

      <div className="kpi-card">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
          Peak Year
        </div>
        <div className="mt-1 font-mono-num text-2xl font-bold tracking-tight text-[var(--ink)]">
          {isPeakedBefore2040 ? peakYear : "None"}
        </div>
        <div className="mt-1 text-[11px] font-mono-num text-[var(--ink-dim)]">
          Max {fmtNum(peakCo2Mt, 0)} MT
        </div>
      </div>

      <div className="kpi-card">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
          2040 Clean Share
        </div>
        <div className="mt-1 font-mono-num text-2xl font-bold tracking-tight text-[var(--clean)]">
          {fmtNum(finalYear.clean_share_pct, 1)}%
        </div>
        <div className="mt-1 text-[11px] font-mono-num text-[var(--ink-dim)]">
          ≥50%: {fiftyPctYear ?? "Post-2040"}
        </div>
      </div>

      <div className="kpi-card">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
          Grid Intensity
        </div>
        <div className="mt-1 font-mono-num text-2xl font-bold tracking-tight text-[var(--ink)]">
          {fmtNum(finalYear.grid_intensity_gco2_kwh, 0)}
          <span className="ml-1 text-xs font-normal text-[var(--ink-muted)]">
            g/kWh
          </span>
        </div>
        <div className="mt-1 text-[11px] font-mono-num text-[var(--ink-dim)]">
          2024: {fmtNum(hist2024Intensity, 0)} g/kWh
        </div>
      </div>

      <div className="kpi-card col-span-2 md:col-span-1">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-muted)]">
          2040 Supply Gap
        </div>
        <div
          className="mt-1 font-mono-num text-2xl font-bold tracking-tight"
          style={{ color: gapTone.text }}
        >
          {fmtSigned(finalYear.supply_gap_bu, 0)}
          <span className="ml-1 text-xs font-normal text-[var(--ink-muted)]">
            BU
          </span>
        </div>
        <div className="mt-1 text-[11px] font-mono-num text-[var(--ink-dim)]">
          Cap: {fmtNum(finalYear.total_capacity_gw, 0)} GW
        </div>
      </div>
    </section>
  );
}