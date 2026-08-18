# 🐻 Focus Tracker - The App That Judges You

> "If you don't focus, we'll call you **geh**." - Every Session's Mascot

## 🎯 What Is This?

A productivity app that's brutally honest with you. You get a cute bear mascot that judges your focus sessions, but when you fail? The bear gets **really disappointed** and your coins suffer.

## ✨ Features

- **Focus Timer**: 30 seconds to 25 minutes — your choice, your pain
- **Judgmental Mascot**: A bear that celebrates your wins and shamefully stares at your failures
- **Coin Economy**: Earn focus coins, spend them on swag, or save for emergency streak repairs
- **Forest System**: Plant trees by focusing (real trees? nah, but they look pretty in your forest)
- **Gamified Everything**: Streaks, check-ins, daily goals, achievements — we're tracking it all
- **Mascot Shop**: Buy accessories for your bear to wear. Because why not.
- **Streak Freeze**: Miss a day? Pay 50 coins to save your precious streak
- **Weekend Double Points**: Saturdays and Sundays get you 2x coins (we're nice sometimes)
- **Haptic Feedback**: Your phone vibrates when you win or lose. Feel it.

## 🛠 Tech Stack

- **Next.js 14** (React)
- **Capacitor** (iOS + Android native)
- **Tailwind CSS**
- **Ionic Components**
- **Capacitor Plugins** (Haptics, StatusBar)

## 🚀 Getting Started

### Web (Development)

```bash
npm install
npm run dev
```

### Android

```bash
npm run build
npx cap sync
cd android
./gradlew assembleDebug
```

APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`

### iOS

```bash
npm run build
npx cap sync
cd ios
open App.xcworkspace
```

Then hit **Run** in Xcode.

## 📱 Play Store

The release APK is pre-built and ready:

```
android/app/build/outputs/apk/release/app-release.apk
```

## 🎭 Meet Your Mascots

| Mascot | Cost | Personality |
|--------|------|-------------|
| 🐻 Bear | Free | The OG, always judges you |
| 🐱 Cat | 100 | Ears perk when you focus |
| 🐰 Rabbit | 150 | Hops when you succeed |
| 🐶 Dog | 200 | Barks at your failures |
| 🐭 Mouse | 250 | Squeaks nervously |
| 🐼 Panda | 300 | The wise one |

## 🏆 Achievement Examples

- **First Focus**: You tried! Here's a cookie 🍪
- **Weekend Warrior**: Double points on weekends (2 sessions)
- **7-Day Streak**: You're officially addicted
- **100 Trees**: Your forest is a literal forest now
- **1000 Coins**: Rich! Go buy a panda
- **Perfect Week**: All daily goals hit. Legend.

## 📄 License

MIT License - go focus, don't be **geh**.

---

*Built with love, coffee ☕, and a lot of haptic feedback.*
