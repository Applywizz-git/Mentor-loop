import { useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createSlotsForDates } from "@/lib/data";
import { toast } from "@/hooks/use-toast";

type Props = {
  mentorId: string;
  defaultStart?: string;   // "09:00"
  defaultEnd?: string;     // "12:00"
  defaultDuration?: number; // 30
};

export default function AvailabilityCalendar({
  mentorId,
  defaultStart = "09:00",
  defaultEnd = "12:00",
  defaultDuration = 30,
}: Props) {
  const [selected, setSelected] = useState<Date[]>([]);
  const [start, setStart] = useState(defaultStart);
  const [end, setEnd] = useState(defaultEnd);
  const [duration, setDuration] = useState(defaultDuration);
  const [saving, setSaving] = useState(false);

  async function onSave() {
    if (!selected.length) {
      toast({ title: "Select at least one date", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { inserted } = await createSlotsForDates(mentorId, selected, start, end, duration);
      toast({ title: "Availability saved", description: `Created ${inserted} slots.` });
      setSelected([]); // clear selection after save
    } catch (e: any) {
      toast({ title: "Failed to save", description: e?.message ?? "Try again", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div className="p-4 rounded-lg border">
        <DayPicker
          mode="multiple"
          selected={selected}
          onSelect={(d) => setSelected(d as Date[])}
          weekStartsOn={1}
        />
        <p className="text-sm text-muted-foreground mt-2">
          Selected {selected.length} {selected.length === 1 ? "day" : "days"}
        </p>
      </div>

      <div className="p-4 rounded-lg border space-y-4">
        <div>
          <label className="block text-sm mb-1">Start time (HH:mm)</label>
          <Input value={start} onChange={(e) => setStart(e.target.value)} placeholder="09:00" />
        </div>
        <div>
          <label className="block text-sm mb-1">End time (HH:mm)</label>
          <Input value={end} onChange={(e) => setEnd(e.target.value)} placeholder="12:00" />
        </div>
        <div>
          <label className="block text-sm mb-1">Slot duration (minutes)</label>
          <Input
            type="number"
            min={10}
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          />
        </div>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save Availability"}
        </Button>
        <p className="text-xs text-muted-foreground">
          This creates individual slots for each selected day between the start and end time.
        </p>
      </div>
    </div>
  );
}
