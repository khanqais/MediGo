const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
async function setupStorage() {
  const { data, error } = await supabase.storage.createBucket('prescriptions', {
    public: false,
    fileSizeLimit: 5242880, // 5MB
    allowedMimeTypes: ['image/png', 'image/jpeg', 'application/pdf']
  });
  if (error && error.message !== 'The resource already exists') {
    console.error("Bucket creation failed:", error);
  } else {
    console.log("Bucket 'prescriptions' ready.");
  }
}
setupStorage();
