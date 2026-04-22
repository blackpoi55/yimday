import { LoginForm } from "@/components/dashboard/login-form";
import { redirectIfAuthenticated } from "@/lib/actions/auth";

export default async function LoginPage() {
  await redirectIfAuthenticated();

  return (
    <div className="flex min-h-screen items-start justify-center px-4 pt-20">
      <div className="w-full max-w-[420px]">
        <div className="panel panel-primary">
          <div className="panel-header justify-center">
            <h3 className="text-center text-2xl font-medium">LOGIN</h3>
          </div>
          <div className="panel-body">
            <div className="mx-auto max-w-[320px]">
              <LoginForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
