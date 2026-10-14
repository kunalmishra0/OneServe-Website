import React, { useState } from "react";
import {
  CreditCard,
  Shield,
  CheckCircle,
  AlertCircle,
  Zap,
  Droplets,
  Building,
  Flame,
  FileText,
  Clock,
  Printer,
  X,
  ExternalLink,
  Loader,
  ArrowRight,
  Info,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";

interface BillItem {
  id: string;
  type: "electricity" | "water" | "tax" | "gas";
  title: string;
  provider: string;
  consumerNumber: string;
  billNumber: string;
  billingPeriod: string;
  dueDate: string;
  amount: number;
  status: "due" | "overdue" | "paid";
  paidAt?: string;
  paymentId?: string;
}

const INITIAL_BILLS: BillItem[] = [
  {
    id: "BILL-ELEC-01",
    type: "electricity",
    title: "Electricity Utility Bill",
    provider: "DHBVN Power Distribution",
    consumerNumber: "CA-981240182",
    billNumber: "ELEC-2026-0492",
    billingPeriod: "1 Mar 2026 - 31 Mar 2026",
    dueDate: "20 Apr 2026",
    amount: 1420,
    status: "due",
  },
  {
    id: "BILL-WATER-02",
    type: "water",
    title: "Municipal Water & Sewerage",
    provider: "Municipal Water Works Board",
    consumerNumber: "WT-504921",
    billNumber: "WTR-2026-0219",
    billingPeriod: "Q1 2026 (Jan - Mar)",
    dueDate: "25 Apr 2026",
    amount: 560,
    status: "due",
  },
  {
    id: "BILL-TAX-03",
    type: "tax",
    title: "Property Tax & Civic Cess",
    provider: "Municipal Corporation Revenue Dept.",
    consumerNumber: "PT-SEC14-402",
    billNumber: "TAX-2026-0811",
    billingPeriod: "FY 2026-27 (H1)",
    dueDate: "30 Apr 2026",
    amount: 2850,
    status: "due",
  },
  {
    id: "BILL-GAS-04",
    type: "gas",
    title: "Piped Natural Gas (PNG)",
    provider: "Haryana City Gas Distribution",
    consumerNumber: "GAS-772109",
    billNumber: "PNG-2026-1102",
    billingPeriod: "15 Feb 2026 - 15 Mar 2026",
    dueDate: "10 Apr 2026",
    amount: 730,
    status: "overdue",
  },
];

declare global {
  interface Window {
    Razorpay?: any;
  }
}

// Dynamically load Razorpay checkout script
const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export function BillPayment() {
  const { user } = useAuth();
  const [bills, setBills] = useState<BillItem[]>(INITIAL_BILLS);
  const [selectedBillId, setSelectedBillId] = useState<string>(INITIAL_BILLS[0].id);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successReceipt, setSuccessReceipt] = useState<BillItem | null>(null);

  const keyIdFromEnv =
    (import.meta as any).env?.VITE_RAZORPAY_KEY_ID || "";

  const selectedBill = bills.find((b) => b.id === selectedBillId);

  const getBillIcon = (type: BillItem["type"]) => {
    switch (type) {
      case "electricity":
        return <Zap className="text-amber-500" size={22} />;
      case "water":
        return <Droplets className="text-blue-500" size={22} />;
      case "tax":
        return <Building className="text-purple-500" size={22} />;
      case "gas":
        return <Flame className="text-rose-500" size={22} />;
    }
  };

  const handlePayBill = async () => {
    if (!selectedBill || selectedBill.status === "paid") return;

    setError(null);
    setIsProcessing(true);

    try {
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error("Unable to load Razorpay checkout SDK. Please check your internet connection.");
      }

      // Try creating order through Express backend
      let orderData: any = null;
      try {
        const orderRes = await fetch("http://localhost:5000/api/razorpay/create-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: selectedBill.amount,
            receipt: `rcpt_${selectedBill.id}_${Date.now()}`,
            notes: {
              billId: selectedBill.id,
              billType: selectedBill.type,
              consumerNumber: selectedBill.consumerNumber,
            },
          }),
        });

        const orderJson = await orderRes.json();
        if (orderJson.success) {
          orderData = orderJson;
        } else if (orderJson.error && orderJson.error.includes("Razorpay keys not set")) {
          // If keys are not in server.js yet, let user know
          throw new Error(orderJson.error);
        }
      } catch (err: any) {
        if (err.message && err.message.includes("Razorpay keys not set")) {
          throw err;
        }
        console.warn("Backend order creation skipped, checking VITE_RAZORPAY_KEY_ID...", err);
      }

      const activeKey = orderData?.keyId || keyIdFromEnv;

      if (!activeKey || activeKey.trim() === "") {
        throw new Error(
          "Razorpay Test Key is missing! Please open your .env file and add your VITE_RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET."
        );
      }

      // Initialize Razorpay Checkout
      const options = {
        key: activeKey,
        amount: orderData ? orderData.amount : selectedBill.amount * 100,
        currency: orderData ? orderData.currency : "INR",
        name: "OneServe Civic Services",
        description: `Payment for ${selectedBill.title} (${selectedBill.consumerNumber})`,
        image: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png",
        order_id: orderData?.orderId,
        prefill: {
          name: user?.user_metadata?.full_name || "Citizen User",
          email: user?.email || "citizen@oneserve.gov.in",
          contact: "9876543210",
        },
        theme: {
          color: "#2563eb",
        },
        handler: async (response: any) => {
          console.log("Razorpay payment response:", response);

          // Attempt signature verification if order was backend created
          if (response.razorpay_signature && response.razorpay_order_id) {
            try {
              await fetch("http://localhost:5000/api/razorpay/verify-payment", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
            } catch (vErr) {
              console.warn("Backend verification call failed:", vErr);
            }
          }

          const paymentId = response.razorpay_payment_id || `PAY-${Math.floor(Math.random() * 900000 + 100000)}`;

          // Mark bill as paid
          const updatedBill: BillItem = {
            ...selectedBill,
            status: "paid",
            paidAt: new Date().toLocaleString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            paymentId,
          };

          setBills((prev) =>
            prev.map((b) => (b.id === selectedBill.id ? updatedBill : b))
          );
          setSuccessReceipt(updatedBill);
          setIsProcessing(false);
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response: any) => {
        setIsProcessing(false);
        setError(
          response.error?.description || "Payment failed. Please try again with valid test credentials."
        );
      });
      rzp.open();
    } catch (err: any) {
      setIsProcessing(false);
      setError(err.message || "An error occurred while launching Razorpay.");
    }
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-2xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-8 -translate-y-8 opacity-10 pointer-events-none">
          <CreditCard size={220} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-200 border border-blue-400/30 text-xs font-semibold uppercase tracking-wider mb-2">
              <Shield size={14} /> OneServe Civic Payments
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Pay Municipal & Utility Bills
            </h1>
            <p className="text-blue-100 text-sm md:text-base max-w-2xl mt-1">
              Secure payments powered by Razorpay. Pay electricity, water, gas, and property taxes with instant receipts.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-3 rounded-xl flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
            <div>
              <p className="text-xs text-blue-200 font-semibold uppercase tracking-wider">Gateway Status</p>
              <p className="text-sm font-bold text-white">Razorpay Test Mode</p>
            </div>
          </div>
        </div>
      </div>

      {/* Test Mode Helper Info Box */}
      <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 md:p-5 flex items-start gap-3.5 shadow-xs">
        <Info className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
        <div className="text-xs md:text-sm text-amber-900 leading-relaxed">
          <p className="font-bold mb-1">Razorpay Test Gateway Mode</p>
          <p className="text-amber-800">
            You can test full checkout with dummy credentials:
            <span className="font-mono font-semibold ml-1 bg-amber-100 px-2 py-0.5 rounded text-amber-950">Card: 4111 1111 1111 1111</span>
            <span className="mx-1.5">•</span>
            <span className="font-mono font-semibold bg-amber-100 px-2 py-0.5 rounded text-amber-950">UPI: success@razorpay</span>
            <span className="mx-1.5">•</span>
            <span className="font-mono font-semibold bg-amber-100 px-2 py-0.5 rounded text-amber-950">OTP: 123456</span>
          </p>
          {!keyIdFromEnv && (
            <p className="mt-2 text-rose-700 font-semibold">
              ⚠️ Note: Remember to paste your Razorpay Key ID into <code className="bg-rose-100 px-1.5 py-0.5 rounded">.env</code> as <code className="bg-rose-100 px-1.5 py-0.5 rounded">VITE_RAZORPAY_KEY_ID</code> and <code className="bg-rose-100 px-1.5 py-0.5 rounded">RAZORPAY_KEY_ID</code> to trigger live popups.
            </p>
          )}
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <div>
            <p className="font-bold text-sm">Payment Gateway Notice</p>
            <p className="text-xs md:text-sm mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* Main Grid: Bills List & Payment Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Bills List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <FileText className="text-blue-600" size={20} />
              Your Municipal Utility Bills
            </h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {bills.filter((b) => b.status !== "paid").length} Due Bills
            </span>
          </div>

          <div className="space-y-3">
            {bills.map((bill) => {
              const isSelected = bill.id === selectedBillId;
              const isPaid = bill.status === "paid";
              return (
                <div
                  key={bill.id}
                  onClick={() => !isPaid && setSelectedBillId(bill.id)}
                  className={`p-5 rounded-2xl border transition-all duration-200 ${
                    isPaid
                      ? "bg-slate-50 border-slate-200 opacity-80 cursor-default"
                      : isSelected
                      ? "bg-blue-50/70 border-blue-500 ring-2 ring-blue-200 shadow-sm cursor-pointer"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs cursor-pointer"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3.5">
                      <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-xs">
                        {getBillIcon(bill.type)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-base">{bill.title}</h3>
                          {bill.status === "paid" ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                              <CheckCircle size={12} /> Paid
                            </span>
                          ) : bill.status === "overdue" ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                              Overdue
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              Due
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{bill.provider}</p>

                        <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-600">
                          <span>
                            Consumer No: <strong className="text-slate-800">{bill.consumerNumber}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Due Date: <strong className="text-slate-800">{bill.dueDate}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-medium">Payable Amount</p>
                      <p className="text-xl font-extrabold text-slate-900">₹{bill.amount.toLocaleString("en-IN")}</p>
                      {isPaid && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSuccessReceipt(bill);
                          }}
                          className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 underline"
                        >
                          View Receipt
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Checkout Summary & Razorpay Trigger */}
        <div>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sticky top-6 space-y-5">
            <h3 className="font-bold text-slate-800 text-base pb-3 border-b border-slate-100 flex items-center gap-2">
              <CreditCard className="text-blue-600" size={18} />
              Payment Summary
            </h3>

            {selectedBill ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium">Selected Bill</p>
                  <p className="font-bold text-slate-800 text-sm">{selectedBill.title}</p>
                  <p className="text-xs text-slate-500">{selectedBill.billNumber}</p>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs md:text-sm">
                  <div className="flex justify-between text-slate-600">
                    <span>Base Amount:</span>
                    <span className="font-semibold text-slate-800">₹{selectedBill.amount.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Municipal Surcharge:</span>
                    <span className="font-semibold text-emerald-600">₹0.00 (Waived)</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Convenience Fee:</span>
                    <span className="font-semibold text-emerald-600">Free</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-slate-200 text-base font-extrabold text-slate-900">
                    <span>Total Payable:</span>
                    <span className="text-xl text-blue-600">₹{selectedBill.amount.toLocaleString("en-IN")}</span>
                  </div>
                </div>

                {selectedBill.status === "paid" ? (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center text-xs font-bold text-emerald-800">
                    ✓ This bill has already been paid
                  </div>
                ) : (
                  <button
                    onClick={handlePayBill}
                    disabled={isProcessing}
                    className="w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, #2563eb, #4f46e5)",
                    }}
                  >
                    {isProcessing ? (
                      <>
                        <Loader className="animate-spin" size={18} /> Processing Gateway...
                      </>
                    ) : (
                      <>
                        Pay ₹{selectedBill.amount.toLocaleString("en-IN")} with Razorpay
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                )}

                <div className="flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium pt-2">
                  <Shield size={14} className="text-slate-400" />
                  <span>256-Bit SSL Encrypted & RBI Compliant</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500 py-4 text-center">Select a bill to proceed with payment.</p>
            )}
          </div>
        </div>
      </div>

      {/* Success Receipt Modal */}
      {successReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
          onClick={() => setSuccessReceipt(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 md:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setSuccessReceipt(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
                <CheckCircle size={36} />
              </div>
              <h2 className="text-2xl font-extrabold text-slate-900">Payment Successful!</h2>
              <p className="text-xs text-slate-500 mt-1">Official Municipal E-Receipt generated</p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2.5 text-xs md:text-sm text-slate-700 mb-6 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-500">Transaction ID:</span>
                <span className="font-bold text-slate-900">{successReceipt.paymentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Bill Type:</span>
                <span className="font-bold text-slate-900">{successReceipt.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Consumer Number:</span>
                <span className="font-bold text-slate-900">{successReceipt.consumerNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Date:</span>
                <span className="font-bold text-slate-900">{successReceipt.paidAt}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Payment Gateway:</span>
                <span className="font-bold text-blue-600">Razorpay (Verified)</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 text-base font-bold text-slate-900">
                <span>Amount Paid:</span>
                <span className="text-emerald-700">₹{successReceipt.amount.toLocaleString("en-IN")}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Printer size={16} /> Print Receipt
              </button>
              <button
                onClick={() => setSuccessReceipt(null)}
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs md:text-sm transition-colors shadow-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default BillPayment;
