"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HelpCircle } from "lucide-react";

const faqs = [
  {
    q: "Are generic medicines just as safe and effective as branded medicines?",
    a: "Yes. Generic medicines contain the exact same active pharmaceutical ingredient (API), chemical composition, dosage, strength, and therapeutic bioequivalence as their branded counterparts. They are manufactured in certified WHO-GMP laboratories under stringent quality testing, costing up to 80% less because generic manufacturers do not incur commercial marketing or brand promotion expenses.",
  },
  {
    q: "Do I need a doctor prescription to order medicines?",
    a: "Prescriptions are strictly required for Schedule H, H1, and X medications (such as antibiotics, cardiovascular, and anti-diabetic formulations) as mandated by the Drugs and Cosmetics Act. You can attach a photo or PDF of your doctor prescription during checkout. Over-the-counter (OTC) products do not require a prescription.",
  },
  {
    q: "How does the pharmacist verification process work?",
    a: "Once an order with prescription items is submitted, our licensed clinical pharmacist (Dr. Rajesh Sharma, Reg. #MH-PH-74892) verifies the doctor credentials, patient details, dosage, and drug interactions within 15 minutes before the dispensary prepares the parcel.",
  },
  {
    q: "How are temperature-sensitive pharmaceuticals packaged?",
    a: "Medicines requiring temperature control (like insulin, specific eye drops, and biologic agents) are packed in insulated cold-chain foil pouches with calibrated gel packs to maintain the 2°C to 8°C cold chain until doorstep delivery.",
  },
  {
    q: "What payment methods are supported?",
    a: "We support instant UPI (Google Pay, PhonePe, Paytm, BHIM, CRED), all major debit and credit cards, net banking, and Cash on Delivery (COD) for eligible pin codes across India.",
  },
];

export default function FAQSection() {
  return (
    <section className="py-14 bg-background border-b border-border">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-left mb-8">
          <div className="inline-flex items-center gap-1.5 bg-muted text-foreground px-2.5 py-1 rounded-sm text-xs font-semibold border border-border mb-2">
            <HelpCircle size={14} className="text-primary" />
            <span>Pharmacy guide</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground">
            Frequently asked questions
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Statutory safety standards, pharmacist verification, and prescription ordering explained
          </p>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-2.5">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="blister-card rounded-md border border-border bg-card px-4"
            >
              <AccordionTrigger className="font-heading font-bold text-xs sm:text-sm text-foreground hover:no-underline py-3.5 text-left">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-xs sm:text-sm text-muted-foreground leading-relaxed pt-1 pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
