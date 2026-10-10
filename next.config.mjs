/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile @supabase/auth-js to fix Unicode em-dash in comments
  // causing SyntaxError in webpack eval-source-map dev mode
  transpilePackages: ['@supabase/auth-js'],
};

export default nextConfig;
