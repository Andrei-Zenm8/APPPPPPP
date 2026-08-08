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

**Patient** — `Today` lists only what is due right now, grouped by time of day, each item one tap from done and carrying the specialist's own reason for prescribing it. Anything they cannot do can be logged as *"couldn't, and here's why"* rather than left as a silent gap. `Program` is the full plan. `Progress` is their own evidence that the work is paying off. `Visits` is the appointment they would otherwise miss. `Messages` is the way back to their specialist.

**Clinician** — `Caseload` ranks patients by risk rather than alphabetically, so the list answers *who needs me today* in about three seconds. The patient chart carries adherence bars, the outcome measure plotted against its target, a day-by-day log with the patient's own reasons, a message thread, and a plain-language clinical read. `Plan` is where programs are authored. `Schedule` is the diary.

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

Three design decisions carry most of the weight:

**Everything is derived.** Only two things are recorded: the prescriptions a clinician wrote, and the log entries a patient produced. Adherence, streaks, risk level and outcome trends are all computed from those on read (`src/domain/selectors.ts`), never stored. History cannot drift out of sync with what the patient actually did, and the persisted shape stays small enough to swap for a real backend without touching the screens.

**Risk is not just adherence.** A patient doing everything asked of them whose pain has just spiked is the most urgent person on a caseload, and a pure-adherence ranking buries them at the bottom. So a deterioration in the outcome measure escalates a patient independently, and every row states which of the two put it there.

**Charts and icons are drawn by hand** in `react-native-svg` rather than pulled from a charting library or an icon font. It is the only approach that renders identically on iOS, Android, web and desktop, and it keeps the visualisations inside the same design system as everything else. Adherence always uses a full 0–100% axis; colour only ever encodes state, never series identity.

Data currently lives on the device. There is no account system, no server, and no PHI leaves the phone — see the roadmap below.

## Demo data

A first run seeds one clinic, three patients and six weeks of deterministic history, spread deliberately across the risk scale — an on-track patient, one slipping, one at risk — with outcome curves correlated to adherence. Empty databases make this class of product impossible to judge. Reset it any time from Settings.

## Not built yet

The honest list, in the order it would matter:

- **Backend and accounts.** Multi-device sync, real auth, and the audit trail any clinical record needs. Everything currently lives on the device.
- **Onboarding a patient.** Programs can be authored, but the patient records themselves are seeded.
- **Appointment lifecycle.** No attendance or no-show state, no reschedule requests, no join link on a video visit.
- **Compliance.** HIPAA/GDPR posture, encryption at rest, data export and deletion.

Reminders are implemented with `expo-notifications` and work on device; they are inert in a browser, and the Settings screen says so rather than offering a switch that does nothing.
