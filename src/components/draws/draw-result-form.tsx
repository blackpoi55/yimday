"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type DrawResultFormProps = {
  drawId: string;
  defaultValues?: {
    top3?: string | null;
    top2?: string | null;
    bottom3?: string | null;
    bottom2?: string | null;
    front3?: string | null;
    back3?: string | null;
    notes?: string | null;
  };
};

function normalizeDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

export function DrawResultForm({ drawId, defaultValues }: DrawResultFormProps) {
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
    <>
      <input name="drawId" type="hidden" value={drawId} />

      <div className="legacy-modal-grid">
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

      <div className="legacy-modal-grid legacy-modal-grid-2">
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
          หมายเหตุ
        </label>
        <Textarea defaultValue={defaultValues?.notes ?? ""} id={`notes-${drawId}`} name="notes" />
      </div>
    </>
  );
}
