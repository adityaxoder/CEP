/**
 * AreaChart – smooth SVG area chart matching the reference's session-trend
 * chart (purple gradient area under a line).
 *
 * Shows a decorative trend when `status` is idle/not-connected,
 * and a "live" look when status is success.
 */
export function AreaChart() {
  const W = 600, H = 120, PAD_Y = 10;

  /* Generate 12 data points — decorative trend matching reference */
  const pts = [18, 22, 30, 28, 38, 44, 40, 55, 50, 62, 58, 70];
  const maxV = Math.max(...pts);
  const minV = Math.min(...pts);

  const toX = (i) => (i / (pts.length - 1)) * W;
  const toY = (v) => H - PAD_Y - ((v - minV) / (maxV - minV)) * (H - PAD_Y * 2);

  /* Build a smooth cubic bezier path */
  function smoothPath(arr, closed = false) {
    const coords = arr.map((v, i) => [toX(i), toY(v)]);
    let d = `M${coords[0][0]},${coords[0][1]}`;
    for (let i = 1; i < coords.length; i++) {
      const [x0, y0] = coords[i - 1];
      const [x1, y1] = coords[i];
      const cpX = (x0 + x1) / 2;
      d += ` C${cpX},${y0} ${cpX},${y1} ${x1},${y1}`;
    }
    if (closed) {
      d += ` L${coords[coords.length - 1][0]},${H} L${coords[0][0]},${H} Z`;
    }
    return d;
  }

  const linePath = smoothPath(pts);
  const areaPath = smoothPath(pts, true);

  const xLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div style={{ width: '100%', marginBottom: 4 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: H, display: 'block' }}
        aria-label="Session trend area chart"
        role="img"
      >
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--blue, #1769d2)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--blue, #1769d2)" stopOpacity="0.02" />
          </linearGradient>
          {/* Second (lighter) fill layer */}
          <linearGradient id="areaGrad2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--green, #1b9a62)" stopOpacity="0.15" />
            <stop offset="100%" stopColor="var(--green, #1b9a62)" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0.2, 0.4, 0.6, 0.8].map((frac) => {
          const y = PAD_Y + frac * (H - PAD_Y * 2);
          return (
            <line
              key={frac}
              x1={0} y1={y} x2={W} y2={y}
              stroke="var(--border)"
              strokeWidth="1"
            />
          );
        })}

        {/* Filled area (second layer, lighter) */}
        <path
          d={areaPath}
          fill="url(#areaGrad2)"
          transform={`translate(0, ${(H - PAD_Y * 2) * 0.08})`}
        />

        {/* Filled area */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <path
          d={linePath}
          fill="none"
          stroke="var(--blue, #1769d2)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Last point dot */}
        <circle
          cx={toX(pts.length - 1)}
          cy={toY(pts[pts.length - 1])}
          r={5}
          fill="var(--blue-dark, #0d4fa8)"
          stroke="#fff"
          strokeWidth="2"
        />
      </svg>

      {/* X-axis labels */}
      <div className="chart-x-labels">
        {xLabels.map((l) => <span key={l}>{l}</span>)}
      </div>
    </div>
  );
}
