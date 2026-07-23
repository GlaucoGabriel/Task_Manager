import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Search, Loader2, AlertTriangle, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { TaskModal } from "@/components/task-modal";
import {
  PRIORITY_LABEL,
  STATUS_LABEL,
  isOverdue,
  sortTasks,
  type Task,
  type TaskPriority,
  type TaskStatus,
} from "@/lib/tasks";

export const Route = createFileRoute("/_authenticated/tasks")({
  head: () => ({ meta: [{ title: "Tarefas — TaskFlow" }] }),
  component: TasksPage,
});

const priorityStyle: Record<TaskPriority, string> = {
  high: "bg-destructive/10 text-destructive border-destructive/20",
  medium: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  low: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
};
const statusStyle: Record<TaskStatus, string> = {
  pending: "bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20",
  in_progress: "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
};

function TasksPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | "all">("all");
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [deleting, setDeleting] = useState<Task | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["tasks", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data as Task[];
    },
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    let list = data;
    if (search) list = list.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()));
    if (statusFilter !== "all") list = list.filter((t) => t.status === statusFilter);
    if (priorityFilter !== "all") list = list.filter((t) => t.priority === priorityFilter);
    return sortTasks(list);
  }, [data, search, statusFilter, priorityFilter]);

  function openNew() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(t: Task) {
    setEditing(t);
    setModalOpen(true);
  }
  async function confirmDelete() {
    if (!deleting) return;
    const { error } = await supabase.from("tasks").delete().eq("id", deleting.id);
    if (error) toast.error(error.message);
    else toast.success("Tarefa excluída");
    setDeleting(null);
    qc.invalidateQueries({ queryKey: ["tasks"] });
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tarefas</h1>
          <p className="text-sm text-muted-foreground">Gerencie todas as suas tarefas</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="w-4 h-4 mr-2" />
          Nova tarefa
        </Button>
      </div>

      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {(Object.keys(STATUS_LABEL) as TaskStatus[]).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={(v) => setPriorityFilter(v as typeof priorityFilter)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas prioridades</SelectItem>
              {(Object.keys(PRIORITY_LABEL) as TaskPriority[]).map((p) => (
                <SelectItem key={p} value={p}>{PRIORITY_LABEL[p]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted-foreground">Nenhuma tarefa encontrada.</p>
          <Button variant="outline" className="mt-4" onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" />
            Criar primeira tarefa
          </Button>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const overdue = isOverdue(t);
            return (
              <Card key={t.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{t.title}</h3>
                      {overdue && (
                        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
                          <AlertTriangle className="w-3 h-3" /> Atrasada
                        </Badge>
                      )}
                    </div>
                    {t.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 mt-3">
                      <Badge variant="outline" className={statusStyle[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                      <Badge variant="outline" className={priorityStyle[t.priority]}>{PRIORITY_LABEL[t.priority]}</Badge>
                      {t.due_date && (
                        <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {new Date(t.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleting(t)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {user && (
        <TaskModal
          open={modalOpen}
          onOpenChange={setModalOpen}
          task={editing}
          userId={user.id}
          onSaved={() => qc.invalidateQueries({ queryKey: ["tasks"] })}
        />
      )}

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting?.status === "completed"
                ? "Esta tarefa está concluída. Tem certeza que deseja excluí-la? Esta ação não pode ser desfeita."
                : "Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
