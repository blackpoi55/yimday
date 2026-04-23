"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { startTransition, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { Activity, AlertTriangle, Clock3, Flame, RefreshCcw, Ticket, Users } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

type DrawOption = {
  id: string;
  name: string;
  closeAt: string;
  status: string;
};

type SelectedDraw = {
  id: string;
  name: string;
  closeAt: string;
  openAt: string;
  status: string;
};

type RedSummary = {
  betType: string;
  label: string;
  count: number;
  total: number;
  totalOver: number;
  maxOver: number;
  hottestNumber: string;
};

type RedItem = {
  betType: string;
  label: string;
  number: string;
  total: number;
  limit: number;
  overBy: number;
  usagePercent: number;
  monitorHref: string;
};

type NearLimitItem = {
  betType: string;
  label: string;
  number: string;
  total: number;
  limit: number;
  usagePercent: number;
  monitorHref: string;
};

type RecentRow = {
  id: string;
  ticketId: string;
  betType: string;
  label: string;
  number: string;
  amount: number;
  customerName: string;
  ticketName: string;
  agentName: string;
  createdAt: string;
};

type ExposureSummary = {
  itemCount: number;
  ticketCount: number;
  total: number;
};

type AgentSummary = ExposureSummary & {
  agentId: string;
  agentName: string;
};

type CustomerSummary = ExposureSummary & {
  customerId: string;
  customerName: string;
};

type AlertItem = {
  tone: "danger" | "warning";
  title: string;
  detail: string;
};

type RealtimeMonitorClientProps = {
  draws: DrawOption[];
  selectedDrawId: string;
  selectedDraw: SelectedDraw;
  updatedAt: string;
  minutesToClose: number;
  totalActiveStake: number;
  ticketCount: number;
  customerCount: number;
  agentCount: number;
  redCount: number;
  redTypeCount: number;
  redTotalStake: number;
  redTotalOver: number;
  alertItems: AlertItem[];
  agentSummaries: AgentSummary[];
  customerSummaries: CustomerSummary[];
  summaryByType: RedSummary[];
  overLimit: RedItem[];
  nearLimit: NearLimitItem[];
  recentRows: RecentRow[];
};

function formatDateTimeValue(value: string) {
  const date = new Date(value);
  return `${date.toLocaleDateString("sv-SE")} ${date.toLocaleTimeString("en-GB")}`;
}

function formatMinutes(minutes: number) {
  if (minutes <= 0) {
    return "ปิดรับแล้ว";
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) {
    return `${remainingMinutes} นาที`;
  }

  return `${hours} ชม. ${remainingMinutes} นาที`;
}

export function RealtimeMonitorClient({
  draws,
  selectedDrawId,
  selectedDraw,
  updatedAt,
  minutesToClose,
  totalActiveStake,
  ticketCount,
  customerCount,
  agentCount,
  redCount,
  redTypeCount,
  redTotalStake,
  redTotalOver,
  alertItems,
  agentSummaries,
  customerSummaries,
  summaryByType,
  overLimit,
  nearLimit,
  recentRows,
}: RealtimeMonitorClientProps) {
  const router = useRouter();
  const [refreshIn, setRefreshIn] = useState(30);
  const refreshInRef = useRef(30);
  const refreshRoute = useEffectEvent(() => {
    startTransition(() => {
      router.refresh();
    });
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      const nextRefreshIn = refreshInRef.current - 1;

      if (nextRefreshIn <= 0) {
        refreshInRef.current = 30;
        setRefreshIn(30);
        refreshRoute();
        return;
      }

      refreshInRef.current = nextRefreshIn;
      setRefreshIn(nextRefreshIn);
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  const hottestItem = overLimit[0] ?? null;
  const drawName = draws.find((draw) => draw.id === selectedDrawId)?.name ?? "-";
  const refreshLabel = useMemo(() => formatDateTimeValue(updatedAt), [updatedAt]);
  const closeAtLabel = useMemo(() => formatDateTimeValue(selectedDraw.closeAt), [selectedDraw.closeAt]);

  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h1 className="legacy-title">ศูนย์เฝ้าระวังเรียลไทม์</h1>
            <p className="legacy-subtitle">ภาพรวมตัวแดง, ตัวใกล้แดง และรายการเคลื่อนไหวล่าสุดของงวดที่เลือก</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-[#dbe7f3] bg-white px-4 py-2 text-sm text-[#52637a] shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <div className="font-medium text-[#0f172a]">{drawName}</div>
              <div>อัปเดตล่าสุด {refreshLabel}</div>
            </div>

            <div className="rounded-2xl border border-[#dbe7f3] bg-[#f8fbff] px-4 py-2 text-sm text-[#0f172a] shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <div className="inline-flex items-center gap-2 font-medium">
                <RefreshCcw className="size-4" />
                รีเฟรชอีก {refreshIn} วินาที
              </div>
            </div>

            <select
              className="legacy-form-control min-w-[280px]"
              value={selectedDrawId}
              onChange={(event) => {
                router.push(`/dashboard/realtime?drawId=${event.target.value}`);
              }}
            >
              {draws.map((draw) => (
                <option key={draw.id} value={draw.id}>
                  {draw.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="panel-body space-y-6">
          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[26px] border border-[#c7d2fe] bg-[linear-gradient(135deg,#eef2ff_0%,#f8fbff_52%,#ecfeff_100%)] p-5 shadow-[0_18px_44px_rgba(30,64,175,0.08)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-[#1d4ed8]">งวดที่กำลังเฝ้า</div>
                  <div className="mt-1 text-2xl font-semibold text-[#0f172a]">{drawName}</div>
                  <div className="mt-2 text-sm text-[#475569]">ปิดรับ {closeAtLabel}</div>
                </div>
                <div className={minutesToClose <= 30 ? "rounded-2xl bg-[#fee2e2] px-4 py-3 text-[#991b1b]" : "rounded-2xl bg-white/80 px-4 py-3 text-[#0f172a]"}>
                  <div className="text-xs opacity-75">เหลือเวลา</div>
                  <div className="text-xl font-semibold">{formatMinutes(minutesToClose)}</div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-4">
                <div className="rounded-2xl bg-white/80 p-3">
                  <div className="text-xs text-[#64748b]">ยอดรับคงเหลือ</div>
                  <div className="mt-1 text-lg font-semibold text-[#0f172a]">{formatCurrency(totalActiveStake)}</div>
                </div>
                <div className="rounded-2xl bg-white/80 p-3">
                  <div className="text-xs text-[#64748b]">โพย</div>
                  <div className="mt-1 text-lg font-semibold text-[#0f172a]">{ticketCount}</div>
                </div>
                <div className="rounded-2xl bg-white/80 p-3">
                  <div className="text-xs text-[#64748b]">ลูกค้า</div>
                  <div className="mt-1 text-lg font-semibold text-[#0f172a]">{customerCount}</div>
                </div>
                <div className="rounded-2xl bg-white/80 p-3">
                  <div className="text-xs text-[#64748b]">พนักงาน</div>
                  <div className="mt-1 text-lg font-semibold text-[#0f172a]">{agentCount}</div>
                </div>
              </div>
            </div>

            <div className="rounded-[26px] border border-[#fed7aa] bg-[#fff7ed] p-5 shadow-[0_18px_44px_rgba(234,88,12,0.08)]">
              <div className="mb-3 flex items-center gap-2 text-[#9a3412]">
                <AlertTriangle className="size-5" />
                <h2 className="text-lg font-semibold">สิ่งที่ควรรีบดู</h2>
              </div>
              <div className="space-y-2">
                {alertItems.map((item) => (
                  <div key={`${item.title}-${item.detail}`} className={item.tone === "danger" ? "rounded-2xl bg-[#fee2e2] p-3 text-[#7f1d1d]" : "rounded-2xl bg-white/80 p-3 text-[#92400e]"}>
                    <div className="font-semibold">{item.title}</div>
                    <div className="text-sm opacity-80">{item.detail}</div>
                  </div>
                ))}
                {alertItems.length === 0 ? (
                  <div className="rounded-2xl bg-white/80 p-3 text-sm text-[#166534]">ยังไม่มีสัญญาณเร่งด่วนในงวดนี้</div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[22px] border border-[#ffd9d6] bg-[linear-gradient(180deg,#fff7f7_0%,#fff1f1_100%)] p-5 shadow-[0_18px_40px_rgba(220,38,38,0.08)]">
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#fee2e2] text-[#dc2626]">
                <AlertTriangle className="size-5" />
              </div>
              <div className="text-sm text-[#7f1d1d]">ตัวแดงทั้งหมด</div>
              <div className="mt-1 text-[34px] font-semibold leading-none text-[#991b1b]">{redCount}</div>
            </div>

            <div className="rounded-[22px] border border-[#ffe1bf] bg-[linear-gradient(180deg,#fffaf1_0%,#fff5e6_100%)] p-5 shadow-[0_18px_40px_rgba(217,119,6,0.08)]">
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ffedd5] text-[#d97706]">
                <Flame className="size-5" />
              </div>
              <div className="text-sm text-[#92400e]">ประเภทร้อนตอนนี้</div>
              <div className="mt-1 text-[26px] font-semibold leading-none text-[#7c2d12]">{redTypeCount}</div>
              <div className="mt-2 text-sm text-[#b45309]">ประเภทที่มีตัวแดงอยู่ตอนนี้</div>
            </div>

            <div className="rounded-[22px] border border-[#dbeafe] bg-[linear-gradient(180deg,#f8fbff_0%,#eef6ff_100%)] p-5 shadow-[0_18px_40px_rgba(21,94,239,0.08)]">
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#dbeafe] text-[#155eef]">
                <Activity className="size-5" />
              </div>
              <div className="text-sm text-[#1d4ed8]">ยอดแทงในตัวแดง</div>
              <div className="mt-1 text-[30px] font-semibold leading-none text-[#1e3a8a]">{formatCurrency(redTotalStake)}</div>
            </div>

            <div className="rounded-[22px] border border-[#ddd6fe] bg-[linear-gradient(180deg,#faf8ff_0%,#f3f0ff_100%)] p-5 shadow-[0_18px_40px_rgba(99,102,241,0.08)]">
              <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ede9fe] text-[#7c3aed]">
                <Clock3 className="size-5" />
              </div>
              <div className="text-sm text-[#6d28d9]">ยอดที่เกินรวม</div>
              <div className="mt-1 text-[30px] font-semibold leading-none text-[#4c1d95]">{formatCurrency(redTotalOver)}</div>
              {hottestItem ? <div className="mt-2 text-sm text-[#7c3aed]">หนักสุด {hottestItem.label} {hottestItem.number}</div> : null}
            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <section className="rounded-[22px] border border-[#e5edf5] bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
              <div className="mb-4 flex items-center gap-2">
                <Users className="size-5 text-[#155eef]" />
                <h2 className="text-lg font-semibold text-[#0f172a]">พนักงานที่ยอดเข้าเยอะสุด</h2>
              </div>
              <div className="space-y-3">
                {agentSummaries.map((item, index) => (
                  <div key={item.agentId} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-[#f8fbff] p-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-[#dbeafe] text-sm font-semibold text-[#1d4ed8]">{index + 1}</div>
                    <div>
                      <div className="font-medium text-[#0f172a]">{item.agentName}</div>
                      <div className="text-xs text-[#64748b]">{item.ticketCount} โพย | {item.itemCount} รายการ</div>
                    </div>
                    <div className="font-semibold text-[#0f172a]">{formatCurrency(item.total)}</div>
                  </div>
                ))}
                {agentSummaries.length === 0 ? <div className="text-sm text-muted-foreground">ยังไม่มีรายการจากพนักงาน</div> : null}
              </div>
            </section>

            <section className="rounded-[22px] border border-[#e5edf5] bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
              <div className="mb-4 flex items-center gap-2">
                <Ticket className="size-5 text-[#16a34a]" />
                <h2 className="text-lg font-semibold text-[#0f172a]">ลูกค้าที่มียอดสูงสุด</h2>
              </div>
              <div className="space-y-3">
                {customerSummaries.map((item, index) => (
                  <div key={item.customerId} className="grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl bg-[#f8fff9] p-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-[#dcfce7] text-sm font-semibold text-[#15803d]">{index + 1}</div>
                    <div>
                      <div className="font-medium text-[#0f172a]">{item.customerName}</div>
                      <div className="text-xs text-[#64748b]">{item.ticketCount} โพย | {item.itemCount} รายการ</div>
                    </div>
                    <div className="font-semibold text-[#0f172a]">{formatCurrency(item.total)}</div>
                  </div>
                ))}
                {customerSummaries.length === 0 ? <div className="text-sm text-muted-foreground">ยังไม่มีรายการจากลูกค้า</div> : null}
              </div>
            </section>
          </div>

          <div className="grid gap-4 xl:grid-cols-3">
            {summaryByType.map((item) => (
              <div key={item.betType} className="rounded-[22px] border border-[#e5edf5] bg-white p-5 shadow-[0_14px_36px_rgba(15,23,42,0.06)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm text-[#64748b]">{item.label}</div>
                    <div className="mt-1 text-[28px] font-semibold leading-none text-[#0f172a]">{item.count}</div>
                    <div className="mt-2 text-sm text-[#64748b]">ตัวแดงในประเภทนี้</div>
                  </div>
                  <Link className="legacy-btn-default" href={item.hottestNumber ? overLimit.find((row) => row.betType === item.betType && row.number === item.hottestNumber)?.monitorHref ?? "/dashboard/monitor" : "/dashboard/monitor"}>
                    เปิดดู
                  </Link>
                </div>

                <div className="mt-5 grid gap-3 text-sm md:grid-cols-3">
                  <div className="rounded-2xl bg-[#f8fbff] p-3">
                    <div className="text-[#64748b]">ยอดแทง</div>
                    <div className="mt-1 font-semibold text-[#0f172a]">{formatCurrency(item.total)}</div>
                  </div>
                  <div className="rounded-2xl bg-[#fff7f7] p-3">
                    <div className="text-[#7f1d1d]">เกินรวม</div>
                    <div className="mt-1 font-semibold text-[#b91c1c]">{formatCurrency(item.totalOver)}</div>
                  </div>
                  <div className="rounded-2xl bg-[#fffaf1] p-3">
                    <div className="text-[#92400e]">หนักสุด</div>
                    <div className="mt-1 font-semibold text-[#7c2d12]">{formatCurrency(item.maxOver)}</div>
                  </div>
                </div>

                <div className="mt-4 text-sm text-[#64748b]">เลขร้อนสุด: <span className="font-semibold text-[#0f172a]">{item.hottestNumber || "-"}</span></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2 className="text-lg font-semibold text-[#0f172a]">รายการตัวแดงทั้งหมด</h2>
              <p className="text-sm text-[#64748b]">ดูเลขที่เกินลิมิตจริง พร้อมสัดส่วนการใช้งานและลิงก์เปิด monitor</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>ประเภท</th>
                    <th>เลข</th>
                    <th>ยอดแทง</th>
                    <th>ลิมิต</th>
                    <th>เกิน</th>
                    <th>% ใช้งาน</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {overLimit.map((item) => (
                    <tr key={`${item.betType}-${item.number}`}>
                      <td>{item.label}</td>
                      <td className="font-mono text-base font-semibold text-[#0f172a]">{item.number}</td>
                      <td>{formatCurrency(item.total)}</td>
                      <td>{formatCurrency(item.limit)}</td>
                      <td className="font-semibold text-[#b91c1c]">{formatCurrency(item.overBy)}</td>
                      <td>{item.usagePercent.toFixed(1)}%</td>
                      <td className="text-right">
                        <Link className="legacy-btn-info" href={item.monitorHref}>
                          ดูใน monitor
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {overLimit.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center text-muted-foreground">ตอนนี้ยังไม่มีตัวแดง</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">ตัวใกล้แดง</h2>
                <p className="text-sm text-[#64748b]">เลขที่ใช้ลิมิตเกิน 80% แต่ยังไม่แดง</p>
              </div>
            </div>
            <div className="panel-body">
              <div className="space-y-3">
                {nearLimit.map((item) => (
                  <Link
                    key={`${item.betType}-${item.number}`}
                    href={item.monitorHref}
                    className="block rounded-2xl border border-[#e6edf5] bg-[#fbfdff] p-4 no-underline transition hover:-translate-y-px hover:bg-white hover:no-underline"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-[#64748b]">{item.label}</div>
                        <div className="mt-1 font-mono text-lg font-semibold text-[#0f172a]">{item.number}</div>
                      </div>
                      <div className="rounded-full bg-[#fff7ed] px-3 py-1 text-sm font-semibold text-[#c2410c]">
                        {item.usagePercent.toFixed(1)}%
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-[#64748b]">
                      {formatCurrency(item.total)} / {formatCurrency(item.limit)}
                    </div>
                  </Link>
                ))}
                {nearLimit.length === 0 ? <div className="text-sm text-muted-foreground">ยังไม่มีเลขที่ใกล้แดง</div> : null}
              </div>
            </div>
          </section>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2 className="text-lg font-semibold text-[#0f172a]">ความเคลื่อนไหวล่าสุด</h2>
                <p className="text-sm text-[#64748b]">รายการแทงล่าสุดที่ยังคงมียอดอยู่ในระบบ</p>
              </div>
            </div>
            <div className="panel-body">
              <div className="space-y-3">
                {recentRows.map((row) => (
                  <div key={row.id} className="rounded-2xl border border-[#e6edf5] bg-white p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm text-[#64748b]">{row.label}</div>
                        <div className="mt-1 font-mono text-base font-semibold text-[#0f172a]">{row.number}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-semibold text-[#0f172a]">{formatCurrency(row.amount)}</div>
                        <div className="text-xs text-[#64748b]">{formatDateTimeValue(row.createdAt)}</div>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-[#475569]">
                      <Link className="mr-2 text-primary underline" href={`/dashboard/tickets/${row.ticketId}`}>
                        เปิดโพย
                      </Link>
                      {row.customerName} • {row.ticketName} • {row.agentName}
                    </div>
                  </div>
                ))}
                {recentRows.length === 0 ? <div className="text-sm text-muted-foreground">ยังไม่มีรายการล่าสุด</div> : null}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
