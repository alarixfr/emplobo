"use client";

import { useOrganization } from "@clerk/nextjs";
import { useEffect, useRef, useState } from "react";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function InviteEmployeeDialog() {
  const { organization } = useOrganization();
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "sending" | "sent" | "error"
  >("idle");
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setStatus("idle");
      setMessage(null);
      setEmail("");
      // focus the field on the next tick so the dialog finish mounting first
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  if (!organization) return null;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) {
      setStatus("error");
      setMessage("Masukkan alamat email yang valid.");
      return;
    }
    setStatus("sending");
    setMessage(null);
    try {
      // org:member maps to the in-app EMPLOYEE role (see Section 3).
      const org = organization;
      if (!org) throw new Error("no active organization");
      await org.inviteMember({
        emailAddress: value,
        role: "org:member",
      });
      setStatus("sent");
      setMessage(`Undangan dikirim ke ${value}. Mereka akan menerimanya lewat email dan halaman onboarding.`);
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Gagal mengirim undangan. Periksa kembali email atau coba lagi nanti.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container"
      >
        <span className="material-symbols-outlined text-[18px]">person_add</span>
        TAMBAH KARYAWAN
      </button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="invite-dialog-title"
        >
          <button
            type="button"
            aria-label="Tutup"
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 cursor-default bg-on-surface/45 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-lg sm:p-8">
            <h2
              id="invite-dialog-title"
              className="font-headline-sm text-headline-sm text-on-surface"
            >
              Undang karyawan
            </h2>
            <p className="mt-1 font-body-sm text-body-sm text-on-surface-variant">
              Kirim undangan belajar ke email karyawan. Begitu diterima, mereka
              bisa mulai onboarding dan mengambil role yang Anda tugaskan.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
              <label
                htmlFor="invite-email"
                className="block font-label-md text-label-md text-on-surface"
              >
                Email
              </label>
              <div className="relative">
                <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-outline">
                  mail
                </span>
                <input
                  ref={inputRef}
                  id="invite-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === "sending"}
                  placeholder="nama@perusahaan.com"
                  className="w-full rounded-xl border border-outline-variant bg-surface-container-lowest py-2.5 pl-10 pr-4 font-body-md text-body-md text-on-surface outline-none transition-colors placeholder:text-outline focus:border-primary focus:ring-2 focus:ring-primary-fixed-dim/50 disabled:opacity-60"
                />
              </div>

              {message ? (
                <p
                  role="status"
                  className={`font-body-sm text-body-sm ${
                    status === "error" ? "text-error" : "text-status-ready"
                  }`}
                >
                  {message}
                </p>
              ) : null}

              <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={status === "sending"}
                  className="inline-flex cursor-pointer items-center justify-center rounded-lg border border-secondary bg-surface-container-lowest px-4 py-2.5 font-label-caps text-label-caps text-secondary transition-colors hover:bg-surface-container-low disabled:cursor-not-allowed disabled:opacity-60"
                >
                  BATAL
                </button>
                <button
                  type="submit"
                  disabled={status === "sending"}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-label-caps text-label-caps text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {status === "sending" ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-on-primary/40 border-t-on-primary" />
                      MENGIRIM…
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px]">
                        send
                      </span>
                      KIRIM UNDANGAN
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}