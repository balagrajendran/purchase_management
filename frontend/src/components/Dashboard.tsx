import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { DollarSign, ShoppingCart, Users, FileText, TrendingUp, Filter, Calendar } from "lucide-react";
import { motion } from "motion/react";
import { GlassCard } from "./GlassCard";
import { Breadcrumb } from "./Breadcrumb";

/* ==== RTK Query hooks (make sure these slices exist) ===================== */
import { useListPurchasesQuery } from "../lib/api/slices/purchases";
import { useListInvoicesQuery } from "../lib/api/slices/invoices";
import { useListClientsQuery } from "../lib/api/slices/clients";

/* ==== Minimal model typings used locally ================================= */
type FireTs = { toDate?: () => Date } | string | Date | undefined;

type Purchase = {
  id: string;
  clientId?: string;
  items?: Array<any>;
  total?: number;
  status?: "completed" | "pending" | "approved" | "rejected" | string;
  createdAt?: FireTs;
};

type Client = { id: string; company?: string };

/* ==== Helpers ============================================================ */
const toDate = (v: FireTs): Date => {
  if (!v) return new Date(0);
  if (v instanceof Date) return v;
  if (typeof v === "string") return new Date(v);
  const ts = (v as any)?.toDate?.();
  return ts instanceof Date ? ts : new Date(0);
};

const formatINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(n);

/* =========================================================================
 * Component
 * ========================================================================= */
export function Dashboard() {
  // Filters
  const [revenueTimeFilter, setRevenueTimeFilter] = useState<"weekly" | "monthly" | "quarterly" | "yearly">("monthly");
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "pending" | "approved" | "rejected">("all");

  /* --------------------- Fetch real-time data via RTK -------------------- */
  const { data: purchasesResp } = useListPurchasesQuery(
    { limit: 1000, order: "desc" },
    { refetchOnMountOrArgChange: true }
  );
  const { data: clientsResp } = useListClientsQuery(
    { limit: 1000 },
    { refetchOnMountOrArgChange: true }
  );
  const { data: invoicesResp } = useListInvoicesQuery(
    { limit: 1000, order: "desc" },
    { refetchOnMountOrArgChange: true }
  );

  // Normalize lists from possible {items: T[]} or T[]
  const purchases: Purchase[] = useMemo(() => {
    const raw = Array.isArray((purchasesResp as any)?.items)
      ? (purchasesResp as any).items
      : (Array.isArray(purchasesResp) ? purchasesResp : []);
    return (raw as Purchase[]).map((p) => ({
      ...p,
      total: Number(p.total ?? 0),
      createdAt: toDate(p.createdAt),
    }));
  }, [purchasesResp]);

  const clients: Client[] = useMemo(() => {
    const raw = Array.isArray((clientsResp as any)?.items)
      ? (clientsResp as any).items
      : (Array.isArray(clientsResp) ? clientsResp : []);
    return raw as Client[];
  }, [clientsResp]);

  const invoicesCount: number = useMemo(() => {
    const raw = Array.isArray((invoicesResp as any)?.items)
      ? (invoicesResp as any).items
      : (Array.isArray(invoicesResp) ? invoicesResp : []);
    return (raw as any[]).length;
  }, [invoicesResp]);

  /* --------------------- KPI values (from purchases) --------------------- */
  const { totalRevenue, totalPurchases, totalClients, momDeltaPct } = useMemo(() => {
    const tRevenue = purchases.reduce((s, p) => s + (p.total || 0), 0);
    const tPurchases = purchases.length;
    const tClients = clients.length;

    // Month-over-month delta based on purchases totals
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const prevDate = new Date(thisYear, thisMonth - 1, 1);
    const prevMonth = prevDate.getMonth();
    const prevYear = prevDate.getFullYear();

    const revThisMonth = purchases
      .filter((p) => {
        const d = toDate(p.createdAt);
        return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
      })
      .reduce((s, p) => s + (p.total || 0), 0);

    const revPrevMonth = purchases
      .filter((p) => {
        const d = toDate(p.createdAt);
        return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
      })
      .reduce((s, p) => s + (p.total || 0), 0);

    const delta =
      revPrevMonth > 0 ? ((revThisMonth - revPrevMonth) / revPrevMonth) * 100 : revThisMonth > 0 ? 100 : 0;

    return {
      totalRevenue: tRevenue,
      totalPurchases: tPurchases,
      totalClients: tClients,
      momDeltaPct: Math.round(delta * 10) / 10,
    };
  }, [purchases, clients]);

  /* ------------------------- Revenue Chart Data -------------------------- */
  const revenueData = useMemo(() => {
    const curr = new Date();

    if (revenueTimeFilter === "weekly") {
      // last 8 weeks
      const data: { period: string; purchases: number; revenue: number }[] = [];
      for (let i = 7; i >= 0; i--) {
        const weekStart = new Date(curr);
        weekStart.setDate(curr.getDate() - curr.getDay() - i * 7);
        weekStart.setHours(0, 0, 0, 0);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);

        const weekPurchases = purchases.filter((p) => {
          const d = toDate(p.createdAt);
          return d >= weekStart && d <= weekEnd;
        });
        data.push({
          period: `Week ${8 - i}`,
          purchases: weekPurchases.length,
          revenue: weekPurchases.reduce((s, p) => s + (p.total || 0), 0),
        });
      }
      return data;
    }

    if (revenueTimeFilter === "monthly") {
      // last 6 months
      const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
      const data: { period: string; purchases: number; revenue: number }[] = [];
      for (let i = 5; i >= 0; i--) {
        const dt = new Date(curr.getFullYear(), curr.getMonth() - i, 1);
        const label = months[dt.getMonth()];
        const monthPurchases = purchases.filter((p) => {
          const d = toDate(p.createdAt);
          return d.getMonth() === dt.getMonth() && d.getFullYear() === dt.getFullYear();
        });
        data.push({
          period: label,
          purchases: monthPurchases.length,
          revenue: monthPurchases.reduce((s, p) => s + (p.total || 0), 0),
        });
      }
      return data;
    }

    if (revenueTimeFilter === "quarterly") {
      // last 4 quarters
      const tag = (q: number) => (q === 0 ? "Q1" : q === 1 ? "Q2" : q === 2 ? "Q3" : "Q4");
      const data: { period: string; purchases: number; revenue: number }[] = [];
      const currQ = Math.floor(curr.getMonth() / 3);

      for (let i = 3; i >= 0; i--) {
        const targetQ = (currQ - i + 4) % 4;
        const year = curr.getFullYear() - (currQ - i < 0 ? 1 : 0);
        const qStartMonth = targetQ * 3;
        const qStart = new Date(year, qStartMonth, 1);
        const qEnd = new Date(year, qStartMonth + 3, 0);
        qEnd.setHours(23, 59, 59, 999);

        const qPurchases = purchases.filter((p) => {
          const d = toDate(p.createdAt);
          return d >= qStart && d <= qEnd;
        });

        data.push({
          period: `${tag(targetQ)} ${year}`,
          purchases: qPurchases.length,
          revenue: qPurchases.reduce((s, p) => s + (p.total || 0), 0),
        });
      }
      return data;
    }

    // yearly: last 3 years
    const data: { period: string; purchases: number; revenue: number }[] = [];
    for (let i = 2; i >= 0; i--) {
      const year = curr.getFullYear() - i;
      const yearPurchases = purchases.filter((p) => toDate(p.createdAt).getFullYear() === year);
      data.push({
        period: `${year}`,
        purchases: yearPurchases.length,
        revenue: yearPurchases.reduce((s, p) => s + (p.total || 0), 0),
      });
    }
    return data;
  }, [revenueTimeFilter, purchases]);

  /* --------------------- Status Distribution (Pie) ----------------------- */
  const statusData = useMemo(() => {
    const base =
      statusFilter === "all"
        ? purchases
        : purchases.filter((p) => (p.status || "pending") === statusFilter);
    const counts = base.reduce<Record<string, number>>((acc, p) => {
      const st = (p.status || "pending").toLowerCase();
      acc[st] = (acc[st] || 0) + 1;
      return acc;
    }, {});
    const total = Object.values(counts).reduce((s, n) => s + n, 0) || 1;

    const palette: Record<string, string> = {
      completed: "#22c55e",
      pending: "#f59e0b",
      approved: "#3b82f6",
      rejected: "#ef4444",
    };

    return Object.entries(counts)
      .map(([name, count]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: Math.round((count / total) * 100),
        count,
        color: palette[name] || "#9CA3AF",
      }))
      .filter((x) => x.value > 0);
  }, [statusFilter, purchases]);

  /* --------------------- Recent Purchases (top 5) ------------------------ */
  const clientsById = useMemo(() => {
    const m = new Map<string, Client>();
    clients.forEach((c) => m.set(c.id, c));
    return m;
  }, [clients]);

  const recentPurchases = useMemo(
    () =>
      purchases
        .slice()
        .sort((a, b) => toDate(b.createdAt).getTime() - toDate(a.createdAt).getTime())
        .slice(0, 5),
    [purchases]
  );

  /* --------------------- UI helpers (unchanged styles) ------------------- */
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-blue-100 text-blue-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const breadcrumbItems = [{ label: "Home", onClick: () => {} }];

  /* ============================== RENDER ================================= */
  return (
    <div className="space-y-6">
      <Breadcrumb items={breadcrumbItems} currentPage="Dashboard" />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <GlassCard className="group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <motion.div whileHover={{ rotate: 360, scale: 1.1 }} transition={{ duration: 0.3 }}>
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <motion.div
                className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-blue-600 bg-clip-text text-transparent"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              >
                ${formatINR(totalRevenue)}
              </motion.div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline w-3 h-3 mr-1 text-emerald-500" />
                {momDeltaPct >= 0 ? "+" : ""}
                {momDeltaPct}% from last month
              </p>
            </CardContent>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <GlassCard className="group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Purchases</CardTitle>
              <motion.div whileHover={{ rotate: 360, scale: 1.1 }} transition={{ duration: 0.3 }}>
                <ShoppingCart className="h-4 w-4 text-blue-600" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <motion.div
                className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
              >
                {totalPurchases}
              </motion.div>
              <p className="text-xs text-muted-foreground">+2 new this week</p>
            </CardContent>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <GlassCard className="group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              <motion.div whileHover={{ rotate: 360, scale: 1.1 }} transition={{ duration: 0.3 }}>
                <Users className="h-4 w-4 text-purple-600" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <motion.div
                className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
              >
                {totalClients}
              </motion.div>
              <p className="text-xs text-muted-foreground">+1 new client this month</p>
            </CardContent>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <GlassCard className="group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <motion.div whileHover={{ rotate: 360, scale: 1.1 }} transition={{ duration: 0.3 }}>
                <FileText className="h-4 w-4 text-orange-600" />
              </motion.div>
            </CardHeader>
            <CardContent>
              <motion.div
                className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
              >
                {invoicesCount}
              </motion.div>
              <p className="text-xs text-muted-foreground">1 pending payment</p>
            </CardContent>
          </GlassCard>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.6 }}>
          <GlassCard>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Revenue
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={revenueTimeFilter}
                    onValueChange={(v: any) => setRevenueTimeFilter(v)}
                  >
                    <SelectTrigger className="w-32 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 12 }}
                    interval={0}
                    angle={revenueTimeFilter === "weekly" ? -45 : 0}
                    textAnchor={revenueTimeFilter === "weekly" ? "end" : "middle"}
                    height={revenueTimeFilter === "weekly" ? 80 : 60}
                  />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any, name: any) => [
                      name === "revenue" ? `₹${formatINR(Number(value || 0))}` : value,
                      name === "revenue" ? "Revenue" : "Purchases",
                    ]}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "8px",
                      backdropFilter: "blur(10px)",
                    }}
                  />
                  <Bar dataKey="revenue" fill="url(#colorGradient)" radius={[4, 4, 0, 0]} />
                  <defs>
                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
              {revenueData.length === 0 && (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No revenue data for selected period</p>
                  </div>
                </div>
              )}
            </CardContent>
          </GlassCard>
        </motion.div>

        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
          <GlassCard>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                  Purchase Status Distribution
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select
                    value={statusFilter}
                    onValueChange={(v: any) => setStatusFilter(v)}
                  >
                    <SelectTrigger className="w-36 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={(entry: any) => `${entry.name}: ${entry.value}% (${entry.count})`}
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any, props: any) => [
                      `${value}% (${props.payload.count} purchases)`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: "rgba(255, 255, 255, 0.9)",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      borderRadius: "8px",
                      backdropFilter: "blur(10px)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {statusData.length === 0 && (
                <div className="flex items-center justify-center h-64 text-muted-foreground">
                  <div className="text-center">
                    <Filter className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No purchase data for selected status</p>
                  </div>
                </div>
              )}

              {/* Status Legend */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                {statusData.map((entry, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="text-muted-foreground">
                      {entry.name}: {entry.count} purchases
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </GlassCard>
        </motion.div>
      </div>

      {/* Recent Purchases */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
        <GlassCard>
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Recent Purchases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentPurchases.map((purchase, index) => {
                const client = clientsById.get(purchase.clientId || "");
                const created = toDate(purchase.createdAt);
                return (
                  <motion.div
                    key={purchase.id}
                    className="flex items-center justify-between p-4 backdrop-blur-sm bg-white/30 dark:bg-gray-800/30 border border-white/20 rounded-lg hover:bg-white/50 dark:hover:bg-gray-800/50 transition-all duration-200"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.9 + index * 0.1 }}
                    whileHover={{ scale: 1.02, y: -2 }}
                  >
                    <div>
                      <p className="font-medium">{client?.company || "Unknown Client"}</p>
                      <p className="text-sm text-muted-foreground">
                        {(purchase.items?.length || 0)} item{(purchase.items?.length || 0) !== 1 ? "s" : ""} •{" "}
                        {created instanceof Date && !isNaN(created as any)
                          ? created.toLocaleDateString()
                          : "--/--/----"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                        ${formatINR(purchase.total || 0)}
                      </span>
                      <Badge className={getStatusColor((purchase.status || "pending").toString())}>
                        {purchase.status || "pending"}
                      </Badge>
                    </div>
                  </motion.div>
                );
              })}
              {recentPurchases.length === 0 && (
                <div className="flex items-center justify-center h-40 text-muted-foreground">
                  <div className="text-center">
                    <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No recent purchases</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </GlassCard>
      </motion.div>
    </div>
  );
}
