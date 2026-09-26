import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  children: ReactNode;
}

export default function Card({ hover = false, className = '', children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/70 bg-white shadow-soft ${hover ? 'transition-shadow hover:shadow-lift' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
