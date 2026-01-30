export default function Card({ children, className = '', ...props }) {
    return (
        <div
            className={`bg-white/80 backdrop-blur-md border border-white/20 shadow-xl rounded-2xl p-6 hover:shadow-2xl transition-shadow duration-300 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
