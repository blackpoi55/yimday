"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LegacyModal } from "@/components/ui/legacy-modal";
import { formatCurrency } from "@/lib/utils";

type GridCell = {
  number: string;
  total: number;
};

type OverLimitItem = {
  betType: string;
  number: string;
  total: number;
  limit: number;
  overBy: number;
};

type DetailRow = {
  id: string;
  betType: string;
  number: string;
  amount: number;
  customerName: string;
  ticketCode: string;
  ticketName: string;
  agentName: string;
  createdAt: string;
  note: string | null;
};

type DrawOption = {
  id: string;
  name: string;
};

type MonitorClientProps = {
  draws: DrawOption[];
  selectedDrawId: string;
  selectedTab: string;
  selectedBucket: string;
  twoTopGrid: GridCell[][];
  twoBottomGrid: GridCell[][];
  threeStraightGrid: GridCell[][];
  threeBottomGrid: GridCell[][];
  threeTodTop: GridCell[];
  twoTodGrid: GridCell[][];
  runTop: GridCell[];
  runBottom: GridCell[];
  overLimit: OverLimitItem[];
  limitByType: Record<string, number | null>;
  detailRows: DetailRow[];
};

function buildHref(drawId: string, tab: string, bucket?: string) {
  const params = new URLSearchParams({ drawId, tab });
  if (bucket) {
    params.set("bucket", bucket);
  }
  return `/dashboard/monitor?${params.toString()}`;
}

function getTypeLabel(tab: string) {
  switch (tab) {
    case "two-top":
      return "2 ตัวบน";
    case "two-bottom":
      return "2 ตัวล่าง";
    case "three-straight":
      return "3 บน";
    case "three-tod":
      return "3 โต๊ด";
    case "three-bottom":
      return "3 ล่าง";
    case "two-tod":
      return "คู่โต๊ด";
    case "run-top":
      return "ลอยบน";
    case "run-bottom":
      return "ลอยล่าง";
    default:
      return "รายการเกินอั้น";
  }
}

function getBetTypeKeysForTab(tab: string) {
  switch (tab) {
    case "two-top":
      return ["TWO_TOP"];
    case "two-bottom":
      return ["TWO_BOTTOM"];
    case "three-straight":
      return ["THREE_STRAIGHT"];
    case "three-tod":
      return ["THREE_TOD"];
    case "three-bottom":
      return ["THREE_BOTTOM"];
    case "run-top":
      return ["RUN_TOP"];
    case "run-bottom":
      return ["RUN_BOTTOM"];
    case "two-tod":
      return ["TWO_TOD"];
    default:
      return [];
  }
}

function getBetTypeLabel(betType: string) {
  switch (betType) {
    case "TWO_TOP":
      return "2 ตัวบน";
    case "TWO_BOTTOM":
      return "2 ตัวล่าง";
    case "THREE_STRAIGHT":
      return "3 ตัวบน";
    case "THREE_BOTTOM":
      return "3 ตัวล่าง";
    case "THREE_TOD":
      return "3 ตัวโต๊ด";
    case "RUN_TOP":
      return "ลอยบน";
    case "RUN_BOTTOM":
      return "ลอยล่าง";
    case "TWO_TOD":
      return "คู่โต๊ด";
    default:
      return betType;
  }
}

function canonicalDigits(value: string) {
  return value.split("").sort().join("");
}

function buildThreeTodRows(bucket: string, totals: Record<string, number>) {
  return Array.from({ length: 10 }, (_, second) =>
    Array.from({ length: 10 }, (_, third) => {
      const number = `${bucket}${second}${third}`;
      const digits = number.split("");
      const uniqueCount = new Set(digits).size;

      if (uniqueCount === 1) {
        return null;
      }

      const representative = digits.slice().sort().join("");
      if (number !== representative) {
        return null;
      }

      return {
        number,
        total: totals[number] ?? 0,
      };
    }).filter((cell): cell is GridCell => cell !== null),
  );
}

export function MonitorClient({
  draws,
  selectedDrawId,
  selectedTab,
  selectedBucket,
  twoTopGrid,
  twoBottomGrid,
  threeStraightGrid,
  threeBottomGrid,
  threeTodTop,
  twoTodGrid,
  runTop,
  runBottom,
  overLimit,
  limitByType,
  detailRows,
}: MonitorClientProps) {
  const [activeNumber, setActiveNumber] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [searchTrigger, setSearchTrigger] = useState("");
  const isDetailModalOpen = Boolean(activeNumber && activeType);
  const detailModalTitle = activeNumber && activeType ? `${getBetTypeLabel(activeType)} : ${activeNumber}` : "";

  const modalRows = useMemo(() => {
    if (!activeNumber || !activeType) {
      return [];
    }

    return detailRows
      .filter((row) => {
        if (activeType === "THREE_TOD") {
          return row.betType === "THREE_TOD" && canonicalDigits(row.number) === activeNumber;
        }

        if (activeType === "TWO_TOD") {
          return row.betType === "TWO_TOP" && canonicalDigits(row.number) === canonicalDigits(activeNumber);
        }

        return row.number === activeNumber && row.betType === activeType;
      })
      .sort((a, b) => b.amount - a.amount);
  }, [activeNumber, activeType, detailRows]);

  const searchResults = useMemo(() => {
    const needle = searchTrigger.trim();
    if (!needle) {
      return [];
    }

    const totals = new Map<string, { label: string; total: number; type: string }>();

    for (const row of detailRows) {
      if (row.number !== needle) {
        continue;
      }

      const current = totals.get(row.betType) ?? {
        label: row.betType,
        total: 0,
        type: row.betType,
      };

      current.total += row.amount;
      totals.set(row.betType, current);
    }

    return [...totals.values()].sort((a, b) => b.total - a.total);
  }, [detailRows, searchTrigger]);

  const threeTodRows = useMemo(
    () => buildThreeTodRows(selectedBucket, Object.fromEntries(threeTodTop.map((item) => [item.number, item.total]))),
    [selectedBucket, threeTodTop],
  );

  function openDetail(number: string, tab: string) {
    const types = getBetTypeKeysForTab(tab);
    if (types.length === 0) {
      return;
    }

    setActiveNumber(number);
    setActiveType(types[0]);
  }

  function renderGridTable(rows: GridCell[][], limit?: number | null, tab?: string) {
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell) => {
                const over = typeof limit === "number" && limit > 0 && cell.total >= limit;
                const active = cell.total > 0;

                return (
                  <td
                    key={cell.number}
                    onClick={active && tab ? () => openDetail(cell.number, tab) : undefined}
                    style={{
                      border: "1px solid #ddd",
                      background: active ? "#dff7b4" : "#fff",
                      color: over ? "red" : "#333",
                      cursor: active ? "pointer" : "default",
                      fontWeight: active ? 700 : 400,
                      fontSize: "16px",
                      padding: "8px 10px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cell.number} = {formatCurrency(cell.total)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function renderSingleRowTable(items: GridCell[], limit?: number | null, tab?: string) {
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <tbody>
          <tr>
            {items.map((item) => {
              const over = typeof limit === "number" && limit > 0 && item.total >= limit;
              const active = item.total > 0;

              return (
                <td
                  key={item.number}
                  onClick={active && tab ? () => openDetail(item.number, tab) : undefined}
                  style={{
                    border: "1px solid #ddd",
                    background: active ? "#dff7b4" : "#fff",
                    color: over ? "red" : "#333",
                    cursor: active ? "pointer" : "default",
                    fontWeight: active ? 700 : 400,
                    fontSize: "16px",
                    padding: "10px 12px",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.number} = {formatCurrency(item.total)}
                </td>
              );
            })}
          </tr>
        </tbody>
      </table>
    );
  }

  function renderThreeTodTable(rows: GridCell[][], limit?: number | null) {
    return (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell) => {
                const over = typeof limit === "number" && limit > 0 && cell.total >= limit;
                const active = cell.total > 0;

                return (
                  <td
                    key={cell.number}
                    onClick={active ? () => openDetail(cell.number, "three-tod") : undefined}
                    style={{
                      border: "1px solid #ddd",
                      background: active ? "#dff7b4" : "#fff",
                      color: over ? "red" : "#333",
                      cursor: active ? "pointer" : "default",
                      fontWeight: active ? 700 : 400,
                      fontSize: "16px",
                      padding: "10px 12px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {cell.number} = {formatCurrency(cell.total)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  function renderOverLimitTable(items: OverLimitItem[]) {
    return (
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#87ceeb" }}>
            <th style={{ padding: "10px", textAlign: "left", fontWeight: 400 }}>รายการ</th>
            <th style={{ padding: "10px", textAlign: "left", fontWeight: 400 }}>เลขที่เกิน</th>
            <th style={{ padding: "10px", textAlign: "left", fontWeight: 400 }}>จำนวนเงิน</th>
            <th style={{ padding: "10px", textAlign: "left", fontWeight: 400 }}>จำนวนที่เกิน</th>
            <th style={{ width: "1%", padding: "10px" }} />
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr key={`${item.betType}-${item.number}`} style={{ background: index % 2 === 0 ? "#fff" : "#f9f9f9" }}>
              <td style={{ padding: "12px 10px", borderTop: "1px solid #eee" }}>{getBetTypeLabel(item.betType)}</td>
              <td style={{ padding: "12px 10px", borderTop: "1px solid #eee" }}>{item.number}</td>
              <td style={{ padding: "12px 10px", borderTop: "1px solid #eee" }}>{formatCurrency(item.total)}</td>
              <td style={{ padding: "12px 10px", borderTop: "1px solid #eee", color: "crimson" }}>{formatCurrency(item.overBy)}</td>
              <td style={{ padding: "8px 10px", borderTop: "1px solid #eee", textAlign: "right" }}>
                <button
                  onClick={() => {
                    setActiveNumber(item.number);
                    setActiveType(item.betType);
                  }}
                  style={{
                    background: "#337ab7",
                    color: "#fff",
                    border: 0,
                    borderRadius: "4px",
                    padding: "8px 14px",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    fontWeight: 600,
                  }}
                  type="button"
                >
                  แบ่งออก
                </button>
              </td>
            </tr>
          ))}
          {items.length === 0 ? (
            <tr>
              <td colSpan={5} style={{ padding: "12px 10px" }}>
                ยังไม่มีรายการเกินอั้น
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    );
  }

  return (
    <>
      <div className="legacy-monitor-shell">
        <form action="/dashboard/monitor" className="legacy-monitor-toolbar">
          <input name="tab" type="hidden" value={selectedTab} />
          <input name="bucket" type="hidden" value={selectedBucket} />
          <select className="legacy-monitor-select" defaultValue={selectedDrawId} name="drawId">
            {draws.map((draw) => (
              <option key={draw.id} value={draw.id}>
                {draw.name}
              </option>
            ))}
          </select>
          <button className="legacy-monitor-search-btn" type="submit">
            <Search className="size-4" strokeWidth={2.5} />
          </button>
        </form>

        <div className="mt-[15px]">
          <div className="legacy-tab-nav">
            <Link className={selectedTab === "two-top" ? "legacy-tab-link active" : "legacy-tab-link"} href={buildHref(selectedDrawId, "two-top", selectedBucket)}>2 ตัวบน</Link>
            <Link className={selectedTab === "two-bottom" ? "legacy-tab-link active" : "legacy-tab-link"} href={buildHref(selectedDrawId, "two-bottom", selectedBucket)}>2 ตัวล่าง</Link>
            <Link className={selectedTab === "three-straight" ? "legacy-tab-link active" : "legacy-tab-link"} href={buildHref(selectedDrawId, "three-straight", selectedBucket)}>3 บน</Link>
            <Link className={selectedTab === "three-tod" ? "legacy-tab-link active" : "legacy-tab-link"} href={buildHref(selectedDrawId, "three-tod", selectedBucket)}>3 โต๊ด</Link>
            <Link className={selectedTab === "three-bottom" ? "legacy-tab-link active" : "legacy-tab-link"} href={buildHref(selectedDrawId, "three-bottom", selectedBucket)}>3 ล่าง</Link>
            <Link className={selectedTab === "two-tod" ? "legacy-tab-link active" : "legacy-tab-link"} href={buildHref(selectedDrawId, "two-tod", selectedBucket)}>คู่โต๊ด</Link>
            <Link className={selectedTab === "run-top" ? "legacy-tab-link active" : "legacy-tab-link"} href={buildHref(selectedDrawId, "run-top", selectedBucket)}>ลอยบน</Link>
            <Link className={selectedTab === "run-bottom" ? "legacy-tab-link active" : "legacy-tab-link"} href={buildHref(selectedDrawId, "run-bottom", selectedBucket)}>ลอยล่าง</Link>
            <Link className={selectedTab === "over-limit" ? "legacy-tab-link active" : "legacy-tab-link"} href={buildHref(selectedDrawId, "over-limit", selectedBucket)}>รายการเกินอั้น</Link>
            <Link className={selectedTab === "search" ? "legacy-tab-link active ml-auto" : "legacy-tab-link ml-auto"} href={buildHref(selectedDrawId, "search", selectedBucket)}>ค้นหา</Link>
          </div>

          <div className="pt-[15px]">
            {selectedTab !== "over-limit" && selectedTab !== "search" ? (
              <h2 className="mb-[10px] text-[50px] font-normal leading-none text-[#333]">{getTypeLabel(selectedTab)}</h2>
            ) : null}

            {selectedTab === "two-top" ? renderGridTable(twoTopGrid, limitByType.TWO_TOP, "two-top") : null}
            {selectedTab === "two-bottom" ? renderGridTable(twoBottomGrid, limitByType.TWO_BOTTOM, "two-bottom") : null}

            {selectedTab === "three-straight" || selectedTab === "three-bottom" ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 10 }, (_, index) => {
                    const bucket = `${index}`;
                    return (
                      <Link key={bucket} className={selectedBucket === bucket ? "legacy-subtab-link active" : "legacy-subtab-link"} href={buildHref(selectedDrawId, selectedTab, bucket)}>
                        {bucket}
                      </Link>
                    );
                  })}
                </div>
                {selectedTab === "three-straight"
                  ? renderGridTable(threeStraightGrid, limitByType.THREE_STRAIGHT, "three-straight")
                  : renderGridTable(threeBottomGrid, limitByType.THREE_BOTTOM, "three-bottom")}
              </div>
            ) : null}

            {selectedTab === "three-tod" ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {Array.from({ length: 9 }, (_, index) => {
                    const bucket = `${index}`;
                    return (
                      <Link key={bucket} className={selectedBucket === bucket ? "legacy-subtab-link active" : "legacy-subtab-link"} href={buildHref(selectedDrawId, "three-tod", bucket)}>
                        {bucket}
                      </Link>
                    );
                  })}
                </div>
                {renderThreeTodTable(threeTodRows, limitByType.THREE_TOD)}
              </div>
            ) : null}

            {selectedTab === "two-tod" ? renderGridTable(twoTodGrid, limitByType.TWO_TOD ?? limitByType.TWO_TOP, "two-tod") : null}
            {selectedTab === "run-top" ? renderSingleRowTable(runTop, limitByType.RUN_TOP, "run-top") : null}
            {selectedTab === "run-bottom" ? renderSingleRowTable(runBottom, limitByType.RUN_BOTTOM, "run-bottom") : null}

            {selectedTab === "over-limit" ? (
              <div className="table-shell">
                {renderOverLimitTable(overLimit)}
              </div>
            ) : null}

            {selectedTab === "search" ? (
              <div className="space-y-4">
                <div className="flex max-w-[420px] items-center gap-2">
                  <Input
                    placeholder="ค้นหาเลข"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value.replace(/\D/g, "").slice(0, 3))}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        setSearchTrigger(searchText);
                      }
                    }}
                  />
                  <Button onClick={() => setSearchTrigger(searchText)} variant="primary">
                    <Search className="size-4" />
                  </Button>
                </div>

                <div style={{ width: "100%", display: "table" }}>
                  {searchResults.map((item) => (
                    <button
                      key={item.type}
                      onClick={() => {
                        setActiveNumber(searchTrigger);
                        setActiveType(item.type);
                      }}
                      style={{
                        width: "280px",
                        background: "#dff7b4",
                        cursor: "pointer",
                        marginTop: "10px",
                        float: "left",
                        marginRight: "10px",
                        padding: "10px",
                        fontSize: "16px",
                        border: 0,
                        textAlign: "left",
                      }}
                      type="button"
                    >
                      ({item.type}) {searchTrigger} = {formatCurrency(item.total)}
                    </button>
                  ))}
                  {searchTrigger && searchResults.length === 0 ? <div className="text-sm text-muted-foreground">ไม่พบข้อมูลเลขนี้</div> : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <LegacyModal
        open={isDetailModalOpen}
        onClose={() => {
          setActiveNumber(null);
          setActiveType(null);
        }}
        size="lg"
        title={detailModalTitle}
      >
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>&#3648;&#3621;&#3586;</th>
                <th>&#3618;&#3629;&#3604;&#3648;&#3591;&#3636;&#3609;</th>
                <th>&#3650;&#3614;&#3618;&#3586;&#3629;&#3591;</th>
                <th>&#3594;&#3639;&#3656;&#3629;&#3650;&#3614;&#3618;</th>
                <th>&#3612;&#3641;&#3657;&#3610;&#3633;&#3609;&#3607;&#3638;&#3585;</th>
                <th>&#3586;&#3657;&#3629;&#3617;&#3641;&#3621;&#3585;&#3634;&#3619;&#3588;&#3637;&#3618;&#3660;</th>
                <th>&#3623;&#3633;&#3609;&#3607;&#3637;&#3656;&#3610;&#3633;&#3609;&#3607;&#3638;&#3585;</th>
                <th>&#3648;&#3623;&#3621;&#3634;&#3610;&#3633;&#3609;&#3607;&#3638;&#3585;</th>
              </tr>
            </thead>
            <tbody>
              {modalRows.map((row) => {
                const createdAt = new Date(row.createdAt);

                return (
                  <tr key={row.id}>
                    <td>{row.number}</td>
                    <td>{formatCurrency(row.amount)}</td>
                    <td>{row.customerName}</td>
                    <td>{row.ticketName}</td>
                    <td>{row.agentName}</td>
                    <td>{row.note || "-"}</td>
                    <td>{createdAt.toLocaleDateString("sv-SE")}</td>
                    <td>{createdAt.toLocaleTimeString("en-GB")}</td>
                  </tr>
                );
              })}
              {modalRows.length === 0 ? (
                <tr>
                  <td colSpan={8}>&#3652;&#3617;&#3656;&#3614;&#3610;&#3619;&#3634;&#3618;&#3621;&#3632;&#3648;&#3629;&#3637;&#3618;&#3604;</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </LegacyModal>
    </>
  );
}
