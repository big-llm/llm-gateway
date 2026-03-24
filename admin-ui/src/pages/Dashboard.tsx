import { useHealth, useProviderHealth } from '@/api/providers';
import { useRequestLogs } from '@/api/logs';
import { useKeyStats } from '@/api/keys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Activity, CheckCircle, XCircle, Clock, Zap, Key, TrendingUp } from 'lucide-react';

export default function DashboardPage() {
  const { data: health, isLoading: healthLoading } = useHealth();
  const { data: providers } = useProviderHealth();
  const { data: logs } = useRequestLogs({ limit: 10 });
  const { data: keyStats } = useKeyStats();

  const stats = health?.stats;
  const providerList = providers?.providers ?? [];
  const keyData = keyStats?.stats;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="success">Healthy</Badge>;
      case 'degraded':
        return <Badge variant="warning">Degraded</Badge>;
      case 'unhealthy':
        return <Badge variant="destructive">Unhealthy</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  if (healthLoading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">Overview of your LLM Gateway</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-700">Total Requests</CardTitle>
            <Activity className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-800">{stats?.totalRequests ?? 0}</div>
            <p className="text-xs text-blue-600 mt-1">All time</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-700">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-800">
              {stats && stats.totalRequests > 0
                ? ((stats.successCount / stats.totalRequests) * 100).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-green-600 mt-1">{stats?.successCount ?? 0} successful</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-red-700">Errors</CardTitle>
            <XCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-800">{stats?.errorCount ?? 0}</div>
            <p className="text-xs text-red-600 mt-1">Failed requests</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-700">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-800">{stats?.avgLatencyMs ?? 0}ms</div>
            <p className="text-xs text-purple-600 mt-1">Response time</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-amber-700">Active Keys</CardTitle>
            <Key className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-amber-800">{keyData?.totalKeys ?? 0}</div>
            <p className="text-xs text-amber-600 mt-1">
              ${keyData?.totalSpend?.toFixed(2) ?? '0.00'} spent
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-orange-500" />
              Provider Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {providerList.length === 0 ? (
                <p className="text-muted-foreground text-sm">No providers configured</p>
              ) : (
                providerList.map((provider) => (
                  <div
                    key={provider.id}
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                  >
                    <div>
                      <div className="font-medium capitalize">{provider.id}</div>
                      <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                        {provider.baseUrl}
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(provider.status)}
                      {provider.latencyMs && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {provider.latencyMs}ms
                        </div>
                      )}
                      <div className="text-xs text-muted-foreground">
                        {provider.totalCount > 0
                          ? `${((provider.successCount / provider.totalCount) * 100).toFixed(0)}% success rate`
                          : 'No requests yet'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              Recent Requests
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Latency</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs?.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </TableCell>
                    <TableCell className="text-sm">{log.model ?? '-'}</TableCell>
                    <TableCell className="text-sm">{log.latencyMs}ms</TableCell>
                    <TableCell>
                      {log.status === 'success' ? (
                        <Badge variant="success" className="text-xs">
                          Success
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          Error
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {(!logs?.logs || logs.logs.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No requests yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">API Keys Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Keys</span>
                <span className="font-medium">{keyData?.totalKeys ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Spend</span>
                <span className="font-medium">${keyData?.totalSpend?.toFixed(2) ?? '0.00'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Requests</span>
                <span className="font-medium">{keyData?.totalRequests ?? 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Teams</span>
                <span className="font-medium">{keyData?.totalTeams ?? 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Model Mappings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{health?.config?.modelMappingsCount ?? 0}</div>
            <p className="text-sm text-muted-foreground mt-1">Active mappings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${
                  health?.status === 'healthy'
                    ? 'bg-green-500'
                    : health?.status === 'degraded'
                      ? 'bg-yellow-500'
                      : 'bg-red-500'
                }`}
              />
              <span className="font-medium capitalize">{health?.status ?? 'unknown'}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {providerList.filter((p) => p.status === 'healthy').length}/{providerList.length}{' '}
              providers healthy
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
