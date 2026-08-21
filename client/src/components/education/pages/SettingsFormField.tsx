import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SettingsFormField({
  label,
  value,
  onChange,
  type = "text",
  disabled = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  type?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label className="text-[10px] font-extrabold uppercase tracking-[.06em] text-slate-400">
        {label}
      </Label>
      <Input
        type={type}
        value={value}
        disabled={disabled}
        onChange={event => onChange?.(event.target.value)}
        className="mt-1.5 h-9 text-[13px]"
      />
    </div>
  );
}
