import { fmtNum, fmtSigned, getDeltaTone } from "../utils/format";

export default function LedgerTable({ rows, showAllYears, onToggleYears }) {
  const visibleRows = showAllYears
    ? rows
    : rows.filter((_, i) => i % 2 === 0 || i === rows.length - 1);

  return (
    <section className="sheet p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="text-sm font-bold text-[var(--ink)]">
          Annual Projection Ledger (2025–2040)
        </h2>
        <button type="button" onClick={onToggleYears} className="btn-flat">
          {showAllYears ? "Alternate years" : "Show all 16 years"}
        </button>
      </div>

      <div className="table-frame">
        <table className="data-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Cap (GW)</th>
              <th>Gen (BU)</th>
              <th>Demand (BU)</th>
              <th>Gap (BU)</th>
              <th>Clean %</th>
              <th>CO₂ (MT)</th>
              <th>Δ vs Base</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.map((row) => {
              const gapTone = getDeltaTone(row.supply_gap_bu, {
                lowerIsBetter: false,
              });
              const co2Tone = getDeltaTone(row.delta_co2_mt, {
                lowerIsBetter: true,
              });
              return (
                <tr key={row.Year}>
                  <td className="font-semibold text-[var(--ink)]">
                    {row.Year}
                  </td>
                  <td>{fmtNum(row.total_capacity_gw, 1)}</td>
                  <td>{fmtNum(row.total_gen_bu, 1)}</td>
                  <td>{fmtNum(row.demand_bu, 1)}</td>
                  <td className="font-medium" style={{ color: gapTone.text }}>
                    {fmtSigned(row.supply_gap_bu, 1)}
                  </td>
                  <td className="font-semibold text-[var(--clean)]">
                    {fmtNum(row.clean_share_pct, 1)}%
                  </td>
                  <td className="font-semibold text-[var(--ink)]">
                    {fmtNum(row.total_co2_mt, 1)}
                  </td>
                  <td className="font-medium" style={{ color: co2Tone.text }}>
                    {fmtSigned(row.delta_co2_mt, 1)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}