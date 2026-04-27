"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useDeferredValue, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { createBetSplitAction } from "@/lib/actions/monitor";
import { Input } from "@/components/ui/input";
import { LegacyModal } from "@/components/ui/legacy-modal";
import { showErrorAlert, showSuccessAlert } from "@/lib/client-alerts";
import { formatLegacyTicketEntry } from "@/lib/legacy-ticket-format";
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
  ticketId: string;
  betType: string;
  displayType: string | null;
  number: string;
  amount: number;
  customerName: string;
  ticketCode: string;
  ticketName: string;
  agentName: string;
  createdAt: string;
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

function getTabForBetType(betType: string) {
  switch (betType) {
    case "TWO_TOP":
      return "two-top";
    case "TWO_BOTTOM":
      return "two-bottom";
    case "THREE_STRAIGHT":
      return "three-straight";
    case "THREE_TOD":
      return "three-tod";
    case "THREE_BOTTOM":
      return "three-bottom";
    case "TWO_TOD":
      return "two-tod";
    case "RUN_TOP":
      return "run-top";
    case "RUN_BOTTOM":
      return "run-bottom";
    default:
      return null;
  }
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

function canonicalDigits(value: string) {
  return value.split("").sort().join("");
}

function filterDetailRows(rows: DetailRow[], activeNumber: string, activeType: string) {
  return rows
    .filter((row) => {
      if (activeType === "THREE_TOD") {
        return row.betType === "THREE_TOD" && canonicalDigits(row.number) === activeNumber;
      }

      if (activeType === "TWO_TOD") {
        return row.displayType === "TWO_TOD" && canonicalDigits(row.number) === canonicalDigits(activeNumber);
      }

      return row.number === activeNumber && row.betType === activeType && row.displayType !== "TWO_TOD";
    })
    .sort((a, b) => {
      const createdAtDiff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (createdAtDiff !== 0) {
        return createdAtDiff;
      }

      return b.amount - a.amount;
    });
}

function selectRowsForSplitAmount(rows: DetailRow[], targetAmount: number) {
  if (!Number.isFinite(targetAmount) || targetAmount <= 0) {
    return [];
  }

  const selected: Array<DetailRow & { splitAmount: number }> = [];
  let amountLeft = targetAmount;

  for (const row of rows) {
    if (amountLeft <= 0) {
      break;
    }

    const splitAmount = Math.min(row.amount, amountLeft);
    selected.push({
      ...row,
      splitAmount,
    });
    amountLeft -= splitAmount;
  }

  return selected;
}

function collectSplitTotal(rows: Array<{ splitAmount: number }>) {
  return rows.reduce((sum, row) => sum + row.splitAmount, 0);
}

function collectRemainingTotal(rows: DetailRow[]) {
  return rows.reduce((sum, row) => sum + row.amount, 0);
}

function getMonitorCellClass(active: boolean, over: boolean) {
  if (!active) {
    return "legacy-monitor-grid-cell";
  }

  if (over) {
    return "legacy-monitor-grid-cell legacy-monitor-grid-cell-active legacy-monitor-grid-cell-over";
  }

  return "legacy-monitor-grid-cell legacy-monitor-grid-cell-active";
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
  selectedTab: initialSelectedTab,
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
  const router = useRouter();
  const [activeNumber, setActiveNumber] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [splitTarget, setSplitTarget] = useState<OverLimitItem | null>(null);
  const [splitAmountText, setSplitAmountText] = useState("");
  const [splitAmount, setSplitAmount] = useState<number | null>(null);
  const [isSavingSplit, setIsSavingSplit] = useState(false);
  const [searchText, setSearchText] = useState("");
  const deferredSearchText = useDeferredValue(searchText);
  const searchQuery = deferredSearchText.trim();
  const [forcedSearchMode, setForcedSearchMode] = useState(false);
  const [searchOriginTab, setSearchOriginTab] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const selectedTab = forcedSearchMode && searchOriginTab === initialSelectedTab ? "search" : initialSelectedTab;
  const isDetailModalOpen = Boolean(activeNumber && activeType);
  const detailModalTitle = activeNumber && activeType ? `${getBetTypeLabel(activeType)} : ${activeNumber}` : "";
  const splitModalTitle = splitTarget ? `${getBetTypeLabel(splitTarget.betType)} ${splitTarget.number}` : "";

  const matchingRows = useMemo(() => {
    if (!activeNumber || !activeType) {
      return [];
    }

    return filterDetailRows(detailRows, activeNumber, activeType);
  }, [activeNumber, activeType, detailRows]);

  const splitPlanRows = useMemo(
    () => (splitAmount ? selectRowsForSplitAmount(matchingRows, splitAmount) : []),
    [matchingRows, splitAmount],
  );

  const modalRows = splitAmount ? splitPlanRows : matchingRows;

  const splitSelectedTotal = useMemo(
    () => collectSplitTotal(splitPlanRows),
    [splitPlanRows],
  );
  const splitRemainingTotal = useMemo(() => collectRemainingTotal(matchingRows), [matchingRows]);
  const splitPlanById = useMemo(
    () => new Map(splitPlanRows.map((row) => [row.id, row.splitAmount])),
    [splitPlanRows],
  );

  const searchResults = useMemo(() => {
    const needle = searchQuery;
    if (!needle) {
      return [];
    }

    const totals = new Map<string, { label: string; total: number; type: string }>();

    for (const row of detailRows) {
      if (row.number !== needle) {
        continue;
      }

      const typeKey = row.displayType === "TWO_TOD" ? "TWO_TOD" : row.betType;
      const current = totals.get(typeKey) ?? {
        label: typeKey,
        total: 0,
        type: typeKey,
      };

      current.total += row.amount;
      totals.set(typeKey, current);
    }

    return [...totals.values()].sort((a, b) => b.total - a.total);
  }, [detailRows, searchQuery]);

  const threeTodRows = useMemo(
    () => buildThreeTodRows(selectedBucket, Object.fromEntries(threeTodTop.map((item) => [item.number, item.total]))),
    [selectedBucket, threeTodTop],
  );

  const handleGlobalSearchHotkey = useEffectEvent((event: KeyboardEvent) => {
    if (event.metaKey || event.ctrlKey || event.altKey || isEditableTarget(event.target) || isDetailModalOpen || Boolean(splitTarget)) {
      return;
    }

    if (event.key === "Escape" && forcedSearchMode) {
      event.preventDefault();
      setForcedSearchMode(false);
      setSearchOriginTab(null);
      setSearchText("");
      return;
    }

    if (!/^\d$/.test(event.key)) {
      return;
    }

    event.preventDefault();
    setForcedSearchMode(true);
    setSearchOriginTab(initialSelectedTab);
    setSearchText((previous) => `${selectedTab === "search" ? previous : ""}${event.key}`.slice(0, 3));
  });

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalSearchHotkey);
    return () => window.removeEventListener("keydown", handleGlobalSearchHotkey);
  }, []);

  useEffect(() => {
    if (selectedTab !== "search") {
      return;
    }

    searchInputRef.current?.focus();
    searchInputRef.current?.setSelectionRange(searchText.length, searchText.length);
  }, [selectedTab, searchText]);

  function resetSearchMode() {
    setForcedSearchMode(false);
    setSearchOriginTab(null);
    setSearchText("");
  }

  function openDetail(number: string, tab: string) {
    const types = getBetTypeKeysForTab(tab);
    if (types.length === 0) {
      return;
    }

    setActiveNumber(number);
    setActiveType(types[0]);
    setSplitAmount(null);
  }

  async function confirmSplitAmount() {
    if (!splitTarget) {
      return;
    }

    const requestedAmount = Number(splitAmountText);

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      await showErrorAlert("กรุณาระบุจำนวนเงินที่ต้องการแบ่ง");
      return;
    }

    if (requestedAmount > splitTarget.total) {
      await showErrorAlert("จำนวนเงินที่ต้องการแบ่งต้องไม่มากกว่ายอดรวมของเลขนี้");
      return;
    }

    setSplitAmount(requestedAmount);
    setActiveNumber(splitTarget.number);
    setActiveType(splitTarget.betType);
    setSplitTarget(null);
    setSplitAmountText("");
  }

  async function saveSplit() {
    if (!activeNumber || !activeType || !splitAmount) {
      return;
    }

    setIsSavingSplit(true);

    try {
      const formData = new FormData();
      formData.set("drawId", selectedDrawId);
      formData.set("betType", activeType);
      formData.set("number", activeNumber);
      formData.set("requestedAmount", String(splitAmount));

      const result = await createBetSplitAction(formData);

      if (!result.ok) {
        await showErrorAlert(result.error);
        return;
      }

      await showSuccessAlert(result.message);
      setActiveNumber(null);
      setActiveType(null);
      setSplitAmount(null);
      setSplitAmountText("");
      router.refresh();
    } finally {
      setIsSavingSplit(false);
    }
  }

  function renderGridTable(rows: GridCell[][], limit?: number | null, tab?: string) {
    return (
      <div className="table-shell overflow-hidden">
        <table className="legacy-monitor-grid-table">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell) => {
                  const over = typeof limit === "number" && limit > 0 && cell.total >= limit;
                  const active = cell.total > 0;

                  return (
                    <td
                      key={cell.number}
                      className={getMonitorCellClass(active, over)}
                      onClick={active && tab ? () => openDetail(cell.number, tab) : undefined}
                    >
                      {cell.number} = {formatCurrency(cell.total)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function renderSingleRowTable(items: GridCell[], limit?: number | null, tab?: string) {
    return (
      <div className="table-shell overflow-hidden">
        <table className="legacy-monitor-grid-table">
          <tbody>
            <tr>
              {items.map((item) => {
                const over = typeof limit === "number" && limit > 0 && item.total >= limit;
                const active = item.total > 0;

                return (
                  <td
                    key={item.number}
                    className={getMonitorCellClass(active, over)}
                    onClick={active && tab ? () => openDetail(item.number, tab) : undefined}
                  >
                    {item.number} = {formatCurrency(item.total)}
                  </td>
                );
              })}
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  function renderThreeTodTable(rows: GridCell[][], limit?: number | null) {
    return (
      <div className="table-shell overflow-hidden">
        <table className="legacy-monitor-grid-table">
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell) => {
                  const over = typeof limit === "number" && limit > 0 && cell.total >= limit;
                  const active = cell.total > 0;

                  return (
                    <td
                      key={cell.number}
                      className={getMonitorCellClass(active, over)}
                      onClick={active ? () => openDetail(cell.number, "three-tod") : undefined}
                    >
                      {cell.number} = {formatCurrency(cell.total)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
                    setActiveNumber(null);
                    setActiveType(null);
                    setSplitAmount(null);
                    setSplitTarget(item);
                    setSplitAmountText("");
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
        <div className="legacy-monitor-toolbar">
          <select
            className="legacy-monitor-select"
            value={selectedDrawId}
            onChange={(event) => {
              resetSearchMode();
              router.push(buildHref(event.target.value, selectedTab, selectedBucket));
            }}
          >
            {draws.map((draw) => (
              <option key={draw.id} value={draw.id}>
                {draw.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-[15px]">
          <div className="legacy-tab-nav">
            <Link className={selectedTab === "two-top" ? "legacy-tab-link active" : "legacy-tab-link"} href={buildHref(selectedDrawId, "two-top", selectedBucket)} onClick={resetSearchMode}>2 ตัวบน</Link>
            <Link className={selectedTab === "two-bottom" ? "legacy-tab-link active" : "legacy-tab-link"} href={buildHref(selectedDrawId, "two-bottom", selectedBucket)} onClick={resetSearchMode}>2 ตัวล่าง</Link>
            <Link className={selectedTab === "three-straight" ? "legacy-tab-link active" : "legacy-tab-link"} href={buildHref(selectedDrawId, "three-straight", selectedBucket)} onClick={resetSearchMode}>3 บน</Link>
            <Link className={selectedTab === "three-tod" ? "legacy-tab-link active" : "legacy-tab-link"} href={buildHref(selectedDrawId, "three-tod", selectedBucket)} onClick={resetSearchMode}>3 โต๊ด</Link>
            <Link className={selectedTab === "three-bottom" ? "legacy-tab-link active" : "legacy-tab-link"} href={buildHref(selectedDrawId, "three-bottom", selectedBucket)} onClick={resetSearchMode}>3 ล่าง</Link>
            <Link className={selectedTab === "two-tod" ? "legacy-tab-link active" : "legacy-tab-link"} href={buildHref(selectedDrawId, "two-tod", selectedBucket)} onClick={resetSearchMode}>คู่โต๊ด</Link>
            <Link className={selectedTab === "run-top" ? "legacy-tab-link active" : "legacy-tab-link"} href={buildHref(selectedDrawId, "run-top", selectedBucket)} onClick={resetSearchMode}>ลอยบน</Link>
            <Link className={selectedTab === "run-bottom" ? "legacy-tab-link active" : "legacy-tab-link"} href={buildHref(selectedDrawId, "run-bottom", selectedBucket)} onClick={resetSearchMode}>ลอยล่าง</Link>
            <Link className={selectedTab === "over-limit" ? "legacy-tab-link active" : "legacy-tab-link"} href={buildHref(selectedDrawId, "over-limit", selectedBucket)} onClick={resetSearchMode}>รายการเกินอั้น</Link>
            <Link className={selectedTab === "search" ? "legacy-tab-link active ml-auto" : "legacy-tab-link ml-auto"} href={buildHref(selectedDrawId, "search", selectedBucket)} onClick={resetSearchMode}>ค้นหา</Link>
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
                <div className="max-w-[420px]">
                  <Input ref={searchInputRef}
                    placeholder="ค้นหาเลข"
                    value={searchText}
                    onChange={(event) => setSearchText(event.target.value.replace(/\D/g, "").slice(0, 3))}
                  />
                </div>

                <div style={{ width: "100%", display: "table" }}>
                  {searchResults.map((item) => (
                    <button
                      key={item.type}
                      onClick={() => {
                        const targetTab = getTabForBetType(item.type);
                        if (!targetTab) {
                          setActiveNumber(searchQuery);
                          setActiveType(item.type);
                          setSplitAmount(null);
                          return;
                        }

                        setForcedSearchMode(false);
                        setSearchOriginTab(null);
                        router.push(
                          buildHref(
                            selectedDrawId,
                            targetTab,
                            targetTab === "three-straight" || targetTab === "three-bottom" || targetTab === "three-tod"
                              ? searchQuery[0]
                              : undefined,
                          ),
                        );
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
                      ({item.type}) {searchQuery} = {formatCurrency(item.total)}
                    </button>
                  ))}
                  {searchQuery && searchResults.length === 0 ? <div className="text-sm text-muted-foreground">ไม่พบข้อมูลเลขนี้</div> : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <LegacyModal
        open={Boolean(splitTarget)}
        onClose={() => {
          setSplitTarget(null);
          setSplitAmountText("");
        }}
        size="sm"
        title={splitModalTitle}
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="legacy-form-label" htmlFor="split-amount">
              ระบุจำนวนเงินที่ต้องการแบ่ง
            </label>
            <Input
              id="split-amount"
              inputMode="decimal"
              type="number"
              value={splitAmountText}
              onChange={(event) => setSplitAmountText(event.target.value)}
            />
          </div>

          <div className="legacy-modal-actions justify-end">
            <button
              className="legacy-btn-default"
              onClick={() => {
                setSplitTarget(null);
                setSplitAmountText("");
              }}
              type="button"
            >
              ยกเลิก
            </button>
            <button className="legacy-btn-info" onClick={() => void confirmSplitAmount()} type="button">
              ยืนยัน
            </button>
          </div>
        </div>
      </LegacyModal>

      <LegacyModal
        open={isDetailModalOpen}
        onClose={() => {
          setActiveNumber(null);
          setActiveType(null);
          setSplitAmount(null);
          setSplitAmountText("");
        }}
        size="lg"
        title={detailModalTitle}
      >
        <div className="space-y-4">
          {splitAmount ? (
            <div className="rounded-sm border border-[#d9edf7] bg-[#f4fbff] px-4 py-3 text-sm text-[#31708f]">
              ยอดคงเหลือ {formatCurrency(splitRemainingTotal)} | จะแบ่งออก {formatCurrency(splitSelectedTotal)}
            </div>
          ) : null}

          <div className="table-shell">
            <table>
              <thead>
                <tr>
                  <th>&#3648;&#3621;&#3586;</th>
                  <th>&#3618;&#3629;&#3604;&#3648;&#3591;&#3636;&#3609;</th>
                  {splitAmount ? <th>ยอดแบ่งออก</th> : null}
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
                      {splitAmount ? <td>{formatCurrency(splitPlanById.get(row.id) ?? 0)}</td> : null}
                      <td>{row.customerName}</td>
                      <td>
                        <Link className="text-primary underline" href={`/dashboard/tickets/${row.ticketId}`}>
                          {row.ticketName}
                        </Link>
                      </td>
                      <td>{row.agentName}</td>
                      <td>{formatLegacyTicketEntry({ betType: row.betType, number: row.number, amount: row.amount, activeType })}</td>
                      <td>{createdAt.toLocaleDateString("sv-SE")}</td>
                      <td>{createdAt.toLocaleTimeString("en-GB")}</td>
                    </tr>
                  );
                })}
                {modalRows.length === 0 ? (
                  <tr>
                    <td colSpan={splitAmount ? 9 : 8}>&#3652;&#3617;&#3656;&#3614;&#3610;&#3619;&#3634;&#3618;&#3621;&#3632;&#3648;&#3629;&#3637;&#3618;&#3604;</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {splitAmount ? (
            <div className="legacy-modal-actions justify-end">
              <button
                className="legacy-btn-default"
                onClick={() => {
                  setSplitAmount(null);
                  setSplitAmountText("");
                }}
                type="button"
              >
                ยกเลิก
              </button>
              <button className="legacy-btn-success" disabled={isSavingSplit} onClick={() => void saveSplit()} type="button">
                {isSavingSplit ? "กำลังบันทึก..." : "บันทึกการแบ่งออก"}
              </button>
            </div>
          ) : null}
        </div>
      </LegacyModal>
    </>
  );
}
