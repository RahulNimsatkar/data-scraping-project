export async function exportTaskData(taskId: string): Promise<void> {
  const response = await fetch(`/api/tasks/${taskId}/export`);
  
  if (!response.ok) {
    throw new Error('Export failed');
  }
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `scraped-data-${taskId}.csv`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

export async function generateScrapingCode(taskId: string, language: 'python' | 'javascript') {
  const response = await fetch(`/api/tasks/${taskId}/generate-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ language }),
  });
  
  if (!response.ok) {
    throw new Error('Code generation failed');
  }
  
  return response.json();
}

export async function analyzeWebsite(url: string) {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url }),
  });
  
  if (!response.ok) {
    throw new Error('Website analysis failed');
  }
  
  return response.json();
}

export async function createScrapingTask(data: {
  name: string;
  url: string;
  selectors: any;
  strategy: string;
}) {
  const response = await fetch('/api/tasks', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error('Task creation failed');
  }
  
  return response.json();
}
