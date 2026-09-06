import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { StatusBadge } from "@/components/ui/status-badge";
import { apiFetch } from "@/lib/api";
import { Reveal } from "@/components/motion/reveal";
import type { ContentHubResponse } from "@/lib/content";

function roleIcon(name: string): string {
  const n = name.toLowerCase();
  if (/(barista|kopi|coffee|cafe)/.test(n)) return "local_cafe";
  if (/(kasir|cashier)/.test(n)) return "point_of_sale";
  if (/(waiter|pelayan|server|resto)/.test(n)) return "restaurant";
  if (/(koki|dapur|chef|cook)/.test(n)) return "skillet";
  if (/(gudang|warehouse|stock|stok)/.test(n)) return "warehouse";
  return "work";
}

export default async function ContentHubPage() {
  const { orgRole, getToken } = await auth();

  if (orgRole !== "org:admin") {
    redirect("/app");
  }

  const token = await getToken();
  if (!token) {
    redirect("/sign-in");
  }

  let roles: ContentHubResponse["roles"] = [];
  let loadError: string | null = null;
  try {
    const data = await apiFetch<ContentHubResponse>("/api/content", { token });
    roles = data.roles;
  } catch (err) {
    loadError =
      err instanceof Error && "status" in err && (err as { status?: number }).status === 503
        ? "Database sedang tidak tersedia. Coba lagi beberapa saat atau periksa koneksi Neon."
        : "Gagal memuat daftar konten. Pastikan API berjalan dan sesi masih aktif.";
  }

  return (
    <div className="mx-auto w-full max-w-container space-y-8">
      <Reveal y={18} x={0} delay={0} duration={0.7}>
        <div className="flex flex-col justify-between gap-4">
          <div>
            <h1 className="font-headline-md text-headline-md text-on-surface">
              Konten Guide
            </h1>
            <p className="mt-1 max-w-2xl font-body-md text-body-md text-on-surface-variant">
              Tinjau dan edit panduan hasil AI sesuai kebutuhan, ubah urutan chapter,
              perbaiki isi markdown, dan sesuaikan soal kuis sebelum dibagikan ke
              karyawan.
            </p>
          </div>
        </div>
      </Reveal>

      <section>
        {loadError ? (
          <p className="mt-4 rounded-lg border border-error-container bg-error-container/40 p-4 font-body-sm text-body-sm text-error">
            {loadError}
          </p>
        ) : roles.length === 0 ? (
          <p className="rounded-lg border border-dashed border-outline-variant bg-surface-container-lowest p-8 text-center font-body-md text-body-md text-on-surface-variant">
            Belum ada guide yang dipublikasikan. Latih role di Training Room,
            lalu generate guide-nya. Setelah itu panduan bisa diedit di sini.
          </p>
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {roles.map((role) => (
              <li key={role.id}>
                <Link
                  href={`/app/content/${role.id}`}
                  className="group flex h-full flex-col rounded-lg border border-outline-variant bg-surface-container-lowest p-5 shadow-sm transition-colors hover:border-primary/40 hover:bg-surface-bright"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-fixed">
                        <span className="material-symbols-outlined text-[20px] text-on-primary-fixed-variant">
                          {roleIcon(role.name)}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-data-point text-data-point font-bold text-on-surface">
                          {role.name}
                        </p>
                        {role.description ? (
                          <p className="mt-0.5 truncate font-body-sm text-body-sm text-secondary">
                            {role.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <StatusBadge status={role.status} />
                  </div>

                  <div className="mt-4 flex items-center gap-3 text-[12px] text-secondary">
                    <span className="material-symbols-outlined text-[16px]">menu_book</span>
                    {role.guide ? `${role.guide.chapterCount} chapter` : "Tanpa guide"}
                    {role.guide && role.guide.questionCount > 0 ? (
                      <>
                        <span>·</span>
                        <span className="material-symbols-outlined text-[16px]">quiz</span>
                        {role.guide.questionCount} soal
                      </>
                    ) : null}
                    <span>·</span>
                    <span>v{role.guide ? role.guide.version : "—"}</span>
                  </div>

                  <div className="mt-auto pt-4">
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-primary px-3 py-1.5 font-label-caps text-label-caps text-primary transition-colors group-hover:bg-primary-fixed-dim/40">
                      <span className="material-symbols-outlined text-[16px]">edit_note</span>
                      EDIT KONTEN
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}