import Link from 'next/link';

export default function Button({ 
  children, 
  href, 
  variant = 'primary', 
  className = '', 
  ...props 
}) {
  const baseStyles = "inline-flex items-center justify-center px-6 py-3 rounded-full font-medium transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  const variants = {
    primary: "bg-boda-green text-white hover:bg-boda-green-dark focus:ring-boda-green",
    secondary: "bg-boda-pink text-boda-text hover:bg-boda-pink-dark focus:ring-boda-pink",
    outline: "border-2 border-boda-green text-boda-green hover:bg-boda-green-light hover:text-boda-green-dark focus:ring-boda-green",
    white: "bg-white text-boda-text hover:bg-gray-100 shadow-lg focus:ring-white"
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
