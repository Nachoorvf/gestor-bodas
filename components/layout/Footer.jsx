import Link from 'next/link';

export default function Footer() {
    return (
        <footer className="bg-white border-t border-gray-100 pt-16 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
                    <div className="col-span-1 md:col-span-2">
                        <Link href="/" className="font-script text-4xl text-boda-text mb-4 block hover:text-boda-accent transition-colors">
                            El Convite
                        </Link>
                        <p className="text-boda-text-light max-w-sm">
                            Tu compañero ideal para planificar el día más importante de tu vida.
                            Organiza cada detalle con amor y precisión.
                        </p>
                    </div>

                    <div>
                        <h3 className="font-bold text-boda-text mb-4 uppercase tracking-wider text-sm">Explora</h3>
                        <ul className="space-y-3">
                            <li><Link href="#" className="text-boda-text-light hover:text-boda-green transition-colors">Invitaciones</Link></li>
                            <li><Link href="#" className="text-boda-text-light hover:text-boda-green transition-colors">Presupuesto</Link></li>
                            <li><Link href="#" className="text-boda-text-light hover:text-boda-green transition-colors">Lista de Invitados</Link></li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold text-boda-text mb-4 uppercase tracking-wider text-sm">Legal</h3>
                        <ul className="space-y-3">
                            <li><Link href="#" className="text-boda-text-light hover:text-boda-green transition-colors">Privacidad</Link></li>
                            <li><Link href="#" className="text-boda-text-light hover:text-boda-green transition-colors">Términos</Link></li>
                            <li><Link href="#" className="text-boda-text-light hover:text-boda-green transition-colors">Contacto</Link></li>
                        </ul>
                    </div>
                </div>

                <div className="border-t border-boda-green/10 pt-8 text-center">
                    <p className="text-boda-text-light text-sm">
                        &copy; {new Date().getFullYear()} El Convite. Todos los derechos reservados.
                    </p>
                </div>
            </div>
        </footer >
    );
}
