# Ma Vidéothèque — synchronisée PC, iPhone, iPad

Tes vidéos YouTube, TikTok, Instagram et Facebook, rangées par catégories. Un ajout sur un appareil apparaît en quelques secondes sur les autres. Sans réseau, l'app continue de marcher et envoie les changements au retour de la connexion.

**Fiches par type** : en ajoutant une vidéo, choisis son type — Vidéo, Recette, Produit, Tenue ou Lieu. Une Recette propose un champ Ingrédients, un Produit un champ Prix, un Lieu une Adresse (avec un lien direct vers la carte). Tu filtres ensuite par type comme par catégorie, et la recherche regarde aussi dans ces champs.

**Design « Mosaïque Nuit »** : fond sombre et doré, tuiles en mosaïque (2 colonnes sur téléphone, 3 à 4 sur tablette et PC), une couleur par catégorie (modifiable dans *Réglages*). Touche une tuile pour ouvrir sa fiche : grande image, bouton « Regarder », ingrédients, prix ou adresse, note, modifier ou supprimer.

**Miniature au moment de ton choix** : depuis l'ajout ou la fiche, touche **Miniature**.
- *Ma capture* (toutes plateformes) : mets la vidéo en pause au bon moment, fais une capture d'écran, importe-la, recadre-la (glisser + zoom). Elle est enregistrée en 720 × 900 px dans ton espace privé Supabase et apparaît sur tous tes appareils. Une connexion Internet est nécessaire pour l'envoyer.
- *Image YouTube* (YouTube uniquement) : l'image que YouTube affiche pour la vidéo. Ce n'est pas un moment choisi, et ces adresses d'images ne sont pas documentées officiellement par YouTube : elles pourraient changer.
- *Moment de la vidéo* (ex. 1:05) : sur YouTube, « Regarder » ouvre la vidéo à cet instant. TikTok, Instagram et Facebook ne le permettent pas de façon fiable : le moment y sert de repère.

Pourquoi pas une extraction automatique de l'image ? Les vidéos sont affichées par le site d'origine et le navigateur interdit à une autre application de lire leurs images. La capture d'écran est la seule méthode qui marche partout.

**Analyse automatique (facultative)** : colle la légende de la vidéo dans le champ dédié et touche **Analyser**. Une IA gratuite (Gemini, de Google) détecte le type, remplit les champs, propose un titre et choisit la catégorie. Tu vérifies et tu ajoutes. Cette fonction est optionnelle et désactivée par défaut — voir l'étape 5 pour l'activer.

**Fonctionnement** : l'application est hébergée gratuitement sur GitHub Pages. Tes données sont dans une base Supabase gratuite qui t'appartient. Tu te connectes avec un e-mail et un mot de passe, et chaque compte ne voit que ses propres vidéos.

Compte une trentaine de minutes, une seule fois. Fais tout sur ton **PC Windows**.

---

## Étape 1 — Créer la base de données (Supabase)

1. Va sur **supabase.com** → *Start your project*, et crée un compte (avec GitHub, c'est le plus rapide).
2. **New project** :
   - Nom : `videotheque`
   - *Database password* : clique sur *Generate*. Tu n'en auras pas besoin ensuite.
   - Région : **Europe (Paris ou Frankfurt)**
   - Clique sur *Create new project* et attends environ 2 minutes.
3. Menu de gauche → **SQL Editor** → *New query*. Ouvre le fichier `supabase-setup.sql`, copie tout son contenu, colle-le, puis clique sur **Run**. Le message attendu est *Success. No rows returned*.
4. Menu de gauche → **Authentication** → **Sign In / Providers** (ou *Providers*) → **Email** :
   - Vérifie qu'**Email** est activé.
   - **Désactive « Confirm email »** : tu pourras te connecter tout de suite, sans e-mail de confirmation.
   - Enregistre.
5. Récupère les deux informations de connexion avec le bouton **Connect** en haut, ou dans **Project Settings → API Keys** :
   - **Project URL**, de la forme `https://xxxxxxxx.supabase.co`
   - **Publishable key** (`sb_publishable_…`) ou, à défaut, la clé **anon**

> ⚠️ Ne copie jamais la clé **secret** ou **service_role**. Elle donne tous les droits sur la base.

## Étape 2 — Renseigner config.js

Ouvre `config.js` avec le Bloc-notes (clic droit → Ouvrir avec → Bloc-notes) et colle tes deux valeurs entre les guillemets :

```js
window.VIDEOTHEQUE_CONFIG = {
  supabaseUrl: "https://xxxxxxxx.supabase.co",
  supabaseKey: "sb_publishable_xxxxxxxxxxxx"
};
```

Enregistre. La clé publishable est faite pour être publique : la sécurité vient des règles créées à l'étape 1.

## Étape 3 — Mettre l'application en ligne (GitHub Pages)

1. Sur **github.com** (même compte que Supabase si tu l'as utilisé) : **New repository** → nom `videotheque` → **Public** → *Create repository*.
2. Clique sur **uploading an existing file**. Glisse **tout le contenu** du dossier (index.html, config.js, sw.js, manifest.webmanifest, supabase-setup.sql, et les dossiers `icons` et `lib`), puis **Commit changes**.
3. **Settings → Pages** → *Branch* : `main` et `/ (root)` → **Save**.
4. Une à deux minutes plus tard, ton adresse s'affiche : `https://<ton-pseudo>.github.io/videotheque/`. **Garde-la**, elle sert pour tous tes appareils.

## Étape 4 — Créer ton compte et verrouiller

1. Ouvre ton adresse sur le PC. Saisis ton e-mail et un mot de passe, puis clique sur **Créer mon compte**.
2. Retourne dans Supabase → **Authentication → Sign In / Providers** et **désactive « Allow new users to sign up »**. Plus personne ne pourra créer de compte sur ta base, toi compris : tu te connecteras toujours avec le compte que tu viens de créer.
3. **Note ton mot de passe** quelque part. En cas d'oubli : Supabase → *Authentication → Users* → ton compte → *Send password recovery*. Le plus simple reste de ne pas l'oublier.

---

## Étape 5 (facultative) — Activer l'analyse automatique (Gemini)

Sans cette étape, l'application fonctionne normalement : tu classes tout toi-même. Avec elle, une IA gratuite propose le classement à partir de la légende que tu colles. Compte 15 minutes.

**Pourquoi un détour par Cloudflare ?** Ton site est hébergé sur un dépôt GitHub **public** — c'est la condition pour que GitHub Pages soit gratuit. Si la clé Gemini était écrite directement dans `config.js`, n'importe qui pourrait la lire sur GitHub et épuiser ton quota gratuit à ta place. Le relais Cloudflare garde la clé cachée : ton application publique ne lui envoie que le texte à analyser, jamais la clé.

### A. Créer la clé Gemini
1. Va sur **aistudio.google.com/apikey** et connecte-toi avec un compte Google.
2. **Create API key**. Aucune carte bancaire n'est demandée pour l'offre gratuite.
3. Copie la clé (elle commence par `AIza…`). Garde-la de côté, elle ne sera collée que dans Cloudflare, jamais dans GitHub.

> Sur l'offre gratuite, Google utilise ce que tu lui envoies pour améliorer ses produits. Pour une légende de vidéo, l'enjeu est limité, mais sache-le.

### B. Créer le relais sur Cloudflare (gratuit)
1. Va sur **dash.cloudflare.com**, crée un compte.
2. Menu **Workers & Pages → Create → Create Worker**. Donne-lui un nom, par exemple `videotheque-ia`, puis **Deploy** (le code par défaut est remplacé ensuite).
3. Clique sur **Edit code**. Supprime tout le contenu affiché et colle à la place le contenu du fichier `worker.js` fourni. Clique sur **Deploy**.
4. Retourne sur la page du Worker → **Settings → Variables and Secrets** :
   - Ajoute une variable **GEMINI_API_KEY**, type **Secret**, colle ta clé Gemini.
   - Ajoute une variable **ALLOWED_ORIGIN**, type texte, avec ton adresse GitHub Pages **sans / final** : `https://<ton-pseudo>.github.io`
   - **Save and deploy**.
5. Note l'adresse de ton Worker, affichée en haut de sa page : `https://videotheque-ia.<ton-compte>.workers.dev`.

### C. Relier l'application
Ouvre `config.js` et complète la troisième ligne :
```js
aiWorkerUrl: "https://videotheque-ia.<ton-compte>.workers.dev"
```
Mets à jour ce fichier sur GitHub. Le bouton **Analyser** apparaît alors sur tous tes appareils.

**Limites** : l'offre gratuite de Gemini et celle de Cloudflare Workers (100 000 appels par jour) suffisent largement pour un usage personnel, mais leurs conditions peuvent changer — vérifie leurs pages officielles si un message d'erreur inhabituel apparaît. Si le quota gratuit est atteint, l'application te le signale et tu peux toujours classer la vidéo à la main.

## Installer sur chaque appareil

### PC Windows (Edge ou Chrome)
1. Ouvre ton adresse, connecte-toi.
2. Clique sur **Installer l'app**, ou sur l'icône d'installation à droite de la barre d'adresse. L'app obtient sa fenêtre et son icône dans le menu Démarrer.
3. **Ajouter une vidéo depuis le navigateur** : ouvre *Réglages* en bas de l'app et glisse le bouton **＋ Vidéothèque** dans ta barre de favoris. Ensuite, sur une page YouTube, TikTok, Instagram ou Facebook, un clic sur ce favori ouvre la vidéo dans l'app, prête à classer. Si la barre de favoris est cachée : *Ctrl + Maj + B*.

### iPhone et iPad (Safari)
1. Ouvre ton adresse dans **Safari**, connecte-toi.
2. Touche **Partager → Sur l'écran d'accueil**.
3. **Ajouter depuis Instagram, TikTok ou YouTube** : Apple n'autorise pas les apps web dans le menu « Partager ». Crée donc ce **Raccourci**, une fois sur iPhone et une fois sur iPad :
   - App **Raccourcis** → **+** → nomme-le « Vidéothèque ».
   - Touche ⓘ → active **Afficher dans la feuille de partage**. Dans *Types reçus*, garde **URL** et **Texte**.
   - Ajoute l'action **Encoder en URL** (entrée : *Entrée du raccourci*).
   - Ajoute l'action **Ouvrir les URL** et tape : `https://<ton-pseudo>.github.io/videotheque/?text=`, puis insère la variable **Texte encodé en URL** juste après le `=`.
   - Utilisation : dans l'app vidéo, **Partager → Vidéothèque** (parfois sous *Plus* ou en bas de la liste). Safari s'ouvre avec le lien prêt, tu choisis la catégorie et tu touches *Ajouter*.

> Le Raccourci ouvre Safari plutôt que l'icône de l'écran d'accueil. Ce n'est plus un problème : tout est synchronisé par ton compte. Connecte-toi une fois dans Safari et une fois dans l'icône.

### Android (si un jour)
Installe l'app depuis Chrome : elle apparaît directement dans le menu « Partager ».

---

## Au quotidien

- **Point de couleur en haut** : vert = synchronisé, orange = envoi en cours, gris = hors ligne (les changements partent au retour du réseau), rouge = problème. Touche-le pour relancer la synchronisation.
- **Une carte marquée « en attente »** n'est pas encore arrivée sur la base.
- **Sauvegarde** : *Réglages → Exporter (.json)* de temps en temps, par précaution.
- **Anciennes vidéos** : celles enregistrées avec la version précédente, sur le même appareil et à la même adresse, sont ajoutées automatiquement à ton compte à la première connexion. Sinon, exporte-les depuis l'ancienne version et utilise *Importer un fichier*.

## Bon à savoir

- **Mise en pause Supabase (offre gratuite)** : un projet gratuit est mis en pause s'il n'a quasiment aucune activité pendant 7 jours. Ouvrir l'app quelques fois par semaine suffit à l'éviter. Si c'est arrivé : Supabase → ton projet → **Resume project**. Tes données sont conservées, et restaurables jusqu'à un an après la pause.
- **Les conditions gratuites de Supabase et de GitHub peuvent changer.** Vérifie leurs pages de tarifs si un message inhabituel apparaît.
- **Le dépôt GitHub public rend visible le code**, pas tes vidéos : elles ne sont accessibles qu'avec ton mot de passe.
- **Stockage des images** : l'offre gratuite de Supabase inclut 1 Go de fichiers (50 Mo maximum par fichier) d'après sa page de tarifs. Une miniature pèse en général 60 à 200 Ko : cela laisse plusieurs milliers d'images (estimation, la taille dépend de chaque image).
- **Hors ligne** : les vidéos restent consultables, mais les images envoyées depuis un autre appareil ne s'affichent qu'avec une connexion (elles sont privées et servies par des liens temporaires valables 7 jours, renouvelés automatiquement).
- **L'export .json ne contient pas les images**, seulement la liste et les réglages.
- **Liens raccourcis** (`vm.tiktok.com`, `facebook.com/share/…`) : deux liens différents vers la même vidéo peuvent échapper à la détection des doublons.

## Mettre à jour l'application

Remplace les fichiers modifiés sur GitHub (*Add file → Upload files*, en écrasant les anciens). Si tu changes autre chose que `config.js`, modifie aussi la ligne `const CACHE = "videotheque-sync-vX"` dans `sw.js` (vX+1) pour que les appareils récupèrent la nouvelle version.

**Si tu avais déjà installé une version précédente** : remplace sur GitHub `index.html`, `sw.js`, `manifest.webmanifest` et le dossier `icons`, puis dans Supabase → **SQL Editor**, relance `supabase-setup.sql` en entier. Il ajoute les colonnes (miniature, moment, couleur) et l'espace d'images privé `thumbs`, sans toucher à tes vidéos. Tant que ce n'est pas fait, l'app affiche « Base à mettre à jour ». Rouvre ensuite l'app sur chaque appareil.

**Si le script signale une erreur sur `storage.buckets`** : crée l'espace à la main dans Supabase → **Storage → New bucket**, nom `thumbs`, **Public désactivé**, puis relance le script (la partie règles d'accès passera).

## Contenu du dossier

| Fichier | Rôle |
|---|---|
| `index.html` | L'application |
| `config.js` | Tes informations Supabase (à remplir) |
| `supabase-setup.sql` | Création de la base (étape 1) |
| `sw.js` | Fonctionnement hors ligne |
| `manifest.webmanifest` | Nom, icônes, installation |
| `lib/supabase.js` | Bibliothèque officielle Supabase (v2.117.2, licence MIT incluse) |
| `worker.js` | Relais IA à déployer sur Cloudflare Workers (étape 5, facultative) |
| `icons/` | Icônes |
