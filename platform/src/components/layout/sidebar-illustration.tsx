// =============================================================================
// SidebarIllustration — line-art botánico (SVG inline, trazo blanco).
// Aproximación de la ilustración compartida (flor grande + crisantemo + hojas).
// Se usa como fallback si no está /images/sidebar-illustration.png.
// =============================================================================

export function SidebarIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 320 360"
      fill="none"
      stroke="#ffffff"
      strokeWidth={1.1}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* Flor grande: pétalos exteriores */}
      <g opacity="0.9">
        {Array.from({ length: 10 }).map((_, i) => (
          <ellipse
            key={`po-${i}`}
            cx={118}
            cy={62}
            rx={54}
            ry={16}
            transform={`rotate(${i * 36} 118 108)`}
          />
        ))}
        {/* pétalos interiores */}
        {Array.from({ length: 8 }).map((_, i) => (
          <ellipse
            key={`pi-${i}`}
            cx={118}
            cy={74}
            rx={34}
            ry={10}
            transform={`rotate(${i * 45 + 20} 118 108)`}
          />
        ))}
        <circle cx={118} cy={108} r={12} />
        <circle cx={118} cy={108} r={5} />
      </g>

      {/* Tallo principal */}
      <path d="M118 120 C 112 190, 126 250, 108 352" />
      {/* Hojas */}
      <path d="M117 168 C 78 158, 58 182, 60 210 C 92 208, 114 194, 117 168 Z" />
      <path d="M120 205 C 158 190, 186 206, 192 236 C 156 240, 130 230, 120 205 Z" />
      <path d="M116 240 C 76 234, 54 258, 56 288 C 92 284, 112 268, 116 240 Z" />
      <path d="M112 282 C 150 272, 176 288, 182 316 C 148 320, 122 308, 112 282 Z" />
      <path d="M110 320 C 84 316, 66 332, 66 352 C 92 350, 106 342, 110 320 Z" />

      {/* Crisantemo */}
      <g opacity="0.9">
        {Array.from({ length: 14 }).map((_, i) => (
          <ellipse
            key={`c-${i}`}
            cx={232}
            cy={168}
            rx={20}
            ry={8}
            transform={`rotate(${i * (360 / 14)} 232 190)`}
          />
        ))}
        {Array.from({ length: 9 }).map((_, i) => (
          <ellipse
            key={`ci-${i}`}
            cx={232}
            cy={176}
            rx={12}
            ry={5}
            transform={`rotate(${i * 40 + 18} 232 190)`}
          />
        ))}
        <circle cx={232} cy={190} r={10} />
      </g>
      {/* Tallo del crisantemo */}
      <path d="M232 200 C 238 250, 250 300, 246 352" />
      <path d="M236 235 C 268 226, 292 240, 296 266 C 266 268, 244 258, 236 235 Z" />
      <path d="M240 280 C 270 274, 290 288, 292 312 C 266 312, 246 302, 240 280 Z" />
    </svg>
  );
}
