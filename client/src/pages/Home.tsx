// MoneyFlow reference style: crisp financial dashboard, generous white space, #2563EB for decisive actions.
import { FormEvent, useState } from "react";
import {
  Archive,
  ArrowRight,
  BarChart3,
  Banknote,
  Bell,
  Building2,
  Calculator,
  Check,
  ChevronDown,
  CircleDollarSign,
  CreditCard,
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
  PackageOpen,
  Plus,
  ReceiptText,
  Settings,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  UserPlus,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { toast } from "sonner";

const logoUrl = "/manus-storage/moneyflow-calculator-mark_fbcd5c5c.png";

type NavItem = {
  label: string;
  icon: typeof LayoutDashboard;
  count?: string;
};

const navigation: NavItem[] = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Faturalar", icon: FileText, count: "4" },
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

const metrics = [
  {
    label: "Toplam Gelir",
    amount: "₺208.500,00",
    trend: "+0%",
    detail: "bu ay",
    icon: TrendingUp,
    color: "text-emerald-600",
    bg: "bg-emerald-50",
  },
  {
    label: "Toplam Gider",
    amount: "₺150.630,00",
    trend: "+0%",
    detail: "bu ay",
    icon: TrendingDown,
    color: "text-rose-600",
    bg: "bg-rose-50",
  },
  {
    label: "Bekleyen Faturalar",
    amount: "₺29.900,00",
    trend: "-3.1%",
    detail: "bu ay",
    icon: FileText,
    color: "text-amber-600",
    bg: "bg-amber-50",
  },
  {
    label: "Aktif Müşteriler",
    amount: "8",
    trend: "+3.8%",
    detail: "bu ay",
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-50",
  },
];

const quickActions = [
  { title: "Yeni Fatura", detail: "Müşteri faturası oluştur", icon: FileText, iconClass: "bg-blue-50 text-blue-600" },
  { title: "Yeni Gider", detail: "Gider kaydı ekle", icon: ReceiptText, iconClass: "bg-rose-50 text-rose-600" },
  { title: "Yeni Satış", detail: "Satış işlemi kaydet", icon: ShoppingCart, iconClass: "bg-emerald-50 text-emerald-600" },
  { title: "Yeni Müşteri", detail: "Müşteri bilgisi ekle", icon: UserPlus, iconClass: "bg-violet-50 text-violet-600" },
];

const chartData = [
  { month: "Nis", income: 48, expense: 36, net: "₺3,980", values: "₺16,300  ₺12,320" },
  { month: "May", income: 51, expense: 50, net: "₺100", values: "₺17,500  ₺17,400" },
  { month: "Haz", income: 54, expense: 42, net: "₺4,030", values: "₺18,200  ₺14,170" },
  { month: "Tem", income: 71, expense: 49, net: "₺7,450", values: "₺23,500  ₺16,050" },
  { month: "Ağu", income: 59, expense: 52, net: "₺2,550", values: "₺19,700  ₺17,150" },
  { month: "Eyl", income: 33, expense: 31, net: "₺-950", values: "₺9,700  ₺10,650" },
];

const transactions = [
  { id: "GEXP-2025-052", subject: "Elektrik faturası - Eylül", amount: "-₺2.650,00", status: "Ödendi", date: "08 Eyl 2025", type: "expense" },
  { id: "SSAL-2025-037", subject: "Ali Çelik", amount: "+₺2.500,00", status: "Tamamlandı", date: "08 Eyl 2025", type: "sale" },
  { id: "SSAL-2025-036", subject: "Ayşe Özkan", amount: "+₺7.200,00", status: "Tamamlandı", date: "03 Eyl 2025", type: "sale" },
];

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-2.5">
      <img className={compact ? "h-8 w-8 rounded-lg shadow-sm" : "h-12 w-12 rounded-xl shadow-[0_10px_20px_rgba(37,99,235,0.18)]"} src={logoUrl} alt="MoneyFlow hesap makinesi simgesi" />
      {!compact && <span className="font-display text-[22px] font-extrabold tracking-[-0.045em] text-slate-900">MoneyFlow</span>}
    </div>
  );
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
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">E-posta Adresi</span>
              <span className="relative block">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="ornek@email.com" className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-3 text-[13px] font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </span>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-[12px] font-semibold text-slate-700">Şifre</span>
              <span className="relative block">
                <LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input value={password} onChange={(event) => setPassword(event.target.value)} type={showPassword ? "text" : "password"} placeholder="••••••••" className="h-11 w-full rounded-lg border border-slate-200 bg-white pl-10 pr-11 text-[13px] font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                <button type="button" aria-label="Şifre görünürlüğünü değiştir" onClick={() => setShowPassword((current) => !current)} className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-blue-600">
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </span>
            </label>
            <div className="flex items-center justify-between pt-0.5">
              <label className="flex cursor-pointer items-center gap-2 text-[12px] font-medium text-slate-600">
                <input checked={remember} onChange={(event) => setRemember(event.target.checked)} type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 accent-blue-600" />
                Beni hatırla
              </label>
              <button type="button" onClick={() => toast.info("Şifre sıfırlama bağlantısı demo ortamında gönderilmez.")} className="text-[12px] font-semibold text-blue-600 transition hover:text-blue-700">Şifremi unuttum</button>
            </div>
            <button disabled={loading} className="group flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 text-[13px] font-bold text-white shadow-[0_8px_18px_rgba(37,99,235,0.23)] transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-wait disabled:opacity-80">
              {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/35 border-t-white" /> : <>Giriş Yap <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></>}
            </button>
          </form>

          <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-3">
            <p className="text-[12px] font-bold text-slate-700">Demo Hesap Bilgileri:</p>
            <p className="mt-1.5 text-[11px] leading-5 text-slate-600"><strong className="font-semibold text-slate-700">E-posta:</strong> demo@moneyflow.com</p>
            <p className="text-[11px] leading-5 text-slate-600"><strong className="font-semibold text-slate-700">Şifre:</strong> demo123</p>
          </div>
          <p className="mt-5 text-center text-[12px] text-slate-500">Hesabınız yok mu? <button onClick={() => toast.info("Ücretsiz deneme kaydı demo sürümünde kapalıdır.")} className="font-semibold text-blue-600 hover:text-blue-700">Ücretsiz deneme başlatın</button></p>
        </div>
      </section>
    </main>
  );
}

function Sidebar({ active, onNavigate, onLogout, mobileOpen, setMobileOpen }: { active: string; onNavigate: (name: string) => void; onLogout: () => void; mobileOpen: boolean; setMobileOpen: (open: boolean) => void }) {
  const navLink = (item: NavItem) => {
    const selected = active === item.label;
    const Icon = item.icon;
    return (
      <button key={item.label} onClick={() => { onNavigate(item.label); setMobileOpen(false); }} className={`relative flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-[13px] font-semibold transition ${selected ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"}`}>
        {selected && <span className="absolute -left-[17px] h-6 w-1 rounded-r bg-blue-600" />}
        <Icon className={`h-[17px] w-[17px] ${selected ? "text-blue-600" : "text-slate-400"}`} strokeWidth={1.9} />
        <span className="flex-1">{item.label}</span>
        {item.count && <span className={`grid min-w-5 place-items-center rounded-full px-1.5 py-0.5 text-[10px] font-bold ${selected ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"}`}>{item.count}</span>}
      </button>
    );
  };

  return (
    <>
      {mobileOpen && <button aria-label="Menüyü kapat" onClick={() => setMobileOpen(false)} className="fixed inset-0 z-30 bg-slate-900/25 lg:hidden" />}
      <aside className={`dashboard-sidebar fixed inset-y-0 left-0 z-40 flex w-[252px] flex-col border-r border-slate-200 bg-white px-4 py-5 shadow-xl transition-transform lg:static lg:shrink-0 lg:translate-x-0 lg:shadow-none ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="mb-8 flex items-center justify-between px-1">
          <BrandMark compact />
          <button onClick={() => setMobileOpen(false)} className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-100 lg:hidden"><X className="h-4 w-4" /></button>
        </div>
        <nav className="space-y-1">{navigation.map(navLink)}</nav>
        <div className="my-5 border-t border-slate-100" />
        <nav className="space-y-1">{accountingNavigation.map(navLink)}</nav>
        <div className="mt-auto border-t border-slate-100 pt-4">
          <button onClick={() => toast.info("Bu demo ortamında bildirim bulunmuyor.")} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"><Bell className="h-[17px] w-[17px] text-slate-400" />Bildirimler</button>
          <button onClick={onLogout} className="flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"><LogOut className="h-[17px] w-[17px] text-slate-400" />Çıkış Yap</button>
        </div>
      </aside>
    </>
  );
}

function MetricCard({ metric }: { metric: (typeof metrics)[number] }) {
  const Icon = metric.icon;
  const isNegative = metric.label === "Bekleyen Faturalar";
  return (
    <section className="metric-card rounded-xl border border-slate-200 bg-white p-4 shadow-[0_3px_12px_rgba(15,23,42,0.03)]">
      <div className="flex items-start justify-between">
        <p className="text-[12px] font-semibold text-slate-500">{metric.label}</p>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${metric.bg}`}><Icon className={`h-4 w-4 ${metric.color}`} /></span>
      </div>
      <p className="mt-4 font-display text-[22px] font-extrabold tracking-[-0.04em] text-slate-900 tabular-nums">{metric.amount}</p>
      <p className="mt-1.5 flex items-center gap-1 text-[11px] font-semibold"><span className={isNegative ? "text-rose-600" : "text-emerald-600"}>{metric.trend}</span><span className="font-medium text-slate-400">{metric.detail}</span></p>
    </section>
  );
}

function DashboardScreen({ onLogout }: { onLogout: () => void }) {
  const [active, setActive] = useState("Dashboard");
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = (name: string) => {
    setActive(name);
    if (name !== "Dashboard") toast.info(`${name} modülü seçildi`, { description: "Bu yeniden üretimde dashboard görünümü korunuyor." });
  };

  return (
    <div className="dashboard-shell min-h-screen bg-[#f8fafc] text-slate-900 lg:flex">
      <Sidebar active={active} onNavigate={navigate} onLogout={onLogout} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <main className="min-h-screen flex-1">
        <header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"><Menu className="h-5 w-5" /></button>
            <div className="hidden sm:block"><p className="text-[12px] font-medium text-slate-400">Genel Bakış</p><h1 className="font-display text-[18px] font-extrabold tracking-[-0.035em] text-slate-900">Dashboard</h1></div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={() => toast.info("Yeni fatura formu demo sürümünde açılmaz.")} className="hidden h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-bold text-slate-700 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 sm:flex"><Plus className="h-3.5 w-3.5 text-blue-600" />Yeni Fatura</button>
            <button onClick={() => toast.info("Yeni satış formu demo sürümünde açılmaz.")} className="hidden h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-[12px] font-bold text-white shadow-[0_5px_12px_rgba(37,99,235,0.20)] transition hover:bg-blue-700 active:scale-[0.98] sm:flex"><Plus className="h-3.5 w-3.5" />Yeni Satış</button>
            <button onClick={() => toast.info("Bildirim bulunmuyor.")} className="relative grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100"><Bell className="h-[18px] w-[18px]" /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-blue-600 ring-2 ring-white" /></button>
            <button onClick={() => toast.info("Demo Kullanıcı profili")} className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition hover:bg-slate-100"><span className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">DK</span><span className="hidden text-left sm:block"><span className="block text-[12px] font-bold text-slate-700">Demo Kullanıcı</span><span className="block text-[10px] text-slate-400">demo@moneyflow.com</span></span><ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" /></button>
          </div>
        </header>

        <div className="dashboard-canvas px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
          <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div><p className="text-[13px] font-medium text-slate-500">Hoş geldiniz, Demo Kullanıcı</p><h2 className="mt-0.5 font-display text-[25px] font-extrabold tracking-[-0.045em] text-slate-950">Finansal durumunuza genel bakış</h2></div>
            <button onClick={() => toast.info("Tarih filtresi demo ortamında sabittir.")} className="flex h-9 items-center gap-2 self-start rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-600 shadow-sm transition hover:border-slate-300 sm:self-auto"><FileChartColumn className="h-3.5 w-3.5 text-slate-400" />Bu ay<ChevronDown className="h-3.5 w-3.5 text-slate-400" /></button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map((metric) => <MetricCard key={metric.label} metric={metric} />)}</div>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between"><div><h3 className="font-display text-[16px] font-extrabold tracking-[-0.025em] text-slate-900">Hızlı İşlemler</h3><p className="mt-0.5 text-[12px] text-slate-500">Sık kullanılan kayıtları tek adımda başlatın</p></div></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {quickActions.map((action) => { const Icon = action.icon; return <button key={action.title} onClick={() => toast.info(`${action.title} işlemi demo ortamında açılmaz.`)} className="quick-action group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left shadow-[0_3px_12px_rgba(15,23,42,0.025)] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_8px_20px_rgba(37,99,235,0.08)]"><span className={`grid h-9 w-9 place-items-center rounded-lg ${action.iconClass}`}><Icon className="h-[17px] w-[17px]" /></span><span className="min-w-0 flex-1"><span className="block text-[12px] font-bold text-slate-800">{action.title}</span><span className="mt-0.5 block truncate text-[11px] text-slate-500">{action.detail}</span></span><ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-blue-600" /></button>; })}
            </div>
          </section>

          <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(280px,0.85fr)]">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_12px_rgba(15,23,42,0.025)] sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-display text-[16px] font-extrabold tracking-[-0.025em] text-slate-900">Aylık Gelir/Gider</h3><p className="mt-0.5 text-[12px] text-slate-500">Son 6 aylık performans</p></div><div className="flex items-center gap-3 text-[11px] font-semibold text-slate-600"><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-blue-600" />Gelir</span><span className="flex items-center gap-1.5"><i className="h-2 w-2 rounded-sm bg-slate-200" />Gider</span></div></div>
              <div className="mt-6 grid h-[215px] grid-cols-6 items-end gap-3 sm:gap-5">
                {chartData.map((item) => <div key={item.month} className="group flex h-full min-w-0 flex-col justify-end"><div className="relative flex h-[158px] items-end justify-center gap-1.5 border-b border-slate-100 pb-0"><span className="chart-tip absolute -top-8 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[9px] font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100">Net: {item.net}</span><span style={{ height: `${item.income}%` }} className="w-[40%] rounded-t-[3px] bg-blue-600 transition-all duration-300 group-hover:bg-blue-500" /><span style={{ height: `${item.expense}%` }} className="w-[40%] rounded-t-[3px] bg-slate-200 transition-all duration-300 group-hover:bg-slate-300" /></div><p className="mt-2 text-center text-[10px] font-bold text-slate-600">{item.month}</p><p className="hidden whitespace-pre text-center text-[9px] font-medium text-slate-400 2xl:block">{item.values}</p></div>)}
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_3px_12px_rgba(15,23,42,0.025)]"><h3 className="font-display text-[16px] font-extrabold tracking-[-0.025em] text-slate-900">Hızlı Erişim</h3><div className="mt-3 divide-y divide-slate-100">{[{ label: "Müşteriler", total: "Toplam: 8", icon: Users, iconBg: "bg-blue-50", iconColor: "text-blue-600" }, { label: "Tedarikçiler", total: "Toplam: 6", icon: Building2, iconBg: "bg-violet-50", iconColor: "text-violet-600" }, { label: "Banka Hesapları", total: "Toplam: 3", icon: WalletCards, iconBg: "bg-emerald-50", iconColor: "text-emerald-600" }].map((entry) => { const Icon = entry.icon; return <button key={entry.label} onClick={() => navigate(entry.label)} className="flex w-full items-center gap-3 py-3 text-left"><span className={`grid h-8 w-8 place-items-center rounded-lg ${entry.iconBg}`}><Icon className={`h-4 w-4 ${entry.iconColor}`} /></span><span className="flex-1"><span className="block text-[12px] font-bold text-slate-700">{entry.label}</span><span className="text-[10px] text-slate-400">{entry.total}</span></span><ArrowRight className="h-3.5 w-3.5 text-slate-300" /></button>; })}</div></section>
              <section className="overflow-hidden rounded-xl border border-emerald-100 bg-emerald-50/70 p-5"><div className="flex gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700"><Check className="h-[18px] w-[18px]" /></span><div><h3 className="text-[13px] font-bold text-emerald-900">Her Şey Yolunda!</h3><p className="mt-1 text-[11px] leading-5 text-emerald-700">Bekleyen işlem veya uyarı bulunmuyor.</p></div></div></section>
            </aside>
          </div>

          <section className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_3px_12px_rgba(15,23,42,0.025)]"><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6"><div><h3 className="font-display text-[16px] font-extrabold tracking-[-0.025em] text-slate-900">Son İşlemler</h3><p className="mt-0.5 text-[12px] text-slate-500">Son 3 işleminiz</p></div><button onClick={() => navigate("Faturalar")} className="text-[12px] font-bold text-blue-600 transition hover:text-blue-700">Tümünü görüntüle</button></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="bg-slate-50/80 text-[10px] uppercase tracking-[0.07em] text-slate-400"><th className="px-5 py-3 font-bold sm:px-6">İşlem</th><th className="px-5 py-3 font-bold">Müşteri/Açıklama</th><th className="px-5 py-3 font-bold">Tutar</th><th className="px-5 py-3 font-bold">Durum</th><th className="px-5 py-3 font-bold">Tarih</th><th className="px-5 py-3" /></tr></thead><tbody>{transactions.map((transaction) => <tr key={transaction.id} className="border-t border-slate-100 text-[12px] transition hover:bg-slate-50/80"><td className="px-5 py-4 font-bold text-slate-700 sm:px-6">{transaction.id}</td><td className="px-5 py-4 font-medium text-slate-600">{transaction.subject}</td><td className={`px-5 py-4 font-bold tabular-nums ${transaction.type === "sale" ? "text-emerald-600" : "text-rose-600"}`}>{transaction.amount}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${transaction.type === "sale" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{transaction.status}</span></td><td className="px-5 py-4 font-medium text-slate-500">{transaction.date}</td><td className="px-5 py-4"><button onClick={() => toast.info(`${transaction.id} işlem ayrıntısı demo sürümünde açılmaz.`)} className="grid h-7 w-7 place-items-center rounded-md text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"><MoreHorizontal className="h-4 w-4" /></button></td></tr>)}</tbody></table></div></section>
        </div>
      </main>
    </div>
  );
}

export default function Home() {
  const [authenticated, setAuthenticated] = useState(false);
  return authenticated ? <DashboardScreen onLogout={() => setAuthenticated(false)} /> : <LoginScreen onLogin={() => setAuthenticated(true)} />;
}
