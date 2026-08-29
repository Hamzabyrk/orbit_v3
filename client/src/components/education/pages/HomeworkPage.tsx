import { useState } from "react";
import { isDemoMode } from "@/auth/runtime";
import { filterHomeworkForRole } from "../scopeFilters";
import { PageHeader } from "../shared";
import type { Homework, Role } from "../types";
import { HomeworkCard } from "./HomeworkCard";
import { HomeworkCreateDialog } from "./HomeworkCreateDialog";

export function HomeworkPage({
  role,
  homework,
  setHomework,
}: {
  role: Role;
  homework: Homework[];
  setHomework: React.Dispatch<React.SetStateAction<Homework[]>>;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const visible = filterHomeworkForRole(homework, role, isDemoMode);

  const pageDescription =
    role === "teacher"
      ? "Sınıflarınıza atanan ödevleri ve teslim tarihlerini takip edin."
      : role === "student"
        ? "Dersleriniz için verilen ödevleri ve teslim tarihlerini takip edin."
        : role === "parent"
          ? "Öğrencinizin ödevlerini ve teslim tarihlerini takip edin."
          : "Kurum genelinde atanan ödevleri ve teslim tarihlerini takip edin.";

  return (
    <>
      <PageHeader
        eyebrow="Akademik takip"
        title={role === "teacher" ? "Sınıflarınızın ödevleri" : "Ödevler"}
        description={pageDescription}
        action={role === "teacher" ? "Yeni ödev" : undefined}
        onAction={role === "teacher" ? () => setDialogOpen(true) : undefined}
      />
      {visible.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-dashed border-slate-200 p-8 text-center text-[12px] text-slate-400">
          Görüntülenecek ödev bulunmuyor.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visible.map(item => (
            <HomeworkCard key={item.id} homework={item} />
          ))}
        </div>
      )}
      {role === "teacher" ? (
        <HomeworkCreateDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onCreate={item => setHomework(current => [item, ...current])}
        />
      ) : null}
    </>
  );
}
