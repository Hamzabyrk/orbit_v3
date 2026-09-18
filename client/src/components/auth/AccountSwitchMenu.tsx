import * as React from "react";
import { useState } from "react";
import { ArrowLeftRight, Check, Loader2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { isDemoMode } from "@/auth/runtime";
import {
  type LinkedAccount,
  switchAccount,
  unlinkAccounts,
  useLinkedAccounts,
} from "@/auth/accountLinkService";
import { roleMeta } from "@/components/education/roleMeta";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AccountSwitchMenuProps {
  /** Test veya özel kurgularda doğrudan hesap listesi geçebilmek için */
  accounts?: LinkedAccount[];
}

/**
 * Kişinin bağlı kardeş hesapları arasında geçiş menüsü (sağ üst başlık).
 *
 * Kurallar (v1.4-17 / K-22):
 * - `my_linked_accounts()` iki veya daha fazla satır döndürürse çizilir;
 *   aksi hâlde BİLEŞEN HİÇ RENDER EDİLMEZ (boş liste ve tek satırda null döner).
 * - Her satır: Rol + Kurum adı. Ad ikisinde de aynı olduğundan ayırt eden şey roldür.
 * - `is_current` olan satır seçili görünür ve TIKLANAMAZ (`disabled`).
 * - Geçiş sırasında düğme kilitlidir ve bekleme göstergesi vardır;
 *   oturum değişimi tek tıkla iki kez tetiklenemez.
 * - Demo modunda menü yoktur (canlı sorgu çalıştırılmaz).
 *
 * 🔴 **Bağı koparma yolu burada (v1.5-07/B2).** §4.15'te ölçüldü: bağı koparan
 *   hiçbir yol yoktu ve yanlış kurulmuş bir bağ ancak `service_role` ile elle
 *   müdahaleyle çözülebiliyordu. Yetki **kişinin kendisinde** (karar
 *   2026-09-16); yönetici koparabilse, bağı hatalı kuran kişi izini de
 *   temizleyebilirdi.
 * - Koparma **iki adımlı**: ilk tıklama menüyü açık tutup onay ister. Tarayıcı
 *   diyaloğu kullanılmıyor — geri alınamaz bir işlemin onayı, işlemin kendisiyle
 *   aynı yerde durmalı.
 */
export function AccountSwitchMenu({
  accounts: propAccounts,
}: AccountSwitchMenuProps) {
  const query = useLinkedAccounts({
    enabled: propAccounts === undefined && !isDemoMode,
  });

  const accounts = propAccounts ?? query.data ?? [];
  const [isSwitching, setIsSwitching] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState(false);

  // Demo modunda veya iki hesap yoksa menü HİÇ çizilmez
  if (isDemoMode || accounts.length < 2) {
    return null;
  }

  const handleSelect = async (targetUserId: string, isCurrent: boolean) => {
    if (isCurrent || isSwitching) {
      return;
    }

    setIsSwitching(true);
    try {
      await switchAccount(targetUserId);
      toast.success("Hesap değiştirildi.");
    } catch (err) {
      setIsSwitching(false);
      const message =
        err instanceof Error ? err.message : "Bu hesaba geçiş yapılamadı.";
      toast.error(message);
    }
  };

  const handleUnlink = async () => {
    if (isUnlinking || isSwitching) {
      return;
    }

    setIsUnlinking(true);
    try {
      const remaining = await unlinkAccounts();
      toast.success(
        remaining > 0
          ? `Bağ koparıldı. ${remaining} hesap bağlı kaldı.`
          : "Bağ koparıldı. Bu hesap artık hiçbir hesaba bağlı değil."
      );
      // Listeyi kendi sorgusundan tazeliyoruz. `useQueryClient` kullanmak
      // bileşeni bir sağlayıcıya bağlardı ve statik render testleri
      // sağlayıcısız koşuyor — bağ gereksizdi.
      await query.refetch();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Bağ koparılamadı.";
      toast.error(message);
    } finally {
      setIsUnlinking(false);
      setConfirmUnlink(false);
    }
  };

  return (
    <DropdownMenu
      onOpenChange={open => {
        if (!open) {
          setConfirmUnlink(false);
        }
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          data-slot="account-switch-trigger"
          disabled={isSwitching}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          title="Bağlı hesaplar arasında geçiş yap"
        >
          {isSwitching ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-600" />
          ) : (
            <ArrowLeftRight className="h-3.5 w-3.5 text-slate-500" />
          )}
          <span>Hesap Değiştir</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-64 p-1.5"
        data-slot="account-switch-menu"
      >
        <div className="px-2 py-1.5 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          Bağlı Hesaplar
        </div>
        {accounts.map(acc => {
          const roleLabel = roleMeta[acc.role]?.label || acc.role;
          return (
            <DropdownMenuItem
              key={acc.userId}
              disabled={acc.isCurrent || isSwitching}
              onSelect={() => void handleSelect(acc.userId, acc.isCurrent)}
              className={`flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-[12px] ${
                acc.isCurrent
                  ? "bg-slate-50 font-bold text-slate-900 cursor-default opacity-90"
                  : "cursor-pointer text-slate-700 hover:bg-slate-100"
              }`}
              data-slot="account-item"
              data-current={acc.isCurrent ? "true" : "false"}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-slate-900">{roleLabel}</span>
                  {acc.isCurrent && (
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-700">
                      Mevcut
                    </span>
                  )}
                </div>
                <p className="truncate text-[11px] text-slate-500">
                  {acc.organizationName}
                </p>
              </div>
              {acc.isCurrent && (
                <Check className="h-4 w-4 shrink-0 text-slate-700" />
              )}
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator className="my-1.5" />
        <DropdownMenuItem
          disabled={isUnlinking || isSwitching}
          onSelect={event => {
            // Menü açık kalsın: onay, işlemin kendisiyle aynı yerde durmalı.
            event.preventDefault();
            if (!confirmUnlink) {
              setConfirmUnlink(true);
              return;
            }
            void handleUnlink();
          }}
          className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-[12px] font-bold text-rose-600 hover:bg-rose-50 focus:bg-rose-50 focus:text-rose-700"
          data-slot="account-unlink"
          data-confirming={confirmUnlink ? "true" : "false"}
        >
          {isUnlinking ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
          ) : (
            <Unlink className="h-3.5 w-3.5 shrink-0" />
          )}
          <span>
            {confirmUnlink ? "Emin misiniz? Bağı kopar" : "Hesap bağını kopar"}
          </span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
