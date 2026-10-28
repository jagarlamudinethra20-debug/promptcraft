CREATE TABLE public.competition_sessions (
  competition_id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'PAUSED',
  mode TEXT NOT NULL DEFAULT 'LIVE',
  results_locked BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  receipt_id TEXT NOT NULL UNIQUE,
  participant_name TEXT NOT NULL,
  registration_id TEXT NOT NULL,
  institution TEXT NOT NULL DEFAULT '',
  llm_model TEXT NOT NULL DEFAULT '',
  prompt_text TEXT NOT NULL,
  output_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'QUEUED',
  lease_expires_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX submissions_status_idx ON public.submissions (status);
CREATE INDEX submissions_created_idx ON public.submissions (created_at DESC);

CREATE TABLE public.evaluations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL UNIQUE REFERENCES public.submissions(id) ON DELETE CASCADE,
  total_competition_score NUMERIC NOT NULL DEFAULT 0,
  prompt_weighted_score NUMERIC NOT NULL DEFAULT 0,
  rubric_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb,
  prompt_analysis JSONB NOT NULL DEFAULT '[]'::jsonb,
  overall_feedback TEXT NOT NULL DEFAULT '',
  provider_name TEXT NOT NULL DEFAULT '',
  model_name TEXT NOT NULL DEFAULT '',
  eval_duration_ms INTEGER NOT NULL DEFAULT 0,
  manual_override BOOLEAN NOT NULL DEFAULT false,
  override_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.competition_sessions TO service_role;
GRANT ALL ON public.submissions TO service_role;
GRANT ALL ON public.evaluations TO service_role;

ALTER TABLE public.competition_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER competition_sessions_touch BEFORE UPDATE ON public.competition_sessions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER submissions_touch BEFORE UPDATE ON public.submissions
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER evaluations_touch BEFORE UPDATE ON public.evaluations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.competition_sessions (competition_id, status, mode, results_locked)
VALUES ('PROMPT_CRAFT_2026_EL_NINO', 'PAUSED', 'LIVE', false);