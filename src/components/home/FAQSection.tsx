import { ChevronDown, HelpCircle } from "lucide-react";

const faqs = [
  {
    q: "Are generic medicines just as safe and effective as branded medicines?",
    a: "Absolutely yes. Generic medicines contain the exact same active pharmaceutical ingredient (API), chemical composition, dosage, strength, and therapeutic bioequivalence as their expensive branded counterparts. They are manufactured in certified WHO-GMP laboratories under stringent quality testing, costing up to 80% less solely because generic companies do not incur high marketing or brand sponsorship costs.",
  },
  {
    q: "Do I need a doctor's prescription to order from MediQuick?",
    a: "Prescriptions are required strictly for Schedule H, H1, and X prescription medications (such as antibiotics, blood pressure, and anti-diabetic formulations) as mandated by Indian drug regulations. You can easily take a photo or upload a PDF of your prescription during checkout. Over-the-counter (OTC) products like vitamin supplements, skin balms, and antiseptic soaps do not require a prescription.",
  },
  {
    q: "How fast is express medicine delivery?",
    a: "In major metro areas (including Mumbai, Delhi NCR, Bengaluru, Hyderabad, and Pune), we offer 2-hour express delivery. For other tier-2 and tier-3 cities across India, orders are dispatched within 24 hours via temperature-controlled courier networks, typically arriving in 1 to 2 business days.",
  },
  {
    q: "Can I pay using Cash on Delivery (COD)?",
    a: "Yes! Cash on Delivery (COD) is available on all eligible medicine and wellness orders up to ₹5,000 across India. When your delivery partner arrives, you can pay via cash or scan a dynamic UPI QR code on the spot.",
  },
  {
    q: "What is the return and refund policy if I receive the wrong item?",
    a: "MediQuick offers a 7-day hassle-free return and replacement policy. If any item is damaged during transit, expired, or incorrectly supplied, simply click 'Return Order' under your Account dashboard. Our courier will pick it up, and an instant refund or replacement will be initiated immediately.",
  },
];

export default function FAQSection() {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-1.5 bg-green-50 text-primary border border-green-200 px-3 py-1 rounded-full text-xs font-bold mb-2">
            <HelpCircle size={14} />
            <span>KNOWLEDGE BASE</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-500 text-sm mt-2">
            Everything you need to know about generic medicines, safety standards, and deliveries
          </p>
        </div>

        <div className="w-full space-y-3.5">
          {faqs.map((faq, i) => (
            <details
              key={i}
              name="faq"
              className="group border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs open:border-primary/50 open:shadow-md transition-all"
            >
              <summary className="flex items-center justify-between py-4 px-6 font-bold text-left text-sm sm:text-base text-slate-800 hover:text-primary transition-colors cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                <span>{faq.q}</span>
                <ChevronDown className="h-5 w-5 text-slate-400 shrink-0 transition-transform duration-200 ml-4 group-open:rotate-180" />
              </summary>
              <div className="px-6 pb-5 pt-1 border-t border-slate-100/80 text-slate-600 text-xs sm:text-sm leading-relaxed">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
