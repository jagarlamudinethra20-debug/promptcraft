import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { getCompetitionState, submitEntry } from "@/lib/competition.functions";
import { COMPETITION_TOPIC } from "@/lib/competition-rubric";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PROMPT CRAFT — AI Prompt Engineering Challenge" },
      {
        name: "description",
        content:
          "Submit your entry to PROMPT CRAFT, the on-the-spot AI prompt engineering challenge on Super El Niño mitigation in agriculture.",
      },
      { property: "og:title", content: "PROMPT CRAFT — AI Prompt Engineering Challenge" },
      {
        property: "og:description",
        content: "On-the-spot prompt engineering challenge: Super El Niño mitigation in agriculture.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ParticipantPortal,
});

const FIELDS = [
  { name: "participant_name", label: "Full name", required: true },
  { name: "registration_id", label: "Registration ID", required: true },
  { name: "institution", label: "Institution", required: false },
  { name: "llm_model", label: "LLM model used (e.g. ChatGPT, Gemini)", required: false },
] as const;

function ParticipantPortal() {
  const [form, setForm] = useState<Record<string, string>>({});
  const [receipt, setReceipt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const stateQuery = useQuery({
    queryKey: ["competition-state"],
    queryFn: () => getCompetitionState(),
    refetchInterval: 5000,
  });

  const submit = useMutation({
    mutationFn: (payload: {
      participant_name: string;
      registration_id: string;
      institution: string;
      llm_model: string;
      prompt_text: string;
      output_text: string;
    }) => submitEntry({ data: payload }),
    onSuccess: (data) => {
      setReceipt(data.receipt_id);
      setError(null);
    },
    onError: (e: Error) => setError(e.message),
  });

  const open = stateQuery.data?.status === "RUNNING";

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto w-full max-w-2xl">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">VIAT AI Day 2026</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">PROMPT CRAFT</h1>
          <p className="mt-2 text-sm text-muted-foreground">{COMPETITION_TOPIC}</p>
        </header>

        <div
          className={`mt-6 rounded-xl border px-4 py-3 text-center text-sm font-semibold ${
            open
              ? "border-primary/40 bg-primary/10 text-primary"
              : "border-destructive/40 bg-destructive/10 text-destructive"
          }`}
        >
          {stateQuery.isLoading
            ? "Checking competition status…"
            : open
              ? "● Submissions are OPEN"
              : "● Submissions are CLOSED"}
        </div>

        {receipt ? (
          <section className="mt-8 rounded-2xl border border-primary/40 bg-card p-8 text-center">
            <h2 className="text-lg font-semibold">Submission received</h2>
            <p className="mt-2 text-sm text-muted-foreground">Your receipt code</p>
            <p className="mt-3 font-mono text-4xl font-black text-primary">{receipt}</p>
            <p className="mt-4 text-sm text-muted-foreground">
              Keep this code. Your entry is queued for AI judging.
            </p>
            <button
              className="mt-6 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary"
              onClick={() => {
                setReceipt(null);
                setForm({});
              }}
            >
              Submit another entry
            </button>
          </section>
        ) : !open ? (
          <section className="mt-8 rounded-2xl border border-border bg-card p-8 text-center">
            <h2 className="text-lg font-semibold">Please wait</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Submissions have not opened yet. Please wait for the event coordinator to start the
              competition. This page updates automatically.
            </p>
          </section>
        ) : (
          <form
            className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6"
            onSubmit={(e) => {
              e.preventDefault();
              setError(null);
              submit.mutate({
                participant_name: form['participant_name'] ?? "",
                registration_id: form['registration_id'] ?? "",
                institution: form['institution'] ?? "",
                llm_model: form['llm_model'] ?? "",
                prompt_text: form['prompt_text'] ?? "",
                output_text: form['output_text'] ?? "",
              });
            }}
          >
            {FIELDS.map((f) => (
              <div key={f.name}>
                <label className="mb-1.5 block text-sm font-medium" htmlFor={f.name}>
                  {f.label} {f.required && <span className="text-primary">*</span>}
                </label>
                <input
                  id={f.name}
                  required={f.required}
                  value={form[f.name] ?? ""}
                  onChange={(e) => setForm((s) => ({ ...s, [f.name]: e.target.value }))}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
              </div>
            ))}

            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="prompt_text">
                Your prompt <span className="text-primary">*</span>
              </label>
              <textarea
                id="prompt_text"
                required
                rows={8}
                value={form['prompt_text'] ?? ""}
                onChange={(e) => setForm((s) => ({ ...s, prompt_text: e.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 font-mono text-sm outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="output_text">
                AI output produced by your prompt
              </label>
              <textarea
                id="output_text"
                rows={8}
                value={form['output_text'] ?? ""}
                onChange={(e) => setForm((s) => ({ ...s, output_text: e.target.value }))}
                className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none focus:border-primary"
              />
            </div>

            {error && (
              <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submit.isPending}
              className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {submit.isPending ? "Submitting…" : "Submit entry"}
            </button>
          </form>
        )}

        <footer className="mt-8 flex justify-center gap-4 text-xs text-muted-foreground">
          <Link to="/leaderboard" className="hover:text-primary">Leaderboard</Link>
          <Link to="/stage" className="hover:text-primary">Stage view</Link>
          <Link to="/admin" className="hover:text-primary">Admin</Link>
        </footer>
      </div>
    </main>
  );
}
