// ========================================
// CARTMATE - AUDIO & SOUND ENGINE
// Zero external files, 100% offline Web Audio
// ========================================

const SOUND_STORAGE_KEY = "cartmate-sound-enabled";
let audioCtx = null;
let soundEnabled = true;

// Initialize sound preference
async function initSound() {
    const saved = await safeGet(SOUND_STORAGE_KEY);
    soundEnabled = saved === null ? true : saved === "true";
    updateSoundUI();
}

function isSoundEnabled() {
    return soundEnabled;
}

async function setSoundEnabled(enabled) {
    soundEnabled = !!enabled;
    await safeSet(SOUND_STORAGE_KEY, String(soundEnabled));
    updateSoundUI();
    if (soundEnabled) {
        playOrderSound();
    }
}

function updateSoundUI() {
    const toggleBtn = document.getElementById("soundToggleBtn");
    if (toggleBtn) {
        toggleBtn.classList.toggle("active", soundEnabled);
        toggleBtn.textContent = soundEnabled ? "ON 🔔" : "OFF 🔕";
        toggleBtn.setAttribute("aria-label", soundEnabled ? "Mute order sound" : "Enable order sound");
    }
}

// Play a cheerful, satisfying Paytm/cash-register style chime
function playOrderSound() {
    if (!soundEnabled) return;

    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        if (!audioCtx) {
            audioCtx = new AudioContextClass();
        }

        if (audioCtx.state === "suspended") {
            audioCtx.resume();
        }

        const now = audioCtx.currentTime;

        // Upbeat 3-note harmonic chime (C6 -> E6 -> G6)
        const notes = [
            { freq: 1046.5, time: 0.00, dur: 0.10, gain: 0.20 },
            { freq: 1318.5, time: 0.08, dur: 0.12, gain: 0.22 },
            { freq: 1567.98, time: 0.16, dur: 0.35, gain: 0.26 }
        ];

        notes.forEach(note => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();

            osc.type = "sine";
            osc.frequency.setValueAtTime(note.freq, now + note.time);

            // Smooth attack and exponential decay
            gain.gain.setValueAtTime(0.001, now + note.time);
            gain.gain.exponentialRampToValueAtTime(note.gain, now + note.time + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + note.time + note.dur);

            osc.connect(gain);
            gain.connect(audioCtx.destination);

            osc.start(now + note.time);
            osc.stop(now + note.time + note.dur + 0.05);
        });
    } catch (err) {
        console.warn("Sound play error:", err);
    }
}
