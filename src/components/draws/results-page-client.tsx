"use client";

import { useMemo, useState } from "react";
import { Pencil } from "lucide-react";
import { Input } from "@/components/ui/input";
import { LegacyModal } from "@/components/ui/legacy-modal";
import { FormSubmit } from "@/components/ui/form-submit";
import { Textarea } from "@/components/ui/textarea";
import { showErrorAlert, showSuccessAlert } from "@/lib/client-alerts";
import { saveDrawResultAction } from "@/lib/actions/draws";

type ResultRow = {
  id: string;
  name: string;
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

type ResultsPageClientProps = {
  draws: ResultRow[];
};

function normalizeDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function ResultsPageClient({ draws }: ResultsPageClientProps) {
  const [activeDrawId, setActiveDrawId] = useState<string | null>(null);
  const activeDraw = draws.find((draw) => draw.id === activeDrawId) ?? null;
  const [top3, setTop3] = useState("");
  const [bottom3, setBottom3] = useState("");
  const [bottom2, setBottom2] = useState("");
  const [front3, setFront3] = useState("");
  const [back3, setBack3] = useState("");
  const [notes, setNotes] = useState("");

  const top2 = useMemo(() => {
    if (top3.length === 3) {
      return top3.slice(-2);
    }
    return "";
  }, [top3]);

  function openModal(draw: ResultRow) {
    setTop3(draw.result?.top3 ?? "");
    setBottom3(draw.result?.bottom3 ?? "");
    setBottom2(draw.result?.bottom2 ?? "");
    setFront3(draw.result?.front3 ?? "");
    setBack3(draw.result?.back3 ?? "");
    setNotes(draw.result?.notes ?? "");
    setActiveDrawId(draw.id);
  }

  async function handleSaveResult(formData: FormData) {
    try {
      await saveDrawResultAction(formData);
      await showSuccessAlert("บันทึกผลรางวัลเรียบร้อย");
      setActiveDrawId(null);
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "ไม่สามารถบันทึกผลรางวัลได้");
    }
  }

  return (
    <>
      <div className="table-shell overflow-visible rounded-none border-0 bg-transparent">
        <table className="legacy-period-table">
          <thead>
            <tr>
              <th>งวดประจำวันที่</th>
              <th>3 ตัวบน</th>
              <th>2 ตัวบน</th>
              <th>3 ตัวล่าง</th>
              <th>2 ตัวล่าง</th>
              <th className="w-[5%]">แก้ไข</th>
            </tr>
          </thead>
          <tbody>
            {draws.map((draw) => (
              <tr key={draw.id}>
                <td>{draw.name}</td>
                <td>{draw.result?.top3 ?? "-"}</td>
                <td>{draw.result?.top2 ?? draw.result?.top3?.slice(-2) ?? "-"}</td>
                <td>{draw.result?.bottom3 ?? "-"}</td>
                <td>{draw.result?.bottom2 ?? "-"}</td>
                <td className="text-center">
                  <button
                    className={draw.result ? "legacy-btn-info legacy-icon-btn" : "legacy-btn-success legacy-icon-btn"}
                    onClick={() => openModal(draw)}
                    type="button"
                  >
                    <Pencil className="size-14px" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <LegacyModal
        open={Boolean(activeDraw)}
        onClose={() => setActiveDrawId(null)}
        title={activeDraw ? `${activeDraw.result ? "แก้ไขงวดประจำวันที่" : "ปิดงวดประจำวันที่"} ${activeDraw.name}` : ""}
        size="md"
      >
        {activeDraw ? (
          <form action={handleSaveResult} className="space-y-4">
            <input name="drawId" type="hidden" value={activeDraw.id} />
            <input name="top2" type="hidden" value={top2} />

            <div className="legacy-close-modal-grid">
              <div>
                <label className="legacy-form-label" htmlFor={`top3-${activeDraw.id}`}>
                  3 ตัวบน
                </label>
                <Input
                  id={`top3-${activeDraw.id}`}
                  maxLength={3}
                  name="top3"
                  required
                  value={top3}
                  onChange={(event) => setTop3(normalizeDigits(event.target.value, 3))}
                />
              </div>
              <div>
                <label className="legacy-form-label" htmlFor={`top2-${activeDraw.id}`}>
                  2 ตัวบน
                </label>
                <Input id={`top2-${activeDraw.id}`} maxLength={2} readOnly value={top2} />
              </div>
              <div>
                <label className="legacy-form-label" htmlFor={`bottom3-${activeDraw.id}`}>
                  3 ตัวล่าง
                </label>
                <Input
                  id={`bottom3-${activeDraw.id}`}
                  maxLength={3}
                  name="bottom3"
                  value={bottom3}
                  onChange={(event) => setBottom3(normalizeDigits(event.target.value, 3))}
                />
              </div>
              <div>
                <label className="legacy-form-label" htmlFor={`bottom2-${activeDraw.id}`}>
                  2 ตัวล่าง
                </label>
                <Input
                  id={`bottom2-${activeDraw.id}`}
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
                <label className="legacy-form-label" htmlFor={`front3-${activeDraw.id}`}>
                  3 ตัวหน้า
                </label>
                <Input
                  id={`front3-${activeDraw.id}`}
                  maxLength={3}
                  name="front3"
                  value={front3}
                  onChange={(event) => setFront3(normalizeDigits(event.target.value, 3))}
                />
              </div>
              <div>
                <label className="legacy-form-label" htmlFor={`back3-${activeDraw.id}`}>
                  3 ตัวท้าย
                </label>
                <Input
                  id={`back3-${activeDraw.id}`}
                  maxLength={3}
                  name="back3"
                  value={back3}
                  onChange={(event) => setBack3(normalizeDigits(event.target.value, 3))}
                />
              </div>
            </div>

            <div>
              <label className="legacy-form-label" htmlFor={`notes-${activeDraw.id}`}>
                หมายเหตุ
              </label>
              <Textarea id={`notes-${activeDraw.id}`} name="notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>

            <div className="legacy-modal-actions">
              <FormSubmit idleLabel="บันทึก" pendingLabel="กำลังบันทึก..." />
            </div>
          </form>
        ) : null}
      </LegacyModal>
    </>
  );
}
