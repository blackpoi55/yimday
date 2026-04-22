import Link from "next/link";
import { Role } from "@prisma/client";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";

type PeriodTicketsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function PeriodTicketsPage({ params }: PeriodTicketsPageProps) {
  await requireSession([Role.ADMIN]);
  const { id } = await params;

  const draw = await prisma.draw.findUnique({
    where: { id },
    include: {
      Ticket: {
        include: {
          User_Ticket_customerIdToUser: true,
        },
      },
    },
  });

  if (!draw) {
    notFound();
  }

  const grouped = Object.values(
    draw.Ticket.reduce<Record<string, { customerId: string; customerName: string; subtotal: number; total: number; count: number }>>((acc, ticket) => {
      const key = ticket.customerId;
      if (!acc[key]) {
        acc[key] = {
          customerId: ticket.customerId,
          customerName: ticket.User_Ticket_customerIdToUser.name,
          subtotal: 0,
          total: 0,
          count: 0,
        };
      }

      acc[key].subtotal += Number(ticket.subtotal);
      acc[key].total += Number(ticket.total);
      acc[key].count += 1;
      return acc;
    }, {}),
  ).sort((a, b) => b.total - a.total);

  return (
    <div className="container">
      <br />
      <h4>
        <Link href="/dashboard/tickets">ข้อมูลการรับโพย</Link> \ งวดประจำวันที่ {draw.name}
      </h4>
      <br />
      <div className="table-shell">
        <table>
          <thead className="bg-info">
            <tr>
              <th>ลำดับ</th>
              <th>ชื่อ</th>
              <th>ยอดเงินซื้อทั้งหมด</th>
              <th>ยอดเงินซื้อหลังหัก %</th>
                <th style={{ width: "5%" }}>แก้ไข</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((item, index) => (
              <tr key={item.customerId}>
                <td>{index + 1}</td>
                <td>{item.customerName}</td>
                <td>{formatCurrency(item.subtotal)}</td>
                <td>{formatCurrency(item.total)} ฿</td>
                <td>
                  <Link className="legacy-btn-success" href={`/dashboard/tickets?customerId=${item.customerId}`}>
                    ดู
                  </Link>
                </td>
              </tr>
            ))}
            {grouped.length === 0 ? (
              <tr>
                <td colSpan={5}>ยังไม่มีบิลในงวดนี้</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
