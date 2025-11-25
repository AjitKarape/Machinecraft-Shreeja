import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { NavHeader } from "@/components/NavHeader";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Eye, Pencil, Trash2, CalendarIcon } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useData } from "@/contexts/DataContext";
interface DailyNote {
  id: string;
  date: string;
  worker_name: string;
  notes: string | null;
  is_leave: boolean;
  is_historical?: boolean;
}
interface ProductionLog {
  id: string;
  date: string;
  toy_id: string | null;
  sub_part_id: string | null;
  session: string;
  quantity_produced: number | null;
  worker_name: string;
  notes: string | null;
}
export default function DailyLog() {
  const {
    employees,
    toys
  } = useData();
  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [productionLogs, setProductionLogs] = useState<ProductionLog[]>([]);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<DailyNote | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [employeeName, setEmployeeName] = useState("");
  const [noteText, setNoteText] = useState("");
  const [isLeave, setIsLeave] = useState(false);
  const [filterMonth, setFilterMonth] = useState("");
  const [filterEmployee, setFilterEmployee] = useState("");
  useEffect(() => {
    fetchNotes();
    fetchProductionLogs();
    const notesChannel = supabase.channel("daily-notes-changes").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "daily_notes"
    }, fetchNotes).subscribe();
    const logsChannel = supabase.channel("production-logs-history").on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "production_logs"
    }, fetchProductionLogs).subscribe();
    return () => {
      supabase.removeChannel(notesChannel);
      supabase.removeChannel(logsChannel);
    };
  }, []);
  const fetchNotes = async () => {
    const {
      data
    } = await supabase.from("daily_notes").select("*").order("date", {
      ascending: false
    });
    if (data) setNotes(data);
  };
  const fetchProductionLogs = async () => {
    const {
      data
    } = await supabase.from("production_logs").select("*").order("date", {
      ascending: false
    });
    if (data) setProductionLogs(data);
  };
  const getToyName = (toyId: string | null) => {
    if (!toyId) return "";
    return toys.find(t => t.id === toyId)?.name || "";
  };

  // Convert production logs to display format (read-only historical data)
  const historicalNotes: DailyNote[] = productionLogs.map(log => {
    const isOnLeave = log.session === "On Leave";
    let noteText = "";
    if (isOnLeave) {
      noteText = log.notes || "On Leave";
    } else {
      const toyName = getToyName(log.toy_id);
      const qty = log.quantity_produced || 0;
      noteText = `${toyName}: ${qty} units produced`;
      if (log.notes) {
        noteText += ` | ${log.notes}`;
      }
    }
    return {
      id: `historical-${log.id}`,
      date: log.date,
      worker_name: log.worker_name,
      notes: noteText,
      is_leave: isOnLeave,
      is_historical: true
    };
  });

  // Combine new notes and historical logs
  const allNotes = [...notes, ...historicalNotes];
  const handleAddNote = async () => {
    if (!selectedDate || !employeeName) {
      toast.error("Please fill in all required fields");
      return;
    }
    const {
      error
    } = await supabase.from("daily_notes").insert({
      date: format(selectedDate, "yyyy-MM-dd"),
      worker_name: employeeName,
      notes: noteText || null,
      is_leave: isLeave
    });
    if (error) {
      toast.error("Error adding note");
    } else {
      toast.success("Note added successfully");
      setIsAddDialogOpen(false);
      resetForm();
    }
  };
  const handleDeleteNote = async (id: string) => {
    // Prevent deletion of historical logs
    if (id.startsWith("historical-")) {
      toast.error("Cannot delete historical production logs");
      return;
    }
    const {
      error
    } = await supabase.from("daily_notes").delete().eq("id", id);
    if (error) {
      toast.error("Error deleting note");
    } else {
      toast.success("Note deleted successfully");
    }
  };
  const handleViewNote = (note: DailyNote) => {
    setSelectedNote(note);
    setIsViewDialogOpen(true);
  };
  const handleEditNote = (note: DailyNote) => {
    setSelectedNote(note);
    setSelectedDate(new Date(note.date));
    setEmployeeName(note.worker_name);
    setNoteText(note.notes || "");
    setIsLeave(note.is_leave);
    setIsEditDialogOpen(true);
  };
  const handleUpdateNote = async () => {
    if (!selectedNote || !selectedDate || !employeeName) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Check if this is a historical note (from production_logs)
    if (selectedNote.is_historical && selectedNote.id.startsWith("historical-")) {
      const realId = selectedNote.id.replace("historical-", "");
      const { error } = await supabase.from("production_logs").update({
        date: format(selectedDate, "yyyy-MM-dd"),
        worker_name: employeeName,
        notes: noteText || null,
        session: isLeave ? "On Leave" : "Whole Day"
      }).eq("id", realId);
      
      if (error) {
        toast.error("Error updating note");
      } else {
        toast.success("Note updated successfully");
        setIsEditDialogOpen(false);
        resetForm();
      }
    } else {
      const { error } = await supabase.from("daily_notes").update({
        date: format(selectedDate, "yyyy-MM-dd"),
        worker_name: employeeName,
        notes: noteText || null,
        is_leave: isLeave
      }).eq("id", selectedNote.id);
      
      if (error) {
        toast.error("Error updating note");
      } else {
        toast.success("Note updated successfully");
        setIsEditDialogOpen(false);
        resetForm();
      }
    }
  };
  const resetForm = () => {
    setSelectedNote(null);
    setSelectedDate(new Date());
    setEmployeeName("");
    setNoteText("");
    setIsLeave(false);
  };
  const isThursday = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.getDay() === 4;
  };
  const activeEmployees = employees.filter(e => e.is_active);
  const availableMonths = Array.from(new Set(allNotes.map(note => format(new Date(note.date), "yyyy-MM")))).sort((a, b) => b.localeCompare(a));
  const availableEmployees = Array.from(new Set(allNotes.map(note => note.worker_name))).sort();
  const baseFilteredNotes = allNotes.filter(note => {
    const matchesMonth = !filterMonth || format(new Date(note.date), "yyyy-MM") === filterMonth;
    const matchesEmployee = !filterEmployee || note.worker_name === filterEmployee;
    return matchesMonth && matchesEmployee;
  });
  const addWeeklyOffEntries = (notes: DailyNote[]) => {
    if (notes.length === 0) return notes;
    const allDates = notes.map(note => new Date(note.date));
    const minDate = new Date(Math.min(...allDates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...allDates.map(d => d.getTime())));
    const expandedMinDate = new Date(minDate);
    expandedMinDate.setDate(expandedMinDate.getDate() - 7);
    const expandedMaxDate = new Date(maxDate);
    expandedMaxDate.setDate(expandedMaxDate.getDate() + 7);
    const thursdays: Date[] = [];
    const currentDate = new Date(expandedMinDate);
    currentDate.setDate(currentDate.getDate() - (currentDate.getDay() + 3) % 7);
    while (currentDate <= expandedMaxDate) {
      thursdays.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 7);
    }
    const weeklyOffEntries: DailyNote[] = [];
    thursdays.forEach(thursday => {
      const thursdayStr = format(thursday, "yyyy-MM-dd");
      const hasNotes = notes.some(note => note.date === thursdayStr);
      if (!hasNotes) {
        weeklyOffEntries.push({
          id: `weekly-off-${thursdayStr}`,
          date: thursdayStr,
          worker_name: "All",
          notes: "Weekly Off",
          is_leave: false
        });
      }
    });
    return [...notes, ...weeklyOffEntries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  };
  const filteredNotes = addWeeklyOffEntries(baseFilteredNotes);
  return <div className="min-h-screen bg-background">
      <NavHeader />
      
      <main className="max-w-screen-2xl mx-auto px-3 py-3">
        <div className="mb-3">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h1 className="text-foreground mb-1 text-xl font-medium">Daily Log</h1>
            </div>
            
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="w-4 h-4 mr-1.5" />
                  Add Daily Note
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh]">
                <DialogHeader>
                  <DialogTitle>Add Daily Note</DialogTitle>
                  <DialogDescription>
                    Record daily work notes and leave information.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[50vh] pr-4">
                  <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label>Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className={cn("justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar mode="single" selected={selectedDate} onSelect={date => date && setSelectedDate(date)} />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="grid gap-2">
                    <Label>Employee Name</Label>
                    <Select value={employeeName} onValueChange={setEmployeeName}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select employee" />
                      </SelectTrigger>
                      <SelectContent>
                        {activeEmployees.map(emp => <SelectItem key={emp.id} value={emp.name}>
                            {emp.name}
                          </SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox id="is-leave" checked={isLeave} onCheckedChange={checked => setIsLeave(checked as boolean)} />
                    <Label htmlFor="is-leave" className="text-sm font-medium cursor-pointer">
                      On Leave
                    </Label>
                  </div>

                  <div className="grid gap-2">
                    <Label>Notes</Label>
                    <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Work performed today..." className="min-h-[120px]" />
                  </div>
                  </div>
                </ScrollArea>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddNote}>
                    Add Note
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <div className="flex gap-3 mb-3">
            <Select value={filterMonth} onValueChange={setFilterMonth}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Months</SelectItem>
                {availableMonths.map(month => <SelectItem key={month} value={month}>
                    {format(new Date(month + "-01"), "MMMM yyyy")}
                  </SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={filterEmployee} onValueChange={setFilterEmployee}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by employee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Employees</SelectItem>
                {availableEmployees.map(emp => <SelectItem key={emp} value={emp}>
                    {emp}
                  </SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border rounded-lg bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b bg-muted/50">
                <tr>
                  <th className="text-left p-2 text-sm font-medium text-foreground">Date</th>
                  <th className="text-left p-2 text-sm font-medium text-foreground">Day</th>
                  <th className="text-left p-2 text-sm font-medium text-foreground">Employee








                </th>
                  <th className="text-left p-2 text-sm font-medium text-foreground">Notes / Status</th>
                  <th className="text-center p-2 text-sm font-medium text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredNotes.map(note => <tr key={note.id} className={cn("border-b border-border/50 hover:bg-muted/30", (note.is_leave || note.id.startsWith("weekly-off-")) && "bg-muted/20")}>
                    <td className="p-2 text-sm text-foreground">
                      {format(new Date(note.date), "MMM dd, yyyy")}
                    </td>
                    <td className="p-2 text-sm text-foreground">
                      {format(new Date(note.date), "EEEE")}
                    </td>
                    <td className="p-2 text-sm text-foreground">{note.worker_name}</td>
                    <td className="p-2 text-sm text-foreground">
                      {note.is_leave ? <span className="text-muted-foreground italic">On Leave</span> : note.notes || "-"}
                    </td>
                    <td className="p-2">
                      {!note.id.startsWith("weekly-off-") && <div className="flex justify-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleViewNote(note)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => handleEditNote(note)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          {!note.is_historical && <Button variant="ghost" size="sm" onClick={() => handleDeleteNote(note.id)}>
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>}
                        </div>}
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </div>

        {/* View Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Daily Note Details</DialogTitle>
            </DialogHeader>
            {selectedNote && <div className="grid gap-4 py-4">
                <div>
                  <Label className="text-muted-foreground">Date</Label>
                  <p className="text-foreground">{format(new Date(selectedNote.date), "PPP")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Employee</Label>
                  <p className="text-foreground">{selectedNote.worker_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Status</Label>
                  <p className="text-foreground">{selectedNote.is_leave ? "On Leave" : "Working"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Notes</Label>
                  <p className="text-foreground">{selectedNote.notes || "-"}</p>
                </div>
              </div>}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Edit Daily Note</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[50vh] pr-4">
              <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !selectedDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={selectedDate} onSelect={date => date && setSelectedDate(date)} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label>Employee Name</Label>
                <Select value={employeeName} onValueChange={setEmployeeName}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {activeEmployees.map(emp => <SelectItem key={emp.id} value={emp.name}>
                        {emp.name}
                      </SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="edit-is-leave" checked={isLeave} onCheckedChange={checked => setIsLeave(checked as boolean)} />
                <Label htmlFor="edit-is-leave" className="text-sm font-medium cursor-pointer">
                  On Leave
                </Label>
              </div>

              <div className="grid gap-2">
                <Label>Notes</Label>
                <Textarea value={noteText} onChange={e => setNoteText(e.target.value)} placeholder="Work performed today..." className="min-h-[120px]" />
              </div>
            </div>
            </ScrollArea>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateNote}>
                Update Note
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>;
}