import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    const connect = () => {
      try {
        const socket = new WebSocket(wsUrl);
        wsRef.current = socket;

        socket.onopen = () => {
          console.log('WebSocket connected');
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            
            switch (message.type) {
              case 'scraping_progress':
                // Update task progress in cache
                queryClient.setQueryData(["/api/tasks/active"], (oldData: any) => {
                  if (!oldData) return oldData;
                  
                  return oldData.map((task: any) => 
                    task.id === message.data.taskId 
                      ? { ...task, ...message.data }
                      : task
                  );
                });

                // Show notifications for status changes
                if (message.data.status === 'completed') {
                  toast({
                    title: "Task Completed",
                    description: `Scraped ${message.data.scrapedItems} items successfully.`,
                  });
                } else if (message.data.status === 'failed') {
                  toast({
                    title: "Task Failed",
                    description: "Scraping task encountered an error.",
                    variant: "destructive",
                  });
                }
                break;

              case 'task_update':
                // Invalidate task queries to refetch data
                queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
                break;

              case 'new_data':
                // Invalidate scraped data queries
                queryClient.invalidateQueries({ 
                  queryKey: ["/api/tasks", message.data.taskId, "data"] 
                });
                break;

              default:
                console.log('Unknown message type:', message.type);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        socket.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason);
          
          // Attempt to reconnect after a delay
          setTimeout(() => {
            if (wsRef.current?.readyState === WebSocket.CLOSED) {
              connect();
            }
          }, 3000);
        };

        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
      }
    };

    connect();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [queryClient, toast]);

  return wsRef.current;
}
