import { YimdayLogo } from "@/components/brand/yimday-logo";
import { LoginForm } from "@/components/dashboard/login-form";
import { redirectIfAuthenticated } from "@/lib/actions/auth";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[linear-gradient(180deg,#f5f9ff_0%,#eef4ff_52%,#eefaf7_100%)]">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-6%] top-[-8%] h-[320px] w-[320px] rounded-full bg-[radial-gradient(circle,rgba(21,94,239,0.2)_0%,rgba(21,94,239,0)_72%)]" />
        <div className="absolute right-[-8%] top-[8%] h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.18)_0%,rgba(16,185,129,0)_74%)]" />
        <div className="absolute bottom-[-14%] left-[18%] h-[280px] w-[280px] rounded-full bg-[radial-gradient(circle,rgba(255,184,77,0.18)_0%,rgba(255,184,77,0)_76%)]" />
        <div className="absolute bottom-[14%] right-[14%] hidden h-16 w-16 rounded-full border border-white/70 bg-white/30 shadow-[0_18px_44px_rgba(15,23,42,0.06)] backdrop-blur md:block" />
      </div>

      <div className="relative flex min-h-screen items-center justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-[440px]">
          <div className="overflow-hidden rounded-[34px] border border-white/80 bg-white/88 shadow-[0_30px_90px_rgba(15,23,42,0.12)] backdrop-blur">
            <div className="relative border-b border-[#d8e7fb] bg-[radial-gradient(circle_at_top,#eff6ff_0%,#ffffff_62%)] px-8 py-8">
              <div className="absolute inset-x-10 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(21,94,239,0.35),transparent)]" />
              <div className="flex flex-col items-center text-center">
                <div className="rounded-[30px] bg-white/90 p-2 shadow-[0_22px_40px_rgba(21,94,239,0.16)]">
                  <YimdayLogo size={84} priority className="rounded-[24px]" />
                </div>
                <div className="mt-5 inline-flex items-center rounded-full border border-[#d9e7ff] bg-[#f6f9ff] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#155eef]">
                  Welcome Back
                </div>
                <h1 className="mt-4 text-[36px] font-semibold tracking-[-0.05em] text-slate-950">
                  Yimday
                </h1>
              </div>
            </div>

            <div className="px-8 py-8">
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
