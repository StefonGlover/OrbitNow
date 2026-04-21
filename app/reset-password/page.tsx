import Link from "next/link";
import { ResetPasswordForm } from "@/components/my-orbit/ResetPasswordForm";

type ResetPasswordPageProps = {
  searchParams?: {
    token?: string;
  };
};

export default function ResetPasswordPage({
  searchParams,
}: ResetPasswordPageProps) {
  const token = searchParams?.token?.trim() ?? "";

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-[880px] px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
        <section className="ui-card ui-card-hero">
          <div className="relative z-[1] space-y-6">
            <div>
              <p className="ui-kicker">Account Recovery</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-[-0.05em] text-white sm:text-5xl">
                Reset password
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 sm:text-lg">
                Choose a new OrbitNow password for the account tied to this recovery link.
              </p>
            </div>

            {!token ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
                  This reset link is missing a token. Request a new one from My Orbit.
                </div>
                <Link className="ui-btn-secondary rounded-[20px] px-4 py-3 text-sm" href="/my-orbit">
                  Back to My Orbit
                </Link>
              </div>
            ) : (
              <ResetPasswordForm token={token} />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
