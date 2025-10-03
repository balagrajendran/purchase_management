// FinanaceManagement.tsx
import React, { useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Textarea } from "./ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { motion } from "motion/react";
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  Receipt,
  Plus,
  Edit,
  Trash2,
  DollarSign,
  Calculator,
  FileText,
  Calendar,
  Filter,
  UploadCloud,
  Search,
  X,
  Inbox,
} from "lucide-react";
import { GlassCard } from "./GlassCard";
import { Breadcrumb } from "./Breadcrumb";
import { toast } from "sonner";

// ⬇️ RTK Query hooks & types (adjust the import path if needed)
import {
  useListFinanceQuery,
  useGetFinanceStatsQuery,
  useCreateFinanceMutation,
  useUpdateFinanceMutation,
  useDeleteFinanceMutation,
  FinanceRecord as ApiFinanceRecord,
  FinStatus,
  FinType,
} from "../lib/api/slices/finance";

/* ------------------------------------------------------------------ */
/* Helpers & constants                                                 */
/* ------------------------------------------------------------------ */
const categoryOptions: Record<FinType, string[]> = {
  invested: ["Equipment", "Technology", "Marketing", "R&D", "Infrastructure", "Training"],
  expense: [
    "Office Rent",
    "Utilities",
    "Software Licenses",
    "Travel",
    "Supplies",
    "Professional Services",
  ],
  tds: ["Professional Services", "Rent", "Interest", "Commission", "Contractor Payments", "Other"],
};

const paymentMethods = ["Bank Transfer", "UPI", "Credit Card", "Debit Card", "Cash", "Cheque"];

const toDate = (iso?: string | Date) => {
  if (!iso) return new Date();
  if (iso instanceof Date) return iso;
  return new Date(iso);
};

const yyyyMmDd = (d: Date) => d.toISOString().slice(0, 10);

const fmtINR = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n);

const getStatusColor = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400";
    case "failed":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
  }
};

const getTypeColor = (type: string) => {
  switch (type) {
    case "invested":
      return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400";
    case "expense":
      return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400";
    case "tds":
      return "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400";
  }
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */
export function FinanceManagement() {
  const [currentView, setCurrentView] = useState<"overview" | "form" | "records">("overview");
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingId, setEditingId] = useState<string | null>(null);

  // Overview filters
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<FinType | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<FinStatus | "all">("all");

  // Records view filters
  const [selectedType, setSelectedType] = useState<FinType | "all">("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState<FinStatus | "all">("all");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>("all");

  // Add/Edit form state
  const [formData, setFormData] = useState<{
    type: FinType;
    category: string;
    amount: string;
    description: string;
    date: string; // yyyy-mm-dd
    paymentMethod: string;
    status: FinStatus;
    reference: string;
    taxYear: string;
  }>({
    type: "expense",
    category: "",
    amount: "",
    description: "",
    date: yyyyMmDd(new Date()),
    paymentMethod: "",
    status: "completed",
    reference: "",
    taxYear: "",
  });

  // File input for Bulk Upload
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  /* -------------------------------------------------------------- */
  /* Query args & RTK Query calls                                   */
  /* -------------------------------------------------------------- */
  const listArgs = useMemo(
    () => ({
      search: searchTerm || undefined,
      type: (currentView === "records" ? selectedType : typeFilter) || "all",
      category: (currentView === "records" ? selectedCategory : categoryFilter) || "all",
      status: (currentView === "records" ? selectedStatus : statusFilter) || "all",
      paymentMethod: currentView === "records" ? selectedPaymentMethod : "all",
      order: "desc" as const,
      limit: 500,
    }),
    [
      currentView,
      searchTerm,
      typeFilter,
      selectedType,
      categoryFilter,
      selectedCategory,
      statusFilter,
      selectedStatus,
      selectedPaymentMethod,
    ]
  );

  const {
    data: listData,
    isFetching,
    refetch: refetchList,
  } = useListFinanceQuery(listArgs);

  const {
    data: statsData,
    refetch: refetchStats,
  } = useGetFinanceStatsQuery({
    search: listArgs.search,
    type: listArgs.type,
    category: listArgs.category,
    status: listArgs.status,
    paymentMethod: listArgs.paymentMethod,
  });

  const [createFinance, { isLoading: creating }] = useCreateFinanceMutation();
  const [updateFinance, { isLoading: updating }] = useUpdateFinanceMutation();
  const [deleteFinance, { isLoading: removing }] = useDeleteFinanceMutation();

  const financeData = useMemo(
    () =>
      (listData?.items ?? []).map((x: ApiFinanceRecord) => ({
        ...x,
        date: toDate(x.date),
        createdAt: toDate(x.createdAt),
        updatedAt: toDate(x.updatedAt),
      })),
    [listData]
  );

  /* -------------------------------------------------------------- */
  /* Derived helpers for filters & KPI                              */
  /* -------------------------------------------------------------- */
  const availableCategories = useMemo(() => {
    const typeInUse = currentView === "records" ? selectedType : typeFilter;
    if (typeInUse === "all") {
      return Array.from(new Set(financeData.map((r) => r.category))).sort();
    }
    return categoryOptions[typeInUse as FinType];
  }, [currentView, selectedType, typeFilter, financeData]);

  const availablePaymentMethods = useMemo(
    () => Array.from(new Set(financeData.map((r) => r.paymentMethod))).sort(),
    [financeData]
  );

  // client-side text search + extra filters (keeps UI snappy)
  const locallyFiltered = useMemo(() => {
    const s = (listArgs.search || "").toLowerCase();
    return financeData.filter((r) => {
      const searchMatch =
        !s ||
        r.description.toLowerCase().includes(s) ||
        r.category.toLowerCase().includes(s) ||
        r.paymentMethod.toLowerCase().includes(s) ||
        (r.reference || "").toLowerCase().includes(s);

      const typeMatch = listArgs.type === "all" || r.type === listArgs.type;
      const categoryMatch = listArgs.category === "all" || r.category === listArgs.category;
      const statusMatch = listArgs.status === "all" || r.status === listArgs.status;
      const pmMatch =
        listArgs.paymentMethod === "all" || r.paymentMethod === listArgs.paymentMethod;

      return searchMatch && typeMatch && categoryMatch && statusMatch && pmMatch;
    });
  }, [financeData, listArgs]);

  // KPI cards — use server stats when present; else fallback to computed
  const kpi = useMemo(() => {
    if (statsData) return statsData;
    const invested = financeData
      .filter((r) => r.type === "invested" && r.status === "completed")
      .reduce((s, r) => s + r.amount, 0);
    const expenses = financeData
      .filter((r) => r.type === "expense" && r.status === "completed")
      .reduce((s, r) => s + r.amount, 0);
    const tds = financeData
      .filter((r) => r.type === "tds" && r.status === "completed")
      .reduce((s, r) => s + r.amount, 0);
    return {
      totalInvested: invested,
      totalExpenses: expenses,
      totalTDS: tds,
      profit: invested - expenses - tds,
    };
  }, [statsData, financeData]);

  /* -------------------------------------------------------------- */
  /* CRUD handlers                                                  */
  /* -------------------------------------------------------------- */

  const resetForm = () =>
    setFormData({
      type: "expense",
      category: "",
      amount: "",
      description: "",
      date: yyyyMmDd(new Date()),
      paymentMethod: "",
      status: "completed",
      reference: "",
      taxYear: "",
    });

  const startCreate = () => {
    setFormMode("create");
    setEditingId(null);
    resetForm();
    setCurrentView("form");
  };

  const startEdit = (r: ApiFinanceRecord) => {
    setFormMode("edit");
    setEditingId(r.id);
    setFormData({
      type: r.type,
      category: r.category,
      amount: String(r.amount ?? ""),
      description: r.description ?? "",
      date: yyyyMmDd(toDate(r.date)),
      paymentMethod: r.paymentMethod ?? "",
      status: r.status as FinStatus,
      reference: r.reference ?? "",
      taxYear: r.taxYear ?? "",
    });
    setCurrentView("form");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category || !formData.amount || !formData.description || !formData.paymentMethod) {
      toast.error("Please fill in all required fields");
      return;
    }

    const payload = {
      type: formData.type,
      category: formData.category,
      amount: Number(formData.amount || 0),
      description: formData.description,
      date: new Date(formData.date).toISOString(),
      paymentMethod: formData.paymentMethod,
      status: formData.status,
      reference:
        formData.reference || `${formData.type.toUpperCase()}-${Date.now().toString().slice(-6)}`,
      taxYear: formData.type === "tds" ? formData.taxYear : undefined,
    };

    try {
      if (formMode === "create") {
        await createFinance(payload).unwrap();
        toast.success("Finance record added");
      } else if (editingId) {
        await updateFinance({ id: editingId, data: payload }).unwrap();
        toast.success("Finance record updated");
      }
      // Refresh queries and go to main Finance page (overview) without changing UI context
      await Promise.all([refetchList(), refetchStats()]);
      setCurrentView("overview");
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || "Failed to save record");
    }
  };

  const confirmDelete = async (id: string) => {
    try {
      await deleteFinance({ id }).unwrap();
      toast.success("Record deleted");
      await Promise.all([refetchList(), refetchStats()]);
    } catch (err: any) {
      toast.error(err?.data?.error || err?.message || "Failed to delete");
    }
  };

  /* -------------------------------------------------------------- */
  /* Bulk Upload (CSV or JSON)                                      */
  /* -------------------------------------------------------------- */
  const onBulkUploadClick = () => uploadInputRef.current?.click();

  const parseCSV = (text: string) => {
    // Simple CSV (no quoted commas). Columns expected:
    // type,category,amount,description,date,paymentMethod,status,reference,taxYear
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return [];

    const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const idx = (k: string) => header.indexOf(k);

    const rows = lines.slice(1).map((line) => line.split(","));
    return rows.map((cols) => ({
      type: (cols[idx("type")] || "").trim() as FinType,
      category: (cols[idx("category")] || "").trim(),
      amount: Number((cols[idx("amount")] || "0").trim()),
      description: (cols[idx("description")] || "").trim(),
      date: new Date((cols[idx("date")] || "").trim()).toISOString(),
      paymentMethod: (cols[idx("paymentmethod")] || cols[idx("payment_method")] || "").trim(),
      status: ((cols[idx("status")] || "completed").trim() as FinStatus) || "completed",
      reference: (cols[idx("reference")] || "").trim(),
      taxYear: (cols[idx("taxyear")] || cols[idx("tax_year")] || "").trim() || undefined,
    }));
  };

  const handleBulkFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // reset so same file can be uploaded again
    if (!file) return;

    try {
      const text = await file.text();
      let records: any[] = [];

      if (file.name.toLowerCase().endsWith(".json")) {
        const json = JSON.parse(text);
        records = Array.isArray(json) ? json : json?.records || [];
      } else if (file.name.toLowerCase().endsWith(".csv")) {
        records = parseCSV(text);
      } else {
        toast.error("Unsupported file type. Use .csv or .json");
        return;
      }

      if (!Array.isArray(records) || records.length === 0) {
        toast.error("No valid records found in file");
        return;
      }

      // Normalize each record
      const normalized = records.map((r, i) => ({
        type: (r.type || "expense") as FinType,
        category: r.category || "",
        amount: Number(r.amount || 0),
        description: r.description || `Imported record #${i + 1}`,
        date: new Date(r.date || new Date()).toISOString(),
        paymentMethod: r.paymentMethod || "Bank Transfer",
        status: (r.status || "completed") as FinStatus,
        reference:
          r.reference || `${(r.type || "EXP").toString().toUpperCase()}-${Date.now().toString().slice(-6)}`,
        taxYear: r.taxYear || undefined,
      }));

      toast.message("Bulk upload started", {
        description: `Uploading ${normalized.length} records…`,
      });

      // Send sequentially to keep API happy
      let ok = 0;
      let fail = 0;
      /* eslint-disable no-await-in-loop */
      for (const rec of normalized) {
        try {
          await createFinance(rec).unwrap();
          ok++;
        } catch {
          fail++;
        }
      }
      /* eslint-enable no-await-in-loop */

      await Promise.all([refetchList(), refetchStats()]);

      if (fail === 0) {
        toast.success(`Bulk upload complete (${ok} records)`);
      } else {
        toast.warning(`Bulk upload finished: ${ok} succeeded, ${fail} failed`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Bulk upload failed");
    }
  };

  const breadcrumbItems = [{ label: "Home", onClick: () => {} }];

  /* =======================================================================
   * EMPTY STATE (matches style used in ClientManagement)
   * ======================================================================= */
  const EmptyState = ({
    title = "No records found",
    subtitle = "Get started by adding your first finance record.",
  }: {
    title?: string;
    subtitle?: string;
  }) => (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-2xl bg-muted/50 mb-4">
        <Inbox className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={startCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Add Record
        </Button>
        <Button variant="outline" onClick={onBulkUploadClick}>
          <UploadCloud className="w-4 h-4 mr-2" />
          Bulk Upload
        </Button>
      </div>
    </div>
  );

  /* =======================================================================
   * OVERVIEW
   * ======================================================================= */
  if (currentView === "overview") {
    const noData = (listData?.items?.length ?? 0) === 0;

    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <Breadcrumb items={breadcrumbItems} currentPage="Finance" />

        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              Finance
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={uploadInputRef}
              type="file"
              accept=".csv,.json,application/json,text/csv"
              className="hidden"
              onChange={handleBulkFile}
            />
            <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" onClick={onBulkUploadClick}>
              <UploadCloud className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
            <Button onClick={startCreate} className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Record
            </Button>
          </div>
        </div>

        {/* KPI Cards (use real stats from API; fallback to computed) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard className="group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
              <Wallet className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                {fmtINR(kpi.totalInvested || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                <TrendingUp className="inline w-3 h-3 mr-1 text-green-500" />
                Capital investments & assets
              </p>
            </CardContent>
          </GlassCard>

          <GlassCard className="group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-red-600 to-rose-600 bg-clip-text text-transparent">
                {fmtINR(kpi.totalExpenses || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Operating costs & overheads</p>
            </CardContent>
          </GlassCard>

          <GlassCard className="group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <Calculator className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold bg-gradient-to-r ${
                  (kpi.profit || 0) >= 0 ? "from-blue-600 to-indigo-600" : "from-red-600 to-rose-600"
                } bg-clip-text text-transparent`}
              >
                {fmtINR(kpi.profit || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {(kpi.profit || 0) >= 0 ? (
                  <>
                    <TrendingUp className="inline w-3 h-3 mr-1 text-green-500" />
                    Profit after expenses & TDS
                  </>
                ) : (
                  <>
                    <TrendingDown className="inline w-3 h-3 mr-1 text-red-500" />
                    Loss after expenses & TDS
                  </>
                )}
              </p>
            </CardContent>
          </GlassCard>

          <GlassCard className="group">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total TDS</CardTitle>
              <Receipt className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                {fmtINR(kpi.totalTDS || 0)}
              </div>
              <p className="text-xs text-muted-foreground">Tax deducted at source</p>
            </CardContent>
          </GlassCard>
        </div>

        {/* Search & Filters */}
        <GlassCard>
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <span className="text-sm">Search & Filters</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-end">
              {/* Search */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search records..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white/70 dark:bg-gray-800/70"
                  />
                  {searchTerm && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSearchTerm("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Type</Label>
                <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
                  <SelectTrigger className="bg-white/70 dark:bg-gray-800/70">
                    <SelectValue placeholder="All Types" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="invested">Invested</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="tds">TDS</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Category</Label>
                <Select value={categoryFilter} onValueChange={(v: any) => setCategoryFilter(v)}>
                  <SelectTrigger className="bg-white/70 dark:bg-gray-800/70">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {availableCategories.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                  <SelectTrigger className="bg-white/70 dark:bg-gray-800/70">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Results / clear */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {isFetching ? "Loading…" : <>Showing {locallyFiltered.length} of {financeData.length} records</>}
              </div>
              {(searchTerm || typeFilter !== "all" || categoryFilter !== "all" || statusFilter !== "all") && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setTypeFilter("all");
                    setCategoryFilter("all");
                    setStatusFilter("all");
                  }}
                >
                  <X className="w-4 h-4 mr-1" />
                  Clear Filters
                </Button>
              )}
            </div>
          </CardContent>
        </GlassCard>

        {/* Records Preview / Empty State */}
        <GlassCard>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Finance Records
              </CardTitle>
              {!noData && (
                <Button variant="outline" onClick={() => setCurrentView("records")}>
                  View Full Table
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {noData ? (
              <EmptyState title="No finance records yet" subtitle="Add your first record or use bulk upload." />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locallyFiltered
                      .slice()
                      .sort((a, b) => b.date.getTime() - a.date.getTime())
                      .slice(0, 10)
                      .map((r) => (
                        <TableRow key={r.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className={`p-2 rounded-lg ${
                                  r.type === "invested"
                                    ? "bg-green-100 dark:bg-green-900/20"
                                    : r.type === "expense"
                                    ? "bg-red-100 dark:bg-red-900/20"
                                    : "bg-orange-100 dark:bg-orange-900/20"
                                }`}
                              >
                                {r.type === "invested" ? (
                                  <Wallet className="w-4 h-4 text-green-600" />
                                ) : r.type === "expense" ? (
                                  <TrendingDown className="w-4 h-4 text-red-600" />
                                ) : (
                                  <Receipt className="w-4 h-4 text-orange-600" />
                                )}
                              </div>
                              <span className="capitalize font-medium">{r.type}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{r.description}</TableCell>
                          <TableCell>{r.category}</TableCell>
                          <TableCell>
                            <span
                              className={`font-semibold ${
                                r.type === "invested"
                                  ? "text-green-600"
                                  : r.type === "expense"
                                  ? "text-red-600"
                                  : "text-orange-600"
                              }`}
                            >
                              {r.type === "invested" ? "+" : "-"}
                              {fmtINR(r.amount)}
                            </span>
                          </TableCell>
                          <TableCell>{r.date.toLocaleDateString()}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              {r.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(r.status)}>{r.status}</Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => startEdit(r)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={removing}
                                onClick={() => confirmDelete(r.id)}
                                className="h-8 w-8 p-0"
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </GlassCard>
      </motion.div>
    );
  }

  /* =======================================================================
   * ADD / EDIT FORM (single page for both)
   * ======================================================================= */
  if (currentView === "form") {
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
        <Breadcrumb
          items={[...breadcrumbItems, { label: "Finance", onClick: () => setCurrentView("overview") }]}
          currentPage={formMode === "create" ? "Add Record" : "Edit Record"}
        />

        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
              {formMode === "create" ? "Add Finance Record" : "Edit Finance Record"}
            </h1>
            <p className="text-muted-foreground">
              {formMode === "create"
                ? "Create a new financial record for tracking investments, expenses, or TDS transactions"
                : "Update the details of your finance record"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <input
              ref={uploadInputRef}
              type="file"
              accept=".csv,.json,application/json,text/csv"
              className="hidden"
              onChange={handleBulkFile}
            />
            <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" onClick={onBulkUploadClick}>
              <UploadCloud className="w-4 h-4 mr-2" />
              Bulk Upload
            </Button>
            <Button variant="outline" onClick={() => setCurrentView("overview")}>
              Back to Overview
            </Button>
          </div>
        </div>

        <GlassCard className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Finance Record Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Transaction Type *
                  </Label>
                  <Select
                    value={formData.type}
                    onValueChange={(v: any) => setFormData({ ...formData, type: v, category: "" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="invested">Invested</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="tds">TDS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Category *
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v: any) => setFormData({ ...formData, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categoryOptions[formData.type].map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    Amount *
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      min="0"
                      step="0.01"
                      required
                      className="pl-8"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Payment Method *</Label>
                  <Select
                    value={formData.paymentMethod}
                    onValueChange={(v: any) => setFormData({ ...formData, paymentMethod: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map((m) => (
                        <SelectItem key={m} value={m}>
                          {m}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Transaction Date *
                  </Label>
                  <Input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Status</Label>
                  <Select value={formData.status} onValueChange={(v: any) => setFormData({ ...formData, status: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="failed">Failed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Description *</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Reference</Label>
                    <Input
                      placeholder="Auto-generated if left empty"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                    />
                  </div>
                  {formData.type === "tds" && (
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Tax Year</Label>
                      <Input
                        placeholder="e.g., 2024-25"
                        value={formData.taxYear}
                        onChange={(e) => setFormData({ ...formData, taxYear: e.target.value })}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-6 border-t">
                <Button type="button" variant="outline" onClick={() => setCurrentView("overview")}>
                  Cancel
                </Button>
                <Button disabled={creating || updating} type="submit">
                  {formMode === "create" ? (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Record
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </GlassCard>
      </motion.div>
    );
  }

  /* =======================================================================
   * RECORDS TABLE
   * ======================================================================= */
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      <Breadcrumb
        items={[...breadcrumbItems, { label: "Finance", onClick: () => setCurrentView("overview") }]}
        currentPage="Finance Records"
      />

      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Finance Records
          </h1>
          <p className="text-muted-foreground">Detailed view of all financial transactions</p>
        </div>
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={() => setCurrentView("overview")}>
            Back to Overview
          </Button>
          <input
            ref={uploadInputRef}
            type="file"
            accept=".csv,.json,application/json,text/csv"
            className="hidden"
            onChange={handleBulkFile}
          />
          <Button variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50" onClick={onBulkUploadClick}>
            <UploadCloud className="w-4 h-4 mr-2" />
            Bulk Upload
          </Button>
          <Button onClick={startCreate} className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Record
          </Button>
        </div>
      </div>

      {/* Filters (records view) */}
      <GlassCard>
        <CardHeader>
          <CardTitle className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent flex items-center gap-2">
            <Filter className="h-5 w-5" />
            <span className="text-sm">Filters</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Type</Label>
              <Select value={selectedType} onValueChange={(v: any) => setSelectedType(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="invested">Invested</SelectItem>
                  <SelectItem value="expense">Expenses</SelectItem>
                  <SelectItem value="tds">TDS</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Category</Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {availableCategories.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Payment Method</Label>
              <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  {availablePaymentMethods.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Status</Label>
              <Select value={selectedStatus} onValueChange={(v: any) => setSelectedStatus(v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Search</Label>
              <Input placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {isFetching ? "Loading…" : <>Showing {locallyFiltered.length} of {financeData.length} records</>}
            </div>
          </div>
        </CardContent>
      </GlassCard>

      <GlassCard>
        <CardContent className="p-0">
          {financeData.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-white/5">
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Tax Year</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {locallyFiltered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No records found matching the current filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    locallyFiltered
                      .slice()
                      .sort((a, b) => b.date.getTime() - a.date.getTime())
                      .map((r) => (
                        <TableRow key={r.id} className="hover:bg-muted/50">
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div
                                className={`p-1.5 rounded-md ${
                                  r.type === "invested"
                                    ? "bg-green-100 dark:bg-green-900/20"
                                    : r.type === "expense"
                                    ? "bg-red-100 dark:bg-red-900/20"
                                    : "bg-orange-100 dark:bg-orange-900/20"
                                }`}
                              >
                                {r.type === "invested" ? (
                                  <Wallet className="w-3 h-3 text-green-600" />
                                ) : r.type === "expense" ? (
                                  <TrendingDown className="w-3 h-3 text-red-600" />
                                ) : (
                                  <Receipt className="w-3 h-3 text-orange-600" />
                                )}
                              </div>
                              <Badge className={getTypeColor(r.type)}>
                                {r.type.charAt(0).toUpperCase() + r.type.slice(1)}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">{r.category}</TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate" title={r.description}>
                              {r.description}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`font-semibold ${
                                r.type === "invested"
                                  ? "text-green-600"
                                  : r.type === "expense"
                                  ? "text-red-600"
                                  : "text-orange-600"
                              }`}
                            >
                              {r.type === "invested" ? "+" : "-"}
                              {fmtINR(r.amount)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {r.paymentMethod}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {r.date.toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(r.status)}>{r.status}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{(r as any).taxYear || "-"}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => startEdit(r)}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={removing}
                                onClick={() => confirmDelete(r.id)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </GlassCard>
    </motion.div>
  );
}
