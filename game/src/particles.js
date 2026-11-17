// Particles and floating score text: the juice that makes a collect, a
// burst and a hit feel like something happened.
import { range } from './random.js';

export function makeParticles() {
  const particles = { list: [], texts: [] };

  particles.burst = function burst(x, y, color, count, speed, life, size) {
    for (let i = 0; i < count; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const sp = speed * (0.3 + Math.random() * 0.7);
      particles.list.push({
        x,
        y,
        vx: Math.cos(angle) * sp,
        vy: Math.sin(angle) * sp,
        life: life * (0.6 + Math.random() * 0.4),
        maxLife: life,
        size: size * (0.6 + Math.random() * 0.8),
        color,
      });
    }
  };

  particles.ring = function ring(x, y, color, count, radius) {
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      particles.list.push({
        x: x + Math.cos(angle) * radius * 0.4,
        y: y + Math.sin(angle) * radius * 0.4,
        vx: Math.cos(angle) * radius * 3.2,
        vy: Math.sin(angle) * radius * 3.2,
        life: 0.5,
        maxLife: 0.5,
        size: 3,
        color,
      });
    }
  };

  particles.text = function text(x, y, str, color, size) {
    particles.texts.push({ x, y, str, color, size: size ?? 16, life: 0.9, maxLife: 0.9 });
  };

  particles.step = function step(dt) {
    for (let i = particles.list.length - 1; i >= 0; i -= 1) {
      const p = particles.list[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.list.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
    }
    for (let i = particles.texts.length - 1; i >= 0; i -= 1) {
      const t = particles.texts[i];
      t.life -= dt;
      t.y -= 34 * dt;
      if (t.life <= 0) particles.texts.splice(i, 1);
    }
  };

  particles.clear = function clear() {
    particles.list.length = 0;
    particles.texts.length = 0;
  };

  particles.draw = function draw(ctx) {
    for (const p of particles.list) {
      const alpha = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha + 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const t of particles.texts) {
      const alpha = Math.max(0, t.life / t.maxLife);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = t.color;
      ctx.font = `700 ${t.size}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  };

  return particles;
}

// A drifting starfield for the background: three depths, slow parallax.
export function makeStars(rng, width, height) {
  const stars = [];
  for (let i = 0; i < 130; i += 1) {
    stars.push({
      x: range(rng, 0, width),
      y: range(rng, 0, height),
      r: range(rng, 0.5, 1.8),
      depth: range(rng, 0.15, 0.6),
      twinkle: range(rng, 0, Math.PI * 2),
    });
  }
  return stars;
}
