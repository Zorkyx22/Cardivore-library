import type { LucideProps } from 'lucide-react'
type LucideIcon = React.FC<LucideProps>

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
}

export default function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-8 text-center">
      <Icon size={40} style={{ color: 'var(--color-accent-dim)' }} />
      <div>
        <p className="text-lg font-medium" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </p>
        {description && (
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            {description}
          </p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}
