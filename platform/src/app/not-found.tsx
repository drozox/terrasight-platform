import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex h-full flex-1 items-center justify-center">
      <div className="text-center">
        <p className="text-6xl font-bold text-primary">404</p>
        <p className="mt-2 text-on-surface-variant">
          Esta vista no existe o fue removida.
        </p>
        <Link href="/" className="mt-4 inline-block text-primary hover:underline">
          ← Volver al dashboard
        </Link>
      </div>
    </div>
  );
}
