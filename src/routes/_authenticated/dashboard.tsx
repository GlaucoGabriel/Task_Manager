import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, Clock, ListTodo, Loader2, PlayCircle, ArrowRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { STATUS_LABEL, isOverdue, sortTasks, type Task } from "@/lib/tasks";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — TaskFlow" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useAuth();
  const { data, isLoading } = useQuery({
    queryKey: ["tasks", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*");
      if (error) throw error;
      return data as Task[];
    },
  });

  const tasks = data ?? [];
  const total = tasks.length;
  const pending = tasks.filter((t) => t.status === "pending").length;
  const inProgress = tasks.filter((t) => t.status === "in_progress").length;
  const completed = tasks.filter((t) => t.status === "completed").length;
  const overdue = tasks.filter(isOverdue).length;

  const chartData = [
    { name: STATUS_LABEL.pending, value: pending, fill: "hsl(215 20% 55%)" },
    { name: STATUS_LABEL.in_progress, value: inProgress, fill: "hsl(217 91% 60%)" },
    { name: STATUS_LABEL.completed, value: completed, fill: "hsl(142 71% 45%)" },
  ];

  const upcoming = sortTasks(tasks.filter((t) => t.status !== "completed")).slice(0, 5);

  const stats = [
    { label: "Total", value: total, icon: ListTodo, tone: "bg-primary/10 text-primary" },
    { label: "Pendentes", value: pending, icon: Clock, tone: "bg-slate-500/10 text-slate-600 dark:text-slate-300" },
    { label: "Em andamento", value: inProgress, icon: PlayCircle, tone: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
    { label: "Concluídas", value: completed, icon: CheckCircle2, tone: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
    { label: "Atrasadas", value: overdue, icon: AlertTriangle, tone: "bg-destructive/10 text-destructive" },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral das suas tarefas</p>
      </div>

      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${s.tone} mb-3`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-xs text-muted-foreground">{s.label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Tarefas por status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Próximas</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/tasks">Ver todas <ArrowRight className="w-3 h-3 ml-1" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma tarefa pendente.</p>
            ) : (
              upcoming.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-muted/50">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.title}</div>
                    {t.due_date && (
                      <div className="text-xs text-muted-foreground">
                        {new Date(t.due_date + "T00:00:00").toLocaleDateString("pt-BR")}
                      </div>
                    )}
                  </div>
                  {isOverdue(t) && (
                    <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 shrink-0">
                      Atrasada
                    </Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
