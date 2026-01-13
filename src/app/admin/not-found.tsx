import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
            <h2 className="text-3xl font-bold mb-4">Página não encontrada</h2>
            <p className="text-gray-600 mb-6">
                A página que você está procurando não existe.
            </p>
            <Button asChild>
                <Link href="/admin">Voltar para Admin</Link>
            </Button>
        </div>
    );
}
