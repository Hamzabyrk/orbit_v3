/* MoneyFlow style reminder: this shared navigation preserves one calm, grouped finance workspace across all modules; #2563EB is reserved for the active route and primary brand mark. */
import type { LucideIcon } from "lucide-react";
import { Archive, BarChart3, Bell, Building2, Calculator, CalendarDays, FileChartColumn, FileText, FolderOpen, Landmark, LayoutDashboard, LogOut, ReceiptText, Settings, ShoppingCart, Users, X } from "lucide-react";

type NavItem = { label: string; icon: LucideIcon };

const primaryNavigation: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Gün Planı", icon: CalendarDays },
  { label: "Raporlar", icon: BarChart3 },
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
    return <button key={item.label} onClick={() => { onNavigate(item.label); setMobileOpen(false); }} className={`relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] font-semibold transition ${selected ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>{selected && <span className="absolute -left-[17px] h-6 w-1 rounded-r bg-blue-600" />}<Icon className={`h-[17px] w-[17px] ${selected ? "text-blue-600" : "text-slate-400"}`} /><span className="flex-1">{item.label}</span>{count && <span className={`grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${selected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{count}</span>}</button>;
  };
  const groupHeading = (label: string) => <div className="mb-2 flex items-center gap-2 px-3 text-[10px] font-extrabold uppercase tracking-[0.12em] text-slate-400"><FolderOpen className="h-3.5 w-3.5" />{label}</div>;
  return <><button aria-label="Menüyü kapat" onClick={() => setMobileOpen(false)} className={`fixed inset-0 z-30 bg-slate-900/25 lg:hidden ${mobileOpen ? "block" : "hidden"}`} /><aside className={`dashboard-sidebar fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col overflow-y-auto border-r border-slate-200 bg-white px-4 py-5 shadow-xl transition-transform lg:static lg:shrink-0 lg:translate-x-0 lg:shadow-none ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}><div className="mb-8 flex items-center justify-between px-1"><div className="flex items-center gap-2.5"><img className="h-8 w-8 rounded-lg shadow-sm" src="/manus-storage/moneyflow-calculator-mark_fbcd5c5c.png" alt="MoneyFlow hesap makinesi simgesi" /><span className="font-display text-[18px] font-extrabold tracking-[-0.05em] text-slate-900">MoneyFlow</span></div><button onClick={() => setMobileOpen(false)} className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100 lg:hidden"><X className="h-4 w-4" /></button></div><nav className="space-y-1">{primaryNavigation.map(navLink)}</nav><section className="mt-6">{groupHeading("Finans")}<nav className="space-y-1">{financeNavigation.map(navLink)}</nav></section><section className="mt-6">{groupHeading("CRM")}<nav className="space-y-1">{crmNavigation.map(navLink)}</nav></section><div className="my-5 border-t border-slate-100" /><nav className="space-y-1">{managementNavigation.map(navLink)}<button onClick={() => { onNavigate("Bildirimler"); setMobileOpen(false); }} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"><Bell className="h-[17px] w-[17px] text-slate-400" />Bildirimler</button></nav><div className="mt-auto border-t border-slate-100 pt-4"><button onClick={onLogout} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"><LogOut className="h-[17px] w-[17px] text-slate-400" />Çıkış Yap</button></div></aside></>;
}
