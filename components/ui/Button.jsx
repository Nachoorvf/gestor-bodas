import Link from 'next/link';

export default function Button({
  children,
  href,
  variant = 'primary',
  className = '',
  ...props
}) {
  const baseStyles = "inline-flex items-center justify-center px-6 py-3 rounded-xl font-medium tracking-wide transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-1";

  const variants = {
    primary: "bg-boda-text text-white hover:bg-black focus:ring-gray-800 shadow-md shadow-gray-200", // Black Luxury
    secondary: "bg-gray-100 text-boda-text hover:bg-gray-200 focus:ring-gray-300", // Soft Gray
    outline: "border border-gray-300 text-boda-text hover:bg-gray-50 focus:ring-gray-200", // Minimal Outline
    accent: "bg-boda-accent text-white hover:opacity-90 focus:ring-yellow-400", // Gold
    ghost: "text-boda-text hover:bg-gray-50 font-normal",
    danger: "bg-boda-error text-white hover:opacity-90"
  };

  const combinedStyles = `${baseStyles} ${variants[variant] || variants.primary} ${className}`;

  if (href) {
    return (
      <Link href={href} className={combinedStyles} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button className={combinedStyles} {...props}>
      {children}
    </button>
  );
}
