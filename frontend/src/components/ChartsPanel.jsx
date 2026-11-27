import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { EDITABLE_FUELS, fmtNum } from "../utils/format";

function ChartTooltip({ active, payload, label, unit }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs"
      style={{
        backgroundColor: "var(--tooltip-bg)",
        borderColor: "var(--rule-strong)",
        color: "var(--ink)",
        boxShadow: "var(--shadow-popover)",
      }}
    >
      <div className="font-mono-num font-semibold border-b pb-1 mb-1.5 border-[var(--rule)]">
        {label}
      </div>
      <div className="space-y-1">
        {payload.map((entry) => {
          const dotColor = entry.color?.startsWith("url(")
            ? "var(--clean)"
            : entry.color;
          return (
            <div
              key={entry.dataKey}
              className="flex items-center justify-between gap-5"
            >
              <span className="flex items-center gap-2 text-[var(--ink-muted)]">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: dotColor }}
                />
                {entry.name}
              </span>
              <span className="font-mono-num font-semibold text-[var(--ink)]">
                {fmtNum(entry.value, 1)} {unit}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ChartsPanel({
  rows,
  activeTab,
  onTabChange,
  hist2024Co2Mt,
}) {
  const activeUnit =
    activeTab === "emissions" ? "MT" : activeTab === "power" ? "BU" : "GW";

  return (
    <>
      <section className="sheet">
        <div className="px-4 sm:px-5 py-3 border-b border-[var(--rule)] flex flex-wrap items-center justify-between gap-3">
          <div className="tab-group" role="tablist" aria-label="Simulation views">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "emissions"}
              onClick={() => onTabChange("emissions")}
              className={`tab-pill ${activeTab === "emissions" ? "active" : ""}`}
            >
              CO₂ Trajectory (MT)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "power"}
              onClick={() => onTabChange("power")}
              className={`tab-pill ${activeTab === "power" ? "active" : ""}`}
            >
              Generation vs. Demand (BU)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === "capacity"}
              onClick={() => onTabChange("capacity")}
              className={`tab-pill ${activeTab === "capacity" ? "active" : ""}`}
            >
              Installed Capacity Mix (GW)
            </button>
          </div>
          <span className="text-[11px] font-mono-num text-[var(--ink-dim)]">
            Annual model step · 2025–2040
          </span>
        </div>

        <div className="p-4 sm:p-5">
          <div className="mb-3 flex flex-wrap gap-4 text-xs text-[var(--ink-muted)]">
            {activeTab === "emissions" && (
              <>
                <span className="inline-flex items-center gap-2">
                  <span className="h-[3px] w-4 rounded-full bg-[var(--clean)]" />
                  Active Scenario (MT CO₂)
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 border-t-2 border-dashed border-[var(--fossil)]" />
                  Baseline Pace (MT CO₂)
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 border-t border-dotted border-[var(--ink-dim)]" />
                  2024 Actual ({fmtNum(hist2024Co2Mt, 0)} MT)
                </span>
              </>
            )}
            {activeTab === "power" && (
              <>
                <span className="inline-flex items-center gap-2">
                  <span className="h-[3px] w-4 rounded-full bg-[var(--clean)]" />
                  Total Generation (BU)
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="w-4 border-t-2 border-dashed border-[var(--fossil)]" />
                  Projected Demand (BU)
                </span>
              </>
            )}
            {activeTab === "capacity" &&
              EDITABLE_FUELS.map((f) => (
                <span key={f.key} className="inline-flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: f.color }}
                  />
                  {f.label}
                </span>
              ))}
          </div>

          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={rows}
                margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
              >
                <CartesianGrid
                  stroke="var(--grid-line)"
                  strokeDasharray="3 3"
                  vertical={false}
                />
                <XAxis
                  dataKey="Year"
                  stroke="var(--rule-strong)"
                  tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
                  tickLine={false}
                />
                <YAxis
                  stroke="var(--ink-dim)"
                  tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip content={<ChartTooltip unit={activeUnit} />} />

                {activeTab === "emissions" && (
                  <>
                    <ReferenceLine
                      y={hist2024Co2Mt}
                      stroke="var(--ink-dim)"
                      strokeDasharray="3 3"
                    />
                    <Area
                      type="monotone"
                      dataKey="baseline_co2_mt"
                      name="Baseline CO₂"
                      stroke="var(--fossil)"
                      strokeWidth={1.8}
                      strokeDasharray="5 4"
                      fill="none"
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="total_co2_mt"
                      name="Active CO₂"
                      stroke="var(--clean)"
                      strokeWidth={2.4}
                      fill="var(--clean)"
                      fillOpacity={0.14}
                      dot={false}
                    />
                  </>
                )}

                {activeTab === "power" && (
                  <>
                    <Area
                      type="monotone"
                      dataKey="demand_bu"
                      name="Projected Demand"
                      stroke="var(--fossil)"
                      strokeWidth={1.8}
                      strokeDasharray="5 4"
                      fill="none"
                      dot={false}
                    />
                    <Area
                      type="monotone"
                      dataKey="total_gen_bu"
                      name="Total Generation"
                      stroke="var(--clean)"
                      strokeWidth={2.4}
                      fill="var(--clean)"
                      fillOpacity={0.14}
                      dot={false}
                    />
                  </>
                )}

                {activeTab === "capacity" && (
                  <>
                    <Area
                      type="monotone"
                      stackId="1"
                      dataKey="coal_gw"
                      name="Coal"
                      stroke="var(--coal)"
                      strokeWidth={1.5}
                      fill="var(--coal)"
                      fillOpacity={0.72}
                    />
                    <Area
                      type="monotone"
                      stackId="1"
                      dataKey="hydro_gw"
                      name="Hydro"
                      stroke="var(--hydro)"
                      strokeWidth={1.5}
                      fill="var(--hydro)"
                      fillOpacity={0.68}
                    />
                    <Area
                      type="monotone"
                      stackId="1"
                      dataKey="nuclear_gw"
                      name="Nuclear"
                      stroke="var(--nuclear)"
                      strokeWidth={1.5}
                      fill="var(--nuclear)"
                      fillOpacity={0.68}
                    />
                    <Area
                      type="monotone"
                      stackId="1"
                      dataKey="wind_gw"
                      name="Wind"
                      stroke="var(--wind)"
                      strokeWidth={1.5}
                      fill="var(--wind)"
                      fillOpacity={0.72}
                    />
                    <Area
                      type="monotone"
                      stackId="1"
                      dataKey="solar_gw"
                      name="Solar PV"
                      stroke="var(--solar)"
                      strokeWidth={1.5}
                      fill="var(--solar)"
                      fillOpacity={0.76}
                    />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      <section className="sheet p-4 sm:p-5">
        <div className="mb-3">
          <h2 className="text-sm font-bold text-[var(--ink)]">
            Clean Electricity Share (% of Total Generation)
          </h2>
          <p className="mt-0.5 text-xs text-[var(--ink-muted)]">
            Solar, wind, hydro, nuclear, and bioenergy combined against the 50%
            majority line.
          </p>
        </div>

        <div className="h-[200px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={rows}
              margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
            >
              <CartesianGrid
                stroke="var(--grid-line)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="Year"
                stroke="var(--rule-strong)"
                tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
                tickLine={false}
              />
              <YAxis
                stroke="var(--ink-dim)"
                tick={{ fill: "var(--ink-muted)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                domain={[0, 100]}
                unit="%"
                width={42}
              />
              <Tooltip content={<ChartTooltip unit="%" />} />
              <ReferenceLine
                y={50}
                stroke="var(--ink-muted)"
                strokeDasharray="4 4"
              />
              <Bar
                dataKey="clean_share_pct"
                name="Clean Share"
                fill="var(--clean)"
                fillOpacity={0.85}
                radius={[3, 3, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </>
  );
}