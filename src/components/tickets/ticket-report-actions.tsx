"use client";

import { useEffect, useRef } from "react";

type TicketReportActionsProps = {
  autoPrint?: boolean;
};

export function TicketReportActions({ autoPrint = false }: TicketReportActionsProps) {
  const hasPrintedRef = useRef(false);

  useEffect(() => {
    if (!autoPrint || hasPrintedRef.current) {
      return;
    }

    hasPrintedRef.current = true;
    window.setTimeout(() => {
      window.print();
    }, 250);
  }, [autoPrint]);

  return (
    <div className="print:hidden">
      <button className="legacy-btn-primary" onClick={() => window.print()} type="button">
        ดาวน์โหลด PDF
      </button>
    </div>
  );
}
