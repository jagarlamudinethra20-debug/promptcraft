// Client-safe shared constants for the PROMPT CRAFT competition.

export const COMPETITION_ID = "PROMPT_CRAFT_2026_EL_NINO";

export const COMPETITION_TOPIC =
  "Super El Niño Mitigation in Agriculture (South & Southeast Asia)";

export const RUBRIC_PARAMETERS = [
  "Relevance to El Niño Agricultural Mitigation",
  "Prompt Clarity & Specificity",
  "Contextual Grounding & Domain Accuracy",
  "Output Quality & Usefulness",
  "Innovation & Creativity",
  "Feasibility & Practicality",
  "Ethical & Responsible AI Use",
] as const;

export const PROMPT_PARAMETERS = [
  "Role Assignment",
  "Task Definition",
  "Context Provision",
  "Constraints & Boundaries",
  "Output Format Specification",
  "Tone & Style Control",
  "Examples / Few-shot Guidance",
  "Reasoning / Chain-of-Thought Cues",
  "Audience Targeting",
  "Evidence & Data Grounding",
  "Iteration & Refinement Hooks",
] as const;

export type ScoreItem = {
  parameter: string;
  score: number;
  max: number;
  comment: string;
};

export type SubmissionStatus =
  | "QUEUED"
  | "PROCESSING"
  | "EVALUATED"
  | "REVIEW_REQUIRED"
  | "FAILED";

export type SubmissionRow = {
  id: string;
  receipt_id: string;
  participant_name: string;
  registration_id: string;
  institution: string;
  llm_model: string;
  prompt_text: string;
  output_text: string;
  status: SubmissionStatus;
  error_message: string | null;
  created_at: string;
  evaluation: {
    total_competition_score: number;
    prompt_weighted_score: number;
    rubric_breakdown: ScoreItem[];
    prompt_analysis: ScoreItem[];
    overall_feedback: string;
    provider_name: string;
    model_name: string;
    manual_override: boolean;
    override_note: string | null;
  } | null;
};

export type CompetitionState = {
  status: "RUNNING" | "PAUSED";
  mode: string;
  results_locked: boolean;
};
