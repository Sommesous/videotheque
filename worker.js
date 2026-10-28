// Relais Gemini pour Ma Vidéothèque — à déployer sur Cloudflare Workers (offre gratuite).
// Il garde ta clé Gemini secrète : l'application publique n'appelle que CE relais,
// jamais Gemini directement, donc ta clé n'apparaît jamais dans le code public.
//
// Réglages à définir dans Cloudflare (Settings → Variables and Secrets) :
//   GEMINI_API_KEY   (secret)   ta clé Gemini, depuis aistudio.google.com/apikey
//   ALLOWED_ORIGIN   (texte)    ex. https://ton-pseudo.github.io   — refuse les appels venus d'ailleurs

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN || "*";
    const cors = {
      "Access-Control-Allow-Origin": allowed,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST") return json({ error: "methode_refusee" }, 405, cors);

    const origin = request.headers.get("Origin") || "";
    if (allowed !== "*" && origin !== allowed) return json({ error: "origine_refusee" }, 403, cors);
    if (!env.GEMINI_API_KEY) return json({ error: "cle_absente" }, 500, cors);

    let body;
    try { body = await request.json(); } catch { return json({ error: "requete_invalide" }, 400, cors); }
    const caption = String(body.caption || "").slice(0, 4000).trim();
    const categories = Array.isArray(body.categories) ? body.categories.slice(0, 40).map(String) : [];
    if (!caption) return json({ error: "texte_vide" }, 400, cors);

    const schema = {
      type: "object",
      properties: {
        kind:        { type: "string", enum: ["video", "recipe", "product", "outfit", "place"] },
        title:       { type: "string" },
        ingredients: { type: "string" },
        price:       { type: "string" },
        address:     { type: "string" },
        category:    { type: "string" },
      },
      required: ["kind", "title", "ingredients", "price", "address", "category"],
    };
    const instructions =
      "Tu classes la légende d'une vidéo de réseau social pour une bibliothèque personnelle. Réponds en français, " +
      "uniquement avec les champs demandés. kind : 'recipe' si c'est une recette de cuisine, 'product' si c'est un objet " +
      "ou un produit à acheter, 'place' si c'est un lieu précis (restaurant, ville, adresse), 'outfit' si c'est une tenue " +
      "vestimentaire, sinon 'video'. title : titre court et concret (6 mots maximum), sans guillemets. " +
      "ingredients : un ingrédient par ligne si kind=recipe, chaîne vide sinon. price : le prix tel qu'il apparaît si " +
      "kind=product, chaîne vide sinon. address : l'adresse ou la ville si kind=place, chaîne vide sinon. " +
      "category : si une de ces catégories existantes convient clairement, reprends-la exactement : [" +
      categories.join(" | ") + "] — sinon propose un nom court et naturel en français (deux mots maximum), " +
      "sans jamais inventer une catégorie proche d'une existante.";

    let upstream;
    try {
      upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({
          model: "gemini-3.8-flash",
          system_instruction: instructions,
          input: caption,
          response_format: { type: "text", mime_type: "application/json", schema },
        }),
      });
    } catch {
      return json({ error: "gemini_injoignable" }, 502, cors);
    }
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      return json({ error: "gemini_erreur", status: upstream.status, detail: detail.slice(0, 300) }, 502, cors);
    }
    const data = await upstream.json();
    const text = (data.steps || [])
      .filter(s => s.type === "model_output")
      .flatMap(s => s.content || [])
      .filter(b => b.type === "text")
      .map(b => b.text)
      .join("");
    if (!text) return json({ error: "reponse_vide" }, 502, cors);

    let parsed;
    try { parsed = JSON.parse(text); } catch { return json({ error: "reponse_invalide" }, 502, cors); }
    return json(parsed, 200, cors);
  },
};

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, "Content-Type": "application/json" } });
}
