-- 系统级 LLM provider 表：前后台统一的事实源。
-- 播种当前两套正在使用的配置（来源：docker-compose env = agnes 主力，
-- src/server/.env = stepfun，scripts/kp_crawl.py 的双 provider 轮换验证过组合）。
-- Idempotent: re-applying does nothing.
CREATE TABLE IF NOT EXISTS "ai_providers" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "name" TEXT NOT NULL,
  "base_url" TEXT NOT NULL,
  "api_key" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_providers_pkey" PRIMARY KEY ("id")
);

-- NOTE: api_key 不在此硬编码。由部署时通过环境变量 + Prisma seed
-- (src/server/seed.ts) 注入真实 key，避免密钥进入 git 历史/镜像。
-- 占位值仅用于结构演示；实际运行前必须更新为有效 key（否则 callLlm 回落 env）。
INSERT INTO "ai_providers" ("name", "base_url", "api_key", "model", "priority", "enabled")
SELECT 'agnes（主力）', 'https://api.agnes-ai.cn/v1',
       '<SET_VIA_ENV:AGNES_API_KEY>',
       'agnes-2.5-flash', 10, true
WHERE NOT EXISTS (SELECT 1 FROM "ai_providers" WHERE "base_url" LIKE '%agnes%');

INSERT INTO "ai_providers" ("name", "base_url", "api_key", "model", "priority", "enabled")
SELECT 'stepfun（兜底）', 'https://api.stepfun.com/step_plan/v1',
       '<SET_VIA_ENV:STEPFUN_API_KEY>',
       'step-3.7-flash', 20, true
WHERE NOT EXISTS (SELECT 1 FROM "ai_providers" WHERE "base_url" LIKE '%stepfun%');
