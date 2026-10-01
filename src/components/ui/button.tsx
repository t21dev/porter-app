import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon' | 'xs';
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          'inline-flex select-none items-center justify-center gap-1.5 rounded-md font-medium',
          'transition-[background-color,color,border-color,transform,opacity] duration-150 ease-out',
          'active:scale-[0.97]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 focus-visible:ring-offset-0',
          'disabled:pointer-events-none disabled:opacity-40',
          {
            'bg-primary text-primary-foreground hover:bg-primary/85': variant === 'default',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90':
              variant === 'destructive',
            'border border-border bg-card text-foreground hover:bg-accent hover:border-input':
              variant === 'outline',
            'text-muted-foreground hover:bg-accent hover:text-foreground': variant === 'ghost',
            'h-9 px-4 text-[13px]': size === 'default',
            'h-8 px-3 text-[13px]': size === 'sm',
            'h-10 px-6 text-sm': size === 'lg',
            'h-8 w-8': size === 'icon',
            'h-7 rounded px-2 text-xs': size === 'xs',
          },
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
