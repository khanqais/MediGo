-- Migration: 00000000000000_initial_schema.sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Profiles table
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    phone TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'admin')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Addresses table
CREATE TABLE public.addresses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    address_line_1 TEXT NOT NULL,
    address_line_2 TEXT,
    city TEXT NOT NULL,
    state TEXT NOT NULL,
    postal_code TEXT NOT NULL,
    landmark TEXT,
    is_default BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Categories table
CREATE TABLE public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    image_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Medicines table
CREATE TABLE public.medicines (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    generic_name TEXT,
    description TEXT,
    category_id UUID REFERENCES public.categories(id),
    brand TEXT,
    price DECIMAL(10, 2) NOT NULL,
    mrp DECIMAL(10, 2) NOT NULL,
    discount_percentage INTEGER DEFAULT 0,
    image_url TEXT,
    images JSONB DEFAULT '[]'::jsonb,
    prescription_required BOOLEAN DEFAULT false,
    dosage TEXT,
    composition TEXT,
    manufacturer TEXT,
    pack_size TEXT,
    directions TEXT,
    warnings TEXT,
    is_active BOOLEAN DEFAULT true,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_medicines_slug ON public.medicines(slug);
CREATE INDEX idx_medicines_category ON public.medicines(category_id);
CREATE INDEX idx_medicines_brand ON public.medicines(brand);
CREATE INDEX idx_medicines_is_active ON public.medicines(is_active);

-- Inventory table
CREATE TABLE public.inventory (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE UNIQUE NOT NULL,
    stock_quantity INTEGER DEFAULT 0 CHECK (stock_quantity >= 0),
    reserved_quantity INTEGER DEFAULT 0 CHECK (reserved_quantity >= 0),
    reorder_level INTEGER DEFAULT 10,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Orders table
CREATE TABLE public.orders (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    address_snapshot JSONB NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    discount DECIMAL(10, 2) DEFAULT 0,
    delivery_fee DECIMAL(10, 2) DEFAULT 0,
    tax DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')),
    payment_status TEXT DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Order Items table
CREATE TABLE public.order_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    medicine_id UUID REFERENCES public.medicines(id),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    price DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Prescriptions table
CREATE TABLE public.prescriptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id),
    order_id UUID REFERENCES public.orders(id),
    file_path TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    reviewed_by UUID REFERENCES public.profiles(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Payments table
CREATE TABLE public.payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id),
    razorpay_order_id TEXT,
    razorpay_payment_id TEXT,
    razorpay_signature TEXT,
    amount DECIMAL(10, 2) NOT NULL,
    currency TEXT DEFAULT 'INR',
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS Setup (Row Level Security)

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medicines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Addresses Policies
CREATE POLICY "Users can view own addresses" ON public.addresses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own addresses" ON public.addresses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own addresses" ON public.addresses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own addresses" ON public.addresses FOR DELETE USING (auth.uid() = user_id);

-- Categories Policies
CREATE POLICY "Public can view active categories" ON public.categories FOR SELECT USING (is_active = true);

-- Medicines Policies
CREATE POLICY "Public can view active medicines" ON public.medicines FOR SELECT USING (is_active = true);

-- Orders Policies
CREATE POLICY "Users can view own orders" ON public.orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own orders" ON public.orders FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Order Items Policies
CREATE POLICY "Users can view own order items" ON public.order_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);
CREATE POLICY "Users can create own order items" ON public.order_items FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
);

-- Prescriptions Policies
CREATE POLICY "Users can view own prescriptions" ON public.prescriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own prescriptions" ON public.prescriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trigger to update updated_at timestamps automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_addresses_updated_at BEFORE UPDATE ON public.addresses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medicines_updated_at BEFORE UPDATE ON public.medicines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON public.inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payments_updated_at BEFORE UPDATE ON public.payments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user registration from Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- Migration: 00000000000001_security_fixes.sql
-- 1. Prevent Role Escalation via Trigger
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Prevent role escalation unless performed by the service_role or a superuser.
    -- PostgREST sets the role to 'authenticated' or 'anon' for client requests.
    -- The service_role key sets it to 'service_role'.
    IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
      NEW.role = OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- 2. Remove client-side order insertion policy
DROP POLICY IF EXISTS "Users can create own orders" ON public.orders;

-- 3. Add public read access to inventory
CREATE POLICY "Public can view inventory" ON public.inventory FOR SELECT USING (true);


-- Migration: 00000000000002_payments.sql
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'payment_method') THEN
        ALTER TABLE public.orders ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'COD' CHECK (payment_method IN ('ONLINE', 'COD'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'stock_restored') THEN
        ALTER TABLE public.orders ADD COLUMN stock_restored BOOLEAN NOT NULL DEFAULT false;
    END IF;
END $$;

-- Drop and recreate the CHECK constraint for payments.status to include 'REFUNDED'
DO $$
BEGIN
    ALTER TABLE public.payments DROP CONSTRAINT IF EXISTS payments_status_check;
    ALTER TABLE public.payments ADD CONSTRAINT payments_status_check CHECK (status IN ('PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'));
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- Unique constraints and indexes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_razorpay_order_id_key') THEN
        ALTER TABLE public.payments ADD CONSTRAINT payments_razorpay_order_id_key UNIQUE (razorpay_order_id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_razorpay_payment_id_key') THEN
        ALTER TABLE public.payments ADD CONSTRAINT payments_razorpay_payment_id_key UNIQUE (razorpay_payment_id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_order_id ON public.payments(order_id);

-- Webhook events table
CREATE TABLE IF NOT EXISTS public.webhook_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT,
    processed_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;
-- No policies, meaning only service role has access

-- Restore order stock function
CREATE OR REPLACE FUNCTION public.restore_order_stock(p_order_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_record RECORD;
    v_item RECORD;
BEGIN
    -- Lock the order row
    SELECT * INTO v_order_record FROM public.orders WHERE id = p_order_id FOR UPDATE;
    
    IF v_order_record IS NULL THEN
        RETURN false;
    END IF;
    
    IF v_order_record.stock_restored THEN
        RETURN false;
    END IF;
    
    -- Restore stock for each item
    FOR v_item IN SELECT medicine_id, quantity FROM public.order_items WHERE order_id = p_order_id LOOP
        UPDATE public.inventory
        SET stock_quantity = stock_quantity + v_item.quantity,
            updated_at = now()
        WHERE medicine_id = v_item.medicine_id;
    END LOOP;
    
    -- Mark stock as restored
    UPDATE public.orders SET stock_restored = true, updated_at = now() WHERE id = p_order_id;
    
    RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.restore_order_stock(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restore_order_stock(UUID) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.restore_order_stock(UUID) FROM anon;

-- Mark payment success function
CREATE OR REPLACE FUNCTION public.mark_payment_success(p_razorpay_order_id TEXT, p_razorpay_payment_id TEXT, p_signature TEXT)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payment_record RECORD;
    v_order_status TEXT;
BEGIN
    -- Lock the payment row
    SELECT * INTO v_payment_record FROM public.payments WHERE razorpay_order_id = p_razorpay_order_id FOR UPDATE;
    
    IF v_payment_record IS NULL THEN
        RETURN false;
    END IF;
    
    IF v_payment_record.status = 'SUCCESS' THEN
        RETURN true; -- Idempotent
    END IF;
    
    -- Lock the order row
    SELECT status INTO v_order_status FROM public.orders WHERE id = v_payment_record.order_id FOR UPDATE;
    
    IF v_order_status IS NULL THEN
        RETURN false;
    END IF;
    
    -- Update payment
    UPDATE public.payments 
    SET status = 'SUCCESS',
        razorpay_payment_id = p_razorpay_payment_id,
        razorpay_signature = p_signature,
        updated_at = now()
    WHERE id = v_payment_record.id;
    
    -- Update order if not cancelled
    IF v_order_status != 'CANCELLED' THEN
        UPDATE public.orders
        SET payment_status = 'PAID',
            status = 'CONFIRMED',
            updated_at = now()
        WHERE id = v_payment_record.order_id;
    END IF;
    
    RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_payment_success(TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.mark_payment_success(TEXT, TEXT, TEXT) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_payment_success(TEXT, TEXT, TEXT) FROM anon;


-- Migration: 00000000000003_decrement_inventory.sql
-- Atomic inventory decrement function.
-- Uses a single UPDATE with a WHERE guard clause so that two concurrent
-- checkouts can never over-sell: the row-level lock acquired by UPDATE
-- serialises access, and the WHERE condition rejects the second caller
-- if stock has already dropped below the requested quantity.
--
-- Called from POST /api/orders as:
--   adminClient.rpc("decrement_inventory", { med_id: <uuid>, qty: <int> })
-- Returns TRUE if the deduction succeeded, FALSE if insufficient stock.

CREATE OR REPLACE FUNCTION public.decrement_inventory(med_id UUID, qty INTEGER)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rows_affected INTEGER;
BEGIN
    UPDATE public.inventory
    SET stock_quantity = stock_quantity - qty,
        updated_at = now()
    WHERE medicine_id = med_id
      AND stock_quantity >= qty;

    GET DIAGNOSTICS rows_affected = ROW_COUNT;

    RETURN rows_affected > 0;
END;
$$;

-- Only the service role (admin client) should call this.
REVOKE EXECUTE ON FUNCTION public.decrement_inventory(UUID, INTEGER) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.decrement_inventory(UUID, INTEGER) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.decrement_inventory(UUID, INTEGER) FROM anon;


-- Migration: 00000000000004_phase1_legal_and_orders.sql
-- Phase 1 Migration: Legal Safety, Data Integrity, and Atomic Orders

-- 1. Add drug_schedule to medicines (OTC, H, H1, X)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'medicines' AND column_name = 'drug_schedule'
    ) THEN
        ALTER TABLE public.medicines 
        ADD COLUMN drug_schedule TEXT NOT NULL DEFAULT 'OTC' 
        CHECK (drug_schedule IN ('OTC', 'H', 'H1', 'X'));
        
        -- Backfill from prescription_required
        UPDATE public.medicines 
        SET drug_schedule = 'H' 
        WHERE prescription_required = true;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_medicines_drug_schedule ON public.medicines(drug_schedule);

-- 2. Add prescription_id to orders
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'orders' AND column_name = 'prescription_id'
    ) THEN
        ALTER TABLE public.orders 
        ADD COLUMN prescription_id UUID REFERENCES public.prescriptions(id) ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_orders_prescription_id ON public.orders(prescription_id);

-- 3. Update orders.status CHECK constraint to include 'PENDING_PRESCRIPTION_APPROVAL'
DO $$
BEGIN
    ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
    CHECK (status IN (
        'PENDING', 
        'PENDING_PRESCRIPTION_APPROVAL', 
        'CONFIRMED', 
        'PROCESSING', 
        'PACKED', 
        'SHIPPED', 
        'OUT_FOR_DELIVERY', 
        'DELIVERED', 
        'CANCELLED'
    ));
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- 4. Atomic order creation transaction function
CREATE OR REPLACE FUNCTION public.create_order_transaction(
    p_user_id UUID,
    p_address_snapshot JSONB,
    p_subtotal DECIMAL,
    p_discount DECIMAL,
    p_delivery_fee DECIMAL,
    p_tax DECIMAL,
    p_total_amount DECIMAL,
    p_status TEXT,
    p_payment_status TEXT,
    p_payment_method TEXT,
    p_prescription_id UUID,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_order_record RECORD;
    v_item JSONB;
    v_med_id UUID;
    v_qty INTEGER;
    v_price DECIMAL;
    v_med_name TEXT;
    v_med_active BOOLEAN;
    v_med_schedule TEXT;
    v_stock INTEGER;
BEGIN
    -- 1. Validate each medicine and verify/lock inventory
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_med_id := (v_item->>'medicine_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;
        v_price := (v_item->>'price')::DECIMAL;

        -- Verify medicine existence and active status
        SELECT name, is_active, drug_schedule 
        INTO v_med_name, v_med_active, v_med_schedule
        FROM public.medicines
        WHERE id = v_med_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Medicine not found: %', v_med_id;
        END IF;

        IF NOT v_med_active THEN
            RAISE EXCEPTION 'Medicine % is inactive and unavailable for purchase', v_med_name;
        END IF;

        IF v_med_schedule = 'X' THEN
            RAISE EXCEPTION 'Schedule X narcotics/controlled substances (%) cannot be ordered online as per Indian Drugs and Cosmetics Rules', v_med_name;
        END IF;

        -- Lock inventory row and verify stock
        SELECT stock_quantity INTO v_stock
        FROM public.inventory
        WHERE medicine_id = v_med_id
        FOR UPDATE;

        IF NOT FOUND OR v_stock < v_qty THEN
            RAISE EXCEPTION 'Insufficient stock for medicine: % (requested %, available %)', v_med_name, v_qty, COALESCE(v_stock, 0);
        END IF;

        -- Decrement stock atomically
        UPDATE public.inventory
        SET stock_quantity = stock_quantity - v_qty,
            updated_at = now()
        WHERE medicine_id = v_med_id;
    END LOOP;

    -- 2. Insert into orders table
    INSERT INTO public.orders (
        user_id,
        address_snapshot,
        subtotal,
        discount,
        delivery_fee,
        tax,
        total_amount,
        status,
        payment_status,
        payment_method,
        prescription_id
    ) VALUES (
        p_user_id,
        p_address_snapshot,
        p_subtotal,
        p_discount,
        p_delivery_fee,
        p_tax,
        p_total_amount,
        p_status,
        p_payment_status,
        p_payment_method,
        p_prescription_id
    )
    RETURNING id INTO v_order_id;

    -- 3. Insert order items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_med_id := (v_item->>'medicine_id')::UUID;
        v_qty := (v_item->>'quantity')::INTEGER;
        v_price := (v_item->>'price')::DECIMAL;

        INSERT INTO public.order_items (
            order_id,
            medicine_id,
            quantity,
            price,
            total
        ) VALUES (
            v_order_id,
            v_med_id,
            v_qty,
            v_price,
            v_price * v_qty
        );
    END LOOP;

    -- 4. If prescription_id is attached, link it to this order
    IF p_prescription_id IS NOT NULL THEN
        UPDATE public.prescriptions
        SET order_id = v_order_id
        WHERE id = p_prescription_id AND (order_id IS NULL OR order_id = v_order_id);
    END IF;

    -- 5. Return created order record
    SELECT * INTO v_order_record FROM public.orders WHERE id = v_order_id;
    RETURN to_jsonb(v_order_record);
END;
$$;

-- Permissions: revoke from public/authenticated/anon (service_role only)
REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, JSONB) FROM anon;


-- Migration: 00000000000005_phase2_roles_and_admin.sql
-- Phase 2 Migration: User Roles, Staff RLS, and Order Status History

-- 1. Extend profiles.role CHECK constraint to: customer, admin, pharmacist, delivery
DO $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('customer', 'admin', 'pharmacist', 'delivery'));
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

-- 2. Ensure prevent_role_escalation trigger function is up to date
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Prevent role escalation unless performed by the service_role or a superuser.
    -- PostgREST sets the role to 'authenticated' or 'anon' for client requests.
    -- The service_role key sets it to 'service_role'.
    IF current_user NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
      NEW.role = OLD.role;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_role_update ON public.profiles;
CREATE TRIGGER check_role_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_role_escalation();

-- 3. Create helper function for role lookup in RLS policies (SECURITY DEFINER avoids recursion on profiles)
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- 4. Create order_status_history table
CREATE TABLE IF NOT EXISTS public.order_status_history (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
    status TEXT NOT NULL,
    changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_order_status_history_order_id ON public.order_status_history(order_id);
CREATE INDEX IF NOT EXISTS idx_order_status_history_created_at ON public.order_status_history(created_at);

ALTER TABLE public.order_status_history ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies for order_status_history
DROP POLICY IF EXISTS "Users can view own order status history" ON public.order_status_history;
CREATE POLICY "Users can view own order status history" ON public.order_status_history
FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_status_history.order_id AND orders.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Staff can view all order status history" ON public.order_status_history;
CREATE POLICY "Staff can view all order status history" ON public.order_status_history
FOR SELECT USING (
    public.current_user_role() IN ('admin', 'pharmacist', 'delivery')
);

DROP POLICY IF EXISTS "Staff can insert order status history" ON public.order_status_history;
CREATE POLICY "Staff can insert order status history" ON public.order_status_history
FOR INSERT WITH CHECK (
    public.current_user_role() IN ('admin', 'pharmacist', 'delivery')
);

-- 6. Additional Staff RLS Policies across tables

-- Profiles
DROP POLICY IF EXISTS "Staff can view all profiles" ON public.profiles;
CREATE POLICY "Staff can view all profiles" ON public.profiles
FOR SELECT USING (
    public.current_user_role() IN ('admin', 'pharmacist')
);

DROP POLICY IF EXISTS "Admin can update all profiles" ON public.profiles;
CREATE POLICY "Admin can update all profiles" ON public.profiles
FOR UPDATE USING (
    public.current_user_role() = 'admin'
);

-- Orders
DROP POLICY IF EXISTS "Staff can view all orders" ON public.orders;
CREATE POLICY "Staff can view all orders" ON public.orders
FOR SELECT USING (
    public.current_user_role() IN ('admin', 'pharmacist', 'delivery')
);

DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
CREATE POLICY "Staff can update orders" ON public.orders
FOR UPDATE USING (
    public.current_user_role() IN ('admin', 'pharmacist', 'delivery')
);

-- Order Items
DROP POLICY IF EXISTS "Staff can view all order items" ON public.order_items;
CREATE POLICY "Staff can view all order items" ON public.order_items
FOR SELECT USING (
    public.current_user_role() IN ('admin', 'pharmacist', 'delivery')
);

-- Prescriptions
DROP POLICY IF EXISTS "Staff can view all prescriptions" ON public.prescriptions;
CREATE POLICY "Staff can view all prescriptions" ON public.prescriptions
FOR SELECT USING (
    public.current_user_role() IN ('admin', 'pharmacist')
);

DROP POLICY IF EXISTS "Staff can update prescriptions" ON public.prescriptions;
CREATE POLICY "Staff can update prescriptions" ON public.prescriptions
FOR UPDATE USING (
    public.current_user_role() IN ('admin', 'pharmacist')
);

-- Medicines
DROP POLICY IF EXISTS "Staff can view all medicines" ON public.medicines;
CREATE POLICY "Staff can view all medicines" ON public.medicines
FOR SELECT USING (
    public.current_user_role() IN ('admin', 'pharmacist')
);

DROP POLICY IF EXISTS "Staff can insert medicines" ON public.medicines;
CREATE POLICY "Staff can insert medicines" ON public.medicines
FOR INSERT WITH CHECK (
    public.current_user_role() IN ('admin', 'pharmacist')
);

DROP POLICY IF EXISTS "Staff can update medicines" ON public.medicines;
CREATE POLICY "Staff can update medicines" ON public.medicines
FOR UPDATE USING (
    public.current_user_role() IN ('admin', 'pharmacist')
);

DROP POLICY IF EXISTS "Admin can delete medicines" ON public.medicines;
CREATE POLICY "Admin can delete medicines" ON public.medicines
FOR DELETE USING (
    public.current_user_role() = 'admin'
);

-- Inventory
DROP POLICY IF EXISTS "Staff can insert inventory" ON public.inventory;
CREATE POLICY "Staff can insert inventory" ON public.inventory
FOR INSERT WITH CHECK (
    public.current_user_role() IN ('admin', 'pharmacist')
);

DROP POLICY IF EXISTS "Staff can update inventory" ON public.inventory;
CREATE POLICY "Staff can update inventory" ON public.inventory
FOR UPDATE USING (
    public.current_user_role() IN ('admin', 'pharmacist')
);


-- Migration: 00000000000006_phase4_batches_and_coupons.sql
-- Phase 4 Migration: Inventory batches, FEFO, and Coupons

-- 1. Create inventory_batches table
CREATE TABLE IF NOT EXISTS public.inventory_batches (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    medicine_id UUID REFERENCES public.medicines(id) ON DELETE CASCADE,
    batch_number TEXT NOT NULL,
    mfg_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(medicine_id, batch_number)
);

CREATE INDEX IF NOT EXISTS idx_inventory_batches_medicine_id ON public.inventory_batches(medicine_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_expiry_date ON public.inventory_batches(expiry_date);

ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active batches" ON public.inventory_batches FOR SELECT USING (true);
CREATE POLICY "Staff can manage batches" ON public.inventory_batches FOR ALL USING (
    public.current_user_role() IN ('admin', 'pharmacist')
);

CREATE TRIGGER update_inventory_batches_updated_at 
BEFORE UPDATE ON public.inventory_batches 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. Add batch_id to order_items
ALTER TABLE public.order_items 
ADD COLUMN batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE SET NULL;

-- 3. Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('PERCENTAGE', 'FLAT')),
    value DECIMAL(10, 2) NOT NULL,
    min_order_amount DECIMAL(10, 2) DEFAULT 0,
    max_discount_amount DECIMAL(10, 2),
    valid_from TIMESTAMP WITH TIME ZONE DEFAULT now(),
    valid_to TIMESTAMP WITH TIME ZONE,
    usage_limit INTEGER,
    per_user_limit INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coupons_code ON public.coupons(code);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active coupons" ON public.coupons FOR SELECT USING (is_active = true);
CREATE POLICY "Admin can manage coupons" ON public.coupons FOR ALL USING (public.current_user_role() = 'admin');

CREATE TRIGGER update_coupons_updated_at 
BEFORE UPDATE ON public.coupons 
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. Create coupon_redemptions table
CREATE TABLE IF NOT EXISTS public.coupon_redemptions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    coupon_id UUID REFERENCES public.coupons(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
    discount_amount DECIMAL(10, 2) NOT NULL,
    redeemed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_user_id ON public.coupon_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_coupon_redemptions_coupon_id ON public.coupon_redemptions(coupon_id);

ALTER TABLE public.coupon_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own redemptions" ON public.coupon_redemptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all redemptions" ON public.coupon_redemptions FOR SELECT USING (public.current_user_role() = 'admin');
-- Notice: Redemptions are inserted server-side by service_role, no insert policy for users.

-- 5. Add coupon_id to orders
ALTER TABLE public.orders ADD COLUMN coupon_id UUID REFERENCES public.coupons(id) ON DELETE SET NULL;

-- 6. Replace create_order_transaction to implement FEFO and coupons
DROP FUNCTION IF EXISTS public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, UUID, JSONB);

CREATE OR REPLACE FUNCTION public.create_order_transaction(
    p_user_id UUID,
    p_address_snapshot JSONB,
    p_subtotal DECIMAL,
    p_discount DECIMAL,
    p_delivery_fee DECIMAL,
    p_tax DECIMAL,
    p_total_amount DECIMAL,
    p_status TEXT,
    p_payment_status TEXT,
    p_payment_method TEXT,
    p_prescription_id UUID,
    p_coupon_id UUID,
    p_coupon_discount DECIMAL,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_order_record RECORD;
    v_item JSONB;
    v_med_id UUID;
    v_requested_qty INTEGER;
    v_price DECIMAL;
    v_med_name TEXT;
    v_med_active BOOLEAN;
    v_med_schedule TEXT;
    
    v_batch_record RECORD;
    v_remaining_qty INTEGER;
    v_deduct_qty INTEGER;
BEGIN
    -- 1. Insert into orders table
    INSERT INTO public.orders (
        user_id,
        address_snapshot,
        subtotal,
        discount,
        delivery_fee,
        tax,
        total_amount,
        status,
        payment_status,
        payment_method,
        prescription_id,
        coupon_id
    ) VALUES (
        p_user_id,
        p_address_snapshot,
        p_subtotal,
        p_discount,
        p_delivery_fee,
        p_tax,
        p_total_amount,
        p_status,
        p_payment_status,
        p_payment_method,
        p_prescription_id,
        p_coupon_id
    )
    RETURNING id INTO v_order_id;

    -- 2. Validate, allocate batches (FEFO), and insert order items
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_med_id := (v_item->>'medicine_id')::UUID;
        v_requested_qty := (v_item->>'quantity')::INTEGER;
        v_price := (v_item->>'price')::DECIMAL;
        v_remaining_qty := v_requested_qty;

        -- Verify medicine existence and active status
        SELECT name, is_active, drug_schedule 
        INTO v_med_name, v_med_active, v_med_schedule
        FROM public.medicines
        WHERE id = v_med_id;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Medicine not found: %', v_med_id;
        END IF;

        IF NOT v_med_active THEN
            RAISE EXCEPTION 'Medicine % is inactive', v_med_name;
        END IF;

        IF v_med_schedule = 'X' THEN
            RAISE EXCEPTION 'Schedule X narcotics cannot be ordered online: %', v_med_name;
        END IF;

        -- FEFO Allocation
        -- Lock batches ordered by expiry_date ASC
        -- Only consider batches expiring after 90 days from today
        FOR v_batch_record IN 
            SELECT id, quantity 
            FROM public.inventory_batches
            WHERE medicine_id = v_med_id 
              AND quantity > 0
              AND expiry_date >= (CURRENT_DATE + INTERVAL '90 days')
            ORDER BY expiry_date ASC
            FOR UPDATE
        LOOP
            IF v_remaining_qty = 0 THEN
                EXIT;
            END IF;

            IF v_batch_record.quantity >= v_remaining_qty THEN
                v_deduct_qty := v_remaining_qty;
            ELSE
                v_deduct_qty := v_batch_record.quantity;
            END IF;

            -- Deduct from batch
            UPDATE public.inventory_batches
            SET quantity = quantity - v_deduct_qty,
                updated_at = now()
            WHERE id = v_batch_record.id;

            -- Insert split order_item
            INSERT INTO public.order_items (
                order_id,
                medicine_id,
                batch_id,
                quantity,
                price,
                total
            ) VALUES (
                v_order_id,
                v_med_id,
                v_batch_record.id,
                v_deduct_qty,
                v_price,
                v_price * v_deduct_qty
            );

            v_remaining_qty := v_remaining_qty - v_deduct_qty;
        END LOOP;

        IF v_remaining_qty > 0 THEN
            RAISE EXCEPTION 'Insufficient stock (or batches are within 90 days of expiry) for medicine: %', v_med_name;
        END IF;

        -- Keep public.inventory in sync!
        UPDATE public.inventory
        SET stock_quantity = stock_quantity - v_requested_qty,
            updated_at = now()
        WHERE medicine_id = v_med_id;
    END LOOP;

    -- 3. Link prescription if any
    IF p_prescription_id IS NOT NULL THEN
        UPDATE public.prescriptions
        SET order_id = v_order_id
        WHERE id = p_prescription_id AND (order_id IS NULL OR order_id = v_order_id);
    END IF;

    -- 4. Record coupon redemption if any
    IF p_coupon_id IS NOT NULL THEN
        INSERT INTO public.coupon_redemptions (
            coupon_id,
            user_id,
            order_id,
            discount_amount
        ) VALUES (
            p_coupon_id,
            p_user_id,
            v_order_id,
            p_coupon_discount
        );
    END IF;

    -- 5. Return created order record
    SELECT * INTO v_order_record FROM public.orders WHERE id = v_order_id;
    RETURN to_jsonb(v_order_record);
END;
$$;

-- Redeclare permissions for the updated signature
REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, UUID, DECIMAL, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, UUID, DECIMAL, JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, UUID, DECIMAL, JSONB) FROM anon;

-- 7. Replace restore_order_stock to restore back to batches
DROP FUNCTION IF EXISTS public.restore_order_stock(UUID);
CREATE OR REPLACE FUNCTION public.restore_order_stock(p_order_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
BEGIN
    FOR v_item IN 
        SELECT medicine_id, batch_id, quantity 
        FROM public.order_items 
        WHERE order_id = p_order_id
    LOOP
        -- Restore to specific batch if known
        IF v_item.batch_id IS NOT NULL THEN
            UPDATE public.inventory_batches
            SET quantity = quantity + v_item.quantity,
                updated_at = now()
            WHERE id = v_item.batch_id;
        END IF;

        -- Keep public.inventory in sync
        UPDATE public.inventory
        SET stock_quantity = stock_quantity + v_item.quantity,
            updated_at = now()
        WHERE medicine_id = v_item.medicine_id;
    END LOOP;
    RETURN true;
END;
$$;


-- Migration: 00000000000007_phase4_inventory_trigger.sql
-- 1. Backfill legacy batches for existing inventory
INSERT INTO public.inventory_batches (medicine_id, batch_number, mfg_date, expiry_date, quantity)
SELECT 
    i.medicine_id, 
    'LEGACY' AS batch_number, 
    CURRENT_DATE AS mfg_date, 
    CURRENT_DATE + INTERVAL '1 year' AS expiry_date, 
    i.stock_quantity
FROM public.inventory i
WHERE i.stock_quantity > 0
ON CONFLICT (medicine_id, batch_number) DO NOTHING;

-- 2. Add trigger to sync inventory table
CREATE OR REPLACE FUNCTION public.sync_inventory_from_batches()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update the stock_quantity in inventory table based on sum of active batches
        UPDATE public.inventory
        SET stock_quantity = (
            SELECT COALESCE(SUM(quantity), 0)
            FROM public.inventory_batches
            WHERE medicine_id = NEW.medicine_id
        ),
        updated_at = NOW()
        WHERE medicine_id = NEW.medicine_id;
        
        -- If inventory record doesn't exist, create it (useful for new medicines)
        IF NOT FOUND THEN
            INSERT INTO public.inventory (medicine_id, stock_quantity, reserved_quantity)
            VALUES (
                NEW.medicine_id, 
                (SELECT COALESCE(SUM(quantity), 0) FROM public.inventory_batches WHERE medicine_id = NEW.medicine_id), 
                0
            );
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update the stock_quantity in inventory table
        UPDATE public.inventory
        SET stock_quantity = (
            SELECT COALESCE(SUM(quantity), 0)
            FROM public.inventory_batches
            WHERE medicine_id = OLD.medicine_id
        ),
        updated_at = NOW()
        WHERE medicine_id = OLD.medicine_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS sync_inventory_batches_trigger ON public.inventory_batches;
CREATE TRIGGER sync_inventory_batches_trigger
AFTER INSERT OR UPDATE OF quantity OR DELETE ON public.inventory_batches
FOR EACH ROW
EXECUTE FUNCTION public.sync_inventory_from_batches();


-- Migration: 00000000000008_phase4_idempotent_and_limits.sql
-- 1. Add stock_restored_at to orders for idempotency
ALTER TABLE public.orders ADD COLUMN stock_restored_at TIMESTAMP WITH TIME ZONE;

-- 2. Create app_settings table to store configurable 90-day expiry
CREATE TABLE IF NOT EXISTS public.app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default 90 days
INSERT INTO public.app_settings (key, value, description)
VALUES ('inventory_expiry_buffer_days', '90'::JSONB, 'Number of days before expiry when a batch becomes unsellable')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS on app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can read app_settings" ON public.app_settings FOR SELECT USING (true);
CREATE POLICY "Admin can manage app_settings" ON public.app_settings FOR ALL USING (public.current_user_role() = 'admin');

-- 3. Update create_order_transaction to lock coupon and check limits, and use configurable buffer
DROP FUNCTION IF EXISTS public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, UUID, DECIMAL, JSONB);

CREATE OR REPLACE FUNCTION public.create_order_transaction(
    p_user_id UUID,
    p_address_snapshot JSONB,
    p_subtotal DECIMAL,
    p_discount DECIMAL,
    p_delivery_fee DECIMAL,
    p_tax DECIMAL,
    p_total_amount DECIMAL,
    p_status TEXT,
    p_payment_status TEXT,
    p_payment_method TEXT,
    p_prescription_id UUID,
    p_coupon_id UUID,
    p_coupon_discount DECIMAL,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_order_record RECORD;
    v_item JSONB;
    v_med_id UUID;
    v_requested_qty INTEGER;
    v_price DECIMAL;
    v_med_name TEXT;
    v_med_active BOOLEAN;
    v_med_schedule TEXT;
    
    v_batch_record RECORD;
    v_remaining_qty INTEGER;
    v_deduct_qty INTEGER;
    
    v_coupon_record RECORD;
    v_global_redemptions INTEGER;
    v_user_redemptions INTEGER;
    v_expiry_buffer_days INTEGER;
BEGIN
    -- Configurable expiry buffer
    SELECT COALESCE((value->>0)::INTEGER, 90) INTO v_expiry_buffer_days
    FROM public.app_settings WHERE key = 'inventory_expiry_buffer_days';
    IF v_expiry_buffer_days IS NULL THEN
        v_expiry_buffer_days := 90;
    END IF;

    -- Validate and lock coupon if provided
    IF p_coupon_id IS NOT NULL THEN
        SELECT * INTO v_coupon_record FROM public.coupons WHERE id = p_coupon_id FOR UPDATE;
        
        IF NOT FOUND OR NOT v_coupon_record.is_active THEN
            RAISE EXCEPTION 'Coupon is not valid or inactive';
        END IF;

        IF v_coupon_record.valid_from IS NOT NULL AND v_coupon_record.valid_from > NOW() THEN
            RAISE EXCEPTION 'Coupon is not valid yet';
        END IF;

        IF v_coupon_record.valid_to IS NOT NULL AND v_coupon_record.valid_to < NOW() THEN
            RAISE EXCEPTION 'Coupon has expired';
        END IF;

        IF v_coupon_record.usage_limit IS NOT NULL THEN
            SELECT COUNT(*) INTO v_global_redemptions FROM public.coupon_redemptions WHERE coupon_id = p_coupon_id;
            IF v_global_redemptions >= v_coupon_record.usage_limit THEN
                RAISE EXCEPTION 'Coupon usage limit reached';
            END IF;
        END IF;

        IF v_coupon_record.per_user_limit IS NOT NULL THEN
            SELECT COUNT(*) INTO v_user_redemptions FROM public.coupon_redemptions WHERE coupon_id = p_coupon_id AND user_id = p_user_id;
            IF v_user_redemptions >= v_coupon_record.per_user_limit THEN
                RAISE EXCEPTION 'Per-user coupon usage limit reached';
            END IF;
        END IF;
    END IF;

    -- 1. Insert into orders table
    INSERT INTO public.orders (
        user_id,
        address_snapshot,
        subtotal,
        discount,
        delivery_fee,
        tax,
        total_amount,
        status,
        payment_status,
        payment_method,
        prescription_id,
        coupon_id
    ) VALUES (
        p_user_id,
        p_address_snapshot,
        p_subtotal,
        p_discount,
        p_delivery_fee,
        p_tax,
        p_total_amount,
        p_status,
        p_payment_status,
        p_payment_method,
        p_prescription_id,
        p_coupon_id
    )
    RETURNING id INTO v_order_id;

    -- 2. Process each item and deduct from batches (FEFO)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_med_id := (v_item->>'medicine_id')::UUID;
        v_requested_qty := (v_item->>'quantity')::INTEGER;
        v_price := (v_item->>'price')::DECIMAL;
        v_remaining_qty := v_requested_qty;

        SELECT name, is_active, drug_schedule 
        INTO v_med_name, v_med_active, v_med_schedule
        FROM public.medicines 
        WHERE id = v_med_id FOR SHARE;

        IF NOT v_med_active THEN
            RAISE EXCEPTION 'Medicine % is no longer active', v_med_name;
        END IF;
        
        IF v_med_schedule = 'X' THEN
            RAISE EXCEPTION 'Schedule X drug (%) cannot be sold online', v_med_name;
        END IF;

        -- Loop through available batches in FEFO order
        FOR v_batch_record IN 
            SELECT * FROM public.inventory_batches 
            WHERE medicine_id = v_med_id 
            AND quantity > 0
            AND expiry_date >= CURRENT_DATE + (v_expiry_buffer_days || ' days')::INTERVAL
            ORDER BY expiry_date ASC
            FOR UPDATE
        LOOP
            IF v_remaining_qty <= 0 THEN
                EXIT;
            END IF;

            IF v_batch_record.quantity >= v_remaining_qty THEN
                v_deduct_qty := v_remaining_qty;
            ELSE
                v_deduct_qty := v_batch_record.quantity;
            END IF;

            -- Deduct from batch
            UPDATE public.inventory_batches 
            SET quantity = quantity - v_deduct_qty 
            WHERE id = v_batch_record.id;

            -- Insert order item specifically mapped to this batch
            INSERT INTO public.order_items (
                order_id,
                medicine_id,
                quantity,
                price,
                total,
                batch_id
            ) VALUES (
                v_order_id,
                v_med_id,
                v_deduct_qty,
                v_price,
                (v_deduct_qty * v_price),
                v_batch_record.id
            );

            v_remaining_qty := v_remaining_qty - v_deduct_qty;
        END LOOP;

        IF v_remaining_qty > 0 THEN
            RAISE EXCEPTION 'Insufficient sellable stock for medicine %', v_med_name;
        END IF;

        -- Deduct from materialized legacy inventory
        UPDATE public.inventory
        SET stock_quantity = stock_quantity - v_requested_qty
        WHERE medicine_id = v_med_id;

    END LOOP;

    -- 4. Record coupon redemption if any
    IF p_coupon_id IS NOT NULL THEN
        INSERT INTO public.coupon_redemptions (
            coupon_id,
            user_id,
            order_id,
            discount_amount
        ) VALUES (
            p_coupon_id,
            p_user_id,
            v_order_id,
            p_coupon_discount
        );
    END IF;

    -- 5. Return created order record
    SELECT * INTO v_order_record FROM public.orders WHERE id = v_order_id;
    RETURN to_jsonb(v_order_record);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, UUID, DECIMAL, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, UUID, DECIMAL, JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, UUID, DECIMAL, JSONB) FROM anon;

-- 4. Update restore_order_stock for idempotency
CREATE OR REPLACE FUNCTION public.restore_order_stock(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_order RECORD;
BEGIN
    -- Check idempotency and lock order
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;
    
    IF v_order.stock_restored_at IS NOT NULL THEN
        -- Already restored, perfectly idempotent
        RETURN TRUE;
    END IF;

    FOR v_item IN 
        SELECT medicine_id, quantity, batch_id 
        FROM public.order_items 
        WHERE order_id = p_order_id
    LOOP
        IF v_item.batch_id IS NOT NULL THEN
            UPDATE public.inventory_batches
            SET quantity = quantity + v_item.quantity
            WHERE id = v_item.batch_id;
        END IF;

        UPDATE public.inventory
        SET stock_quantity = stock_quantity + v_item.quantity
        WHERE medicine_id = v_item.medicine_id;
    END LOOP;
    
    UPDATE public.orders SET stock_restored_at = NOW() WHERE id = p_order_id;

    RETURN TRUE;
END;
$$;


-- Migration: 00000000000009_phase4_sellable_stock_trigger.sql
-- 1. Update the sync_inventory_from_batches function to ONLY count sellable stock

CREATE OR REPLACE FUNCTION public.sync_inventory_from_batches()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_expiry_buffer_days INTEGER;
BEGIN
    -- Configurable expiry buffer
    SELECT COALESCE((value->>0)::INTEGER, 90) INTO v_expiry_buffer_days
    FROM public.app_settings WHERE key = 'inventory_expiry_buffer_days';
    
    IF v_expiry_buffer_days IS NULL THEN
        v_expiry_buffer_days := 90;
    END IF;

    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        -- Update the stock_quantity to only count SELLABLE stock
        UPDATE public.inventory
        SET stock_quantity = (
            SELECT COALESCE(SUM(quantity), 0)
            FROM public.inventory_batches
            WHERE medicine_id = NEW.medicine_id
            AND expiry_date >= CURRENT_DATE + (v_expiry_buffer_days || ' days')::INTERVAL
        ),
        updated_at = NOW()
        WHERE medicine_id = NEW.medicine_id;
        
        -- If inventory record doesn't exist, create it (useful for new medicines)
        IF NOT FOUND THEN
            INSERT INTO public.inventory (medicine_id, stock_quantity, reserved_quantity)
            VALUES (
                NEW.medicine_id, 
                (
                    SELECT COALESCE(SUM(quantity), 0) 
                    FROM public.inventory_batches 
                    WHERE medicine_id = NEW.medicine_id
                    AND expiry_date >= CURRENT_DATE + (v_expiry_buffer_days || ' days')::INTERVAL
                ), 
                0
            );
        END IF;
        
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Update the stock_quantity in inventory table
        UPDATE public.inventory
        SET stock_quantity = (
            SELECT COALESCE(SUM(quantity), 0)
            FROM public.inventory_batches
            WHERE medicine_id = OLD.medicine_id
            AND expiry_date >= CURRENT_DATE + (v_expiry_buffer_days || ' days')::INTERVAL
        ),
        updated_at = NOW()
        WHERE medicine_id = OLD.medicine_id;
        
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$;


-- Migration: 00000000000010_phase2_audit_log.sql
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    admin_id UUID REFERENCES auth.users(id) NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view audit log" ON public.admin_audit_log FOR SELECT USING (public.current_user_role() = 'admin');
CREATE POLICY "Admins can insert audit log" ON public.admin_audit_log FOR INSERT WITH CHECK (public.current_user_role() = 'admin');


-- Migration: 00000000000011_step2_correctness.sql
-- Step 2.3: Tighten RLS

-- 1. Restrict delivery role from reading all orders
DROP POLICY IF EXISTS "Staff can view all orders" ON public.orders;
CREATE POLICY "Staff can view all orders" ON public.orders
FOR SELECT USING (
    public.current_user_role() IN ('admin', 'pharmacist')
);

DROP POLICY IF EXISTS "Staff can update orders" ON public.orders;
CREATE POLICY "Staff can update orders" ON public.orders
FOR UPDATE USING (
    public.current_user_role() IN ('admin', 'pharmacist')
);

-- Ensure customers can view their own orders (re-asserting just in case)
DROP POLICY IF EXISTS "Users can view own orders" ON public.orders;
CREATE POLICY "Users can view own orders" ON public.orders
FOR SELECT USING (
    auth.uid() = user_id
);

-- 2. Pharmacists cannot change medicine price/MRP (admin only)
CREATE OR REPLACE FUNCTION prevent_pharmacist_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF public.current_user_role() = 'pharmacist' THEN
        IF NEW.price IS DISTINCT FROM OLD.price OR NEW.mrp IS DISTINCT FROM OLD.mrp THEN
            RAISE EXCEPTION 'Pharmacists are not allowed to change medicine price or MRP. Contact an admin.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS check_pharmacist_price_change ON public.medicines;
CREATE TRIGGER check_pharmacist_price_change
    BEFORE UPDATE ON public.medicines
    FOR EACH ROW
    EXECUTE FUNCTION prevent_pharmacist_price_change();


-- Migration: 00000000000012_step3_fixes.sql
-- Step 3 Fixes

-- 1. Create recalculate_all_inventory function for the cron job
CREATE OR REPLACE FUNCTION public.recalculate_all_inventory()
RETURNS void AS $$
BEGIN
    UPDATE public.inventory i
    SET stock_quantity = COALESCE((
        SELECT SUM(b.quantity)
        FROM public.inventory_batches b
        WHERE b.medicine_id = i.medicine_id
        AND b.expiry_date > (CURRENT_DATE + INTERVAL '3 months')
    ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Create rate_limits table for serverless rate limiting
CREATE TABLE IF NOT EXISTS public.rate_limits (
    key text PRIMARY KEY,
    tokens integer NOT NULL,
    last_refilled timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.rate_limits DISABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_limit integer, p_window_ms integer)
RETURNS json AS $$
DECLARE
    v_tokens integer;
    v_last_refilled timestamp with time zone;
    v_now timestamp with time zone := now();
    v_elapsed_ms float;
    v_reset_time timestamp with time zone;
    v_allowed boolean;
BEGIN
    INSERT INTO public.rate_limits (key, tokens, last_refilled)
    VALUES (p_key, p_limit - 1, v_now)
    ON CONFLICT (key) DO UPDATE 
    SET tokens = 
        CASE 
            WHEN EXCLUDED.last_refilled >= rate_limits.last_refilled + (p_window_ms || ' milliseconds')::interval 
            THEN p_limit - 1
            ELSE GREATEST(rate_limits.tokens - 1, 0)
        END,
        last_refilled = 
        CASE 
            WHEN EXCLUDED.last_refilled >= rate_limits.last_refilled + (p_window_ms || ' milliseconds')::interval 
            THEN EXCLUDED.last_refilled
            ELSE rate_limits.last_refilled
        END
    RETURNING tokens, last_refilled INTO v_tokens, v_last_refilled;

    v_reset_time := v_last_refilled + (p_window_ms || ' milliseconds')::interval;
    
    -- If it was just refilled or tokens are still > 0 before subtraction (which means >= 0 after)
    -- Actually, if tokens returned is > 0, it means we had enough.
    -- Wait, if it returned 0, it means it was the last allowed request.
    -- Wait, if it was already 0 before, and we didn't refill, GREATEST(0 - 1, 0) = 0.
    -- We need to know if it actually decremented.
    -- Let's change the logic.
    
    SELECT rate_limits.tokens, rate_limits.last_refilled 
    INTO v_tokens, v_last_refilled 
    FROM public.rate_limits WHERE key = p_key FOR UPDATE;

    IF v_tokens IS NULL THEN
        INSERT INTO public.rate_limits (key, tokens, last_refilled)
        VALUES (p_key, p_limit - 1, v_now);
        v_tokens := p_limit - 1;
        v_last_refilled := v_now;
        v_allowed := true;
    ELSE
        IF v_now >= v_last_refilled + (p_window_ms || ' milliseconds')::interval THEN
            v_tokens := p_limit - 1;
            v_last_refilled := v_now;
            v_allowed := true;
        ELSIF v_tokens > 0 THEN
            v_tokens := v_tokens - 1;
            v_allowed := true;
        ELSE
            v_allowed := false;
        END IF;
        
        UPDATE public.rate_limits 
        SET tokens = v_tokens, last_refilled = v_last_refilled
        WHERE key = p_key;
    END IF;

    v_reset_time := v_last_refilled + (p_window_ms || ' milliseconds')::interval;
    
    RETURN json_build_object(
        'allowed', v_allowed,
        'remaining', v_tokens,
        'reset_time', v_reset_time
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Migration: 00000000000013_a5_order_functions.sql
-- A5. Atomic order status transition function
-- Handles cancel, reject, admin status changes in one transaction
-- with optimistic locking, history, stock restore, and audit log.

-- Valid transition map encoded in the function
CREATE OR REPLACE FUNCTION public.process_order_status_update(
    p_order_id UUID,
    p_old_status TEXT,
    p_new_status TEXT,
    p_new_payment_status TEXT DEFAULT NULL,
    p_changed_by UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_refund_id TEXT DEFAULT NULL,
    p_is_admin_action BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_count INTEGER;
    v_order_current RECORD;
    v_allowed_transitions TEXT[];
BEGIN
    -- 1. Lock the order row
    SELECT * INTO v_order_current
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order_current IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
    END IF;

    -- 2. Optimistic lock: caller must know the current status
    IF v_order_current.status != p_old_status THEN
        RETURN jsonb_build_object('success', false, 'error', 'STATUS_MISMATCH',
            'current_status', v_order_current.status);
    END IF;

    -- 3. Validate transition against the state machine
    v_allowed_transitions := CASE v_order_current.status
        WHEN 'PENDING' THEN ARRAY['CONFIRMED','CANCELLED']
        WHEN 'PENDING_PRESCRIPTION_APPROVAL' THEN ARRAY['CONFIRMED','CANCELLED']
        WHEN 'CONFIRMED' THEN ARRAY['PROCESSING','PACKED','CANCELLED']
        WHEN 'PROCESSING' THEN ARRAY['PACKED','CANCELLED']
        WHEN 'PACKED' THEN ARRAY['SHIPPED','CANCELLED']
        WHEN 'SHIPPED' THEN ARRAY['OUT_FOR_DELIVERY','CANCELLED']
        WHEN 'OUT_FOR_DELIVERY' THEN ARRAY['DELIVERED','CANCELLED']
        ELSE ARRAY[]::TEXT[]
    END;

    IF NOT (p_new_status = ANY(v_allowed_transitions)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_TRANSITION',
            'from', p_old_status, 'to', p_new_status,
            'allowed', to_jsonb(v_allowed_transitions));
    END IF;

    -- 4. Update the order
    UPDATE public.orders
    SET status = p_new_status,
        payment_status = COALESCE(p_new_payment_status, payment_status),
        updated_at = NOW()
    WHERE id = p_order_id AND status = p_old_status;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    IF v_updated_count = 0 THEN
        -- Concurrent modification between our SELECT FOR UPDATE and UPDATE
        RETURN jsonb_build_object('success', false, 'error', 'STATUS_MISMATCH');
    END IF;

    -- 5. Restore stock if cancelling or rejecting
    IF p_new_status IN ('CANCELLED', 'REJECTED') THEN
        PERFORM public.restore_order_stock(p_order_id);
    END IF;

    -- 6. Insert status history
    INSERT INTO public.order_status_history (order_id, status, changed_by, notes)
    VALUES (p_order_id, p_new_status, p_changed_by, p_notes);

    -- 7. Audit log for admin actions
    IF p_is_admin_action AND p_changed_by IS NOT NULL THEN
        INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
        VALUES (p_changed_by, 'UPDATE_ORDER_STATUS', 'orders', p_order_id::text,
            jsonb_build_object(
                'old_status', p_old_status,
                'new_status', p_new_status,
                'notes', p_notes,
                'refund_id', p_refund_id
            ));
    END IF;

    -- 8. Record refund in payments if refund_id provided
    IF p_refund_id IS NOT NULL THEN
        UPDATE public.payments
        SET status = 'REFUNDED',
            razorpay_signature = p_refund_id,
            updated_at = NOW()
        WHERE order_id = p_order_id AND status = 'SUCCESS';
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

-- Only callable via service_role (API routes use createAdminClient)
REVOKE EXECUTE ON FUNCTION public.process_order_status_update(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_order_status_update(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_order_status_update(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM anon;


-- Migration: 00000000000014_a6_pharmacist_trigger.sql
-- A6. Pharmacist price/MRP restriction DB Trigger (second-layer defense)
--
-- IMPORTANT: When the API uses createAdminClient() (service_role), auth.uid()
-- returns NULL. In that case v_role will be NULL, which does NOT match
-- 'pharmacist', so the trigger allows the update. This is correct because
-- the API route itself enforces the pharmacist restriction before calling
-- the DB. This trigger only fires as a safety net when a direct
-- user-session client bypasses the API.

CREATE OR REPLACE FUNCTION public.enforce_pharmacist_medicine_restrictions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_role TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.mrp IS DISTINCT FROM NEW.mrp OR
           OLD.price IS DISTINCT FROM NEW.price OR
           OLD.drug_schedule IS DISTINCT FROM NEW.drug_schedule THEN

            -- auth.uid() is NULL under service_role; skip check
            v_uid := auth.uid();
            IF v_uid IS NOT NULL THEN
                SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
                IF v_role = 'pharmacist' THEN
                    RAISE EXCEPTION 'Pharmacists are not allowed to modify MRP, Price, or Drug Schedule.';
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS restrict_pharmacist_medicine_update ON public.medicines;
CREATE TRIGGER restrict_pharmacist_medicine_update
BEFORE UPDATE ON public.medicines
FOR EACH ROW
EXECUTE FUNCTION public.enforce_pharmacist_medicine_restrictions();


-- Migration: 00000000000015_a7_rate_limit_cleanup.sql
-- A7: Secure rate limit RPC and cleanup function

-- Revoke execute from public to enforce service role only execution
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, integer, integer) FROM anon;

-- Cleanup function for old rows
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    DELETE FROM public.rate_limits 
    WHERE last_refilled < now() - INTERVAL '1 day';
END;
$$;


-- Migration: 00000000000016_pg_cron_expire_orders.sql
-- pg_cron: expire unpaid online orders every 15 minutes
-- This runs entirely inside the database — no HTTP call needed.
-- Supabase Pro/Team enables pg_cron; on free tier this migration
-- will error (safe to skip — use GitHub Actions instead).

-- The SQL version of the expiry logic:
CREATE OR REPLACE FUNCTION public.expire_unpaid_orders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_order RECORD;
    v_count INTEGER := 0;
BEGIN
    FOR v_order IN
        SELECT id, status
        FROM public.orders
        WHERE payment_method = 'ONLINE'
          AND payment_status IN ('PENDING', 'FAILED')
          AND status = 'PENDING'
          AND created_at < NOW() - INTERVAL '30 minutes'
        FOR UPDATE SKIP LOCKED
    LOOP
        -- Use the atomic status update function
        PERFORM public.process_order_status_update(
            v_order.id,
            v_order.status,
            'CANCELLED',
            NULL,
            NULL,
            'Auto-cancelled: unpaid online order expired after 30 minutes',
            NULL,
            FALSE
        );
        v_count := v_count + 1;
    END LOOP;
    RETURN v_count;
END;
$$;

-- Schedule with pg_cron (if extension is available)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_cron') THEN
        CREATE EXTENSION IF NOT EXISTS pg_cron;
        PERFORM cron.schedule(
            'expire-unpaid-orders',
            '*/15 * * * *',
            'SELECT public.expire_unpaid_orders()'
        );
        RAISE NOTICE 'pg_cron job scheduled: expire-unpaid-orders every 15 minutes';
    ELSE
        RAISE NOTICE 'pg_cron not available — use GitHub Actions or Vercel cron instead';
    END IF;
END;
$$;


-- Migration: 00000000000017_hardening_security_and_roles.sql
-- 00000000000017_hardening_security_and_roles.sql
-- Enforce actor role / ownership verification in process_order_status_update
-- and fix search_path on cleanup_rate_limits.

CREATE OR REPLACE FUNCTION public.process_order_status_update(
    p_order_id UUID,
    p_old_status TEXT,
    p_new_status TEXT,
    p_new_payment_status TEXT DEFAULT NULL,
    p_changed_by UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_refund_id TEXT DEFAULT NULL,
    p_is_admin_action BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_count INTEGER;
    v_order_current RECORD;
    v_allowed_transitions TEXT[];
    v_actor_role TEXT;
BEGIN
    -- 1. Lock the order row
    SELECT * INTO v_order_current
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order_current IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
    END IF;

    -- 2. Verify actor permissions and ownership
    IF p_is_admin_action THEN
        IF p_changed_by IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'ADMIN_ACTOR_REQUIRED');
        END IF;

        SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_changed_by;
        IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'pharmacist') THEN
            RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN_ROLE');
        END IF;
    ELSE
        -- Customer action or automated cron (p_changed_by is NULL)
        IF p_changed_by IS NOT NULL THEN
            IF v_order_current.user_id != p_changed_by THEN
                RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN_OWNERSHIP');
            END IF;
            -- Customer can only cancel
            IF p_new_status != 'CANCELLED' THEN
                RETURN jsonb_build_object('success', false, 'error', 'CUSTOMER_CAN_ONLY_CANCEL');
            END IF;
        END IF;
    END IF;

    -- 3. Optimistic lock: caller must match current status
    IF v_order_current.status != p_old_status THEN
        RETURN jsonb_build_object('success', false, 'error', 'STATUS_MISMATCH',
            'current_status', v_order_current.status);
    END IF;

    -- 4. Validate transition against the state machine
    v_allowed_transitions := CASE v_order_current.status
        WHEN 'PENDING' THEN ARRAY['CONFIRMED','CANCELLED']
        WHEN 'PENDING_PRESCRIPTION_APPROVAL' THEN ARRAY['CONFIRMED','CANCELLED']
        WHEN 'CONFIRMED' THEN ARRAY['PROCESSING','PACKED','CANCELLED']
        WHEN 'PROCESSING' THEN ARRAY['PACKED','CANCELLED']
        WHEN 'PACKED' THEN ARRAY['SHIPPED','CANCELLED']
        WHEN 'SHIPPED' THEN ARRAY['OUT_FOR_DELIVERY','CANCELLED']
        WHEN 'OUT_FOR_DELIVERY' THEN ARRAY['DELIVERED','CANCELLED']
        ELSE ARRAY[]::TEXT[]
    END;

    IF NOT (p_new_status = ANY(v_allowed_transitions)) THEN
        RETURN jsonb_build_object('success', false, 'error', 'INVALID_TRANSITION',
            'from', p_old_status, 'to', p_new_status,
            'allowed', to_jsonb(v_allowed_transitions));
    END IF;

    -- 5. Update the order
    UPDATE public.orders
    SET status = p_new_status,
        payment_status = COALESCE(p_new_payment_status, payment_status),
        updated_at = NOW()
    WHERE id = p_order_id AND status = p_old_status;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    IF v_updated_count = 0 THEN
        RETURN jsonb_build_object('success', false, 'error', 'STATUS_MISMATCH');
    END IF;

    -- 6. Restore stock if cancelling or rejecting
    IF p_new_status IN ('CANCELLED', 'REJECTED') THEN
        PERFORM public.restore_order_stock(p_order_id);
    END IF;

    -- 7. Insert status history
    INSERT INTO public.order_status_history (order_id, status, changed_by, notes)
    VALUES (p_order_id, p_new_status, p_changed_by, p_notes);

    -- 8. Audit log for admin actions
    IF p_is_admin_action AND p_changed_by IS NOT NULL THEN
        INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
        VALUES (p_changed_by, 'UPDATE_ORDER_STATUS', 'orders', p_order_id::text,
            jsonb_build_object(
                'old_status', p_old_status,
                'new_status', p_new_status,
                'notes', p_notes,
                'refund_id', p_refund_id
            ));
    END IF;

    -- 9. Record refund in payments if refund_id provided
    IF p_refund_id IS NOT NULL THEN
        UPDATE public.payments
        SET status = 'REFUNDED',
            razorpay_signature = p_refund_id,
            updated_at = NOW()
        WHERE order_id = p_order_id AND status = 'SUCCESS';
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_order_status_update(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_order_status_update(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_order_status_update(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM anon;

-- Set search_path on cleanup_rate_limits and restrict execution
CREATE OR REPLACE FUNCTION public.cleanup_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM public.rate_limits 
    WHERE last_refilled < now() - INTERVAL '1 day';
END;
$$;

REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM anon;


-- Migration: 00000000000018_fix_inventory_double_count.sql
-- Drop the explicit legacy inventory update since migration 09's trigger handles it
CREATE OR REPLACE FUNCTION public.create_order_transaction(
    p_user_id UUID,
    p_address_snapshot JSONB,
    p_subtotal DECIMAL,
    p_discount DECIMAL,
    p_delivery_fee DECIMAL,
    p_tax DECIMAL,
    p_total_amount DECIMAL,
    p_status TEXT,
    p_payment_status TEXT,
    p_payment_method TEXT,
    p_prescription_id UUID,
    p_coupon_id UUID,
    p_coupon_discount DECIMAL,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_id UUID;
    v_order_record RECORD;
    v_item JSONB;
    v_med_id UUID;
    v_requested_qty INTEGER;
    v_price DECIMAL;
    v_med_name TEXT;
    v_med_active BOOLEAN;
    v_med_schedule TEXT;
    
    v_batch_record RECORD;
    v_remaining_qty INTEGER;
    v_deduct_qty INTEGER;
    
    v_coupon_record RECORD;
    v_global_redemptions INTEGER;
    v_user_redemptions INTEGER;
    v_expiry_buffer_days INTEGER;
BEGIN
    -- Configurable expiry buffer
    SELECT COALESCE((value->>0)::INTEGER, 90) INTO v_expiry_buffer_days
    FROM public.app_settings WHERE key = 'inventory_expiry_buffer_days';
    IF v_expiry_buffer_days IS NULL THEN
        v_expiry_buffer_days := 90;
    END IF;

    -- Validate and lock coupon if provided
    IF p_coupon_id IS NOT NULL THEN
        SELECT * INTO v_coupon_record FROM public.coupons WHERE id = p_coupon_id FOR UPDATE;
        
        IF NOT FOUND OR NOT v_coupon_record.is_active THEN
            RAISE EXCEPTION 'Coupon is not valid or inactive';
        END IF;

        IF v_coupon_record.valid_from IS NOT NULL AND v_coupon_record.valid_from > NOW() THEN
            RAISE EXCEPTION 'Coupon is not valid yet';
        END IF;

        IF v_coupon_record.valid_to IS NOT NULL AND v_coupon_record.valid_to < NOW() THEN
            RAISE EXCEPTION 'Coupon has expired';
        END IF;

        IF v_coupon_record.usage_limit IS NOT NULL THEN
            SELECT COUNT(*) INTO v_global_redemptions FROM public.coupon_redemptions WHERE coupon_id = p_coupon_id;
            IF v_global_redemptions >= v_coupon_record.usage_limit THEN
                RAISE EXCEPTION 'Coupon usage limit reached';
            END IF;
        END IF;

        IF v_coupon_record.per_user_limit IS NOT NULL THEN
            SELECT COUNT(*) INTO v_user_redemptions FROM public.coupon_redemptions WHERE coupon_id = p_coupon_id AND user_id = p_user_id;
            IF v_user_redemptions >= v_coupon_record.per_user_limit THEN
                RAISE EXCEPTION 'Per-user coupon usage limit reached';
            END IF;
        END IF;
    END IF;

    -- 1. Insert into orders table
    INSERT INTO public.orders (
        user_id,
        address_snapshot,
        subtotal,
        discount,
        delivery_fee,
        tax,
        total_amount,
        status,
        payment_status,
        payment_method,
        prescription_id,
        coupon_id
    ) VALUES (
        p_user_id,
        p_address_snapshot,
        p_subtotal,
        p_discount,
        p_delivery_fee,
        p_tax,
        p_total_amount,
        p_status,
        p_payment_status,
        p_payment_method,
        p_prescription_id,
        p_coupon_id
    )
    RETURNING id INTO v_order_id;

    -- 2. Process each item and deduct from batches (FEFO)
    FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_med_id := (v_item->>'medicine_id')::UUID;
        v_requested_qty := (v_item->>'quantity')::INTEGER;
        v_price := (v_item->>'price')::DECIMAL;
        v_remaining_qty := v_requested_qty;

        SELECT name, is_active, drug_schedule 
        INTO v_med_name, v_med_active, v_med_schedule
        FROM public.medicines 
        WHERE id = v_med_id FOR SHARE;

        IF NOT v_med_active THEN
            RAISE EXCEPTION 'Medicine % is no longer active', v_med_name;
        END IF;
        
        IF v_med_schedule = 'X' THEN
            RAISE EXCEPTION 'Schedule X drug (%) cannot be sold online', v_med_name;
        END IF;

        -- Loop through available batches in FEFO order
        FOR v_batch_record IN 
            SELECT * FROM public.inventory_batches 
            WHERE medicine_id = v_med_id 
            AND quantity > 0
            AND expiry_date >= CURRENT_DATE + (v_expiry_buffer_days || ' days')::INTERVAL
            ORDER BY expiry_date ASC
            FOR UPDATE
        LOOP
            IF v_remaining_qty <= 0 THEN
                EXIT;
            END IF;

            IF v_batch_record.quantity >= v_remaining_qty THEN
                v_deduct_qty := v_remaining_qty;
            ELSE
                v_deduct_qty := v_batch_record.quantity;
            END IF;

            -- Deduct from batch
            UPDATE public.inventory_batches 
            SET quantity = quantity - v_deduct_qty 
            WHERE id = v_batch_record.id;

            -- Create order item linked to this batch
            INSERT INTO public.order_items (
                order_id,
                medicine_id,
                quantity,
                price,
                total,
                batch_id
            ) VALUES (
                v_order_id,
                v_med_id,
                v_deduct_qty,
                v_price,
                (v_deduct_qty * v_price),
                v_batch_record.id
            );

            v_remaining_qty := v_remaining_qty - v_deduct_qty;
        END LOOP;

        IF v_remaining_qty > 0 THEN
            RAISE EXCEPTION 'Insufficient sellable stock for medicine %', v_med_name;
        END IF;

        -- No manual UPDATE public.inventory here, handled by sync_inventory_batches_trigger
    END LOOP;

    -- 4. Record coupon redemption if any
    IF p_coupon_id IS NOT NULL THEN
        INSERT INTO public.coupon_redemptions (
            coupon_id,
            user_id,
            order_id,
            discount_amount
        ) VALUES (
            p_coupon_id,
            p_user_id,
            v_order_id,
            p_coupon_discount
        );
    END IF;

    -- 5. Return created order record
    SELECT * INTO v_order_record FROM public.orders WHERE id = v_order_id;
    RETURN to_jsonb(v_order_record);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, UUID, DECIMAL, JSONB) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, UUID, DECIMAL, JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_order_transaction(UUID, JSONB, DECIMAL, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, UUID, UUID, DECIMAL, JSONB) FROM anon;

CREATE OR REPLACE FUNCTION public.restore_order_stock(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_item RECORD;
    v_order RECORD;
BEGIN
    -- Check idempotency and lock order
    SELECT * INTO v_order FROM public.orders WHERE id = p_order_id FOR UPDATE;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;
    
    IF v_order.stock_restored_at IS NOT NULL THEN
        -- Already restored, perfectly idempotent
        RETURN TRUE;
    END IF;

    FOR v_item IN 
        SELECT medicine_id, quantity, batch_id 
        FROM public.order_items 
        WHERE order_id = p_order_id
    LOOP
        IF v_item.batch_id IS NOT NULL THEN
            UPDATE public.inventory_batches
            SET quantity = quantity + v_item.quantity
            WHERE id = v_item.batch_id;
        END IF;
        -- No manual UPDATE public.inventory here, handled by sync_inventory_batches_trigger
    END LOOP;
    
    UPDATE public.orders SET stock_restored_at = NOW() WHERE id = p_order_id;

    RETURN TRUE;
END;
$$;


-- Migration: 00000000000019_pharmacist_trigger_cleanup.sql
-- Drop the older overlapping trigger and function from migration 11
DROP TRIGGER IF EXISTS check_pharmacist_price_change ON public.medicines;
DROP FUNCTION IF EXISTS public.prevent_pharmacist_price_change();

-- Update the newer trigger from migration 14 to cover all restricted fields
CREATE OR REPLACE FUNCTION public.enforce_pharmacist_medicine_restrictions()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_uid UUID;
    v_role TEXT;
BEGIN
    IF TG_OP = 'UPDATE' THEN
        IF OLD.mrp IS DISTINCT FROM NEW.mrp OR
           OLD.price IS DISTINCT FROM NEW.price OR
           OLD.drug_schedule IS DISTINCT FROM NEW.drug_schedule OR
           OLD.prescription_required IS DISTINCT FROM NEW.prescription_required OR
           OLD.is_active IS DISTINCT FROM NEW.is_active OR
           OLD.composition IS DISTINCT FROM NEW.composition OR
           OLD.manufacturer IS DISTINCT FROM NEW.manufacturer THEN

            -- auth.uid() is NULL under service_role; skip check
            v_uid := auth.uid();
            IF v_uid IS NOT NULL THEN
                SELECT role INTO v_role FROM public.profiles WHERE id = v_uid;
                IF v_role = 'pharmacist' THEN
                    RAISE EXCEPTION 'Pharmacists are not allowed to modify restricted fields (Price, MRP, Schedule, etc.).';
                END IF;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;


-- Migration: 00000000000020_partial_refund_index.sql
-- Create a partial unique index so only one active refund row exists per razorpay_payment_id
-- (either PENDING_REFUND or REFUNDED). This prevents race conditions creating multiple refunds.
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_single_refund_per_charge 
ON public.payments (razorpay_payment_id) 
WHERE status IN ('PENDING_REFUND', 'REFUNDED');


-- Migration: 00000000000021_payments_refund_id.sql
-- 00000000000021_payments_refund_id.sql
-- Add dedicated razorpay_refund_id column to payments table

ALTER TABLE public.payments
ADD COLUMN IF NOT EXISTS razorpay_refund_id TEXT;

-- Backfill existing refunded rows if any were stored in razorpay_signature
UPDATE public.payments
SET razorpay_refund_id = razorpay_signature
WHERE status IN ('REFUNDED', 'PENDING_REFUND')
  AND razorpay_refund_id IS NULL
  AND razorpay_signature IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payments_razorpay_refund_id
ON public.payments (razorpay_refund_id);


-- Migration: 00000000000022_refunds_table.sql
-- 00000000000022_refunds_table.sql
-- Dedicated refunds table to decouple refund lifecycle and locking from payments table

-- 1. Create dedicated refunds table
CREATE TABLE IF NOT EXISTS public.refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES public.payments(id) ON DELETE SET NULL,
    razorpay_payment_id TEXT NOT NULL UNIQUE,
    razorpay_refund_id TEXT,
    amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'REFUNDED', 'FAILED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_refunds_order_id ON public.refunds(order_id);
CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON public.refunds(payment_id);
CREATE INDEX IF NOT EXISTS idx_refunds_razorpay_refund_id ON public.refunds(razorpay_refund_id);

-- 3. Drop partial index from migration 20 on payments table
DROP INDEX IF EXISTS public.idx_payments_single_refund_per_charge;

-- 4. Enable RLS: service role only
ALTER TABLE public.refunds ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.refunds FROM anon, authenticated, public;
GRANT ALL ON TABLE public.refunds TO service_role;
GRANT ALL ON TABLE public.refunds TO postgres;


-- Migration: 00000000000023_customer_cancel_packed.sql
-- Block customer cancellation after PACKED (staff may still cancel).
-- Customers may only cancel their own orders, and only to CANCELLED.

CREATE OR REPLACE FUNCTION public.process_order_status_update(
    p_order_id UUID,
    p_old_status TEXT,
    p_new_status TEXT,
    p_new_payment_status TEXT DEFAULT NULL,
    p_changed_by UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_refund_id TEXT DEFAULT NULL,
    p_is_admin_action BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_count INTEGER;
    v_order_current RECORD;
    v_allowed_transitions TEXT[];
    v_actor_role TEXT;
BEGIN
    SELECT * INTO v_order_current
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order_current IS NULL THEN
        RETURN jsonb_build_object('success', false, 'error', 'ORDER_NOT_FOUND');
    END IF;

    IF p_is_admin_action THEN
        IF p_changed_by IS NULL THEN
            RETURN jsonb_build_object('success', false, 'error', 'ADMIN_ACTOR_REQUIRED');
        END IF;

        SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_changed_by;
        IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'pharmacist') THEN
            RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN_ROLE');
        END IF;
    ELSE
        IF p_changed_by IS NOT NULL THEN
            IF v_order_current.user_id != p_changed_by THEN
                RETURN jsonb_build_object('success', false, 'error', 'FORBIDDEN_OWNERSHIP');
            END IF;
            IF p_new_status != 'CANCELLED' THEN
                RETURN jsonb_build_object('success', false, 'error', 'CUSTOMER_CAN_ONLY_CANCEL');
            END IF;
            IF v_order_current.status IN ('PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED') THEN
                RAISE EXCEPTION 'CUSTOMER_CANCEL_NOT_ALLOWED: customers cannot cancel after PACKED'
                    USING ERRCODE = 'P0001';
            END IF;
        END IF;
    END IF;

    IF v_order_current.status != p_old_status THEN
        RAISE EXCEPTION 'STATUS_MISMATCH: current status is %', v_order_current.status
            USING ERRCODE = 'P0001';
    END IF;

    v_allowed_transitions := CASE v_order_current.status
        WHEN 'PENDING' THEN ARRAY['CONFIRMED','CANCELLED']
        WHEN 'PENDING_PRESCRIPTION_APPROVAL' THEN ARRAY['CONFIRMED','CANCELLED']
        WHEN 'CONFIRMED' THEN ARRAY['PROCESSING','PACKED','CANCELLED']
        WHEN 'PROCESSING' THEN ARRAY['PACKED','CANCELLED']
        WHEN 'PACKED' THEN ARRAY['SHIPPED','CANCELLED']
        WHEN 'SHIPPED' THEN ARRAY['OUT_FOR_DELIVERY','CANCELLED']
        WHEN 'OUT_FOR_DELIVERY' THEN ARRAY['DELIVERED','CANCELLED']
        ELSE ARRAY[]::TEXT[]
    END;

    IF NOT (p_new_status = ANY(v_allowed_transitions)) THEN
        RAISE EXCEPTION 'INVALID_TRANSITION: cannot change status from % to %', p_old_status, p_new_status
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.orders
    SET status = p_new_status,
        payment_status = COALESCE(p_new_payment_status, payment_status),
        updated_at = NOW()
    WHERE id = p_order_id AND status = p_old_status;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    IF v_updated_count = 0 THEN
        RAISE EXCEPTION 'STATUS_MISMATCH'
            USING ERRCODE = 'P0001';
    END IF;

    IF p_new_status IN ('CANCELLED', 'REJECTED') THEN
        PERFORM public.restore_order_stock(p_order_id);
    END IF;

    INSERT INTO public.order_status_history (order_id, status, changed_by, notes)
    VALUES (p_order_id, p_new_status, p_changed_by, p_notes);

    IF p_is_admin_action AND p_changed_by IS NOT NULL THEN
        INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
        VALUES (p_changed_by, 'UPDATE_ORDER_STATUS', 'orders', p_order_id::text,
            jsonb_build_object(
                'old_status', p_old_status,
                'new_status', p_new_status,
                'notes', p_notes,
                'refund_id', p_refund_id
            ));
    END IF;

    IF p_refund_id IS NOT NULL THEN
        UPDATE public.payments
        SET status = 'REFUNDED',
            razorpay_signature = p_refund_id,
            updated_at = NOW()
        WHERE order_id = p_order_id AND status = 'SUCCESS';
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_order_status_update(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_order_status_update(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_order_status_update(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM anon;


-- Migration: 00000000000024_order_status_raise_exceptions.sql
-- 00000000000024_order_status_raise_exceptions.sql
-- Ensure process_order_status_update raises exceptions on ownership violation and invalid customer target status

CREATE OR REPLACE FUNCTION public.process_order_status_update(
    p_order_id UUID,
    p_old_status TEXT,
    p_new_status TEXT,
    p_new_payment_status TEXT DEFAULT NULL,
    p_changed_by UUID DEFAULT NULL,
    p_notes TEXT DEFAULT NULL,
    p_refund_id TEXT DEFAULT NULL,
    p_is_admin_action BOOLEAN DEFAULT FALSE
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_updated_count INTEGER;
    v_order_current RECORD;
    v_allowed_transitions TEXT[];
    v_actor_role TEXT;
BEGIN
    SELECT * INTO v_order_current
    FROM public.orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF v_order_current IS NULL THEN
        RAISE EXCEPTION 'ORDER_NOT_FOUND: order does not exist'
            USING ERRCODE = 'P0001';
    END IF;

    IF p_is_admin_action THEN
        IF p_changed_by IS NULL THEN
            RAISE EXCEPTION 'ADMIN_ACTOR_REQUIRED: staff actions require an admin_id'
                USING ERRCODE = 'P0001';
        END IF;

        SELECT role INTO v_actor_role FROM public.profiles WHERE id = p_changed_by;
        IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'pharmacist') THEN
            RAISE EXCEPTION 'FORBIDDEN_ROLE: actor lacks staff privileges'
                USING ERRCODE = 'P0001';
        END IF;
    ELSE
        IF p_changed_by IS NOT NULL THEN
            IF v_order_current.user_id != p_changed_by THEN
                RAISE EXCEPTION 'FORBIDDEN_OWNERSHIP: customers can only cancel their own orders'
                    USING ERRCODE = 'P0001';
            END IF;
            IF p_new_status != 'CANCELLED' THEN
                RAISE EXCEPTION 'CUSTOMER_CAN_ONLY_CANCEL: customers may only transition to CANCELLED'
                    USING ERRCODE = 'P0001';
            END IF;
            IF v_order_current.status IN ('PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED') THEN
                RAISE EXCEPTION 'CUSTOMER_CANCEL_NOT_ALLOWED: customers cannot cancel after PACKED'
                    USING ERRCODE = 'P0001';
            END IF;
        END IF;
    END IF;

    IF v_order_current.status != p_old_status THEN
        RAISE EXCEPTION 'STATUS_MISMATCH: current status is %', v_order_current.status
            USING ERRCODE = 'P0001';
    END IF;

    v_allowed_transitions := CASE v_order_current.status
        WHEN 'PENDING' THEN ARRAY['CONFIRMED','CANCELLED']
        WHEN 'PENDING_PRESCRIPTION_APPROVAL' THEN ARRAY['CONFIRMED','CANCELLED']
        WHEN 'CONFIRMED' THEN ARRAY['PROCESSING','PACKED','CANCELLED']
        WHEN 'PROCESSING' THEN ARRAY['PACKED','CANCELLED']
        WHEN 'PACKED' THEN ARRAY['SHIPPED','CANCELLED']
        WHEN 'SHIPPED' THEN ARRAY['OUT_FOR_DELIVERY','CANCELLED']
        WHEN 'OUT_FOR_DELIVERY' THEN ARRAY['DELIVERED','CANCELLED']
        ELSE ARRAY[]::TEXT[]
    END;

    IF NOT (p_new_status = ANY(v_allowed_transitions)) THEN
        RAISE EXCEPTION 'INVALID_TRANSITION: cannot change status from % to %', p_old_status, p_new_status
            USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.orders
    SET status = p_new_status,
        payment_status = COALESCE(p_new_payment_status, payment_status),
        updated_at = NOW()
    WHERE id = p_order_id AND status = p_old_status;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    IF v_updated_count = 0 THEN
        RAISE EXCEPTION 'STATUS_MISMATCH'
            USING ERRCODE = 'P0001';
    END IF;

    IF p_new_status IN ('CANCELLED', 'REJECTED') THEN
        PERFORM public.restore_order_stock(p_order_id);
    END IF;

    INSERT INTO public.order_status_history (order_id, status, changed_by, notes)
    VALUES (p_order_id, p_new_status, p_changed_by, p_notes);

    IF p_is_admin_action AND p_changed_by IS NOT NULL THEN
        INSERT INTO public.admin_audit_log (admin_id, action, entity_type, entity_id, details)
        VALUES (p_changed_by, 'UPDATE_ORDER_STATUS', 'orders', p_order_id::text,
            jsonb_build_object(
                'old_status', p_old_status,
                'new_status', p_new_status,
                'notes', p_notes,
                'refund_id', p_refund_id
            ));
    END IF;

    IF p_refund_id IS NOT NULL THEN
        UPDATE public.payments
        SET status = 'REFUNDED',
            razorpay_signature = p_refund_id,
            updated_at = NOW()
        WHERE order_id = p_order_id AND status = 'SUCCESS';
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_order_status_update(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.process_order_status_update(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_order_status_update(UUID, TEXT, TEXT, TEXT, UUID, TEXT, TEXT, BOOLEAN) FROM anon;


-- Migration: 00000000000025_email_events.sql
-- 00000000000025_email_events.sql
-- Transactional email event log with RLS restricted to service role only

CREATE TABLE IF NOT EXISTS public.email_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
    recipient TEXT NOT NULL,
    template TEXT NOT NULL,
    subject TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('SENT', 'FAILED', 'LOGGED')),
    error_message TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast lookups and reporting
CREATE INDEX IF NOT EXISTS idx_email_events_order_id ON public.email_events(order_id);
CREATE INDEX IF NOT EXISTS idx_email_events_status ON public.email_events(status);
CREATE INDEX IF NOT EXISTS idx_email_events_created_at ON public.email_events(created_at);

-- Enable RLS: service role only
ALTER TABLE public.email_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.email_events FROM anon, authenticated, public;
GRANT ALL ON TABLE public.email_events TO service_role;
GRANT ALL ON TABLE public.email_events TO postgres;


-- Migration: 00000000000026_clear_demo_catalogue.sql
-- ---------------------------------------------------------------------------
-- Clear the demo medicine catalogue.
--
-- The storefront now shows ONLY medicines an admin publishes through
-- /admin/medicines. This migration removes the sample rows that previously
-- shipped with the repository.
--
-- Safety: if any order history references the existing medicines we deactivate
-- them instead of deleting, so invoices and order items stay intact. Public
-- storefront queries filter on `is_active = true`, so either branch leaves the
-- shop visibly empty until real stock is added.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    v_order_item_count bigint;
BEGIN
    SELECT count(*) INTO v_order_item_count FROM public.order_items;

    IF v_order_item_count = 0 THEN
        -- inventory and inventory_batches cascade from medicines.
        DELETE FROM public.medicines;
        RAISE NOTICE 'Cleared demo medicine catalogue (% rows removed).', v_order_item_count;
    ELSE
        UPDATE public.medicines SET is_active = false;
        RAISE NOTICE 'Order history found: demo medicines deactivated instead of deleted.';
    END IF;
END
$$;


-- Migration: 00000000000027_admin_self_promote.sql
-- ---------------------------------------------------------------------------
-- Allow admin-portal users to promote their own profile role to 'admin'.
--
-- The /api/auth/promote-admin endpoint calls this RPC after verifying the
-- caller's email is in the ADMIN_EMAILS environment variable (server-side).
--
-- Using SECURITY DEFINER means the function runs as the DB owner and can
-- update the profiles table regardless of RLS.  The GRANT ensures any
-- authenticated Supabase user can invoke it (the server validates permissions
-- before calling).
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.promote_self_to_admin(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET    role = 'admin', updated_at = now()
  WHERE  id = target_user_id
    AND  role NOT IN ('admin', 'pharmacist');
END;
$$;

GRANT EXECUTE ON FUNCTION public.promote_self_to_admin(UUID) TO authenticated;


