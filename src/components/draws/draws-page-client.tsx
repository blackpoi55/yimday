"use client";

import { useMemo, useState } from "react";
import { DrawStatus } from "@prisma/client";
import { Check, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSubmit } from "@/components/ui/form-submit";
import { Input } from "@/components/ui/input";
import { LegacyModal } from "@/components/ui/legacy-modal";
import { Textarea } from "@/components/ui/textarea";
import { showConfirmAlert, showErrorAlert, showSuccessAlert } from "@/lib/client-alerts";
import { clearOldDrawAction, createDrawAction, deleteDrawAction, removeDrawAction, saveDrawResultAction, updateDrawAction } from "@/lib/actions/draws";

type DrawRow = {
  id: string;
  name: string;
  drawDate: string;
  openDate: string;
  openTime: string;
  closeDate: string;
  closeTime: string;
  status: DrawStatus;
  notes?: string | null;
  result?: {
    firstPrize?: string | null;
    firstPrizeAdjacent?: string | null;
    secondPrize?: string | null;
    thirdPrize?: string | null;
    fourthPrize?: string | null;
    fifthPrize?: string | null;
    top3?: string | null;
    top2?: string | null;
    bottom3?: string | null;
    bottom2?: string | null;
    front3?: string | null;
    front3Second?: string | null;
    back3?: string | null;
    back3Second?: string | null;
    notes?: string | null;
  } | null;
};

type DrawsPageClientProps = {
  draws: DrawRow[];
  defaults: {
    name: string;
    openDate: string;
    openTime: string;
    closeDate: string;
    closeTime: string;
    drawDate: string;
  };
};

function normalizeDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function DrawsPageClient({ draws, defaults }: DrawsPageClientProps) {
  const [modal, setModal] = useState<
    null | { type: "create" } | { type: "close"; draw: DrawRow } | { type: "edit"; draw: DrawRow }
  >(null);
  const [firstPrize, setFirstPrize] = useState("");
  const [firstPrizeAdjacent, setFirstPrizeAdjacent] = useState("");
  const [secondPrize, setSecondPrize] = useState("");
  const [thirdPrize, setThirdPrize] = useState("");
  const [fourthPrize, setFourthPrize] = useState("");
  const [fifthPrize, setFifthPrize] = useState("");
  const [bottom3, setBottom3] = useState("");
  const [bottom2, setBottom2] = useState("");
  const [front3, setFront3] = useState("");
  const [front3Second, setFront3Second] = useState("");
  const [back3, setBack3] = useState("");
  const [back3Second, setBack3Second] = useState("");
  const [resultNotes, setResultNotes] = useState("");

  const top3 = useMemo(() => {
    if (firstPrize.length === 6) {
      return firstPrize.slice(-3);
    }
    return "";
  }, [firstPrize]);

  const top2 = useMemo(() => {
    if (firstPrize.length === 6) {
      return firstPrize.slice(-2);
    }
    return "";
  }, [firstPrize]);
  const latestDraw = draws[0] ?? null;
  const oldDraw = draws.length > 1 ? draws[draws.length - 1] : null;
  const canCreateDraw = draws.length <= 1;

  function openCloseModal(draw: DrawRow) {
    setFirstPrize(draw.result?.firstPrize ?? "");
    setFirstPrizeAdjacent(draw.result?.firstPrizeAdjacent ?? "");
    setSecondPrize(draw.result?.secondPrize ?? "");
    setThirdPrize(draw.result?.thirdPrize ?? "");
    setFourthPrize(draw.result?.fourthPrize ?? "");
    setFifthPrize(draw.result?.fifthPrize ?? "");
    setBottom3(draw.result?.bottom3 ?? "");
    setBottom2(draw.result?.bottom2 ?? "");
    setFront3(draw.result?.front3 ?? "");
    setFront3Second(draw.result?.front3Second ?? "");
    setBack3(draw.result?.back3 ?? "");
    setBack3Second(draw.result?.back3Second ?? "");
    setResultNotes(draw.result?.notes ?? "");
    setModal({ type: "close", draw });
  }

  async function runActionWithAlert(
    formData: FormData,
    action: (formData: FormData) => Promise<void>,
    successMessage: string,
    onSuccess?: () => void,
  ) {
    try {
      await action(formData);
      await showSuccessAlert(successMessage);
      onSuccess?.();
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลได้");
    }
  }

  function getStatusCell(draw: DrawRow) {
    if (draw.status === DrawStatus.OPEN) {
      return (
        <button className="legacy-btn-success legacy-status-btn" onClick={() => openCloseModal(draw)} type="button">
          <Check className="size-14px" />
          เปิดรับโพย
        </button>
      );
    }

    const statusLabel =
      draw.status === DrawStatus.RESULTED ? "ออกผลแล้ว" : draw.status === DrawStatus.UPCOMING ? "รอเปิดรับโพย" : "ปิดรับโพย";
    const statusClass =
      draw.status === DrawStatus.RESULTED
        ? "legacy-btn-info legacy-status-btn"
        : draw.status === DrawStatus.UPCOMING
          ? "legacy-btn-default legacy-status-btn"
          : "legacy-btn-danger legacy-status-btn";

    return (
      <button className={statusClass} type="button">
        {statusLabel}
      </button>
    );
  }

  async function handleClearOldDraw() {
    if (!oldDraw) {
      return;
    }

    const confirmed = window.confirm(`ต้องการล้างงวดเก่า "${oldDraw.name}" และเก็บงวดล่าสุดไว้ใช่หรือไม่`);
    if (!confirmed) {
      return;
    }

    const formData = new FormData();
    formData.set("drawId", oldDraw.id);

    await runActionWithAlert(formData, clearOldDrawAction, `ล้างงวด ${oldDraw.name} เรียบร้อย`);
  }

  async function handleDeleteDraw(draw: DrawRow) {
    const confirmed = window.confirm(`เธ•เนเธญเธเธเธฒเธฃเธฅเธเธเธงเธ” "${draw.name}" เนเธเนเธซเธฃเธทเธญเนเธกเน`);
    if (!confirmed) {
      return;
    }

    const formData = new FormData();
    formData.set("drawId", draw.id);

    await runActionWithAlert(formData, deleteDrawAction, `เธฅเธเธเธงเธ” ${draw.name} เน€เธฃเธตเธขเธเธฃเนเธญเธข`);
  }

  async function confirmClearOldDraw() {
    if (!oldDraw) {
      return;
    }

    const result = await showConfirmAlert(
      "ยืนยันการล้างงวดเก่า",
      `ต้องการล้างงวด "${oldDraw.name}" และเก็บงวดล่าสุดไว้ใช่หรือไม่`,
      "ล้างงวด",
    );
    if (!result.isConfirmed) {
      return;
    }

    const formData = new FormData();
    formData.set("drawId", oldDraw.id);

    await runActionWithAlert(formData, clearOldDrawAction, `ล้างงวด ${oldDraw.name} เรียบร้อย`);
  }

  async function confirmDeleteDraw(draw: DrawRow) {
    const result = await showConfirmAlert(
      "ยืนยันการลบงวด",
      `ต้องการลบงวด "${draw.name}" ใช่หรือไม่`,
      "ลบงวด",
    );
    if (!result.isConfirmed) {
      return;
    }

    const formData = new FormData();
    formData.set("drawId", draw.id);

    await runActionWithAlert(formData, removeDrawAction, `ลบงวด ${draw.name} เรียบร้อย`);
  }

  void handleClearOldDraw;
  void handleDeleteDraw;

  return (
    <div className="legacy-container">
      <div className="mb-6 flex flex-col gap-4 rounded-[24px] border border-[#d7e2ee] bg-[linear-gradient(180deg,#ffffff_0%,#f8fbff_100%)] p-4 shadow-[0_18px_40px_rgba(15,23,42,0.06)] lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1">
          <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#5b6b83]">จัดการงวด</div>
          <div className="text-sm text-[#334155]">
            {draws.length > 1
              ? `ต้องล้างงวดเก่า "${oldDraw?.name ?? "-"}" ออกก่อน โดยเก็บงวดล่าสุด "${latestDraw?.name ?? "-"}" ไว้ แล้วจึงเพิ่มงวดถัดไปได้`
              : latestDraw
                ? `ตอนนี้เก็บงวดล่าสุด "${latestDraw.name}" ไว้แล้ว สามารถเปิดงวดถัดไปได้`
                : "ยังไม่มีงวดค้างอยู่ สามารถเปิดงวดถัดไปได้ทันที"}
          </div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[14px] border border-[#f1c27d] bg-[linear-gradient(135deg,#fbbf24_0%,#f59e0b_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(245,158,11,0.24)] transition-[transform,box-shadow,filter] duration-200 hover:-translate-y-px hover:brightness-[1.03] disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:translate-y-0"
            disabled={!oldDraw}
            onClick={confirmClearOldDraw}
            type="button"
          >
            <Trash2 className="size-4" />
            ล้างงวดเก่า
          </button>
          <button
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[14px] border border-[#16a34a] bg-[linear-gradient(135deg,#22c55e_0%,#16a34a_100%)] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(34,197,94,0.24)] transition-[transform,box-shadow,filter] duration-200 hover:-translate-y-px hover:brightness-[1.03] disabled:cursor-not-allowed disabled:border-[#cbd5e1] disabled:bg-[#e2e8f0] disabled:text-[#64748b] disabled:shadow-none disabled:hover:translate-y-0"
            disabled={!canCreateDraw}
            onClick={() => setModal({ type: "create" })}
            type="button"
          >
            <Plus className="size-4" />
            เปิดงวดรับโพย
          </button>
        </div>
      </div>

      <h4 className="mb-8 text-[30px] font-medium text-[#333]">ข้อมูลงวดการเปิดรับโพย</h4>

      <div className="table-shell overflow-visible rounded-none border-0 bg-transparent">
        <table className="legacy-period-table">
          <thead>
            <tr>
              <th>งวดประจำวันที่</th>
              <th>วันที่เปิดรับโพย</th>
              <th>เวลาที่เปิดรับโพย</th>
              <th>วันที่ปิดรับโพย</th>
              <th>เวลาที่ปิดรับโพย</th>
              <th>สถานะ</th>
              <th>แก้ไข</th>
              <th>ลบ</th>
            </tr>
          </thead>
          <tbody>
            {draws.map((draw) => (
              <tr key={draw.id}>
                <td>{draw.name}</td>
                <td>{draw.openDate}</td>
                <td>{draw.openTime}</td>
                <td>{draw.closeDate}</td>
                <td>{draw.closeTime}</td>
                <td>{getStatusCell(draw)}</td>
                <td className="text-center">
                  <button className="legacy-btn-info legacy-icon-btn" onClick={() => setModal({ type: "edit", draw })} type="button">
                    <Pencil className="size-14px" />
                  </button>
                </td>
                <td className="text-center">
                  <button className="legacy-btn-danger legacy-icon-btn" onClick={() => void confirmDeleteDraw(draw)} type="button">
                    <Trash2 className="size-14px" />
                  </button>
                </td>
              </tr>
            ))}
            {draws.length === 0 ? (
              <tr>
                <td colSpan={7}>ยังไม่มีงวด</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <LegacyModal open={modal?.type === "create"} onClose={() => setModal(null)} title="เปิดงวดรับโพย" size="md">
        <form
          action={async (formData) => {
            await runActionWithAlert(formData, createDrawAction, "เปิดงวดเรียบร้อย", () => setModal(null));
          }}
          className="space-y-4"
        >
          <div>
            <label className="legacy-form-label" htmlFor="name">
              เปิดงวดรับโพย
            </label>
            <Input defaultValue={defaults.name} id="name" name="name" required />
          </div>

          <div className="legacy-period-modal-grid">
            <div>
              <label className="legacy-form-label" htmlFor="openDate">
                วันที่เปิดรับโพย (m-d-y)
              </label>
              <Input defaultValue={defaults.openDate} id="openDate" name="openDate" required type="date" />
            </div>
            <div>
              <label className="legacy-form-label" htmlFor="openTime">
                เวลาเปิดรับโพย
              </label>
              <Input defaultValue={defaults.openTime} id="openTime" name="openTime" required step="1" type="time" />
            </div>
            <div>
              <label className="legacy-form-label" htmlFor="closeDate">
                วันที่ปิดรับโพย (m-d-y)
              </label>
              <Input defaultValue={defaults.closeDate} id="closeDate" name="closeDate" required type="date" />
            </div>
            <div>
              <label className="legacy-form-label" htmlFor="closeTime">
                เวลาปิดรับโพย
              </label>
              <Input defaultValue={defaults.closeTime} id="closeTime" name="closeTime" required step="1" type="time" />
            </div>
          </div>

          <input name="drawDate" type="hidden" value={defaults.drawDate} />
          <input name="notes" type="hidden" value="" />

          <div className="legacy-modal-actions">
            <Button onClick={() => setModal(null)} variant="outline">
              ยกเลิก
            </Button>
            <FormSubmit idleLabel="บันทึก" pendingLabel="กำลังบันทึก..." />
          </div>
        </form>
      </LegacyModal>

      <LegacyModal
        open={modal?.type === "close"}
        onClose={() => setModal(null)}
        title={modal?.type === "close" ? `ปิดงวดประจำวันที่ ${modal.draw.name}` : ""}
        size="lg"
      >
        {modal?.type === "close" ? (
          <form
            action={async (formData) => {
              await runActionWithAlert(formData, saveDrawResultAction, "บันทึกผลรางวัลเรียบร้อย", () => setModal(null));
            }}
            className="space-y-4"
          >
            <input name="drawId" type="hidden" value={modal.draw.id} />
            <input name="top3" type="hidden" value={top3} />
            <input name="top2" type="hidden" value={top2} />

            <div className="legacy-close-modal-grid">
              <div>
                <label className="legacy-form-label" htmlFor={`first-prize-${modal.draw.id}`}>
                  รางวัลที่ 1
                </label>
                <Input
                  id={`first-prize-${modal.draw.id}`}
                  maxLength={6}
                  name="firstPrize"
                  placeholder="123456"
                  required
                  value={firstPrize}
                  onChange={(event) => setFirstPrize(normalizeDigits(event.target.value, 6))}
                />
              </div>
              <div>
                <label className="legacy-form-label" htmlFor={`top3-${modal.draw.id}`}>
                  3 ตัวบน
                </label>
                <Input id={`top3-${modal.draw.id}`} maxLength={3} readOnly value={top3} />
              </div>
              <div>
                <label className="legacy-form-label" htmlFor={`top2-${modal.draw.id}`}>
                  2 ตัวบน
                </label>
                <Input id={`top2-${modal.draw.id}`} maxLength={2} readOnly value={top2} />
              </div>
              <div>
                <label className="legacy-form-label" htmlFor={`bottom3-${modal.draw.id}`}>
                  3 ตัวล่าง
                </label>
                <Input
                  id={`bottom3-${modal.draw.id}`}
                  maxLength={3}
                  name="bottom3"
                  placeholder="678"
                  value={bottom3}
                  onChange={(event) => setBottom3(normalizeDigits(event.target.value, 3))}
                />
              </div>
              <div>
                <label className="legacy-form-label" htmlFor={`bottom2-${modal.draw.id}`}>
                  2 ตัวล่าง
                </label>
                <Input
                  id={`bottom2-${modal.draw.id}`}
                  maxLength={2}
                  name="bottom2"
                  placeholder="45"
                  required
                  value={bottom2}
                  onChange={(event) => setBottom2(normalizeDigits(event.target.value, 2))}
                />
              </div>
            </div>

            <div className="rounded-[14px] border border-[#dbe6f3] bg-[#f8fbff] px-4 py-3 text-xs text-[#5b6b83]">
              กรอกหลักๆ แค่ รางวัลที่ 1, 2 ตัวล่าง, 3 ตัวหน้า 2 ชุด และ 3 ตัวท้าย 2 ชุด ระบบจะตัด 3 ตัวบน / 2 ตัวบน ให้เอง
            </div>

            <div className="legacy-modal-grid legacy-modal-grid-2">
              <div>
                <label className="legacy-form-label" htmlFor={`front3-${modal.draw.id}`}>
                  3 ตัวหน้า ชุดที่ 1
                </label>
                <Input
                  id={`front3-${modal.draw.id}`}
                  maxLength={3}
                  name="front3"
                  placeholder="123"
                  value={front3}
                  onChange={(event) => setFront3(normalizeDigits(event.target.value, 3))}
                />
              </div>
              <div>
                <label className="legacy-form-label" htmlFor={`front3-second-${modal.draw.id}`}>
                  3 ตัวหน้า ชุดที่ 2
                </label>
                <Input
                  id={`front3-second-${modal.draw.id}`}
                  maxLength={3}
                  name="front3Second"
                  placeholder="456"
                  value={front3Second}
                  onChange={(event) => setFront3Second(normalizeDigits(event.target.value, 3))}
                />
              </div>
            </div>

            <div className="legacy-modal-grid legacy-modal-grid-2">
              <div>
                <label className="legacy-form-label" htmlFor={`back3-${modal.draw.id}`}>
                  3 ตัวท้าย ชุดที่ 1
                </label>
                <Input
                  id={`back3-${modal.draw.id}`}
                  maxLength={3}
                  name="back3"
                  placeholder="789"
                  value={back3}
                  onChange={(event) => setBack3(normalizeDigits(event.target.value, 3))}
                />
              </div>
              <div>
                <label className="legacy-form-label" htmlFor={`back3-second-${modal.draw.id}`}>
                  3 ตัวท้าย ชุดที่ 2
                </label>
                <Input
                  id={`back3-second-${modal.draw.id}`}
                  maxLength={3}
                  name="back3Second"
                  placeholder="012"
                  value={back3Second}
                  onChange={(event) => setBack3Second(normalizeDigits(event.target.value, 3))}
                />
              </div>
            </div>

            <div className="rounded-[18px] border border-[#dbe6f3] bg-[#f8fbff] px-4 py-4">
              <div className="mb-3">
                <div className="text-sm font-semibold text-[#0f172a]">ผลรางวัลเต็ม</div>
                <div className="text-xs text-[#64748b]">กรอกหลายเลขโดยคั่นด้วยเว้นวรรค เครื่องหมายจุลภาค หรือขึ้นบรรทัดใหม่</div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="legacy-form-label" htmlFor={`first-prize-adjacent-${modal.draw.id}`}>
                    เลขข้างเคียงรางวัลที่ 1
                  </label>
                  <Textarea
                    id={`first-prize-adjacent-${modal.draw.id}`}
                    name="firstPrizeAdjacent"
                    placeholder={"123455 123457"}
                    rows={2}
                    value={firstPrizeAdjacent}
                    onChange={(event) => setFirstPrizeAdjacent(event.target.value)}
                  />
                </div>

                <div>
                  <label className="legacy-form-label" htmlFor={`second-prize-${modal.draw.id}`}>
                    รางวัลที่ 2
                  </label>
                  <Textarea
                    id={`second-prize-${modal.draw.id}`}
                    name="secondPrize"
                    placeholder={"234561 345672 456783 567894 678905"}
                    rows={3}
                    value={secondPrize}
                    onChange={(event) => setSecondPrize(event.target.value)}
                  />
                </div>

                <div>
                  <label className="legacy-form-label" htmlFor={`third-prize-${modal.draw.id}`}>
                    รางวัลที่ 3
                  </label>
                  <Textarea
                    id={`third-prize-${modal.draw.id}`}
                    name="thirdPrize"
                    placeholder={"111111 222222 333333 444444 555555"}
                    rows={4}
                    value={thirdPrize}
                    onChange={(event) => setThirdPrize(event.target.value)}
                  />
                </div>

                <div>
                  <label className="legacy-form-label" htmlFor={`fourth-prize-${modal.draw.id}`}>
                    รางวัลที่ 4
                  </label>
                  <Textarea
                    id={`fourth-prize-${modal.draw.id}`}
                    name="fourthPrize"
                    placeholder="กรอก 50 เลข 6 หลัก คั่นด้วย space หรือขึ้นบรรทัดใหม่"
                    rows={5}
                    value={fourthPrize}
                    onChange={(event) => setFourthPrize(event.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="legacy-form-label" htmlFor={`fifth-prize-${modal.draw.id}`}>
                  รางวัลที่ 5
                </label>
                <Textarea
                  id={`fifth-prize-${modal.draw.id}`}
                  name="fifthPrize"
                  placeholder="กรอก 100 เลข 6 หลัก คั่นด้วย space หรือขึ้นบรรทัดใหม่"
                  rows={6}
                  value={fifthPrize}
                  onChange={(event) => setFifthPrize(event.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="legacy-form-label" htmlFor={`result-notes-${modal.draw.id}`}>
                หมายเหตุ
              </label>
              <Textarea
                id={`result-notes-${modal.draw.id}`}
                name="notes"
                value={resultNotes}
                onChange={(event) => setResultNotes(event.target.value)}
              />
            </div>

            <div className="legacy-modal-actions">
              <FormSubmit idleLabel="บันทึก" pendingLabel="กำลังบันทึก..." />
            </div>
          </form>
        ) : null}
      </LegacyModal>

      <LegacyModal open={modal?.type === "edit"} onClose={() => setModal(null)} title="แก้ไขข้อมูลงวดการเปิดรับโพย" size="md">
        {modal?.type === "edit" ? (
          <form
            action={async (formData) => {
              await runActionWithAlert(formData, updateDrawAction, "แก้ไขงวดเรียบร้อย", () => setModal(null));
            }}
            className="space-y-4"
          >
            <input name="drawId" type="hidden" value={modal.draw.id} />
            <input name="drawDate" type="hidden" value={modal.draw.drawDate} />
            <input name="notes" type="hidden" value={modal.draw.notes ?? ""} />

            <div>
              <label className="legacy-form-label" htmlFor={`edit-name-${modal.draw.id}`}>
                งวดประจำวันที่
              </label>
              <Input defaultValue={modal.draw.name} id={`edit-name-${modal.draw.id}`} name="name" required />
            </div>

            <div className="legacy-period-modal-grid">
              <div>
                <label className="legacy-form-label" htmlFor={`edit-open-date-${modal.draw.id}`}>
                  วันที่เปิดรับโพย (m-d-y)
                </label>
                <Input defaultValue={modal.draw.openDate} id={`edit-open-date-${modal.draw.id}`} name="openDate" required type="date" />
              </div>
              <div>
                <label className="legacy-form-label" htmlFor={`edit-open-time-${modal.draw.id}`}>
                  เวลาเปิดรับโพย
                </label>
                <Input defaultValue={modal.draw.openTime} id={`edit-open-time-${modal.draw.id}`} name="openTime" required step="1" type="time" />
              </div>
              <div>
                <label className="legacy-form-label" htmlFor={`edit-close-date-${modal.draw.id}`}>
                  วันที่ปิดรับโพย (m-d-y)
                </label>
                <Input defaultValue={modal.draw.closeDate} id={`edit-close-date-${modal.draw.id}`} name="closeDate" required type="date" />
              </div>
              <div>
                <label className="legacy-form-label" htmlFor={`edit-close-time-${modal.draw.id}`}>
                  เวลาปิดรับโพย
                </label>
                <Input defaultValue={modal.draw.closeTime} id={`edit-close-time-${modal.draw.id}`} name="closeTime" required step="1" type="time" />
              </div>
            </div>

            <div className="legacy-modal-actions justify-start">
              <Button onClick={() => setModal(null)} variant="outline">
                ยกเลิก
              </Button>
              <FormSubmit idleLabel="บันทึก" pendingLabel="กำลังบันทึก..." />
            </div>
          </form>
        ) : null}
      </LegacyModal>
    </div>
  );
}
