"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Search } from "lucide-react";
import { addBlockedThreeNumberAction, updateBlockedNumberAction, updateDrawLimitAction } from "@/lib/actions/compat";

type DrawOption = {
  id: string;
  name: string;
};

type LimitsByType = {
  twoTop: number;
  twoBottom: number;
  threeTop: number;
  threeBottom: number;
  threeTod: number;
};

type BlockedNumbers = {
  twoTop: string[];
  twoBottom: string[];
  threeTop: string[];
  threeBottom: string[];
};

type LimitsPageClientProps = {
  draws: DrawOption[];
  selectedDrawId: string;
  selectedTab: "limit" | "twoTop" | "twoBottom" | "threeTop" | "threeBottom";
  limits: LimitsByType;
  blockedNumbers: BlockedNumbers;
};

const mainTabs = [
  { key: "limit", label: "ตั้งยอดอั้น" },
  { key: "twoTop", label: "ตั้งเลขเต็ม 2 บน" },
  { key: "twoBottom", label: "ตั้งเลขเต็ม 2 ล่าง" },
  { key: "threeTop", label: "ตั้งเลขเต็ม 3 บน" },
  { key: "threeBottom", label: "ตั้งเลขเต็ม 3 ล่าง" },
] as const;

function buildTwoDigitRows() {
  return Array.from({ length: 10 }, (_, first) =>
    Array.from({ length: 10 }, (_, second) => `${first}${second}`),
  );
}

function buildThreeDigitRows(numbers: string[]) {
  const sorted = [...numbers].sort((a, b) => a.localeCompare(b));
  const rows: string[][] = [];

  for (let index = 0; index < sorted.length; index += 10) {
    rows.push(sorted.slice(index, index + 10));
  }

  return rows;
}

export function LimitsPageClient({
  draws,
  selectedDrawId,
  selectedTab,
  limits,
  blockedNumbers,
}: LimitsPageClientProps) {
  const twoDigitRows = useMemo(() => buildTwoDigitRows(), []);
  const selectedDraw = draws.find((draw) => draw.id === selectedDrawId) ?? draws[0];
  const activeThreeNumbers = selectedTab === "threeTop" ? blockedNumbers.threeTop : blockedNumbers.threeBottom;
  const threeDigitRows = useMemo(() => buildThreeDigitRows(activeThreeNumbers), [activeThreeNumbers]);

  function buildHref(tab: (typeof mainTabs)[number]["key"], drawId = selectedDraw.id) {
    return `/dashboard/limits?drawId=${drawId}&tab=${tab}`;
  }

  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h1 className="legacy-title">เลขอั้น/เต็ม</h1>
            <p className="legacy-subtitle">ตั้งลิมิตและเลขเต็มของงวดที่เลือกตาม flow เดิม</p>
          </div>
        </div>

        <div className="panel-body space-y-4">
          <div className="flex flex-wrap items-center justify-end gap-2">
            <form action="/dashboard/limits" className="flex flex-wrap items-center gap-2">
              <input name="tab" type="hidden" value={selectedTab} />
              <select
                className="legacy-form-control min-w-[260px]"
                defaultValue={selectedDraw.id}
                name="drawId"
              >
                {draws.map((draw) => (
                  <option key={draw.id} value={draw.id}>
                    {draw.name}
                  </option>
                ))}
              </select>
              <button className="legacy-btn-success inline-flex items-center gap-2" type="submit">
                <Search className="size-4" />
                ค้นหา
              </button>
            </form>
          </div>

          <div className="legacy-tab-nav">
            {mainTabs.map((tab) => (
              <Link
                key={tab.key}
                className={selectedTab === tab.key ? "legacy-tab-link active" : "legacy-tab-link"}
                href={buildHref(tab.key)}
              >
                {tab.label}
              </Link>
            ))}
          </div>

          {selectedTab === "limit" ? (
            <form action={updateDrawLimitAction} className="mx-auto max-w-[520px] space-y-4">
              <input name="drawId" type="hidden" value={selectedDraw.id} />
              <div className="table-shell">
                <table>
                  <thead className="bg-info">
                    <tr>
                      <th>ประเภท</th>
                      <th>ยอดแทงสูงสุด</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>2 บน</td>
                      <td><input className="legacy-form-control font-bold" defaultValue={limits.twoTop} id="txt2onlimit" name="limit2on" type="number" /></td>
                    </tr>
                    <tr>
                      <td>2 ล่าง</td>
                      <td><input className="legacy-form-control font-bold" defaultValue={limits.twoBottom} id="txt2belowlimit" name="limit2below" type="number" /></td>
                    </tr>
                    <tr>
                      <td>3 บน</td>
                      <td><input className="legacy-form-control font-bold" defaultValue={limits.threeTop} id="txt3onlimit" name="limit3on" type="number" /></td>
                    </tr>
                    <tr>
                      <td>3 ล่าง</td>
                      <td><input className="legacy-form-control font-bold" defaultValue={limits.threeBottom} id="txt3belowlimit" name="limit3below" type="number" /></td>
                    </tr>
                    <tr>
                      <td>3 โต๊ด</td>
                      <td><input className="legacy-form-control font-bold" defaultValue={limits.threeTod} id="text3inverse" name="limit3tod" type="number" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <button className="legacy-btn-success w-full" type="submit">
                บันทึก
              </button>
            </form>
          ) : null}

          {selectedTab === "twoTop" || selectedTab === "twoBottom" ? (
            <div className="table-shell">
              <table className="table-fixed">
                <tbody>
                  {twoDigitRows.map((row) => (
                    <tr key={row.join("-")}>
                      {row.map((number) => {
                        const type = selectedTab === "twoTop" ? "twoTop" : "twoBottom";
                        const blocked = blockedNumbers[type].includes(number);

                        return (
                          <td key={number} className={blocked ? "bg-[#f7b4b4] p-0" : "p-0"}>
                            <form action={updateBlockedNumberAction}>
                              <input name="type" type="hidden" value={type} />
                              <input name="number" type="hidden" value={number} />
                              <button
                                className="block w-full bg-transparent px-2 py-3 text-center font-mono text-base hover:font-bold hover:text-[#6495ed]"
                                title={blocked ? "n" : "y"}
                                type="submit"
                              >
                                {number}
                              </button>
                            </form>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {selectedTab === "threeTop" || selectedTab === "threeBottom" ? (
            <div className="space-y-4">
              <form action={addBlockedThreeNumberAction} className="flex items-end justify-end gap-2">
                <input name="type" type="hidden" value={selectedTab} />
                <div className="w-full max-w-[180px]">
                  <input
                    className="legacy-form-control"
                    id={selectedTab === "threeTop" ? "txt3on" : "txt3below"}
                    inputMode="numeric"
                    maxLength={3}
                    name="number"
                    type="text"
                  />
                </div>
                <button className="legacy-btn-danger" type="submit">
                  บันทึก
                </button>
              </form>

              <div className="table-shell">
                <table>
                  <tbody>
                    {threeDigitRows.length > 0 ? (
                      threeDigitRows.map((row) => (
                        <tr key={row.join("-")}>
                          {row.map((number) => (
                            <td key={number} className="bg-[#f7b4b4] p-0 text-center">
                              <form action={updateBlockedNumberAction}>
                                <input name="type" type="hidden" value={selectedTab} />
                                <input name="number" type="hidden" value={number} />
                                <button className="block w-full bg-transparent px-2 py-3 font-mono text-base hover:font-bold hover:text-[#6495ed]" type="submit">
                                  {number}
                                </button>
                              </form>
                            </td>
                          ))}
                          {row.length < 10
                            ? Array.from({ length: 10 - row.length }, (_, index) => <td key={`${row.join("-")}-empty-${index}`} />)
                            : null}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="text-center text-muted-foreground">ยังไม่มีเลขที่ถูกบล็อก</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
