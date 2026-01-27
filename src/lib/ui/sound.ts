let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioCtor) return null;
  if (!audioContext) {
    audioContext = new AudioCtor();
  }
  return audioContext;
}

export async function warmupAudio(): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    try {
      await ctx.resume();
    } catch {
      return;
    }
  }
}

// 成功完成音效 - 欢快的上扬音
export function playSuccessTone(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => undefined);
  }

  const now = ctx.currentTime;
  const output = ctx.createGain();
  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  output.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  output.connect(ctx.destination);

  const oscA = ctx.createOscillator();
  oscA.type = 'sine';
  oscA.frequency.setValueAtTime(880, now);
  oscA.frequency.exponentialRampToValueAtTime(1320, now + 0.18);

  const oscB = ctx.createOscillator();
  oscB.type = 'triangle';
  oscB.frequency.setValueAtTime(660, now + 0.03);

  oscA.connect(output);
  oscB.connect(output);

  oscA.start(now);
  oscB.start(now + 0.03);
  oscA.stop(now + 0.25);
  oscB.stop(now + 0.35);
}

// 开始生成音效 - 启动/发射感
export function playStartTone(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => undefined);
  }

  const now = ctx.currentTime;

  // 主音效 - 上升感
  const output = ctx.createGain();
  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(0.15, now + 0.05);
  output.gain.exponentialRampToValueAtTime(0.08, now + 0.2);
  output.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
  output.connect(ctx.destination);

  // 低音启动
  const oscLow = ctx.createOscillator();
  oscLow.type = 'sine';
  oscLow.frequency.setValueAtTime(220, now);
  oscLow.frequency.exponentialRampToValueAtTime(440, now + 0.15);
  oscLow.connect(output);
  oscLow.start(now);
  oscLow.stop(now + 0.2);

  // 高音闪烁
  const oscHigh = ctx.createOscillator();
  oscHigh.type = 'triangle';
  oscHigh.frequency.setValueAtTime(660, now + 0.08);
  oscHigh.frequency.exponentialRampToValueAtTime(880, now + 0.25);
  oscHigh.connect(output);
  oscHigh.start(now + 0.08);
  oscHigh.stop(now + 0.35);
}

// 阶段切换音效 - 轻柔的提示音
export function playPhaseTone(phaseIndex: number): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => undefined);
  }

  const now = ctx.currentTime;

  // 根据阶段调整音高，营造递进感
  const baseFreq = 440 + (phaseIndex * 80); // 每个阶段音高递增

  const output = ctx.createGain();
  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(0.08, now + 0.02);
  output.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  output.connect(ctx.destination);

  // 主音
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.2, now + 0.1);
  osc.connect(output);
  osc.start(now);
  osc.stop(now + 0.2);

  // 泛音
  const oscHarmonic = ctx.createOscillator();
  oscHarmonic.type = 'triangle';
  oscHarmonic.frequency.setValueAtTime(baseFreq * 1.5, now);

  const harmonicGain = ctx.createGain();
  harmonicGain.gain.setValueAtTime(0.0001, now);
  harmonicGain.gain.exponentialRampToValueAtTime(0.04, now + 0.01);
  harmonicGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
  harmonicGain.connect(ctx.destination);

  oscHarmonic.connect(harmonicGain);
  oscHarmonic.start(now);
  oscHarmonic.stop(now + 0.15);
}

// 进度提示音 - 用于等待过程中的定期提示
export function playTickTone(): void {
  const ctx = getAudioContext();
  if (!ctx) return;
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => undefined);
  }

  const now = ctx.currentTime;

  const output = ctx.createGain();
  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(0.05, now + 0.01);
  output.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
  output.connect(ctx.destination);

  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1200, now);
  osc.connect(output);
  osc.start(now);
  osc.stop(now + 0.08);
}
