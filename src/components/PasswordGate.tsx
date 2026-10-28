import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { adminLogin } from "@/lib/competition.functions";
import { writeAdminKey } from "@/lib/admin-key";

export function PasswordGate({ title, onUnlock }: { title: string; onUnlock: (key: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const login = useMutation({
    mutationFn: (p: string) => adminLogin({ data: { password: p } }),
    onSuccess: (res) => {
      if (res.ok) {
        writeAdminKey(password);
        onUnlock(password);
      } else {
        setError("Incorrect password.");
      }
    },
    onError: () => setError("Could not verify password. Try again."),
  });

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        className="w-full max-w-sm rounded-2xl border border-border bg-card p-8"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          login.mutate(password);
        }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">PROMPT CRAFT</p>
        <h1 className="mt-2 text-xl font-bold">{title}</h1>
        <label className="mt-6 mb-1.5 block text-sm font-medium" htmlFor="pw">
          Password
        </label>
        <input
          id="pw"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
        />
        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
        <button
          type="submit"
          disabled={login.isPending}
          className="mt-5 w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground disabled:opacity-50"
        >
          {login.isPending ? "Checking…" : "Unlock"}
        </button>
      </form>
    </main>
  );
}
