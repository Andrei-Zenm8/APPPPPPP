# Apol

**A treatment-implementation tracker for healthcare specialists and their patients.**

Treatment usually fails somewhere between the consultation room and the patient's kitchen table. The patient forgets what they were told, cannot remember why an item matters, has no way to record whether they actually did it, and misses the follow-up appointment. The specialist finds out six weeks later, with no evidence of what happened in between.

Apol closes that loop. The patient sees exactly what to do today, why it matters, and logs it in one tap. The specialist sees adherence and outcome trends per patient, ranked so the person who is slipping surfaces first — while there is still time to intervene.

## Running it

```bash
npm install
npm start          # then press i (iOS), a (Android), or w (web)

npm run web        # web / desktop browser directly
npm run typecheck  # TypeScript, strict mode
npm run build:web  # static export to dist/
```

One codebase ships to iPhone, Android, and — via React Native Web — Windows, macOS and any browser. The navigation shell switches between a thumb-reachable bottom bar and a desktop side rail at 900px.

Both roles are in the build. Open **Settings** (gear icon, top right) to switch between the patient and clinician views, or to sign in as a different patient. In production the role comes from the account; it is a switch here so the product can be evaluated end-to-end on one device.

## The two sides

**Patient** — `Today` lists only what is due right now, grouped by time of day, each item one tap from done and carrying the specialist's own reason for prescribing it. `Program` is the full plan. `Progress` is the patient's own evidence that the work is paying off. `Visits` is the appointment they would otherwise miss.

**Clinician** — `Caseload` ranks patients by 7-day adherence risk rather than alphabetically, so the list answers *who needs me today* in about three seconds. The patient chart carries adherence bars, the outcome measure plotted against its target, a day-by-day log, and a plain-language clinical read. `Schedule` is the diary.

## How it is built

```
app/                    expo-router routes
  (patient)/            today · program · progress · visits
  (clinician)/          patients · schedule · patient/[id]
src/domain/             types, local-time date maths, derived selectors
src/store/              app state, AsyncStorage persistence, seed data
src/ui/                 primitives, charts, icons, responsive shell
src/theme/              design tokens (light + dark)
```

Two design decisions carry most of the weight:

**Everything is derived.** Only two things are recorded: the prescriptions a clinician wrote, and the log entries a patient produced. Adherence, streaks, risk level and outcome trends are all computed from those on read (`src/domain/selectors.ts`), never stored. History cannot drift out of sync with what the patient actually did, and the persisted shape stays small enough to swap for a real backend without touching the screens.

**Charts and icons are drawn by hand** in `react-native-svg` rather than pulled from a charting library or an icon font. It is the only approach that renders identically on iOS, Android, web and desktop, and it keeps the visualisations inside the same design system as everything else. Adherence always uses a full 0–100% axis; colour only ever encodes state, never series identity.

Data currently lives on the device. There is no account system, no server, and no PHI leaves the phone — see the roadmap below.

## Demo data

A first run seeds one clinic, three patients and six weeks of deterministic history, spread deliberately across the risk scale — an on-track patient, one slipping, one at risk — with outcome curves correlated to adherence. Empty databases make this class of product impossible to judge. Reset it any time from Settings.

## Not built yet

The honest list, in the order it would matter:

- **Backend and accounts.** Multi-device sync, real auth, and the audit trail that any clinical record needs.
- **Notifications.** Scheduled reminders per prescription and before appointments — the single biggest adherence lever still missing.
- **Program authoring.** Clinicians can currently remove prescriptions but not compose a program in-app.
- **Messaging** between patient and specialist.
- **Compliance.** HIPAA/GDPR posture, encryption at rest, data export and deletion.
