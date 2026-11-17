// Everything the player sees: the night, the wisp, the orbs, the shadows,
// the HUD, and the title / pause / game-over screens. All art is drawn in
// code — no image files, no network.
import { FIELD, WISP, ORB, PALETTE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSE = 'pause';
export const SCREEN_OVER = 'over';

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fmtTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function drawBackground(ctx, stars, time) {
  const grad = ctx.createLinearGradient(0, 0, 0, FIELD.height);
  grad.addColorStop(0, PALETTE.bgTop);
  grad.addColorStop(1, PALETTE.bgBottom);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);

  // Two slow nebulae, drifting on the night.
  const nebulae = [
    { x: 300 + Math.sin(time * 0.05) * 30, y: 180, r: 260, color: PALETTE.nebulaA },
    { x: 1000 + Math.cos(time * 0.04) * 30, y: 520, r: 300, color: PALETTE.nebulaB },
  ];
  for (const n of nebulae) {
    const g = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    g.addColorStop(0, n.color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = g;
    ctx.fillRect(n.x - n.r, n.y - n.r, n.r * 2, n.r * 2);
  }
  ctx.globalAlpha = 1;

  // Stars, twinkling at their own pace.
  for (const star of stars) {
    const tw = 0.45 + 0.55 * Math.abs(Math.sin(time * star.depth * 2 + star.twinkle));
    ctx.globalAlpha = tw * (0.35 + star.depth * 0.5);
    ctx.fillStyle = PALETTE.star;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawOrb(ctx, orb, time) {
  const pulse = 1 + Math.sin(time * 3 + orb.phase) * 0.15;
  const r = orb.radius * pulse;
  const glow = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, r * 3.2);
  glow.addColorStop(0, PALETTE.orbGlow);
  glow.addColorStop(0.35, 'rgba(255, 181, 46, 0.35)');
  glow.addColorStop(1, 'rgba(255, 181, 46, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, r * 3.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = PALETTE.orbCore;
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, r * 0.55, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.orbRing;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(orb.x, orb.y, r, 0, Math.PI * 2);
  ctx.stroke();
}

const SHADOW_EYE = {
  chaser: '#ff4d6d',
  hunter: '#ff9f43',
  brute: '#e26ee5',
  splitter: '#b388ff',
};

function drawShadow(ctx, sh, wisp, time) {
  const wob = Math.sin(time * 2.4 + sh.phase) * 0.08;
  const r = sh.radius * (1 + wob);
  // Body: a bruised dark blob with a violet rim.
  const body = ctx.createRadialGradient(sh.x - r * 0.3, sh.y - r * 0.3, r * 0.1, sh.x, sh.y, r);
  body.addColorStop(0, '#2a1440');
  body.addColorStop(0.7, PALETTE.shadowBody);
  body.addColorStop(1, 'rgba(18, 8, 31, 0)');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(sh.x, sh.y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = PALETTE.shadowEdge;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(sh.x, sh.y, r * 0.92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  // Eyes, always watching the wisp.
  const dx = wisp.x - sh.x;
  const dy = wisp.y - sh.y;
  const dist = Math.hypot(dx, dy) || 1;
  const lookX = (dx / dist) * r * 0.18;
  const lookY = (dy / dist) * r * 0.18;
  const eyeColor = SHADOW_EYE[sh.kind] ?? PALETTE.shadowEye;
  const eyeR = Math.max(2, r * 0.16);
  const spread = r * 0.34;
  const perpX = -dy / dist;
  const perpY = dx / dist;
  ctx.fillStyle = eyeColor;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(sh.x + perpX * spread * side + lookX, sh.y + perpY * spread * side + lookY, eyeR, 0, Math.PI * 2);
    ctx.fill();
  }
  // A splitter wears a second, smaller pair of eyes.
  if (sh.kind === 'splitter') {
    ctx.globalAlpha = 0.8;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(sh.x + perpX * spread * side * 0.5 + lookX, sh.y - r * 0.42 + lookY, eyeR * 0.7, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

function drawWisp(ctx, wisp, time) {
  const lightFrac = Math.max(0, wisp.light / WISP.lightMax);
  const glowR = 90 + lightFrac * 130;
  const flicker = 1 + Math.sin(time * 7) * 0.03 + Math.sin(time * 13.7) * 0.02;
  // The glow that pushes the dark back — it shrinks as the light drains.
  const glow = ctx.createRadialGradient(wisp.x, wisp.y, 0, wisp.x, wisp.y, glowR * flicker);
  glow.addColorStop(0, 'rgba(240, 180, 41, 0.55)');
  glow.addColorStop(0.4, 'rgba(240, 180, 41, 0.16)');
  glow.addColorStop(1, 'rgba(240, 180, 41, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(wisp.x, wisp.y, glowR * flicker, 0, Math.PI * 2);
  ctx.fill();
  // Core: bright, warm, with a sparkle.
  const blink = wisp.invulnerable > 0 && Math.floor(time * 14) % 2 === 0;
  ctx.globalAlpha = blink ? 0.35 : 1;
  const core = ctx.createRadialGradient(wisp.x, wisp.y, 0, wisp.x, wisp.y, WISP.radius * 1.4);
  core.addColorStop(0, '#ffffff');
  core.addColorStop(0.45, PALETTE.wispCore);
  core.addColorStop(1, PALETTE.wispGlow);
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(wisp.x, wisp.y, WISP.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  // A small sparkle riding the core.
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  ctx.arc(wisp.x - 4, wisp.y - 5, 2.2, 0, Math.PI * 2);
  ctx.fill();
}

// The dark closes in as the light drains: a vignette whose clear centre
// follows the wisp and shrinks with the light level.
function drawDarkness(ctx, wisp, time) {
  const lightFrac = Math.max(0, wisp.light / WISP.lightMax);
  const clearR = 150 + lightFrac * 420;
  const grad = ctx.createRadialGradient(wisp.x, wisp.y, clearR * 0.45, wisp.x, wisp.y, clearR * 1.5);
  grad.addColorStop(0, 'rgba(4, 6, 16, 0)');
  grad.addColorStop(0.75, 'rgba(4, 6, 16, 0.28)');
  grad.addColorStop(1, 'rgba(4, 6, 16, 0.62)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
}

export function drawWorld(ctx, world, particles, stars, time) {
  const s = world.state;
  drawBackground(ctx, stars, time);
  for (const orb of s.orbs) drawOrb(ctx, orb, time);
  for (const sh of s.shadows) drawShadow(ctx, sh, s.wisp, time);
  drawWisp(ctx, s.wisp, time);
  particles.draw(ctx);
  drawDarkness(ctx, s.wisp, time);
}

export function drawHUD(ctx, world, best, muted, time) {
  const s = world.state;
  const wisp = s.wisp;
  const lightFrac = Math.max(0, wisp.light / WISP.lightMax);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Light bar, top left.
  const barX = 24;
  const barY = 22;
  const barW = 240;
  const barH = 16;
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText('LIGHT', barX, barY - 6);
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  roundRect(ctx, barX, barY, barW, barH, 8);
  ctx.fill();
  const lowLight = lightFrac < 0.25 && Math.floor(time * 4) % 2 === 0;
  const barGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  barGrad.addColorStop(0, '#ffb52e');
  barGrad.addColorStop(1, '#f0b429');
  ctx.fillStyle = lowLight ? PALETTE.danger : barGrad;
  if (lightFrac > 0.01) {
    roundRect(ctx, barX, barY, Math.max(12, barW * lightFrac), barH, 8);
    ctx.fill();
  }
  // Burst readiness pip.
  ctx.fillStyle = wisp.burstCooldown <= 0 ? PALETTE.accent : PALETTE.hudDim;
  ctx.font = '700 13px system-ui, sans-serif';
  ctx.fillText(
    wisp.burstCooldown <= 0 ? 'BURST READY  [Space / Click]' : 'BURST …',
    barX,
    barY + barH + 20,
  );

  // Score, top centre.
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '800 34px system-ui, sans-serif';
  ctx.fillText(String(Math.floor(s.score)), FIELD.width / 2, 44);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText(`LEVEL ${s.level}   •   ${fmtTime(world.time)}`, FIELD.width / 2, 66);
  if (s.combo > 1) {
    const mult = (1 + (s.combo - 1) * ORB.comboStep).toFixed(1);
    ctx.fillStyle = PALETTE.wispGlow;
    ctx.font = '800 18px system-ui, sans-serif';
    ctx.fillText(`COMBO x${mult}  (${s.combo})`, FIELD.width / 2, 92);
  }

  // Best and sound, top right.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText(`BEST ${Math.floor(best)}`, FIELD.width - 24, 34);
  ctx.fillText(muted ? 'SOUND OFF  [M]' : 'SOUND ON  [M]', FIELD.width - 24, 54);

  // Controls hint, bottom, dim so it never fights the game.
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(139, 147, 184, 0.75)';
  ctx.font = '600 12px system-ui, sans-serif';
  ctx.fillText('Move: mouse or WASD / arrows    •    Burst: Space or click    •    Pause: P    •    Restart: R', FIELD.width / 2, FIELD.height - 14);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, x, y, w, h, 18);
  ctx.fill();
  ctx.strokeStyle = PALETTE.panelEdge;
  ctx.lineWidth = 1.5;
  roundRect(ctx, x, y, w, h, 18);
  ctx.stroke();
}

export function drawTitle(ctx, world, best, time) {
  const s = world.state;
  ctx.textAlign = 'center';
  const cx = FIELD.width / 2;
  panel(ctx, cx - 330, 150, 660, 400);
  // Title, glowing.
  ctx.save();
  ctx.shadowColor = PALETTE.wispGlow;
  ctx.shadowBlur = 34;
  ctx.fillStyle = '#fff6d8';
  ctx.font = '800 84px system-ui, sans-serif';
  ctx.fillText('LUMEN', cx, 250);
  ctx.restore();
  ctx.fillStyle = PALETTE.accent;
  ctx.font = '600 20px system-ui, sans-serif';
  ctx.fillText('Keeper of the Last Light', cx, 286);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '400 17px system-ui, sans-serif';
  ctx.fillText('You are the last light in a dark world. It drains as you move.', cx, 336);
  ctx.fillText('Feed on light orbs. Shove the shadows back with a burst.', cx, 362);
  ctx.fillText('When the light dies, the dark takes you.', cx, 388);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillText('Move: mouse or WASD / arrows      Burst: Space or click', cx, 432);
  ctx.fillText('P pause      M sound      R restart', cx, 456);
  if (best > 0) {
    ctx.fillStyle = PALETTE.wispGlow;
    ctx.font = '700 16px system-ui, sans-serif';
    ctx.fillText(`BEST SCORE  ${Math.floor(best)}`, cx, 496);
  }
  const pulse = 0.65 + 0.35 * Math.sin(time * 3.2);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 19px system-ui, sans-serif';
  ctx.fillText('Click or press Enter to begin', cx, 530);
  ctx.globalAlpha = 1;
  void s;
}

export function drawPause(ctx) {
  ctx.fillStyle = 'rgba(4, 6, 16, 0.55)';
  ctx.fillRect(0, 0, FIELD.width, FIELD.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '800 52px system-ui, sans-serif';
  ctx.fillText('PAUSED', FIELD.width / 2, FIELD.height / 2 - 10);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText('Press P or click to resume', FIELD.width / 2, FIELD.height / 2 + 26);
}

export function drawGameOver(ctx, world, best, isNewBest) {
  const s = world.state;
  const cx = FIELD.width / 2;
  panel(ctx, cx - 320, 130, 640, 440);
  ctx.textAlign = 'center';
  ctx.fillStyle = PALETTE.danger;
  ctx.font = '800 46px system-ui, sans-serif';
  ctx.fillText('THE LIGHT FADES', cx, 196);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText('The dark takes another wisp.', cx, 226);
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '800 64px system-ui, sans-serif';
  ctx.fillText(String(Math.floor(s.score)), cx, 300);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 14px system-ui, sans-serif';
  ctx.fillText('FINAL SCORE', cx, 326);
  if (isNewBest) {
    ctx.fillStyle = PALETTE.wispGlow;
    ctx.font = '800 18px system-ui, sans-serif';
    ctx.fillText('★ NEW BEST ★', cx, 356);
  } else {
    ctx.fillStyle = PALETTE.hudDim;
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.fillText(`BEST  ${Math.floor(best)}`, cx, 356);
  }
  ctx.fillStyle = PALETTE.hudText;
  ctx.font = '600 16px system-ui, sans-serif';
  ctx.fillText(`Survived ${fmtTime(world.time)}    •    Orbs ${s.orbsCollected}    •    Best combo x${s.bestCombo}`, cx, 392);
  ctx.fillText(`Shadows repelled ${s.shadowsRepelled}    •    Level ${s.level}    •    Bursts ${s.bursts}    •    Hits taken ${s.hits}`, cx, 418);
  ctx.fillStyle = '#ffffff';
  ctx.font = '700 19px system-ui, sans-serif';
  ctx.fillText('Press R or click to play again', cx, 492);
  ctx.fillStyle = PALETTE.hudDim;
  ctx.font = '600 13px system-ui, sans-serif';
  ctx.fillText('Tip: chain orbs quickly to build a combo — each one is worth more.', cx, 520);
}
