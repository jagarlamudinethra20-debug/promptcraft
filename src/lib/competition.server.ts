import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  COMPETITION_ID,
  COMPETITION_TOPIC,
  PROMPT_PARAMETERS,
  RUBRIC_PARAMETERS,
  type CompetitionState,
  type ScoreItem,
  type SubmissionRow,
} from "./competition-rubric";
import { RAG_CONTEXT } from "./rag-knowledge.server";

const ADMIN_PASSWORD = process.env['ADMIN_PASSWORD'] || "admin";

export function assertAdmin(key: string | undefined) {
  if (!key || key !== ADMIN_PASSWORD) {
    throw new Error("Unauthorized: invalid admin password");
  }
}

export function checkAdminPassword(password: string) {
  return password === ADMIN_PASSWORD;
}

export async function readState(): Promise<CompetitionState> {
  const { data, error } = await supabaseAdmin
    .from("competition_sessions")
    .select("status, mode, results_locked")
    .eq("competition_id", COMPETITION_ID)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) {
    const seed = { competition_id: COMPETITION_ID, status: "PAUSED", mode: "LIVE", results_locked: false };
    await supabaseAdmin.from("competition_sessions").insert(seed);
    return { status: "PAUSED", mode: "LIVE", results_locked: false };
  }
  return {
    status: data.status === "RUNNING" ? "RUNNING" : "PAUSED",
    mode: data.mode,
    results_locked: data.results_locked,
  };
}

export async function writeState(patch: Partial<CompetitionState>): Promise<CompetitionState> {
  await readState(); // guarantees the row exists
  const { data, error } = await supabaseAdmin
    .from("competition_sessions")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("competition_id", COMPETITION_ID)
    .select("status, mode, results_locked")
    .single();
  if (error) throw new Error(error.message);
  return {
    status: data.status === "RUNNING" ? "RUNNING" : "PAUSED",
    mode: data.mode,
    results_locked: data.results_locked,
  };
}

function receiptId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 4; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return `PC-${out}`;
}

export async function insertSubmission(input: {
  participant_name: string;
  registration_id: string;
  institution: string;
  llm_model: string;
  prompt_text: string;
  output_text: string;
}) {
  const state = await readState();
  if (state.status !== "RUNNING") {
    throw new Error("Submissions are currently closed.");
  }
  let lastError = "";
  for (let attempt = 0; attempt < 5; attempt++) {
    const receipt = receiptId();
    const { data, error } = await supabaseAdmin
      .from("submissions")
      .insert({ ...input, receipt_id: receipt, status: "QUEUED" })
      .select("id, receipt_id")
      .single();
    if (!error && data) return data;
    lastError = error?.message ?? "insert failed";
    if (!lastError.includes("duplicate")) break;
  }
  throw new Error(lastError);
}

export async function listSubmissions(): Promise<SubmissionRow[]> {
  const { data, error } = await supabaseAdmin
    .from("submissions")
    .select(
      "id, receipt_id, participant_name, registration_id, institution, llm_model, prompt_text, output_text, status, error_message, created_at, evaluations(total_competition_score, prompt_weighted_score, rubric_breakdown, prompt_analysis, overall_feedback, provider_name, model_name, manual_override, override_note)",
    )
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => {
    const evals = row['evaluations'] as unknown;
    const ev = Array.isArray(evals) ? evals[0] : evals;
    return { ...(row as object), evaluation: ev ?? null } as SubmissionRow;
  });
}

export async function queueTelemetry() {
  const rows = await supabaseAdmin.from("submissions").select("status");
  const counts = { queued: 0, processing: 0, evaluated: 0, failed: 0, total: 0 };
  for (const r of rows.data ?? []) {
    counts.total++;
    if (r.status === "QUEUED") counts.queued++;
    else if (r.status === "PROCESSING") counts.processing++;
    else if (r.status === "EVALUATED") counts.evaluated++;
    else counts.failed++;
  }
  return counts;
}

/* ------------------------------ AI judging ------------------------------ */

function buildJudgePrompt(sub: {
  participant_name: string;
  llm_model: string;
  prompt_text: string;
  output_text: string;
}) {
  return `You are the head judge of "PROMPT CRAFT", an on-the-spot AI prompt engineering competition.
TOPIC: ${COMPETITION_TOPIC}

GROUNDING KNOWLEDGE (use it to check factual/agronomic soundness):
${RAG_CONTEXT}

PARTICIPANT SUBMISSION
Model used: ${sub.llm_model || "unspecified"}
--- PROMPT ---
${sub.prompt_text}
--- AI OUTPUT ---
${sub.output_text || "(no output provided)"}
--- END ---

Score strictly and consistently.
A) Competition rubric — score each of these 7 parameters out of 100:
${RUBRIC_PARAMETERS.map((p, i) => `${i + 1}. ${p}`).join("\n")}

B) Prompt engineering analysis — score each of these 11 parameters out of 100:
${PROMPT_PARAMETERS.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Return ONLY JSON, no markdown fences, in exactly this shape:
{"rubric_breakdown":[{"parameter":"<exact name>","score":0,"comment":"<max 20 words>"}],
"prompt_analysis":[{"parameter":"<exact name>","score":0,"comment":"<max 15 words>"}],
"overall_feedback":"<3-5 sentences of specific, constructive feedback>"}`;
}

function coerceItems(raw: unknown, expected: readonly string[]): ScoreItem[] {
  const arr = Array.isArray(raw) ? raw : [];
  return expected.map((parameter) => {
    const found = arr.find(
      (i) =>
        i && typeof i === "object" &&
        String((i as Record<string, unknown>)['parameter'] ?? "").toLowerCase().slice(0, 12) ===
          parameter.toLowerCase().slice(0, 12),
    ) as Record<string, unknown> | undefined;
    const score = Number(found?.['score'] ?? 0);
    return {
      parameter,
      score: Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : 0,
      max: 100,
      comment: String(found?.['comment'] ?? ""),
    };
  });
}

const MODEL = "google/gemini-3.5-flash";

function extractJson(content: string) {
  const cleaned = content.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("AI judge returned no JSON");
  return JSON.parse(cleaned.slice(start, end + 1)) as Record<string, unknown>;
}

const SYSTEM_PROMPT = "You are a precise competition judge. You reply with raw JSON only.";

async function callGroq(prompt: string, apiKey: string) {
  const model = process.env['GROQ_MODEL'] ?? "openai/gpt-oss-120b";
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`Groq failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return { parsed: extractJson(json.choices?.[0]?.message?.content ?? ""), provider: "Groq", model };
}

async function callGemini(prompt: string, apiKey: string) {
  const model = process.env['GEMINI_MODEL'] ?? "gemini-3.6-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  return { parsed: extractJson(text), provider: "Gemini", model };
}

async function callLovableAI(prompt: string, apiKey: string) {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Lovable AI failed (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return {
    parsed: extractJson(json.choices?.[0]?.message?.content ?? ""),
    provider: "Lovable AI",
    model: MODEL,
  };
}

/**
 * Judge provider chain: Groq -> Gemini -> Lovable AI.
 * Each provider is skipped when its key is absent and retried down the chain on failure,
 * so a rate limit or outage on one provider never fails a submission outright.
 */
async function callJudge(prompt: string) {
  const groqKey = process.env['GROQ_API_KEY'];
  const geminiKey = process.env['GEMINI_API_KEY'];
  const lovableKey = process.env['LOVABLE_API_KEY'];

  const chain: { name: string; run: () => Promise<{ parsed: Record<string, unknown>; provider: string; model: string }> }[] = [];
  if (groqKey) chain.push({ name: "Groq", run: () => callGroq(prompt, groqKey) });
  if (geminiKey) chain.push({ name: "Gemini", run: () => callGemini(prompt, geminiKey) });
  if (lovableKey) chain.push({ name: "Lovable AI", run: () => callLovableAI(prompt, lovableKey) });
  if (!chain.length) throw new Error("No AI judge key configured");

  const errors: string[] = [];
  for (const step of chain) {
    try {
      return await step.run();
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  throw new Error(errors.join(" | ").slice(0, 400));
}


/** Claims one queued submission (lease-protected) and evaluates it. */
export async function processNextJob(): Promise<{ processed: boolean; receipt?: string; error?: string }> {
  const nowIso = new Date().toISOString();
  const staleIso = new Date(Date.now() - 2 * 60 * 1000).toISOString();

  const { data: candidates } = await supabaseAdmin
    .from("submissions")
    .select("id")
    .or(`status.eq.QUEUED,and(status.eq.PROCESSING,lease_expires_at.lt.${staleIso})`)
    .order("created_at", { ascending: true })
    .limit(1);

  const candidate = candidates?.[0];
  if (!candidate) return { processed: false };

  // Atomic claim: only succeeds if nobody else claimed it first.
  const { data: claimed } = await supabaseAdmin
    .from("submissions")
    .update({
      status: "PROCESSING",
      lease_expires_at: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
    })
    .eq("id", candidate.id)
    .or(`status.eq.QUEUED,lease_expires_at.lt.${staleIso}`)
    .select("id, participant_name, llm_model, prompt_text, output_text, receipt_id")
    .maybeSingle();

  if (!claimed) return { processed: false };

  const started = Date.now();
  try {
    const judged = await callJudge(buildJudgePrompt(claimed));
    const parsed = judged.parsed;
    const rubric = coerceItems(parsed['rubric_breakdown'], RUBRIC_PARAMETERS);
    const analysis = coerceItems(parsed['prompt_analysis'], PROMPT_PARAMETERS);
    const avg = (items: ScoreItem[]) =>
      items.length ? Math.round(items.reduce((s, i) => s + i.score, 0) / items.length) : 0;

    await supabaseAdmin.from("evaluations").upsert(
      {
        submission_id: claimed.id,
        total_competition_score: avg(rubric),
        prompt_weighted_score: avg(analysis),
        rubric_breakdown: rubric,
        prompt_analysis: analysis,
        overall_feedback: String(parsed['overall_feedback'] ?? ""),
        provider_name: judged.provider,
        model_name: judged.model,
        eval_duration_ms: Date.now() - started,
        manual_override: false,
      },
      { onConflict: "submission_id" },
    );

    await supabaseAdmin
      .from("submissions")
      .update({ status: "EVALUATED", lease_expires_at: null, error_message: null })
      .eq("id", claimed.id);

    return { processed: true, receipt: claimed.receipt_id };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabaseAdmin
      .from("submissions")
      .update({ status: "FAILED", lease_expires_at: null, error_message: message.slice(0, 500) })
      .eq("id", claimed.id);
    return { processed: true, receipt: claimed.receipt_id, error: message };
  } finally {
    void nowIso;
  }
}

export async function overrideScore(input: {
  submission_id: string;
  total_competition_score: number;
  note: string;
}) {
  const { data: existing } = await supabaseAdmin
    .from("evaluations")
    .select("submission_id")
    .eq("submission_id", input.submission_id)
    .maybeSingle();

  if (existing) {
    await supabaseAdmin
      .from("evaluations")
      .update({
        total_competition_score: input.total_competition_score,
        manual_override: true,
        override_note: input.note,
      })
      .eq("submission_id", input.submission_id);
  } else {
    await supabaseAdmin.from("evaluations").insert({
      submission_id: input.submission_id,
      total_competition_score: input.total_competition_score,
      manual_override: true,
      override_note: input.note,
      overall_feedback: "Manually scored by the competition admin.",
      provider_name: "Manual",
      model_name: "admin-override",
    });
  }
  await supabaseAdmin.from("submissions").update({ status: "EVALUATED" }).eq("id", input.submission_id);
}

export async function leaderboard() {
  const rows = await listSubmissions();
  const scored = rows
    .filter((r) => r.evaluation)
    .map((r) => ({
      receipt_id: r.receipt_id,
      participant_name: r.participant_name,
      institution: r.institution,
      registration_id: r.registration_id,
      score: Number(r.evaluation?.total_competition_score ?? 0),
      prompt_score: Number(r.evaluation?.prompt_weighted_score ?? 0),
    }))
    .sort((a, b) => b.score - a.score || a.participant_name.localeCompare(b.participant_name));

  let lastScore: number | null = null;
  let lastRank = 0;
  return scored.map((row, index) => {
    const rank = lastScore !== null && row.score === lastScore ? lastRank : index + 1;
    lastScore = row.score;
    lastRank = rank;
    return { ...row, rank };
  });
}

export async function exportCsv() {
  const rows = await listSubmissions();
  const header = [
    "receipt_id", "participant_name", "registration_id", "institution", "llm_model",
    "status", "total_score", "prompt_score", "manual_override", "feedback", "prompt_text", "output_text", "created_at",
  ];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [header.join(",")];
  for (const r of rows) {
    lines.push([
      r.receipt_id, r.participant_name, r.registration_id, r.institution, r.llm_model, r.status,
      r.evaluation?.total_competition_score ?? "", r.evaluation?.prompt_weighted_score ?? "",
      r.evaluation?.manual_override ?? false, r.evaluation?.overall_feedback ?? "",
      r.prompt_text, r.output_text, r.created_at,
    ].map(esc).join(","));
  }
  return lines.join("\n");
}
