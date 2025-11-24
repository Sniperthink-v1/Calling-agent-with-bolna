import React, { useState, useMemo } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchTimezones, getTimezoneByValue, type TimezoneInfo } from "@/utils/timezones";

interface TimezoneSelectorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TimezoneSelector({
  value,
  onChange,
  placeholder = "Select timezone",
  disabled = false,
  className,
}: TimezoneSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Get filtered timezones based on search
  const filteredTimezones = useMemo(() => {
    return searchTimezones(searchQuery);
  }, [searchQuery]);

  // Get the selected timezone info
  const selectedTimezone = useMemo(() => {
    return value ? getTimezoneByValue(value) : null;
  }, [value]);

  // Format display text
  const displayText = selectedTimezone
    ? `${selectedTimezone.label} (${selectedTimezone.utcOffset})`
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between",
            !value && "text-muted-foreground",
            className
          )}
        >
          <span className="truncate">{displayText}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search by city or UTC offset..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandEmpty>No timezone found.</CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {filteredTimezones.map((timezone) => (
              <CommandItem
                key={timezone.value}
                value={timezone.value}
                onSelect={(currentValue) => {
                  onChange(currentValue === value ? "" : currentValue);
                  setOpen(false);
                  setSearchQuery("");
                }}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === timezone.value ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-col">
                  <span className="font-medium">{timezone.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {timezone.utcOffset} • {timezone.cities.slice(0, 3).join(", ")}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
