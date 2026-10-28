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
    const link = String(body.url || "").slice(0, 600).trim();
    const categories = Array.isArray(body.categories) ? body.categories.slice(0, 40).map(String) : [];
    if (!caption && !link) return json({ error: "texte_vide" }, 400, cors);

    // Le relais va lire lui-même le titre et la description publics de la vidéo à partir du lien.
    const meta = link ? await readLink(link) : {};
    const parts = [];
    if (caption) parts.push("Légende : " + caption);
    if (meta.title) parts.push("Titre de la publication : " + meta.title);
    if (meta.description && meta.description !== meta.title) parts.push("Description : " + meta.description);
    if (meta.author) parts.push("Auteur : " + meta.author);
    if (!parts.length) return json({ error: "lecture_impossible" }, 422, cors);
    const input = parts.join("\n").slice(0, 5000);

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
      "Tu classes une vidéo de réseau social (d'après sa légende, son titre ou sa description) pour une bibliothèque personnelle. Réponds en français, " +
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
          input,
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

const GENERIC = /^(facebook|instagram|tiktok|youtube|log ?in|connexion|se connecter|watch|reels?|vid(e|é)o)$/i;
function clean(t) {
  t = String(t || "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(nbsp|eacute|egrave|ecirc|agrave|acirc|ccedil|ocirc|ugrave|icirc|euml|iuml|Eacute);/g, (_, e) =>
      ({ nbsp: " ", eacute: "é", egrave: "è", ecirc: "ê", agrave: "à", acirc: "â", ccedil: "ç", ocirc: "ô",
         ugrave: "ù", icirc: "î", euml: "ë", iuml: "ï", Eacute: "É" })[e])
    .replace(/\s+/g, " ").trim();
  return GENERIC.test(t) ? "" : t.slice(0, 1500);
}
async function getJson(u) {
  try { const r = await fetch(u, { headers: { "Accept": "application/json" } }); return r.ok ? await r.json() : null; }
  catch { return null; }
}
async function readLink(link) {
  let u; try { u = new URL(link); } catch { return {}; }
  if (!/^https?:$/.test(u.protocol)) return {};
  const host = u.hostname.replace(/^www\.|^m\./, "");
  if (/(^|\.)youtube\.com$|^youtu\.be$/.test(host)) {
    const d = await getJson("https://www.youtube.com/oembed?format=json&url=" + encodeURIComponent(link));
    if (d) return { title: clean(d.title), author: clean(d.author_name) };
  }
  if (/(^|\.)tiktok\.com$/.test(host)) {
    const d = await getJson("https://www.tiktok.com/oembed?url=" + encodeURIComponent(link));
    if (d) return { title: clean(d.title), author: clean(d.author_name) };
  }
  // Facebook, Instagram et autres : on lit les balises de partage (og:title, og:description) de la page.
  try {
    const r = await fetch(link, { redirect: "follow", headers: {
      "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
      "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.6" } });
    if (!r.ok) return {};
    const html = (await r.text()).slice(0, 400000);
    const tag = (name) => {
      const re = new RegExp('<meta[^>]+(?:property|name)=["\']' + name + '["\'][^>]*>', "i");
      const m = html.match(re); if (!m) return "";
      const c = m[0].match(/content=["']([^"']*)["']/i); return c ? clean(c[1]) : "";
    };
    const t = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return { title: tag("og:title") || (t ? clean(t[1]) : ""), description: tag("og:description") || tag("description") };
  } catch { return {}; }
}

function json(obj, status, headers) {
  return new Response(JSON.stringify(obj), { status, headers: { ...headers, "Content-Type": "application/json" } });
}
