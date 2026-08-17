package com.alexisvalentino.focustracker;

import android.os.Bundle;
import android.view.MotionEvent;
import android.view.WindowManager;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // Keep the screen on while the app is in the foreground so the focus
        // timer never sleeps mid-session. No permission required on Android.
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    }

    /**
     * Touch detection hook: every time the user touches the screen anywhere
     * inside the app window, notify the web layer by firing a "native-touch"
     * CustomEvent on `window`. The web app (FocusTracker) listens for this
     * event and resets the running session back to zero.
     *
     * This is a safety net on top of the WebView's own pointer/touch events —
     * it catches touches that land on native UI (status bar, keyboard, future
     * native overlays) instead of the WebView.
     *
     * No runtime permissions are required for in-app touch detection.
     */
    @Override
    public boolean dispatchTouchEvent(MotionEvent ev) {
        if (ev != null && ev.getActionMasked() == MotionEvent.ACTION_DOWN) {
            try {
                bridge.triggerWindowJSEvent("native-touch");
            } catch (Exception ignored) {
                // Bridge not ready yet; the web layer already detects touches
                // via pointer/touch events, so nothing is lost.
            }
        }
        return super.dispatchTouchEvent(ev);
    }
}
