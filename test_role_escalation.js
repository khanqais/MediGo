require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function runTest() {
  console.log("=== Security Test: Role Escalation Prevention ===");

  // 1. Sign up a new test user
  const email = `user${Date.now()}@testdomain.com`;
  const password = "TestPassword123!";
  
  console.log(`\n[1/4] Signing up test user (${email})...`);
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: "Original Name",
      }
    }
  });

  if (authError) {
    console.error("❌ Sign up failed:", authError.message);
    return;
  }
  
  const userId = authData.user.id;
  console.log("✅ User created with ID:", userId);

  // 2. Read the current profile
  console.log("\n[2/4] Fetching current profile...");
  const { data: profile1, error: fetchError1 } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', userId)
    .single();

  if (fetchError1) {
    console.error("❌ Fetch failed:", fetchError1.message);
    return;
  }
  console.log("   Current profile:", profile1);

  // 3. Attempt to maliciously update role to 'admin' while changing full_name
  console.log("\n[3/4] Maliciously updating role to 'admin' and full_name to 'Hacked Name'...");
  const { data: updateData, error: updateError } = await supabase
    .from('profiles')
    .update({ 
      role: 'admin', 
      full_name: 'Hacked Name' 
    })
    .eq('id', userId)
    .select()
    .single();

  if (updateError) {
    console.error("❌ Update failed:", updateError.message);
    return;
  }

  // 4. Read back to confirm result
  console.log("\n[4/4] Verifying the result in database...");
  console.log("   Resulting profile:", updateData);

  if (updateData.role === 'customer' && updateData.full_name === 'Hacked Name') {
    console.log("\n✅ SUCCESS: The trigger correctly rejected the role escalation while allowing the valid full_name update!");
  } else {
    console.log("\n❌ FAILED: The role escalation was not prevented (or the valid update was rejected).");
  }
}

runTest();
