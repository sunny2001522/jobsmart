-- 新增 value_scores 欄位至 job_applications 表
-- 用於存儲 20 個價值觀因素的評分

ALTER TABLE public.job_applications
ADD COLUMN value_scores JSONB DEFAULT NULL;

-- 建立索引以支援 status 查詢（如需要批次重算）
CREATE INDEX IF NOT EXISTS job_applications_value_scores_status_idx
ON public.job_applications ((value_scores->>'status'));

-- 建立索引以支援按加權總分排序
CREATE INDEX IF NOT EXISTS job_applications_weighted_score_idx
ON public.job_applications (((value_scores->>'weightedScore')::float) DESC NULLS LAST);

-- 添加註釋
COMMENT ON COLUMN public.job_applications.value_scores IS
'JSON 結構存儲 20 個價值觀因素的評分，包含 status, scores, weightedScore, rankingSnapshot';
