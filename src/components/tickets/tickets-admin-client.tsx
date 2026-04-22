"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { LegacyModal } from "@/components/ui/legacy-modal";
import { formatCurrency } from "@/lib/utils";

type TicketItem = {
  id: string;
  number: string;
  amount: number;
  label: string;
};

type TicketEntry = {
  id: string;
  code: string;
  displayName: string;
  customerId: string;
  customerName: string;
  agentName: string;
  subtotal: number;
  total: number;
  createdAtLabel: string;
  note: string | null;
  items: TicketItem[];
};

type CustomerSummary = {
  customerId: string;
  customerName: string;
  subtotal: number;
  total: number;
  tickets: TicketEntry[];
};

type DrawSummary = {
  drawId: string;
  drawName: string;
  subtotal: number;
  total: number;
  customers: CustomerSummary[];
};

type TicketsAdminClientProps = {
  draws: DrawSummary[];
};

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

export function TicketsAdminClient({ draws }: TicketsAdminClientProps) {
  const [activeDrawId, setActiveDrawId] = useState<string | null>(null);
  const [activeCustomerKey, setActiveCustomerKey] = useState<string | null>(null);
  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);

  const activeDraw = draws.find((draw) => draw.drawId === activeDrawId) ?? null;
  const activeCustomer = activeDraw?.customers.find((customer) => `${activeDraw.drawId}:${customer.customerId}` === activeCustomerKey) ?? null;
  const activeTicket = activeCustomer?.tickets.find((ticket) => ticket.id === activeTicketId) ?? activeCustomer?.tickets[0] ?? null;

  const itemColumns = activeTicket
    ? chunkItems(
        activeTicket.items.map((item, index) => ({
          order: index + 1,
          value: `${item.label}:${item.number}=${formatCurrency(item.amount)}`,
        })),
        Math.ceil(activeTicket.items.length / 3) || 1,
      )
    : [];

  return (
    <>
      <div className="table-shell overflow-visible rounded-none border-0 bg-transparent">
        <table className="legacy-period-table">
          <thead>
            <tr>
              <th>งวดประจำวันที่</th>
              <th>ยอดเงินรับทั้งหมด</th>
              <th>ยอดเงินหลังหัก %</th>
              <th className="w-[5%]">แก้ไข</th>
            </tr>
          </thead>
          <tbody>
            {draws.map((draw) => (
              <tr key={draw.drawId}>
                <td>{draw.drawName}</td>
                <td>{formatCurrency(draw.subtotal)}</td>
                <td>{formatCurrency(draw.total)} ฿</td>
                <td className="text-center">
                  <button className="legacy-btn-success legacy-icon-btn" onClick={() => setActiveDrawId(draw.drawId)} type="button">
                    <Eye className="size-14px" />
                  </button>
                </td>
              </tr>
            ))}
            {draws.length === 0 ? (
              <tr>
                <td colSpan={4}>ยังไม่มีข้อมูลการรับโพย</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <LegacyModal
        open={Boolean(activeDraw)}
        onClose={() => {
          setActiveDrawId(null);
          setActiveCustomerKey(null);
          setActiveTicketId(null);
        }}
        title={activeDraw ? `ข้อมูลการรับโพย \\ งวดประจำวันที่ ${activeDraw.drawName}` : ""}
        size="lg"
      >
        {activeDraw ? (
          <div className="table-shell overflow-visible rounded-none border-0 bg-transparent">
            <table className="legacy-period-table">
              <thead>
                <tr>
                  <th>ลำดับ</th>
                  <th>ชื่อ</th>
                  <th>ยอดเงินซื้อทั้งหมด</th>
                  <th>ยอดเงินซื้อหลังหัก %</th>
                  <th className="w-[5%]">แก้ไข</th>
                </tr>
              </thead>
              <tbody>
                {activeDraw.customers.map((customer, index) => (
                  <tr key={customer.customerId}>
                    <td>{index + 1}</td>
                    <td>{customer.customerName}</td>
                    <td>{formatCurrency(customer.subtotal)}</td>
                    <td>{formatCurrency(customer.total)} ฿</td>
                    <td className="text-center">
                      <button
                        className="legacy-btn-success legacy-icon-btn"
                        onClick={() => {
                          setActiveCustomerKey(`${activeDraw.drawId}:${customer.customerId}`);
                          setActiveTicketId(customer.tickets[0]?.id ?? null);
                        }}
                        type="button"
                      >
                        <Eye className="size-14px" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </LegacyModal>

      <LegacyModal
        open={Boolean(activeDraw && activeCustomer)}
        onClose={() => {
          setActiveCustomerKey(null);
          setActiveTicketId(null);
        }}
        title={activeDraw && activeCustomer ? `ข้อมูลการรับโพย \\ งวดประจำวันที่ ${activeDraw.drawName} \\ ${activeCustomer.customerName}` : ""}
        size="lg"
      >
        {activeDraw && activeCustomer ? (
          <div className="grid gap-6 md:grid-cols-[1fr_255px]">
            <div className="panel">
              <div className="panel-header">
                <div className="text-[18px]">
                  งวดประจำวันที่ {activeDraw.drawName} : {activeTicket?.displayName ?? "-"}
                </div>
              </div>
              <div className="panel-body">
                {activeTicket ? (
                  <div className="grid gap-6 md:grid-cols-3">
                    {itemColumns.map((column, columnIndex) => (
                      <table key={columnIndex} className="legacy-ticket-detail-table">
                        <thead>
                          <tr>
                            <th>ลำดับ</th>
                            <th>ตัวเลข</th>
                          </tr>
                        </thead>
                        <tbody>
                          {column.map((row) => (
                            <tr key={row.order}>
                              <td>{row.order}</td>
                              <td>{row.value}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-muted-foreground">ไม่มีโพย</div>
                )}
              </div>
            </div>

            <div>
              <table className="legacy-period-table">
                <thead>
                  <tr>
                    <th>โพย</th>
                    <th className="w-[5%]">ข้อมูล</th>
                  </tr>
                </thead>
                <tbody>
                  {activeCustomer.tickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td>
                        <div>{ticket.displayName}</div>
                        <div className="text-xs text-muted-foreground">{ticket.createdAtLabel}</div>
                      </td>
                      <td className="text-center">
                        <button className="legacy-btn-success legacy-icon-btn" onClick={() => setActiveTicketId(ticket.id)} type="button">
                          <Eye className="size-14px" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </LegacyModal>
    </>
  );
}
