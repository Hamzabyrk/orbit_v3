import { Check, Minus } from "lucide-react";
import {
  availableEducationSections,
  canAccessEducationSection,
  type EducationRole,
} from "@/components/educationAccess";
import { roleMeta } from "../mockData";

const ROLE_ORDER: EducationRole[] = ["admin", "teacher", "student", "parent"];

export function SettingsAccessMatrix() {
  // admin, MVP kapsamında tüm bölümlere erişebilen tek rol olduğu için
  // tam bölüm listesini onun erişiminden türetiyoruz.
  const sections = availableEducationSections("admin");

  return (
    <>
      <h2 className="font-display text-[18px] font-extrabold text-slate-900">
        Roller ve Erişim
      </h2>
      <p className="mt-1 text-[11px] text-slate-500">
        Hangi rolün hangi bölümü görebildiğinin güncel dökümü — canlı erişim
        kurallarından üretilir.
      </p>
      <section className="mt-5 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,.025)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-[.08em] text-slate-400">
                <th className="px-5 py-3.5">Bölüm</th>
                {ROLE_ORDER.map(role => (
                  <th key={role} className="px-5 py-3.5 text-center">
                    {roleMeta[role].short}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sections.map(section => (
                <tr
                  key={section}
                  className="border-b border-slate-100 text-[12px] last:border-0"
                >
                  <td className="px-5 py-3 font-semibold text-slate-700">
                    {section}
                  </td>
                  {ROLE_ORDER.map(role => (
                    <td key={role} className="px-5 py-3 text-center">
                      {canAccessEducationSection(role, section) ? (
                        <Check className="mx-auto h-4 w-4 text-emerald-600" />
                      ) : (
                        <Minus className="mx-auto h-4 w-4 text-slate-300" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
