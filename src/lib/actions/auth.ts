"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionCookie, clearSessionCookie, getSession } from "@/lib/auth";
import { getString } from "@/lib/utils";
import { redirect } from "next/navigation";

export type LoginState = {
  error?: string;
};

export async function loginAction(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = getString(formData.get("username"));
  const password = getString(formData.get("password"));

  if (!username || !password) {
    return {
      error: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน",
    };
  }

  let user;

  try {
    user = await prisma.user.findUnique({
      where: {
        username,
      },
    });
  } catch (error) {
    console.error("loginAction database lookup failed", error);
    return {
      error: "ระบบเชื่อมต่อฐานข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง",
    };
  }

  if (!user || !user.isActive) {
    return {
      error: "ไม่พบผู้ใช้งานหรือบัญชีถูกปิดใช้งาน",
    };
  }

  const matched = await bcrypt.compare(password, user.passwordHash);

  if (!matched) {
    return {
      error: "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
    };
  }

  await createSessionCookie({
    userId: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
    ownerAgentId: user.ownerAgentId,
  });

  redirect("/dashboard");
}

export async function logoutAction() {
  await clearSessionCookie();
  redirect("/login");
}

export async function redirectIfAuthenticated() {
  const session = await getSession();

  if (session) {
    redirect("/dashboard");
  }
}
