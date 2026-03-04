import { Label } from "@/shared/components/ui/label";
import { Input } from "@/shared/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";

interface Props {
  depositRequired: "yes" | "no";
  depositAmount: number | null;
  onDepositRequiredChange: (value: "yes" | "no") => void;
  onDepositAmountChange: (amount: number | null) => void;
}

export function AppointmentDepositStep({
  depositRequired,
  depositAmount,
  onDepositRequiredChange,
  onDepositAmountChange,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold">Deposit</h2>
        <p className="text-sm text-muted-foreground">
          Select if a deposit is required for this service
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="deposit-required">Deposit required?</Label>
        <Select
          value={depositRequired}
          onValueChange={(v) => onDepositRequiredChange(v as "yes" | "no")}
        >
          <SelectTrigger id="deposit-required">
            <SelectValue placeholder="Select option" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="no">No deposit required</SelectItem>
            <SelectItem value="yes">Deposit required</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {depositRequired === "yes" && (
        <div className="space-y-2">
          <Label htmlFor="deposit-amount">Deposit amount</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
              $
            </span>
            <Input
              id="deposit-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={depositAmount ?? ""}
              onChange={(e) =>
                onDepositAmountChange(e.target.value ? parseFloat(e.target.value) : null)
              }
              className="pl-7"
            />
          </div>
        </div>
      )}
    </div>
  );
}
