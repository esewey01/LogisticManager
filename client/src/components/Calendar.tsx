import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { insertNoteSchema } from "@shared/schema";
import type { z } from "zod";
import type { Note } from "@shared/schema";

type NoteFormData = z.infer<typeof insertNoteSchema>;

const MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const DAYS_OF_WEEK = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

interface CalendarProps {
  className?: string;
}

export default function Calendar({ className = "" }: CalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<NoteFormData>({
    resolver: zodResolver(insertNoteSchema),
    defaultValues: {
      text: "",
      date: new Date().toISOString().split('T')[0],
    },
  });

  // Obtener todas las notas
  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
  });

  // Mutación para crear nota
  const createNoteMutation = useMutation({
    mutationFn: async (data: NoteFormData) => {
      const response = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Error al crear nota");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Nota creada exitosamente" });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setIsAddingNote(false);
      form.reset();
    },
    onError: () => {
      toast({
        title: "Error al crear nota",
        description: "No se pudo guardar la nota",
        variant: "destructive",
      });
    },
  });

  // Calcular días del mes actual
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDay = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return days;
  }, [currentDate]);

  // Obtener notas por fecha
  const getNotesForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    return notes.filter((note: Note) => note.date === dateStr);
  };

  // Navegar entre meses
  const goToPreviousMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // Manejar clic en fecha
  const handleDateClick = (date: Date) => {
    setSelectedDate(date);
    form.setValue("date", date.toISOString().split('T')[0]);
  };

  // Manejar envío de formulario
  const onSubmit = (data: NoteFormData) => {
    createNoteMutation.mutate(data);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const isSelectedDate = (date: Date) => {
    return selectedDate?.toDateString() === date.toDateString();
  };

  return (
    <Card className={`w-full ${className}`} data-testid="calendar-component">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Calendario de Notas</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToToday} data-testid="button-go-today">
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={goToPreviousMonth} data-testid="button-prev-month">
              <i className="fas fa-chevron-left" />
            </Button>
            <span className="mx-4 font-semibold min-w-[150px] text-center" data-testid="current-month-year">
              {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
            </span>
            <Button variant="outline" size="sm" onClick={goToNextMonth} data-testid="button-next-month">
              <i className="fas fa-chevron-right" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Grid del calendario */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="p-2 text-center font-semibold text-sm text-muted-foreground">
              {day}
            </div>
          ))}
          
          {calendarDays.map((date, index) => {
            const dayNotes = getNotesForDate(date);
            const hasNotes = dayNotes.length > 0;
            
            return (
              <div
                key={index}
                className={`
                  relative p-2 h-20 border border-border cursor-pointer transition-colors
                  hover:bg-muted/50
                  ${!isCurrentMonth(date) ? 'text-muted-foreground bg-muted/20' : ''}
                  ${isToday(date) ? 'bg-primary/10 border-primary' : ''}
                  ${isSelectedDate(date) ? 'bg-primary/20 border-primary' : ''}
                `}
                onClick={() => handleDateClick(date)}
                data-testid={`calendar-day-${date.getDate()}`}
              >
                <div className="text-sm font-medium">
                  {date.getDate()}
                </div>
                
                {hasNotes && (
                  <div className="absolute bottom-1 right-1">
                    <Badge variant="secondary" className="text-xs px-1 py-0" data-testid={`notes-count-${date.getDate()}`}>
                      {dayNotes.length}
                    </Badge>
                  </div>
                )}
                
                {/* Mostrar primeras notas como puntos */}
                <div className="absolute bottom-1 left-1 flex gap-1">
                  {dayNotes.slice(0, 3).map((_: Note, noteIndex: number) => (
                    <div
                      key={noteIndex}
                      className="w-2 h-2 bg-primary rounded-full"
                      data-testid={`note-indicator-${date.getDate()}-${noteIndex}`}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Panel de notas de la fecha seleccionada */}
        {selectedDate && (
          <div className="border-t pt-4" data-testid="selected-date-panel">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold" data-testid="selected-date-title">
                Notas del {selectedDate.getDate()} de {MONTHS[selectedDate.getMonth()]}
              </h3>
              <Dialog open={isAddingNote} onOpenChange={setIsAddingNote}>
                <DialogTrigger asChild>
                  <Button size="sm" data-testid="button-add-note">
                    <i className="fas fa-plus mr-2" />
                    Añadir Nota
                  </Button>
                </DialogTrigger>
                <DialogContent data-testid="add-note-dialog">
                  <DialogHeader>
                    <DialogTitle>Nueva Nota</DialogTitle>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fecha</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} data-testid="input-note-date" />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="text"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nota</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Escribe tu nota aquí..."
                                {...field}
                                data-testid="input-note-text"
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsAddingNote(false)}
                          data-testid="button-cancel-note"
                        >
                          Cancelar
                        </Button>
                        <Button
                          type="submit"
                          disabled={createNoteMutation.isPending}
                          data-testid="button-save-note"
                        >
                          {createNoteMutation.isPending ? "Guardando..." : "Guardar"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto" data-testid="notes-list">
              {getNotesForDate(selectedDate).length === 0 ? (
                <p className="text-muted-foreground text-sm" data-testid="no-notes-message">
                  No hay notas para esta fecha
                </p>
              ) : (
                getNotesForDate(selectedDate).map((note: Note) => (
                  <div
                    key={note.id}
                    className="p-3 bg-muted/50 rounded-md"
                    data-testid={`note-item-${note.id}`}
                  >
                    <p className="text-sm">{note.content}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {note.createdAt ? new Date(note.createdAt).toLocaleString() : ''}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}