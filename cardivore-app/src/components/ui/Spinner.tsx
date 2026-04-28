export default function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div
      className="animate-spin rounded-full border-2 shrink-0"
      style={{
        width: size,
        height: size,
        borderColor: 'var(--color-border)',
        borderTopColor: 'var(--color-accent)',
      }}
    />
  )
}
