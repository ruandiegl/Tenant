import "./styles.css";
import { ArrowRight, CalendarDays, Clock, Sun, type LucideIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { ToggleGroup, ToggleGroupItem } from "../../ui/toggle-group";
import { addDays, formatShortDate, fromDateInputValue, type PeriodFilterValue } from "../../../utils/period-range";

type PeriodFilterProps = {
  period: PeriodFilterValue;
  customStartDate: string;
  customEndDate: string;
  ariaLabel?: string;
  onPeriodChange: (period: PeriodFilterValue) => void;
  onCustomStartDateChange: (date: string) => void;
  onCustomEndDateChange: (date: string) => void;
};

const periodOptions: Array<{ value: PeriodFilterValue; label: string; icon: LucideIcon }> = [
  { value: "today", label: "Hoje", icon: Sun },
  { value: "yesterday", label: "Ontem", icon: Clock },
  { value: "last7", label: "7 dias", icon: ArrowRight },
  { value: "custom", label: "Data", icon: CalendarDays }
];

export function PeriodFilter({
  period,
  customStartDate,
  customEndDate,
  ariaLabel = "Filtro de periodo",
  onPeriodChange,
  onCustomStartDateChange,
  onCustomEndDateChange
}: PeriodFilterProps) {
  const [customOpen, setCustomOpen] = useState(period === "custom");
  const today = new Date();
  const yesterday = addDays(today, -1);
  const last7Start = addDays(today, -6);
  const customStart = fromDateInputValue(customStartDate);
  const customEnd = fromDateInputValue(customEndDate);
  const normalizedStart = customStart <= customEnd ? customStart : customEnd;
  const normalizedEnd = customStart <= customEnd ? customEnd : customStart;
  const periodSublabels: Record<PeriodFilterValue, string> = {
    today: formatShortDate(today),
    yesterday: formatShortDate(yesterday),
    last7: `${formatShortDate(last7Start)} - ${formatShortDate(today)}`,
    custom: `${formatShortDate(normalizedStart)} - ${formatShortDate(normalizedEnd)}`
  };

  useEffect(() => {
    if (period !== "custom") setCustomOpen(false);
  }, [period]);

  const handlePeriodChange = (nextPeriod: string) => {
    if (!nextPeriod) return;
    const next = nextPeriod as PeriodFilterValue;
    onPeriodChange(next);
    setCustomOpen(next === "custom");
  };

  return (
    <div className="period-filter" aria-label={ariaLabel}>
      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <ToggleGroup aria-label={ariaLabel} className="period-filter-row" onValueChange={handlePeriodChange} value={period}>
          {periodOptions.map((item) => {
            const Icon = item.icon;
            const chip = (
              <ToggleGroupItem aria-label={`${item.label}: ${periodSublabels[item.value]}`} className="period-chip" key={item.value} value={item.value}>
                <span className="period-chip-icon">
                  <Icon aria-hidden="true" />
                </span>
                <span className="period-chip-label">{item.label}</span>
                <span className="period-chip-context">{periodSublabels[item.value]}</span>
              </ToggleGroupItem>
            );

            if (item.value !== "custom") return chip;

            return (
              <PopoverTrigger asChild key={item.value}>
                {chip}
              </PopoverTrigger>
            );
          })}
        </ToggleGroup>

        <PopoverContent className="period-date-popover" collisionPadding={14}>
          <div className="period-date-popover-header">
            <span>
              <CalendarDays aria-hidden="true" />
            </span>
            <div>
              <strong>Intervalo personalizado</strong>
              <small>Selecione as datas inicial e final.</small>
            </div>
          </div>
          <div className="custom-date-fields">
            <label>
              <span>De</span>
              <input
                aria-label="Data inicial"
                max={customEndDate}
                onChange={(event) => onCustomStartDateChange(event.target.value)}
                type="date"
                value={customStartDate}
              />
            </label>
            <label>
              <span>Ate</span>
              <input
                aria-label="Data final"
                min={customStartDate}
                onChange={(event) => onCustomEndDateChange(event.target.value)}
                type="date"
                value={customEndDate}
              />
            </label>
          </div>
          <p className="period-date-summary">
            Exibindo de <strong>{formatShortDate(normalizedStart)}</strong> ate <strong>{formatShortDate(normalizedEnd)}</strong>
          </p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
