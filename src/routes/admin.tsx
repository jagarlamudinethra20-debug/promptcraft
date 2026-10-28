import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PasswordGate } from "@/components/PasswordGate";
import { clearAdminKey, readAdminKey } from "@/lib/admin-key";
import type { SubmissionRow } from "@/lib/competition-rubric";
import {
  adminDashboard,
  deleteSubmission,
  evaluateQueue,
  exportSubmissionsCsv,
  overrideSubmissionScore,
  setCompetitionStatus,
  setResultsLocked,
} from "@/lib/competition.functions";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Command Center — PROMPT CRAFT" },
      { name: "description", content: "Run the PROMPT CRAFT competition: submissions, judging queue and results." },
      { property: "og:title", content: "Admin Command Center — PROMPT CRAFT" },
      { property: "og:description", content: "Competition control panel for PROMPT CRAFT." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAdminKey(readAdminKey());
    setReady(true);
  }, []);

  if (!ready) return <main className="min-h-screen" />;
  if (!adminKey) return <PasswordGate title="Admin Command Center" onUnlock={setAdminKey} />;
  return <Dashboard adminKey={adminKey} onSignOut={() => { clearAdminKey(); setAdminKey(null); }} />;
}

const STATUS_STYLES: Record<string, string> = {
  QUEUED: "bg-secondary text-muted-foreground",
  PROCESSING: "bg-accent/20 text-accent",
  EVALUATED: "bg-primary/15 text-primary",
  FAILED: "bg-destructive/15 text-destructive",
  REVIEW_REQUIRED: "bg-destructive/15 text-destructive",
};

function Dashboard({ adminKey, onSignOut }: { adminKey: string; onSignOut: () => void }) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);

  const dash = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminDashboard({ data: { key: adminKey } }),
    refetchInterval: 5000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-dashboard"] });

  const statusMutation = useMutation({
    mutationFn: (status: "RUNNING" | "PAUSED") => setCompetitionStatus({ data: { key: adminKey, status } }),
    onSuccess: invalidate,
  });

  const lockMutation = useMutation({
    mutationFn: (locked: boolean) => setResultsLocked({ data: { key: adminKey, locked } }),
    onSuccess: invalidate,
  });

  const evaluate = useMutation({
    mutationFn: () => evaluateQueue({ data: { key: adminKey } }),
    onSuccess: (res) => {
      setBanner(res.processed ? `Judged ${res.processed} submission(s).` : "Nothing left in the queue.");
      invalidate();
    },
    onError: (e: Error) => setBanner(e.message),
  });

  const removeSubmission = useMutation({
    mutationFn: (id: string) => deleteSubmission({ data: { key: adminKey, submission_id: id } }),
    onSuccess: invalidate,
  });

  const override = useMutation({
    mutationFn: (v: { submission_id: string; total_competition_score: number; note: string }) =>
      overrideSubmissionScore({ data: { key: adminKey, ...v } }),
    onSuccess: () => {
      setBanner("Score overridden.");
      invalidate();
    },
  });

  const exportCsv = useMutation({
    mutationFn: () => exportSubmissionsCsv({ data: { key: adminKey } }),
    onSuccess: ({ csv }) => {
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const a = document.createElement("a");
      a.href = url;
      a.download = `prompt-craft-results-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    },
  });

  // Auto-drain the queue while jobs are waiting.
  const queued = dash.data?.queue.queued ?? 0;
  useEffect(() => {
    if (queued > 0 && !evaluate.isPending) {
      const t = setTimeout(() => evaluate.mutate(), 1500);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [queued, evaluate.isPending]);

  if (dash.isError) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md text-center">
          <p className="text-sm text-destructive">{(dash.error as Error).message}</p>
          <button className="mt-4 rounded-lg border border-border px-4 py-2 text-sm" onClick={onSignOut}>
            Sign out
          </button>
        </div>
      </main>
    );
  }

  const state = dash.data?.state;
  const running = state?.status === "RUNNING";
  const submissions = dash.data?.submissions ?? [];
  const queue = dash.data?.queue;

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">PROMPT CRAFT</p>
            <h1 className="mt-1 text-2xl font-black">Admin Command Center</h1>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => exportCsv.mutate()}
              className="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-secondary"
            >
              CSV
            </button>
            <button onClick={onSignOut} className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-secondary">
              Sign out
            </button>
          </div>
        </div>

        <section
          className={`mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border px-5 py-4 ${
            running ? "border-primary/40 bg-primary/10" : "border-destructive/40 bg-destructive/10"
          }`}
        >
          <div>
            <p className={`text-lg font-bold ${running ? "text-primary" : "text-destructive"}`}>
              {dash.isLoading && !state ? "Loading…" : running ? "ONLINE — accepting submissions" : "OFFLINE — submissions paused"}
            </p>
            <p className="text-xs text-muted-foreground">
              Results {state?.results_locked ? "locked" : "unlocked"} · mode {state?.mode ?? "—"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              disabled={statusMutation.isPending}
              onClick={() => {
                if (running && !confirm("Stop submissions? The participant portal will close immediately.")) return;
                statusMutation.mutate(running ? "PAUSED" : "RUNNING");
              }}
              className={`rounded-lg px-4 py-2 text-sm font-bold disabled:opacity-50 ${
                running
                  ? "bg-destructive text-destructive-foreground"
                  : "bg-primary text-primary-foreground"
              }`}
            >
              {statusMutation.isPending ? "Saving…" : running ? "Stop submissions" : "Start competition"}
            </button>
            <button
              disabled={lockMutation.isPending}
              onClick={() => lockMutation.mutate(!state?.results_locked)}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              {state?.results_locked ? "Unlock results" : "Lock final results"}
            </button>
          </div>
        </section>

        <section className="mt-6 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Live queue telemetry</h2>
            <button
              onClick={() => evaluate.mutate()}
              disabled={evaluate.isPending}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground disabled:opacity-50"
            >
              {evaluate.isPending ? "Judging…" : "⚡ Evaluate queue"}
            </button>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {[
              ["Total", queue?.total ?? 0],
              ["Queued", queue?.queued ?? 0],
              ["Processing", queue?.processing ?? 0],
              ["Evaluated", queue?.evaluated ?? 0],
              ["Failed", queue?.failed ?? 0],
            ].map(([label, value]) => (
              <div key={label as string} className="rounded-xl border border-border bg-background px-3 py-3">
                <p className="text-2xl font-black">{value as number}</p>
                <p className="text-xs text-muted-foreground">{label as string}</p>
              </div>
            ))}
          </div>
          {banner && <p className="mt-3 text-xs text-muted-foreground">{banner}</p>}
        </section>

        <section className="mt-6 overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-left text-sm">
            <thead className="bg-secondary/60 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Receipt</th>
                <th className="px-4 py-3">Participant</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Prompt score</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {submissions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    No submissions yet.
                  </td>
                </tr>
              )}
              {submissions.map((s) => (
                <SubmissionRowView
                  key={s.id}
                  row={s}
                  expanded={expanded === s.id}
                  onToggle={() => setExpanded(expanded === s.id ? null : s.id)}
                  onOverride={(score, note) =>
                    override.mutate({ submission_id: s.id, total_competition_score: score, note })
                  }
                  onDelete={() => {
                    if (confirm(`Delete submission ${s.receipt_id}?`)) removeSubmission.mutate(s.id);
                  }}
                />
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}

function SubmissionRowView({
  row,
  expanded,
  onToggle,
  onOverride,
  onDelete,
}: {
  row: SubmissionRow;
  expanded: boolean;
  onToggle: () => void;
  onOverride: (score: number, note: string) => void;
  onDelete: () => void;
}) {
  const [score, setScore] = useState("");
  const [note, setNote] = useState("");
  const ev = row.evaluation;

  return (
    <>
      <tr className="border-t border-border">
        <td className="px-4 py-3 font-mono font-semibold text-primary">{row.receipt_id}</td>
        <td className="px-4 py-3">
          <p className="font-medium">{row.participant_name}</p>
          <p className="text-xs text-muted-foreground">
            {row.registration_id}
            {row.institution ? ` · ${row.institution}` : ""}
          </p>
        </td>
        <td className="px-4 py-3">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLES[row.status] ?? ""}`}>
            {row.status}
          </span>
        </td>
        <td className="px-4 py-3 font-bold">
          {ev ? Math.round(Number(ev.total_competition_score)) : "—"}
          {ev?.manual_override && <span className="ml-1 text-xs text-accent">(manual)</span>}
        </td>
        <td className="px-4 py-3">{ev ? Math.round(Number(ev.prompt_weighted_score)) : "—"}</td>
        <td className="px-4 py-3 text-right">
          <button onClick={onToggle} className="rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">
            {expanded ? "Hide" : "View"}
          </button>
        </td>
      </tr>
      {expanded && (
        <tr className="border-t border-border bg-background/60">
          <td colSpan={6} className="px-4 py-5">
            <div className="grid gap-5 lg:grid-cols-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Prompt</h3>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-card p-3 font-mono text-xs">
                  {row.prompt_text}
                </pre>
                <h3 className="mt-4 text-xs font-bold uppercase tracking-wider text-muted-foreground">AI output</h3>
                <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-card p-3 text-xs">
                  {row.output_text || "(none provided)"}
                </pre>
              </div>
              <div>
                {row.error_message && (
                  <p className="mb-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
                    {row.error_message}
                  </p>
                )}
                {ev ? (
                  <>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Feedback</h3>
                    <p className="mt-2 rounded-lg border border-border bg-card p-3 text-xs leading-relaxed">
                      {ev.overall_feedback || "—"}
                    </p>
                    <ScoreTable title="Competition rubric" items={ev.rubric_breakdown} />
                    <ScoreTable title="Prompt engineering analysis" items={ev.prompt_analysis} />
                    {ev.override_note && (
                      <p className="mt-3 text-xs text-accent">Override note: {ev.override_note}</p>
                    )}
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">Not judged yet.</p>
                )}

                <div className="mt-5 rounded-lg border border-border bg-card p-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Manual override
                  </h3>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <input
                      value={score}
                      onChange={(e) => setScore(e.target.value)}
                      placeholder="Score 0-100"
                      inputMode="numeric"
                      className="w-28 rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
                    />
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Audit note (required)"
                      className="min-w-40 flex-1 rounded-lg border border-input bg-background px-2 py-1.5 text-xs"
                    />
                    <button
                      onClick={() => {
                        const n = Number(score);
                        if (!Number.isFinite(n) || n < 0 || n > 100) return alert("Score must be 0-100.");
                        if (note.trim().length < 3) return alert("An audit note is required.");
                        onOverride(n, note.trim());
                        setScore("");
                        setNote("");
                      }}
                      className="rounded-lg bg-accent px-3 py-1.5 text-xs font-bold text-accent-foreground"
                    >
                      Apply
                    </button>
                  </div>
                  <button onClick={onDelete} className="mt-3 text-xs text-destructive hover:underline">
                    Delete submission
                  </button>
                </div>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ScoreTable({ title, items }: { title: string; items: { parameter: string; score: number; comment: string }[] }) {
  if (!items?.length) return null;
  return (
    <div className="mt-4">
      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <div className="mt-2 space-y-1.5">
        {items.map((i) => (
          <div key={i.parameter} className="rounded-lg border border-border bg-card px-3 py-2">
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-medium">{i.parameter}</span>
              <span className="font-bold text-primary">{i.score}</span>
            </div>
            {i.comment && <p className="mt-1 text-[11px] text-muted-foreground">{i.comment}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
