"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Account = { role: string; email: string; password: string };
export function EvaluatorAccess({
  onChoose,
  disabled,
}: {
  onChoose: (account: Account) => void;
  disabled: boolean;
}) {
  const [access, setAccess] = useState<{
    mode: string;
    url?: string;
    accounts?: Account[];
  }>({ mode: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/evaluator-access", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (response) =>
        response.ok ? response.json() : { mode: "disabled" },
      )
      .then(setAccess)
      .catch(() => {
        if (!controller.signal.aborted) setAccess({ mode: "disabled" });
      });
    return () => controller.abort();
  }, []);
  return (
    <section
      aria-labelledby="evaluator-heading"
      className="mt-7 space-y-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 backdrop-blur-xl"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">
          Tech Pioneers · SIH 2026
        </p>
        <h2 id="evaluator-heading" className="mt-2 text-lg font-semibold">
          Explore as an evaluator
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Choose a role below to view its evaluation login details.
        </p>
      </div>
      {["sandbox", "shared", "shared-pending"].includes(access.mode) ? (
        <>
          <p className="text-xs text-muted-foreground">
            These are public, shared accounts with normal role permissions.
            Changes are visible to other evaluators. Do not upload personal
            documents or use these accounts for real applications.
            {access.mode.startsWith("shared")
              ? " These accounts use the current platform database."
              : " AI generation and external email delivery are disabled."}
          </p>
          <div className="space-y-3">
            {access.accounts?.map((account) => (
              <details
                key={account.role}
                className="rounded-xl border border-border bg-background/40 p-3"
              >
                <summary className="cursor-pointer text-sm font-semibold capitalize">
                  {account.role} guest access
                </summary>
                <p className="mt-3 text-xs font-medium text-primary">
                  For evaluation purposes only
                </p>
                {access.mode === "shared-pending" && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Setup pending — this guest login is not yet activated.
                  </p>
                )}
                <dl className="mt-3 space-y-2 text-xs">
                  <div>
                    <dt className="text-muted-foreground">Email</dt>
                    <dd className="break-all select-all">{account.email}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      Public demo password
                    </dt>
                    <dd className="break-all select-all font-mono">
                      {account.password}
                    </dd>
                  </div>
                </dl>
                <Button
                  type="button"
                  variant="outline"
                  disabled={disabled || access.mode === "shared-pending"}
                  className="mt-3 w-full"
                  onClick={() => onChoose(account)}
                >
                  Use {account.role} credentials
                </Button>
              </details>
            ))}
          </div>
        </>
      ) : access.mode === "external" ? (
        <a
          href={access.url}
          className="inline-flex rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
        >
          Open evaluator demo →
        </a>
      ) : (
        <p role="status" className="text-sm text-muted-foreground">
          {access.mode === "loading"
            ? "Checking evaluator access…"
            : "Guest access is being prepared. Regular account sign-in remains available above."}
        </p>
      )}
    </section>
  );
}
