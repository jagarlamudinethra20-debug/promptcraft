import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { PasswordGate } from "@/components/PasswordGate";
import { readAdminKey } from "@/lib/admin-key";
import { getLeaderboard } from "@/lib/competition.functions";

export const Route = createFileRoute("/leaderboard")({
  head: () => ({
    meta: [
      { title: "Live Leaderboard — PROMPT CRAFT" },
      { name: "description", content: "Live ranked results for the PROMPT CRAFT prompt engineering challenge." },
      { property: "og:title", content: "Live Leaderboard — PROMPT CRAFT" },
      { property: "og:description", content: "Live ranked results for the PROMPT CRAFT challenge." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeaderboardPage,
});

function LeaderboardPage() {
  const [key, setKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setKey(readAdminKey());
    setReady(true);
  }, []);

  if (!ready) return <main className="min-h-screen" />;
  if (!key) return <PasswordGate title="Live Leaderboard" onUnlock={setKey} />;
  return <Board adminKey={key} />;
}

function Board({ adminKey }: { adminKey: string }) {
  const board = useQuery({
    queryKey: ["leaderboard"],
    queryFn: () => getLeaderboard({ data: { key: adminKey } }),
    refetchInterval: 6000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const rows = board.data?.rows ?? [];

  return (
    <main className="min-h-screen px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">PROMPT CRAFT</p>
          <h1 className="mt-2 text-3xl font-black">Live Leaderboard</h1>
          {board.data?.state.results_locked && (
            <p className="mt-2 inline-block rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              Final results locked
            </p>
          )}
        </header>

        <div className="mt-8 space-y-2">
          {rows.length === 0 && (
            <p className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
              No evaluated submissions yet.
            </p>
          )}
          {rows.map((r) => (
            <div
              key={r.receipt_id}
              className={`flex items-center gap-4 rounded-xl border px-4 py-3 ${
                r.rank <= 3 ? "border-primary/40 bg-primary/5" : "border-border bg-card"
              }`}
            >
              <span className={`w-10 text-2xl font-black ${r.rank <= 3 ? "text-primary" : "text-muted-foreground"}`}>
                {r.rank}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{r.participant_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {r.receipt_id}
                  {r.institution ? ` · ${r.institution}` : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-black text-primary">{Math.round(r.score)}</p>
                <p className="text-[11px] text-muted-foreground">prompt {Math.round(r.prompt_score)}</p>
              </div>
            </div>
          ))}
        </div>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          <Link to="/admin" className="hover:text-primary">Back to admin</Link>
        </footer>
      </div>
    </main>
  );
}
