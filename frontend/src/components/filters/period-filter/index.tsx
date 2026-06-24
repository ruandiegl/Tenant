import "./styles.css";
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock, Sun, type LucideIcon } from "lucide-react";
import { useState } from "react";
import {
  addDays,
  formatMonthLabel,
  formatShortDate,
  fromDateInputValue,
  type PeriodFilterValue
} from "../../../utils/period-range";

type PeriodFilterProps = {
  period: PeriodFilterValue;
  customStartDate: string;
  customEndDate: string;
  ariaLabel?: string;
  onPeriodChange: (period: PeriodFilterValue) => void;
  onCustomStartDateChange: (date: string) => void;
  onCustomEndDateChange: (date: string) => void;
};

const periodLabels: Record<PeriodFilterValue, string> = {
  today: "Hoje",
  yesterday: "Ontem",
  last7: "7 dias",
  custom: "Data"
};

const periodIcons: Record<PeriodFilterValue, LucideIcon> = {
  today: Sun,
  yesterday: Clock,
  last7: ArrowRight,
  custom: CalendarDays
};

export function PeriodFilter({
  period,
  customStartDate,
  customEndDate,
  ariaLabel = "Filtro de periodo",
  onPeriodChange,
  onCustomStartDateChange,
  onCustomEndDateChange
}: PeriodFilterProps) {
  const [customMonth, setCustomMonth] = useState(() => new Date());
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
    last7: `${formatShortDate(last7Start)}–${formatShortDate(today)}`,
    custom: `${formatShortDate(normalizedStart)}–${formatShortDate(normalizedEnd)}`
  };

  function moveCustomMonth(direction: -1 | 1) {
    setCustomMonth((current) => {
      const next = new Date(current);
      next.setMonth(current.getMonth() + direction);
      return next;
    });
  }

  return (
    <div className="period-filter" aria-label={ariaLabel}>
      <div className="period-filter-row">
        {(Object.keys(periodLabels) as PeriodFilterValue[]).map((item) => {
          const Icon = periodIcons[item];
          const isActive = period === item;

          return (
            <button className={`period-chip${isActive ? " is-active" : ""}`} key={item} onClick={() => onPeriodChange(item)} type="button">
              <span className="period-chip-icon">
                <Icon size={16} />
              </span>
              <span className="period-chip-label">{periodLabels[item]}</span>
              <span className="period-chip-context" aria-hidden={!isActive}>
                {periodSublabels[item]}
              </span>
            </button>
          );
        })}
      </div>

      <div className={`custom-period-panel${period === "custom" ? " is-open" : ""}`}>
        <div className="custom-period-nav" aria-label="Navegacao do mes">
          <button type="button" onClick={() => moveCustomMonth(-1)} aria-label="Mes anterior">
            <ChevronLeft size={16} />
          </button>
          <strong>{formatMonthLabel(customMonth)}</strong>
          <button type="button" onClick={() => moveCustomMonth(1)} aria-label="Proximo mes">
            <ChevronRight size={16} />
          </button>
        </div>
        <p>Selecione um intervalo</p>
        <div className="custom-date-fields">
          <label>
            De
            <input type="date" value={customStartDate} onChange={(event) => onCustomStartDateChange(event.target.value)} />
          </label>
          <label>
            Até
            <input type="date" value={customEndDate} onChange={(event) => onCustomEndDateChange(event.target.value)} />
          </label>
        </div>
      </div>
    </div>
  );
}
