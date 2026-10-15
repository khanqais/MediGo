"use client";

import { useCartStore } from "@/store/cartStore";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  CheckCircle2, MapPin, Plus, 
  ArrowRight, Upload, Lock, Check,
  FileText, AlertTriangle, Eye, RefreshCw
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { findBlockedOtcOnlyItem, isOtcOnlyMode, OTC_ONLY_ORDER_ERROR, OTC_ONLY_STOREFRONT_LABEL } from "@/lib/sales-mode";

interface UserPrescription {
  id: string;
  file_path: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  url?: string | null;
  rejection_reason?: string | null;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, clearCart, appliedCoupon, removeNonOtcItems } = useCartStore();
  const supabase = createClient();
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedAddressIndex, setSelectedAddressIndex] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [isValidating, setIsValidating] = useState(false);

  // Address State
  const [addresses, setAddresses] = useState<any[]>([]);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [newAddr, setNewAddr] = useState({
    name: "", phone: "", line1: "", locality: "",
    city: "Mumbai", state: "Maharashtra", pincode: "", type: "Home"
  });

  // Prescription State
  const [prescriptions, setPrescriptions] = useState<UserPrescription[]>([]);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string | null>(null);
  const [isLoadingPrescriptions, setIsLoadingPrescriptions] = useState(false);
  const [isUploadingRx, setIsUploadingRx] = useState(false);

  // Order Validation Summary
  const [validationSummary, setValidationSummary] = useState<any>(null);

  const hasPrescriptionItems = items.some(
    (item) => item.medicine.prescriptionRequired || item.medicine.drugSchedule === "H" || item.medicine.drugSchedule === "H1"
  );

  useEffect(() => {
    const removed = removeNonOtcItems();
    if (removed > 0) {
      toast.info(`${OTC_ONLY_STOREFRONT_LABEL}. ${removed} prescription item(s) were removed from your cart.`);
    }
  }, [removeNonOtcItems]);

  const fetchUserPrescriptions = useCallback(async () => {
    try {
      setIsLoadingPrescriptions(true);
      const res = await fetch("/api/prescriptions");
      const json = await res.json();
      if (res.ok && json.success) {
        const list: UserPrescription[] = json.data || [];
        setPrescriptions(list);
        if (list.length > 0) {
          const approved = list.find(p => p.status === "APPROVED");
          const pending = list.find(p => p.status === "PENDING");
          if (approved) setSelectedPrescriptionId(approved.id);
          else if (pending) setSelectedPrescriptionId(pending.id);
          else setSelectedPrescriptionId(list[0].id);
        }
      }
    } catch {
      toast.error("Failed to load your existing prescriptions");
    } finally {
      setIsLoadingPrescriptions(false);
    }
  }, []);

  // Load addresses on mount
  useEffect(() => {
    async function fetchAddresses() {
      const supabaseClient = createClient();
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        const { data } = await supabaseClient.from('addresses').select('*').eq('user_id', user.id);
        if (data && data.length > 0) {
          setAddresses(data);
        }
      }
      setIsLoadingAddresses(false);
    }
    fetchAddresses();
  }, []);

  // Load prescriptions when on step 2 if Rx items exist
  useEffect(() => {
    if (step === 2 && hasPrescriptionItems) {
      fetchUserPrescriptions();
    }
  }, [step, hasPrescriptionItems, fetchUserPrescriptions]);

  const handleInlineRxUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/jpeg", "image/png", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast.error("Invalid file format. Please upload JPG, PNG, or PDF.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File exceeds 5MB size limit.");
      return;
    }

    try {
      setIsUploadingRx(true);
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/prescriptions", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Prescription uploaded successfully!");
        const newRx: UserPrescription = json.data;
        setPrescriptions(prev => [newRx, ...prev]);
        setSelectedPrescriptionId(newRx.id);
      } else {
        toast.error(json.error || "Failed to upload prescription");
      }
    } catch {
      toast.error("Network error during file upload");
    } finally {
      setIsUploadingRx(false);
    }
  };

  const handleAddNewAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddr.name || !newAddr.phone || !newAddr.line1 || !newAddr.pincode) {
      toast.error("Please fill in all required address fields");
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase.from('addresses').insert({
      user_id: user.id,
      full_name: newAddr.name,
      phone: newAddr.phone,
      address_line_1: newAddr.line1 + ", " + newAddr.locality,
      city: newAddr.city,
      state: newAddr.state,
      postal_code: newAddr.pincode,
      is_default: addresses.length === 0
    }).select().single();

    if (error) {
      toast.error("Failed to save address");
      return;
    }

    setAddresses([...addresses, data]);
    setSelectedAddressIndex(addresses.length);
    setShowAddressForm(false);
    toast.success("New delivery address added!");
  };

  const selectedRx = prescriptions.find(p => p.id === selectedPrescriptionId);

  const handleValidateOrder = async () => {
    if (hasPrescriptionItems) {
      if (!selectedPrescriptionId) {
        toast.error("Please select or upload a prescription for Schedule H medicines");
        return;
      }
      if (selectedRx?.status === "REJECTED") {
        toast.error("The selected prescription was rejected. Please select an approved prescription or upload a fresh one.");
        return;
      }
    }

    if (!addresses[selectedAddressIndex]) {
      toast.error("Please select a delivery address");
      return;
    }

    setIsValidating(true);
    try {
      const res = await fetch("/api/orders/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(i => ({ medicine_id: i.medicine.id, quantity: i.quantity })),
          address_id: addresses[selectedAddressIndex].id,
          prescription_id: selectedPrescriptionId || null,
          coupon_code: appliedCoupon?.code || null,
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Validation failed");
      
      setValidationSummary(data.summary);
      setStep(3);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsValidating(false);
    }
  };

  const [paymentMethod, setPaymentMethod] = useState<"UPI" | "CARDS" | "COD">("UPI");

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePlaceOrder = async () => {
    setIsProcessing(true);
    try {
      const blocked = findBlockedOtcOnlyItem(items.map((i) => i.medicine));
      if (blocked) {
        toast.error(OTC_ONLY_ORDER_ERROR);
        setIsProcessing(false);
        return;
      }

      const method = (paymentMethod === "UPI" || paymentMethod === "CARDS") ? "ONLINE" : "COD";

      // 1. Create Order
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(i => ({ medicine_id: i.medicine.id, quantity: i.quantity })),
          address_id: addresses[selectedAddressIndex].id,
          payment_method: method,
          prescription_id: selectedPrescriptionId || null,
          coupon_code: appliedCoupon?.code || null,
        })
      });
      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.error || "Order failed");

      // Clear cart once order is created server-side
      clearCart();

      const createdOrderId = orderData.data?.id;

      // If order requires prescription approval (status === 'PENDING_PRESCRIPTION_APPROVAL')
      if (orderData.data?.status === "PENDING_PRESCRIPTION_APPROVAL") {
        toast.success("Order submitted for clinical verification! Our pharmacists will review your prescription.");
        router.push(`/order-success?order_id=${createdOrderId}`);
        return;
      }

      if (method === "COD") {
        toast.success("Order confirmed successfully!");
        router.push(`/order-success?order_id=${createdOrderId}`);
        return;
      }

      // 2. Create Razorpay Order
      const rzpRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: createdOrderId })
      });
      const rzpData = await rzpRes.json();
      if (!rzpRes.ok) throw new Error(rzpData.error || "Failed to create payment");

      // 3. Load script & Open Checkout
      const isLoaded = await loadRazorpayScript();
      if (!isLoaded) {
        throw new Error("Razorpay SDK failed to load. Are you online?");
      }

      const { data: { user } } = await supabase.auth.getUser();

      const options = {
        key: rzpData.key_id,
        amount: rzpData.amount,
        currency: rzpData.currency,
        name: "MediQuick",
        description: `Order ${createdOrderId}`,
        order_id: rzpData.razorpay_order_id,
        prefill: {
          name: addresses[selectedAddressIndex]?.full_name || "",
          email: user?.email || "",
          contact: addresses[selectedAddressIndex]?.phone || "",
        },
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              })
            });
            const verifyData = await verifyRes.json();
            
            if (verifyRes.ok && verifyData.success) {
              toast.success("Payment successful!");
              router.push(`/order-success?order_id=${createdOrderId}`);
            } else {
              toast.error(verifyData.error || "Payment verification failed");
              router.push(`/orders/${createdOrderId}`);
            }
          } catch {
            toast.error("Error verifying payment");
            router.push(`/orders/${createdOrderId}`);
          }
        },
        theme: { color: "#16a34a" }
      };

      const rzp1 = new (window as any).Razorpay(options);
      rzp1.on('payment.failed', function (response: any) {
        toast.error(response.error.description || "Payment failed");
        router.push(`/orders/${createdOrderId}`);
      });
      rzp1.open();

    } catch (error: any) {
      toast.error(error.message);
      setIsProcessing(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h2 className="text-xl font-bold mb-4">No items to checkout</h2>
        <Link href="/medicines" className="px-6 py-3 bg-primary text-white rounded-xl">Browse Medicines</Link>
      </div>
    );
  }

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="flex gap-4 mb-8 text-sm font-bold text-slate-500 justify-center">
          <span className={step >= 1 ? "text-primary" : ""}>1. Address</span>
          <span>&gt;</span>
          <span className={step >= 2 ? "text-primary" : ""}>2. Review &amp; Prescription</span>
          <span>&gt;</span>
          <span className={step === 3 ? "text-primary" : ""}>3. Payment</span>
        </div>

        {isOtcOnlyMode() && (
          <p className="text-center text-sm text-amber-700 font-medium mb-6">
            {OTC_ONLY_STOREFRONT_LABEL}. Only OTC medicines can be checked out.
          </p>
        )}

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="step-1" className="p-6 sm:p-10">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black flex items-center gap-2"><MapPin /> Select Address</h2>
                  <button onClick={() => setShowAddressForm(true)} className="text-primary font-bold">+ Add New</button>
                </div>

                {isLoadingAddresses ? (
                  <p>Loading addresses...</p>
                ) : (
                  <div className="space-y-3 mb-8">
                    {addresses.map((addr, idx) => (
                      <label key={addr.id} className={`flex gap-4 p-4 rounded-2xl border-2 cursor-pointer ${selectedAddressIndex === idx ? "border-primary bg-green-50" : "border-slate-200"}`}>
                        <input type="radio" checked={selectedAddressIndex === idx} onChange={() => setSelectedAddressIndex(idx)} className="mt-1" />
                        <div>
                          <p className="font-bold">{addr.full_name}</p>
                          <p className="text-sm">{addr.address_line_1}, {addr.city}, {addr.state} - {addr.postal_code}</p>
                          <p className="text-sm">Phone: {addr.phone}</p>
                        </div>
                      </label>
                    ))}
                    {addresses.length === 0 && !showAddressForm && (
                      <p className="text-red-500">No addresses found. Please add one.</p>
                    )}
                  </div>
                )}

                {showAddressForm && (
                  <form onSubmit={handleAddNewAddress} className="mb-6 p-5 bg-slate-50 border rounded-2xl space-y-4">
                    <input type="text" required placeholder="Full Name" value={newAddr.name} onChange={e => setNewAddr({...newAddr, name: e.target.value})} className="w-full border border-slate-300 bg-white text-slate-900 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary" />
                    <input type="tel" required placeholder="Phone" value={newAddr.phone} onChange={e => setNewAddr({...newAddr, phone: e.target.value})} className="w-full border border-slate-300 bg-white text-slate-900 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary" />
                    <input type="text" required placeholder="Address Line 1" value={newAddr.line1} onChange={e => setNewAddr({...newAddr, line1: e.target.value})} className="w-full border border-slate-300 bg-white text-slate-900 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary" />
                    <input type="text" required placeholder="Locality" value={newAddr.locality} onChange={e => setNewAddr({...newAddr, locality: e.target.value})} className="w-full border border-slate-300 bg-white text-slate-900 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary" />
                    <input type="text" required placeholder="Pincode" value={newAddr.pincode} onChange={e => setNewAddr({...newAddr, pincode: e.target.value})} className="w-full border border-slate-300 bg-white text-slate-900 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary" />
                    <button type="submit" className="px-4 py-2 bg-primary text-white rounded">Save Address</button>
                    <button type="button" onClick={() => setShowAddressForm(false)} className="px-4 py-2 ml-2">Cancel</button>
                  </form>
                )}

                <button onClick={() => setStep(2)} disabled={addresses.length === 0} className="w-full bg-primary text-white py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
                  Continue to Order Review <ArrowRight size={16} />
                </button>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="step-2" className="p-6 sm:p-10">
                <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
                  <CheckCircle2 className="text-primary" /> Review Order Items
                </h2>

                <div className="space-y-4 mb-6">
                  {items.map((item) => (
                    <div key={item.medicine.id} className="flex justify-between items-center border border-slate-200 p-4 rounded-2xl">
                      <div>
                        <h4 className="font-bold text-slate-900">{item.medicine.name}</h4>
                        <p className="text-xs text-slate-500">{item.medicine.brand} • Qty: {item.quantity}</p>
                        {(item.medicine.prescriptionRequired || item.medicine.drugSchedule === "H" || item.medicine.drugSchedule === "H1") && (
                          <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                            Schedule {item.medicine.drugSchedule || "H"} • Rx Required
                          </span>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-slate-900">₹{item.medicine.price * item.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Real Prescription Selection & Inline Upload */}
                {hasPrescriptionItems && (
                  <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-3xl mb-8 space-y-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="text-amber-600 w-5 h-5 shrink-0 mt-0.5" />
                      <div>
                        <h3 className="font-bold text-sm text-amber-950">
                          Doctor&apos;s Prescription Required
                        </h3>
                        <p className="text-xs text-amber-800 mt-0.5">
                          Indian drug regulations require a registered medical practitioner prescription for Schedule H/H1 items.
                        </p>
                      </div>
                    </div>

                    {/* Prescriptions Selector */}
                    {isLoadingPrescriptions ? (
                      <p className="text-xs text-amber-700 flex items-center gap-2 py-2">
                        <RefreshCw size={14} className="animate-spin" /> Loading your prescriptions...
                      </p>
                    ) : prescriptions.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-700 uppercase">Select from your uploaded prescriptions:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto">
                          {prescriptions.map((rx) => {
                            const isSelected = selectedPrescriptionId === rx.id;
                            const isApproved = rx.status === "APPROVED";
                            const isRejected = rx.status === "REJECTED";

                            return (
                              <label
                                key={rx.id}
                                className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition ${
                                  isSelected ? "bg-white border-primary shadow-xs" : "bg-white/60 border-amber-200 hover:bg-white"
                                }`}
                              >
                                <input
                                  type="radio"
                                  name="rxRadio"
                                  checked={isSelected}
                                  onChange={() => setSelectedPrescriptionId(rx.id)}
                                  className="mt-1 text-primary focus:ring-primary"
                                />
                                <div className="flex-1 min-w-0 text-xs">
                                  <div className="flex items-center justify-between gap-1">
                                    <span className="font-semibold text-slate-800 truncate">
                                      Rx #{rx.id.slice(0, 8)}
                                    </span>
                                    <span
                                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                                        isApproved
                                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                          : isRejected
                                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                                          : "bg-amber-50 text-amber-700 border border-amber-200"
                                      }`}
                                    >
                                      {rx.status}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-400 mt-0.5">
                                    {new Date(rx.created_at).toLocaleDateString()}
                                  </p>
                                  {rx.rejection_reason && (
                                    <p className="text-[10px] text-rose-600 mt-1 truncate">
                                      Reason: {rx.rejection_reason}
                                    </p>
                                  )}
                                  {rx.url && (
                                    <a
                                      href={rx.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline mt-1"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <Eye size={12} /> View File
                                    </a>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-amber-800 italic">
                        No prescriptions found on your account. Please upload one below.
                      </p>
                    )}

                    {/* Inline Upload Option */}
                    <div className="pt-2 border-t border-amber-200/80">
                      <label className="block text-xs font-bold text-slate-700 mb-1.5">
                        Or Upload a New Prescription Document:
                      </label>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          onChange={handleInlineRxUpload}
                          id="inlineRxFile"
                          className="hidden"
                          disabled={isUploadingRx}
                        />
                        <label
                          htmlFor="inlineRxFile"
                          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl cursor-pointer transition shadow-xs disabled:opacity-50"
                        >
                          {isUploadingRx ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              <span>Validating &amp; Uploading...</span>
                            </>
                          ) : (
                            <>
                              <Upload size={14} />
                              <span>Choose File (PDF/Image)</span>
                            </>
                          )}
                        </label>
                        <span className="text-[11px] text-slate-500">Max size: 5MB</span>
                      </div>
                    </div>

                    {/* Prescription Status Explanation */}
                    {selectedRx && (
                      <div className="p-3 bg-white rounded-2xl border border-slate-200 text-xs">
                        {selectedRx.status === "APPROVED" ? (
                          <div className="flex items-center gap-2 text-emerald-700 font-medium">
                            <Check size={16} />
                            <span>Prescription Approved! Your order will be confirmed immediately without dispatch delay.</span>
                          </div>
                        ) : selectedRx.status === "PENDING" ? (
                          <div className="flex items-center gap-2 text-amber-800">
                            <AlertTriangle size={16} className="text-amber-600" />
                            <span>Prescription is pending verification. Your order will be created under <strong>PENDING PRESCRIPTION APPROVAL</strong> and reviewed by our licensed pharmacists prior to packing.</span>
                          </div>
                        ) : (
                          <div className="text-rose-700 font-medium">
                            ⚠️ This prescription was rejected ({selectedRx.rejection_reason}). Please upload or select a valid prescription.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(1)} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl font-bold text-slate-700 transition">
                    Back
                  </button>
                  <button
                    onClick={handleValidateOrder}
                    disabled={isValidating || (hasPrescriptionItems && (!selectedPrescriptionId || selectedRx?.status === "REJECTED"))}
                    className="flex-1 bg-primary hover:bg-primary-dark text-white py-3 rounded-2xl font-bold flex items-center justify-center transition disabled:opacity-50"
                  >
                    {isValidating ? "Validating Cart & Prescription..." : "Continue to Payment"}
                  </button>
                </div>
              </motion.div>
            )}

            {step === 3 && validationSummary && (
              <motion.div key="step-3" className="p-6 sm:p-10">
                <h2 className="text-2xl font-black mb-6 flex items-center gap-2">
                  <Lock className="text-primary" /> Secure Payment
                </h2>
                
                <div className="p-4 bg-slate-50 border rounded-2xl mb-8 text-sm">
                  <div className="flex justify-between mb-2"><span>Subtotal</span><span>₹{validationSummary.subtotal}</span></div>
                  {validationSummary.mrp_discount > 0 && <div className="flex justify-between mb-2 text-green-600"><span>MRP Savings</span><span>-₹{validationSummary.mrp_discount}</span></div>}
                  {validationSummary.coupon_discount > 0 && <div className="flex justify-between mb-2 text-green-600"><span>Coupon Applied</span><span>-₹{validationSummary.coupon_discount}</span></div>}
                  <div className="flex justify-between mb-2"><span>Delivery</span><span>{validationSummary.delivery_fee === 0 ? "FREE" : `₹${validationSummary.delivery_fee}`}</span></div>
                  <div className="flex justify-between pt-2 border-t font-bold text-lg"><span>Total Amount</span><span className="text-primary">₹{validationSummary.total_amount}</span></div>
                </div>

                <div className="mb-6 space-y-3">
                  <h3 className="font-bold">Select Payment Method</h3>
                  <label className={`flex gap-4 p-4 rounded-2xl border-2 cursor-pointer ${paymentMethod === 'UPI' ? 'border-primary bg-green-50' : 'border-slate-200'}`}>
                    <input type="radio" checked={paymentMethod === 'UPI'} onChange={() => setPaymentMethod('UPI')} />
                    <span>UPI (GPay, PhonePe, BHIM, Paytm and others)</span>
                  </label>
                  <label className={`flex gap-4 p-4 rounded-2xl border-2 cursor-pointer ${paymentMethod === 'CARDS' ? 'border-primary bg-green-50' : 'border-slate-200'}`}>
                    <input type="radio" checked={paymentMethod === 'CARDS'} onChange={() => setPaymentMethod('CARDS')} />
                    <span>Cards / Netbanking</span>
                  </label>
                  <label className={`flex gap-4 p-4 rounded-2xl border-2 cursor-pointer ${paymentMethod === 'COD' ? 'border-primary bg-green-50' : 'border-slate-200'}`}>
                    <input type="radio" checked={paymentMethod === 'COD'} onChange={() => setPaymentMethod('COD')} />
                    <span>Cash on Delivery (COD)</span>
                  </label>
                </div>

                {hasPrescriptionItems && selectedRx?.status === "PENDING" && (
                  <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 leading-relaxed">
                    ℹ️ <strong>Pharmacist Notice:</strong> Because your prescription is awaiting pharmacist review, your order will be reserved. Payment will be finalized once our clinical team verifies your prescription.
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(2)} className="px-6 py-3 bg-slate-100 hover:bg-slate-200 rounded-2xl font-bold text-slate-700 transition">
                    Back
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={isProcessing}
                    className="flex-1 bg-primary hover:bg-primary-dark text-white py-3 rounded-2xl font-bold shadow-xs transition disabled:opacity-50"
                  >
                    {isProcessing ? "Processing..." : `Place Order (₹${validationSummary.total_amount})`}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
