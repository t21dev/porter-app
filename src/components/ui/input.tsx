import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-9 w-full rounded-lg border border-border bg-card px-3 text-[13px] text-foreground',
          'placeholder:text-subtle transition-[border-color,background-color] duration-150 ease-out',
          'hover:border-input focus-visible:outline-none focus-visible:border-ring/60 focus-visible:bg-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

export { Input };
