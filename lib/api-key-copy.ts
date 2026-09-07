/**
 * The 42 key page, in both languages.
 *
 * The page explains why the site asks for a key at all, which is the one thing
 * a student has to understand before handing over credentials. Explaining it
 * only in English on a French campus defeats the point, so both versions live
 * here rather than being scattered through the markup.
 */

export type Language = "en" | "fr";

export const LANGUAGE_STORAGE_KEY = "42insight:language";

export const copy = {
  en: {
    switchLabel: "English",
    titleConnected: "Your 42 API key",
    titleConnect: "Connect your 42 API key",
    subtitle: "42Insight reads everything live from the 42 API, on your key.",
    why:
      "42Insight is becoming a site that runs on its own. No database to keep in sync, no background jobs to babysit, nothing that quietly breaks when the person maintaining it looks away: everything is read live from the 42 API, and nothing is stored. That is what asks a key of you today, and it is also what makes the site something anyone can clone and run rather than one person's to keep alive.",
    quota:
      "With your key you browse on your own budget: 1200 requests an hour that nobody else draws from. The site's own 42 application stays reserved for signing people in, because 42 meters per application and a busy afternoon on a shared key would spend the budget logging in depends on.",
    transparency:
      "Nothing happens behind your back. The counter in the top left shows how many requests are in flight, and opening it lists every call made on your key: which endpoint, what it answered, how long it took.",
    storage:
      "Your credentials are exchanged for a token and sealed into an encrypted, httpOnly cookie that lasts a month. They are never written to a database or a log. There is no database here.",
    step1Before: "Open ",
    step1Link: "Settings → API → Register a new app",
    step1After: " on the intra.",
    step2Before: "Give it any name, and any valid redirect URI. ",
    step2Code: "http://localhost",
    step2After:
      " does. The site signs its own requests with the credentials, so this flow never redirects anywhere; the field simply cannot be left empty.",
    step3: "Copy its UID and secret below.",
    existingBefore: "Already registered an application? ",
    existingLink: "Find it in your existing apps",
    existingAfter:
      " and reuse its credentials. There is no need to create another one.",
    clientId: "Client ID (UID)",
    clientSecret: "Client secret",
    connect: "Connect my key",
    checking: "Checking with 42…",
    thisHour: "This hour",
    left: "left",
    reportedBy: (at: string) => `Reported by the 42 API${at}.`,
    reportedAt: (time: string) => ` at ${time}`,
    notUsedYet:
      "Not used yet on this server, so this is the full budget.",
    guideCreatedBy: "Created by you",
    guideUid: "this is your Client ID",
    guideSecret: "this is your Client secret",
    guideValidUntil:
      "42 replaces this secret every 30 days, counted from when the application was created. The intra shows the expiry date, and the secret that will take over under NEXT SECRET. When it rotates, come back here and reconnect your key.",
    guideCaption:
      "On the intra, your application page looks roughly like this. Copy the two fields marked below.",
    guideNextSecret: "NEXT SECRET",
    activityTitle: "Recent 42 API calls",
    activityEmpty: "Nothing fetched yet on this server.",
    activityCaption:
      "Once your key is connected, the counter in the header opens onto this: everything the site has asked the 42 API for, on your key.",
    forget: "Forget my key",
    replace: "Replace it",
    connected: "Key connected. The rest of the site is open.",
    forgotten: "Key forgotten.",
    rejected: "Could not authenticate those credentials",
    unreachable: "Could not reach the server",
  },
  fr: {
    switchLabel: "Français",
    titleConnected: "Votre clé API 42",
    titleConnect: "Connectez votre clé API 42",
    subtitle:
      "42Insight lit tout en direct depuis l'API 42, avec votre clé.",
    why:
      "42Insight cherche à tourner tout seul. Plus de base de données à tenir à jour, plus de tâches de fond à surveiller, plus rien qui casse en silence dès qu'on regarde ailleurs : tout est lu en direct depuis l'API 42, et rien n'est stocké. C'est ce qui vous demande une clé aujourd'hui, et c'est aussi ce qui rend le site clonable et utilisable par n'importe qui, au lieu de dépendre d'une seule personne.",
    quota:
      "Avec votre clé, vous naviguez sur votre propre budget : 1200 requêtes par heure que personne d'autre n'entame. L'application 42 du site reste réservée à la connexion, car 42 compte par application et un après-midi chargé sur une clé partagée consommerait le budget dont la connexion dépend.",
    transparency:
      "Rien ne se passe dans votre dos. Le compteur en haut à gauche indique combien de requêtes sont en cours, et l'ouvrir liste chaque appel parti sur votre clé : quel endpoint, ce qu'il a répondu, combien de temps il a pris.",
    storage:
      "Vos identifiants sont échangés contre un jeton, puis scellés dans un cookie chiffré et httpOnly valable un mois. Ils ne sont jamais écrits dans une base ni dans un journal. Il n'y a pas de base de données ici.",
    step1Before: "Ouvrez ",
    step1Link: "Settings → API → Register a new app",
    step1After: " sur l'intra.",
    step2Before: "Donnez-lui le nom que vous voulez, et une redirect URI valide. ",
    step2Code: "http://localhost",
    step2After:
      " convient. Le site signe ses requêtes directement avec les identifiants, donc aucune redirection n'a lieu ; le champ ne peut simplement pas rester vide.",
    step3: "Copiez son UID et son secret ci-dessous.",
    existingBefore: "Vous avez déjà une application ? ",
    existingLink: "Retrouvez-la dans vos applications",
    existingAfter:
      " et réutilisez ses identifiants. Inutile d'en créer une autre.",
    clientId: "Client ID (UID)",
    clientSecret: "Client secret",
    connect: "Connecter ma clé",
    checking: "Vérification auprès de 42…",
    thisHour: "Cette heure-ci",
    left: "restantes",
    reportedBy: (at: string) => `Chiffre renvoyé par l'API 42${at}.`,
    reportedAt: (time: string) => ` à ${time}`,
    notUsedYet:
      "Pas encore utilisée sur ce serveur : c'est le budget complet.",
    guideCreatedBy: "Created by you",
    guideUid: "c'est votre Client ID",
    guideSecret: "c'est votre Client secret",
    guideValidUntil:
      "42 remplace ce secret tous les 30 jours, comptés depuis la création de l'application. L'intra affiche la date d'expiration, et le secret qui prendra le relais sous NEXT SECRET. Quand il tourne, revenez ici reconnecter votre clé.",
    guideCaption:
      "Sur l'intra, la page de votre application ressemble à ceci. Copiez les deux champs indiqués ci-dessous.",
    guideNextSecret: "NEXT SECRET",
    activityTitle: "Recent 42 API calls",
    activityEmpty: "Nothing fetched yet on this server.",
    activityCaption:
      "Une fois votre clé connectée, le compteur de l'en-tête s'ouvre là-dessus : tout ce que le site a demandé à l'API 42, avec votre clé.",
    forget: "Oublier ma clé",
    replace: "La remplacer",
    connected: "Clé connectée. Le reste du site est ouvert.",
    forgotten: "Clé oubliée.",
    rejected: "42 a refusé ces identifiants",
    unreachable: "Serveur injoignable",
  },
} as const;

/**
 * French unless the browser says otherwise, since this is a French campus --
 * but only as a starting point: the choice, once made, is what counts.
 */
export const detectLanguage = (): Language => {
  if (typeof window === "undefined") return "fr";

  try {
    const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored === "en" || stored === "fr") return stored;
  } catch {
    // Storage refused; fall through to the browser's own preference.
  }

  return navigator.language?.toLowerCase().startsWith("en") ? "en" : "fr";
};
