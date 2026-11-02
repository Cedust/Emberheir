# Cloud setup: Firebase, sign-in providers, Cloudflare Pages, legal pages

Release 1.0 adds cloud saves with sign-in, hosting on Cloudflare Pages and a Legal Notice and
Privacy page, built like Crucible (`Cedust/CrucibleIdleRpg`, `docs/CLOUD-SETUP.md` there).
Everything runs on free tiers without a credit card. Without these steps the game still runs:
a build without the Firebase values shows no sign-in and plays as a guest (local builds, GitHub
Pages).

How the sync works is in `apps/web/src/game/cloud/sync.ts` and in the GDD ("Spielstände").

## 1. Firebase project

Use a project of its own for Emberheir (not Crucible's), so accounts and saves of the two games
never mix.

1. Create a project in the [Firebase Console](https://console.firebase.google.com/). Analytics
   stays off.
2. **Firestore:** create a database in production mode in region `europe-west3` (Frankfurt).
   The region cannot be changed later.
3. **Rules:** publish `firebase/firestore.rules`, with
   `npx firebase-tools deploy --only firestore:rules --project <project-id>` or by pasting it in
   the Console (Firestore → Rules).
4. **Web app:** register a web app under Project settings. Its config gives the four values:
   `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`,
   `VITE_FIREBASE_APP_ID` (template: `apps/web/.env.example`).
5. **Authorized domains:** under Authentication → Settings add the game's domain, e.g.
   `emberheir.pages.dev` (and an own domain if there is one). Firebase has no wildcards: a
   Cloudflare preview whose sign-in you want to test needs its own entry.

## 2. Sign-in providers

Enable each under Authentication → Sign-in method. The Console shows the callback URL
`https://<project-id>.firebaseapp.com/__/auth/handler`.

- **Google:** enable and pick a support e-mail.
- **GitHub:** create an OAuth App under GitHub → Settings → Developer settings → OAuth Apps
  (a new one for Emberheir), enter the callback URL, copy Client ID and Client Secret into the
  Firebase Console.

Keep "One account per email address": a second provider with the same e-mail shows "This e-mail
first signed in with the other provider".

## 3. Cloudflare Pages

`.github/workflows/deploy-cloudflare.yml` builds and deploys: a push to `main` goes live, every
PR from this repository gets a preview at `<branch>.<project>.pages.dev`. It only runs once the
variable `CLOUDFLARE_PAGES_PROJECT` is set; GitHub Pages keeps running next to it.

1. In Cloudflare under Workers & Pages create a Pages project with "Direct Upload" (e.g.
   `emberheir`).
2. Use an API token with "Cloudflare Pages: Edit" (Crucible's token works if it covers the
   whole account).
3. In GitHub under Settings → Secrets and variables → Actions add:
   - Secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, the four `VITE_FIREBASE_*` values
     and the four `LEGAL_*` values (section 4).
   - Variable: `CLOUDFLARE_PAGES_PROJECT`.
4. Add the production domain to Firebase's authorized domains (section 1).

GitHub never shows a secret again after saving, and a personal account has no secrets shared by
all repositories. With the values in a local file, `gh secret set -f .env.local -R Cedust/Emberheir`
sets them all at once.

`apps/web/public/_headers` sets the headers on Cloudflare: a Content Security Policy that allows
only the game's own files plus Firebase Auth and Firestore, `Cross-Origin-Opener-Policy:
same-origin-allow-popups` for the sign-in window, a long cache for the hashed bundles under
`/assets/` and `no-cache` for the page itself.

## 4. Legal Notice and Privacy

With sign-in on a public site the game needs an Impressum and a Datenschutzerklärung (German
law). Both are pages in `apps/web/public/legal/`, linked from the Credits and the sign-in panel.

- Name, address and contact are not in the repository. The pages hold `%LEGAL_NAME%`,
  `%LEGAL_STREET%`, `%LEGAL_CITY%`, `%LEGAL_EMAIL%`; the Vite plugin
  `apps/web/scripts/legalPages.ts` fills them in, locally from `apps/web/.env.local`, in the deploy
  from the GitHub secrets of the same name.
- The Cloudflare deploy fails when a value is missing (`LEGAL_REQUIRED=true`). Other builds warn
  and show "[nicht konfiguriert]".
- The texts are a careful template, not legal advice. Have them checked before the launch.
