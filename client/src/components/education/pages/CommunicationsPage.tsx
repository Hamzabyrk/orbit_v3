import { toast } from "sonner";
import { MessageListItem, PageHeader } from "../shared";
import type { Role } from "../types";

export function CommunicationsPage({
  role,
  message,
  setMessage,
}: {
  role: Role;
  message: string;
  setMessage: (value: string) => void;
}) {
  const audience =
    role === "teacher"
      ? "YKS 12-A velileri"
      : role === "parent"
        ? "Merve Karaca"
        : role === "student"
          ? "Merve Karaca"
          : "Çorlu Şube velileri";
  const submit = () => {
    if (!message.trim()) return toast.error("Mesajınızı yazın");
    toast.success("Mesaj taslağı gönderildi", {
      description: "Demo ortamında iletişim aktivitesi kaydedildi.",
    });
    setMessage("");
  };
  return (
    <>
      <PageHeader
        eyebrow="İletişim merkezi"
        title={
          role === "student"
            ? "Mesajlarım"
            : role === "parent"
              ? "Öğretmen iletişimi"
              : "Duyurular ve iletişim"
        }
        description="Doğru kişiyle, doğru öğrenci veya sınıf bağlamında iletişim kurun."
      />
      <div className="mt-6 grid gap-6 xl:grid-cols-[.82fr_1.18fr]">
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          <p className="px-2 text-[10px] font-extrabold uppercase tracking-[.13em] text-slate-400">
            Son iletişimler
          </p>
          <div className="mt-3 space-y-1">
            <MessageListItem
              name="Merve Karaca"
              detail="Deneme analiz dosyası paylaşıldı"
              time="10:24"
              selected
            />
            <MessageListItem
              name="Çorlu Şube"
              detail="20 Ağustos veli görüşmesi"
              time="Dün"
            />
            <MessageListItem
              name="ORBIT Otomasyon"
              detail="Devamsızlık bildirimi hazırlandı"
              time="Dün"
            />
          </div>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white shadow-[0_4px_16px_rgba(15,23,42,.025)]">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-[12px] font-extrabold text-slate-800">
              {audience}
            </p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Bağlam: Zeynep Kaya · TYT Deneme 06
            </p>
          </div>
          <div className="space-y-4 px-5 py-5">
            <div className="max-w-[78%] rounded-2xl rounded-tl-sm bg-slate-100 px-3.5 py-3 text-[11px] leading-5 text-slate-700">
              Merhaba, Zeynep’in son deneme sonucunu ve gelecek haftaki çalışma
              önerisini paylaştım.
            </div>
            <div className="ml-auto max-w-[78%] rounded-2xl rounded-tr-sm bg-blue-600 px-3.5 py-3 text-[11px] leading-5 text-white">
              Teşekkür ederim. Geometri çalışması için ek kaynak önerir misiniz?
            </div>
          </div>
          <div className="border-t border-slate-100 p-4">
            <textarea
              value={message}
              onChange={event => setMessage(event.target.value)}
              placeholder="Mesajınızı yazın..."
              className="min-h-[88px] w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-[12px] outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />
            <div className="mt-3 flex justify-end">
              <button
                onClick={submit}
                className="h-9 rounded-lg bg-slate-900 px-3.5 text-[11px] font-bold text-white"
              >
                Mesajı gönder
              </button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
