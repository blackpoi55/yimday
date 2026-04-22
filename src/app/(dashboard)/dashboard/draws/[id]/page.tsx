import Link from "next/link";
import { Role } from "@prisma/client";
import { notFound } from "next/navigation";
import { FormSubmit } from "@/components/ui/form-submit";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { updateDrawAction } from "@/lib/actions/draws";
import { requireSession } from "@/lib/auth";
import { toDateInputValue, toTimeInputValue } from "@/lib/dates";
import { prisma } from "@/lib/prisma";

type EditDrawPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function EditDrawPage({ params }: EditDrawPageProps) {
  await requireSession([Role.ADMIN]);
  const { id } = await params;

  const draw = await prisma.draw.findUnique({
    where: { id },
  });

  if (!draw) {
    notFound();
  }

  return (
    <div className="col-md-offset-3">
      <div className="container">
        <div className="col-md-6">
          <div className="panel">
            <div className="panel-header">
              <h3>แก้ไขข้อมูลงวดการเปิดรับโพย</h3>
            </div>
            <div className="panel-body">
              <form action={updateDrawAction} className="grid gap-4">
                <input name="drawId" type="hidden" value={draw.id} />

                <div>
                  <label className="legacy-form-label" htmlFor="name">
                    งวดประจำวันที่
                  </label>
                  <Input defaultValue={draw.name} id="name" name="name" required />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="legacy-form-label" htmlFor="openDate">
                      วันที่เปิดรับโพย
                    </label>
                    <Input defaultValue={toDateInputValue(draw.openAt)} id="openDate" name="openDate" required type="date" />
                  </div>
                  <div>
                    <label className="legacy-form-label" htmlFor="openTime">
                      เวลาเปิดรับโพย
                    </label>
                    <Input defaultValue={toTimeInputValue(draw.openAt)} id="openTime" name="openTime" required type="time" />
                  </div>
                  <div>
                    <label className="legacy-form-label" htmlFor="closeDate">
                      วันที่ปิดรับโพย
                    </label>
                    <Input defaultValue={toDateInputValue(draw.closeAt)} id="closeDate" name="closeDate" required type="date" />
                  </div>
                  <div>
                    <label className="legacy-form-label" htmlFor="closeTime">
                      เวลาปิดรับโพย
                    </label>
                    <Input defaultValue={toTimeInputValue(draw.closeAt)} id="closeTime" name="closeTime" required type="time" />
                  </div>
                </div>

                <div>
                  <label className="legacy-form-label" htmlFor="drawDate">
                    วันที่ออกรางวัล
                  </label>
                  <Input defaultValue={toDateInputValue(draw.drawDate)} id="drawDate" name="drawDate" required type="date" />
                </div>

                <div>
                  <label className="legacy-form-label" htmlFor="notes">
                    หมายเหตุ
                  </label>
                  <Textarea defaultValue={draw.notes ?? ""} id="notes" name="notes" />
                </div>

                <div className="flex gap-2">
                  <Link className="legacy-btn-default" href="/dashboard/draws">
                    ยกเลิก
                  </Link>
                  <FormSubmit idleLabel="บันทึก" pendingLabel="กำลังบันทึก..." />
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
