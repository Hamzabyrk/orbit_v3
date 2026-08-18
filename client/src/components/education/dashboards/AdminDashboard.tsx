import {
  BarChart3,
  BookOpen,
  ChevronRight,
  CircleAlert,
  ClipboardCheck,
  MessageSquare,
  Sparkles,
  UserRoundCheck,
  Users,
  WalletCards,
} from "lucide-react";
import { classes, schedule } from "../mockData";
import { AutomationMini, Badge, StatCard } from "../shared";
import type { Section } from "../types";

export function AdminDashboard({
  onNavigate,
}: {
  onNavigate: (section: Section) => void;
}) {
  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white px-5 py-6 shadow-[0_10px_30px_rgba(15,23,42,.04)] sm:px-7">
        <div className="absolute -right-20 -top-28 h-64 w-64 rounded-full bg-sky-100/70 blur-3xl" />
        <div className="relative flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-blue-600">
              Kurum genel bakış
            </p>
            <h1 className="mt-2 font-display text-[27px] font-extrabold tracking-[-.055em] text-slate-950 sm:text-[33px]">
              Günün eğitim operasyonu kontrol altında.
            </h1>
            <p className="mt-2 max-w-2xl text-[12px] leading-5 text-slate-500">
              Çorlu Şube’de aday kayıtları, dersler, yoklamalar ve veli
              takipleri tek çalışma alanında güncel.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="green">Sistemler çalışıyor</Badge>
            <Badge tone="blue">15 Ağustos 2026</Badge>
          </div>
        </div>
      </section>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Aktif öğrenci"
          value="54"
          detail="3 sınıfta kayıtlı"
          icon={Users}
        />
        <StatCard
          label="Bugünkü devam"
          value="%93"
          detail="4 yoklama tamamlandı"
          icon={ClipboardCheck}
          tone="green"
        />
        <StatCard
          label="Takip gerekli"
          value="4"
          detail="Akademik veya devam sinyali"
          icon={CircleAlert}
          tone="amber"
        />
        <StatCard
          label="Yaklaşan tahsilat"
          value="₺86.400"
          detail="7 taksit bu hafta vade"
          icon={WalletCards}
          tone="violet"
        />
        <StatCard
          label="Çalışan otomasyon"
          value="3"
          detail="Son 24 saatte 15 işlem"
          icon={Sparkles}
          tone="blue"
        />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_.9fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.03)]">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-[17px] font-extrabold tracking-[-.03em] text-slate-900">
                Bugünün akışı
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Ders, görüşme ve otomasyon kaynaklı kritik noktalar
              </p>
            </div>
            <button
              onClick={() => onNavigate("Ders Programı")}
              className="text-[11px] font-bold text-blue-600"
            >
              Takvimi aç
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {schedule.slice(0, 3).map(item => (
              <div
                key={item.time}
                className="flex items-center gap-3 rounded-xl border border-slate-100 px-3.5 py-3"
              >
                <span className="w-10 text-[11px] font-extrabold tabular-nums text-slate-500">
                  {item.time}
                </span>
                <span
                  className={`grid h-9 w-9 place-items-center rounded-lg ring-1 ${item.tone}`}
                >
                  <BookOpen className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-bold text-slate-800">
                    {item.title}{" "}
                    <span className="font-medium text-slate-400">
                      · {item.group}
                    </span>
                  </p>
                  <p className="mt-0.5 text-[10px] text-slate-500">
                    {item.teacher} · {item.room}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300" />
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-amber-100 bg-amber-50/55 p-5">
          <div className="flex gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-100 text-amber-700">
              <CircleAlert className="h-4 w-4" />
            </span>
            <div>
              <h2 className="text-[14px] font-extrabold text-amber-900">
                İnsan takibi gerekenler
              </h2>
              <p className="mt-1 text-[11px] leading-5 text-amber-800">
                Efe Demir’in son iki deneme sonucunda gerileme ve Aras Öztürk’te
                devamsızlık sinyali var.
              </p>
              <button
                onClick={() => onNavigate("Öğrenciler")}
                className="mt-3 text-[11px] font-bold text-amber-800 underline underline-offset-4"
              >
                Öğrencileri incele
              </button>
            </div>
          </div>
        </section>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.03)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-[17px] font-extrabold tracking-[-.03em] text-slate-900">
                Sınıf performansı
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Son deneme ve devam görünümü
              </p>
            </div>
            <button
              onClick={() => onNavigate("Sınıflar")}
              className="text-[11px] font-bold text-blue-600"
            >
              Tüm sınıflar
            </button>
          </div>
          <div className="mt-4 space-y-3">
            {classes.map(group => (
              <div
                key={group.id}
                className="rounded-xl border border-slate-100 p-3.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] font-extrabold text-slate-800">
                      {group.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {group.program} · {group.studentCount} öğrenci
                    </p>
                  </div>
                  <Badge tone={group.attendance < 90 ? "amber" : "green"}>
                    Devam %{group.attendance}
                  </Badge>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <span
                    style={{ width: `${group.attendance}%` }}
                    className={`block h-full rounded-full ${group.attendance < 90 ? "bg-amber-400" : "bg-emerald-500"}`}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_16px_rgba(15,23,42,.03)]">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-[17px] font-extrabold tracking-[-.03em] text-slate-900">
                Otomasyon merkezi
              </h2>
              <p className="mt-1 text-[11px] text-slate-500">
                Bugün çalışan eğitim akışları
              </p>
            </div>
            <button
              onClick={() => onNavigate("Otomasyonlar")}
              className="text-[11px] font-bold text-blue-600"
            >
              Yönet
            </button>
          </div>
          <div className="mt-4 space-y-3">
            <AutomationMini
              title="Aday kayıt takibi"
              detail="4 aday için sonraki adım açıldı"
              icon={UserRoundCheck}
            />
            <AutomationMini
              title="Devamsızlık bildirimi"
              detail="3 veli bildirimi taslağı hazırlandı"
              icon={ClipboardCheck}
            />
            <AutomationMini
              title="Deneme sonucu takibi"
              detail="42 öğrenci gelişim özeti aldı"
              icon={BarChart3}
            />
            <AutomationMini
              title="Veli iletişim merkezi"
              detail="2 görüşme önerisi bekliyor"
              icon={MessageSquare}
            />
          </div>
        </section>
      </div>
    </>
  );
}
