"use client";

import { useActionState, useEffect } from "react";
import { LockKeyhole, UserRound } from "lucide-react";
import { FormSubmit } from "@/components/ui/form-submit";
import { Input } from "@/components/ui/input";
import { loginAction, type LoginState } from "@/lib/actions/auth";
import { showErrorAlert } from "@/lib/client-alerts";

const initialState: LoginState = {};

export function LoginForm() {
  const [state, action] = useActionState(loginAction, initialState);

  useEffect(() => {
    if (state.error) {
      void showErrorAlert(state.error, "เข้าสู่ระบบไม่สำเร็จ");
    }
  }, [state.error]);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700" htmlFor="username">
          Username
        </label>
        <div className="flex min-h-14 items-center gap-3 rounded-[20px] border border-[#d7e6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition focus-within:border-[#8ab4ff] focus-within:ring-4 focus-within:ring-[#155eef]/10">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#edf4ff] text-[#155eef]">
            <UserRound className="size-[18px]" strokeWidth={2.1} />
          </span>
          <Input
            id="username"
            name="username"
            placeholder="Enter your username"
            required
            autoComplete="username"
            className="h-auto border-0 bg-transparent px-0 py-0 text-[15px] text-slate-950 shadow-none focus:border-0 focus:ring-0"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700" htmlFor="password">
          Password
        </label>
        <div className="flex min-h-14 items-center gap-3 rounded-[20px] border border-[#d7e6ff] bg-[linear-gradient(180deg,#ffffff_0%,#f7fbff_100%)] px-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] transition focus-within:border-[#8ab4ff] focus-within:ring-4 focus-within:ring-[#155eef]/10">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#edf4ff] text-[#155eef]">
            <LockKeyhole className="size-[18px]" strokeWidth={2.1} />
          </span>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            className="h-auto border-0 bg-transparent px-0 py-0 text-[15px] text-slate-950 shadow-none focus:border-0 focus:ring-0"
          />
        </div>
      </div>

      <FormSubmit
        idleLabel="เข้าสู่ระบบ"
        pendingLabel="กำลังตรวจสอบ..."
        className="h-12 w-full rounded-[18px] border-[#155eef] bg-[#155eef] text-[15px] font-semibold text-white shadow-[0_18px_36px_rgba(21,94,239,0.2)] hover:bg-[#0f4bcc]"
      />
    </form>
  );
}
