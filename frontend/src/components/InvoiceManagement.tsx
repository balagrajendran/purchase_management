import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
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
import { Badge } from "./ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Checkbox } from "./ui/checkbox";
import { Textarea } from "./ui/textarea";
import { Separator } from "./ui/separator";
import {
  Plus,
  Eye,
  Download,
  Send,
  FileText,
  Receipt,
  CalendarDays,
  User,
  Package,
  Trash2,
  ArrowLeft,
  Edit3,
  Check,
  X,
  Clock,
  CheckCircle,
  AlertCircle,
  Filter,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Breadcrumb } from "./Breadcrumb";
import { toast } from "sonner";
import { formatCurrency, DEFAULT_CURRENCY } from "../utils/currency";
import type { Invoice, PurchaseItem, Purchase, Client } from "../types";

// RTK Query hooks (backend is in separate files)
import {
  useListInvoicesQuery,
  useCreateInvoiceMutation,
  useUpdateInvoiceMutation,
  useDeleteInvoiceMutation,
  useGetInvoiceStatsQuery,
} from "../lib/api/slices/invoices";
import { useListClientsQuery } from "../lib/api/slices/clients";
import {
  useGetPurchasesByClientQuery,
  useLazyGetPurchasesByIdsQuery,
} from "../lib/api/slices/purchases";

type KPIStats = {
  totalInvoices: number;
  totalRevenue: number;
  paidInvoices: number;
  paidRevenue: number;
  pendingInvoices: number;
  pendingRevenue: number;
  overdueInvoices: number;
  overdueRevenue: number;
};

export function InvoiceManagement() {
  const [currentView, setCurrentView] = useState<
    "list" | "create" | "view" | "edit"
  >("list");
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);
  const [editInvoice, setEditInvoice] = useState<Invoice | null>(null);

  const [selectedPurchases, setSelectedPurchases] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<
    (PurchaseItem & { purchaseId: string; poNumber: string })[]
  >([]);
  const [editingItems, setEditingItems] = useState<{ [key: number]: boolean }>(
    {}
  );

  const [formData, setFormData] = useState({
    clientId: "",
    dueDate: "",
    notes: "",
    paymentTerms: "30",
  });

  // Filters (mirrors UI)
  const [filters, setFilters] = useState({
    search: "",
    status: "all",
    client: "all",
    dateRange: "30", // days
  });

  // local status spinner for "Send/Mark Paid" buttons
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);

  // ---------- Clients ----------
  const { data: clientsRes } = useListClientsQuery();
  const clients: Client[] = Array.isArray(clientsRes)
    ? clientsRes
    : (clientsRes as any)?.items ?? [];

  // ---------- Purchases (for selected client) ----------
  const { data: purchRes } = useGetPurchasesByClientQuery(
    { clientId: formData.clientId, statuses: ["approved", "completed"] },
    { skip: !formData.clientId }
  );
  const availablePurchases: Purchase[] = useMemo(() => {
    if (Array.isArray(purchRes)) return purchRes;
    if (
      purchRes &&
      typeof purchRes === "object" &&
      "items" in purchRes &&
      Array.isArray((purchRes as any).items)
    ) {
      return (purchRes as { items: Purchase[] }).items;
    }
    return [];
  }, [purchRes]);

  // Lazy fetch purchases by IDs (for PDF/view fallback)
  const [triggerPurchasesByIds] = useLazyGetPurchasesByIdsQuery();

  // ---------- Build query args ----------
  const listArgs = useMemo(() => {
    const args: any = { order: "desc" as const };
    if (filters.status !== "all") args.status = filters.status;
    if (filters.client !== "all") args.clientId = filters.client;
    return args;
  }, [filters]);

  const statsArgs = useMemo(() => {
    const args: any = {};
    if (filters.client !== "all") args.clientId = filters.client;
    if (filters.dateRange !== "all") {
      const days = parseInt(filters.dateRange || "30", 10);
      const to = new Date();
      const from = new Date();
      from.setDate(from.getDate() - days);
      args.dateFrom = from.toISOString();
      args.dateTo = to.toISOString();
    }
    return args;
  }, [filters]);

  // ---------- Invoices list ----------
  const {
    data: invoicesRes,
    isLoading: invoicesLoading,
    isFetching: invoicesFetching,
    refetch: refetchInvoices,
  } = useListInvoicesQuery(listArgs);

  const invoices: Invoice[] = useMemo(
    () => (Array.isArray(invoicesRes) ? invoicesRes : invoicesRes?.items ?? []),
    [invoicesRes]
  );

  const invoicesTotal: number = useMemo(
    () =>
      typeof (invoicesRes as any)?.total === "number"
        ? (invoicesRes as any).total
        : invoices.length,
    [invoicesRes, invoices.length]
  );

  // ---------- KPI stats (server-side; fallback to client calc) ----------
  const { data: statsRes } = useGetInvoiceStatsQuery(statsArgs);
  const serverStats: Partial<KPIStats> | undefined =
    statsRes && (Array.isArray(statsRes) ? undefined : statsRes);

  const localStats: KPIStats = useMemo(() => {
    const totalInvoices = invoices.length;
    const totalRevenue = invoices.reduce(
      (sum, inv) => sum + (inv.total || 0),
      0
    );
    const paid = invoices.filter((i) => i.status === "paid");
    const pending = invoices.filter(
      (i) => i.status === "sent" || i.status === "draft"
    );
    const overdue = invoices.filter((i) => i.status === "overdue");
    return {
      totalInvoices,
      totalRevenue,
      paidInvoices: paid.length,
      paidRevenue: paid.reduce((s, i) => s + (i.total || 0), 0),
      pendingInvoices: pending.length,
      pendingRevenue: pending.reduce((s, i) => s + (i.total || 0), 0),
      overdueInvoices: overdue.length,
      overdueRevenue: overdue.reduce((s, i) => s + (i.total || 0), 0),
    };
  }, [invoices]);

  const kpis: KPIStats = {
    totalInvoices: serverStats?.totalInvoices ?? localStats.totalInvoices,
    totalRevenue: serverStats?.totalRevenue ?? localStats.totalRevenue,
    paidInvoices: serverStats?.paidInvoices ?? localStats.paidInvoices,
    paidRevenue: serverStats?.paidRevenue ?? localStats.paidRevenue,
    pendingInvoices: serverStats?.pendingInvoices ?? localStats.pendingInvoices,
    pendingRevenue: serverStats?.pendingRevenue ?? localStats.pendingRevenue,
    overdueInvoices: serverStats?.overdueInvoices ?? localStats.overdueInvoices,
    overdueRevenue: serverStats?.overdueRevenue ?? localStats.overdueRevenue,
  };

  // ---------- Mutations ----------
  const [createInvoice, { isLoading: creating }] = useCreateInvoiceMutation();
  const [updateInvoice, { isLoading: updating }] = useUpdateInvoiceMutation();
  const [deleteInvoice, { isLoading: deleting }] = useDeleteInvoiceMutation();

  // ---------- Handlers ----------
  const handleClientSelection = useCallback(
    (clientId: string) => {
      if (formData.clientId === clientId) return;
      setFormData((prev) => ({ ...prev, clientId }));
      if (currentView !== "edit") {
        setSelectedPurchases([]);
        setSelectedItems([]);
      }
    },
    [formData.clientId, currentView]
  );

  // toast after purchases load for selected client
  useEffect(() => {
    if (!formData.clientId) return;
    const client = clients.find((c) => c.id === formData.clientId);
    if (availablePurchases && availablePurchases.length >= 0) {
      toast.success(
        `${availablePurchases.length} purchase orders available for ${
          client?.company ?? "client"
        }`
      );
    }
  }, [formData.clientId, availablePurchases, clients]);

// helper to keep updates no-op when nothing changed
const arraysEqual = (a: string[], b: string[]) =>
  a.length === b.length && a.every((v, i) => v === b[i]);

const handlePurchaseOrderSelection = useCallback(
  (purchaseIds: string[]) => {
    // normalize + stable order so comparisons are reliable
    const next = Array.from(new Set(purchaseIds)).sort();

    setSelectedPurchases((prev) => {
      if (arraysEqual(prev, next)) return prev; // no change → no re-render loops

      // Build items only when the selection actually changed
      const byId = new Map<string, Purchase>();
      availablePurchases.forEach((p) => byId.set(p.id, p));

      const allItems: (PurchaseItem & {
        purchaseId: string;
        poNumber: string;
      })[] = [];

      next.forEach((pid) => {
        const p = byId.get(pid);
        if (p) {
          p.items.forEach((it) =>
            allItems.push({ ...it, purchaseId: p.id, poNumber: p.poNumber })
          );
        }
      });

      setSelectedItems(allItems);
      return next;
    });
  },
  [availablePurchases]
);


  const handleRemoveItem = (itemIndex: number) => {
    setSelectedItems((prev) => prev.filter((_, index) => index !== itemIndex));
  };

  const handleUpdateItem = (itemIndex: number, field: string, value: any) => {
    setSelectedItems((prev) =>
      prev.map((item, index) => {
        if (index === itemIndex) {
          const updatedItem: any = { ...item, [field]: value };
          if (field === "quantity" || field === "unitPrice") {
            const qty = parseFloat(String(updatedItem.quantity ?? 0));
            const price = parseFloat(String(updatedItem.unitPrice ?? 0));
            updatedItem.total =
              (isNaN(qty) ? 0 : qty) * (isNaN(price) ? 0 : price);
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const toggleEditItem = (itemIndex: number) => {
    setEditingItems((prev) => ({ ...prev, [itemIndex]: !prev[itemIndex] }));
  };

  const cancelEditItem = (itemIndex: number) => {
    setEditingItems((prev) => ({ ...prev, [itemIndex]: false }));
  };

  const saveEditItem = (itemIndex: number) => {
    setEditingItems((prev) => ({ ...prev, [itemIndex]: false }));
    toast.success("Item updated successfully");
  };

  const calculateInvoiceTotal = () => {
    const subtotal = selectedItems.reduce(
      (sum, item) => sum + (item.total || 0),
      0
    );
    const tax = subtotal * 0.18; // 18% GST
    return { subtotal, tax, total: subtotal + tax };
  };

  const resetForm = () => {
    setFormData({ clientId: "", dueDate: "", notes: "", paymentTerms: "30" });
    setSelectedPurchases([]);
    setSelectedItems([]);
    setEditingItems({});
    setEditInvoice(null);
    setCurrentView("list");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItems.length === 0) {
      toast.error("Please select at least one item to create an invoice");
      return;
    }
    if (
      !formData.clientId ||
      !formData.dueDate ||
      selectedPurchases.length === 0
    ) {
      toast.error(
        "Please fill in all required fields including client, due date, and purchase orders"
      );
      return;
    }

    const { subtotal, tax, total } = calculateInvoiceTotal();
    try {
      const created = await createInvoice({
        clientId: formData.clientId,
        dueDate: new Date(formData.dueDate).toISOString(),
        status: "draft",
        items: selectedItems,
        subtotal,
        tax,
        total,
        notes: formData.notes,
        paymentTerms: formData.paymentTerms,
        purchaseIds: selectedPurchases,
      }).unwrap();

      const createdInvoice: Invoice = (created as any)?.invoice ?? created;
      const poNumbers = selectedPurchases
        .map((id) => availablePurchases.find((p) => p.id === id)?.poNumber)
        .filter(Boolean)
        .join(", ");

      toast.success(
        `Invoice ${
          createdInvoice.invoiceNumber
        } created successfully! Total: ${formatCurrency(
          createdInvoice.total || total,
          DEFAULT_CURRENCY
        )} | PO: ${poNumbers}`,
        { duration: 5000 }
      );
      resetForm();
      refetchInvoices();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to create invoice");
    }
  };

  const updateInvoiceStatus = async (
    invoiceId: string,
    newStatus: Invoice["status"]
  ) => {
    try {
      setStatusUpdatingId(invoiceId);
      await updateInvoice({
        id: invoiceId,
        patch: { status: newStatus },
      }).unwrap();
      const statusMessages: Record<string, string> = {
        sent: "Invoice sent successfully!",
        paid: "Invoice marked as paid!",
        overdue: "Invoice marked as overdue!",
        draft: "Invoice moved to draft!",
      };
      toast.success(statusMessages[newStatus] || "Invoice status updated!");
      refetchInvoices();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to update status");
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleAddNew = () => {
    setEditInvoice(null);
    resetForm();
    setCurrentView("create");
  };

  const handleEditInvoice = (invoice: Invoice) => {
    setEditInvoice(invoice);
    setCurrentView("edit");
    const due =
      invoice.dueDate instanceof Date
        ? invoice.dueDate
        : new Date(invoice.dueDate);
    setFormData({
      clientId: invoice.clientId,
      dueDate: due.toISOString().split("T")[0],
      notes: invoice.notes || "",
      paymentTerms: invoice.paymentTerms || "30",
    });
    setSelectedPurchases(
      invoice.purchaseIds || [invoice.purchaseId].filter(Boolean)
    );
    setSelectedItems(invoice.items || []);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    try {
      const inv = invoices.find((i) => i.id === invoiceId);
      await deleteInvoice(invoiceId).unwrap();
      toast.success(
        `Invoice ${inv?.invoiceNumber ?? invoiceId} deleted successfully!`
      );
      refetchInvoices();
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to delete invoice");
    }
  };

  const downloadInvoicePDF = async (invoice: Invoice) => {
    try {
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF();

      // Resolve client
      const client = clients.find((c) => c.id === invoice.clientId);
      if (!client) {
        toast.error("Client information not found!");
        return;
      }

      // Resolve purchase orders for the invoice
      let purchaseOrders: Purchase[] = [];
      if (invoice.purchaseIds && invoice.purchaseIds.length) {
        // Try to resolve from current cache; fallback to fetch
        const cached: Purchase[] = availablePurchases.filter((p) =>
          invoice.purchaseIds?.includes(p.id)
        );
        if (cached.length === invoice.purchaseIds.length) {
          purchaseOrders = cached;
        } else {
          const fetched = await triggerPurchasesByIds({
            ids: invoice.purchaseIds,
          }).unwrap();
          purchaseOrders = Array.isArray(fetched)
            ? fetched
            : (fetched as any)?.items ?? [];
        }
      } else if (invoice.purchaseId) {
        const fetched = await triggerPurchasesByIds({
          ids: [invoice.purchaseId],
        }).unwrap();
        purchaseOrders = Array.isArray(fetched)
          ? fetched
          : (fetched as any)?.items ?? [];
      }

      const invoiceItems = invoice.items ?? [];

      // PDF Layout (same visuals as original UI)
      pdf.setFont("helvetica");
      let y = 25;

      pdf.setFontSize(24);
      pdf.setTextColor(51, 51, 51);
      pdf.text("INVOICE", 20, y);

      y += 10;
      pdf.setFontSize(14);
      pdf.text(invoice.invoiceNumber, 20, y);

      y += 8;
      pdf.setFontSize(10);
      pdf.text(`STATUS: ${invoice.status.toUpperCase()}`, 20, y);

      // Right: Company info
      pdf.setFontSize(14);
      pdf.setTextColor(0, 102, 204);
      pdf.text("FedHub Software Solutions", 130, 25);

      pdf.setFontSize(9);
      pdf.setTextColor(102, 102, 102);
      pdf.text("P No 69,70 Gokula Nandhana, Gokul Nagar", 130, 33);
      pdf.text("Hosur, Krishnagiri-DT, Tamil Nadu, India-635109", 130, 40);
      pdf.setTextColor(0, 102, 204);
      pdf.text("info@fedhubsoftware.com", 130, 47);
      pdf.setTextColor(102, 102, 102);
      pdf.text("+91 9003285428", 130, 54);

      // Company registration
      pdf.setFontSize(8);
      pdf.text("GST: 33AACCF2123P1Z5", 130, 61);
      pdf.text("PAN: AACCF2123P", 130, 67);
      pdf.text("MSME: UDYAM-TN-06-0012345", 130, 73);

      // Divider
      y = 80;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, y, 190, y);

      // Bill To + Invoice Details (two columns)
      y += 15;

      // Bill To
      pdf.setFontSize(12);
      pdf.setTextColor(0, 102, 204);
      pdf.text("Bill To:", 20, y);

      y += 8;
      pdf.setFontSize(11);
      pdf.setTextColor(51, 51, 51);
      pdf.text(client.company, 20, y);
      y += 6;
      pdf.text(client.contactPerson, 20, y);
      y += 6;
      pdf.text(client.email, 20, y);
      y += 6;
      pdf.text(client.phone, 20, y);
      y += 6;
      pdf.text(client.billingAddress.street, 20, y);
      y += 6;
      pdf.text(
        `${client.billingAddress.city}, ${client.billingAddress.state}`,
        20,
        y
      );
      y += 6;
      pdf.text(
        `${client.billingAddress.postalCode}, ${client.billingAddress.country}`,
        20,
        y
      );
      if (client.gstNumber) {
        y += 6;
        pdf.text(`GST: ${client.gstNumber}`, 20, y);
      }

      // Invoice details - right column
      y = 88;
      pdf.setFontSize(12);
      pdf.setTextColor(34, 197, 94);
      pdf.text("Invoice Details:", 120, y);

      y += 8;
      const createdAt =
        invoice.createdAt instanceof Date
          ? invoice.createdAt
          : new Date(invoice.createdAt);
      const dueDate =
        invoice.dueDate instanceof Date
          ? invoice.dueDate
          : new Date(invoice.dueDate);
      pdf.setFontSize(10);
      pdf.setTextColor(51, 51, 51);
      pdf.text("Invoice Date:", 120, y);
      pdf.text(createdAt.toLocaleDateString(), 160, y);

      y += 6;
      pdf.text("Due Date:", 120, y);
      pdf.setTextColor(220, 38, 127);
      pdf.text(dueDate.toLocaleDateString(), 160, y);

      y += 6;
      pdf.setTextColor(51, 51, 51);
      const poLabel =
        (purchaseOrders?.length ?? 0) > 1
          ? "Purchase Orders:"
          : "Purchase Order:";
      pdf.text(poLabel, 120, y);
      const poNumbers = (purchaseOrders ?? [])
        .map((po) => po?.poNumber)
        .filter(Boolean)
        .join(", ");
      if (poNumbers) pdf.text(poNumbers, 160, y);

      y += 6;
      pdf.text("Payment Terms:", 120, y);
      pdf.text(`${invoice.paymentTerms || "30"} Days`, 160, y);

      if (invoice.notes) {
        y += 6;
        pdf.text("Notes:", 120, y);
        pdf.text(invoice.notes, 160, y);
      }

      // Items
      y += 20;
      pdf.setFontSize(12);
      pdf.setTextColor(147, 51, 234);
      pdf.text("Items & Services:", 20, y);

      y += 10;
      pdf.setFontSize(9);
      pdf.setTextColor(51, 51, 51);
      pdf.setFont("helvetica", "bold");
      pdf.text("Description", 20, y);
      pdf.text("Model", 55, y);
      pdf.text("Supplier", 80, y);
      pdf.text("Qty", 105, y);
      pdf.text("UOM", 120, y);
      pdf.text("Currency", 135, y);
      pdf.text("Unit Price", 155, y);
      pdf.text("Total", 175, y);

      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, y + 2, 190, y + 2);
      y += 8;

      pdf.setFont("helvetica", "normal");
      invoiceItems.forEach((item) => {
        if (y > 240) {
          pdf.addPage();
          y = 30;
        }
        pdf.setFontSize(9);
        pdf.setTextColor(51, 51, 51);
        pdf.text(item.name, 20, y);

        if ((item as any).poNumber) {
          pdf.setFontSize(7);
          pdf.setTextColor(120, 120, 120);
          pdf.text(`PO: ${(item as any).poNumber}`, 20, y + 4);
          pdf.setFontSize(9);
          pdf.setTextColor(51, 51, 51);
        }

        pdf.text(item.model || "", 55, y);
        pdf.text(item.supplier || "N/A", 80, y);
        pdf.text(String(item.quantity ?? 0), 105, y);
        pdf.text(item.uom || "", 120, y);
        pdf.text(item.currency, 135, y);
        pdf.text(formatCurrency(item.unitPrice, item.currency), 155, y);
        pdf.setFont("helvetica", "bold");
        pdf.text(formatCurrency(item.total, item.currency), 175, y);
        pdf.setFont("helvetica", "normal");

        y += (item as any).poNumber ? 10 : 8;
      });

      // Totals
      y += 10;
      const totalsX = 130;
      const totalsWidth = 60;

      pdf.setFillColor(245, 245, 245);
      pdf.rect(totalsX, y, totalsWidth, 35, "F");

      y += 8;
      pdf.setFontSize(10);
      pdf.setTextColor(51, 51, 51);
      pdf.text("Subtotal:", totalsX + 5, y);
      pdf.text(
        formatCurrency(invoice.subtotal || 0, DEFAULT_CURRENCY),
        totalsX + 35,
        y
      );

      y += 6;
      pdf.text("Tax (18% GST):", totalsX + 5, y);
      pdf.text(
        formatCurrency(invoice.tax || 0, DEFAULT_CURRENCY),
        totalsX + 35,
        y
      );

      y += 2;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(totalsX + 5, y, totalsX + 55, y);

      y += 6;
      pdf.setFontSize(12);
      pdf.setFont("helvetica", "bold");
      pdf.text("Total Amount:", totalsX + 5, y);
      pdf.setTextColor(0, 102, 204);
      pdf.text(
        formatCurrency(invoice.total || 0, DEFAULT_CURRENCY),
        totalsX + 35,
        y
      );

      y += 8;
      pdf.setFontSize(7);
      pdf.setTextColor(120, 120, 120);
      pdf.text(
        `* All amounts in ${DEFAULT_CURRENCY} (Base Currency)`,
        totalsX + 5,
        y
      );

      // Footer
      y += 15;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, y, 190, y);
      y += 10;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(51, 51, 51);
      pdf.text("Payment Instructions:", 20, y);
      pdf.text("Terms & Conditions:", 120, y);

      y += 6;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(120, 120, 120);
      pdf.text(
        `Payment is due within ${
          invoice.paymentTerms || "30"
        } days of invoice date.`,
        20,
        y
      );
      pdf.text("Tax Rate: 18% GST as applicable per Indian", 120, y);

      y += 4;
      pdf.text(
        `Please reference invoice number ${invoice.invoiceNumber}`,
        20,
        y
      );
      pdf.text("tax regulations.", 120, y);

      y += 4;
      pdf.text("with your payment.", 20, y);
      pdf.text("Late payments may incur additional charges.", 120, y);

      y += 10;
      pdf.setDrawColor(200, 200, 200);
      pdf.line(20, y, 190, y);
      y += 8;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 102, 204);
      const ty = "Thank you for your business!";
      const w = pdf.getTextWidth(ty);
      pdf.text(ty, (210 - w) / 2, y);

      y += 6;
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(9);
      pdf.setTextColor(120, 120, 120);
      const ctext =
        "FedHub Software Solutions - Your trusted technology partner";
      const w2 = pdf.getTextWidth(ctext);
      pdf.text(ctext, (210 - w2) / 2, y);

      pdf.save(`${invoice.invoiceNumber}.pdf`);
      toast.success(`Invoice ${invoice.invoiceNumber} downloaded successfully!`);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800";
      case "sent":
        return "bg-blue-100 text-blue-800";
      case "overdue":
        return "bg-red-100 text-red-800";
      case "draft":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // ----------------- Render helpers -----------------
  const generateInvoiceContent = (invoice: Invoice) => {
    const client = clients.find((c) => c.id === invoice.clientId);
    if (!client) return null;

    const invoiceItems = invoice.items ?? [];
    const poIds =
      invoice.purchaseIds ?? (invoice.purchaseId ? [invoice.purchaseId] : []);

    return (
      <div className="space-y-8 p-8 bg-white dark:bg-gray-900 text-black dark:text-white border rounded-xl">
        {/* Header */}
        <div className="flex justify-between items-start border-b pb-6">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold gradient-text">INVOICE</h1>
            <p className="text-xl font-mono">{invoice.invoiceNumber}</p>
            <Badge className={getStatusColor(invoice.status)}>
              {invoice.status.toUpperCase()}
            </Badge>
          </div>
          <div className="text-right space-y-1">
            <h2 className="text-xl font-semibold text-blue-600">
              FedHub Software Solutions
            </h2>
            <p className="text-sm">P No 69,70 Gokula Nandhana, Gokul Nagar</p>
            <p className="text-sm">
              Hosur, Krishnagiri-DT, Tamil Nadu, India-635109
            </p>
            <p className="text-sm text-blue-600">info@fedhubsoftware.com</p>
            <p className="text-sm font-medium">+91 9003285428</p>
            <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
              <p className="text-xs text-muted-foreground">
                GST: <span className="font-mono">33AACCF2123P1Z5</span>
              </p>
              <p className="text-xs text-muted-foreground">
                PAN: <span className="font-mono">AACCF2123P</span>
              </p>
              <p className="text-xs text-muted-foreground">
                MSME: <span className="font-mono">UDYAM-TN-06-0012345</span>
              </p>
            </div>
          </div>
        </div>

        {/* Invoice Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-blue-600 flex items-center space-x-2">
              <User className="w-5 h-5" />
              <span>Bill To:</span>
            </h3>
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg space-y-2">
              <p className="font-semibold text-lg">{client.company}</p>
              <p className="font-medium">{client.contactPerson}</p>
              <p className="text-sm">{client.email}</p>
              <p className="text-sm">{client.phone}</p>
              <div className="text-sm">
                <p>{client.billingAddress.street}</p>
                <p>
                  {client.billingAddress.city}, {client.billingAddress.state}
                </p>
                <p>
                  {client.billingAddress.postalCode},{" "}
                  {client.billingAddress.country}
                </p>
              </div>
              {client.gstNumber && (
                <p className="text-sm font-medium">GST: {client.gstNumber}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-lg text-green-600 flex items-center space-x-2">
              <CalendarDays className="w-5 h-5" />
              <span>Invoice Details:</span>
            </h3>
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg space-y-3">
              <div className="flex justify-between">
                <span className="font-medium">Invoice Date:</span>
                <span>
                  {(invoice.createdAt instanceof Date
                    ? invoice.createdAt
                    : new Date(invoice.createdAt)
                  ).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Due Date:</span>
                <span className="font-medium text-red-600">
                  {(invoice.dueDate instanceof Date
                    ? invoice.dueDate
                    : new Date(invoice.dueDate)
                  ).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">
                  Purchase Order{poIds.length > 1 ? "s" : ""}:
                </span>
                <div className="flex flex-wrap gap-1">
                  {poIds.map((id) => (
                    <Badge
                      key={id}
                      variant="outline"
                      className="font-mono text-xs"
                    >
                      {id}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex justify-between">
                <span className="font-medium">Payment Terms:</span>
                <span>{invoice.paymentTerms || "30"} Days</span>
              </div>
              {invoice.notes && (
                <div className="flex justify-between">
                  <span className="font-medium">Notes:</span>
                  <span className="text-sm">{invoice.notes}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg text-purple-600 flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>Items & Services:</span>
          </h3>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                  <TableHead className="font-semibold">Description</TableHead>
                  <TableHead className="font-semibold">Model</TableHead>
                  <TableHead className="font-semibold">Supplier</TableHead>
                  <TableHead className="font-semibold text-center">Qty</TableHead>
                  <TableHead className="font-semibold text-center">UOM</TableHead>
                  <TableHead className="font-semibold text-center">
                    Currency
                  </TableHead>
                  <TableHead className="font-semibold text-right">
                    Unit Price
                  </TableHead>
                  <TableHead className="font-semibold text-right">
                    Total
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoiceItems.map((item, index) => (
                  <TableRow
                    key={`${item.id ?? index}-${index}`}
                    className="hover:bg-muted/50"
                  >
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.name}</p>
                        {(item as any).poNumber && (
                          <p className="text-xs text-muted-foreground">
                            PO: {(item as any).poNumber}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">{item.model}</TableCell>
                    <TableCell className="font-medium">
                      <span className="text-blue-600 dark:text-blue-400">
                        {item.supplier || "Not specified"}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-center">{item.uom}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {item.currency}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(item.unitPrice, item.currency)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.total, item.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="W-80 space-y-3 bg-gray-50 dark:bg-gray-800 p-6 rounded-lg">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span className="font-medium">
                {formatCurrency(invoice.subtotal || 0, DEFAULT_CURRENCY)}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Tax (18% GST):</span>
              <span className="font-medium">
                {formatCurrency(invoice.tax || 0, DEFAULT_CURRENCY)}
              </span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total Amount:</span>
              <span className="text-blue-600">
                {formatCurrency(invoice.total || 0, DEFAULT_CURRENCY)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              * All amounts in {DEFAULT_CURRENCY} (Base Currency)
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t pt-6 space-y-3 text-sm text-muted-foreground">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-black dark:text-white mb-2">
                Payment Instructions:
              </h4>
              <p>
                Payment is due within {invoice.paymentTerms || "30"} days of
                invoice date.
              </p>
              <p>
                Please reference invoice number {invoice.invoiceNumber} with
                your payment.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-black dark:text-white mb-2">
                Terms & Conditions:
              </h4>
              <p>Tax Rate: 18% GST as applicable per Indian tax regulations.</p>
              <p>Late payments may incur additional charges.</p>
            </div>
          </div>
          <div className="text-center pt-4 border-t">
            <p className="font-medium text-blue-600">
              Thank you for your business!
            </p>
            <p>FedHub Software Solutions - Your trusted technology partner</p>
          </div>
        </div>
      </div>
    );
  };

  const breadcrumbItems = [{ label: "Home", onClick: () => {} }];

  // ----------------- Views -----------------
  // LIST VIEW
  if (currentView === "list") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <Breadcrumb items={breadcrumbItems} currentPage="Invoice Management" />

        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <h1 className="text-2xl font-medium tracking-tight">
              Invoice Management
            </h1>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
            <Button
              onClick={() => setCurrentView("create")}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          </motion.div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-blue-600 dark:text-blue-400">
                      Total Invoices
                    </p>
                    <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                      {kpis.totalInvoices}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Revenue:{" "}
                      {formatCurrency(kpis.totalRevenue, DEFAULT_CURRENCY)}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-600 rounded-full">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-green-600 dark:text-green-400">
                      Paid Invoices
                    </p>
                    <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                      {kpis.paidInvoices}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Revenue:{" "}
                      {formatCurrency(kpis.paidRevenue, DEFAULT_CURRENCY)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-600 rounded-full">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400">
                      Pending Invoices
                    </p>
                    <p className="text-3xl font-bold text-yellow-900 dark:text-yellow-100">
                      {kpis.pendingInvoices}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Revenue:{" "}
                      {formatCurrency(kpis.pendingRevenue, DEFAULT_CURRENCY)}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-600 rounded-full">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 hover:shadow-xl transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-red-600 dark:text-red-400">
                      Overdue Invoices
                    </p>
                    <p className="text-3xl font-bold text-red-900 dark:text-red-100">
                      {kpis.overdueInvoices}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Revenue:{" "}
                      {formatCurrency(kpis.overdueRevenue, DEFAULT_CURRENCY)}
                    </p>
                  </div>
                  <div className="p-3 bg-red-600 rounded-full">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters Section */}
        <Card className="border-0 shadow-lg bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
          <CardContent className="p-6">
            <div className="flex items-center space-x-2 mb-6">
              <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-blue-500/20">
                <Filter className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-medium text-lg">Search & Filter</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by invoice # or client..."
                  value={filters.search}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, search: e.target.value }))
                  }
                  className="bg-white/70 dark:bg-gray-800/70"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value: any) =>
                    setFilters((prev) => ({ ...prev, status: value }))
                  }
                >
                  <SelectTrigger className="bg-white/70 dark:bg-gray-800/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="client">Client</Label>
                <Select
                  value={filters.client}
                  onValueChange={(value: any) =>
                    setFilters((prev) => ({ ...prev, client: value }))
                  }
                >
                  <SelectTrigger className="bg-white/70 dark:bg-gray-800/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Clients</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateRange">Date Range</Label>
                <Select
                  value={filters.dateRange}
                  onValueChange={(value: any) =>
                    setFilters((prev) => ({ ...prev, dateRange: value }))
                  }
                >
                  <SelectTrigger className="bg-white/70 dark:bg-gray-800/70">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                    <SelectItem value="365">Last year</SelectItem>
                    <SelectItem value="all">All time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center space-x-2">
              <Receipt className="w-5 h-5 text-blue-600" />
              <span>Invoices</span>
              <Badge variant="outline" className="ml-2">
                {invoices.length} of {invoicesTotal}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {invoices.length === 0
                    ? invoicesFetching
                      ? "Loading purchases…"
                      : "No invoice yet"
                    : "No invoice match your filters"}
                </h3>
                <p className="text-gray-500 mb-4">
                  {invoices.length === 0
                    ? "Get started by creating your first invoice."
                    : "Try adjusting your search or filter criteria"}
                </p>
                {invoices.length === 0 && !invoicesFetching && (
                  <Button onClick={handleAddNew}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Invoice
                  </Button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                      <TableHead className="font-semibold">Invoice #</TableHead>
                      <TableHead className="font-semibold">Client</TableHead>
                      <TableHead className="font-semibold text-right">
                        Amount
                      </TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Created</TableHead>
                      <TableHead className="font-semibold">Due Date</TableHead>
                      <TableHead className="font-semibold text-center">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {invoices.map((invoice) => {
                        const client = clients.find(
                          (c) => c.id === invoice.clientId
                        );
                        const createdAt =
                          invoice.createdAt instanceof Date
                            ? invoice.createdAt
                            : new Date(invoice.createdAt);
                        const dueAt =
                          invoice.dueDate instanceof Date
                            ? invoice.dueDate
                            : new Date(invoice.dueDate);
                        return (
                          <motion.tr
                            key={invoice.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="hover:bg-muted/50 transition-colors"
                          >
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="font-mono text-xs"
                              >
                                {invoice.invoiceNumber}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">
                                  {client?.company || "Unknown"}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {client?.contactPerson}
                                </div>
                                {invoice.purchaseIds &&
                                  invoice.purchaseIds.length > 1 && (
                                    <div className="text-xs text-blue-600 mt-1">
                                      {invoice.purchaseIds.length} Purchase
                                      Orders
                                    </div>
                                  )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(
                                invoice.total || 0,
                                DEFAULT_CURRENCY
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(invoice.status)}>
                                {invoice.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {createdAt.toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-sm">
                              {dueAt.toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setViewInvoice(invoice);
                                    setCurrentView("view");
                                  }}
                                  className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                  title="View Invoice"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditInvoice(invoice)}
                                  className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 hover:text-green-700"
                                  title="Edit Invoice"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => downloadInvoicePDF(invoice)}
                                  className="h-8 w-8 p-0 text-purple-600 hover:bg-purple-50 hover:text-purple-700"
                                  title="Download PDF"
                                >
                                  <Download className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteInvoice(invoice.id)
                                  }
                                  className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                  title="Delete Invoice"
                                  disabled={deleting}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                                {invoice.status === "draft" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      updateInvoiceStatus(invoice.id, "sent")
                                    }
                                    className="h-8 w-8 p-0 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700"
                                    title="Send Invoice"
                                    disabled={statusUpdatingId === invoice.id}
                                  >
                                    <Send className="w-4 h-4" />
                                  </Button>
                                )}
                                {invoice.status === "sent" && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      updateInvoiceStatus(invoice.id, "paid")
                                    }
                                    className="h-7 text-xs px-2 text-green-600 border-green-200 hover:bg-green-50"
                                    title="Mark as Paid"
                                    disabled={statusUpdatingId === invoice.id}
                                  >
                                    Mark Paid
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </motion.tr>
                        );
                      })}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // CREATE VIEW
  if (currentView === "create") {
    const { subtotal, tax, total } = calculateInvoiceTotal();
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <Breadcrumb items={breadcrumbItems} currentPage="Create Invoice" />

        <Card className="border-0 shadow-xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span>Create New Invoice</span>
              </CardTitle>
              <Button variant="outline" onClick={resetForm}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to List
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <form onSubmit={handleSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500/20 to-cyan-500/20">
                    <User className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-medium">Basic Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-xl bg-gradient-to-br from-blue-50/50 to-cyan-50/50 dark:from-blue-900/10 dark:to-cyan-900/10 border-blue-200 dark:border-blue-800">
                  <div className="space-y-2">
                    <Label
                      htmlFor="client"
                      className="flex items-center space-x-1"
                    >
                      <span>Client</span>
                      <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.clientId}
                      onValueChange={handleClientSelection}
                    >
                      <SelectTrigger className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-700 focus:border-blue-500">
                        <SelectValue placeholder="Select client to filter purchase orders" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {client.company}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {client.contactPerson}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.clientId && (
                      <p className="text-xs text-muted-foreground">
                        ✓ Purchase orders filtered for selected client
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="dueDate"
                      className="flex items-center space-x-1"
                    >
                      <span>Due Date</span>
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) =>
                        setFormData({ ...formData, dueDate: e.target.value })
                      }
                      min={new Date().toISOString().split("T")[0]}
                      className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-700 focus:border-blue-500"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">Payment Terms (Days)</Label>
                    <Select
                      value={formData.paymentTerms}
                      onValueChange={(value: any) =>
                        setFormData({ ...formData, paymentTerms: value })
                      }
                    >
                      <SelectTrigger className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-700 focus:border-blue-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 Days</SelectItem>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="45">45 Days</SelectItem>
                        <SelectItem value="60">60 Days</SelectItem>
                        <SelectItem value="90">90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="purchaseOrders"
                      className="flex items-center space-x-1"
                    >
                      <span>Purchase Orders</span>
                      <span className="text-red-500">*</span>
                    </Label>
                    {!formData.clientId ? (
                      <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
                        <Package className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Select a client first to view available purchase
                          orders
                        </p>
                      </div>
                    ) : availablePurchases.length === 0 ? (
                      <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
                        <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No approved/completed purchase orders available for
                          this client
                        </p>
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto border rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        {availablePurchases.map((purchase) => {
  const isSelected = selectedPurchases.includes(purchase.id);
  return (
    <div
      key={purchase.id}
      className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all duration-200 ${
        isSelected
          ? "border-purple-300 bg-purple-50 dark:bg-purple-900/20"
          : "border-gray-200 dark:border-gray-700 hover:border-purple-200 hover:bg-purple-25"
      }`}
    >
      <Checkbox
        checked={isSelected}
        // drive selection *only* from the checkbox
        onCheckedChange={(checked: boolean) => {
          const newSelection = checked
            ? [...selectedPurchases, purchase.id]
            : selectedPurchases.filter((id) => id !== purchase.id);
          handlePurchaseOrderSelection(newSelection);
        }}
      />
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="font-mono text-xs">
            {purchase.poNumber}
          </Badge>
        </div>
      </div>
    </div>
  );
})}

                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes for the invoice..."
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      className="bg-white/70 dark:bg-gray-800/70 border-blue-200 dark:border-blue-700 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Selected Items */}
              {selectedItems.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20">
                        <Package className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-medium">
                          Invoice Items ({selectedItems.length})
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          From {selectedPurchases.length} purchase order
                          {selectedPurchases.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-green-600">
                        {formatCurrency(
                          calculateInvoiceTotal().total,
                          DEFAULT_CURRENCY
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total Amount
                      </p>
                    </div>
                  </div>

                  <div className="border rounded-xl bg-white dark:bg-gray-800 overflow-hidden">
                    <div className="max-h-80 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700">
                            <TableHead className="font-semibold">PO#</TableHead>
                            <TableHead className="font-semibold">
                              Item Name
                            </TableHead>
                            <TableHead className="font-semibold">
                              Model
                            </TableHead>
                            <TableHead className="font-semibold">
                              Supplier
                            </TableHead>
                            <TableHead className="font-semibold text-center">
                              Quantity
                            </TableHead>
                            <TableHead className="font-semibold text-center">
                              UOM
                            </TableHead>
                            <TableHead className="font-semibold text-center">
                              Currency
                            </TableHead>
                            <TableHead className="font-semibold text-right">
                              Unit Price
                            </TableHead>
                            <TableHead className="font-semibold text-right">
                              Total
                            </TableHead>
                            <TableHead className="font-semibold text-center">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedItems.map((item, index) => {
                            const isEditing = editingItems[index];
                            return (
                              <TableRow
                                key={`${item.purchaseId}-${item.id}-${index}`}
                              >
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-xs"
                                  >
                                    {(item as any).poNumber}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-medium">
                                  {isEditing ? (
                                    <Input
                                      value={item.name}
                                      onChange={(e) =>
                                        handleUpdateItem(
                                          index,
                                          "name",
                                          e.target.value
                                        )
                                      }
                                      className="h-8 text-sm"
                                    />
                                  ) : (
                                    item.name
                                  )}
                                </TableCell>
                                <TableCell>
                                  {isEditing ? (
                                    <Input
                                      value={item.model || ""}
                                      onChange={(e) =>
                                        handleUpdateItem(
                                          index,
                                          "model",
                                          e.target.value
                                        )
                                      }
                                      className="h-8 text-sm"
                                    />
                                  ) : (
                                    item.model
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {isEditing ? (
                                    <Input
                                      value={item.supplier || ""}
                                      onChange={(e) =>
                                        handleUpdateItem(
                                          index,
                                          "supplier",
                                          e.target.value
                                        )
                                      }
                                      className="h-8 text-sm"
                                      placeholder="Enter supplier"
                                    />
                                  ) : (
                                    <span className="text-blue-600 dark:text-blue-400">
                                      {item.supplier || "Not specified"}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) =>
                                        handleUpdateItem(
                                          index,
                                          "quantity",
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="h-8 text-sm w-20 text-center"
                                      min="0"
                                      step="1"
                                    />
                                  ) : (
                                    item.quantity
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {isEditing ? (
                                    <Select
                                      value={item.uom}
                                      onValueChange={(value: any) =>
                                        handleUpdateItem(index, "uom", value)
                                      }
                                    >
                                      <SelectTrigger className="h-8 text-sm w-20">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pcs">PCS</SelectItem>
                                        <SelectItem value="units">
                                          Units
                                        </SelectItem>
                                        <SelectItem value="sets">
                                          Sets
                                        </SelectItem>
                                        <SelectItem value="boxes">
                                          Boxes
                                        </SelectItem>
                                        <SelectItem value="kg">KG</SelectItem>
                                        <SelectItem value="liters">
                                          Liters
                                        </SelectItem>
                                        <SelectItem value="meters">
                                          Meters
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    item.uom
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {isEditing ? (
                                    <Select
                                      value={item.currency}
                                      onValueChange={(value: any) =>
                                        handleUpdateItem(
                                          index,
                                          "currency",
                                          value
                                        )
                                      }
                                    >
                                      <SelectTrigger className="h-8 text-sm w-20">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="INR">INR</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                        <SelectItem value="GBP">GBP</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {item.currency}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      value={item.unitPrice}
                                      onChange={(e) =>
                                        handleUpdateItem(
                                          index,
                                          "unitPrice",
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="h-8 text-sm w-24 text-right"
                                      min="0"
                                      step="0.01"
                                    />
                                  ) : (
                                    formatCurrency(
                                      item.unitPrice,
                                      item.currency
                                    )
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(item.total, item.currency)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    {isEditing ? (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => saveEditItem(index)}
                                          className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 hover:text-green-700"
                                        >
                                          <Check className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => cancelEditItem(index)}
                                          className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-50 hover:text-gray-700"
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleEditItem(index)}
                                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveItem(index)}
                                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Invoice Summary */}
                    <div className="border-t bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-6">
                      <div className="flex justify-end">
                        <div className="w-80 space-y-3">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span className="font-medium">
                              {formatCurrency(subtotal, DEFAULT_CURRENCY)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Tax (18% GST):</span>
                            <span className="font-medium">
                              {formatCurrency(tax, DEFAULT_CURRENCY)}
                            </span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-semibold">
                            <span>Total:</span>
                            <span className="text-lg">
                              {formatCurrency(total, DEFAULT_CURRENCY)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground text-right">
                            * All amounts converted to INR base currency
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-6 border-t">
                <Button type="button" variant="outline" onClick={resetForm}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    creating ||
                    selectedItems.length === 0 ||
                    !formData.clientId ||
                    !formData.dueDate ||
                    selectedPurchases.length === 0
                  }
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  // VIEW MODE
  if (currentView === "view" && viewInvoice) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <Breadcrumb items={breadcrumbItems} currentPage="Invoice Details" />

        <Card className="border-0 shadow-xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                <span>Invoice Details</span>
                <Badge className={getStatusColor(viewInvoice.status)}>
                  {viewInvoice.status}
                </Badge>
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  onClick={() => downloadInvoicePDF(viewInvoice)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white border-0"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button variant="outline" onClick={() => setCurrentView("list")}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to List
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>{generateInvoiceContent(viewInvoice)}</CardContent>
        </Card>
      </motion.div>
    );
  }

  // EDIT MODE
  if (currentView === "edit" && editInvoice) {
    const { subtotal, tax, total } = calculateInvoiceTotal();

    const handleEditSubmit = async (e: React.FormEvent) => {
      e.preventDefault();

      if (selectedItems.length === 0) {
        toast.error("Please select at least one item to update the invoice");
        return;
      }
      if (
        !formData.clientId ||
        !formData.dueDate ||
        selectedPurchases.length === 0
      ) {
        toast.error(
          "Please fill in all required fields including client, due date, and purchase orders"
        );
        return;
      }

      const { subtotal, tax, total } = calculateInvoiceTotal();
      try {
        await updateInvoice({
          id: editInvoice.id,
          patch: {
            purchaseIds: selectedPurchases,
            purchaseId: selectedPurchases[0],
            clientId: formData.clientId,
            dueDate: new Date(formData.dueDate).toISOString(),
            items: selectedItems,
            subtotal,
            tax,
            total,
            notes: formData.notes,
            paymentTerms: formData.paymentTerms,
          },
        }).unwrap();

        const poNumbers = selectedPurchases
          .map((id) => availablePurchases.find((p) => p.id === id)?.poNumber)
          .filter(Boolean)
          .join(", ");

        toast.success(
          `Invoice ${
            editInvoice.invoiceNumber
          } updated successfully! Total: ${formatCurrency(
            total,
            DEFAULT_CURRENCY
          )} | PO: ${poNumbers}`,
          { duration: 5000 }
        );

        resetForm();
        refetchInvoices();
      } catch (err: any) {
        toast.error(err?.message ?? "Failed to update invoice");
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <Breadcrumb items={breadcrumbItems} currentPage="Edit Invoice" />

        <Card className="border-0 shadow-xl bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center space-x-2">
                <Edit3 className="w-5 h-5 text-green-600" />
                <span>Edit Invoice</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {editInvoice.invoiceNumber}
                </Badge>
              </CardTitle>
              <Button variant="outline" onClick={resetForm}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to List
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <form onSubmit={handleEditSubmit} className="space-y-8">
              {/* Basic Information */}
              <div className="space-y-6">
                <div className="flex items-center space-x-2">
                  <div className="p-2 rounded-lg bg-gradient-to-r from-green-500/20 to-emerald-500/20">
                    <User className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="text-lg font-medium">Basic Information</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border rounded-xl bg-gradient-to-br from-green-50/50 to-emerald-50/50 dark:from-green-900/10 dark:to-emerald-900/10 border-green-200 dark:border-green-800">
                  <div className="space-y-2">
                    <Label
                      htmlFor="client"
                      className="flex items-center space-x-1"
                    >
                      <span>Client</span>
                      <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.clientId}
                      onValueChange={handleClientSelection}
                    >
                      <SelectTrigger className="bg-white/70 dark:bg-gray-800/70 border-green-200 dark:border-green-700 focus:border-green-500">
                        <SelectValue placeholder="Select client to filter purchase orders" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map((client) => (
                          <SelectItem key={client.id} value={client.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {client.company}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                {client.contactPerson}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="dueDate"
                      className="flex items-center space-x-1"
                    >
                      <span>Due Date</span>
                      <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          dueDate: e.target.value,
                        }))
                      }
                      className="bg-white/70 dark:bg-gray-800/70 border-green-200 dark:border-green-700 focus:border-green-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentTerms">Payment Terms (Days)</Label>
                    <Select
                      value={formData.paymentTerms}
                      onValueChange={(value: any) =>
                        setFormData((prev) => ({
                          ...prev,
                          paymentTerms: value,
                        }))
                      }
                    >
                      <SelectTrigger className="bg-white/70 dark:bg-gray-800/70 border-green-200 dark:border-green-700 focus:border-green-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 Days</SelectItem>
                        <SelectItem value="30">30 Days</SelectItem>
                        <SelectItem value="45">45 Days</SelectItem>
                        <SelectItem value="60">60 Days</SelectItem>
                        <SelectItem value="90">90 Days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any additional notes or terms..."
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      className="bg-white/70 dark:bg-gray-800/70 border-green-200 dark:border-green-700 focus:border-green-500 min-h-[80px]"
                    />
                  </div>
                </div>
              </div>

              {/* Purchase Orders Selection */}
              {formData.clientId && availablePurchases.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center space-x-2">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-purple-500/20 to-indigo-500/20">
                      <Package className="w-5 h-5 text-purple-600" />
                    </div>
                    <h3 className="text-lg font-medium">
                      Select Purchase Orders
                    </h3>
                    <Badge
                      variant="outline"
                      className="bg-purple-50 text-purple-700 border-purple-200"
                    >
                      {availablePurchases.length} Available
                    </Badge>
                  </div>

                  <div className="p-6 border rounded-xl bg-gradient-to-br from-purple-50/50 to-indigo-50/50 dark:from-purple-900/10 dark:to-indigo-900/10 border-purple-200 dark:border-purple-800">
                    <div className="space-y-4 max-h-60 overflow-y-auto">
                      {availablePurchases.map((purchase) => {
                        const isSelected = selectedPurchases.includes(
                          purchase.id
                        );
                        return (
                          <div
                            key={purchase.id}
                            className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? "border-purple-300 bg-purple-50 dark:bg-purple-900/20"
                                : "border-gray-200 dark:border-gray-700 hover:border-purple-200 hover:bg-purple-25"
                            }`}
                            onClick={() => {
                              const newSelection = isSelected
                                ? selectedPurchases.filter(
                                    (id) => id !== purchase.id
                                  )
                                : [...selectedPurchases, purchase.id];
                              handlePurchaseOrderSelection(newSelection);
                            }}
                          >
                            <Checkbox
                              checked={isSelected}
                              onChange={() => {}}
                              className="pointer-events-none"
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2">
                                <Badge
                                  variant="outline"
                                  className="font-mono text-xs"
                                >
                                  {purchase.poNumber}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Selected Items */}
              {selectedItems.length > 0 && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 rounded-lg bg-gradient-to-r from-orange-500/20 to-red-500/20">
                        <Receipt className="w-5 h-5 text-orange-600" />
                      </div>
                      <h3 className="text-lg font-medium">Invoice Items</h3>
                      <Badge
                        variant="outline"
                        className="bg-orange-50 text-orange-700 border-orange-200"
                      >
                        {selectedItems.length} Items
                      </Badge>
                    </div>
                  </div>

                  <div className="border rounded-xl overflow-hidden bg-white dark:bg-gray-900">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
                            <TableHead className="font-semibold">
                              Description
                            </TableHead>
                            <TableHead className="font-semibold">Model</TableHead>
                            <TableHead className="font-semibold">
                              Supplier
                            </TableHead>
                            <TableHead className="font-semibold text-center">
                              Qty
                            </TableHead>
                            <TableHead className="font-semibold text-center">
                              UOM
                            </TableHead>
                            <TableHead className="font-semibold text-center">
                              Currency
                            </TableHead>
                            <TableHead className="font-semibold text-right">
                              Unit Price
                            </TableHead>
                            <TableHead className="font-semibold text-right">
                              Total
                            </TableHead>
                            <TableHead className="font-semibold text-center">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedItems.map((item, index) => {
                            const isEditing = editingItems[index];
                            return (
                              <TableRow
                                key={`${item.id ?? index}-${index}`}
                                className="hover:bg-muted/50"
                              >
                                <TableCell>
                                  {isEditing ? (
                                    <Input
                                      value={item.name}
                                      onChange={(e) =>
                                        handleUpdateItem(
                                          index,
                                          "name",
                                          e.target.value
                                        )
                                      }
                                      className="h-8 text-sm"
                                      placeholder="Enter description"
                                    />
                                  ) : (
                                    <div>
                                      <p className="font-medium">{item.name}</p>
                                      {(item as any).poNumber && (
                                        <p className="text-xs text-muted-foreground">
                                          PO: {(item as any).poNumber}
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {isEditing ? (
                                    <Input
                                      value={item.model || ""}
                                      onChange={(e) =>
                                        handleUpdateItem(
                                          index,
                                          "model",
                                          e.target.value
                                        )
                                      }
                                      className="h-8 text-sm"
                                      placeholder="Enter model"
                                    />
                                  ) : (
                                    item.model
                                  )}
                                </TableCell>
                                <TableCell className="font-medium">
                                  {isEditing ? (
                                    <Input
                                      value={item.supplier || ""}
                                      onChange={(e) =>
                                        handleUpdateItem(
                                          index,
                                          "supplier",
                                          e.target.value
                                        )
                                      }
                                      className="h-8 text-sm"
                                      placeholder="Enter supplier"
                                    />
                                  ) : (
                                    <span className="text-blue-600 dark:text-blue-400">
                                      {item.supplier || "Not specified"}
                                    </span>
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      value={item.quantity}
                                      onChange={(e) =>
                                        handleUpdateItem(
                                          index,
                                          "quantity",
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="h-8 text-sm w-20 text-center"
                                      min="0"
                                      step="1"
                                    />
                                  ) : (
                                    item.quantity
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {isEditing ? (
                                    <Select
                                      value={item.uom}
                                      onValueChange={(value: any) =>
                                        handleUpdateItem(index, "uom", value)
                                      }
                                    >
                                      <SelectTrigger className="h-8 text-sm w-20">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="pcs">PCS</SelectItem>
                                        <SelectItem value="units">
                                          Units
                                        </SelectItem>
                                        <SelectItem value="sets">
                                          Sets
                                        </SelectItem>
                                        <SelectItem value="boxes">
                                          Boxes
                                        </SelectItem>
                                        <SelectItem value="kg">KG</SelectItem>
                                        <SelectItem value="liters">
                                          Liters
                                        </SelectItem>
                                        <SelectItem value="meters">
                                          Meters
                                        </SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    item.uom
                                  )}
                                </TableCell>
                                <TableCell className="text-center">
                                  {isEditing ? (
                                    <Select
                                      value={item.currency}
                                      onValueChange={(value: any) =>
                                        handleUpdateItem(
                                          index,
                                          "currency",
                                          value
                                        )
                                      }
                                    >
                                      <SelectTrigger className="h-8 text-sm w-20">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="INR">INR</SelectItem>
                                        <SelectItem value="USD">USD</SelectItem>
                                        <SelectItem value="EUR">EUR</SelectItem>
                                        <SelectItem value="GBP">GBP</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <Badge
                                      variant="outline"
                                      className="text-xs"
                                    >
                                      {item.currency}
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  {isEditing ? (
                                    <Input
                                      type="number"
                                      value={item.unitPrice}
                                      onChange={(e) =>
                                        handleUpdateItem(
                                          index,
                                          "unitPrice",
                                          parseFloat(e.target.value) || 0
                                        )
                                      }
                                      className="h-8 text-sm w-24 text-right"
                                      min="0"
                                      step="0.01"
                                    />
                                  ) : (
                                    formatCurrency(
                                      item.unitPrice,
                                      item.currency
                                    )
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-medium">
                                  {formatCurrency(item.total, item.currency)}
                                </TableCell>
                                <TableCell className="text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    {isEditing ? (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => saveEditItem(index)}
                                          className="h-8 w-8 p-0 text-green-600 hover:bg-green-50 hover:text-green-700"
                                        >
                                          <Check className="w-4 h-4" />
                                        </Button>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => cancelEditItem(index)}
                                          className="h-8 w-8 p-0 text-gray-600 hover:bg-gray-50 hover:text-gray-700"
                                        >
                                          <X className="w-4 h-4" />
                                        </Button>
                                      </>
                                    ) : (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => toggleEditItem(index)}
                                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                      >
                                        <Edit3 className="w-4 h-4" />
                                      </Button>
                                    )}
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveItem(index)}
                                      className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Invoice Summary */}
                    <div className="border-t bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 p-6">
                      <div className="flex justify-end">
                        <div className="w-80 space-y-3">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span className="font-medium">
                              {formatCurrency(subtotal, DEFAULT_CURRENCY)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Tax (18% GST):</span>
                            <span className="font-medium">
                              {formatCurrency(tax, DEFAULT_CURRENCY)}
                            </span>
                          </div>
                          <Separator />
                          <div className="flex justify-between font-semibold">
                            <span>Total:</span>
                            <span className="text-lg">
                              {formatCurrency(total, DEFAULT_CURRENCY)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground text-right">
                            * All amounts converted to INR base currency
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-6 border-t">
                <Button type="button" variant="outline" onClick={resetForm}>
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    updating ||
                    selectedItems.length === 0 ||
                    !formData.clientId ||
                    !formData.dueDate ||
                    selectedPurchases.length === 0
                  }
                  className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Update Invoice
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return null;
}
