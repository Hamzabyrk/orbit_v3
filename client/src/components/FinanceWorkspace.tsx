/* MoneyFlow style reminder: finance workspace keeps the existing calm SaaS rhythm—flat white panels, fine cool-grey borders, #2563EB for active and primary actions. */
import { useState } from "react";
import { ChevronDown, Menu } from "lucide-react";
import { toast } from "sonner";
import { BankAccountsScreen, ReportsScreen, SalesScreen } from "@/components/FinancialModules";
import { WorkspaceSidebar } from "@/components/WorkspaceSidebar";

type Customer = { id: string; name: string; status: string };
type Supplier = { id: string; name: string };
type Invoice = { id: string; number: string; customerId: string; title: string; amount: number; issueDate: string; dueDate: string; status: string };
type Expense = { id: string; number: string; supplierId: string; title: string; category: string; amount: number; expenseDate: string; dueDate: string; status: string };
type BankAccount = { id: string; name: string; bank: string; type: string; ibanLast4: string; balance: number; ledgerBalance: number; lastSync: string; color: "blue" | "emerald" | "violet" };
type BankTransaction = { id: string; accountId: string; date: string; description: string; counterparty: string; direction: "Gelen" | "Giden"; amount: number; category: string; status: "Bekliyor" | "Eşleşti" | "İncelenmeli"; reference?: string };
type SaleStatus = "Teklif" | "Onaylandı" | "Faturalandı" | "Tahsil Edildi";
type Sale = { id: string; number: string; customerId: string; title: string; amount: number; createdAt: string; expectedClose: string; status: SaleStatus; probability: number; invoiceNumber?: string };
type FinanceData = { customers: Customer[]; suppliers: Supplier[]; invoices: Invoice[]; expenses: Expense[]; bankAccounts: BankAccount[]; bankTransactions: BankTransaction[]; sales: Sale[] };
type FinanceSection = "Bankalar" | "Satışlar" | "Raporlar";
type AccountingSection = "Muhasebe" | "Hesap Planı" | "Arşiv" | "Ayarlar";
type MainSection = "Dashboard" | "Gün Planı" | "Müşteriler" | "Faturalar" | "Giderler" | "Tedarikçiler" | "Randevular";

export function FinanceWorkspace({ data, initialSection, onMainNavigate, onAccountingNavigate, onMatch, onCreateSale, onCollectSale, onLogout }: { data: FinanceData; initialSection: FinanceSection; onMainNavigate: (section: MainSection) => void; onAccountingNavigate: (section: AccountingSection) => void; onMatch: (transaction: BankTransaction) => void; onCreateSale: (sale: Sale) => void; onCollectSale: (sale: Sale) => void; onLogout: () => void }) {
  const [active, setActive] = useState<FinanceSection>(initialSection);
  const [mobileOpen, setMobileOpen] = useState(false);
  const matchTransaction = (transaction: BankTransaction) => { onMatch(transaction); toast.success("Banka hareketi eşleştirildi", { description: `${transaction.description} finansal kayıtlara bağlandı.` }); };
  const saveSale = (draft: Sale) => { onCreateSale(draft); toast.success("Satış kaydı oluşturuldu"); };
  const collectSale = (sale: Sale) => { onCollectSale(sale); toast.success("Tahsilat kaydedildi", { description: "Satış, banka hareketi ve rapor değerleri güncellendi." }); };
  const navigate = (label: string) => {
    if (label === "Bankalar" || label === "Satışlar" || label === "Raporlar") { setActive(label); return; }
    if (label === "Muhasebe" || label === "Hesap Planı" || label === "Arşiv" || label === "Ayarlar") { onAccountingNavigate(label); return; }
    if (label === "Bildirimler") { toast.info("Bildirim Merkezi", { description: "Ödeme, vade ve görüşme hatırlatmaları aktivite günlüğünde görünür." }); return; }
    onMainNavigate(label as MainSection);
  };
  return <div className="dashboard-shell min-h-screen bg-[#f8fafc] text-slate-900 lg:flex"><WorkspaceSidebar active={active} invoiceCount={data.invoices.length} expenseCount={data.expenses.length} onNavigate={navigate} onLogout={onLogout} mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} /><main className="min-h-screen flex-1"><header className="sticky top-0 z-20 flex h-[72px] items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6 lg:px-8"><div className="flex items-center gap-3"><button onClick={() => setMobileOpen(true)} className="grid h-9 w-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 lg:hidden"><Menu className="h-5 w-5" /></button><div><p className="text-[12px] font-medium text-slate-400">MoneyFlow / Finans</p><h1 className="font-display text-[18px] font-extrabold tracking-[-0.035em] text-slate-900">{active}</h1></div></div><button onClick={() => toast.info("Finans çalışma alanı", { description: "Banka, satış ve rapor verileri aynı yerel kaynaktan güncellenir." })} className="flex items-center gap-2 rounded-lg px-1.5 py-1 hover:bg-slate-100"><span className="grid h-8 w-8 place-items-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">DK</span><span className="hidden text-left sm:block"><span className="block text-[12px] font-bold text-slate-700">Demo Kullanıcı</span><span className="block text-[10px] text-slate-400">Finans görünümü</span></span><ChevronDown className="hidden h-3.5 w-3.5 text-slate-400 sm:block" /></button></header>{active === "Bankalar" && <BankAccountsScreen accounts={data.bankAccounts} transactions={data.bankTransactions} invoices={data.invoices} expenses={data.expenses} onMatch={matchTransaction} />}{active === "Satışlar" && <SalesScreen sales={data.sales} customers={data.customers} onCreate={saveSale} onCollect={collectSale} />}{active === "Raporlar" && <ReportsScreen accounts={data.bankAccounts} transactions={data.bankTransactions} sales={data.sales} invoices={data.invoices} expenses={data.expenses} />}</main></div>;
}
