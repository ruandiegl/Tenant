import "./styles.css";
import { formatMoneyInput, parseMoneyInput } from "../../../utils/money";

type MoneyInputProps = {
  label: string;
  value?: number;
  onChange: (value: number | undefined) => void;
  required?: boolean;
};

export function MoneyInput({ label, value, onChange, required = false }: MoneyInputProps) {
  return (
    <label className="field money-input">
      <span>{label}</span>
      <div>
        <input
          inputMode="numeric"
          placeholder="0,00"
          value={formatMoneyInput(value)}
          onChange={(event) => {
            const hasDigits = Boolean(event.target.value.replace(/\D/g, ""));
            onChange(hasDigits || required ? parseMoneyInput(event.target.value) : undefined);
          }}
        />
      </div>
    </label>
  );
}
