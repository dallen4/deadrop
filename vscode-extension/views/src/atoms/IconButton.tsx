import React from 'react';

type IconButtonProps = {
  variant?: 'default' | 'subtle' | 'danger';
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export default function IconButton({
  variant = 'default',
  className = '',
  ...props
}: IconButtonProps) {
  const cls = [
    'icon-btn',
    variant === 'subtle' && 'icon-btn-subtle',
    variant === 'danger' && 'icon-btn-danger',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <button className={cls} {...props} />;
}
