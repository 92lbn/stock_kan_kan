-- ⚠️ MIGRATION DESTRUCTIVE — SAUVEGARDE SUPABASE OBLIGATOIRE AVANT DÉPLOIEMENT.
-- Ce fichier ne doit être appliqué qu'après validation explicite de la sauvegarde.
-- Il ne supprime aucune table stock/planning/notes/users/auth/audit.

DROP TABLE IF EXISTS "recipe_ingredients";
DROP TABLE IF EXISTS "recipes";
DROP TABLE IF EXISTS "scheduled_posts";
DROP TABLE IF EXISTS "media_assets";
DROP TABLE IF EXISTS "content_ideas";
DROP TABLE IF EXISTS "daily_forecasts";
DROP TABLE IF EXISTS "ledger_entries" CASCADE;

DROP TYPE IF EXISTS "RecipeCategory";
DROP TYPE IF EXISTS "SocialPlatform";
DROP TYPE IF EXISTS "PostStatus";
DROP TYPE IF EXISTS "LedgerEntryType";
