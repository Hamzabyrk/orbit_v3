// MoneyFlow reference style: bright financial workspace with #2563EB actions; CRM-inspired CRUD screens stay compact and calm.
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Archive,
  ArrowRight,
  BarChart3,
  Banknote,
  Bell,
  Building2,
  Calculator,
  CalendarDays,
  Check,
  ChevronDown,
  CircleAlert,
  CircleCheck,
  CircleDollarSign,
  Clock,
  Eye,
  EyeOff,
  FileChartColumn,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  Mail,
  Menu,
  MoreHorizontal,
  Pencil,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  Settings,
  ShoppingCart,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const logoUrl = "/manus-storage/moneyflow-calculator-mark_fbcd5c5c.png";
const storageKey = "moneyflow-working-demo-v2";

type CustomerStatus = "Aktif" | "Potansiyel" | "Pasif";
type InvoiceStatus = "Taslak" | "Gönderildi" | "Ödendi" | "Vadesi Geçti";
type ActivityKind = "customer" | "invoice" | "payment" | "system";
type AppSection = "Dashboard" | "Müşteriler" | "Faturalar";

type Customer = {
  id: string;
  name: string;
  role: string;
  email: string;
  phone: string;
  status: CustomerStatus;
  note: string;
};

type Invoice = {
  id: string;
  number: string;
  customerId: string;
  title: string;
  amount: number;
  issueDate: string;
  dueDate: string;
  status: InvoiceStatus;
};

type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  timestamp: string;
};

type DemoData = {
  customers: Customer[];
  invoices: Invoice[];
  activities: ActivityItem[];
};

type NavItem = { label: string; icon: typeof LayoutDashboard; count?: string };
type DeleteTarget = { kind: "customer" | "invoice"; id: string; label: string } | null;

const navigation: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Faturalar", icon: FileText },
  { label: "Giderler", icon: ReceiptText, count: "1" },
  { label: "Müşteriler", icon: Users },
  { label: "Tedarikçiler", icon: Building2 },
  { label: "Bankalar", icon: Banknote },
  { label: "Satışlar", icon: ShoppingCart },
  { label: "Raporlar", icon: BarChart3 },
];

const accountingNavigation: NavItem[] = [
  { label: "Muhasebe", icon: Calculator },
  { label: "Hesap Planı", icon: FileChartColumn },
  { label: "Arşiv", icon: Archive },
  { label: "Ayarlar", icon: Settings },
];

const statusClass: Record<CustomerStatus | InvoiceStatus, string> = {
  Aktif: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  Potansiyel: "bg-blue-50 text-blue-700 ring-blue-100",
  Pasif: "bg-slate-100 text-slate-600 ring-slate-200",
  Taslak: "bg-slate-100 text-slate-600 ring-slate-200",
  Gönderildi: "bg-blue-50 text-blue-700 ring-blue-100",
  Ödendi: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  "Vadesi Geçti": "bg-rose-50 text-rose-700 ring-rose-100",
};

function initialData(): DemoData {
  return {
    customers: [
      { id: "cus-001", name: "Nora Tasarım Stüdyosu", role: "Kurumsal müşteri", email: "muhasebe@nora.com", phone: "+90 212 555 11 22", status: "Aktif", note: "Aylık marka ve tasarım hizmetleri için düzenli faturalandırma yapılır." },
      { id: "cus-002", name: "Atlas Lojistik A.Ş.", role: "Kurumsal müşteri", email: "finans@atlaslojistik.com", phone: "+90 216 411 98 12", status: "Aktif", note: "Ödemeler ayın son haftasında banka transferiyle alınır." },
      { id: "cus-003", name: "Mavi Kutu Yazılım", role: "Potansiyel müşteri", email: "hello@mavikutu.io", phone: "+90 850 334 42 10", status: "Potansiyel", note: "Yıllık lisans paketi için teklif gönderildi; geri dönüş bekleniyor." },
      { id: "cus-004", name: "Ege Yapı Proje", role: "Kurumsal müşteri", email: "odeme@egeyapi.com", phone: "+90 232 234 56 78", status: "Aktif", note: "Proje bazlı faturalar, onay sonrası iki taksitte tahsil edilir." },
      { id: "cus-005", name: "Kaktüs Medya", role: "Küçük işletme", email: "merhaba@kaktusmedya.com", phone: "+90 532 708 18 42", status: "Potansiyel", note: "İlk kampanya döneminin bütçesi ve sözleşme taslağı konuşuluyor." },
      { id: "cus-006", name: "Bora Danışmanlık", role: "Eski müşteri", email: "info@boradanismanlik.com", phone: "+90 312 241 77 91", status: "Pasif", note: "Mevcut sözleşme tamamlandı; yeni çalışma için takip edilmesi gerekiyor." },
    ],
    invoices: [
      { id: "inv-001", number: "MF-2026-018", customerId: "cus-001", title: "Ağustos tasarım hizmetleri", amount: 24500, issueDate: "2026-08-03", dueDate: "2026-08-18", status: "Gönderildi" },
      { id: "inv-002", number: "MF-2026-017", customerId: "cus-002", title: "Taşımacılık operasyon danışmanlığı", amount: 38600, issueDate: "2026-07-28", dueDate: "2026-08-12", status: "Vadesi Geçti" },
      { id: "inv-003", number: "MF-2026-016", customerId: "cus-004", title: "Proje yönetimi - 1. etap", amount: 64200, issueDate: "2026-07-18", dueDate: "2026-08-02", status: "Ödendi" },
      { id: "inv-004", number: "MF-2026-015", customerId: "cus-003", title: "Yıllık lisans paketi", amount: 18900, issueDate: "2026-08-08", dueDate: "2026-08-23", status: "Taslak" },
      { id: "inv-005", number: "MF-2026-014", customerId: "cus-001", title: "Web arayüz denetimi", amount: 12750, issueDate: "2026-07-10", dueDate: "2026-07-24", status: "Ödendi" },
    ],
    activities: [
      { id: "act-001", kind: "payment", title: "MF-2026-016 ödemesi kaydedildi", description: "Ege Yapı Proje için ₺64.200,00 tahsilat işlendi.", timestamp: "14 Ağu 2026, 15:42" },
      { id: "act-002", kind: "invoice", title: "Yeni fatura gönderildi", description: "Nora Tasarım Stüdyosu için MF-2026-018 oluşturuldu.", timestamp: "12 Ağu 2026, 10:18" },
      { id: "act-003", kind: "customer", title: "Mavi Kutu Yazılım eklendi", description: "Potansiyel müşteri kaydı ve iletişim bilgileri oluşturuldu.", timestamp: "08 Ağu 2026, 16:05" },
      { id: "act-004", kind: "invoice", title: "Atlas Lojistik faturası vadesini geçti", description: "MF-2026-017 için ödeme durumu gözden geçirilmeli.", timestamp: "13 Ağu 2026, 09:10" },
    ],
  };
}

function loadData(): DemoData {
  if (typeof window === "undefined") return initialData();
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return initialData();
    const parsed = JSON.parse(stored) as DemoData;
    if (Array.isArray(parsed.customers) && Array.isArray(parsed.invoices) && Array.isArray(parsed.activities)) return parsed;
  } catch {
    // Invalid browser storage must never block the demo from opening.
  }
  return initialData();
}

function money(value: number) {
  return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 }).format(value);
}

function dateText(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`));
}

function nowText() {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date());
}

function makeActivity(kind: ActivityKind, title: string, description: string): ActivityItem {
  return { id: `act-${Date.now()}`, kind, title, description, timestamp: nowText() };
}

function blankCustomer(): Customer {
  return { id: "", name: "", role: "Kurumsal müşteri", email: "", phone: "", status: "Aktif", note: "" };
}

function blankInvoice(customerId: string): Invoice {
  return { id: "", number: "", customerId, title: "", amount: 0, issueDate: "2026-08-15", dueDate: "2026-08-30", status: "Taslak" };
}

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img className={compact ? "h-8 w-8 rounded-lg shadow-sm" : "h-12 w-12 rounded-xl shadow-[0_10px_20px_rgba(37,99,235,0.18)]"} src={logoUrl} alt="MoneyFlow hesap makinesi simgesi" />
      {!compact && <span className="font-display text-[22px] font-extrabold tracking-[-0.045em] text-slate-900">MoneyFlow</span>}
    </div>
  );
}

function StatusBadge({ status }: { status: CustomerStatus | InvoiceStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-extrabold ring-1 ring-inset ${statusClass[status]}`}>{status}</span>;
}

function ActivityIcon({ kind }: { kind: ActivityKind }) {
  const common = "h-4 w-4";
  if (kind === "payment") return <CircleDollarSign className={`${common} text-emerald-600`} />;
  if (kind === "customer") return <Users className={`${common} text-blue-600`} />;
  if (kind === "invoice") return <FileText className={`${common} text-violet-600`} />;
  return <Activity className={`${common} text-slate-500`} />;
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (email !== "demo@moneyflow.com" || password !== "demo123") {
      toast.error("Giriş bilgileri doğrulanamadı", { description: "Demo hesabı bilgilerini kullanın." });
      return;
    }
    setLoading(true);
    window.setTimeout(() => {
      setLoading(false);
      toast.success("Hoş geldiniz, Demo Kullanıcı");
      onLogin();
    }, 430);
  };

  return (
    <main className="login-scene min-h-screen px-4 py-10 sm:px-6">
      <section className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center justify-center">
        <div className="login-card w-full rounded-2xl border border-slate-200/90 bg-white px-6 py-7 shadow-[0_20px_50px_rgba(26,52,95,0.11)] sm:px-7 sm:py-8">
          <header className="mb-7 flex flex-col items-center text-center">
            <img className="mb-3 h-12 w-12 rounded-xl shadow-[0_10px_20px_rgba(37,99,235,0.18)]" src={logoUrl} alt="MoneyFlow" />
            <h1 className="font-display text-[24px] font-extrabold tracking-[-0.045em] text-slate-950">MoneyFlow</h1>
            <p className="mt-1 text-[13px] font-medium text-slate-500">Muhasebe sisteminize giriş yapın</p>
          </header>
          <form className="space-y-4" onSubmit={submit}>
            <label className="block"><span className="mb-1.5 block text-[12px] font-semibold text-slate-700">E-posta Adresi</span><span className="relative block"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="ornek@email.com" className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-[13px] font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /></span></label>
            <label className="block"><span className="mb-1.5 block text-[12px] font-semibold text-slate-700">Şifre</span><span className="relative block"><LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} placeholder="••••••••" className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-11 text-[13px] font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" /><button type="button" aria-label="Şifre görünürlüğünü değiştir" onClick={() => setShowPassword((current) => !current)} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-blue-600">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></span></label>
            <div className="flex items-center justify-between pt-0.5"><label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-slate-600"><input checked={remember} onChange={(event) => setRemember(event.target.checked)} type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 accent-blue-600" />Beni hatırla</label><button type="button" onClick={() => toast.info("Şifre sıfırlama bağlantısı demo ortamında gönderilmez.")} className="text-[12px] font-semibold text-blue-600 transition hover:text-blue-700">Şifremi unuttum</button></div>
            <button disabled={loading} className="group flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(37,99,235,0.23)] transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80">{loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> : <>Giriş Yap <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}</button>
          </form>
          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3"><p className="text-[12px] font-bold text-slate-700">Demo Hesap Bilgileri:</p><p className="mt-1.5 text-[11px] leading-5 text-slate-600"><strong className="font-semibold text-slate-700">E-posta:</strong> demo@moneyflow.com</p><p className="text-[11px] leading-5 text-slate-600"><strong className="font-semibold text-slate-700">Şifre:</strong> demo123</p></div>
          <p className="mt-5 text-center text-[12px] text-slate-500">Hesabınız yok mu? <button onClick={() => toast.info("Ücretsiz deneme kaydı demo sürümünde kapalıdır.")} className="font-semibold text-blue-600 hover:text-blue-700">Ücretsiz deneme başlatın</button></p>
        </div>
      </section>
    </main>
  );
}

function Sidebar({ active, invoiceCount, onNavigate, onLogout, mobileOpen, setMobileOpen }: { active: AppSection; invoiceCount: number; onNavigate: (name: string) => void; onLogout: () => void; mobileOpen: boolean; setMobileOpen: (open: boolean) => void }) {
  const navLink = (item: NavItem) => {
    const selected = active === item.label;
    const Icon = item.icon;
    const count = item.label === "Faturalar" ? String(invoiceCount) : item.count;
    return <button key={item.label} onClick={() => { onNavigate(item.label); setMobileOpen(false); }} className={`relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] font-semibold transition ${selected ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>{selected && <span className="absolute -left-[17px] h-6 w-1 rounded-r bg-blue-600" />}<Icon className={`h-[17px] w-[17px] ${selected ? "text-blue-600" : "text-slate-400"}`} strokeWidth={1.9} /><span className="flex-1">{item.label}</span>{count && <span className={`grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${selected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{count}</span>}</button>;
  };

  return <>{mobileOpen && <button aria-label="Menüyü kapat" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-slate-900/25 lg:hidden" />}<aside className={`dashboard-sidebar fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-slate-200 bg-white px-4 py-5 shadow-xl transition-transform lg:static lg:shrink-0 lg:translate-x-0 lg:shadow-none ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}><div className="mb-8 flex items-center justify-between px-1"><BrandMark compact /><button onClick={() => setMobileOpen(false)} className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100 lg:hidden"><X className="h-4 w-4" /></button></div><nav className="space-y-1">{navigation.map(navLink)}</nav><div className="my-5 border-t border-slate-100" /><nav className="space-y-1">{accountingNavigation.map(navLink)}</nav><div className="mt-auto border-t border-slate-100 pt-4"><button onClick={() => toast.info("Bildirim Merkezi", { description: "Bu demo için okunmamış bildirim bulunmuyor." })} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"><Bell className="h-[17px] w-[17px] text-slate-400" />Bildirimler</button><button onClick={onLogout} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"><LogOut className="h-[17px] w-[17px] text-slate-400" />Çıkış Yap</button></div></aside></>;
}

function MetricCard({ label, amount, detail, icon: Icon, tone }: { label: string; amount: string; detail: string; icon: typeof TrendingUp; tone: "green" | "rose" | "amber" | "blue" }) {
  const tones = { green: "bg-emerald-50 text-emerald-600", rose: "bg-rose-50 text-rose-600", amber: "bg-amber-50 text-amber-600", blue: "bg-blue-50 text-blue-600" };
  return <section className="metric-card rounded-xl border border-slate-200 bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.03)]"><div className="flex items-start justify-between"><p className="text-[12px] font-semibold text-slate-500">{label}</p><span className={`grid h-8 w-8 place-items-center rounded-lg ${tones[tone]}`}><Icon className="h-4 w-4" /></span></div><p className="mt-4 font-display text-[22px] font-extrabold tracking-[-0.04em] text-slate-900 tabular-nums">{amount}</p><p className="mt-1.5 text-[11px] font-medium text-slate-400">{detail}</p></section>;
}

function DashboardScreen({ data, onNavigate, onNewCustomer, onNewInvoice, onEditInvoice, onReset }: { data: DemoData; onNavigate: (section: AppSection) => void; onNewCustomer: () => void; onNewInvoice: (paid?: boolean) => void; onEditInvoice: (invoice: Invoice) => void; onReset: () => void }) {
  const customersById = useMemo(() => new Map(data.customers.map((customer) => [customer.id, customer])), [data.customers]);
  const paidTotal = data.invoices.filter((invoice) => invoice.status === "Ödendi").reduce((sum, invoice) => sum + invoice.amount, 0);
  const outstanding = data.invoices.filter((invoice) => invoice.status === "Gönderildi" || invoice.status === "Vadesi Geçti").reduce((sum, invoice) => sum + invoice.amount, 0);
  const overdue = data.invoices.filter((invoice) => invoice.status === "Vadesi Geçti");
  const activeCustomers = data.customers.filter((customer) => customer.status === "Aktif").length;
  const visualMonths = [
    { month: "Nis", income: 44, expense: 35 }, { month: "May", income: 52, expense: 42 }, { month: "Haz", income: 48, expense: 38 },
    { month: "Tem", income: 64, expense: 46 }, { month: "Ağu", income: 71, expense: 51 }, { month: "Eyl", income: 39, expense: 34 },
  ];
  const quickActions = [
    { title: "Yeni Fatura", detail: "Müşteri faturası oluştur", icon: FileText, iconClass: "bg-blue-50 text-blue-600", action: () => onNewInvoice() },
    { title: "Ödeme Kaydet", detail: "Ödenmiş faturayı işaretle", icon: CircleDollarSign, iconClass: "bg-emerald-50 text-emerald-600", action: () => onNavigate("Faturalar") },
    { title: "Müşteriler", detail: "Müşteri listesini aç", icon: Users, iconClass: "bg-violet-50 text-violet-600", action: () => onNavigate("Müşteriler") },
    { title: "Yeni Müşteri", detail: "Müşteri bilgisi ekle", icon: UserPlus, iconClass: "bg-amber-50 text-amber-600", action: onNewCustomer },
  ];
  const recentInvoices = [...data.invoices].sort((a, b) => b.issueDate.localeCompare(a.issueDate)).slice(0, 4);

  return <div className="dashboard-canvas px-4 py-6 sm:px-6 lg:px-8 lg:py-7"><div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-[13px] font-medium text-slate-500">Hoş geldiniz, Demo Kullanıcı</p><h2 className="mt-0.5 font-display text-[25px] font-extrabold tracking-[-0.045em] text-slate-950">Finansal durumunuza genel bakış</h2></div><button onClick={onReset} className="flex h-9 items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 sm:self-auto"><RotateCcw className="h-3.5 w-3.5 text-slate-400" />Demo verisini sıfırla</button></div>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard label="Toplam Tahsilat" amount={money(paidTotal)} detail={`${data.invoices.filter((invoice) => invoice.status === "Ödendi").length} ödenmiş fatura`} icon={TrendingUp} tone="green" /><MetricCard label="Bekleyen Tahsilat" amount={money(outstanding)} detail={`${data.invoices.filter((invoice) => invoice.status === "Gönderildi").length} gönderilmiş fatura`} icon={Clock} tone="amber" /><MetricCard label="Vadesi Geçen" amount={money(overdue.reduce((sum, invoice) => sum + invoice.amount, 0))} detail={`${overdue.length} fatura aksiyon bekliyor`} icon={CircleAlert} tone="rose" /><MetricCard label="Aktif Müşteriler" amount={String(activeCustomers)} detail={`${data.customers.length} toplam müşteri kaydı`} icon={Users} tone="blue" /></div>
    <section className="mt-6"><div className="mb-3"><h3 className="font-display text-[16px] font-extrabold tracking-[-0.025em] text-slate-900">Hızlı İşlemler</h3><p className="mt-0.5 text-[12px] text-slate-500">Kayıtlarınız üzerinde doğrudan çalışın</p></div><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{quickActions.map((action) => { const Icon = action.icon; return <button key={action.title} onClick={action.action} className="quick-action group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-[0_3px_12px_rgba(15,23,42,0.025)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_8px_20px_rgba(37,99,235,0.08)]"><span className={`grid h-9 w-9 place-items-center rounded-lg ${action.iconClass}`}><Icon className="h-[17px] w-[17px]" /></span><span className="min-w-0 flex-1"><span className="block text-[12px] font-bold text-slate-800">{action.title}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{action.detail}</span></span><ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" /></button>; })}</div></section>
    <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]"><section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_12px_rgba(15,23,42,0.025)] sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-display text-[16px] font-extrabold tracking-[-0.025em] text-slate-900">Aylık Gelir/Gider</h3><p className="mt-0.5 text-[12px] text-slate-500">Demo performans görünümü</p></div><div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-blue-600" />Gelir</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-slate-200" />Gider</span></div></div><div className="mt-6 grid h-[215px] grid-cols-6 items-end gap-3 sm:gap-5">{visualMonths.map((item) => <div key={item.month} className="group flex h-full min-w-0 flex-col justify-end"><div className="relative flex h-[158px] items-end justify-center gap-1.5 border-b border-slate-100"><span style={{ height: `${item.income}%` }} className="w-[40%] rounded-t-[3px] bg-blue-600 transition-all duration-300 group-hover:bg-blue-500" /><span style={{ height: `${item.expense}%` }} className="w-[40%] rounded-t-[3px] bg-slate-200 transition-all duration-300 group-hover:bg-slate-300" /></div><p className="mt-2 text-center text-[10px] font-bold text-slate-600">{item.month}</p></div>)}</div></section>
      <aside className="space-y-4"><section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_12px_rgba(15,23,42,0.025)]"><div className="flex items-center justify-between"><h3 className="font-display text-[16px] font-extrabold tracking-[-0.025em] text-slate-900">Son Aktiviteler</h3><button onClick={() => toast.info("Aktivite akışı", { description: "Yeni müşteri, fatura ve ödeme işlemleri otomatik olarak bu listeye eklenir." })} className="text-[11px] font-bold text-blue-600">Bilgi</button></div><div className="mt-3 divide-y divide-slate-100">{data.activities.slice(0, 4).map((item) => <div key={item.id} className="flex gap-3 py-3"><span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-slate-50"><ActivityIcon kind={item.kind} /></span><div className="min-w-0"><p className="text-[11px] font-bold leading-4 text-slate-700">{item.title}</p><p className="mt-0.5 text-[10px] leading-4 text-slate-500">{item.description}</p><p className="mt-1 text-[9px] font-medium text-slate-400">{item.timestamp}</p></div></div>)}</div></section><section className={`overflow-hidden rounded-xl border p-5 ${overdue.length ? "border-amber-100 bg-amber-50/70" : "border-emerald-100 bg-emerald-50/70"}`}><div className="flex gap-3"><span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${overdue.length ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>{overdue.length ? <CircleAlert className="h-[18px] w-[18px]" /> : <Check className="h-[18px] w-[18px]" />}</span><div><h3 className={`text-[13px] font-bold ${overdue.length ? "text-amber-900" : "text-emerald-900"}`}>{overdue.length ? "Tahsilat Takibi Gerekli" : "Her Şey Yolunda!"}</h3><p className={`mt-1 text-[11px] leading-5 ${overdue.length ? "text-amber-700" : "text-emerald-700"}`}>{overdue.length ? `${overdue.length} vadesi geçmiş faturayı gözden geçirin.` : "Bekleyen işlem veya uyarı bulunmuyor."}</p></div></div></section></aside></div>
    <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_12px_rgba(15,23,42,0.025)]"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><div><h3 className="font-display text-[16px] font-extrabold tracking-[-0.025em] text-slate-900">Son Faturalar</h3><p className="mt-0.5 text-[12px] text-slate-500">En yeni fatura kayıtları</p></div><button onClick={() => onNavigate("Faturalar")} className="text-[12px] font-bold text-blue-600 transition hover:text-blue-700">Tümünü görüntüle</button></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="bg-slate-50/80 text-[10px] uppercase tracking-[0.07em] text-slate-400"><th className="px-5 py-3 font-bold sm:px-6">Fatura</th><th className="px-5 py-3 font-bold">Müşteri</th><th className="px-5 py-3 font-bold">Tutar</th><th className="px-5 py-3 font-bold">Durum</th><th className="px-5 py-3 font-bold">Vade</th><th className="px-5 py-3" /></tr></thead><tbody>{recentInvoices.map((invoice) => <tr key={invoice.id} className="border-t border-slate-100 text-[12px] transition hover:bg-slate-50/80"><td className="px-5 py-4 sm:px-6"><p className="font-bold text-slate-700">{invoice.number}</p><p className="mt-0.5 text-[10px] text-slate-400">{invoice.title}</p></td><td className="px-5 py-4 font-medium text-slate-600">{customersById.get(invoice.customerId)?.name ?? "Silinmiş müşteri"}</td><td className="px-5 py-4 font-bold tabular-nums text-slate-800">{money(invoice.amount)}</td><td className="px-5 py-4"><StatusBadge status={invoice.status} /></td><td className="px-5 py-4 font-medium text-slate-500">{dateText(invoice.dueDate)}</td><td className="px-5 py-4"><button onClick={() => onEditInvoice(invoice)} className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-blue-600"><Pencil className="h-3.5 w-3.5" /></button></td></tr>)}</tbody></table></div></section>
  </div>;
}

function CustomersScreen({ customers, invoices, onNew, onEdit, onDelete }: { customers: Customer[]; invoices: Invoice[]; onNew: () => void; onEdit: (customer: Customer) => void; onDelete: (customer: Customer) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | CustomerStatus>("all");
  const filtered = customers.filter((customer) => (status === "all" || customer.status === status) && `${customer.name} ${customer.email} ${customer.role}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr")));
  const totalDue = (customerId: string) => invoices.filter((invoice) => invoice.customerId === customerId && (invoice.status === "Gönderildi" || invoice.status === "Vadesi Geçti")).reduce((sum, invoice) => sum + invoice.amount, 0);
  return <div className="dashboard-canvas min-h-full px-4 py-6 sm:px-6 lg:px-8 lg:py-7"><PageIntro eyebrow="Müşteri yönetimi" title="Müşteriler" description={`${filtered.length} müşteri listelendi`} actionLabel="Yeni Müşteri" onAction={onNew} /><section className="toolbar-panel mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_3px_12px_rgba(15,23,42,0.025)] sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Müşteri ara..." className="h-10 w-full border-slate-200 bg-white pl-9 text-[12px] shadow-none" /></div><Select value={status} onValueChange={(value) => setStatus(value as "all" | CustomerStatus)}><SelectTrigger className="h-10 w-full min-w-[160px] text-[12px] font-semibold sm:w-[170px]"><SelectValue placeholder="Durum seçin" /></SelectTrigger><SelectContent><SelectItem value="all">Tüm Durumlar</SelectItem><SelectItem value="Aktif">Aktif</SelectItem><SelectItem value="Potansiyel">Potansiyel</SelectItem><SelectItem value="Pasif">Pasif</SelectItem></SelectContent></Select></section><div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{filtered.map((customer) => <article key={customer.id} className="customer-card flex min-h-[300px] flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_12px_rgba(15,23,42,0.025)]"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600"><Users className="h-[18px] w-[18px]" /></span><div className="min-w-0"><h3 className="truncate text-[14px] font-extrabold text-slate-800">{customer.name}</h3><p className="mt-0.5 text-[11px] font-medium text-slate-500">{customer.role}</p></div></div><StatusBadge status={customer.status} /></div><div className="mt-4 space-y-1.5 text-[11px] font-medium text-slate-500"><p className="flex items-center gap-2 truncate"><Mail className="h-3.5 w-3.5 shrink-0 text-slate-400" />{customer.email}</p><p className="flex items-center gap-2"><Banknote className="h-3.5 w-3.5 shrink-0 text-slate-400" />{customer.phone}</p></div><div className="mt-4 rounded-lg bg-slate-50 px-3 py-2.5"><p className="text-[10px] font-semibold text-slate-400">Açık Bakiye</p><p className="mt-0.5 text-[13px] font-extrabold tabular-nums text-slate-700">{money(totalDue(customer.id))}</p></div><p className="mt-4 line-clamp-3 text-[11px] leading-5 text-slate-500">{customer.note || "Henüz müşteri notu eklenmedi."}</p><div className="mt-auto flex items-center justify-end gap-4 border-t border-slate-100 pt-4"><button onClick={() => onEdit(customer)} className="flex items-center gap-1.5 text-[11px] font-bold text-blue-600 hover:text-blue-700"><Pencil className="h-3.5 w-3.5" />Düzenle</button><button onClick={() => onDelete(customer)} className="flex items-center gap-1.5 text-[11px] font-bold text-rose-600 hover:text-rose-700"><Trash2 className="h-3.5 w-3.5" />Sil</button></div></article>)}</div>{filtered.length === 0 && <EmptyState title="Eşleşen müşteri bulunamadı" detail="Arama metnini veya durum filtresini değiştirerek tekrar deneyin." />}</div>;
}

function InvoicesScreen({ invoices, customers, onNew, onEdit, onDelete, onMarkPaid }: { invoices: Invoice[]; customers: Customer[]; onNew: () => void; onEdit: (invoice: Invoice) => void; onDelete: (invoice: Invoice) => void; onMarkPaid: (invoice: Invoice) => void }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | InvoiceStatus>("all");
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));
  const filtered = invoices.filter((invoice) => (status === "all" || invoice.status === status) && `${invoice.number} ${invoice.title} ${customerMap.get(invoice.customerId)?.name ?? ""}`.toLocaleLowerCase("tr").includes(query.toLocaleLowerCase("tr"))).sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  const filteredTotal = filtered.reduce((sum, invoice) => sum + invoice.amount, 0);
  return <div className="dashboard-canvas min-h-full px-4 py-6 sm:px-6 lg:px-8 lg:py-7"><PageIntro eyebrow="Tahsilat ve faturalandırma" title="Faturalar" description={`${filtered.length} fatura listelendi · ${money(filteredTotal)}`} actionLabel="Yeni Fatura" onAction={onNew} /><section className="toolbar-panel mt-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-[0_3px_12px_rgba(15,23,42,0.025)] sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Fatura veya müşteri ara..." className="h-10 w-full border-slate-200 bg-white pl-9 text-[12px] shadow-none" /></div><Select value={status} onValueChange={(value) => setStatus(value as "all" | InvoiceStatus)}><SelectTrigger className="h-10 w-full min-w-[160px] text-[12px] font-semibold sm:w-[185px]"><SelectValue placeholder="Durum seçin" /></SelectTrigger><SelectContent><SelectItem value="all">Tüm Faturalar</SelectItem><SelectItem value="Taslak">Taslak</SelectItem><SelectItem value="Gönderildi">Gönderildi</SelectItem><SelectItem value="Ödendi">Ödendi</SelectItem><SelectItem value="Vadesi Geçti">Vadesi Geçti</SelectItem></SelectContent></Select></section><section className="mt-5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_12px_rgba(15,23,42,0.025)]"><div className="overflow-x-auto"><table className="w-full min-w-[860px] text-left"><thead><tr className="border-b border-slate-100 bg-slate-50/80 text-[10px] uppercase tracking-[0.07em] text-slate-400"><th className="px-5 py-3.5 font-bold sm:px-6">Fatura</th><th className="px-5 py-3.5 font-bold">Müşteri</th><th className="px-5 py-3.5 font-bold">Tutar</th><th className="px-5 py-3.5 font-bold">Durum</th><th className="px-5 py-3.5 font-bold">Düzenleme / Vade</th><th className="px-5 py-3.5" /></tr></thead><tbody>{filtered.map((invoice) => <tr key={invoice.id} className="border-b border-slate-100 text-[12px] last:border-0 hover:bg-slate-50/80"><td className="px-5 py-4 sm:px-6"><p className="font-extrabold text-slate-700">{invoice.number}</p><p className="mt-0.5 text-[10px] text-slate-400">{invoice.title}</p></td><td className="px-5 py-4 font-semibold text-slate-600">{customerMap.get(invoice.customerId)?.name ?? "Silinmiş müşteri"}</td><td className="px-5 py-4 font-extrabold tabular-nums text-slate-800">{money(invoice.amount)}</td><td className="px-5 py-4"><StatusBadge status={invoice.status} /></td><td className="px-5 py-4"><p className="text-[11px] font-semibold text-slate-600">{dateText(invoice.issueDate)}</p><p className="mt-0.5 text-[10px] text-slate-400">Vade: {dateText(invoice.dueDate)}</p></td><td className="px-5 py-4"><div className="flex items-center justify-end gap-1.5">{(invoice.status === "Gönderildi" || invoice.status === "Vadesi Geçti") && <button onClick={() => onMarkPaid(invoice)} title="Ödeme kaydet" className="grid h-8 w-8 place-items-center rounded-md bg-emerald-50 text-emerald-600 transition hover:bg-emerald-100"><CircleCheck className="h-4 w-4" /></button>}<button onClick={() => onEdit(invoice)} title="Faturayı düzenle" className="grid h-8 w-8 place-items-center rounded-md text-blue-600 transition hover:bg-blue-50"><Pencil className="h-4 w-4" /></button><button onClick={() => onDelete(invoice)} title="Faturayı sil" className="grid h-8 w-8 place-items-center rounded-md text-rose-600 transition hover:bg-rose-50"><Trash2 className="h-4 w-4" /></button></div></td></tr>)}</tbody></table></div>{filtered.length === 0 && <div className="p-6"><EmptyState title="Eşleşen fatura bulunamadı" detail="Arama metnini veya durum filtresini değiştirerek tekrar deneyin." /></div>}</section></div>;
}

function PageIntro({ eyebrow, title, description, actionLabel, onAction }: { eyebrow: string; title: string; description: string; actionLabel: string; onAction: () => void }) {
  return <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[12px] font-bold text-blue-600">{eyebrow}</p><h2 className="mt-1 font-display text-[26px] font-extrabold tracking-[-0.045em] text-slate-950">{title}</h2><p className="mt-1 text-[12px] font-medium text-slate-500">{description}</p></div><button onClick={onAction} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-[12px] font-extrabold text-white shadow-[0_7px_16px_rgba(37,99,235,0.22)] transition hover:bg-blue-700 active:scale-[0.98]"><Plus className="h-4 w-4" />{actionLabel}</button></div>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center"><Search className="mx-auto h-5 w-5 text-slate-300" /><p className="mt-3 text-[13px] font-extrabold text-slate-700">{title}</p><p className="mx-auto mt-1 max-w-sm text-[11px] leading-5 text-slate-500">{detail}</p></div>;
}

function CustomerDialog({ open, customer, onOpenChange, onSave }: { open: boolean; customer: Customer; onOpenChange: (open: boolean) => void; onSave: (customer: Customer) => void }) {
  const [draft, setDraft] = useState(customer);
  useEffect(() => { if (open) setDraft(customer); }, [customer, open]);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!draft.name.trim() || !draft.email.trim()) { toast.error("Müşteri adı ve e-posta zorunludur."); return; } onSave(draft); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto border-slate-200 bg-white p-0 sm:max-w-xl" showCloseButton><form onSubmit={submit}><DialogHeader className="border-b border-slate-100 px-6 py-5"><DialogTitle className="font-display text-[18px] font-extrabold text-slate-900">{draft.id ? "Müşteriyi Düzenle" : "Yeni Müşteri"}</DialogTitle><DialogDescription className="text-[12px]">Müşteri detayları dashboard ve fatura kayıtlarıyla birlikte güncellenir.</DialogDescription></DialogHeader><div className="grid gap-4 px-6 py-5 sm:grid-cols-2"><FormLabel label="Müşteri adı" required><Input value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="Örn. Ardıç Teknoloji" className="h-10" /></FormLabel><FormLabel label="Müşteri türü"><Input value={draft.role} onChange={(event) => setDraft({ ...draft, role: event.target.value })} placeholder="Kurumsal müşteri" className="h-10" /></FormLabel><FormLabel label="E-posta" required><Input value={draft.email} onChange={(event) => setDraft({ ...draft, email: event.target.value })} type="email" placeholder="ornek@firma.com" className="h-10" /></FormLabel><FormLabel label="Telefon"><Input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} placeholder="+90 555 000 00 00" className="h-10" /></FormLabel><FormLabel label="Durum"><Select value={draft.status} onValueChange={(value) => setDraft({ ...draft, status: value as CustomerStatus })}><SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Aktif">Aktif</SelectItem><SelectItem value="Potansiyel">Potansiyel</SelectItem><SelectItem value="Pasif">Pasif</SelectItem></SelectContent></Select></FormLabel><FormLabel label="Müşteri notu" className="sm:col-span-2"><textarea value={draft.note} onChange={(event) => setDraft({ ...draft, note: event.target.value })} placeholder="Ödeme tercihi, görüşme notu veya önemli bilgi..." className="min-h-[92px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[12px] text-slate-700 outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-100" /></FormLabel></div><DialogFooter className="border-t border-slate-100 px-6 py-4"><button type="button" onClick={() => onOpenChange(false)} className="h-9 rounded-md border border-slate-200 px-3 text-[12px] font-bold text-slate-600 hover:bg-slate-50">Vazgeç</button><button type="submit" className="h-9 rounded-md bg-blue-600 px-4 text-[12px] font-extrabold text-white hover:bg-blue-700">{draft.id ? "Değişiklikleri Kaydet" : "Müşteri Oluştur"}</button></DialogFooter></form></DialogContent></Dialog>;
}

function InvoiceDialog({ open, invoice, customers, onOpenChange, onSave }: { open: boolean; invoice: Invoice; customers: Customer[]; onOpenChange: (open: boolean) => void; onSave: (invoice: Invoice) => void }) {
  const [draft, setDraft] = useState(invoice);
  useEffect(() => { if (open) setDraft(invoice); }, [invoice, open]);
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (!draft.customerId || !draft.title.trim() || draft.amount <= 0) { toast.error("Müşteri, açıklama ve geçerli tutar zorunludur."); return; } onSave(draft); };
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[90vh] overflow-y-auto border-slate-200 bg-white p-0 sm:max-w-xl" showCloseButton><form onSubmit={submit}><DialogHeader className="border-b border-slate-100 px-6 py-5"><DialogTitle className="font-display text-[18px] font-extrabold text-slate-900">{draft.id ? "Faturayı Düzenle" : "Yeni Fatura"}</DialogTitle><DialogDescription className="text-[12px]">Fatura durumu, dashboard tahsilat metriklerini anında etkiler.</DialogDescription></DialogHeader><div className="grid gap-4 px-6 py-5 sm:grid-cols-2"><FormLabel label="Fatura numarası"><Input value={draft.number} onChange={(event) => setDraft({ ...draft, number: event.target.value })} placeholder="Otomatik oluşturulur" className="h-10" /></FormLabel><FormLabel label="Durum"><Select value={draft.status} onValueChange={(value) => setDraft({ ...draft, status: value as InvoiceStatus })}><SelectTrigger className="h-10 w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Taslak">Taslak</SelectItem><SelectItem value="Gönderildi">Gönderildi</SelectItem><SelectItem value="Ödendi">Ödendi</SelectItem><SelectItem value="Vadesi Geçti">Vadesi Geçti</SelectItem></SelectContent></Select></FormLabel><FormLabel label="Müşteri" required><Select value={draft.customerId} onValueChange={(value) => setDraft({ ...draft, customerId: value })}><SelectTrigger className="h-10 w-full"><SelectValue placeholder="Müşteri seçin" /></SelectTrigger><SelectContent>{customers.filter((customer) => customer.status !== "Pasif").map((customer) => <SelectItem key={customer.id} value={customer.id}>{customer.name}</SelectItem>)}</SelectContent></Select></FormLabel><FormLabel label="Tutar (₺)" required><Input value={draft.amount || ""} onChange={(event) => setDraft({ ...draft, amount: Number(event.target.value) })} type="number" min="0" step="0.01" placeholder="0,00" className="h-10" /></FormLabel><FormLabel label="Açıklama" required className="sm:col-span-2"><Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder="Hizmet veya ürün açıklaması" className="h-10" /></FormLabel><FormLabel label="Düzenleme tarihi"><Input value={draft.issueDate} onChange={(event) => setDraft({ ...draft, issueDate: event.target.value })} type="date" className="h-10" /></FormLabel><FormLabel label="Vade tarihi"><Input value={draft.dueDate} onChange={(event) => setDraft({ ...draft, dueDate: event.target.value })} type="date" className="h-10" /></FormLabel></div><DialogFooter className="border-t border-slate-100 px-6 py-4"><button type="button" onClick={() => onOpenChange(false)} className="h-9 rounded-md border border-slate-200 px-3 text-[12px] font-bold text-slate-600 hover:bg-slate-50">Vazgeç</button><button type="submit" className="h-9 rounded-md bg-blue-600 px-4 text-[12px] font-extrabold text-white hover:bg-blue-700">{draft.id ? "Değişiklikleri Kaydet" : "Fatura Oluştur"}</button></DialogFooter></form></DialogContent></Dialog>;
}

function FormLabel({ label, required, className = "", children }: { label: string; required?: boolean; className?: string; children: React.ReactNode }) {
  return <label className={`block ${className}`}><span className="mb-1.5 block text-[11px] font-bold text-slate-600">{label}{required && <span className="ml-0.5 text-rose-500">*</span>}</span>{children}</label>;
}

function MoneyFlowApp({ data, setData, onLogout }: { data: DemoData; setData: React.Dispatch<React.SetStateAction<DemoData>>; onLogout: () => void }) {
  const [active, setActive] = useState<AppSection>("Dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
  const [customerDraft, setCustomerDraft] = useState<Customer>(blankCustomer());
  const [invoiceDraft, setInvoiceDraft] = useState<Invoice>(() => blankInvoice(data.customers[0]?.id ?? ""));
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const addActivity = (current: DemoData, activity: ActivityItem) => ({ ...current, activities: [activity, ...current.activities].slice(0, 16) });
  const navigate = (name: string) => {
    if (name === "Dashboard" || name === "Müşteriler" || name === "Faturalar") setActive(name);
    else toast.info(`${name} modülü sıradaki sürüm için hazırlanıyor.`, { description: "Bu ilk sürüm müşteri ve fatura süreçlerini uçtan uca çalıştırır." });
  };
  const openNewCustomer = () => { setCustomerDraft(blankCustomer()); setCustomerDialogOpen(true); };
  const openEditCustomer = (customer: Customer) => { setCustomerDraft(customer); setCustomerDialogOpen(true); };
  const openNewInvoice = (paid = false) => { setInvoiceDraft({ ...blankInvoice(data.customers.find((customer) => customer.status !== "Pasif")?.id ?? ""), status: paid ? "Ödendi" : "Taslak" }); setInvoiceDialogOpen(true); };
  const openEditInvoice = (invoice: Invoice) => { setInvoiceDraft(invoice); setInvoiceDialogOpen(true); };
  const saveCustomer = (draft: Customer) => {
    const isNew = !draft.id;
    const saved = isNew ? { ...draft, id: `cus-${Date.now()}` } : draft;
    setData((current) => {
      const customers = isNew ? [saved, ...current.customers] : current.customers.map((customer) => customer.id === saved.id ? saved : customer);
      const activity = makeActivity("customer", isNew ? `${saved.name} eklendi` : `${saved.name} güncellendi`, isNew ? "Müşteri iletişim bilgileri ve çalışma notu oluşturuldu." : "Müşteri kaydındaki bilgiler güncellendi.");
      return addActivity({ ...current, customers }, activity);
    });
    setCustomerDialogOpen(false);
    toast.success(isNew ? "Müşteri oluşturuldu" : "Müşteri güncellendi");
  };
  const saveInvoice = (draft: Invoice) => {
    const isNew = !draft.id;
    const saved = { ...draft, id: draft.id || `inv-${Date.now()}`, number: draft.number.trim() || `MF-2026-${String(data.invoices.length + 19).padStart(3, "0")}` };
    const customerName = data.customers.find((customer) => customer.id === saved.customerId)?.name ?? "Seçilen müşteri";
    setData((current) => {
      const invoices = isNew ? [saved, ...current.invoices] : current.invoices.map((invoice) => invoice.id === saved.id ? saved : invoice);
      const activity = makeActivity("invoice", isNew ? `${saved.number} oluşturuldu` : `${saved.number} güncellendi`, `${customerName} için ${money(saved.amount)} tutarındaki fatura ${saved.status.toLocaleLowerCase("tr")} durumunda kaydedildi.`);
      return addActivity({ ...current, invoices }, activity);
    });
    setInvoiceDialogOpen(false);
    toast.success(isNew ? "Fatura oluşturuldu" : "Fatura güncellendi");
  };
  const markPaid = (invoice: Invoice) => {
    setData((current) => addActivity({ ...current, invoices: current.invoices.map((item) => item.id === invoice.id ? { ...item, status: "Ödendi" } : item) }, makeActivity("payment", `${invoice.number} ödemesi kaydedildi`, `${money(invoice.amount)} tutarındaki tahsilat Ödendi olarak işaretlendi.`)));
    toast.success("Tahsilat kaydedildi", { description: `${invoice.number} dashboard metriklerine işlendi.` });
  };
  const confirmDelete = () => {
    if (!deleteTarget) return;
    setData((current) => {
      if (deleteTarget.kind === "customer") {
        const invoicesRemoved = current.invoices.filter((invoice) => invoice.customerId === deleteTarget.id).length;
        return addActivity({ ...current, customers: current.customers.filter((customer) => customer.id !== deleteTarget.id), invoices: current.invoices.filter((invoice) => invoice.customerId !== deleteTarget.id) }, makeActivity("customer", `${deleteTarget.label} silindi`, invoicesRemoved ? `Müşteriyle ilişkili ${invoicesRemoved} fatura da kaldırıldı.` : "Müşteri kaydı kaldırıldı."));
      }
      return addActivity({ ...current, invoices: current.invoices.filter((invoice) => invoice.id !== deleteTarget.id) }, makeActivity("invoice", `${deleteTarget.label} silindi`, "Fatura kaydı ve ilgili tutar dashboard’dan kaldırıldı."));
    });
    toast.success(deleteTarget.kind === "customer" ? "Müşteri silindi" : "Fatura silindi");
    setDeleteTarget(null);
  };
  const resetDemo = () => { setData(initialData()); toast.success("Demo verileri sıfırlandı", { description: "Başlangıç müşteri ve fatura kayıtları geri yüklendi." }); };
  const sectionTitle = active === "Dashboard" ? "Dashboard" : active;

  return <div className="dashboard-shell min-h-screen bg-[#f8fafc] text-slate-900 lg:flex"><Sidebar active={active} invoiceCount={data.invoices.length} onNavigate={navigate} onLogout={onLogout} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} /><main className="min-h-screen flex-1"><header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8"><div className="flex items-center gap-3"><button onClick={() => setMobileOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"><Menu className="h-5 w-5" /></button><div className="hidden sm:block"><p className="text-[12px] font-medium text-slate-400">MoneyFlow / {sectionTitle}</p><h1 className="font-display text-[18px] font-extrabold tracking-[-0.035em] text-slate-900">{sectionTitle}</h1></div></div><div className="flex items-center gap-2 sm:gap-3"><button onClick={() => { setActive("Faturalar"); openNewInvoice(); }} className="hidden h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 sm:flex"><Plus className="h-3.5 w-3.5 text-blue-600" />Yeni Fatura</button><button onClick={() => { setActive("Müşteriler"); openNewCustomer(); }} className="hidden h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[12px] font-bold text-white shadow-[0_5px_12px_rgba(37,99,235,0.20)] transition hover:bg-blue-700 active:scale-[0.98] sm:flex"><Plus className="h-3.5 w-3.5" />Yeni Müşteri</button><button onClick={() => toast.info("Bildirim Merkezi", { description: "Ödeme ve vade uyarıları burada yer alacak." })} className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-600 ring-2 ring-white" /></button><button onClick={() => toast.info("Demo Kullanıcı profili")} className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-slate-100"><span className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">DK</span><span className="hidden text-left sm:block"><span className="block text-[12px] font-bold text-slate-700">Demo Kullanıcı</span><span className="block text-[10px] text-slate-400">demo@moneyflow.com</span></span><ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" /></button></div></header>{active === "Dashboard" && <DashboardScreen data={data} onNavigate={setActive} onNewCustomer={openNewCustomer} onNewInvoice={openNewInvoice} onEditInvoice={openEditInvoice} onReset={resetDemo} />}{active === "Müşteriler" && <CustomersScreen customers={data.customers} invoices={data.invoices} onNew={openNewCustomer} onEdit={openEditCustomer} onDelete={(customer) => setDeleteTarget({ kind: "customer", id: customer.id, label: customer.name })} />}{active === "Faturalar" && <InvoicesScreen invoices={data.invoices} customers={data.customers} onNew={() => openNewInvoice()} onEdit={openEditInvoice} onDelete={(invoice) => setDeleteTarget({ kind: "invoice", id: invoice.id, label: invoice.number })} onMarkPaid={markPaid} />}</main><CustomerDialog open={customerDialogOpen} customer={customerDraft} onOpenChange={setCustomerDialogOpen} onSave={saveCustomer} /><InvoiceDialog open={invoiceDialogOpen} invoice={invoiceDraft} customers={data.customers} onOpenChange={setInvoiceDialogOpen} onSave={saveInvoice} /><AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}><AlertDialogContent className="border-slate-200 bg-white"><AlertDialogHeader><AlertDialogTitle className="font-display text-slate-900">Kaydı silmek istiyor musunuz?</AlertDialogTitle><AlertDialogDescription className="text-[12px] leading-5">{deleteTarget?.kind === "customer" ? "Müşteriyle ilişkili tüm faturalar da silinir. Bu işlem demo verilerinde geri alınamaz." : "Bu fatura dashboard metriklerinden ve aktivite kaydından kaldırılır."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="text-[12px]">Vazgeç</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-rose-600 text-[12px] hover:bg-rose-700">Sil</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></div>;
}

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  const [data, setData] = useState<DemoData>(loadData);
  useEffect(() => { window.localStorage.setItem(storageKey, JSON.stringify(data)); }, [data]);
  return authenticated ? <MoneyFlowApp data={data} setData={setData} onLogout={() => setAuthenticated(false)} /> : <LoginScreen onLogin={() => setAuthenticated(true)} />;
}
