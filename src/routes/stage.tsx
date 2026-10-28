import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { getStageBoard } from "@/lib/competition.functions";
import { COMPETITION_TOPIC } from "@/lib/competition-rubric";

export const Route = createFileRoute("/stage")({
  head: () => ({
    meta: [
      { title: "Stage Screen — PROMPT CRAFT" },
      { name: "description", content: "Auditorium projector view: join QR code and live top rankings for PROMPT CRAFT." },
      { property: "og:title", content: "Stage Screen — PROMPT CRAFT" },
      { property: "og:description", content: "Join QR code and live top rankings for PROMPT CRAFT." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: StagePage,
});

function StagePage() {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const board = useQuery({
    queryKey: ["stage-board"],
    queryFn: () => getStageBoard(),
    refetchInterval: 6000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const running = board.data?.state.status === "RUNNING";
  const rows = board.data?.rows ?? [];
  const qr = origin
    ? `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=10&data=${encodeURIComponent(origin)}`
    : "";

  return (
    <main className="min-h-screen px-8 py-10">
      <div className="mx-auto grid w-full max-w-7xl gap-10 lg:grid-cols-[420px_1fr]">
        <section className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.4em] text-primary">AI Competition 2026</p>
          <h1 className="mt-3 text-5xl font-black leading-none">PROMPT CRAFT</h1>
          <p className="mt-3 text-sm text-muted-foreground">{COMPETITION_TOPIC}</p>

          <div className="mt-8 inline-block rounded-3xl bg-primary p-4">
            {qr && <img src={qr} alt="QR code linking to the PROMPT CRAFT submission portal" className="h-72 w-72 rounded-2xl" />}
          </div>
          <p className="mt-4 break-all font-mono text-sm text-muted-foreground">{origin}</p>
          <p
            className={`mt-6 inline-block rounded-full px-5 py-2 text-lg font-bold ${
              running ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
            }`}
          >
            {running ? "SUBMISSIONS OPEN" : "SUBMISSIONS CLOSED"}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-black uppercase tracking-wider text-muted-foreground">Top 10</h2>
          <div className="mt-5 space-y-3">
            {rows.length === 0 && (
              <p className="rounded-2xl border border-border bg-card p-12 text-center text-lg text-muted-foreground">
                Awaiting the first judged submissions…
              </p>
            )}
            {rows.map((r) => (
              <div
                key={`${r.rank}-${r.participant_name}`}
                className={`flex items-center gap-6 rounded-2xl border px-6 py-4 ${
                  r.rank <= 3 ? "border-primary/50 bg-primary/10" : "border-border bg-card"
                }`}
              >
                <span className={`w-14 text-4xl font-black ${r.rank <= 3 ? "text-primary" : "text-muted-foreground"}`}>
                  {r.rank}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-2xl font-bold">{r.participant_name}</p>
                  {r.institution && <p className="truncate text-sm text-muted-foreground">{r.institution}</p>}
                </div>
                <span className="text-4xl font-black text-primary">{Math.round(r.score)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
