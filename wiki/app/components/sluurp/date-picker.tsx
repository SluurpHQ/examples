import * as React from "react"
import { CalendarIcon } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { cn } from "cn"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useControllable } from "@/hooks/use-controllable"
import { word } from "@/lib/words"

type Common = {
  placeholder?: string
  /** How a date is written: anything `Intl.DateTimeFormat` takes. */
  format?: Intl.DateTimeFormatOptions
  locale?: string
  align?: "start" | "center" | "end"
  id?: string
  className?: string
}

const said = (date: Date, locale: string | undefined, format: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, format).format(date)

/** A date, chosen on a calendar that opens from a button showing it. */
function DatePicker({
  value,
  defaultValue = null,
  onValueChange,
  placeholder = word("pick-date"),
  format = { dateStyle: "long" },
  locale,
  align = "start",
  id,
  className,
}: Common & { value?: Date | null; defaultValue?: Date | null; onValueChange?: (date: Date | null) => void }) {
  const [date, setDate] = useControllable(value, defaultValue, onValueChange)
  const [open, setOpen] = React.useState(false)
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button id={id} variant="outline" className={cn("w-60 max-w-full min-w-0 justify-start text-left font-normal", !date && "text-muted-foreground", className)} />
        }
      >
        <CalendarIcon />
        <span className="truncate">{date ? said(date, locale, format) : placeholder}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="single"
          selected={date ?? undefined}
          defaultMonth={date ?? undefined}
          onSelect={(next) => {
            setDate(next ?? null)
            setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

/** A range of dates, from and to, chosen on a calendar (two months side by side from `sm` up). */
function DateRangePicker({
  value,
  defaultValue,
  onValueChange,
  placeholder = word("pick-range"),
  format = { dateStyle: "medium" },
  locale,
  align = "start",
  id,
  className,
}: Common & { value?: DateRange; defaultValue?: DateRange; onValueChange?: (range: DateRange | undefined) => void }) {
  const [range, setRange] = useControllable<DateRange | undefined>(value, defaultValue, onValueChange)
  const [open, setOpen] = React.useState(false)
  const wide = React.useSyncExternalStore(
    (changed) => {
      const query = matchMedia("(min-width: 640px)")
      query.addEventListener("change", changed)
      return () => query.removeEventListener("change", changed)
    },
    () => matchMedia("(min-width: 640px)").matches,
    () => false,
  )
  const label = !range?.from ? placeholder : `${said(range.from, locale, format)} – ${range.to ? said(range.to, locale, format) : "…"}`
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button id={id} variant="outline" className={cn("w-75 max-w-full min-w-0 justify-start text-left font-normal", !range?.from && "text-muted-foreground", className)} />
        }
      >
        <CalendarIcon />
        <span className="truncate">{label}</span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="range"
          selected={range}
          defaultMonth={range?.from}
          numberOfMonths={wide ? 2 : 1}
          onSelect={(next) => {
            setRange(next)
            if (next?.from && next.to && next.from.getTime() !== next.to.getTime()) setOpen(false)
          }}
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker, DateRangePicker, type DateRange }
