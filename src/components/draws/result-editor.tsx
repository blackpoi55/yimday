"use client";

import { useMemo, useState } from "react";
import { FormSubmit } from "@/components/ui/form-submit";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { saveDrawResultAction } from "@/lib/actions/draws";

type ResultEditorProps = {
  drawId: string;
  drawName: string;
  defaultValues?: {
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
  };
  mode: "create" | "edit";
};

function normalizeDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function ResultEditor({ drawId, drawName, defaultValues, mode }: ResultEditorProps) {
  const [firstPrize, setFirstPrize] = useState(defaultValues?.firstPrize ?? "");
  const [firstPrizeAdjacent, setFirstPrizeAdjacent] = useState(defaultValues?.firstPrizeAdjacent ?? "");
  const [secondPrize, setSecondPrize] = useState(defaultValues?.secondPrize ?? "");
  const [thirdPrize, setThirdPrize] = useState(defaultValues?.thirdPrize ?? "");
  const [fourthPrize, setFourthPrize] = useState(defaultValues?.fourthPrize ?? "");
  const [fifthPrize, setFifthPrize] = useState(defaultValues?.fifthPrize ?? "");
  const [bottom3, setBottom3] = useState(defaultValues?.bottom3 ?? "");
  const [bottom2, setBottom2] = useState(defaultValues?.bottom2 ?? "");
  const [front3, setFront3] = useState(defaultValues?.front3 ?? "");
  const [front3Second, setFront3Second] = useState(defaultValues?.front3Second ?? "");
  const [back3, setBack3] = useState(defaultValues?.back3 ?? "");
  const [back3Second, setBack3Second] = useState(defaultValues?.back3Second ?? "");

  const top3 = useMemo(() => {
    const normalizedFirstPrize = normalizeDigits(firstPrize, 6);
    if (normalizedFirstPrize.length === 6) {
      return normalizedFirstPrize.slice(-3);
    }

    return "";
  }, [firstPrize]);

  const top2 = useMemo(() => {
    const normalizedFirstPrize = normalizeDigits(firstPrize, 6);
    if (normalizedFirstPrize.length === 6) {
      return normalizedFirstPrize.slice(-2);
    }
    return "";
  }, [firstPrize]);

  return (
    <details>
      <summary className={mode === "edit" ? "legacy-btn-info cursor-pointer list-none" : "legacy-btn-success cursor-pointer list-none"}>
        {mode === "edit" ? "แก้ไขผล" : "ปิดงวด"}
      </summary>

      <div className="mt-3 panel">
        <div className="panel-header">
          <h3 className="text-lg font-medium">
            {mode === "edit" ? "แก้ไขงวดประจำวันที่" : "ปิดงวดประจำวันที่"} {drawName}
          </h3>
        </div>
        <div className="panel-body">
          <form action={saveDrawResultAction} className="space-y-4">
            <input name="drawId" type="hidden" value={drawId} />
            <input name="top3" type="hidden" value={top3} />
            <input name="top2" type="hidden" value={top2} />

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="legacy-form-label" htmlFor={`first-prize-${drawId}`}>
                  รางวัลที่ 1
                </label>
                <Input
                  id={`first-prize-${drawId}`}
                  maxLength={6}
                  name="firstPrize"
                  placeholder="123456"
                  required
                  value={firstPrize}
                  onChange={(event) => setFirstPrize(normalizeDigits(event.target.value, 6))}
                />
              </div>

              <div>
                <label className="legacy-form-label" htmlFor={`top3-${drawId}`}>
                  3 ตัวบน
                </label>
                <Input id={`top3-${drawId}`} maxLength={3} readOnly value={top3} />
              </div>

              <div>
                <label className="legacy-form-label" htmlFor={`top2-${drawId}`}>
                  2 ตัวบน
                </label>
                <Input id={`top2-${drawId}`} maxLength={2} readOnly value={top2} />
              </div>

              <div>
                <label className="legacy-form-label" htmlFor={`bottom3-${drawId}`}>
                  3 ตัวล่าง
                </label>
                <Input
                  id={`bottom3-${drawId}`}
                  maxLength={3}
                  name="bottom3"
                  placeholder="678"
                  value={bottom3}
                  onChange={(event) => setBottom3(normalizeDigits(event.target.value, 3))}
                />
              </div>

              <div>
                <label className="legacy-form-label" htmlFor={`bottom2-${drawId}`}>
                  2 ตัวล่าง
                </label>
                <Input
                  id={`bottom2-${drawId}`}
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

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="legacy-form-label" htmlFor={`front3-${drawId}`}>
                  3 ตัวหน้า ชุดที่ 1
                </label>
                <Input
                  id={`front3-${drawId}`}
                  maxLength={3}
                  name="front3"
                  placeholder="123"
                  value={front3}
                  onChange={(event) => setFront3(normalizeDigits(event.target.value, 3))}
                />
              </div>

              <div>
                <label className="legacy-form-label" htmlFor={`front3-second-${drawId}`}>
                  3 ตัวหน้า ชุดที่ 2
                </label>
                <Input
                  id={`front3-second-${drawId}`}
                  maxLength={3}
                  name="front3Second"
                  placeholder="456"
                  value={front3Second}
                  onChange={(event) => setFront3Second(normalizeDigits(event.target.value, 3))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="legacy-form-label" htmlFor={`back3-${drawId}`}>
                  3 ตัวท้าย ชุดที่ 1
                </label>
                <Input
                  id={`back3-${drawId}`}
                  maxLength={3}
                  name="back3"
                  placeholder="789"
                  value={back3}
                  onChange={(event) => setBack3(normalizeDigits(event.target.value, 3))}
                />
              </div>

              <div>
                <label className="legacy-form-label" htmlFor={`back3-second-${drawId}`}>
                  3 ตัวท้าย ชุดที่ 2
                </label>
                <Input
                  id={`back3-second-${drawId}`}
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
                  <label className="legacy-form-label" htmlFor={`first-prize-adjacent-${drawId}`}>
                    เลขข้างเคียงรางวัลที่ 1
                  </label>
                  <Textarea
                    id={`first-prize-adjacent-${drawId}`}
                    name="firstPrizeAdjacent"
                    placeholder={"123455 123457"}
                    rows={2}
                    value={firstPrizeAdjacent}
                    onChange={(event) => setFirstPrizeAdjacent(event.target.value)}
                  />
                </div>
                <div>
                  <label className="legacy-form-label" htmlFor={`second-prize-${drawId}`}>
                    รางวัลที่ 2
                  </label>
                  <Textarea
                    id={`second-prize-${drawId}`}
                    name="secondPrize"
                    placeholder={"234561 345672 456783 567894 678905"}
                    rows={3}
                    value={secondPrize}
                    onChange={(event) => setSecondPrize(event.target.value)}
                  />
                </div>
                <div>
                  <label className="legacy-form-label" htmlFor={`third-prize-${drawId}`}>
                    รางวัลที่ 3
                  </label>
                  <Textarea
                    id={`third-prize-${drawId}`}
                    name="thirdPrize"
                    placeholder={"111111 222222 333333 444444 555555"}
                    rows={4}
                    value={thirdPrize}
                    onChange={(event) => setThirdPrize(event.target.value)}
                  />
                </div>
                <div>
                  <label className="legacy-form-label" htmlFor={`fourth-prize-${drawId}`}>
                    รางวัลที่ 4
                  </label>
                  <Textarea
                    id={`fourth-prize-${drawId}`}
                    name="fourthPrize"
                    placeholder="กรอก 50 เลข 6 หลัก คั่นด้วย space หรือขึ้นบรรทัดใหม่"
                    rows={5}
                    value={fourthPrize}
                    onChange={(event) => setFourthPrize(event.target.value)}
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="legacy-form-label" htmlFor={`fifth-prize-${drawId}`}>
                  รางวัลที่ 5
                </label>
                <Textarea
                  id={`fifth-prize-${drawId}`}
                  name="fifthPrize"
                  placeholder="กรอก 100 เลข 6 หลัก คั่นด้วย space หรือขึ้นบรรทัดใหม่"
                  rows={6}
                  value={fifthPrize}
                  onChange={(event) => setFifthPrize(event.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="legacy-form-label" htmlFor={`notes-${drawId}`}>
                หมายเหตุผลรางวัล
              </label>
              <Textarea defaultValue={defaultValues?.notes ?? ""} id={`notes-${drawId}`} name="notes" />
            </div>

            <div className="flex justify-end">
              <FormSubmit
                idleLabel={mode === "edit" ? "บันทึกการแก้ไข" : "บันทึกผลและปิดงวด"}
                pendingLabel="กำลังบันทึก..."
              />
            </div>
          </form>
        </div>
      </div>
    </details>
  );
}
