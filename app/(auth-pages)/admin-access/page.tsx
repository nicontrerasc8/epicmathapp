import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import fs from "fs";
import path from "path";

const logoExtensions = ["png", "jpg", "jpeg", "svg", "webp"];

const resolveInstitutionLogo = (input: { slug: string | null; logo_url: string | null }) => {
    if (input.logo_url) return input.logo_url;
    if (!input.slug) return null;
    const base = path.join(process.cwd(), "public", "logos");
    for (const ext of logoExtensions) {
        const filename = `${input.slug}.${ext}`;
        const fullPath = path.join(base, filename);
        if (fs.existsSync(fullPath)) {
            return `/logos/${filename}`;
        }
    }
    return null;
};

export default async function AdminAccessPage() {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    // Si no hay usuario autenticado, redirigir a sign-in
    if (userError || !user) {
        redirect("/sign-in");
    }

    // Verificar que el usuario sea admin
    const { data: profile } = await supabase
        .from("edu_profiles")
        .select("id, global_role, active, first_name, last_name")
        .eq("id", user.id)
        .maybeSingle();

    if (!profile) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6">
                    <h1 className="text-lg font-semibold text-red-800">Perfil no encontrado</h1>
                    <p className="mt-2 text-sm text-red-600">
                        Tu usuario no tiene un perfil asociado. Contacta al administrador del sistema.
                    </p>
                </div>
            </div>
        );
    }

    if (!profile.active) {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="max-w-md rounded-lg border border-yellow-200 bg-yellow-50 p-6">
                    <h1 className="text-lg font-semibold text-yellow-800">Cuenta desactivada</h1>
                    <p className="mt-2 text-sm text-yellow-600">
                        Tu cuenta está desactivada. Contacta al administrador del sistema.
                    </p>
                </div>
            </div>
        );
    }

    if (profile.global_role !== "admin") {
        return (
            <div className="flex min-h-screen items-center justify-center p-4">
                <div className="max-w-md rounded-lg border border-red-200 bg-red-50 p-6">
                    <h1 className="text-lg font-semibold text-red-800">Acceso denegado</h1>
                    <p className="mt-2 text-sm text-red-600">
                        Solo administradores pueden acceder a esta ruta.
                    </p>
                    <p className="mt-2 text-xs text-red-500">
                        Tu rol actual: {profile.global_role}
                    </p>
                </div>
            </div>
        );
    }

    // Usuario es admin - mostrar TODAS las instituciones activas (super admin)
    const { data: institutions } = await supabase
        .from("edu_institutions")
        .select("id, slug, name, logo_url")
        .eq("active", true)
        .order("name", { ascending: true });

    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-2xl rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
                <h1 className="text-2xl font-bold text-gray-900">
                    Acceso Administrativo
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                    Bienvenido, {profile.first_name} {profile.last_name}
                </p>

                <div className="mt-8">
                    <h2 className="text-lg font-semibold text-gray-900">
                        Selecciona una institución:
                    </h2>

                    {!institutions || institutions.length === 0 ? (
                        <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
                            <p className="text-sm text-yellow-800">
                                No hay instituciones activas en el sistema.
                            </p>
                            <p className="mt-2 text-xs text-yellow-600">
                                Crea una institución desde la base de datos primero.
                            </p>
                        </div>
                    ) : (
                        <div className="mt-4 space-y-3">
                            {institutions.map((inst) => {
                                // Construir URL del dashboard admin
                                const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
                                const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'ludus-edu.com';
                                const port = process.env.NODE_ENV === 'production' ? '' : ':3000';
                                const host = process.env.NODE_ENV === 'production'
                                    ? `${inst.slug}.${rootDomain}`
                                    : `${inst.slug}.localhost${port}`;
                                const dashboardUrl = `${protocol}://${host}/dashboard/admin`;
                                const logoSrc = resolveInstitutionLogo({
                                    slug: inst.slug,
                                    logo_url: inst.logo_url,
                                });

                                return (
                                    <a
                                        key={inst.id}
                                        href={dashboardUrl}
                                        className="block rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-500 hover:bg-blue-50"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 items-center justify-center rounded-md border border-gray-200 bg-white text-sm font-semibold text-gray-700">
                                                    {logoSrc ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={logoSrc}
                                                            alt={`${inst.name} logo`}
                                                            className="h-8 w-8 object-contain"
                                                        />
                                                    ) : (
                                                        <span>{inst.name?.slice(0, 1).toUpperCase() || "I"}</span>
                                                    )}
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-gray-900">{inst.name}</h3>
                                                    <p className="text-sm text-gray-500">{inst.slug}</p>
                                                </div>
                                            </div>
                                            <svg
                                                className="h-5 w-5 text-gray-400"
                                                fill="none"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="2"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path d="M9 5l7 7-7 7" />
                                            </svg>
                                        </div>
                                    </a>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="mt-8 border-t border-gray-200 pt-6">
                    <p className="text-xs text-gray-500">
                        💡 <strong>Tip:</strong> Marca esta página como favorito para acceso rápido
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                        Ruta: /admin-access
                    </p>
                </div>
            </div>
        </div>
    );
}
