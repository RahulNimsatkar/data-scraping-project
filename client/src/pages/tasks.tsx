import { Sidebar } from "@/components/sidebar";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { Plus, List, Activity } from "lucide-react";
import { Link } from "wouter";

export default function TasksPage() {
  const { data: tasks, isLoading } = useQuery<any[]>({
    queryKey: ["/api/tasks"],
    refetchInterval: 10000,
  });

  const { data: activeTasks } = useQuery<any[]>({
    queryKey: ["/api/tasks/active"],
    refetchInterval: 5000,
  });

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">All Tasks</h1>
              <p className="text-muted-foreground">Manage and monitor your scraping tasks</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 text-primary rounded-full text-sm">
                <Activity className="w-4 h-4" />
                <span>{activeTasks?.length || 0} Active</span>
              </div>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="w-4 h-4 mr-2" />
                New Task
              </Button>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tasks</CardTitle>
                <List className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{tasks?.length || 0}</div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Tasks</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{activeTasks?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Currently running</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completed</CardTitle>
                <List className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {tasks?.filter(task => task.status === "completed").length || 0}
                </div>
                <p className="text-xs text-muted-foreground">Successfully finished</p>
              </CardContent>
            </Card>
          </div>

          {/* Tasks Table */}
          <Card>
            <CardHeader>
              <CardTitle>Scraping Tasks</CardTitle>
              <CardDescription>
                View and manage all your web scraping tasks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable />
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}