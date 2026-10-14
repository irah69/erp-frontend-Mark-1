'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type CardVariant = 'default' | 'accent';

const CardContext = React.createContext<CardVariant | null>(null);

function useCardVariant() {
  const variant = React.useContext(CardContext);

  if (!variant) {
    throw new Error('Card subcomponents must be used within a Card component');
  }

  return variant;
}

function Card({
  className,
  variant = 'default',
  children,
  ...props
}: React.ComponentProps<'div'> & { variant?: CardVariant }) {
  const variantClass =
    variant === 'accent'
      ? 'bg-muted p-1 shadow-xs'
      : 'border border-border bg-card shadow-xs';

  return (
    <CardContext.Provider value={variant}>
      <div
        data-slot="card"
        className={cn('flex flex-col items-stretch rounded-xl text-card-foreground', variantClass, className)}
        {...props}
      >
        {children}
      </div>
    </CardContext.Provider>
  );
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  const variant = useCardVariant();
  return (
    <div
      data-slot="card-header"
      className={cn(
        'flex min-h-14 flex-wrap items-center justify-between gap-2.5 px-5',
        variant === 'default' && 'border-b border-border',
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  const variant = useCardVariant();
  return (
    <div
      data-slot="card-content"
      className={cn(
        'grow p-5',
        variant === 'accent' && 'rounded-t-xl bg-card [&:last-child]:rounded-b-xl',
        className,
      )}
      {...props}
    />
  );
}

function CardTable({ className, ...props }: React.ComponentProps<'div'>) {
  const variant = useCardVariant();
  return (
    <div
      data-slot="card-table"
      className={cn('grid grow', variant === 'accent' && 'rounded-xl bg-card', className)}
      {...props}
    />
  );
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  const variant = useCardVariant();
  return (
    <div
      data-slot="card-footer"
      className={cn(
        'flex min-h-14 items-center px-5',
        variant === 'default' ? 'border-t border-border' : 'mt-[2px] rounded-b-xl bg-card',
        className,
      )}
      {...props}
    />
  );
}

function CardHeading({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-heading" className={cn('space-y-1', className)} {...props} />;
}

function CardToolbar({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-toolbar" className={cn('flex items-center gap-2.5', className)} {...props} />;
}

function CardTitle({ className, ...props }: React.ComponentProps<'h3'>) {
  return (
    <h3
      data-slot="card-title"
      className={cn('text-base font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-description" className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardHeading,
  CardTable,
  CardTitle,
  CardToolbar,
};
