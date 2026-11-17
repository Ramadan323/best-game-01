// Every sound is synthesised with the Web Audio API — no audio files, no
// network. A tiny synth: a chime that climbs with the combo, a burst whoosh,
// a hurt thud, and a low ambient drone that follows the level.
export function makeAudio() {
  const audio = {
    muted: false,
    context: null,
    master: null,
    drone: null,
    droneGain: null,
  };

  function ensure() {
    if (audio.context) return true;
    try {
      const Ctx = window.AudioContext ?? window.webkitAudioContext;
      if (!Ctx) return false;
      audio.context = new Ctx();
      audio.master = audio.context.createGain();
      audio.master.gain.value = 0.5;
      audio.master.connect(audio.context.destination);
      return true;
    } catch {
      return false;
    }
  }

  // Resume after the first gesture: browsers keep the context suspended
  // until the player interacts, so the game unlocks it on start.
  audio.unlock = function unlock() {
    if (!ensure()) return;
    if (audio.context.state === 'suspended') audio.context.resume().catch(() => {});
    startDrone();
  };

  function startDrone() {
    if (audio.drone || !audio.context) return;
    const osc = audio.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 55;
    const osc2 = audio.context.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = 82.5;
    const gain = audio.context.createGain();
    gain.gain.value = 0.035;
    const low = audio.context.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.value = 240;
    osc.connect(low);
    osc2.connect(low);
    low.connect(gain);
    gain.connect(audio.master);
    osc.start();
    osc2.start();
    audio.drone = [osc, osc2];
    audio.droneGain = gain;
  }

  audio.setLevel = function setLevel(level) {
    if (!audio.droneGain || !audio.context) return;
    const target = 0.035 + Math.min(level, 12) * 0.002;
    audio.droneGain.gain.setTargetAtTime(target, audio.context.currentTime, 0.5);
  };

  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || audio.muted) return;
    const now = audio.context.currentTime;
    const osc = audio.context.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
    const gain = audio.context.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(gain);
    gain.connect(audio.master);
    osc.start(now);
    osc.stop(now + dur + 0.05);
  }

  function noise(dur, vol, freq) {
    if (!ensure() || audio.muted) return;
    const now = audio.context.currentTime;
    const len = Math.max(1, Math.floor(audio.context.sampleRate * dur));
    const buffer = audio.context.createBuffer(1, len, audio.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = audio.context.createBufferSource();
    src.buffer = buffer;
    const filter = audio.context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 0.8;
    const gain = audio.context.createGain();
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(audio.master);
    src.start(now);
  }

  // The collect chime climbs a pentatonic ladder with the combo, so a chain
  // sounds like it is rising.
  audio.collect = function collect(combo) {
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
    const step = Math.min(combo - 1, scale.length - 1);
    tone(scale[step], 0.28, 'sine', 0.22);
    tone(scale[step] * 2, 0.18, 'sine', 0.08);
  };

  audio.burst = function burst() {
    noise(0.35, 0.3, 900);
    tone(220, 0.3, 'sawtooth', 0.1, 60);
  };

  audio.hurt = function hurt() {
    tone(140, 0.25, 'square', 0.16, 55);
    noise(0.2, 0.2, 300);
  };

  audio.levelUp = function levelUp() {
    tone(392, 0.16, 'triangle', 0.16);
    setTimeout(() => tone(523.25, 0.2, 'triangle', 0.16), 90);
    setTimeout(() => tone(659.25, 0.28, 'triangle', 0.16), 180);
  };

  audio.gameOver = function gameOver() {
    tone(392, 0.4, 'triangle', 0.18, 370);
    setTimeout(() => tone(311.13, 0.5, 'triangle', 0.18, 233), 220);
    setTimeout(() => tone(233.08, 0.9, 'triangle', 0.18, 116), 480);
  };

  audio.click = function click() {
    tone(660, 0.08, 'sine', 0.14);
  };

  audio.toggleMute = function toggleMute() {
    audio.muted = !audio.muted;
    if (audio.master) audio.master.gain.value = audio.muted ? 0 : 0.5;
    return audio.muted;
  };

  return audio;
}
