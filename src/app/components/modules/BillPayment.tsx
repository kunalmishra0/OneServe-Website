import React, { useState, useEffect, useRef } from "react";
import {
  Zap,
  Droplets,
  Building,
  Flame,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Printer,
  ShieldCheck,
  CreditCard,
  Loader2,
  X,
  FileCheck2
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { sendBillPaymentReceipt } from "@/lib/notifications";

export interface BillItemDetail {
  id: string;
  description: string;
  amount: number;
}

export interface CivicBill {
  id: string;
  bill_number: string;
  utility_type: "electricity" | "water" | "property_tax" | "gas";
  title: string;
  provider_name: string;
  consumer_number: string;
  sub_division: string;
  billing_period: string;
  bill_date: string;
  due_date: string;
  units_consumed?: number;
  amount_due: number;
  amount_paid: number;
  status: "unpaid" | "partially_paid" | "paid" | "overdue";
  items?: BillItemDetail[];
}

export function BillPayment() {
  const { user } = useAuth();
  const [bills, setBills] = useState<CivicBill[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "unpaid" | "paid">("all");
  const [selectedBill, setSelectedBill] = useState<CivicBill | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<{
    bill: CivicBill;
    paymentId: string;
    paidAt: string;
  } | null>(null);

  const receiptPrintRef = useRef<HTMLDivElement>(null);

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setPaymentReceipt(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    fetchBills();
  }, [user]);

  const fetchBills = async () => {
    setLoading(true);
    try {
      const { data: billsData, error: billsError } = await supabase
        .from("bills")
        .select(`
          *,
          items:bill_items(*)
        `)
        .order("due_date", { ascending: true });

      if (billsError || !billsData || billsData.length === 0) {
        const fallbackBills: CivicBill[] = [
          {
            id: "b1",
            bill_number: "ELEC-2026-0418",
            utility_type: "electricity",
            title: "Electricity Bill",
            provider_name: "DHBVN Power Distribution",
            consumer_number: "1575540000",
            sub_division: "Urban Division Sub-Station",
            billing_period: "01 Mar 2026 - 31 Mar 2026",
            bill_date: "02 Apr 2026",
            due_date: "20 Apr 2026",
            units_consumed: 248,
            amount_due: 1840,
            amount_paid: 0,
            status: "unpaid",
            items: [
              { id: "i1", description: "Energy Charges (248 kWh @ ₹6.50/unit)", amount: 1612 },
              { id: "i2", description: "Fuel Surcharge Adjustment (FSA)", amount: 92 },
              { id: "i3", description: "Electricity Duty & Municipal Tax", amount: 86.4 },
              { id: "i4", description: "Fixed Meter Rent", amount: 49.6 },
            ],
          },
          {
            id: "b2",
            bill_number: "TAX-2026-8812",
            utility_type: "property_tax",
            title: "Property Tax",
            provider_name: "Municipal Revenue Department",
            consumer_number: "PID-SEC15-849201",
            sub_division: "Assessment Zone 2",
            billing_period: "FY 2026-27 (Annual)",
            bill_date: "01 Apr 2026",
            due_date: "15 May 2026",
            amount_due: 3250,
            amount_paid: 0,
            status: "unpaid",
            items: [
              { id: "i5", description: "Residential Property Assessment (250 sq yd)", amount: 2500 },
              { id: "i6", description: "Civic Sanitation Cess", amount: 250 },
              { id: "i7", description: "Fire Fighting Infrastructure Cess", amount: 125 },
              { id: "i8", description: "Urban Infrastructure Fund", amount: 375 },
            ],
          },
          {
            id: "b3",
            bill_number: "WTR-2026-0391",
            utility_type: "water",
            title: "Water & Sewerage",
            provider_name: "Municipal Water Works Board",
            consumer_number: "WTR-12004812",
            sub_division: "Central Boosting Station",
            billing_period: "Q4 (Jan - Mar 2026)",
            bill_date: "25 Mar 2026",
            due_date: "15 Apr 2026",
            units_consumed: 42,
            amount_due: 580,
            amount_paid: 0,
            status: "overdue",
            items: [
              { id: "i9", description: "Water Consumption (42 kL)", amount: 378 },
              { id: "i10", description: "Sewerage Maintenance Charge", amount: 151.2 },
              { id: "i11", description: "Late Surcharge", amount: 50.8 },
            ],
          },
          {
            id: "b4",
            bill_number: "PNG-2026-1029",
            utility_type: "gas",
            title: "Piped Natural Gas (PNG)",
            provider_name: "City Gas Distribution",
            consumer_number: "GAS-982140",
            sub_division: "City Grid",
            billing_period: "15 Feb 2026 - 15 Mar 2026",
            bill_date: "16 Mar 2026",
            due_date: "31 Mar 2026",
            units_consumed: 18.5,
            amount_due: 860,
            amount_paid: 860,
            status: "paid",
            items: [
              { id: "i12", description: "Domestic PNG Consumption (18.5 SCM)", amount: 786.25 },
              { id: "i13", description: "Network Transmission & Metering", amount: 50 },
              { id: "i14", description: "Applicable Taxes", amount: 23.75 },
            ],
          },
        ];
        setBills(fallbackBills);
        setSelectedBill(fallbackBills[0]);
      } else {
        setBills(billsData as CivicBill[]);
        setSelectedBill(billsData[0] as CivicBill);
      }
    } catch (e) {
      console.error("Error fetching bills:", e);
    } finally {
      setLoading(false);
    }
  };

  const getUtilityMeta = (type: CivicBill["utility_type"]) => {
    switch (type) {
      case "electricity":
        return {
          icon: Zap,
          iconColor: "text-amber-500",
          bgColor: "bg-amber-50",
          borderColor: "border-amber-200",
        };
      case "water":
        return {
          icon: Droplets,
          iconColor: "text-blue-500",
          bgColor: "bg-blue-50",
          borderColor: "border-blue-200",
        };
      case "property_tax":
        return {
          icon: Building,
          iconColor: "text-purple-500",
          bgColor: "bg-purple-50",
          borderColor: "border-purple-200",
        };
      case "gas":
        return {
          icon: Flame,
          iconColor: "text-rose-500",
          bgColor: "bg-rose-50",
          borderColor: "border-rose-200",
        };
    }
  };

  const filteredBills = bills.filter((b) => {
    if (activeTab === "unpaid") return b.status === "unpaid" || b.status === "overdue";
    if (activeTab === "paid") return b.status === "paid";
    return true;
  });

  const handleSimulatePayment = async (bill: CivicBill) => {
    setPaying(true);
    const mockPaymentId = `TXN-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date();
    const paidAt = now.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) + " at " + now.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    try {
      await supabase
        .from("bills")
        .update({
          status: "paid",
          amount_paid: bill.amount_due,
        })
        .eq("id", bill.id);

      await supabase.from("bill_payments").insert([
        {
          bill_id: bill.id,
          user_id: user?.id || "c0000000-0000-0000-0000-000000000001",
          amount: bill.amount_due,
          payment_method: "upi",
          razorpay_payment_id: mockPaymentId,
          status: "succeeded",
        },
      ]);
    } catch (err) {
      console.warn("Local update fallback:", err);
    }

    sendBillPaymentReceipt(
      user?.email || "citizen@oneserve.in",
      bill.bill_number,
      bill.provider_name,
      bill.amount_due,
      mockPaymentId
    );

    setBills((prev) =>
      prev.map((item) =>
        item.id === bill.id
          ? { ...item, status: "paid", amount_paid: bill.amount_due }
          : item
      )
    );

    setSelectedBill((prev) =>
      prev && prev.id === bill.id
        ? { ...prev, status: "paid", amount_paid: bill.amount_due }
        : prev
    );

    setPaymentReceipt({
      bill,
      paymentId: mockPaymentId,
      paidAt,
    });

    setPaying(false);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Printable Receipt CSS: Ensures exactly 1 Single Page output with zero browser headers/footers */}
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0 !important; /* Eliminates browser-injected header (date, title) and footer (URL, page #) */
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            height: 100% !important;
            overflow: hidden !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * {
            visibility: hidden !important;
          }
          #official-receipt-print, #official-receipt-print * {
            visibility: visible !important;
          }
          #official-receipt-print {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 20mm 20mm !important; /* Re-applies clean internal page margins */
            box-shadow: none !important;
            border: none !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
            Bill Payment
          </h1>
          <p className="text-gray-600 mt-1">
            Review and pay your utility and civic bills online
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center bg-gray-100 p-1 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === "all"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            All ({bills.length})
          </button>
          <button
            onClick={() => setActiveTab("unpaid")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === "unpaid"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Due ({bills.filter((b) => b.status !== "paid").length})
          </button>
          <button
            onClick={() => setActiveTab("paid")}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              activeTab === "paid"
                ? "bg-white text-gray-800 shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Paid ({bills.filter((b) => b.status === "paid").length})
          </button>
        </div>
      </div>

      {/* Main Grid: Clean Cards (Left) + Detailed Panel (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Bill Cards List */}
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <div className="bg-white p-12 rounded-xl border border-gray-200 flex flex-col items-center justify-center text-gray-400">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 mb-2" />
              <p className="text-sm">Loading bills...</p>
            </div>
          ) : filteredBills.length === 0 ? (
            <div className="bg-white p-12 rounded-xl border border-gray-200 text-center">
              <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
              <h3 className="text-base font-semibold text-gray-800">No bills in this tab</h3>
              <p className="text-sm text-gray-500 mt-1">You are all caught up with your dues.</p>
            </div>
          ) : (
            filteredBills.map((bill) => {
              const meta = getUtilityMeta(bill.utility_type);
              const Icon = meta.icon;
              const isSelected = selectedBill?.id === bill.id;

              return (
                <div
                  key={bill.id}
                  onClick={() => setSelectedBill(bill)}
                  className={`bg-white border rounded-xl p-4 cursor-pointer transition-all ${
                    isSelected
                      ? "border-blue-500 ring-2 ring-blue-500/10 shadow-sm"
                      : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg border ${meta.bgColor} ${meta.borderColor}`}>
                        <Icon className={`w-5 h-5 ${meta.iconColor}`} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-800">
                          {bill.title}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {bill.provider_name}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-lg font-bold text-gray-800">
                        ₹{bill.amount_due.toLocaleString("en-IN")}
                      </div>
                      <div className="mt-0.5">
                        {bill.status === "paid" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3 h-3" /> Paid
                          </span>
                        ) : bill.status === "overdue" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded">
                            <AlertTriangle className="w-3 h-3" /> Overdue
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded">
                            <Clock className="w-3 h-3" /> Due {bill.due_date}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right: Bill Details & Payment Box */}
        <div className="lg:col-span-5">
          {selectedBill ? (
            <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm sticky top-6 space-y-5">
              <div className="flex items-start justify-between pb-3 border-b border-gray-100">
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    {selectedBill.title} Details
                  </h2>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {selectedBill.provider_name}
                  </p>
                </div>
                <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded border border-gray-100">
                  {selectedBill.bill_number}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs bg-gray-50 p-3 rounded-lg border border-gray-100">
                <div>
                  <span className="text-gray-500 block">Consumer ID / A/C</span>
                  <span className="font-semibold text-gray-800 font-mono">
                    {selectedBill.consumer_number}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Billing Period</span>
                  <span className="font-semibold text-gray-800">
                    {selectedBill.billing_period}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Bill Date</span>
                  <span className="font-semibold text-gray-800">
                    {selectedBill.bill_date}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500 block">Due Date</span>
                  <span
                    className={`font-semibold ${
                      selectedBill.status === "overdue" ? "text-red-600" : "text-gray-800"
                    }`}
                  >
                    {selectedBill.due_date}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                  Charge Breakdown
                </h4>
                <div className="space-y-1.5 border border-gray-100 rounded-lg p-3 bg-white">
                  {selectedBill.items && selectedBill.items.length > 0 ? (
                    selectedBill.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between text-xs text-gray-600 py-1 border-b border-dashed border-gray-100 last:border-0"
                      >
                        <span className="pr-2">{item.description}</span>
                        <span className="font-medium text-gray-800 whitespace-nowrap">
                          ₹{Number(item.amount).toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-gray-400 py-1 text-center">
                      Standard Utility Tariff
                    </div>
                  )}

                  <div className="flex items-center justify-between text-sm font-bold text-gray-800 pt-2 border-t border-gray-200">
                    <span>Total Amount</span>
                    <span className="text-blue-600 text-base">
                      ₹{selectedBill.amount_due.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {selectedBill.status === "paid" ? (
                <div className="space-y-2">
                  <div className="w-full py-2.5 bg-green-50 text-green-700 border border-green-200 rounded-lg flex items-center justify-center gap-1.5 font-semibold text-xs">
                    <CheckCircle2 className="w-4 h-4" /> This bill has been paid
                  </div>
                  <button
                    onClick={() => {
                      const now = new Date();
                      setPaymentReceipt({
                        bill: selectedBill,
                        paymentId: `TXN-VERIFIED-${selectedBill.id.toUpperCase()}`,
                        paidAt: selectedBill.bill_date + " at " + now.toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        }),
                      });
                    }}
                    className="w-full py-2.5 text-xs font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Printer className="w-3.5 h-3.5" /> View Official Receipt
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    disabled={paying}
                    onClick={() => handleSimulatePayment(selectedBill)}
                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {paying ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        Pay ₹{selectedBill.amount_due.toLocaleString("en-IN")}
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-gray-400 flex items-center justify-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-green-600" />
                    Secure payment gateway with zero convenience fee
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
              Select a bill from the list to view its details.
            </div>
          )}
        </div>
      </div>

      {/* Modern Compact Receipt Modal */}
      {paymentReceipt && (
        <div
          onClick={() => setPaymentReceipt(null)}
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
        >
          {/* Modal Container: Compact height & responsive fits on 1 screen */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl max-w-lg w-full border border-gray-200 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
          >
            {/* Modal Header */}
            <div className="bg-gray-50 px-5 py-3.5 border-b border-gray-200 flex items-center justify-between shrink-0 no-print">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-4 h-4 text-emerald-600" />
                <span className="text-sm font-bold text-gray-800">
                  Payment Receipt
                </span>
              </div>
              <button
                onClick={() => setPaymentReceipt(null)}
                className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-200/60 rounded-md transition-colors"
                title="Close (Esc)"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Receipt Body */}
            <div className="overflow-y-auto p-5 sm:p-6">
              <div
                id="official-receipt-print"
                ref={receiptPrintRef}
                className="text-gray-900 font-sans bg-white text-xs leading-relaxed"
              >
                {/* Header (Clean, no garbled headers or repeated portal lines) */}
                <div className="border-b border-gray-900 pb-3 mb-4 flex items-start justify-between">
                  <div>
                    <h2 className="text-base font-bold text-gray-900">
                      {paymentReceipt.bill.provider_name}
                    </h2>
                    <p className="text-gray-500 text-[11px] mt-0.5">
                      {paymentReceipt.bill.title} Acknowledgment
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block border border-emerald-600 bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded text-[10px] uppercase tracking-wider">
                      PAID
                    </span>
                  </div>
                </div>

                {/* Key Metadata Grid */}
                <div className="grid grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-200 mb-4 text-xs">
                  <div>
                    <p className="text-gray-400 text-[10px] uppercase font-medium">Receipt No.</p>
                    <p className="font-mono font-bold text-gray-800">
                      RCPT-{paymentReceipt.paymentId.replace(/[^a-zA-Z0-9]/g, "").slice(-8)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10px] uppercase font-medium">Payment Timestamp</p>
                    <p className="font-medium text-gray-800">
                      {paymentReceipt.paidAt}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10px] uppercase font-medium">Transaction ID</p>
                    <p className="font-mono font-medium text-gray-800 text-[11px]">
                      {paymentReceipt.paymentId}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-[10px] uppercase font-medium">Payment Channel</p>
                    <p className="font-medium text-gray-800">
                      Online Gateway / UPI
                    </p>
                  </div>
                </div>

                {/* Account Details */}
                <div className="mb-4">
                  <h3 className="font-bold text-gray-800 uppercase tracking-wider text-[10px] mb-2 border-b border-gray-100 pb-1">
                    Account Particulars
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px]">Payer Name</span>
                      <span className="font-medium text-gray-800">
                        {user?.user_metadata?.full_name || "Rahul Sharma"}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Consumer / Account ID</span>
                      <span className="font-mono font-medium text-gray-800">
                        {paymentReceipt.bill.consumer_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Bill Number</span>
                      <span className="font-mono font-medium text-gray-800">
                        {paymentReceipt.bill.bill_number}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px]">Billing Cycle</span>
                      <span className="font-medium text-gray-800">
                        {paymentReceipt.bill.billing_period}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Charge Breakdown Table */}
                <div className="mb-4">
                  <h3 className="font-bold text-gray-800 uppercase tracking-wider text-[10px] mb-2 border-b border-gray-100 pb-1">
                    Settlement Summary
                  </h3>
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-gray-200 text-gray-400 text-[10px] uppercase">
                        <th className="py-1 font-semibold">Charge Description</th>
                        <th className="py-1 font-semibold text-right">Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-xs">
                      {paymentReceipt.bill.items && paymentReceipt.bill.items.length > 0 ? (
                        paymentReceipt.bill.items.map((item) => (
                          <tr key={item.id}>
                            <td className="py-1 text-gray-700">{item.description}</td>
                            <td className="py-1 text-right font-medium text-gray-900">
                              ₹{Number(item.amount).toFixed(2)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td className="py-1 text-gray-700">Consolidated Civic Tariff</td>
                          <td className="py-1 text-right font-medium text-gray-900">
                            ₹{Number(paymentReceipt.bill.amount_due).toFixed(2)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-gray-900 text-xs font-bold">
                        <td className="py-2 text-gray-900 text-right pr-3">
                          Total Amount Paid:
                        </td>
                        <td className="py-2 text-right text-emerald-700 font-extrabold text-sm">
                          ₹{paymentReceipt.bill.amount_due.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Digital Verification Footer */}
                <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Computer-generated payment acknowledgment. Digitally authenticated.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Bottom Actions (Next to each other) */}
            <div className="bg-gray-50 px-5 py-3 border-t border-gray-200 flex items-center justify-end gap-2 shrink-0 no-print">
              <button
                onClick={handlePrint}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
              <button
                onClick={() => setPaymentReceipt(null)}
                className="px-3.5 py-1.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-300 rounded-lg text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
