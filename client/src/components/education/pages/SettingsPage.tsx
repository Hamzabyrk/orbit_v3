import { useState } from "react";
import { PageHeader } from "../shared";
import type { Role } from "../types";
import { SettingsAccessMatrix } from "./SettingsAccessMatrix";
import { SettingsCategoryList } from "./SettingsCategoryList";
import { SettingsDataImportSection } from "./SettingsDataImportSection";
import { SettingsDataManagementSection } from "./SettingsDataManagementSection";
import { SettingsInstitutionSection } from "./SettingsInstitutionSection";
import { SettingsNotificationsSection } from "./SettingsNotificationsSection";
import { SettingsProfileSection } from "./SettingsProfileSection";
import { SettingsSecuritySection } from "./SettingsSecuritySection";
import { SettingsSystemSection } from "./SettingsSystemSection";
import {
  SETTINGS_CATEGORIES,
  type SettingsCategoryId,
} from "./settingsCategories";

export function SettingsPage({
  role,
  onResetDemoData,
}: {
  role: Role;
  onResetDemoData: () => void;
}) {
  const [selected, setSelected] = useState<SettingsCategoryId>("profil");
  const category = SETTINGS_CATEGORIES.find(item => item.id === selected)!;

  const renderSection = () => {
    switch (selected) {
      case "profil":
        return <SettingsProfileSection role={role} />;
      case "kurum":
        return <SettingsInstitutionSection />;
      case "bildirimler":
        return <SettingsNotificationsSection />;
      case "roller":
        return <SettingsAccessMatrix />;
      case "sistem":
        return <SettingsSystemSection />;
      case "guvenlik":
        return <SettingsSecuritySection />;
      case "veri-yonetimi":
        return (
          <SettingsDataManagementSection onResetDemoData={onResetDemoData} />
        );
      case "veri-ice-aktarma":
        return <SettingsDataImportSection />;
    }
  };

  return (
    <>
      <PageHeader
        eyebrow="Kurum ayarları"
        title="Ayarlar"
        description="Sistem ve hesap ayarlarınızı kategori bazlı yönetin."
      />
      <div className="mt-6 grid gap-5 lg:grid-cols-[280px_1fr]">
        <SettingsCategoryList
          categories={SETTINGS_CATEGORIES}
          selectedId={selected}
          onSelect={setSelected}
        />
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          <p className="text-[10px] font-extrabold uppercase tracking-[.15em] text-blue-600">
            {category.eyebrow}
          </p>
          <div className="mt-3">{renderSection()}</div>
        </section>
      </div>
    </>
  );
}
