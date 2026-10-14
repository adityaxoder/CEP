/**
 * WaveformViz – animated waveform bar chart matching the reference's
 * "Speech Delivery Tracks" visualization.
 *
 * Uses 32 bars with pseudo-random heights (seeded from props).
 * When `active` is false the bars are very short / muted.
 */
export function WaveformViz({ active, color1, color2, label }) {
  const BAR_COUNT = 32;

  /* Generate heights from a simple sine wave mix */
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const t = i / BAR_COUNT;
    const h = active
      ? Math.max(12, Math.round(
          (Math.sin(t * Math.PI * 4) * 0.35 +
           Math.cos(t * Math.PI * 6.5) * 0.3 +
           Math.sin(t * Math.PI * 2.5) * 0.2 +
           0.6) * 54
        ))
      : Math.max(4, Math.round(Math.sin(t * Math.PI * 3) * 6 + 8));

    /* Alternate between the two brand colours */
    const color = i % 3 === 0 ? color2 : color1;
    const opacity = active ? 1 : 0.3;
    return { h, color, opacity };
  });

  return (
    <div
      className="waveform-wrap"
      role="img"
      aria-label={label || 'Audio waveform visualization'}
      style={{ height: 64 }}
    >
      {bars.map((b, i) => (
        <div
          key={i}
          className="waveform-bar"
          style={{
            height: b.h,
            background: b.color,
            opacity: b.opacity,
            transition: `height 0.4s cubic-bezier(0.22,1,0.36,1) ${i * 8}ms`,
          }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
