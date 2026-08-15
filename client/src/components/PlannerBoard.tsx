/* MoneyFlow style reminder: this planning board keeps the product's quiet white surfaces, cool-grey borders, Manrope hierarchy and #2563EB as the single primary accent. */
import { FormEvent, useMemo, useState } from "react";
import { CalendarCheck2, Check, CheckCircle2, Circle, Clock3, Flag, ListFilter, Pencil, Plus, Search, Sparkles, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export type PlannerTaskStatus = "Planla" | "Bugün" | "Odaklan" | "Tamamlandı";
export type PlannerPriority = "Düşük" | "Normal" | "Yüksek";
export type PlannerTask = {
  id: string;
  title: string;
  status: PlannerTaskStatus;
  priority: PlannerPriority;
  dueDate: string;
  time: string;
  estimate: number;
  tag: string;
  note: string;
};

const todayKey = "2026-08-15";
const statusOptions: PlannerTaskStatus[] = ["Planla", "Bugün", "Odaklan", "Tamamlandı"];
const priorityOptions: PlannerPriority[] = ["Düşük", "Normal", "Yüksek"];
const statusMeta: Record<PlannerTaskStatus, { description: string; dot: string; card: string }> = {
  Planla: { description: "İleri tarihe alınacak işler", dot: "bg-slate-400", card: "border-slate-200" },
  Bugün: { description: "Günün planına alınanlar", dot: "bg-blue-500", card: "border-blue-100" },
  Odaklan: { description: "Şu an üzerinde çalışılanlar", dot: "bg-amber-400", card: "border-amber-100" },
  Tamamlandı: { description: "Bugün sonuçlanan işler", dot: "bg-emerald-500", card: "border-emerald-100" },
};
const priorityTone: Record<PlannerPriority, string> = {
  Düşük: "bg-slate-100 text-slate-600 ring-slate-200",
  Normal: "bg-blue-50 text-blue-700 ring-blue-100",
  Yüksek: "bg-rose-50 text-rose-700 ring-rose-100",
};

const dateText = (value: string) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", weekday: "long" }).format(new Date(`${value}T12:00:00`));
const blankTask = (status: PlannerTaskStatus = "Bugün"): PlannerTask => ({ id: "", title: "", status, priority: "Normal", dueDate: todayKey, time: "", estimate: 30, tag: "Operasyon", note: "" });

function Field({ label, required, children, className = "" }: { label: string; required?: boolean; children: React.ReactNode; className?: string }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-[11px] font-bold text-slate-600">{label}{required && <span className="ml-0.5 text-rose-500">*</span>}</span>{children}</label>;
}

function PlannerTaskCard({ task, onEdit, onUpdate }: { task: PlannerTask; onEdit: (task: PlannerTask) => void; onUpdate: (task: PlannerTask) => void }) {
  const completed = task.status === "Tamamlandı";
  const toggleCompletion = () => {
    const next = { ...task, status: completed ? "Bugün" as const : "Tamamlandı" as const };
    onUpdate(next);
    toast.success(completed ? "Görev gün planına geri alındı" : "Görev tamamlandı", { description: task.title });
  };
  return <article className={`group rounded-xl border bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.035)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_8px_18px_rgba(15,23,42,0.06)] ${statusMeta[task.status].card}`}>
    <div className="flex items-start gap-2.5">
      <button onClick={toggleCompletion} aria-label={completed ? "Görevi tekrar aç" : "Görevi tamamla"} className={`mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full border transition ${completed ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300 text-transparent hover:border-blue-500 hover:bg-blue-50"}`}><Check className="h-3 w-3 stroke-[3]" /></button>
      <button onClick={() => onEdit(task)} className="min-w-0 flex-1 text-left"><p className={`text-[12px] font-extrabold leading-5 ${completed ? "text-slate-400 line-through" : "text-slate-800"}`}>{task.title}</p>{task.note && <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-slate-400">{task.note}</p>}</button>
      <button onClick={() => onEdit(task)} aria-label={`${task.title} görevini düzenle`} className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-slate-300 opacity-0 transition hover:bg-slate-100 hover:text-blue-600 group-hover:opacity-100"><Pencil className="h-3 w-3" /></button>
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5">
      <span className={`inline-flex rounded-full px-2 py-1 text-[9px] font-extrabold ring-1 ring-inset ${priorityTone[task.priority]}`}>{task.priority}</span>
      {task.tag && <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-[9px] font-bold text-slate-500"><span className="h-1 w-1 rounded-full bg-slate-400" />{task.tag}</span>}
      <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-semibold text-slate-400"><Clock3 className="h-3 w-3" />{task.time || `${task.estimate} dk`}</span>
    </div>
    <div className="mt-2.5 flex items-center justify-between gap-2">
      <span className="text-[9px] font-semibold text-slate-400">{task.dueDate === todayKey ? "Bugün" : dateText(task.dueDate)}</span>
      <select aria-label={`${task.title} durumunu değiştir`} value={task.status} onChange={(event) => onUpdate({ ...task, status: event.target.value as PlannerTaskStatus })} className="h-6 max-w-[104px] rounded-md border border-slate-200 bg-slate-50 px-1.5 text-[9px] font-bold text-slate-600 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"><option>Planla</option><option>Bugün</option><option>Odaklan</option><option>Tamamlandı</option></select>
    </div>
  </article>;
}

export function PlannerBoard({ tasks, onTasksChange }: { tasks: PlannerTask[]; onTasksChange: (tasks: PlannerTask[]) => void }) {
  const [query, setQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<"Tümü" | PlannerPriority>("Tümü");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState<PlannerTask>(() => blankTask());
  const [isNew, setIsNew] = useState(true);

  const todayTasks = useMemo(() => tasks.filter((task) => task.dueDate === todayKey), [tasks]);
  const completeCount = todayTasks.filter((task) => task.status === "Tamamlandı").length;
  const focusCount = tasks.filter((task) => task.status === "Odaklan").length;
  const progress = todayTasks.length ? Math.round((completeCount / todayTasks.length) * 100) : 0;
  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const queryMatch = `${task.title} ${task.tag} ${task.note}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"));
    return queryMatch && (priorityFilter === "Tümü" || task.priority === priorityFilter);
  }), [priorityFilter, query, tasks]);

  const openNew = (status: PlannerTaskStatus = "Bugün") => { setDraft(blankTask(status)); setIsNew(true); setDialogOpen(true); };
  const openEdit = (task: PlannerTask) => { setDraft(task); setIsNew(false); setDialogOpen(true); };
  const updateTask = (updated: PlannerTask) => onTasksChange(tasks.map((task) => task.id === updated.id ? updated : task));
  const saveTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.title.trim()) { toast.error("Görev başlığı zorunludur."); return; }
    const saved = { ...draft, id: draft.id || `task-${Date.now()}`, title: draft.title.trim(), tag: draft.tag.trim() || "Operasyon" };
    onTasksChange(isNew ? [saved, ...tasks] : tasks.map((task) => task.id === saved.id ? saved : task));
    setDialogOpen(false);
    toast.success(isNew ? "Gün planına eklendi" : "Görev güncellendi", { description: saved.title });
  };
  const deleteTask = () => { onTasksChange(tasks.filter((task) => task.id !== draft.id)); setDialogOpen(false); toast.success("Görev gün planından kaldırıldı"); };

  return <div className="dashboard-canvas min-h-full px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
    <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div><p className="text-[12px] font-bold text-blue-600">Kişisel çalışma alanı</p><h2 className="mt-1 font-display text-[27px] font-extrabold tracking-[-0.05em] text-slate-950">Gün Planı</h2><p className="mt-1 text-[12px] font-medium text-slate-500">{dateText(todayKey)} için önceliklerinizi görün, zaman kutularınızı ayarlayın ve ilerlemenizi takip edin.</p></div>
      <button onClick={() => openNew()} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-[12px] font-extrabold text-white shadow-[0_4px_12px_rgba(37,99,235,0.20)] transition hover:bg-blue-700 active:scale-[0.98]"><Plus className="h-4 w-4" />Yeni görev</button>
    </section>

    <section className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_260px]">
      <div className="relative overflow-hidden rounded-xl border border-blue-100 bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-white shadow-[0_12px_28px_rgba(37,99,235,0.14)] sm:p-6"><div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" /><div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="inline-flex items-center gap-1.5 rounded-full bg-white/14 px-2.5 py-1 text-[10px] font-extrabold text-blue-50"><Sparkles className="h-3.5 w-3.5" />Günün odağı</div><h3 className="mt-3 font-display text-[19px] font-extrabold tracking-[-0.035em]">Önemli olanı ilerletin.</h3><p className="mt-1 max-w-[520px] text-[11px] leading-5 text-blue-100">Şu an {focusCount ? `${focusCount} odak görevi` : "odak görevi"} var. Önce yüksek öncelikli işleri netleştirin, sonra sıradaki zaman kutusuna geçin.</p></div><div className="flex items-center gap-3 rounded-xl border border-white/15 bg-white/10 px-3.5 py-3"><Target className="h-5 w-5 text-blue-100" /><div><p className="text-[10px] font-bold text-blue-100">Bugünkü plan</p><p className="mt-0.5 text-[18px] font-extrabold tabular-nums">{todayTasks.length} görev</p></div></div></div></div>
      <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.035)]"><div className="grid h-16 w-16 place-items-center rounded-full" style={{ background: `conic-gradient(#2563eb ${progress}%, #e2e8f0 0)` }}><div className="grid h-[52px] w-[52px] place-items-center rounded-full bg-white"><span className="text-[14px] font-extrabold tracking-[-0.04em] text-slate-900">%{progress}</span></div></div><div><p className="text-[11px] font-bold text-slate-500">Günlük ilerleme</p><p className="mt-1 text-[15px] font-extrabold text-slate-900">{completeCount}/{todayTasks.length || 0} tamamlandı</p><p className="mt-1 text-[10px] text-slate-400">Küçük adımlar görünür sonuç yaratır.</p></div></div>
    </section>

    <section className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.035)] sm:flex-row sm:items-center"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Görev, etiket veya not ara..." className="h-10 border-slate-200 pl-9 text-[12px] shadow-none" /></div><div className="flex items-center gap-2"><span className="grid h-10 w-10 place-items-center rounded-lg bg-slate-50 text-slate-400"><ListFilter className="h-4 w-4" /></span><select aria-label="Öncelik filtresi" value={priorityFilter} onChange={(event) => setPriorityFilter(event.target.value as typeof priorityFilter)} className="h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-[11px] font-bold text-slate-600 outline-none sm:w-[170px]"><option>Tümü</option><option>Yüksek</option><option>Normal</option><option>Düşük</option></select></div></section>

    <section className="mt-5 overflow-x-auto pb-3"><div className="grid min-w-[1080px] grid-cols-4 gap-4">{statusOptions.map((status) => { const columnTasks = visibleTasks.filter((task) => task.status === status); const meta = statusMeta[status]; return <div key={status} className="rounded-xl border border-slate-200 bg-slate-100/70 p-3"><header className="flex items-center justify-between gap-2 px-1 pb-3"><div><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${meta.dot}`} /><h3 className="text-[12px] font-extrabold text-slate-800">{status}</h3><span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-extrabold text-slate-500 ring-1 ring-inset ring-slate-200">{columnTasks.length}</span></div><p className="mt-1 text-[9px] font-medium text-slate-400">{meta.description}</p></div><button onClick={() => openNew(status)} aria-label={`${status} kolonuna görev ekle`} className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-white hover:text-blue-600"><Plus className="h-4 w-4" /></button></header><div className="space-y-2.5">{columnTasks.map((task) => <PlannerTaskCard key={task.id} task={task} onEdit={openEdit} onUpdate={updateTask} />)}{columnTasks.length === 0 && <button onClick={() => openNew(status)} className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-slate-300 bg-white/50 px-3 py-5 text-[10px] font-bold text-slate-400 transition hover:border-blue-200 hover:bg-white hover:text-blue-600"><Plus className="h-3.5 w-3.5" />Görev ekle</button>}</div></div>; })}</div></section>

    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-h-[90vh] overflow-y-auto border-slate-200 bg-white p-0 sm:max-w-xl"><form onSubmit={saveTask}><DialogHeader className="border-b border-slate-100 px-6 py-5"><div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-blue-50 text-blue-600"><CalendarCheck2 className="h-4.5 w-4.5" /></span><div><DialogTitle className="font-display text-[18px] font-extrabold text-slate-900">{isNew ? "Gün planına görev ekle" : "Görevi düzenle"}</DialogTitle><DialogDescription className="mt-1 text-[12px]">Görev durumunu ve zaman kutusunu düzenleyerek günün akışını görünür tutun.</DialogDescription></div></div></DialogHeader><div className="grid gap-4 px-6 py-5 sm:grid-cols-2"><Field label="Görev başlığı" required className="sm:col-span-2"><Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Örn. Vadesi yaklaşan faturaları gözden geçir" className="h-10" autoFocus /></Field><Field label="Planlanan tarih"><Input value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} type="date" className="h-10" /></Field><Field label="Saat"><Input value={draft.time} onChange={(event) => setDraft({ ...draft, time: event.target.value })} type="time" className="h-10" /></Field><Field label="Durum"><select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as PlannerTaskStatus })} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 outline-none"><option>Planla</option><option>Bugün</option><option>Odaklan</option><option>Tamamlandı</option></select></Field><Field label="Öncelik"><select value={draft.priority} onChange={(event) => setDraft({ ...draft, priority: event.target.value as PlannerPriority })} className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 outline-none"><option>Yüksek</option><option>Normal</option><option>Düşük</option></select></Field><Field label="Etiket"><Input value={draft.tag} onChange={(event) => setDraft({ ...draft, tag: event.target.value })} placeholder="Örn. Tahsilat" className="h-10" /></Field><Field label="Tahmini süre (dk)"><Input value={draft.estimate || ""} onChange={(event) => setDraft({ ...draft, estimate: Number(event.target.value) })} type="number" min="0" step="15" className="h-10" /></Field><Field label="Kısa not" className="sm:col-span-2"><textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Bir sonraki adımı veya hatırlatıcıyı ekleyin..." rows={3} className="w-full resize-none rounded-md border border-slate-200 bg-white px-3 py-2.5 text-[12px] leading-5 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-3 focus:ring-blue-100" /></Field></div><DialogFooter className="border-t border-slate-100 px-6 py-4"><div className="flex w-full items-center justify-between gap-3"><div>{!isNew && <button type="button" onClick={deleteTask} className="flex h-9 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-bold text-rose-600 transition hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" />Görevi sil</button>}</div><div className="flex gap-2"><button type="button" onClick={() => setDialogOpen(false)} className="h-9 rounded-md border border-slate-200 px-3 text-[12px] font-bold text-slate-600 hover:bg-slate-50">Vazgeç</button><button type="submit" className="flex h-9 items-center gap-1.5 rounded-md bg-blue-600 px-4 text-[12px] font-extrabold text-white hover:bg-blue-700"><Flag className="h-3.5 w-3.5" />{isNew ? "Görevi ekle" : "Değişiklikleri kaydet"}</button></div></div></DialogFooter></form></DialogContent></Dialog>
  </div>;
}
