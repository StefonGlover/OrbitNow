"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import type {
  ApiRouteResponse,
  OrbitPasswordResetConfirmResponse,
} from "@/lib/types";

const inputClassName = "ui-input placeholder:text-slate-500";
const labelClassName = "ui-label mb-2 block";

export function ResetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatusMessage(null);
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
        }),
      });
      const json =
        (await response.json()) as ApiRouteResponse<OrbitPasswordResetConfirmResponse>;

      if (!response.ok || !json.success) {
        throw new Error(
          json.success
            ? "OrbitNow could not complete the password reset."
            : json.error.message,
        );
      }

      setPassword("");
      setStatusMessage("Password reset complete. You can sign in from My Orbit now.");
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "OrbitNow could not complete the password reset.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <form className="ui-panel grid gap-4 p-5" onSubmit={handleSubmit}>
        <div>
          <label className={labelClassName} htmlFor="resetPassword">
            New password
          </label>
          <input
            autoComplete="new-password"
            className={inputClassName}
            id="resetPassword"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimum 8 characters"
            type="password"
            value={password}
          />
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            className="ui-btn-primary"
            disabled={isSubmitting || password.length < 8}
            type="submit"
          >
            {isSubmitting ? "Resetting..." : "Reset password"}
          </button>
          <Link className="ui-btn-secondary rounded-[20px] px-4 py-3 text-sm" href="/my-orbit">
            Back to My Orbit
          </Link>
        </div>
      </form>

      {statusMessage ? (
        <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
          {statusMessage}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-100">
          {error}
        </div>
      ) : null}
    </>
  );
}
