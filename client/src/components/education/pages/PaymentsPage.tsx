import { CircleAlert, Clock3, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { paymentRows } from "../mockData";
import { Badge, PageHeader, StatCard } from "../shared";
import type { Role } from "../types";

export function PaymentsPage({ role }: { role: Role }) {
  const visible =
    role === "parent"
      ? paymentRows.filter(item => item.student === "Zeynep Kaya")
      : paymentRows;
  return (
    <>
      <PageHeader
        eyebrow="Kayıt operasyonu"
        title={role === "parent" ? "Kayıt ve ödeme planı" : "Kayıt ve ödemeler"}
        description={
          role === "parent"
            ? "Zeynep Kaya’nın kayıt paketi ve yaklaşan taksitleri."
            : "Kayıt paketleri, taksit planları ve takip gerektiren ödemeler."
        }
        action={role === "admin" ? "Yeni kayıt" : undefined}
        onAction={
          role === "admin"
            ? () =>
                toast.info("Yeni kayıt", {
                  description:
                    "Demo MVP’de kayıt paketleri ve taksit planı yerel veri ile sonraki iterasyonda oluşturulabilir.",
                })
            : undefined
        }
      />
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Bu ay tahsilat"
          value="₺248.600"
          detail="Planlanan tahsilatın %82’si"
          icon={WalletCards}
          tone="green"
        />
        <StatCard
          label="Yaklaşan taksit"
          value="7"
          detail="Önümüzdeki 7 gün"
          icon={Clock3}
          tone="amber"
        />
        <StatCard
          label="Takip gereken"
          value="2"
          detail="İletişim önerisi oluşturuldu"
          icon={CircleAlert}
          tone="rose"
        />
      </div>
      <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,.025)]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-[.08em] text-slate-400">
                <th className="px-5 py-3.5">Öğrenci</th>
                <th className="px-5 py-3.5">Kayıt paketi</th>
                <th className="px-5 py-3.5">Sonraki taksit</th>
                <th className="px-5 py-3.5">Tutar</th>
                <th className="px-5 py-3.5">Durum</th>
                <th className="px-5 py-3.5" />
              </tr>
            </thead>
            <tbody>
              {visible.map(item => (
                <tr
                  key={item.student}
                  className="border-b border-slate-100 text-[12px] last:border-0"
                >
                  <td className="px-5 py-4 font-extrabold text-slate-800">
                    {item.student}
                  </td>
                  <td className="px-5 py-4 text-slate-600">{item.plan}</td>
                  <td className="px-5 py-4 font-semibold text-slate-600">
                    {item.due}
                  </td>
                  <td className="px-5 py-4 font-extrabold text-slate-800">
                    {item.amount}
                  </td>
                  <td className="px-5 py-4">
                    <Badge
                      tone={
                        item.status === "Güncel"
                          ? "green"
                          : item.status === "Gecikme riski"
                            ? "rose"
                            : "amber"
                      }
                    >
                      {item.status}
                    </Badge>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {role === "admin" && item.status !== "Güncel" ? (
                      <button
                        onClick={() =>
                          toast.success("Hatırlatma hazırlandı", {
                            description: `${item.student} velisi için ödeme hatırlatması iletişim kuyruğuna eklendi.`,
                          })
                        }
                        className="text-[11px] font-bold text-blue-600"
                      >
                        Hatırlat
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <p className="mt-4 rounded-xl border border-blue-100 bg-blue-50/50 px-4 py-3 text-[10px] leading-5 text-blue-800">
        <strong>Not:</strong> Bu alan eğitim kurumu tahsilat operasyonunu takip
        eder; resmi muhasebe veya e-Fatura kaydı oluşturmaz.
      </p>
    </>
  );
}
