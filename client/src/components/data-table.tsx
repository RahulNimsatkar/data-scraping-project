import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, RefreshCw, Edit, Trash2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ScrapedDataItem {
  id: string;
  taskId: string;
  data: Record<string, any>;
  url: string;
  scrapedAt: string;
}

export function DataTable() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get recent scraped data from the most recent completed task
  const { data: tasks } = useQuery({
    queryKey: ["/api/tasks"],
  });

  // Find the most recently completed task with scraped data
  const recentTask = (tasks as any[])?.find(task => 
    task.status === 'completed' && task.scrapedItems > 0
  ) || (tasks as any[])?.[0];
  
  const recentTaskId = recentTask?.id;

  const { data: scrapedData, isLoading, refetch } = useQuery<ScrapedDataItem[]>({
    queryKey: ["/api/tasks", recentTaskId, "data"],
    enabled: !!recentTaskId,
  });

  // Pagination calculations
  const totalItems = scrapedData?.length || 0;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const currentData = scrapedData?.slice(startIndex, endIndex) || [];

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, any> }) => {
      const response = await apiRequest("PUT", `/api/data/${id}`, { data });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", recentTaskId, "data"] });
      setEditingId(null);
      setEditData({});
      toast({
        title: "Data Updated",
        description: "Scraped data updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update data",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/data/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks", recentTaskId, "data"] });
      toast({
        title: "Data Deleted",
        description: "Scraped data deleted successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete data",
        variant: "destructive",
      });
    },
  });

  const handleExport = async () => {
    if (!recentTaskId) return;
    
    try {
      const response = await fetch(`/api/tasks/${recentTaskId}/export`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scraped-data-${recentTaskId}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast({
          title: "Export Complete",
          description: "CSV file downloaded successfully.",
        });
      }
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export CSV file",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (item: ScrapedDataItem) => {
    setEditingId(item.id);
    setEditData(item.data);
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: editData });
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">Recent Scraped Data</h3>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleExport}
              variant="secondary"
              size="sm"
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground"
              data-testid="button-export-csv"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
            <Button
              onClick={() => refetch()}
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              data-testid="button-refresh-data"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 text-center text-muted-foreground">
            Loading scraped data...
          </div>
        ) : !scrapedData || scrapedData.length === 0 ? (
          <div className="p-6 text-center text-muted-foreground">
            No scraped data available. Start a scraping task to see results here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="text-muted-foreground">Item</TableHead>
                  <TableHead className="text-muted-foreground">Price</TableHead>
                  <TableHead className="text-muted-foreground">URL</TableHead>
                  <TableHead className="text-muted-foreground">Scraped At</TableHead>
                  <TableHead className="text-muted-foreground">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentData.map((item) => (
                  <TableRow 
                    key={item.id} 
                    className="border-t border-border hover:bg-muted/20 transition-colors"
                    data-testid={`row-data-${item.id}`}
                  >
                    <TableCell className="p-4">
                      {editingId === item.id ? (
                        <Input
                          value={editData.title || editData.name || ""}
                          onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                          className="bg-input border-border text-foreground"
                          data-testid={`input-edit-title-${item.id}`}
                        />
                      ) : (
                        <div>
                          <div className="font-medium text-foreground" data-testid={`text-item-title-${item.id}`}>
                            {item.data.title || item.data.name || "No title"}
                          </div>
                          {item.data.description && (
                            <div className="text-sm text-muted-foreground truncate max-w-xs">
                              {item.data.description}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="p-4">
                      {editingId === item.id ? (
                        <Input
                          value={editData.price || ""}
                          onChange={(e) => setEditData({ ...editData, price: e.target.value })}
                          className="bg-input border-border text-foreground"
                          data-testid={`input-edit-price-${item.id}`}
                        />
                      ) : (
                        <span className="font-medium text-foreground" data-testid={`text-item-price-${item.id}`}>
                          {item.data.price || "N/A"}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="p-4">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline text-sm truncate max-w-xs block flex items-center gap-1"
                        data-testid={`link-item-url-${item.id}`}
                      >
                        {new URL(item.url).hostname}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </TableCell>
                    <TableCell className="p-4 text-sm text-muted-foreground" data-testid={`text-scraped-time-${item.id}`}>
                      {formatDate(item.scrapedAt)}
                    </TableCell>
                    <TableCell className="p-4">
                      <div className="flex items-center gap-2">
                        {editingId === item.id ? (
                          <>
                            <Button
                              size="sm"
                              onClick={handleSave}
                              disabled={updateMutation.isPending}
                              data-testid={`button-save-${item.id}`}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancel}
                              data-testid={`button-cancel-${item.id}`}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEdit(item)}
                              className="text-muted-foreground hover:text-foreground"
                              data-testid={`button-edit-${item.id}`}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteMutation.mutate(item.id)}
                              disabled={deleteMutation.isPending}
                              className="text-muted-foreground hover:text-destructive"
                              data-testid={`button-delete-${item.id}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        
        {totalItems > 0 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
            <span data-testid="text-pagination-info">
              Showing {startIndex + 1} to {endIndex} of {totalItems} results
            </span>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === 1}
                onClick={handlePreviousPage}
                data-testid="button-previous-page"
              >
                Previous
              </Button>
              <Button variant="outline" size="sm" className="bg-primary text-primary-foreground">
                {currentPage}
              </Button>
              {totalPages > 1 && (
                <span className="text-muted-foreground">of {totalPages}</span>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                disabled={currentPage === totalPages}
                onClick={handleNextPage}
                data-testid="button-next-page"
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
