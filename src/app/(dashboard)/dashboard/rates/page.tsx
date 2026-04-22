import { Role } from "@prisma/client";
import { FormSubmit } from "@/components/ui/form-submit";
import { Input } from "@/components/ui/input";
import { betTypeLabels, betTypeOrder } from "@/lib/constants";
import { updateBetRateAction } from "@/lib/actions/draws";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function RatesPage() {
  await requireSession([Role.ADMIN]);

  const draws = await prisma.draw.findMany({
    orderBy: {
      drawDate: "desc",
    },
    include: {
      BetRate: true,
    },
  });

  return (
    <div className="space-y-6">
      <section className="panel">
        <div className="panel-header">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">อัตราจ่ายและส่วนลด</h1>
            <p className="text-sm text-muted-foreground">
              แก้ไข payout, commission และการเปิดรับเลขของแต่ละงวดในหน้าเดียว
            </p>
          </div>
        </div>
      </section>

      {draws.map((draw) => (
        <section key={draw.id} className="panel">
          <div className="panel-header">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{draw.name}</h2>
              <p className="text-sm text-muted-foreground">สถานะ {draw.status}</p>
            </div>
          </div>

          <div className="panel-body space-y-3">
            {betTypeOrder.map((betType) => {
              const rate = draw.BetRate.find((item) => item.betType === betType);

              if (!rate) {
                return null;
              }

              return (
                <form
                  key={rate.id}
                  action={updateBetRateAction}
                  className="grid gap-3 rounded-2xl border border-border bg-white p-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr_auto_auto]"
                >
                  <input name="rateId" type="hidden" value={rate.id} />
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{betTypeLabels[betType]}</p>
                    <p className="text-xs text-muted-foreground">{betType}</p>
                  </div>
                  <Input defaultValue={rate.payout.toString()} min={0} name="payout" step="0.01" type="number" />
                  <Input defaultValue={rate.commission.toString()} min={0} name="commission" step="0.01" type="number" />
                  <Input
                    defaultValue={rate.limitPerNumber?.toString() ?? ""}
                    min={0}
                    name="limitPerNumber"
                    placeholder="ไม่จำกัด"
                    step="0.01"
                    type="number"
                  />
                  <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-foreground">
                    <input defaultChecked={rate.isOpen} name="isOpen" type="checkbox" />
                    เปิดรับ
                  </label>
                  <FormSubmit idleLabel="อัปเดต" pendingLabel="กำลังบันทึก..." variant="outline" />
                </form>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
