import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  icon, 
  className = '',
  ...props 
}) => {
  const baseStyles = "inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-lg active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden";
  
  const variants = {
    // Light: Readex Green background, Black text
    // Dark: Gradient Lime, Black text, Glow
    primary: "bg-readex-green text-readex-black border border-readex-black/5 hover:bg-[#aed888] dark:bg-gradient-to-br dark:from-lime-400 dark:to-lime-500 dark:text-black dark:border-lime-300/50 dark:shadow-[0_0_20px_rgba(163,230,53,0.2)] dark:hover:shadow-[0_0_30px_rgba(163,230,53,0.4)]",
    
    // Light: White background, Black text, Border
    // Dark: Zinc background
    secondary: "bg-white text-readex-black border border-gray-200 hover:bg-gray-50 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 dark:border-zinc-700 dark:shadow-lg",
    
    danger: "bg-red-100 text-red-600 border border-red-200 hover:bg-red-200 dark:bg-gradient-to-br dark:from-rose-500 dark:to-rose-600 dark:hover:to-rose-500 dark:text-white dark:border-rose-500/50 dark:shadow-[0_0_20px_rgba(225,29,72,0.2)]",
    
    ghost: "bg-transparent text-zinc-500 hover:bg-black/5 hover:text-readex-black dark:hover:bg-white/5 dark:text-zinc-400 dark:hover:text-zinc-100"
  };

  const sizes = {
    sm: "text-xs px-3 py-1.5 gap-1.5",
    md: "text-sm px-4 py-3 gap-2",
    lg: "text-base px-6 py-4 gap-3"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && <span className="shrink-0 relative z-10">{icon}</span>}
      <span className="relative z-10">{children}</span>
    </button>
  );
};