"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, type FormEvent } from "react";
import { Role } from "@prisma/client";
import type { MemberType } from "@prisma/client";
import { Check, List, Pencil, Plus, Settings, User, X } from "lucide-react";
import Swal from "sweetalert2";
import { FormSubmit } from "@/components/ui/form-submit";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { LegacyModal } from "@/components/ui/legacy-modal";
import {
  createUserAction,
  toggleUserActiveAction,
  updateUserProfileAction,
  type UserActionState,
} from "@/lib/actions/users";
import { defaultUserCompatSettings, type UserCompatSettings } from "@/lib/php-compat-shared";

type UserOption = {
  id: string;
  name: string;
};

type UserRow = {
  id: string;
  name: string;
  username: string;
  passwordPlain: string | null;
  tableUsername?: string;
  tablePassword?: string;
  phone: string | null;
  role: Role;
  memberType: MemberType | null;
  isSharedMember: boolean;
  ownerAgentId: string | null;
  parentMemberId?: string | null;
  managerName: string;
  isActive: boolean;
};

type UsersPageClientProps = {
  selectedTab: "member" | "client" | "staff";
  users: UserRow[];
  mainMembers: UserOption[];
  agents: UserOption[];
  defaultCompatSettings: UserCompatSettings;
  userSettings: Record<string, UserCompatSettings>;
};

const discountGroups = [
  { title: "3บน", payKey: "pay_1", discountKey: "discount_1" },
  { title: "3 โต๊ด", payKey: "pay_2", discountKey: "discount_2" },
  { title: "2 บน", payKey: "pay_3", discountKey: "discount_3" },
  { title: "คู่โต๊ด", payKey: "pay_4", discountKey: "discount_4" },
  { title: "วิ่งบน", payKey: "pay_5", discountKey: "discount_5" },
  { title: "3 ล่าง", payKey: "pay_6", discountKey: "discount_6" },
  { title: "2 ล่าง", payKey: "pay_7", discountKey: "discount_7" },
  { title: "วิ่งล่าง", payKey: "pay_8", discountKey: "discount_8" },
] as const;

const initialActionState: UserActionState = {
  ok: false,
  message: "",
};

const MEMBER_TYPE = {
  MEMBER: "MEMBER",
  MAIN_MEMBER: "MAIN_MEMBER",
  CLIENT_MEMBER: "CLIENT_MEMBER",
} as const satisfies Record<string, MemberType>;

const SHARED_MEMBER_OWNER = "__ALL__";

function getTabMeta(tab: "member" | "client" | "staff") {
  switch (tab) {
    case "client":
      return {
        addTitle: "เพิ่มสมาชิกรายย่อย",
        editTitle: "แก้ไขข้อมูลสมาชิกรายย่อย",
        buttonLabel: "เพิ่มสมาชิกรายย่อย",
      };
    case "staff":
      return {
        addTitle: "เพิ่มพนักงาน",
        editTitle: "แก้ไขข้อมูลพนักงาน",
        buttonLabel: "เพิ่มพนักงาน",
      };
    default:
      return {
        addTitle: "เพิ่มสมาชิกทั่วไป",
        editTitle: "แก้ไขข้อมูลสมาชิกทั่วไป",
        buttonLabel: "เพิ่มสมาชิก",
      };
  }
}

function renderDiscountFields(settings?: UserCompatSettings, suffix = "") {
  const hasSettings = Boolean(settings);

  return (
    <div className="space-y-3">
      <hr className="soft-divider" />
      <h3 className="text-[18px] font-medium text-[#333]">ส่วนลด</h3>
      {discountGroups.map((group) => (
        <div key={`${suffix}${group.title}`} className="space-y-2">
          <div className="font-medium text-[#333]">{group.title}</div>
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <label className="legacy-form-label" htmlFor={`${group.payKey}${suffix}`}>
                ราคาจ่าย
              </label>
              <Input
                defaultValue={hasSettings ? String(settings?.[group.payKey] ?? 0) : ""}
                id={`${group.payKey}${suffix}`}
                name={group.payKey}
                type="number"
              />
            </div>
            <div>
              <label className="legacy-form-label" htmlFor={`${group.discountKey}${suffix}`}>
                ส่วนลด %
              </label>
              <Input
                defaultValue={hasSettings ? String(settings?.[group.discountKey] ?? 0) : ""}
                id={`${group.discountKey}${suffix}`}
                name={group.discountKey}
                type="number"
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function getMemberTypeLabel(memberType: MemberType | null) {
  switch (memberType) {
    case MEMBER_TYPE.MAIN_MEMBER:
      return "หัวหน้าสาย";
    case MEMBER_TYPE.CLIENT_MEMBER:
      return "สมาชิกรายย่อย";
    case MEMBER_TYPE.MEMBER:
    default:
      return "สมาชิกทั่วไป";
  }
}

function getOwnerDefaultValue(user: UserRow) {
  if (user.isSharedMember) {
    return SHARED_MEMBER_OWNER;
  }

  return user.ownerAgentId ?? "";
}

function renderOwnerAgentSelect(agents: UserOption[], defaultValue = "") {
  return (
    <div>
      <label className="legacy-form-label" htmlFor="ownerAgentId">
        พนักงานที่ดูแล
      </label>
      <Select defaultValue={defaultValue} id="ownerAgentId" name="ownerAgentId">
        <option value="">ไม่ระบุ</option>
        <option value={SHARED_MEMBER_OWNER}>ทุกคน</option>
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name}
          </option>
        ))}
      </Select>
    </div>
  );
}

function getPasswordValidationMessage(form: HTMLFormElement) {
  const password = (form.elements.namedItem("password") as HTMLInputElement | null)?.value.trim() ?? "";
  const confirmPassword = (form.elements.namedItem("confirmPassword") as HTMLInputElement | null)?.value.trim() ?? "";

  if (!password && !confirmPassword) {
    return null;
  }

  if (!password || !confirmPassword) {
    return "กรุณากรอกรหัสผ่านและยืนยันรหัสผ่านให้ครบ";
  }

  if (password !== confirmPassword) {
    return "Password และ ConfirmPassword ต้องตรงกัน";
  }

  return null;
}

async function validatePasswordBeforeSubmit(event: FormEvent<HTMLFormElement>, selectedTab: "member" | "client" | "staff") {
  if (selectedTab === "client") {
    return false;
  }

  const message = getPasswordValidationMessage(event.currentTarget);

  if (!message) {
    return false;
  }

  event.preventDefault();
  await Swal.fire({
    icon: "warning",
    title: "ข้อมูลไม่ถูกต้อง",
    text: message,
    confirmButtonText: "ตกลง",
  });

  return true;
}

function AddUserForm({
  selectedTab,
  mainMembers,
  agents,
  onSuccess,
}: {
  selectedTab: "member" | "client" | "staff";
  mainMembers: UserOption[];
  agents: UserOption[];
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState(createUserAction, initialActionState);

  useEffect(() => {
    if (!state.message) {
      return;
    }

    void Swal.fire({
      icon: state.ok ? "success" : "error",
      title: state.ok ? "บันทึกสำเร็จ" : "บันทึกไม่สำเร็จ",
      text: state.message,
      confirmButtonText: "ตกลง",
    }).then(() => {
      if (state.ok) {
        onSuccess();
      }
    });
  }, [onSuccess, state]);

  return (
    <form
      action={formAction}
      className="space-y-4"
      onSubmit={(event) => {
        void validatePasswordBeforeSubmit(event, selectedTab);
      }}
    >
      <input name="role" type="hidden" value={selectedTab === "staff" ? Role.AGENT : Role.CUSTOMER} />

      {selectedTab === "client" ? (
        <>
          <input name="memberType" type="hidden" value={MEMBER_TYPE.CLIENT_MEMBER} />
          <div>
            <label className="legacy-form-label" htmlFor="client-name">
              Name
            </label>
            <Input id="client-name" name="name" required />
          </div>
          <div>
            <label className="legacy-form-label" htmlFor="client-parent">
              หัวหน้าสาย
            </label>
            <Select id="client-parent" name="parentMemberId" required>
              <option value="">เลือกหัวหน้าสาย</option>
              {mainMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </Select>
          </div>
        </>
      ) : (
        <>
          {selectedTab === "member" ? (
            <div>
              <label className="legacy-form-label" htmlFor="memberType">
                ประเภทสมาชิก
              </label>
              <Select defaultValue={MEMBER_TYPE.MEMBER} id="memberType" name="memberType">
                <option value={MEMBER_TYPE.MEMBER}>สมาชิกทั่วไป</option>
                <option value={MEMBER_TYPE.MAIN_MEMBER}>หัวหน้าสาย</option>
              </Select>
            </div>
          ) : null}
          {selectedTab === "member" ? renderOwnerAgentSelect(agents) : null}
          <div>
            <label className="legacy-form-label" htmlFor="name">
              Name
            </label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <label className="legacy-form-label" htmlFor="username">
              Username
            </label>
            <Input id="username" name="username" required />
          </div>
          <div>
            <label className="legacy-form-label" htmlFor="password">
              Password
            </label>
            <Input id="password" name="password" required type="password" />
          </div>
          <div>
            <label className="legacy-form-label" htmlFor="confirmPassword">
              ConfirmPassword
            </label>
            <Input id="confirmPassword" name="confirmPassword" required type="password" />
          </div>
        </>
      )}

      {selectedTab === "member" ? renderDiscountFields(undefined, "-create") : null}

      <div className="legacy-modal-actions justify-start">
        <FormSubmit idleLabel="บันทึก" pendingLabel="กำลังบันทึก..." />
      </div>
    </form>
  );
}

function EditUserForm({
  selectedTab,
  editingUser,
  mainMembers,
  agents,
  settings,
  onSuccess,
}: {
  selectedTab: "member" | "client" | "staff";
  editingUser: UserRow;
  mainMembers: UserOption[];
  agents: UserOption[];
  settings?: UserCompatSettings;
  onSuccess: () => void;
}) {
  const [state, formAction] = useActionState(updateUserProfileAction, initialActionState);

  useEffect(() => {
    if (!state.message) {
      return;
    }

    void Swal.fire({
      icon: state.ok ? "success" : "error",
      title: state.ok ? "บันทึกสำเร็จ" : "บันทึกไม่สำเร็จ",
      text: state.message,
      confirmButtonText: "ตกลง",
    }).then(() => {
      if (state.ok) {
        onSuccess();
      }
    });
  }, [onSuccess, state]);

  return (
    <form
      action={formAction}
      className="space-y-4"
      onSubmit={(event) => {
        void validatePasswordBeforeSubmit(event, selectedTab);
      }}
    >
      <input name="userId" type="hidden" value={editingUser.id} />

      {selectedTab === "client" ? (
        <>
          <input name="memberType" type="hidden" value={MEMBER_TYPE.CLIENT_MEMBER} />
          <input name="username" type="hidden" value={editingUser.username} />
          <div>
            <label className="legacy-form-label" htmlFor={`edit-name-${editingUser.id}`}>
              Name
            </label>
            <Input defaultValue={editingUser.name} id={`edit-name-${editingUser.id}`} name="name" required />
          </div>
          <div>
            <label className="legacy-form-label" htmlFor={`edit-parent-${editingUser.id}`}>
              หัวหน้าสาย
            </label>
            <Select defaultValue={editingUser.parentMemberId ?? ""} id={`edit-parent-${editingUser.id}`} name="parentMemberId" required>
              <option value="">เลือกหัวหน้าสาย</option>
              {mainMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </Select>
          </div>
        </>
      ) : (
        <>
          {selectedTab === "member" ? (
            <div>
              <label className="legacy-form-label" htmlFor={`edit-memberType-${editingUser.id}`}>
                ประเภทสมาชิก
              </label>
              <Select
                defaultValue={editingUser.memberType ?? MEMBER_TYPE.MEMBER}
                id={`edit-memberType-${editingUser.id}`}
                name="memberType"
              >
                <option value={MEMBER_TYPE.MEMBER}>สมาชิกทั่วไป</option>
                <option value={MEMBER_TYPE.MAIN_MEMBER}>หัวหน้าสาย</option>
              </Select>
            </div>
          ) : null}
          {selectedTab === "member" ? renderOwnerAgentSelect(agents, getOwnerDefaultValue(editingUser)) : null}
          <div>
            <label className="legacy-form-label" htmlFor={`edit-name-${editingUser.id}`}>
              Name
            </label>
            <Input defaultValue={editingUser.name} id={`edit-name-${editingUser.id}`} name="name" required />
          </div>
          <div>
            <label className="legacy-form-label" htmlFor={`edit-username-${editingUser.id}`}>
              Username
            </label>
            <Input defaultValue={editingUser.username} id={`edit-username-${editingUser.id}`} name="username" required />
          </div>
          <div>
            <label className="legacy-form-label" htmlFor={`edit-password-${editingUser.id}`}>
              Password
            </label>
            <Input id={`edit-password-${editingUser.id}`} name="password" placeholder={editingUser.passwordPlain || "****"} type="password" />
          </div>
          <div>
            <label className="legacy-form-label" htmlFor={`edit-confirm-${editingUser.id}`}>
              ConfirmPassword
            </label>
            <Input id={`edit-confirm-${editingUser.id}`} name="confirmPassword" placeholder={editingUser.passwordPlain || "****"} type="password" />
          </div>
        </>
      )}

      {selectedTab === "member" ? renderDiscountFields(settings, `-${editingUser.id}`) : null}

      <div className="legacy-modal-actions justify-start">
        <FormSubmit idleLabel="บันทึก" pendingLabel="กำลังบันทึก..." />
      </div>
    </form>
  );
}

export function UsersPageClient({ selectedTab, users, mainMembers, agents, defaultCompatSettings, userSettings }: UsersPageClientProps) {
  const [modal, setModal] = useState<null | { type: "add" } | { type: "edit"; userId: string }>(null);
  const editingUser = useMemo(
    () => (modal?.type === "edit" ? users.find((user) => user.id === modal.userId) ?? null : null),
    [modal, users],
  );
  const tabMeta = getTabMeta(selectedTab);

  return (
    <div className="legacy-container">
      <div className="legacy-tab-nav">
        <Link className={selectedTab === "member" ? "legacy-tab-link active" : "legacy-tab-link"} href="/dashboard/users?tab=member">
          <User className="size-4" />
          สมาชิกทั่วไป
        </Link>
        <Link className={selectedTab === "client" ? "legacy-tab-link active" : "legacy-tab-link"} href="/dashboard/users?tab=client">
          <List className="size-4" />
          สมาชิกรายย่อย
        </Link>
        <Link className={selectedTab === "staff" ? "legacy-tab-link active" : "legacy-tab-link"} href="/dashboard/users?tab=staff">
          <Settings className="size-4" />
          พนักงาน
        </Link>
      </div>

      <div className="mt-6 flex justify-end">
        <button className="legacy-btn-success inline-flex gap-2" onClick={() => setModal({ type: "add" })} type="button">
          <Plus className="size-4" />
          {tabMeta.buttonLabel}
        </button>
      </div>

      <div className="mt-6 table-shell overflow-visible rounded-none border-0 bg-transparent">
        <table className="legacy-period-table">
          <thead>
            <tr>
              <th>ลำดับ</th>
              <th>ชื่อ</th>
              {selectedTab === "client" ? <th>หัวหน้าสาย</th> : <th>username</th>}
              {selectedTab === "member" ? <th>ประเภทสมาชิก</th> : null}
              {selectedTab === "member" ? <th>พนักงาน</th> : null}
              {selectedTab !== "client" ? <th>password</th> : null}
              <th>สถานะการใช้งาน</th>
              <th>แก้ไข</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user, index) => (
              <tr key={user.id}>
                <td>{index + 1}</td>
                <td>{user.name}</td>
                {selectedTab === "client" ? <td>{user.managerName}</td> : <td>{user.tableUsername ?? user.username}</td>}
                {selectedTab === "member" ? <td>{getMemberTypeLabel(user.memberType)}</td> : null}
                {selectedTab === "member" ? <td>{user.isSharedMember ? "ทุกคน" : user.managerName}</td> : null}
                {selectedTab !== "client" ? <td>{user.tablePassword ?? user.passwordPlain ?? "****"}</td> : null}
                <td>
                  <form action={toggleUserActiveAction}>
                    <input name="userId" type="hidden" value={user.id} />
                    <button className={user.isActive ? "legacy-btn-success legacy-status-btn" : "legacy-btn-danger legacy-status-btn"} type="submit">
                      {user.isActive ? <Check className="size-4" /> : <X className="size-4" />}
                      {user.isActive ? "เปิดการใช้งาน" : "ปิดการใช้งาน"}
                    </button>
                  </form>
                </td>
                <td className="text-center">
                  <button className="legacy-btn-info legacy-icon-btn" onClick={() => setModal({ type: "edit", userId: user.id })} type="button">
                    <Pencil className="size-14px" />
                  </button>
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td colSpan={selectedTab === "client" ? 5 : selectedTab === "member" ? 8 : 6}>ยังไม่มีข้อมูล</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <LegacyModal open={modal?.type === "add"} onClose={() => setModal(null)} title={tabMeta.addTitle} size={selectedTab === "member" ? "lg" : "md"}>
        <AddUserForm agents={agents} mainMembers={mainMembers} onSuccess={() => setModal(null)} selectedTab={selectedTab} />
      </LegacyModal>

      <LegacyModal
        open={Boolean(editingUser)}
        onClose={() => setModal(null)}
        title={editingUser ? tabMeta.editTitle : ""}
        size={selectedTab === "member" ? "lg" : "md"}
      >
        {editingUser ? (
          <EditUserForm
            editingUser={editingUser}
            agents={agents}
            mainMembers={mainMembers}
            onSuccess={() => setModal(null)}
            selectedTab={selectedTab}
            settings={userSettings[editingUser.id] ?? defaultCompatSettings ?? defaultUserCompatSettings}
          />
        ) : null}
      </LegacyModal>
    </div>
  );
}
