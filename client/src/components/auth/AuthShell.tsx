import type { ReactNode } from "react";
import { OrbitMark } from "@/components/OrbitMark";

/**
 * Giriş dışındaki auth ekranları (şifre sıfırlama, şifre belirleme) için ortak
 * kabuk. `EducationLoginScreen` ile aynı görsel dili kullanır ancak o bileşeni
 * refactor etmez; çalışan giriş akışına dokunmadan tutarlı bir görünüm sağlar.
 */
export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[#eef7ff] px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1200px] flex-col">
        <header className="flex items-center gap-2.5">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-slate-900 p-2">
            <OrbitMark
              inverted
              priority
              className="h-full w-full object-contain"
            />
          </span>
          <div>
            <p className="font-orbit text-[20px] font-extrabold tracking-[-.06em] text-slate-900">
              ORBIT
            </p>
            <p className="-mt-1 text-[9px] font-bold uppercase tracking-[.16em] text-blue-600">
              Education
            </p>
          </div>
        </header>

        <section className="my-auto w-full max-w-[520px] self-center overflow-hidden rounded-[28px] border border-white/80 bg-white p-7 shadow-[0_26px_80px_rgba(75,135,180,.18)] sm:p-10">
          <h1 className="font-display text-[26px] font-extrabold tracking-[-.05em] text-slate-950 sm:text-[30px]">
            {title}
          </h1>
          <p className="mt-3 text-[13px] leading-6 text-slate-500">
            {description}
          </p>

          <div className="mt-7">{children}</div>

          {footer ? (
            <div className="mt-6 border-t border-slate-100 pt-5 text-[11px] leading-5 text-slate-500">
              {footer}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export function AuthField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

export const authInputClassName =
  "h-12 w-full rounded-xl border border-slate-200 px-3 text-[13px] outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-50";

export const authButtonClassName =
  "mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-900 text-[13px] font-extrabold text-white shadow-[0_10px_18px_rgba(15,23,42,.12)] transition hover:bg-slate-800 disabled:opacity-70";
