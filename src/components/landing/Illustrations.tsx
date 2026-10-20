// Ilustrações de traço simples, no lugar de fotografias (que não temos direitos para usar).
// Para usar fotografias próprias: coloque-as em public/img e troque estes componentes por <img>.

export function RoomIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" className={className} role="img" aria-label="Sala com paredes verde-sálvia e uma poltrona">
      <rect width="400" height="300" fill="#8fa88c" />
      <rect x="250" y="0" width="150" height="300" fill="#a9bda5" />
      <rect y="225" width="400" height="75" fill="#c79a66" />
      <rect x="282" y="40" width="84" height="150" rx="3" fill="#f4efe4" />
      <path d="M324 40v150M282 115h84" stroke="#8fa88c" strokeWidth="3" />
      <rect x="60" y="60" width="64" height="80" fill="#e8dcc4" />
      <rect x="72" y="78" width="40" height="40" fill="#c4572f" opacity=".5" />
      <rect x="40" y="170" width="150" height="38" rx="6" fill="#8a5a36" />
      <rect x="150" y="165" width="120" height="70" rx="24" fill="#efe8da" />
      <rect x="170" y="172" width="34" height="26" rx="6" fill="#5d7d5a" />
      <ellipse cx="130" cy="262" rx="60" ry="10" fill="#000" opacity=".08" />
    </svg>
  );
}

export function FacadeIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" className={className} role="img" aria-label="Fachada de prédio com varandas">
      <rect width="400" height="300" fill="#9cc3dd" />
      <rect x="70" y="30" width="260" height="270" fill="#ece4cf" />
      {[0, 1, 2].flatMap((r) =>
        [0, 1, 2].map((c) => (
          <g key={`${r}-${c}`}>
            <rect x={96 + c * 80} y={52 + r * 80} width="42" height="52" fill="#2d3a40" />
            <rect x={90 + c * 80} y={100 + r * 80} width="54" height="6" fill="#24565a" />
          </g>
        )),
      )}
      <rect x="70" y="30" width="260" height="8" fill="#c4572f" opacity=".7" />
    </svg>
  );
}

export function HouseIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" className={className} role="img" aria-label="Moradia branca com telhado de telha">
      <rect width="400" height="300" fill="#a9cfe6" />
      <path d="M50 130L200 50l150 80z" fill="#c4572f" />
      <rect x="70" y="130" width="260" height="150" fill="#f8f5ee" />
      <rect x="110" y="165" width="50" height="70" fill="#2d3a40" />
      <rect x="240" y="165" width="50" height="70" fill="#2d3a40" />
      <rect x="180" y="190" width="40" height="90" fill="#8a5a36" />
    </svg>
  );
}

export function StairsIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 300" className={className} role="img" aria-label="Zona comum com paredes pintadas">
      <rect width="400" height="300" fill="#e9eee8" />
      <rect x="0" y="0" width="400" height="190" fill="#b9c9b5" />
      <path d="M0 300V250h90v-30h90v-30h90v-30h130v140z" fill="#d9d2c0" />
      <path d="M0 250h90M90 220h90M180 190h90M270 160h130" stroke="#8a5a36" strokeWidth="5" />
    </svg>
  );
}
