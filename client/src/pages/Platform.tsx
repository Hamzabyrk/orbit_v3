import { useCallback, useEffect, useState } from "react";
import { Link, Redirect } from "wouter";
import { OrbitMark } from "@/components/OrbitMark";
import { useAuth } from "@/auth/useAuth";
import {
  PlatformNotice,
  PlatformShell,
  PlatformTabs,
} from "@/platform/PlatformShell";
import type { PlatformTab } from "@/platform/tabs";
import { PlatformAuditLog } from "@/platform/PlatformAuditLog";
import { PlatformOperators } from "@/platform/PlatformOperators";
import { PlatformOrganizations } from "@/platform/PlatformOrganizations";
import {
  loadAuditEvents,
  loadOperators,
  loadOrganizations,
  type PlatformAuditEvent,
  type PlatformOperatorRow,
  type PlatformOrganization,
} from "@/platform/platformService";

type PanelData = {
  organizations: PlatformOrganization[];
  operators: PlatformOperatorRow[];
  events: PlatformAuditEvent[];
};

const EMPTY_DATA: PanelData = { organizations: [], operators: [], events: [] };

export default function Platform() {
  const { identity, loading, signOut } = useAuth();
  const [tab, setTab] = useState<PlatformTab>("organizations");
  const [data, setData] = useState<PanelData>(EMPTY_DATA);
  const [dataLoading, setDataLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const isOperator = Boolean(identity?.platformOperator);

  const refresh = useCallback(async () => {
    const [organizations, operators, events] = await Promise.all([
      loadOrganizations(),
      loadOperators(),
      loadAuditEvents(),
    ]);

    setData({ organizations, operators, events });
  }, []);

  useEffect(() => {
    if (!isOperator) {
      setDataLoading(false);
      return;
    }

    let active = true;
    setDataLoading(true);

    refresh()
      .then(() => {
        if (active) setLoadError(null);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setLoadError(
          error instanceof Error ? error.message : "Panel verileri yüklenemedi."
        );
      })
      .finally(() => {
        if (active) setDataLoading(false);
      });

    return () => {
      active = false;
    };
  }, [isOperator, refresh]);

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950">
        <div className="flex items-center gap-3 text-slate-200">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 p-2">
            <OrbitMark inverted className="h-full w-full object-contain" />
          </span>
          <p className="text-sm font-bold">Yetki doğrulanıyor…</p>
        </div>
      </main>
    );
  }

  if (!identity) {
    return <Redirect to="/" />;
  }

  // Yetki kontrolü sunucudadır: `platform_operators` üzerindeki RLS, operatör
  // olmayan kullanıcıya hiçbir satır göstermez ve kurum oluşturma Edge
  // Function'ı operatörlüğü yeniden doğrular. Buradaki kontrol yalnızca
  // kullanıcı deneyimi içindir, güvenlik sınırı değildir.
  if (!identity.platformOperator) {
    return (
      <PlatformShell>
        <PlatformNotice
          title="Bu alana erişiminiz yok"
          description="Platform yönetimi yalnızca geliştirme ekibi içindir."
          footer={
            <Link href="/" className="font-bold text-sky-300">
              Kurum paneline dön
            </Link>
          }
        />
      </PlatformShell>
    );
  }

  return (
    <PlatformShell
      header={
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-[12px] font-bold">{identity.displayName}</p>
            <p className="text-[10px] text-slate-400">
              {identity.platformOperator.role === "owner"
                ? "Sahip"
                : "Operatör"}
              {identity.membership
                ? ` · ${identity.membership.organizationName}`
                : ""}
            </p>
          </div>
          {identity.membership ? (
            <Link
              href="/"
              className="rounded-xl bg-white/10 px-3 py-2 text-[11px] font-bold transition hover:bg-white/20"
            >
              Kurum paneli
            </Link>
          ) : null}
          <button
            type="button"
            onClick={() => void signOut()}
            className="rounded-xl bg-white/10 px-3 py-2 text-[11px] font-bold transition hover:bg-white/20"
          >
            Çıkış
          </button>
        </div>
      }
    >
      <PlatformTabs active={tab} onChange={setTab} />

      {dataLoading ? (
        <PlatformNotice
          title="Yükleniyor…"
          description="Kurum, operatör ve denetim kayıtları getiriliyor."
        />
      ) : loadError ? (
        <PlatformNotice
          title="Veriler yüklenemedi"
          description={loadError}
          footer={
            <button
              type="button"
              onClick={() => {
                setDataLoading(true);
                refresh()
                  .then(() => setLoadError(null))
                  .catch((error: unknown) =>
                    setLoadError(
                      error instanceof Error
                        ? error.message
                        : "Panel verileri yüklenemedi."
                    )
                  )
                  .finally(() => setDataLoading(false));
              }}
              className="font-bold text-sky-300"
            >
              Tekrar dene
            </button>
          }
        />
      ) : tab === "organizations" ? (
        <PlatformOrganizations
          organizations={data.organizations}
          onCreated={() => void refresh()}
        />
      ) : tab === "operators" ? (
        <PlatformOperators operators={data.operators} />
      ) : (
        <PlatformAuditLog events={data.events} />
      )}
    </PlatformShell>
  );
}
