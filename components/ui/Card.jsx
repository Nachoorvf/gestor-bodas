export default function Card({ children, className = '', ...props }) {
    return (
        <div
            className={`bg-white border border-gray-100 shadow-sm rounded-3xl p-8 ${className}`}
            {...props}
        >
            {children}
        </div>
    );
}
