import { forwardRef, type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger'
  size?: 'sm' | 'md'
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', style, ...props }, ref) => {
    const base: React.CSSProperties = {
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '6px',
      fontWeight: 500,
      borderRadius: '8px',
      border: '1px solid',
      cursor: 'pointer',
      transition: 'all 0.15s',
      padding: size === 'sm' ? '4px 12px' : '8px 16px',
      fontSize: size === 'sm' ? '13px' : '14px',
      ...(variant === 'primary' && {
        background: 'var(--color-accent)',
        borderColor: 'var(--color-accent)',
        color: '#0f0e0d',
      }),
      ...(variant === 'ghost' && {
        background: 'transparent',
        borderColor: 'var(--color-border)',
        color: 'var(--color-text-primary)',
      }),
      ...(variant === 'danger' && {
        background: 'transparent',
        borderColor: 'var(--color-mana-r)',
        color: 'var(--color-mana-r)',
      }),
      ...style,
    }

    return (
      <button ref={ref} style={base} className={className} {...props} />
    )
  }
)

Button.displayName = 'Button'
export default Button
