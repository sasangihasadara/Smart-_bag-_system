import React from "react";

/**
 * Reusable transactions table
 *
 * props:
 * - rows: array of tx objects. You can optionally pass:
 *      rid: real backend id (used for keys/actions)
 *      id:  display id (will be overridden when useSequentialIds=true)
 * - onCycleStatus?: (id) => void   // used as "Edit" handler
 * - onDelete?: (id) => void
 * - showActions?: boolean (default true)
 * - limit?: number (optional)
 * - showFMC?: boolean (default true)
 * - showStatus?: boolean (default true)
 * - useSequentialIds?: boolean (default false) -> show 1,2,3,… in TX ID column
 * - startIndex?: number (default 1) -> base for sequential ids
 */
export default function TransactionsTable({
  rows = [],
  onCycleStatus,
  onDelete,
  showActions = true,
  limit,
  showFMC = true,
  showStatus = true,
  useSequentialIds = false,
  startIndex = 1,
}) {
  const list = Array.isArray(rows) ? rows : [];
  const cut = typeof limit === "number" ? list.slice(0, limit) : list;

  // compute total columns for empty state colSpan
  // base columns: TXID, Date, Customer, Product, Qty, Unit, Discount, Total
  let baseCols = 8;
  if (showFMC) baseCols += 1;
  if (showStatus) baseCols += 1;
  if (showActions) baseCols += 1;

  return (
    <div className="body table-wrap">
      <table>
        <thead>
          <tr>
            <th>TX ID</th>
            <th>Date</th>
            <th>Customer</th>
            {showFMC && <th>FMC</th>}
            <th>Product</th>
            <th>qty</th>
            <th className="right">Unit</th>
            <th className="right">Discount</th>
            <th className="right">Total</th>
            {showStatus && <th>Status</th>}
            {showActions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {cut.map((t, idx) => {
            // real id for actions/keys; fall back to .id if rid is absent
            const realId = t.rid ?? t.realId ?? t.backendId ?? t.id ?? String(idx);
            // what to show in the first column
            const displayId = useSequentialIds
              ? String(startIndex + idx)
              : String(t.displayId ?? t.id ?? realId);

            return (
              <tr key={realId}>
                <td>{displayId}</td>
                <td>{t.date}</td>
                <td>{t.customer || ""}</td>
                {showFMC && (
                  <td>{t.fmc ? <span className="badge b-blue">FMC</span> : "—"}</td>
                )}
                <td>{t.productName || ""}</td>
                <td>{t.qty}</td>
                <td className="right">{formatMoney(t.unitPrice)}</td>
                <td className="right">
                  {t.discountPerUnit > 0 ? formatMoney(t.discountPerUnit) : "—"}
                </td>
                <td className="right">{formatMoney(t.total)}</td>
                {showStatus && (
                  <td>
                    <span
                      className={
                        "badge " +
                        (t.status === "Paid"
                          ? "b-green"
                          : t.status === "Pending"
                          ? "b-amber"
                          : "b-red")
                      }
                    >
                      {t.status ?? "—"}
                    </span>
                  </td>
                )}
                {showActions && (
                  <td className="actions">
                    {onCycleStatus && (
                      <button className="btn" onClick={() => onCycleStatus(realId)}>
                        Edit
                      </button>
                    )}
                    {onDelete && (
                      <button className="btn red" onClick={() => onDelete(realId)}>
                        Delete
                      </button>
                    )}
                  </td>
                )}
              </tr>
            );
          })}
          {cut.length === 0 && (
            <tr>
              <td colSpan={baseCols} className="muted">
                No transactions
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// local util (same format as your FinancePage)
function formatMoney(n) {
  return (
    "LKR" +
    Number(n || 0).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}
