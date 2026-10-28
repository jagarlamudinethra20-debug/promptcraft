import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getCompetitionState = createServerFn({ method: "GET" }).handler(async () => {
  const { readState } = await import("./competition.server");
  return readState();
});

export const submitEntry = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        participant_name: z.string().trim().min(1).max(120),
        registration_id: z.string().trim().min(1).max(60),
        institution: z.string().trim().max(160).default(""),
        llm_model: z.string().trim().max(80).default(""),
        prompt_text: z.string().trim().min(10),
        output_text: z.string().trim().default(""),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const mod = await import("./competition.server");
    const created = await mod.insertSubmission(data);
    // fire-and-forget: start judging immediately
    void mod.processNextJob().catch(() => undefined);
    return created;
  });

export const adminLogin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ password: z.string() }).parse(data))
  .handler(async ({ data }) => {
    const { checkAdminPassword } = await import("./competition.server");
    return { ok: checkAdminPassword(data.password) };
  });

const keyed = z.object({ key: z.string() });

export const adminDashboard = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => keyed.parse(data))
  .handler(async ({ data }) => {
    const mod = await import("./competition.server");
    mod.assertAdmin(data.key);
    const [state, submissions, queue] = await Promise.all([
      mod.readState(),
      mod.listSubmissions(),
      mod.queueTelemetry(),
    ]);
    return { state, submissions, queue };
  });

export const setCompetitionStatus = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    keyed.extend({ status: z.enum(["RUNNING", "PAUSED"]) }).parse(data),
  )
  .handler(async ({ data }) => {
    const mod = await import("./competition.server");
    mod.assertAdmin(data.key);
    return mod.writeState({ status: data.status });
  });

export const setResultsLocked = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => keyed.extend({ locked: z.boolean() }).parse(data))
  .handler(async ({ data }) => {
    const mod = await import("./competition.server");
    mod.assertAdmin(data.key);
    return mod.writeState({ results_locked: data.locked });
  });

export const evaluateQueue = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => keyed.parse(data))
  .handler(async ({ data }) => {
    const mod = await import("./competition.server");
    mod.assertAdmin(data.key);
    const results: { receipt: string | null; error: string | null }[] = [];
    for (let i = 0; i < 5; i++) {
      const r = await mod.processNextJob();
      if (!r.processed) break;
      results.push({ receipt: r.receipt ?? null, error: r.error ?? null });
    }
    return { processed: results.length, results };
  });

export const overrideSubmissionScore = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    keyed
      .extend({
        submission_id: z.string().uuid(),
        total_competition_score: z.number().min(0).max(100),
        note: z.string().trim().min(3),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const mod = await import("./competition.server");
    mod.assertAdmin(data.key);
    await mod.overrideScore(data);
    return { ok: true };
  });

export const deleteSubmission = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => keyed.extend({ submission_id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const mod = await import("./competition.server");
    mod.assertAdmin(data.key);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("submissions").delete().eq("id", data.submission_id);
    return { ok: true };
  });

export const exportSubmissionsCsv = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => keyed.parse(data))
  .handler(async ({ data }) => {
    const mod = await import("./competition.server");
    mod.assertAdmin(data.key);
    return { csv: await mod.exportCsv() };
  });

export const getLeaderboard = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => keyed.parse(data))
  .handler(async ({ data }) => {
    const mod = await import("./competition.server");
    mod.assertAdmin(data.key);
    const [rows, state] = await Promise.all([mod.leaderboard(), mod.readState()]);
    return { rows, state };
  });

export const getStageBoard = createServerFn({ method: "GET" }).handler(async () => {
  const mod = await import("./competition.server");
  const [rows, state] = await Promise.all([mod.leaderboard(), mod.readState()]);
  return {
    state,
    rows: rows.slice(0, 10).map((r) => ({
      rank: r.rank,
      participant_name: r.participant_name,
      institution: r.institution,
      score: r.score,
    })),
  };
});
