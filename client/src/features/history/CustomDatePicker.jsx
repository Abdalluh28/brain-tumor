import { useState } from "react";
import { Calendar } from "lucide-react";
import { DayPicker } from "react-day-picker";
import dayjs from "dayjs";

import "react-day-picker/dist/style.css";

import {
    Dialog,
    DialogContent,
    DialogTrigger,
} from "@/components/ui/dialog";

export default function CustomDatePicker({
    label,
    date,
    setDate,
    startDate,
    endDate,
}) {
    const [open, setOpen] = useState(false);

    const handleSelect = (selectedDate) => {
        if (!selectedDate) return;

        const selected = dayjs(selectedDate);

        if (startDate && selected.isBefore(startDate, "day")) return;
        if (endDate && selected.isAfter(endDate, "day")) return;

        setDate(selected);
        setOpen(false);
    };

    const handleDisableDate = (date) => {
        const current = dayjs(date);

        // Disable future dates
        if (current.isAfter(dayjs(), "day")) return true;

        // Disable before start date
        if (startDate && current.isBefore(startDate, "day")) return true;

        // Disable after end date
        if (endDate && current.isAfter(endDate, "day")) return true;

        return false;
    };

    return (
        <div className="flex flex-col gap-2">

            {label && (
                <span className="text-sm font-medium">
                    {label}
                </span>
            )}

            <div className="flex items-center gap-2">

                <input
                    type="text"
                    readOnly
                    value={date ? date.format("DD MMM YYYY") : ""}
                    placeholder={`Select ${label}`}
                    className="w-full h-11 px-4 rounded-lg border border-border bg-background"
                />

                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <button className="p-2 rounded-full bg-border hover:bg-border/80 transition duration-300 cursor-pointer">
                            <Calendar size={20} />
                        </button>
                    </DialogTrigger>

                    <DialogContent className="w-fit p-4">
                        <DayPicker
                            mode="single"
                            selected={date ? date.toDate() : undefined}
                            onSelect={handleSelect}
                            disabled={handleDisableDate}
                        />
                    </DialogContent>
                </Dialog>

            </div>
        </div>
    );
}