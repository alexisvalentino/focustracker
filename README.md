<h1 align="center">Focus Tracker</h1>

<p align="center">
  <strong>No touch. No excuses. Stay focused.</strong>
</p>

<p align="center">
  <em>A productivity tracker that knows when you touch your phone — and punishes you for it.</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-000000?logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/Ionic-7-3880FF?logo=ionic&logoColor=white" alt="Ionic" />
  <img src="https://img.shields.io/badge/Capacitor-5-119EFF?logo=capacitor&logoColor=white" alt="Capacitor" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Android_Studio-Ready-3DDC84?logo=android-studio&logoColor=white" alt="Android Studio" />
  <img src="https://img.shields.io/badge/iOS-Xcode_Ready-147EFB?logo=apple&logoColor=white" alt="Xcode" />
</p>

---

## Overview

**Focus Tracker** is a cross-platform productivity app that forces you to actually focus. You pick a goal, press start, and put the phone down. The timer counts up — and the moment you touch the phone, the timer **resets back to zero**.

The logic is simple: **if you are touching your phone, you are not focusing.**

The app runs identically on **iOS, Android, and the web** from a single codebase (Next.js + Ionic + Capacitor).

---

## How It Works

1. **Pick a goal.** Choose a session length: 30 seconds, 1 minute, 5 minutes, or a full 25-minute pomodoro.
2. **Press START FOCUS.** The timer starts counting up from `00:00`.
3. **Do not touch the phone.** Any touch anywhere on the screen — a tap, a swipe, even a stray thumb — resets the timer back to zero and fails the session.
4. **Finish without touching.** When the timer reaches your goal, you win.

The message in the middle of the screen says it all:

> **You are geh if you touch your phone. Don't touch it unless the time is finished.**

---

## Features

- **Touch + movement detection that actually works** — four layers of detection (see [How Touch Detection Works](#how-touch-detection-works)):
  - Web-level `pointer`/`touch` events (covers Android, iOS, and browser).
  - A native Android hook (`MainActivity.dispatchTouchEvent`) that fires a `native-touch` event into the WebView for touches landing on native UI.
  - **Movement detection** via the DeviceMotion API (accelerometer/gyroscope) — picking up, shaking, or moving the phone fails the session too. On iOS a one-time motion permission prompt is required (requested automatically when you press START).
  - Leaving the app mid-session also fails you (you clearly touched your phone).
- **Reset-to-zero mechanic** — one touch and your progress is gone.
- **Screen stays awake** — native keep-awake on both Android and iOS, so the timer never sleeps mid-session. No permission needed. Implemented with `FLAG_KEEP_SCREEN_ON` in `MainActivity.java` (Android) and `isIdleTimerDisabled` in `AppDelegate.swift` (iOS).
- **Four goal presets** — 30s / 1m / 5m / 25m.
- **Dark, distraction-free UI** — nothing to tap, nothing to fiddle with, while the timer runs.
- **No backend, no accounts** — fully offline, client-side only.

---

## How Touch Detection Works

This is the core mechanic, so it deserves its own section.

### Layer 1 — Web events (all platforms)

While a session is running, the app listens for `pointerdown` and `touchstart` on `window`. Any interaction with the app surface fires these events, which immediately fails the session and resets the timer to zero.

This works out of the box on:
- **iOS / WKWebView** — the WebView fills the entire screen, so every touch is seen.
- **Android / WebView** — same.
- **Desktop browser** — even a mouse click counts (great for testing).

### Layer 2 — Native Android hook (`MainActivity.java`)

On top of the web events, the Android `MainActivity` overrides `dispatchTouchEvent()`. On every `ACTION_DOWN` it calls `bridge.triggerWindowJSEvent("native-touch")`, which fires a `native-touch` CustomEvent on `window` inside the WebView. The web app listens for that event too.

This is a safety net: if a touch lands on native UI (status bar, keyboard, a future native overlay) instead of the WebView, it is still caught.

### Layer 3 — Movement detection (DeviceMotion API)

The app subscribes to `devicemotion` events and computes the phone's linear acceleration magnitude (gravity removed). If it stays above the threshold for a few consecutive samples, the session fails with **"You moved the phone."**

- **Android**: motion events flow automatically in the Capacitor WebView — no permission needed.
- **iOS**: iOS 13+ requires an explicit motion-permission prompt. The app requests it from the START button tap (a user gesture, as Apple requires). If the user denies it, touch detection still works and the idle screen shows *"movement pending/off"*.
- **Tuning**: `MOTION_THRESHOLD` (3.0 m/s²), `MOTION_CONSECUTIVE` (3 samples), and `MOTION_GRACE_MS` (800 ms grace after START) live at the top of `components/FocusTracker.tsx`. Raise the threshold if you get false positives from table bumps.
- **Note for the web preview**: desktop browsers without motion sensors never fire `devicemotion`, so the status pill shows movement as "off" there — on real phones it activates automatically.

### Layer 4 — Leaving the app

`visibilitychange` to `hidden` while a session is running counts as a failure too — switching apps, pulling down the notification shade, or locking the screen means you touched the phone.

### What about permissions?

**None are required.** In-app touch detection needs no Android runtime permissions and no iOS permission prompts. The Android manifest only contains the default `INTERNET` permission.

> **Limitation:** this app detects touches *inside* the app. It cannot (and no normal app can) detect touches that happen *outside* it — e.g., on another app's screen. On Android that would require an Accessibility Service or overlay + foreground service (heavy, and users must manually enable it), and iOS forbids it entirely. Not needed for this use case.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 14** | Framework, configured for static export (`output: 'export'`) |
| **React 18** | UI |
| **Ionic 7** (`@ionic/react`) | Native-feeling mobile UI components |
| **Capacitor 5** | Native wrapper for Android & iOS (WebView container) |
| **Tailwind CSS 3** | Styling |
| **TypeScript 5** | Type safety |

---

## Project Structure

```
focus-tracker/
├── android/                      # Capacitor-generated native Android project (Android Studio)
├── ios/                          # Capacitor-generated native iOS project (Xcode)
├── app/
│   ├── layout.tsx                # Root layout, Ionic CSS, metadata
│   └── page.tsx                  # Entry point (client-only, no SSR)
├── components/
│   ├── AppShell.tsx              # Ionic shell (IonApp)
│   └── FocusTracker.tsx          # The whole app: timer + touch detection
├── styles/
│   ├── global.css                # Base styles, safe-area utilities
│   └── variables.css             # Ionic theme variables
├── capacitor.config.json         # Capacitor config (appId, webDir: "out")
├── next.config.js                # Static export config
└── package.json
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18.17 or later (see `.nvmrc`)
- For **Android**: [Android Studio](https://developer.android.com/studio) (with an emulator or a physical device)
- For **iOS**: macOS with [Xcode](https://developer.apple.com/xcode/) + CocoaPods

### Install & run in the browser

```bash
npm install
npm run dev
```

Open http://localhost:3000 — the app runs fully in the browser, touch detection and all.

---

## Building for Android (Android Studio)

The app uses **Capacitor** to wrap the static web build into a native Android app (`appId: com.alexisvalentino.focustracker`). The Android project lives in the `android/` folder — it is checked into the repo, so the first-time `cap add android` step is already done.

### Workflow FAQ: where do I edit code?

**Edit almost everything in your web codebase** (`components/`, `app/`, `styles/`) — NOT in Android Studio.

- Your web code is the heart of the app: the timer, the touch detection, the UI.
- The `android/` folder is generated by Capacitor (Gradle build files + a WebView wrapper). Android Studio is only used to **run, emulate, and package** the app.

**Recommended workspace:** keep your web IDE (VS Code, etc.) for editing, keep Android Studio open on the side for running/deploying.

### Step 1 — Build the web assets

```bash
npm run build
```

Compiles the Next.js app into static files inside `out/` (this is the folder Capacitor serves from — `webDir` in `capacitor.config.json`).

### Step 2 — Sync into the Android project

```bash
npx cap sync android
```

This copies the compiled `out/` files into `android/app/src/main/assets/public` and updates plugin configs.

### Step 3 — Open in Android Studio

```bash
npx cap open android
```

Or launch Android Studio manually and choose **Open** → select the **`android/`** folder.

### Step 4 — Run on a device or emulator

In Android Studio, click the green **Run** button (or `Shift + F10`). Choose your emulator or connected physical device.

> **Physical device first time:** enable *Developer options* → *USB debugging* on the phone, plug it in, and accept the debugging prompt.

### Updating after code changes

Every time you change the web code, repeat this loop:

```
edit code  ->  npm run build  ->  npx cap sync android  ->  Run (Shift+F10) in Android Studio
```

You can also use the one-shot npm scripts:

```bash
npm run sync      # build + cap sync (both platforms)
npm run android   # build + sync + run on a connected device/emulator via `cap run`
```

---

## Building for iOS (Xcode + physical device)

> **macOS only** — Xcode cannot run on Windows or Linux. Apple requires it.

The iOS project lives in `ios/App/` (checked in, with `Podfile` already resolved).

### Step 1 — Build the web assets

```bash
npm run build
```

### Step 2 — Sync into the iOS project

```bash
npx cap sync ios
```

This copies the compiled `out/` files into `ios/App/App/public`.

### Step 3 — Open in Xcode

```bash
npx cap open ios
```

### Step 4 — Configure signing (one time)

1. In Xcode, select the **App** target → **Signing & Capabilities**.
2. Check **Automatically manage signing**, pick your Apple ID team.
3. Change the **Bundle Identifier** if you want (`com.alexisvalentino.focustracker` is the default).

### Step 5 — Run on your iPhone

1. Plug in your iPhone via cable (or use a simulator).
2. Select your device as the run target in Xcode's toolbar.
3. Press **Run** (⌘R).
4. **First time on a physical device:** on the phone, go to **Settings → General → VPN & Device Management**, trust your developer certificate, then re-run.

### Updating after code changes

Same loop as Android — Xcode just replaces Android Studio:

```
edit code  ->  npm run build  ->  npx cap sync ios  ->  Run (⌘R) in Xcode
```

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the dev server at http://localhost:3000 |
| `npm run build` | Static production export to `out/` |
| `npm run serve` | Serve the built `out/` locally |
| `npm run sync` | Build + `cap sync` (copy into android/ and ios/) |
| `npm run android` | Build, sync, and run on Android (requires device/emulator) |
| `npm run ios` | Build, sync, and run on iOS (requires macOS + Xcode) |
| `npm run compile` | TypeScript compile check |
| `npm run lint` | ESLint |

---

## Permissions

| Key | Permission | Why |
|-----|------------|-----|
| `INTERNET` (Android) | Network | Default Capacitor permission (app itself is fully offline) |

**Almost no runtime permissions are required** — touch detection happens at the app level and needs no camera, microphone, location, or notification access. The single exception is **iOS motion data**: iOS 13+ shows a one-time "Motion & Fitness" prompt (triggered automatically when you press START). Android needs nothing.

---

## Troubleshooting

**My code changes don't show up on the device.**
You ran the web build but didn't sync: run `npm run build` then `npx cap sync android` (or `ios`), then press Run again in the IDE.

**Android Studio can't find the device.**
Enable *Developer options* → *USB debugging*, plug the phone in, and accept the "Allow USB debugging" prompt. Use `adb devices` to confirm it is listed.

**Android build fails with `Unsupported class file major version` or a `jlink` error.**
This repo was bumped to **Gradle 8.5 + AGP 8.2.2** (in `android/gradle/wrapper/gradle-wrapper.properties` and `android/build.gradle`), which run on both JDK 17 and JDK 21 — so the JDK bundled with Android Studio works as-is. If you ever downgrade those, Gradle 8.0.x needs JDK 17.

**iOS build fails with a signing error.**
Select the App target in Xcode → *Signing & Capabilities* → enable *Automatically manage signing* and pick your team. On a physical device, also trust the developer certificate on the phone (Settings → General → VPN & Device Management).

**The timer resets when I tap the Start button.**
It shouldn't — the touch handler only counts touches while a session is *running* (phase `running`). If you see otherwise, check that the phase state is being set correctly.

**I want to change the message text.**
Both messages ("You are geh if you didn't pass this." / "You are geh if you touch your phone...") live in `components/FocusTracker.tsx`.

**I want to add a goal preset.**
Add an entry to the `DURATIONS` array at the top of `components/FocusTracker.tsx`.

---

## License

This project is licensed under the [MIT License](LICENSE).

---

<p align="center">
  <strong>Focus Tracker</strong> — <em>Put the phone down. Touch it and you start over.</em>
</p>
