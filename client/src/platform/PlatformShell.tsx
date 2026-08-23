import type { ReactNode } from "react";
import { OrbitMark } from "@/components/OrbitMark";

/**
 * Platform operatörü panelinin kabuğu.
 *
 * Dershane ekranlarından (`components/education/`) bilinçli olarak ayrı bir
 * ağaçta duruyor; iki panel farklı kitleye hizmet ediyor ve birbirinin
 * bileşenlerini paylaşmıyor. Bkz. `.ai/PROJECT_STATE.md` bölüm 9.
 */
export function PlatformShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-slate-950 px-5 py-6 text-slate-100 sm:px-8 lg:px-10">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-[1100px] flex-col">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 p-2">
              <OrbitMark
                inverted
                priority
                className="h-full w-full object-contain"
              />
            </span>
            <div>
              <p className="font-orbit text-[20px] font-extrabold tracking-[-.06em]">
                ORBIT
              </p>
              <p className="-mt-1 text-[9px] font-bold uppercase tracking-[.16em] text-sky-300">
                Platform
              </p>
            </div>
          </div>
        </header>

        <section className="my-auto w-full max-w-[640px] self-center rounded-[28px] border border-white/10 bg-white/[.04] p-7 sm:p-10">
          <h1 className="font-display text-[26px] font-extrabold tracking-[-.05em] sm:text-[30px]">
            {title}
          </h1>
          <p className="mt-3 text-[13px] leading-6 text-slate-400">
            {description}
          </p>

          {children ? <div className="mt-7">{children}</div> : null}

          {footer ? (
            <div className="mt-6 border-t border-white/10 pt-5 text-[11px] leading-5 text-slate-400">
              {footer}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
}
