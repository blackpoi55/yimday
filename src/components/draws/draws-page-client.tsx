"use client";

import { useMemo, useState } from "react";
import { DrawStatus } from "@prisma/client";
import { Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormSubmit } from "@/components/ui/form-submit";
import { Input } from "@/components/ui/input";
import { LegacyModal } from "@/components/ui/legacy-modal";
import { Textarea } from "@/components/ui/textarea";
import { showErrorAlert, showSuccessAlert } from "@/lib/client-alerts";
import { createDrawAction, saveDrawResultAction, updateDrawAction } from "@/lib/actions/draws";

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
    top3?: string | null;
    top2?: string | null;
    bottom3?: string | null;
    bottom2?: string | null;
    front3?: string | null;
    back3?: string | null;
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
  hasOpenDraw: boolean;
};

function normalizeDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function DrawsPageClient({ draws, defaults, hasOpenDraw }: DrawsPageClientProps) {
  const [modal, setModal] = useState<
    null | { type: "create" } | { type: "close"; draw: DrawRow } | { type: "edit"; draw: DrawRow }
  >(null);
  const [top3, setTop3] = useState("");
  const [bottom3, setBottom3] = useState("");
  const [bottom2, setBottom2] = useState("");
  const [front3, setFront3] = useState("");
  const [back3, setBack3] = useState("");
  const [resultNotes, setResultNotes] = useState("");

  const top2 = useMemo(() => {
    if (top3.length === 3) {
      return top3.slice(-2);
    }
    return "";
  }, [top3]);

  function openCloseModal(draw: DrawRow) {
    setTop3(draw.result?.top3 ?? "");
    setBottom3(draw.result?.bottom3 ?? "");
    setBottom2(draw.result?.bottom2 ?? "");
    setFront3(draw.result?.front3 ?? "");
    setBack3(draw.result?.back3 ?? "");
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

    return (
      <button
        className={draw.status === DrawStatus.RESULTED ? "legacy-btn-info legacy-status-btn" : "legacy-btn-danger legacy-status-btn"}
        type="button"
      >
        {draw.status === DrawStatus.RESULTED ? "ออกผลแล้ว" : "ปิดรับโพย"}
      </button>
    );
  }

  return (
    <div className="legacy-container">
      <div className="mb-6 flex items-center justify-end gap-3">
        <button className="legacy-btn-warning" type="button">
          ล้างข้อมูล
        </button>
        {!hasOpenDraw ? (
          <button className="legacy-btn-success" onClick={() => setModal({ type: "create" })} type="button">
            เปิดงวดรับโพย
          </button>
        ) : null}
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
        size="md"
      >
        {modal?.type === "close" ? (
          <form
            action={async (formData) => {
              await runActionWithAlert(formData, saveDrawResultAction, "บันทึกผลรางวัลเรียบร้อย", () => setModal(null));
            }}
            className="space-y-4"
          >
            <input name="drawId" type="hidden" value={modal.draw.id} />
            <input name="top2" type="hidden" value={top2} />

            <div className="legacy-close-modal-grid">
              <div>
                <label className="legacy-form-label" htmlFor={`top3-${modal.draw.id}`}>
                  3 ตัวบน
                </label>
                <Input
                  id={`top3-${modal.draw.id}`}
                  maxLength={3}
                  name="top3"
                  required
                  value={top3}
                  onChange={(event) => setTop3(normalizeDigits(event.target.value, 3))}
                />
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
                  required
                  value={bottom2}
                  onChange={(event) => setBottom2(normalizeDigits(event.target.value, 2))}
                />
              </div>
            </div>

            <div className="legacy-modal-grid legacy-modal-grid-2">
              <div>
                <label className="legacy-form-label" htmlFor={`front3-${modal.draw.id}`}>
                  3 ตัวหน้า
                </label>
                <Input
                  id={`front3-${modal.draw.id}`}
                  maxLength={3}
                  name="front3"
                  value={front3}
                  onChange={(event) => setFront3(normalizeDigits(event.target.value, 3))}
                />
              </div>
              <div>
                <label className="legacy-form-label" htmlFor={`back3-${modal.draw.id}`}>
                  3 ตัวท้าย
                </label>
                <Input
                  id={`back3-${modal.draw.id}`}
                  maxLength={3}
                  name="back3"
                  value={back3}
                  onChange={(event) => setBack3(normalizeDigits(event.target.value, 3))}
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
