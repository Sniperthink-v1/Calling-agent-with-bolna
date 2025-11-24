import { useState } from 'react';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { DateRange, type CaptionProps } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onDateChange: (startDate: Date | null, endDate: Date | null) => void;
  placeholder?: string;
  className?: string;
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

interface CustomCaptionProps extends CaptionProps {
  onMonthChange: (date: Date) => void;
}

const CustomCaption = ({ displayMonth, onMonthChange }: CustomCaptionProps) => {
  const [open, setOpen] = useState(false);
  const year = displayMonth.getFullYear();
  const month = displayMonth.getMonth();

  const currentYear = new Date().getFullYear();
  const years: number[] = [];
  for (let y = 2020; y <= currentYear; y++) {
    years.push(y);
  }

  const handleMonthChange = (newMonth: number) => {
    const newDate = new Date(year, newMonth, 1);
    onMonthChange(newDate);
    setOpen(false);
  };

  const handleYearChange = (newYear: number) => {
    const newDate = new Date(newYear, month, 1);
    onMonthChange(newDate);
    setOpen(false);
  };

  return (
    <div className="flex items-center justify-between px-3 pt-3 pb-1">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-1 text-sm font-medium text-foreground hover:text-primary transition-colors"
      >
        {MONTHS[month]} {year}
        <span className="inline-block text-xs opacity-70">▾</span>
      </button>

      {open && (
        <div className="flex items-center gap-2 bg-popover border border-border rounded-md px-2 py-1 text-xs shadow-sm">
          <select
            className="h-7 rounded border border-border bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={month}
            onChange={(e) => handleMonthChange(Number(e.target.value))}
          >
            {MONTHS.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </select>
          <select
            className="h-7 rounded border border-border bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            value={year}
            onChange={(e) => handleYearChange(Number(e.target.value))}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onDateChange,
  placeholder = "Select date range",
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState<Date>(startDate || new Date());

  const handleDateSelect = (range: DateRange | undefined) => {
    if (range?.from) {
      onDateChange(range.from, range.to || null);
      // Close popover only when both dates are selected
      if (range.from && range.to) {
        setIsOpen(false);
      }
    } else {
      onDateChange(null, null);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDateChange(null, null);
    setIsOpen(false);
  };

  const formatDateRange = () => {
    if (!startDate) return placeholder;
    if (!endDate) return format(startDate, 'MMM dd, yyyy') + ' - ...';
    return `${format(startDate, 'MMM dd, yyyy')} - ${format(endDate, 'MMM dd, yyyy')}`;
  };

  const dateRange: DateRange | undefined = startDate ? {
    from: startDate,
    to: endDate || undefined,
  } : undefined;

  return (
    <div className="relative inline-block">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "min-w-[250px] justify-between pr-10",
              !startDate && "text-muted-foreground",
              className
            )}
          >
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              <span className="text-sm">{formatDateRange()}</span>
            </div>
          </Button>
        </PopoverTrigger>
        {(startDate || endDate) && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 p-1 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            month={currentMonth}
            onMonthChange={setCurrentMonth}
            selected={dateRange}
            onSelect={handleDateSelect}
            numberOfMonths={1}
            disabled={(date) => date > new Date()}
            components={{ 
              Caption: (props) => <CustomCaption {...props} onMonthChange={setCurrentMonth} />
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};
