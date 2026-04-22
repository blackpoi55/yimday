"use client";

import Link from "next/link";
import { useState } from "react";
import { Role, type BetType } from "@prisma/client";
import { Pencil, Save } from "lucide-react";
import { Input } from "@/components/ui/input";
import { showErrorAlert, showSuccessAlert } from "@/lib/client-alerts";
import { updatePayoutProfileAction } from "@/lib/actions/payouts";
import { cn } from "@/lib/utils";

type PayoutRow = {
  id?: string;
  label: string;
  betType: BetType;
  payout: number;
  commission: number;
  role: Role;
};

type PayoutsPageClientProps = {
  selectedTab: "member" | "client";
  hasTable: boolean;
  profiles: PayoutRow[];
};

export function PayoutsPageClient({ selectedTab, hasTable, profiles }: PayoutsPageClientProps) {
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(
      profiles.map((profile) => [
        `${profile.role}-${profile.betType}`,
        {
          payout: String(profile.payout),
          commission: String(profile.commission),
        },
      ]),
    ),
  );

  async function handleUpdatePayoutProfile(formData: FormData) {
    try {
      await updatePayoutProfileAction(formData);
      setEditingKey(null);
      await showSuccessAlert("บันทึกส่วนลดเรียบร้อย");
    } catch (error) {
      await showErrorAlert(error instanceof Error ? error.message : "ไม่สามารถบันทึกส่วนลดได้");
    }
  }

  return (
    <div className="legacy-container">
      <div className="legacy-tab-nav">
        <Link className={selectedTab === "member" ? "legacy-tab-link active" : "legacy-tab-link"} href="/dashboard/payouts?tab=member">
          สมาชิกทั่วไป
        </Link>
        <Link className={selectedTab === "client" ? "legacy-tab-link active" : "legacy-tab-link"} href="/dashboard/payouts?tab=client">
          สมาชิกรายย่อย
        </Link>
      </div>

      {!hasTable ? <div className="mt-4 text-sm text-muted-foreground">กำลังใช้ค่าเริ่มต้นของระบบ</div> : null}

      <div className="mx-auto mt-5 max-w-[540px]">
        <table className="legacy-period-table">
          <thead>
            <tr>
              <th className="w-[22%]">การแทง</th>
              <th className="w-[34%]">ราคาจ่าย</th>
              <th className="w-[34%]">ส่วนลด (%)</th>
              <th className="w-[10%] text-center">แก้ไข</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((profile) => {
              const rowKey = `${profile.role}-${profile.betType}`;
              const isEditing = editingKey === rowKey;
              const draft = drafts[rowKey] ?? {
                payout: String(profile.payout),
                commission: String(profile.commission),
              };

              return (
                <tr key={rowKey}>
                  <td>{profile.label}</td>
                  <td className="!p-2">
                    <form action={handleUpdatePayoutProfile} id={`payout-form-${rowKey}`}>
                      <input name="id" type="hidden" value={profile.id ?? ""} />
                      <Input
                        className={cn("font-bold", !isEditing && "bg-[#eeeeee]")}
                        name="payout"
                        onChange={(event) => {
                          setDrafts((current) => ({
                            ...current,
                            [rowKey]: {
                              ...draft,
                              payout: event.target.value,
                            },
                          }));
                        }}
                        readOnly={!isEditing}
                        type="number"
                        value={draft.payout}
                      />
                    </form>
                  </td>
                  <td className="!p-2">
                    <Input
                      className={cn("font-bold", !isEditing && "bg-[#eeeeee]")}
                      form={`payout-form-${rowKey}`}
                      name="commission"
                      onChange={(event) => {
                        setDrafts((current) => ({
                          ...current,
                          [rowKey]: {
                            ...draft,
                            commission: event.target.value,
                          },
                        }));
                      }}
                      readOnly={!isEditing}
                      type="number"
                      value={draft.commission}
                    />
                  </td>
                  <td className="text-center">
                    <button
                      className={isEditing ? "legacy-btn-success legacy-icon-btn" : "legacy-btn-info legacy-icon-btn"}
                      disabled={!profile.id}
                      form={`payout-form-${rowKey}`}
                      onClick={(event) => {
                        if (!isEditing) {
                          event.preventDefault();
                          setEditingKey(rowKey);
                        }
                      }}
                      title={isEditing ? "save" : "edit"}
                      type="submit"
                    >
                      {isEditing ? <Save className="size-14px" /> : <Pencil className="size-14px" />}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
