"use client";

import { useActionState, useEffect } from "react";
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
        <label className="legacy-form-label" htmlFor="username">
          Username
        </label>
        <div className="field">
          <span className="mr-3 text-muted-foreground">👤</span>
          <Input id="username" name="username" placeholder="username" required />
        </div>
      </div>

      <div className="space-y-2">
        <label className="legacy-form-label" htmlFor="password">
          Password
        </label>
        <div className="field">
          <span className="mr-3 text-muted-foreground">🔒</span>
          <Input id="password" name="password" type="password" placeholder="Password" required />
        </div>
      </div>

      <div className="flex justify-end">
        <FormSubmit idleLabel="Login" pendingLabel="กำลังตรวจสอบ..." />
      </div>
    </form>
  );
}
