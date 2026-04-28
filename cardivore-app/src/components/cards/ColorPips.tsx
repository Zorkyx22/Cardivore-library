const COLOR_STYLES: Record<string, React.CSSProperties> = {
  W: { background: '#f9faf4', color: '#333' },
  U: { background: '#0e68ab', color: '#fff' },
  B: { background: '#3a2060', color: '#fff' },
  R: { background: '#d3202a', color: '#fff' },
  G: { background: '#00733e', color: '#fff' },
  C: { background: '#9e8e7e', color: '#fff' },
}

export default function ColorPips({ colors }: { colors: string[] }) {
  if (!colors.length) return null

  return (
    <div className="flex gap-0.5">
      {colors.map((c) => (
        <span
          key={c}
          className="mana-pip"
          title={c}
          style={COLOR_STYLES[c] ?? { background: '#555', color: '#fff' }}
        >
          {c}
        </span>
      ))}
    </div>
  )
}
