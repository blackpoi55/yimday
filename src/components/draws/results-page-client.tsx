"use client";

import { useMemo, useState } from "react";
import { DrawStatus } from "@prisma/client";
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
  status: DrawStatus;
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

type ResultsPageClientProps = {
  draws: ResultRow[];
};

function normalizeDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function canSaveResult(draw: ResultRow) {
  return draw.status === DrawStatus.CLOSED || draw.status === DrawStatus.RESULTED;
}

export function ResultsPageClient({ draws }: ResultsPageClientProps) {
  const [activeDrawId, setActiveDrawId] = useState<string | null>(null);
  const activeDraw = draws.find((draw) => draw.id === activeDrawId) ?? null;
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
  const [notes, setNotes] = useState("");

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

  function openModal(draw: ResultRow) {
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
              <th>รางวัลที่ 1</th>
              <th>3 ตัวบน</th>
              <th>2 ตัวบน</th>
              <th>3 ตัวล่าง</th>
              <th>2 ตัวล่าง</th>
              <th className="w-[5%]">แก้ไข</th>
            </tr>
          </thead>
          <tbody>
            {draws.map((draw) => {
              const saveEnabled = canSaveResult(draw);

              return (
                <tr key={draw.id}>
                  <td>{draw.name}</td>
                  <td>{draw.result?.firstPrize ?? "-"}</td>
                  <td>{draw.result?.top3 ?? "-"}</td>
                  <td>{draw.result?.top2 ?? draw.result?.top3?.slice(-2) ?? "-"}</td>
                  <td>{draw.result?.bottom3 ?? "-"}</td>
                  <td>{draw.result?.bottom2 ?? "-"}</td>
                  <td className="text-center">
                    <button
                      className={draw.result ? "legacy-btn-info legacy-icon-btn" : "legacy-btn-success legacy-icon-btn"}
                      disabled={!saveEnabled}
                      onClick={() => openModal(draw)}
                      title={saveEnabled ? undefined : "ต้องปิดรับโพยก่อนบันทึกผล"}
                      type="button"
                    >
                      <Pencil className="size-14px" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <LegacyModal
        open={Boolean(activeDraw)}
        onClose={() => setActiveDrawId(null)}
        title={activeDraw ? `${activeDraw.result ? "แก้ไขงวดประจำวันที่" : "ปิดงวดประจำวันที่"} ${activeDraw.name}` : ""}
        size="lg"
      >
        {activeDraw ? (
          <form action={handleSaveResult} className="space-y-4">
            <input name="drawId" type="hidden" value={activeDraw.id} />
            <input name="top3" type="hidden" value={top3} />
            <input name="top2" type="hidden" value={top2} />

            <div className="legacy-close-modal-grid">
              <div>
                <label className="legacy-form-label" htmlFor={`first-prize-${activeDraw.id}`}>
                  รางวัลที่ 1
                </label>
                <Input
                  id={`first-prize-${activeDraw.id}`}
                  maxLength={6}
                  name="firstPrize"
                  placeholder="123456"
                  required
                  value={firstPrize}
                  onChange={(event) => setFirstPrize(normalizeDigits(event.target.value, 6))}
                />
              </div>
              <div>
                <label className="legacy-form-label" htmlFor={`top3-${activeDraw.id}`}>
                  3 ตัวบน
                </label>
                <Input id={`top3-${activeDraw.id}`} maxLength={3} readOnly value={top3} />
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
                  placeholder="678"
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
                <label className="legacy-form-label" htmlFor={`front3-${activeDraw.id}`}>
                  3 ตัวหน้า ชุดที่ 1
                </label>
                <Input
                  id={`front3-${activeDraw.id}`}
                  maxLength={3}
                  name="front3"
                  placeholder="123"
                  value={front3}
                  onChange={(event) => setFront3(normalizeDigits(event.target.value, 3))}
                />
              </div>
              <div>
                <label className="legacy-form-label" htmlFor={`front3-second-${activeDraw.id}`}>
                  3 ตัวหน้า ชุดที่ 2
                </label>
                <Input
                  id={`front3-second-${activeDraw.id}`}
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
                <label className="legacy-form-label" htmlFor={`back3-${activeDraw.id}`}>
                  3 ตัวท้าย ชุดที่ 1
                </label>
                <Input
                  id={`back3-${activeDraw.id}`}
                  maxLength={3}
                  name="back3"
                  placeholder="789"
                  value={back3}
                  onChange={(event) => setBack3(normalizeDigits(event.target.value, 3))}
                />
              </div>
              <div>
                <label className="legacy-form-label" htmlFor={`back3-second-${activeDraw.id}`}>
                  3 ตัวท้าย ชุดที่ 2
                </label>
                <Input
                  id={`back3-second-${activeDraw.id}`}
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
                  <label className="legacy-form-label" htmlFor={`first-prize-adjacent-${activeDraw.id}`}>
                    เลขข้างเคียงรางวัลที่ 1
                  </label>
                  <Textarea
                    id={`first-prize-adjacent-${activeDraw.id}`}
                    name="firstPrizeAdjacent"
                    placeholder={"123455 123457"}
                    rows={2}
                    value={firstPrizeAdjacent}
                    onChange={(event) => setFirstPrizeAdjacent(event.target.value)}
                  />
                </div>

                <div>
                  <label className="legacy-form-label" htmlFor={`second-prize-${activeDraw.id}`}>
                    รางวัลที่ 2
                  </label>
                  <Textarea
                    id={`second-prize-${activeDraw.id}`}
                    name="secondPrize"
                    placeholder={"234561 345672 456783 567894 678905"}
                    rows={3}
                    value={secondPrize}
                    onChange={(event) => setSecondPrize(event.target.value)}
                  />
                </div>

                <div>
                  <label className="legacy-form-label" htmlFor={`third-prize-${activeDraw.id}`}>
                    รางวัลที่ 3
                  </label>
                  <Textarea
                    id={`third-prize-${activeDraw.id}`}
                    name="thirdPrize"
                    placeholder={"111111 222222 333333 444444 555555"}
                    rows={4}
                    value={thirdPrize}
                    onChange={(event) => setThirdPrize(event.target.value)}
                  />
                </div>

                <div>
                  <label className="legacy-form-label" htmlFor={`fourth-prize-${activeDraw.id}`}>
                    รางวัลที่ 4
                  </label>
                  <Textarea
                    id={`fourth-prize-${activeDraw.id}`}
                    name="fourthPrize"
                    placeholder="กรอก 50 เลข 6 หลัก คั่นด้วย space หรือขึ้นบรรทัดใหม่"
                    rows={5}
                    value={fourthPrize}
                    onChange={(event) => setFourthPrize(event.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="legacy-form-label" htmlFor={`fifth-prize-${activeDraw.id}`}>
                  รางวัลที่ 5
                </label>
                <Textarea
                  id={`fifth-prize-${activeDraw.id}`}
                  name="fifthPrize"
                  placeholder="กรอก 100 เลข 6 หลัก คั่นด้วย space หรือขึ้นบรรทัดใหม่"
                  rows={6}
                  value={fifthPrize}
                  onChange={(event) => setFifthPrize(event.target.value)}
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
