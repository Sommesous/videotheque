// Renseigne ici les deux informations de ton projet Supabase
// (Supabase > Project Settings > API Keys, ou bouton « Connect »).
// La clé publishable (ou anon) est prévue pour être publique : la sécurité
// vient des règles créées par supabase-setup.sql. N'y mets JAMAIS la clé « secret » ou « service_role ».
window.VIDEOTHEQUE_CONFIG = {
  supabaseUrl: "https://dfrlyncqcnypcfcrclje.supabase.co",
  supabaseKey: "sb_publishable_L6c6uzB6l1JRN07HDGzIyA_mFwNr1hv",

  // Relais Cloudflare Worker pour l'IA Gemini
  aiWorkerUrl: "https://videotheque-ia.torios7.workers.dev"
};
