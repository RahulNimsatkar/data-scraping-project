import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { Key, Plus, Trash2, Copy, Eye, EyeOff, CheckCircle, XCircle, TestTube, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";

// AI Provider types and constants
type AIProvider = 'openai' | 'gemini' | 'claude' | 'cohere' | 'huggingface';

const AI_PROVIDERS: Record<AIProvider, { name: string; description: string; placeholder: string }> = {
  openai: { name: 'OpenAI', description: 'GPT models including GPT-4 and GPT-5', placeholder: 'sk-...' },
  gemini: { name: 'Google Gemini', description: 'Google\'s latest AI models', placeholder: 'AIza...' },
  claude: { name: 'Anthropic Claude', description: 'Claude 3 and other Anthropic models', placeholder: 'sk-ant-...' },
  cohere: { name: 'Cohere', description: 'Cohere language models', placeholder: 'co-...' },
  huggingface: { name: 'Hugging Face', description: 'Open source models via Hugging Face', placeholder: 'hf_...' }
};

export default function ApiKeysPage() {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyProvider, setNewKeyProvider] = useState<AIProvider>('openai');
  const [newApiKey, setNewApiKey] = useState("");
  const [testingKeys, setTestingKeys] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  // Fetch AI provider keys
  const { data: aiKeys = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/ai-keys'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/ai-keys');
      return res.json();
    }
  });

  // Mutations for key management
  const createKeyMutation = useMutation({
    mutationFn: async (data: { provider: AIProvider; name: string; apiKey: string }) => {
      const res = await apiRequest('POST', '/api/ai-keys', data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "API key added!", description: "Your AI provider key has been saved." });
      setNewKeyName("");
      setNewApiKey("");
      setNewKeyProvider('openai');
      queryClient.invalidateQueries({ queryKey: ['/api/ai-keys'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to add key", 
        description: error.message || "Something went wrong",
        variant: "destructive" 
      });
    }
  });

  const deleteKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const res = await apiRequest('DELETE', `/api/ai-keys/${keyId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "API key deleted", description: "The key has been permanently removed." });
      queryClient.invalidateQueries({ queryKey: ['/api/ai-keys'] });
    },
    onError: (error: any) => {
      toast({ 
        title: "Failed to delete key", 
        description: error.message || "Something went wrong",
        variant: "destructive" 
      });
    }
  });

  const testKeyMutation = useMutation({
    mutationFn: async (keyId: string) => {
      const res = await apiRequest('POST', `/api/ai-keys/test/${keyId}`);
      return res.json();
    },
    onSuccess: (data, keyId) => {
      setTestingKeys(prev => ({ ...prev, [keyId]: false }));
      if (data.success) {
        toast({ title: "API key works!", description: data.message });
      } else {
        toast({ title: "API key test failed", description: data.message, variant: "destructive" });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/ai-keys'] });
    },
    onError: (error: any, keyId) => {
      setTestingKeys(prev => ({ ...prev, [keyId]: false }));
      toast({ 
        title: "Test failed", 
        description: error.message || "Something went wrong",
        variant: "destructive" 
      });
    }
  });

  const toggleKeyVisibility = (keyId: string) => {
    setShowKeys(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const copyToClipboard = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: "API key copied!",
      description: "The API key has been copied to your clipboard.",
    });
  };

  const createNewKey = () => {
    if (!newKeyName.trim() || !newApiKey.trim()) {
      toast({
        title: "All fields required",
        description: "Please fill in both name and API key.",
        variant: "destructive",
      });
      return;
    }
    
    createKeyMutation.mutate({
      provider: newKeyProvider,
      name: newKeyName,
      apiKey: newApiKey
    });
  };

  const deleteKey = (keyId: string, keyName: string) => {
    deleteKeyMutation.mutate(keyId);
  };

  const testKey = (keyId: string) => {
    setTestingKeys(prev => ({ ...prev, [keyId]: true }));
    testKeyMutation.mutate(keyId);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (isActive: boolean, lastUsed?: string) => {
    if (!isActive) return "secondary";
    if (!lastUsed) return "outline";
    return "default";
  };

  const getStatusText = (isActive: boolean, lastUsed?: string) => {
    if (!isActive) return "inactive";
    if (!lastUsed) return "unused";
    return "active";
  };

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-card border-b border-border px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">AI Provider Keys</h1>
              <p className="text-muted-foreground">Manage your API keys for different AI services</p>
            </div>
            <Button onClick={createNewKey} disabled={createKeyMutation.isPending}>
              {createKeyMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              Add AI Provider Key
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Add New AI Provider Key */}
          <Card>
            <CardHeader>
              <CardTitle>Add AI Provider Key</CardTitle>
              <CardDescription>Connect your own API keys from different AI providers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">AI Provider</Label>
                  <Select value={newKeyProvider} onValueChange={(value: AIProvider) => setNewKeyProvider(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(AI_PROVIDERS).map(([key, provider]) => (
                        <SelectItem key={key} value={key}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {AI_PROVIDERS[newKeyProvider].description}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Key Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g., My OpenAI Key"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="apikey">API Key</Label>
                  <Input
                    id="apikey"
                    type="password"
                    placeholder={AI_PROVIDERS[newKeyProvider].placeholder}
                    value={newApiKey}
                    onChange={(e) => setNewApiKey(e.target.value)}
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <Button 
                  onClick={createNewKey}
                  disabled={createKeyMutation.isPending || !newKeyName.trim() || !newApiKey.trim()}
                  className="w-full md:w-auto"
                >
                  {createKeyMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="w-4 h-4 mr-2" />
                  )}
                  Add API Key
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* AI Provider Keys List */}
          <Card>
            <CardHeader>
              <CardTitle>Your AI Provider Keys</CardTitle>
              <CardDescription>Manage and monitor your AI service API keys</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading your API keys...</span>
                </div>
              ) : aiKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No AI provider keys configured yet.</p>
                  <p className="text-sm">Add your first API key above to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {aiKeys.map((apiKey: any) => (
                    <div key={apiKey.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-medium">{apiKey.name}</h3>
                            <Badge className="text-xs font-medium px-2 py-1">
                              {AI_PROVIDERS[apiKey.provider as AIProvider]?.name || apiKey.provider}
                            </Badge>
                            <Badge variant={getStatusColor(apiKey.isActive, apiKey.lastUsed)}>
                              {getStatusText(apiKey.isActive, apiKey.lastUsed)}
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-muted-foreground mb-3">
                            <span>Created: {formatDate(apiKey.createdAt)}</span>
                            <span>Last used: {apiKey.lastUsed ? formatDate(apiKey.lastUsed) : 'Never'}</span>
                            <span>Usage: {apiKey.usageCount || 0} calls</span>
                            <span>Provider: {AI_PROVIDERS[apiKey.provider as AIProvider]?.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <div className="font-mono text-sm bg-muted p-2 rounded flex-1 max-w-md">
                              {showKeys[apiKey.id] ? apiKey.apiKey : apiKey.apiKey}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleKeyVisibility(apiKey.id)}
                              data-testid={`button-toggle-visibility-${apiKey.id}`}
                            >
                              {showKeys[apiKey.id] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(apiKey.apiKey)}
                              data-testid={`button-copy-${apiKey.id}`}
                            >
                              <Copy className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => testKey(apiKey.id)}
                              disabled={testingKeys[apiKey.id]}
                              data-testid={`button-test-${apiKey.id}`}
                            >
                              {testingKeys[apiKey.id] ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <TestTube className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={deleteKeyMutation.isPending}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete API Key</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{apiKey.name}" for {AI_PROVIDERS[apiKey.provider as AIProvider]?.name}? This action cannot be undone and will immediately stop using this key for AI requests.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteKey(apiKey.id, apiKey.name)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage Information & Tips */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Usage Summary</CardTitle>
                <CardDescription>Current activity across all providers</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="text-2xl font-bold">{aiKeys.reduce((sum: number, key: any) => sum + (key.usageCount || 0), 0)}</div>
                    <p className="text-sm text-muted-foreground">Total AI API calls</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{aiKeys.filter((key: any) => key.isActive).length}</div>
                    <p className="text-sm text-muted-foreground">Active provider keys</p>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{Object.keys(AI_PROVIDERS).filter(provider => aiKeys.some((key: any) => key.provider === provider)).length}</div>
                    <p className="text-sm text-muted-foreground">Connected providers</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Security & Best Practices</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-2">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Never share API keys in public repositories</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Use different keys for different environments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>Monitor usage and test keys regularly</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                    <span>The app will automatically use your keys for AI requests</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}