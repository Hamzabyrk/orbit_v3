import { AlertTriangle, ShieldCheck } from "lucide-react";
import { useAuth } from "@/auth/useAuth";
import { IDLE_TIMEOUT_MS } from "@/auth/idleTimeout";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const TIMEOUT_OPTIONS = [
  { ms: 15 * 60 * 1000, label: "15 dakika" },
  { ms: 30 * 60 * 1000, label: "30 dakika" },
  { ms: 60 * 60 * 1000, label: "1 saat" },
  { ms: 240 * 60 * 1000, label: "4 saat" },
] as const;

function formatIdleTimeout(ms: number): string {
  const match = TIMEOUT_OPTIONS.find(opt => opt.ms === ms);
  if (match) return match.label;
  const minutes = Math.round(ms / (60 * 1000));
  return `${minutes} dakika`;
}

/**
 * Seçicide gösterilecek etiketler.
 *
 * Geçerli süre listede yoksa başa eklenir: Radix Select, `value`'suna karşılık
 * gelen bir öğe bulamazsa hiçbir şey çizmez. `IDLE_TIMEOUT_MS` bir gün listede
 * olmayan bir değere çekilirse ekran, süreyi yanlış değil **boş** gösterirdi —
 * sessizce bozulan bir güvenlik bilgisi.
 */
function timeoutLabels(activeLabel: string): string[] {
  const labels: string[] = TIMEOUT_OPTIONS.map(option => option.label);
  return labels.includes(activeLabel) ? labels : [activeLabel, ...labels];
}

export function SettingsSecuritySection() {
  const { identity } = useAuth();
  const activeTimeoutLabel = formatIdleTimeout(IDLE_TIMEOUT_MS);

  const isAdmin = identity?.membership?.role === "admin";
  // Geri düşüş yok: kimlik bu alanı zorunlu taşıyor ve "bilinmiyor" durumunun
  // adı zaten var. Buraya ikinci bir varsayılan yazmak, kuralı kimlik
  // katmanından bir ekran dosyasına taşırdı (K-06).
  const recoveryChannel = identity?.recoveryChannel ?? "unresolved";

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-[18px] font-extrabold text-slate-900">
          Güvenlik Tercihleri
        </h2>
        <button
          type="button"
          disabled
          className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-4 text-[11px] font-bold text-white shadow-[0_8px_16px_rgba(15,23,42,.12)] transition disabled:cursor-not-allowed disabled:opacity-40"
        >
          Değişiklikleri Kaydet
        </button>
      </div>

      {recoveryChannel === "missing" ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-[12px] leading-5 text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-bold text-amber-900">
              Hesabınıza kayıtlı bir kurtarma e-postası bulunmuyor
            </p>
            <p className="mt-1 text-amber-800">
              {isAdmin
                ? "Şifrenizi unutmanız durumunda kendi başınıza sıfırlama yapamazsınız; yeni geçici şifre için platform operatörüne başvurmanız gerekir."
                : "Şifrenizi unutmanız durumunda kendi başınıza sıfırlama yapamazsınız; yeni geçici şifre için kurum yöneticinize başvurmanız gerekir."}
            </p>
          </div>
        </div>
      ) : recoveryChannel === "unresolved" ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-[12px] leading-5 text-amber-950">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <p className="font-bold text-amber-900">
              Kurtarma bilgisi doğrulanamadı
            </p>
            <p className="mt-1 text-amber-800">
              Güvenlik ve kurtarma bilgileriniz şu anda okunamıyor. Lütfen
              sayfayı yenileyin veya daha sonra tekrar deneyin.
            </p>
          </div>
        </div>
      ) : recoveryChannel === "configured" ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-[12px] leading-5 text-emerald-950">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <p className="font-bold text-emerald-900">
              Kurtarma e-postası tanımlı
            </p>
            <p className="mt-1 text-emerald-800">
              Şifrenizi unuttuğunuzda sıfırlama bağlantısı bu adrese gönderilir
              ({identity?.recoveryEmail}).
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-5 max-w-xs">
        <Label className="text-[10px] font-extrabold uppercase tracking-[.06em] text-slate-400">
          Oturum zaman aşımı
        </Label>
        <Select value={activeTimeoutLabel} disabled>
          <SelectTrigger disabled className="mt-1.5 h-9 w-full text-[13px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {timeoutLabels(activeTimeoutLabel).map(label => (
              <SelectItem key={label} value={label}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="mt-4 space-y-2.5">
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-3">
          <div>
            <p className="text-[12px] font-extrabold text-slate-800">
              İki aşamalı doğrulama
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Girişte ikinci doğrulama adımı iste.
            </p>
          </div>
          <Switch disabled checked={false} />
        </div>
        <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-3">
          <div>
            <p className="text-[12px] font-extrabold text-slate-800">
              Yeni cihaz bildirimleri
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Farklı bir cihazdan giriş yapıldığında bildirim gönder.
            </p>
          </div>
          <Switch disabled checked={false} />
        </div>
      </div>
      <p className="mt-4 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] leading-5 text-slate-600">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <span>
          <strong>Bu bölümdeki tercihler henüz işlemiyor.</strong> Oturum zaman
          aşımı herkes için 30 dakikadır ve buradan değiştirilemez; iki aşamalı
          doğrulama ile yeni cihaz bildirimleri de henüz kurulmadı. Yukarıdaki
          kurtarma durumu gerçek bilgidir.
        </span>
      </p>
    </>
  );
}
