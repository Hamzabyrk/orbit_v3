/* MoneyFlow style reminder: this shared navigation preserves one calm, grouped finance workspace across all modules; #2563EB is reserved for the active route and primary brand mark. */
import type { LucideIcon } from "lucide-react";
import { Archive, BarChart3, Bell, Boxes, Building2, Calculator, CalendarDays, FileChartColumn, FileText, FolderOpen, Landmark, LayoutDashboard, LogOut, ReceiptText, Settings, ShoppingCart, Users, Workflow, X } from "lucide-react";

type NavItem = { label: string; icon: LucideIcon };

const primaryNavigation: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Gün Planı", icon: CalendarDays },
  { label: "Raporlar", icon: BarChart3 },
  { label: "Otomasyonlar", icon: Workflow },
  { label: "ERP", icon: Boxes },
  { label: "Belgeler", icon: FileText },
];
const financeNavigation: NavItem[] = [
  { label: "Giderler", icon: ReceiptText },
  { label: "Satışlar", icon: ShoppingCart },
  { label: "Faturalar", icon: FileText },
  { label: "Bankalar", icon: Landmark },
  { label: "Muhasebe", icon: Calculator },
  { label: "Hesap Planı", icon: FileChartColumn },
];
const crmNavigation: NavItem[] = [
  { label: "Müşteriler", icon: Users },
  { label: "Tedarikçiler", icon: Building2 },
  { label: "Randevular", icon: CalendarDays },
];
const managementNavigation: NavItem[] = [
  { label: "Arşiv", icon: Archive },
  { label: "Ayarlar", icon: Settings },
];

export function WorkspaceSidebar({ active, invoiceCount, expenseCount, plannerCount = 0, onNavigate, onLogout, mobileOpen, setMobileOpen }: { active: string; invoiceCount: number; expenseCount: number; plannerCount?: number; onNavigate: (label: string) => void; onLogout: () => void; mobileOpen: boolean; setMobileOpen: (open: boolean) => void }) {
  const navLink = (item: NavItem) => {
    const selected = active === item.label || (active === "Fatura Önizleme" && item.label === "Faturalar");
    const Icon = item.icon;
    const count = item.label === "Faturalar" ? String(invoiceCount) : item.label === "Giderler" ? String(expenseCount) : item.label === "Gün Planı" ? String(plannerCount) : undefined;
    return <button key={item.label} onClick={() => { onNavigate(item.label); setMobileOpen(false); }} className={`relative flex h-9 w-full items-center gap-3 rounded-lg px-3 text-left text-[12px] font-semibold transition ${selected ? "bg-slate-900 text-white shadow-[0_6px_14px_rgba(15,23,42,0.10)]" : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"}`}><Icon className={`h-4 w-4 ${selected ? "text-white" : "text-slate-400"}`} /><span className="flex-1">{item.label}</span>{count && <span className={`grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${selected ? "bg-white/15 text-white" : "bg-slate-100 text-slate-500"}`}>{count}</span>}</button>;
  };
  const groupHeading = (label: string) => <div className="mb-2 px-3 text-[9px] font-extrabold uppercase tracking-[0.14em] text-slate-400">{label}</div>;
  return <><button aria-label="Menüyü kapat" onClick={() => setMobileOpen(false)} className={`fixed inset-0 z-30 bg-slate-900/25 lg:hidden ${mobileOpen ? "block" : "hidden"}`} /><aside className={`dashboard-sidebar fixed inset-y-0 left-0 z-40 flex w-[248px] flex-col overscroll-contain overflow-y-auto border-r px-3 py-4 transition-transform lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}><div className="mb-7 flex items-center justify-between px-2"><div className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900 p-1.5 shadow-sm"><img className="orbit-nav-mark h-full w-full object-contain" src="/manus-storage/orbit-mark_137dbd86.png" alt="" /></span><span className="font-orbit text-[17px] font-extrabold tracking-[-0.06em] text-slate-900">ORBIT</span></div><button onClick={() => setMobileOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 hover:bg-slate-100 lg:hidden"><X className="h-4 w-4" /></button></div><nav className="space-y-1">{primaryNavigation.map(navLink)}</nav><section className="mt-6">{groupHeading("Finans")}<nav className="space-y-1">{financeNavigation.map(navLink)}</nav></section><section className="mt-6">{groupHeading("CRM")}<nav className="space-y-1">{crmNavigation.map(navLink)}</nav></section><div className="my-5 border-t border-slate-200/70" /><nav className="space-y-1">{managementNavigation.map(navLink)}<button onClick={() => { onNavigate("Bildirimler"); setMobileOpen(false); }} className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-100/80 hover:text-slate-900"><Bell className="h-4 w-4 text-slate-400" />Bildirimler</button></nav><div className="mt-auto border-t border-slate-200/70 pt-4"><button onClick={onLogout} className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-[12px] font-semibold text-slate-600 transition hover:bg-slate-100/80 hover:text-slate-900"><LogOut className="h-4 w-4 text-slate-400" />Çıkış Yap</button></div></aside></>;
}
