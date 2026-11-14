export default function Botanical({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 640 700"
      fill="none"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="leaf" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#7d9475" />
          <stop offset="1" stopColor="#294f3c" />
        </linearGradient>
      </defs>
      <circle cx="330" cy="320" r="245" stroke="#b79a58" strokeOpacity=".22" />
      <circle cx="330" cy="320" r="210" stroke="#b79a58" strokeOpacity=".12" />
      <g stroke="#a0ab81" strokeWidth="2">
        <path d="M315 700Q260 390 410 65M307 590Q410 380 545 285M300 510Q190 300 100 190M323 390Q425 230 485 115" />
      </g>
      {[
        [365, 155, -30],
        [338, 230, -45],
        [318, 305, -40],
        [306, 380, -50],
        [296, 460, -55],
        [349, 527, 35],
        [388, 455, 35],
        [437, 385, 40],
        [481, 330, 40],
        [255, 405, -110],
        [212, 335, -115],
        [168, 265, -120],
        [390, 270, 25],
        [432, 205, 25],
      ].map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <path
            d="M0 0C-62-22-80-91-39-136C-2-108 22-52 0 0Z"
            fill="url(#leaf)"
            stroke="#8b9c76"
            strokeOpacity=".4"
          />
          <path d="M0 0L-39-128" stroke="#b3bb8e" strokeOpacity=".4" />
        </g>
      ))}
    </svg>
  );
}
