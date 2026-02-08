import { useState } from "react";
import {
  CreditCard,
  Shield,
  Zap,
  Droplet,
  Flame,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export function BillPayment() {
  const [selectedBill, setSelectedBill] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Controlled form state
  const [paymentDetails, setPaymentDetails] = useState({
    cardNumber: "",
    expiry: "",
    cvv: "",
    upiId: "",
  });

  const pendingBills = [
    {
      id: "ELEC-2026-01",
      type: "Electricity",
      provider: "Mumbai Power",
      amount: 2450,
      dueDate: "2026-01-28",
      icon: Zap,
      color: "bg-yellow-500",
      billPeriod: "Dec 2025",
    },
    {
      id: "WATER-2026-01",
      type: "Water",
      provider: "Mumbai Water Supply",
      amount: 680,
      dueDate: "2026-01-25",
      icon: Droplet,
      color: "bg-blue-500",
      billPeriod: "Dec 2025",
    },
    {
      id: "GAS-2026-01",
      type: "Gas",
      provider: "City Gas Distribution",
      amount: 1250,
      dueDate: "2026-01-30",
      icon: Flame,
      color: "bg-orange-500",
      billPeriod: "Dec 2025",
    },
  ];

  const handlePayment = () => {
    setError(null);

    // Basic Validation
    if (paymentMethod === "card") {
      const { cardNumber, expiry, cvv } = paymentDetails;
      if (!cardNumber || cardNumber.length < 16) {
        setError("Please enter a valid 16-digit card number.");
        return;
      }
      if (!expiry || !expiry.includes("/")) {
        setError("Please enter a valid expiry date (MM/YY).");
        return;
      }
      if (!cvv || cvv.length < 3) {
        setError("Please enter a valid CVV.");
        return;
      }
    } else if (paymentMethod === "upi") {
      if (!paymentDetails.upiId || !paymentDetails.upiId.includes("@")) {
        setError("Please enter a valid UPI ID (e.g., user@bank).");
        return;
      }
    }

    // Simulate Success
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setSelectedBill(null);
      setPaymentDetails({ cardNumber: "", expiry: "", cvv: "", upiId: "" }); // Reset form
    }, 3000);
  };

  const selectedBillData = pendingBills.find(
    (bill) => bill.id === selectedBill,
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
          Pay Utility Bills
        </h1>
        <p className="text-gray-600">
          Secure payment gateway with AI-powered fraud detection
        </p>
      </div>

      {showSuccess && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
          <div>
            <p className="text-sm text-green-900 font-medium">
              Payment Successful!
            </p>
            <p className="text-sm text-green-700">
              Transaction ID: TXN{Math.floor(Math.random() * 1000000)}
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 text-red-700">
          <AlertCircle className="h-5 w-5 mt-0.5" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Security banner */}
      <div className="mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-6 text-white">
        <div className="flex items-start gap-4">
          <div className="bg-white bg-opacity-20 p-3 rounded-lg">
            <Shield className="h-8 w-8" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">Bank-Grade Security</h3>
            <p className="text-blue-100">
              All transactions are encrypted with 256-bit SSL encryption and
              monitored by our AI-powered fraud detection system.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending bills */}
        <div className="lg:col-span-2">
          <h2 className="text-xl font-bold text-gray-800 mb-4">
            Pending Bills
          </h2>
          <div className="space-y-4">
            {pendingBills.map((bill) => {
              const Icon = bill.icon;
              const isSelected = selectedBill === bill.id;
              return (
                <div
                  key={bill.id}
                  onClick={() => {
                    setSelectedBill(bill.id);
                    setError(null);
                  }}
                  className={`
                    bg-white rounded-lg shadow-sm border-2 p-6 cursor-pointer
                    transition-all duration-200 hover:shadow-md
                    ${isSelected ? "border-blue-500 ring-2 ring-blue-200" : "border-gray-200"}
                  `}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div
                        className={`${bill.color} p-3 rounded-lg text-white`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800 mb-1">
                          {bill.type} Bill
                        </h3>
                        <p className="text-sm text-gray-600 mb-2">
                          {bill.provider}
                        </p>
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                          <span>📅 Period: {bill.billPeriod}</span>
                          <span>
                            ⏰ Due:{" "}
                            {new Date(bill.dueDate).toLocaleDateString("en-IN")}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-800">
                        ₹{bill.amount.toLocaleString("en-IN")}
                      </p>
                      {isSelected && (
                        <div className="mt-2 flex items-center gap-1 text-blue-600 text-sm font-semibold">
                          <CheckCircle className="h-4 w-4" />
                          Selected
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Payment section */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              Payment Details
            </h2>

            {!selectedBill ? (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">
                  Select a bill to proceed with payment
                </p>
              </div>
            ) : (
              <>
                {/* Selected bill summary */}
                <div className="mb-6 pb-6 border-b border-gray-200">
                  <div className="flex items-center gap-3 mb-3">
                    {selectedBillData && (
                      <>
                        <div
                          className={`${selectedBillData.color} p-2 rounded`}
                        >
                          <selectedBillData.icon className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-800">
                            {selectedBillData.type} Bill
                          </p>
                          <p className="text-xs text-gray-500">
                            {selectedBillData.billPeriod}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Amount</span>
                    <span className="text-2xl font-bold text-gray-800">
                      ₹{selectedBillData?.amount.toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>

                {/* Payment method */}
                <div className="mb-6">
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Payment Method
                  </label>
                  <div className="space-y-2">
                    {["card", "upi", "netbanking"].map((method) => (
                      <label
                        key={method}
                        className={`
                          flex items-center gap-3 p-3 border-2 rounded-lg cursor-pointer
                          transition-colors
                          ${
                            paymentMethod === method
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-200 hover:bg-gray-50"
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="payment"
                          value={method}
                          checked={paymentMethod === method}
                          onChange={(e) => {
                            setPaymentMethod(e.target.value);
                            setError(null);
                          }}
                          className="w-4 h-4 text-blue-600"
                        />
                        <span className="text-sm font-medium text-gray-800 capitalize">
                          {method === "upi"
                            ? "UPI"
                            : method === "netbanking"
                              ? "Net Banking"
                              : "Credit/Debit Card"}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Card details form (if card selected) */}
                {paymentMethod === "card" && (
                  <div className="mb-6 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Card Number
                      </label>
                      <input
                        type="text"
                        value={paymentDetails.cardNumber}
                        onChange={(e) =>
                          setPaymentDetails({
                            ...paymentDetails,
                            cardNumber: e.target.value,
                          })
                        }
                        placeholder="1234 5678 9012 3456"
                        maxLength={16}
                        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Expiry
                        </label>
                        <input
                          type="text"
                          value={paymentDetails.expiry}
                          onChange={(e) =>
                            setPaymentDetails({
                              ...paymentDetails,
                              expiry: e.target.value,
                            })
                          }
                          placeholder="MM/YY"
                          maxLength={5}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          CVV
                        </label>
                        <input
                          type="text"
                          value={paymentDetails.cvv}
                          onChange={(e) =>
                            setPaymentDetails({
                              ...paymentDetails,
                              cvv: e.target.value,
                            })
                          }
                          placeholder="123"
                          maxLength={3}
                          className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {paymentMethod === "upi" && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      UPI ID
                    </label>
                    <input
                      type="text"
                      value={paymentDetails.upiId}
                      onChange={(e) =>
                        setPaymentDetails({
                          ...paymentDetails,
                          upiId: e.target.value,
                        })
                      }
                      placeholder="yourname@upi"
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {/* Pay button */}
                <button
                  onClick={handlePayment}
                  className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center justify-center gap-2"
                >
                  <Shield className="h-5 w-5" />
                  Pay ₹{selectedBillData?.amount.toLocaleString("en-IN")}
                </button>

                <p className="text-xs text-gray-500 text-center mt-3">
                  🔒 Secured by 256-bit encryption
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
