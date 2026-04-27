"use server";

import bcrypt from "bcryptjs";
import { MemberType, Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { saveUserCompatSettings } from "@/lib/php-compat-store";
import { prisma } from "@/lib/prisma";
import { buildCode, getString } from "@/lib/utils";

export type UserActionState = {
  ok: boolean;
  message: string;
};

const defaultUserActionState: UserActionState = {
  ok: false,
  message: "",
};

const SHARED_MEMBER_OWNER = "__ALL__";

function extractCompatSettings(formData: FormData) {
  const keys = [
    "pay_1",
    "pay_2",
    "pay_3",
    "pay_4",
    "pay_5",
    "pay_6",
    "pay_7",
    "pay_8",
    "discount_1",
    "discount_2",
    "discount_3",
    "discount_4",
    "discount_5",
    "discount_6",
    "discount_7",
    "discount_8",
  ] as const;

  return Object.fromEntries(keys.map((key) => [key, Number(getString(formData.get(key)) || "0") || 0]));
}

function generateClientCredential(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function parseMemberType(value: string) {
  if (value === MemberType.MAIN_MEMBER) {
    return MemberType.MAIN_MEMBER;
  }

  if (value === MemberType.CLIENT_MEMBER) {
    return MemberType.CLIENT_MEMBER;
  }

  return MemberType.MEMBER;
}

function parseRole(value: string) {
  if (value === Role.ADMIN) {
    return Role.ADMIN;
  }

  if (value === Role.AGENT) {
    return Role.AGENT;
  }

  return Role.CUSTOMER;
}

function resolveCustomerShape({
  sessionRole,
  sessionUserId,
  requestedMemberType,
  rawOwnerAgentId,
  rawParentMemberId,
}: {
  sessionRole: Role;
  sessionUserId: string;
  requestedMemberType: string;
  rawOwnerAgentId: string;
  rawParentMemberId: string;
}) {
  const parsedMemberType = parseMemberType(requestedMemberType);

  if (parsedMemberType === MemberType.CLIENT_MEMBER) {
    return {
      memberType: MemberType.CLIENT_MEMBER,
      isSharedMember: false,
      ownerAgentId: null,
      parentMemberId: rawParentMemberId || null,
    };
  }

  if (sessionRole === Role.ADMIN && rawOwnerAgentId === SHARED_MEMBER_OWNER) {
    return {
      memberType: parsedMemberType,
      isSharedMember: true,
      ownerAgentId: null,
      parentMemberId: null,
    };
  }

  return {
    memberType: parsedMemberType,
    isSharedMember: false,
    ownerAgentId: sessionRole === Role.AGENT ? sessionUserId : rawOwnerAgentId || null,
    parentMemberId: null,
  };
}

export async function createUserAction(
  _prevState: UserActionState = defaultUserActionState,
  formData: FormData,
): Promise<UserActionState> {
  void _prevState;

  try {
    const session = await requireSession([Role.ADMIN, Role.AGENT]);
    const name = getString(formData.get("name"));
    const rawUsername = getString(formData.get("username"));
    const rawPassword = getString(formData.get("password"));
    const phone = getString(formData.get("phone"));
    const requestedRole = getString(formData.get("role")) as Role;
    const rawOwnerAgentId = getString(formData.get("ownerAgentId"));
    const rawParentMemberId = getString(formData.get("parentMemberId"));
    const rawMemberType = getString(formData.get("memberType"));

    if (!name) {
      return { ok: false, message: "กรุณากรอกชื่อ" };
    }

    const role = session.role === Role.ADMIN ? parseRole(requestedRole) : Role.CUSTOMER;

    if (role === Role.ADMIN && session.role !== Role.ADMIN) {
      return { ok: false, message: "ไม่มีสิทธิ์สร้างผู้ดูแลระบบ" };
    }

    const { memberType, isSharedMember, ownerAgentId, parentMemberId } =
      role === Role.CUSTOMER
        ? resolveCustomerShape({
            sessionUserId: session.userId,
            rawOwnerAgentId,
            rawParentMemberId,
            requestedMemberType: rawMemberType,
            sessionRole: session.role,
          })
        : { memberType: null, isSharedMember: false, ownerAgentId: null, parentMemberId: null };

    if (memberType === MemberType.CLIENT_MEMBER && !parentMemberId) {
      return { ok: false, message: "กรุณาเลือกหัวหน้าสาย" };
    }

    const shouldGenerateCredentials = role === Role.CUSTOMER && memberType === MemberType.CLIENT_MEMBER;
    const username = rawUsername || (shouldGenerateCredentials ? generateClientCredential("client") : "");
    const password = rawPassword || (shouldGenerateCredentials ? generateClientCredential("pass") : "");

    if (!username || !password) {
      return { ok: false, message: "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน" };
    }

    const duplicateRows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "User"
      WHERE username = ${username}
      LIMIT 1
    `;

    if (duplicateRows.length > 0) {
      return { ok: false, message: "Username นี้ถูกใช้งานแล้ว" };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const now = new Date();
    const createdUserId = crypto.randomUUID();
    const createdUserCode = buildCode(role === Role.ADMIN ? "ADM" : role === Role.AGENT ? "AGT" : "CUS");

    await prisma.$executeRaw`
      INSERT INTO "User" (
        id,
        code,
        username,
        "passwordHash",
        "passwordPlain",
        name,
        phone,
        role,
        "memberType",
        "isActive",
        "isSharedMember",
        "ownerAgentId",
        "parentMemberId",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${createdUserId},
        ${createdUserCode},
        ${username},
        ${passwordHash},
        ${password},
        ${name},
        ${phone || null},
        ${role}::"Role",
        ${memberType}::"MemberType",
        ${true},
        ${isSharedMember},
        ${ownerAgentId},
        ${parentMemberId},
        ${now},
        ${now}
      )
    `;

    await saveUserCompatSettings(createdUserId, extractCompatSettings(formData));

    revalidatePath("/dashboard/users");
    revalidatePath("/dashboard");

    return { ok: true, message: "บันทึกข้อมูลเรียบร้อย" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลได้",
    };
  }
}

export async function toggleUserActiveAction(formData: FormData) {
  const session = await requireSession([Role.ADMIN]);
  const userId = getString(formData.get("userId"));

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("ไม่พบผู้ใช้");
  }

  if (user.id === session.userId) {
    throw new Error("ไม่สามารถปิดบัญชีตัวเองได้");
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      isActive: !user.isActive,
      updatedAt: new Date(),
    },
  });

  revalidatePath("/dashboard/users");
}

export async function updateUserProfileAction(
  _prevState: UserActionState = defaultUserActionState,
  formData: FormData,
): Promise<UserActionState> {
  void _prevState;

  try {
    await requireSession([Role.ADMIN]);

    const userId = getString(formData.get("userId"));
    const name = getString(formData.get("name"));
    const username = getString(formData.get("username"));
    const phone = getString(formData.get("phone"));
    const requestedRole = getString(formData.get("role"));
    const password = getString(formData.get("password"));
    const rawOwnerAgentId = getString(formData.get("ownerAgentId"));
    const rawParentMemberId = getString(formData.get("parentMemberId"));
    const rawMemberType = getString(formData.get("memberType"));

    if (!userId || !name || !username) {
      return { ok: false, message: "ข้อมูลผู้ใช้ไม่ครบ" };
    }

    const rows = await prisma.$queryRaw<Array<{ id: string; role: Role; memberType: MemberType | null }>>`
      SELECT id, role, "memberType"
      FROM "User"
      WHERE id = ${userId}
    `;
    const user = rows[0] ?? null;

    if (!user) {
      return { ok: false, message: "ไม่พบผู้ใช้" };
    }

    const role = parseRole(requestedRole || user.role);

    const duplicateRows = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM "User"
      WHERE username = ${username}
        AND id <> ${userId}
      LIMIT 1
    `;

    if (duplicateRows.length > 0) {
      return { ok: false, message: "Username นี้ถูกใช้งานแล้ว" };
    }

    const { memberType, isSharedMember, ownerAgentId, parentMemberId } =
      role === Role.CUSTOMER
        ? resolveCustomerShape({
            sessionUserId: "admin",
            rawOwnerAgentId,
            rawParentMemberId,
            requestedMemberType: rawMemberType || user.memberType || MemberType.MEMBER,
            sessionRole: Role.ADMIN,
          })
        : { memberType: null, isSharedMember: false, ownerAgentId: null, parentMemberId: null };

    if (memberType === MemberType.CLIENT_MEMBER && !parentMemberId) {
      return { ok: false, message: "กรุณาเลือกหัวหน้าสาย" };
    }

    const now = new Date();

    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);

      await prisma.$executeRaw`
        UPDATE "User"
        SET
          name = ${name},
          username = ${username},
          phone = ${phone || null},
          role = ${role}::"Role",
          "isSharedMember" = ${isSharedMember},
          "ownerAgentId" = ${ownerAgentId},
          "parentMemberId" = ${parentMemberId},
          "memberType" = ${memberType}::"MemberType",
          "passwordHash" = ${passwordHash},
          "passwordPlain" = ${password},
          "updatedAt" = ${now}
        WHERE id = ${userId}
      `;
    } else {
      await prisma.$executeRaw`
        UPDATE "User"
        SET
          name = ${name},
          username = ${username},
          phone = ${phone || null},
          role = ${role}::"Role",
          "isSharedMember" = ${isSharedMember},
          "ownerAgentId" = ${ownerAgentId},
          "parentMemberId" = ${parentMemberId},
          "memberType" = ${memberType}::"MemberType",
          "updatedAt" = ${now}
        WHERE id = ${userId}
      `;
    }

    await saveUserCompatSettings(userId, extractCompatSettings(formData));

    revalidatePath("/dashboard/users");
    revalidatePath(`/dashboard/users/${userId}`);

    return { ok: true, message: "บันทึกข้อมูลเรียบร้อย" };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "ไม่สามารถบันทึกข้อมูลได้",
    };
  }
}
