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
      "The site's own 42 application is reserved for signing people in. 42 meters per application, so if pages were fetched on it too, a busy afternoon would spend the budget logging in depends on — and nobody could sign in until the hour rolled over. Your key is yours alone: 1200 requests an hour that nobody else draws from.",
    storage:
      "Your credentials are exchanged for a token and sealed into an encrypted, httpOnly cookie that lasts a month. They are never written to a database or a log — there is no database here.",
    step1Before: "Open ",
    step1Link: "Settings → API → Register a new app",
    step1After: " on the intra.",
    step2Before: "Give it any name, and any valid redirect URI — ",
    step2Code: "http://localhost",
    step2After:
      " does. The site signs its own requests with the credentials, so this flow never redirects anywhere; the field simply cannot be left empty.",
    step3: "Copy its UID and secret below.",
    existingBefore: "Already registered an application? ",
    existingLink: "Find it in your existing apps",
    existingAfter:
      " and reuse its credentials — there is no need to create another.",
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
      "Valid until a date shown here — 42 rotates it, and you will need to reconnect your key when it does.",
    guideIgnore:
      "Leave \"Revoke OAuth Grant\" and \"Replace now\" alone: the first cuts the app off, the second invalidates the secret you are about to copy.",
    guideCaption:
      "On the intra, your application page looks roughly like this. Copy the two fields marked below.",
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
      "L'application 42 du site est réservée à la connexion. 42 compte par application : si les pages y puisaient aussi, un après-midi chargé consommerait le budget dont la connexion dépend — et plus personne ne pourrait se connecter avant le changement d'heure. Votre clé n'appartient qu'à vous : 1200 requêtes par heure que personne d'autre n'entame.",
    storage:
      "Vos identifiants sont échangés contre un jeton, puis scellés dans un cookie chiffré et httpOnly valable un mois. Ils ne sont jamais écrits dans une base ni dans un journal — il n'y a pas de base de données ici.",
    step1Before: "Ouvrez ",
    step1Link: "Settings → API → Register a new app",
    step1After: " sur l'intra.",
    step2Before: "Donnez-lui le nom que vous voulez, et une redirect URI valide — ",
    step2Code: "http://localhost",
    step2After:
      " convient. Le site signe ses requêtes directement avec les identifiants, donc aucune redirection n'a lieu ; le champ ne peut simplement pas rester vide.",
    step3: "Copiez son UID et son secret ci-dessous.",
    existingBefore: "Vous avez déjà une application ? ",
    existingLink: "Retrouvez-la dans vos applications",
    existingAfter:
      " et réutilisez ses identifiants — inutile d'en créer une autre.",
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
      "Une date de validité est affichée ici — 42 fait tourner le secret, et il faudra reconnecter votre clé à ce moment-là.",
    guideIgnore:
      "Ne touchez pas à « Revoke OAuth Grant » ni à « Replace now » : le premier coupe l'application, le second invalide le secret que vous vous apprêtez à copier.",
    guideCaption:
      "Sur l'intra, la page de votre application ressemble à ceci. Copiez les deux champs indiqués ci-dessous.",
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
