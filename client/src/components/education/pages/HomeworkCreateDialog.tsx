import { useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/auth/useAuth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { classes } from "../educationData";
import type { Homework, HomeworkSubject } from "../types";

const SUBJECTS: HomeworkSubject[] = [
  "Matematik",
  "Türkçe",
  "Fizik",
  "Kimya",
  "Biyoloji",
  "Geometri",
];

const formatDate = (date: Date) =>
  date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

export function HomeworkCreateDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (item: Homework) => void;
}) {
  const { identity } = useAuth();
  const teacherName = identity?.displayName?.trim() ?? "";

  // Liste öğretmenin kendi sınıflarıyla sınırlı ve ad çözülemediğinde boş
  // kalır. Bilinmeyende genişleyip tüm sınıfları açmak, öğretmene başkasının
  // sınıfına ödev verdirmek olurdu (K-04). Boş liste zaten ele alınıyor:
  // seçici devre dışı kalıyor ve sebebi yazılıyor.
  const availableClasses = teacherName
    ? classes.filter(item => item.mentor === teacherName).map(item => item.name)
    : [];

  const [classGroup, setClassGroup] = useState(availableClasses[0] ?? "");
  const [subject, setSubject] = useState<HomeworkSubject>(SUBJECTS[0]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  const canSubmit = classGroup !== "" && title.trim() !== "" && dueDate !== "";

  const resetForm = () => {
    setClassGroup(availableClasses[0] ?? "");
    setSubject(SUBJECTS[0]);
    setTitle("");
    setDescription("");
    setDueDate("");
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    const item: Homework = {
      id: `hw-${Date.now()}`,
      classGroup,
      subject,
      title: title.trim(),
      description: description.trim(),
      assignedBy: teacherName || "Öğretmen",
      assignedDate: formatDate(new Date()),
      dueDate: formatDate(new Date(dueDate)),
      status: "Aktif",
    };
    onCreate(item);
    toast.success("Ödev oluşturuldu", {
      description: `${classGroup} sınıfına "${item.title}" ödevi eklendi.`,
    });
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (!next) resetForm();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Yeni ödev oluştur</DialogTitle>
          <DialogDescription>
            Sadece sorumlu olduğunuz sınıflara ödev atayabilirsiniz.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-[10px] font-extrabold uppercase tracking-[.06em] text-slate-400">
                Sınıf
              </Label>
              <Select
                value={classGroup}
                onValueChange={setClassGroup}
                disabled={availableClasses.length === 0}
              >
                <SelectTrigger className="mt-1.5 h-9 w-full text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map(name => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableClasses.length === 0 ? (
                <p className="mt-1.5 text-[11px] leading-5 text-slate-500">
                  Ödev verilebilecek bir sınıf yok.
                </p>
              ) : null}
            </div>
            <div>
              <Label className="text-[10px] font-extrabold uppercase tracking-[.06em] text-slate-400">
                Ders
              </Label>
              <Select
                value={subject}
                onValueChange={value => setSubject(value as HomeworkSubject)}
              >
                <SelectTrigger className="mt-1.5 h-9 w-full text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SUBJECTS.map(item => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label className="text-[10px] font-extrabold uppercase tracking-[.06em] text-slate-400">
              Başlık
            </Label>
            <Input
              value={title}
              onChange={event => setTitle(event.target.value)}
              placeholder="Örn. Türev Uygulamaları Deneme Seti"
              className="mt-1.5 h-9 text-[13px]"
            />
          </div>
          <div>
            <Label className="text-[10px] font-extrabold uppercase tracking-[.06em] text-slate-400">
              Açıklama
            </Label>
            <Textarea
              value={description}
              onChange={event => setDescription(event.target.value)}
              placeholder="Ödevin kapsamı ve öğrencilerden beklenenler"
              className="mt-1.5 min-h-20 text-[13px]"
            />
          </div>
          <div>
            <Label className="text-[10px] font-extrabold uppercase tracking-[.06em] text-slate-400">
              Son teslim tarihi
            </Label>
            <Input
              type="date"
              value={dueDate}
              onChange={event => setDueDate(event.target.value)}
              className="mt-1.5 h-9 text-[13px]"
            />
          </div>
        </div>
        <DialogFooter>
          <button
            onClick={() => {
              resetForm();
              onOpenChange(false);
            }}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 px-4 text-[11px] font-bold text-slate-600 hover:bg-slate-50"
          >
            Vazgeç
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-slate-900 px-4 text-[11px] font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Ödevi Oluştur
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
