export const siteConfig = {
  name: "MediQuick",
  shortName: "MediQuick",
  description: "India's trusted online generic pharmacy delivering 100% genuine WHO-GMP certified medicines with up to 80% savings directly to your home.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  
  // Delivery Fee Configuration (Shared between CartStore and Order APIs)
  delivery: {
    freeThreshold: 499,
    standardFee: 40,
  },

  // Statutory Drug License & Compliance
  compliance: {
    drugLicenseNumber: process.env.NEXT_PUBLIC_DRUG_LICENSE_NO || "PENDING-DRUG-LICENSE-NUMBER",
    issuingAuthority: process.env.NEXT_PUBLIC_LICENSING_AUTHORITY || "PENDING-LICENSING-AUTHORITY",
    pharmacistAssistanceContact: process.env.NEXT_PUBLIC_SUPPORT_PHONE || "+91 1800-000-0000",
    supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "care@example.com",
    registeredEntity: process.env.NEXT_PUBLIC_REGISTERED_ENTITY || "PENDING-REGISTERED-ENTITY-NAME",
  },

  // Mandatory Indian Medical Disclaimer
  medicalDisclaimer: 
    "Statutory Medical Disclaimer: The contents of MediQuick are for informational and educational purposes only and are not intended to be a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of a qualified physician or registered medical practitioner with any questions you may have regarding a medical condition. Never disregard professional medical advice or delay in seeking it because of something you have read on this website.",
};

export const FREE_DELIVERY_THRESHOLD = siteConfig.delivery.freeThreshold;
export const STANDARD_DELIVERY_FEE = siteConfig.delivery.standardFee;
