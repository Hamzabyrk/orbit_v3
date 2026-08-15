/* MoneyFlow style reminder: accounting administration remains in the same light operational system—thin rules, precise tables, cool neutrals and #2563EB only for intentional actions. */
import { useState } from "react";
import { ChevronDown, Menu } from "lucide-react";
import { toast } from "sonner";
import { ArchiveScreen, ChartAccountsScreen, LedgerScreen } from "@/components/AccountingModules";
import { SettingsPanel, type CompanySettings } from "@/components/SettingsPanel";
import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";

type Customer = { id: string; name: string };
type Supplier = { id: string; name: string };
type Invoice = { id: string; number: string; customerId: string; title: string; amount: number; issueDate: string; status: string };
type Expense = { id: string; number: string; supplierId: string; title: string; category: string; amount: number; expenseDate: string; status: string };
type BankAccount = { id: string; name: string; ledgerBalance: number };
type BankTransaction = { id: string; accountId: string; date: string; description: string; direction: "Gelen" | "Giden"; amount: number; category: string; status: string; reference?: string };
type JournalLine = { id: string; accountCode: string; accountName: string; debit: number; credit: number };
type JournalEntry = { id: string; number: string; date: string; description: string; source: "Fatura" | "Gider" | "Banka" | "Manuel"; reference?: string; status: "İşlendi" | "Taslak"; lines: JournalLine[] };
type AccountType = "Varlık" | "Yükümlülük" | "Gelir" | "Gider" | "Özkaynak";
type ChartAccount = { id: string; code: string; name: string; type: AccountType; group: string; normalBalance: "Borç" | "Alacak"; active: boolean };
type ArchiveItem = { id: string; type: "Fatura" | "Gider" | "Satış" | "Banka"; reference: string; title: string; date: string; amount: number; reason: string; source: "Faturalar" | "Giderler" | "Satışlar" | "Bankalar"; archived: boolean };
type AccountingData = { customers: Customer[]; suppliers: Supplier[]; invoices: Invoice[]; expenses: Expense[]; bankAccounts: BankAccount[]; bankTransactions: BankTransaction[]; journalEntries: JournalEntry[]; chartAccounts: ChartAccount[]; archiveItems: ArchiveItem[]; settings: CompanySettings };
type AccountingSection = "Muhasebe" | "Hesap Planı" | "Arşiv" | "Ayarlar";
type FinanceSection = "Bankalar" | "Satışlar" | "Raporlar";
type MainSection = "Dashboard" | "Gün Planı" | "Otomasyonlar" | "ERP" | "Belgeler" | "Müşteriler" | "Faturalar" | "Giderler" | "Tedarikçiler" | "Randevular";

export function AccountingWorkspace({ data, initialSection, onMainNavigate, onFinanceNavigate, onCreateJournal, onCreateAccount, onRestoreArchive, onSaveSettings, onReset, onLogout }: { data: AccountingData; initialSection: AccountingSection; onMainNavigate: (section: MainSection) => void; onFinanceNavigate: (section: FinanceSection) => void; onCreateJournal: (entry: JournalEntry) => void; onCreateAccount: (account: ChartAccount) => void; onRestoreArchive: (item: ArchiveItem) => void; onSaveSettings: (settings: CompanySettings) => void; onReset: () => void; onLogout: () => void }) {
  const [active, setActive] = useState<AccountingSection>(initialSection);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = (label: string) => {
    if (label === "Muhasebe" || label === "Hesap Planı" || label === "Arşiv" || label === "Ayarlar") { setActive(label); return; }
    if (label === "Bankalar" || label === "Satışlar" || label === "Raporlar") { onFinanceNavigate(label); return; }
    if (label === "Bildirimler") { toast.info("Bildirim Merkezi", { description: "Ödeme, vade ve görüşme hatırlatmaları aktivite günlüğünde görünür." }); return; }
    onMainNavigate(label as MainSection);
  };
  const openSource = (source: ArchiveItem["source"]) => navigate(source);
  return <div className="dashboard-shell min-h-screen bg-[#f8fafc] text-slate-900 lg:flex lg:h-screen lg:overflow-hidden"><WorkspaceSidebar active={active} invoiceCount={data.invoices.length} expenseCount={data.expenses.length} onNavigate={navigate} onLogout={onLogout} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} /><main className="min-h-screen flex-1 lg:h-screen lg:min-h-0 lg:overflow-y-auto"><header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8"><div className="flex items-center gap-3"><button onClick={() => setMobileOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"><Menu className="h-5 w-5" /></button><div><p className="text-[12px] font-medium text-slate-400">MoneyFlow / Muhasebe Yönetimi</p><h1 className="font-display text-[18px] font-extrabold tracking-[-0.035em] text-slate-900">{active}</h1></div></div><button onClick={() => toast.info("Muhasebe çalışma alanı", { description: "Fişler, hesap planı, arşiv ve ayarlar aynı finansal bağlamda çalışır." })} className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-100"><span className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">DK</span><span className="hidden text-left sm:block"><span className="block text-[12px] font-bold text-slate-700">Demo Kullanıcı</span><span className="block text-[10px] text-slate-400">Muhasebe görünümü</span></span><ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" /></button></header>{active === "Muhasebe" && <LedgerScreen data={data} onCreate={onCreateJournal} />}{active === "Hesap Planı" && <ChartAccountsScreen data={data} onCreate={onCreateAccount} />}{active === "Arşiv" && <ArchiveScreen data={data} onRestore={onRestoreArchive} onOpenSource={openSource} />}{active === "Ayarlar" && <SettingsPanel settings={data.settings} onSave={onSaveSettings} onReset={onReset} />}</main></div>;
}
