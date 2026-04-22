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
    top3?: string | null;
    top2?: string | null;
    bottom3?: string | null;
    bottom2?: string | null;
    front3?: string | null;
    back3?: string | null;
    notes?: string | null;
  };
  mode: "create" | "edit";
};

function normalizeDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function ResultEditor({ drawId, drawName, defaultValues, mode }: ResultEditorProps) {
  const [top3, setTop3] = useState(defaultValues?.top3 ?? "");
  const [bottom3, setBottom3] = useState(defaultValues?.bottom3 ?? "");
  const [bottom2, setBottom2] = useState(defaultValues?.bottom2 ?? "");
  const [front3, setFront3] = useState(defaultValues?.front3 ?? "");
  const [back3, setBack3] = useState(defaultValues?.back3 ?? "");

  const top2 = useMemo(() => {
    const normalizedTop3 = normalizeDigits(top3, 3);
    if (normalizedTop3.length === 3) {
      return normalizedTop3.slice(-2);
    }

    return normalizeDigits(defaultValues?.top2 ?? "", 2);
  }, [defaultValues?.top2, top3]);

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

            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <label className="legacy-form-label" htmlFor={`top3-${drawId}`}>
                  3 ตัวบน
                </label>
                <Input
                  id={`top3-${drawId}`}
                  maxLength={3}
                  name="top3"
                  required
                  value={top3}
                  onChange={(event) => setTop3(normalizeDigits(event.target.value, 3))}
                />
              </div>

              <div>
                <label className="legacy-form-label" htmlFor={`top2-${drawId}`}>
                  2 ตัวบน
                </label>
                <Input id={`top2-${drawId}`} maxLength={2} name="top2" readOnly value={top2} />
              </div>

              <div>
                <label className="legacy-form-label" htmlFor={`bottom3-${drawId}`}>
                  3 ตัวล่าง
                </label>
                <Input
                  id={`bottom3-${drawId}`}
                  maxLength={3}
                  name="bottom3"
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
                  required
                  value={bottom2}
                  onChange={(event) => setBottom2(normalizeDigits(event.target.value, 2))}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="legacy-form-label" htmlFor={`front3-${drawId}`}>
                  3 ตัวหน้า
                </label>
                <Input
                  id={`front3-${drawId}`}
                  maxLength={3}
                  name="front3"
                  value={front3}
                  onChange={(event) => setFront3(normalizeDigits(event.target.value, 3))}
                />
              </div>

              <div>
                <label className="legacy-form-label" htmlFor={`back3-${drawId}`}>
                  3 ตัวท้าย
                </label>
                <Input
                  id={`back3-${drawId}`}
                  maxLength={3}
                  name="back3"
                  value={back3}
                  onChange={(event) => setBack3(normalizeDigits(event.target.value, 3))}
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
