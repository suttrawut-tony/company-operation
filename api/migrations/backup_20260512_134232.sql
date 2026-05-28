--
-- PostgreSQL database dump
--

\restrict c09fOgealeuuQZdvdFmaP1Wrf2cS9CQdPvS0P0uSN7MLoidssm6BvGSsGmdh8Kl

-- Dumped from database version 17.9 (Homebrew)
-- Dumped by pg_dump version 17.9 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: approval_action; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.approval_action AS ENUM (
    'approve',
    'reject',
    'return',
    'confirm'
);


ALTER TYPE public.approval_action OWNER TO "user";

--
-- Name: booking_status; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.booking_status AS ENUM (
    'pending',
    'approved',
    'checked_out',
    'checked_in',
    'rejected',
    'cancelled'
);


ALTER TYPE public.booking_status OWNER TO "user";

--
-- Name: budget_status; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.budget_status AS ENUM (
    'draft',
    'pending_manager',
    'pending_executive',
    'approved',
    'rejected'
);


ALTER TYPE public.budget_status OWNER TO "user";

--
-- Name: expense_status; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.expense_status AS ENUM (
    'draft',
    'pending_manager',
    'pending_finance',
    'pending_executive',
    'approved',
    'paid',
    'sent_to_sap',
    'rejected',
    'cancelled'
);


ALTER TYPE public.expense_status OWNER TO "user";

--
-- Name: expense_type; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.expense_type AS ENUM (
    'reimbursement',
    'advance',
    'advance_clear'
);


ALTER TYPE public.expense_type OWNER TO "user";

--
-- Name: notif_channel; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.notif_channel AS ENUM (
    'in_app',
    'email',
    'discord'
);


ALTER TYPE public.notif_channel OWNER TO "user";

--
-- Name: ot_status; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.ot_status AS ENUM (
    'draft',
    'pending_manager',
    'pending_executive',
    'approved',
    'paid',
    'rejected'
);


ALTER TYPE public.ot_status OWNER TO "user";

--
-- Name: ot_type; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.ot_type AS ENUM (
    'normal',
    'holiday',
    'special'
);


ALTER TYPE public.ot_type OWNER TO "user";

--
-- Name: phase_status; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.phase_status AS ENUM (
    'upcoming',
    'active',
    'completed'
);


ALTER TYPE public.phase_status OWNER TO "user";

--
-- Name: pr_status; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.pr_status AS ENUM (
    'draft',
    'pending_manager',
    'pending_finance',
    'pending_executive',
    'approved',
    'sent_to_sap',
    'received',
    'rejected',
    'cancelled'
);


ALTER TYPE public.pr_status OWNER TO "user";

--
-- Name: project_status; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.project_status AS ENUM (
    'planning',
    'active',
    'on_hold',
    'completed',
    'cancelled'
);


ALTER TYPE public.project_status OWNER TO "user";

--
-- Name: task_priority; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.task_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


ALTER TYPE public.task_priority OWNER TO "user";

--
-- Name: task_status; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.task_status AS ENUM (
    'todo',
    'in_progress',
    'review',
    'done'
);


ALTER TYPE public.task_status OWNER TO "user";

--
-- Name: travel_status; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.travel_status AS ENUM (
    'draft',
    'pending_team_confirm',
    'pending_manager',
    'pending_executive',
    'approved',
    'in_progress',
    'completed',
    'rejected',
    'cancelled'
);


ALTER TYPE public.travel_status OWNER TO "user";

--
-- Name: user_role; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.user_role AS ENUM (
    'executive',
    'pm',
    'finance',
    'accounting',
    'procurement',
    'admin',
    'staff'
);


ALTER TYPE public.user_role OWNER TO "user";

--
-- Name: vehicle_status; Type: TYPE; Schema: public; Owner: user
--

CREATE TYPE public.vehicle_status AS ENUM (
    'available',
    'in_use',
    'maintenance',
    'retired'
);


ALTER TYPE public.vehicle_status OWNER TO "user";

--
-- Name: update_updated_at(); Type: FUNCTION; Schema: public; Owner: user
--

CREATE FUNCTION public.update_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_updated_at() OWNER TO "user";

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_log; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.activity_log (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    project_id uuid,
    user_id uuid,
    action character varying(50) NOT NULL,
    doc_type character varying(30),
    doc_id uuid,
    description text,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.activity_log OWNER TO "user";

--
-- Name: approval_matrix; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.approval_matrix (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    doc_type character varying(30) NOT NULL,
    min_amount numeric(15,2) DEFAULT 0,
    max_amount numeric(15,2) DEFAULT 999999999,
    step_order integer NOT NULL,
    required_role public.user_role NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.approval_matrix OWNER TO "user";

--
-- Name: approvals; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.approvals (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    doc_type character varying(30) NOT NULL,
    doc_id uuid NOT NULL,
    step_order integer NOT NULL,
    required_role public.user_role NOT NULL,
    approver_id uuid,
    action public.approval_action,
    comment text,
    acted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.approvals OWNER TO "user";

--
-- Name: attachments; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.attachments (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    project_id uuid,
    doc_type character varying(30),
    doc_id uuid,
    file_name character varying(300) NOT NULL,
    file_url character varying(500) NOT NULL,
    file_size integer,
    mime_type character varying(100),
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.attachments OWNER TO "user";

--
-- Name: budget_lines; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.budget_lines (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    budget_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    category character varying(100),
    tor_amount numeric(15,2) DEFAULT 0,
    budget_amount numeric(15,2) DEFAULT 0,
    actual_amount numeric(15,2) DEFAULT 0,
    sap_account character varying(10),
    sort_order integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.budget_lines OWNER TO "user";

--
-- Name: budgets; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.budgets (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    project_id uuid NOT NULL,
    code character varying(30) NOT NULL,
    name character varying(200),
    status public.budget_status DEFAULT 'draft'::public.budget_status,
    total_tor numeric(15,2) DEFAULT 0,
    total_budget numeric(15,2) DEFAULT 0,
    total_actual numeric(15,2) DEFAULT 0,
    fiscal_year integer,
    notes text,
    created_by uuid,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.budgets OWNER TO "user";

--
-- Name: calendar_events; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.calendar_events (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    project_id uuid,
    title character varying(300) NOT NULL,
    description text,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    all_day boolean DEFAULT false,
    location character varying(200),
    event_type character varying(30) DEFAULT 'meeting'::character varying,
    doc_type character varying(30),
    doc_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.calendar_events OWNER TO "user";

--
-- Name: companies; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.companies (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    name character varying(200) NOT NULL,
    slug character varying(50) NOT NULL,
    tax_id character varying(20),
    address text,
    phone character varying(30),
    logo_url character varying(500),
    sap_config jsonb DEFAULT '{}'::jsonb,
    settings jsonb DEFAULT '{}'::jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.companies OWNER TO "user";

--
-- Name: discussions; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.discussions (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    parent_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.discussions OWNER TO "user";

--
-- Name: expenses; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.expenses (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    project_id uuid,
    doc_number character varying(20) NOT NULL,
    doc_date date DEFAULT CURRENT_DATE NOT NULL,
    expense_type public.expense_type DEFAULT 'reimbursement'::public.expense_type NOT NULL,
    status public.expense_status DEFAULT 'draft'::public.expense_status,
    description character varying(500),
    amount numeric(15,2) DEFAULT 0 NOT NULL,
    tax_code character varying(10),
    tax_amount numeric(15,2) DEFAULT 0,
    sap_account character varying(10),
    receipt_url character varying(500),
    receipt_data jsonb DEFAULT '{}'::jsonb,
    advance_ref_id uuid,
    sap_doc_entry integer,
    sap_doc_num character varying(30),
    sap_synced_at timestamp with time zone,
    budget_deducted boolean DEFAULT false,
    paid_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.expenses OWNER TO "user";

--
-- Name: notes; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.notes (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    title character varying(300) NOT NULL,
    content text,
    note_type character varying(30) DEFAULT 'general'::character varying,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notes OWNER TO "user";

--
-- Name: notifications; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.notifications (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    user_id uuid NOT NULL,
    channel public.notif_channel DEFAULT 'in_app'::public.notif_channel,
    title character varying(300) NOT NULL,
    body text,
    link_url character varying(500),
    doc_type character varying(30),
    doc_id uuid,
    is_read boolean DEFAULT false,
    read_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notifications OWNER TO "user";

--
-- Name: number_series; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.number_series (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    doc_type character varying(30) NOT NULL,
    prefix character varying(10) NOT NULL,
    year_month character varying(4) NOT NULL,
    current_number integer DEFAULT 0 NOT NULL,
    sap_series_name character varying(30),
    sap_synced boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.number_series OWNER TO "user";

--
-- Name: ot_requests; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.ot_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    project_id uuid,
    doc_number character varying(20) NOT NULL,
    user_id uuid NOT NULL,
    ot_date date NOT NULL,
    ot_type public.ot_type DEFAULT 'normal'::public.ot_type NOT NULL,
    hours numeric(4,1) NOT NULL,
    base_rate numeric(10,2) NOT NULL,
    multiplier numeric(3,1) NOT NULL,
    compensation numeric(10,2) NOT NULL,
    status public.ot_status DEFAULT 'draft'::public.ot_status,
    reason text,
    paid_at timestamp with time zone,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ot_requests OWNER TO "user";

--
-- Name: phase_steps; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.phase_steps (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    phase_id uuid NOT NULL,
    name character varying(300) NOT NULL,
    sort_order integer DEFAULT 0,
    status character varying(20) DEFAULT 'pending'::character varying,
    assigned_to uuid,
    start_date date,
    end_date date,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.phase_steps OWNER TO "user";

--
-- Name: phases; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.phases (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    sort_order integer DEFAULT 0,
    status public.phase_status DEFAULT 'upcoming'::public.phase_status,
    start_date date,
    end_date date,
    progress integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.phases OWNER TO "user";

--
-- Name: po_lines; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.po_lines (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    po_id uuid NOT NULL,
    line_num integer NOT NULL,
    item_code character varying(50),
    item_name character varying(300) NOT NULL,
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    uom character varying(20) DEFAULT 'EA'::character varying,
    unit_price numeric(15,2) DEFAULT 0,
    total_price numeric(15,2) DEFAULT 0,
    sap_account character varying(10),
    tax_code character varying(10),
    received_qty numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.po_lines OWNER TO "user";

--
-- Name: pr_lines; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.pr_lines (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    pr_id uuid NOT NULL,
    line_num integer NOT NULL,
    item_code character varying(50),
    item_name character varying(300) NOT NULL,
    quantity numeric(10,2) DEFAULT 1 NOT NULL,
    uom character varying(20) DEFAULT 'EA'::character varying,
    unit_price numeric(15,2) DEFAULT 0,
    total_price numeric(15,2) DEFAULT 0,
    sap_account character varying(10),
    tax_code character varying(10),
    budget_line_id uuid,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.pr_lines OWNER TO "user";

--
-- Name: project_members; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.project_members (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role character varying(50) DEFAULT 'member'::character varying,
    joined_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.project_members OWNER TO "user";

--
-- Name: projects; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.projects (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    code character varying(30) NOT NULL,
    name character varying(300) NOT NULL,
    description text,
    status public.project_status DEFAULT 'planning'::public.project_status,
    start_date date,
    end_date date,
    pm_user_id uuid,
    sap_project_code character varying(30),
    tor_amount numeric(15,2) DEFAULT 0,
    budget_amount numeric(15,2) DEFAULT 0,
    actual_amount numeric(15,2) DEFAULT 0,
    progress integer DEFAULT 0,
    settings jsonb DEFAULT '{}'::jsonb,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.projects OWNER TO "user";

--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.purchase_orders (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    project_id uuid,
    pr_id uuid,
    doc_number character varying(20) NOT NULL,
    doc_date date DEFAULT CURRENT_DATE NOT NULL,
    status public.pr_status DEFAULT 'draft'::public.pr_status,
    vendor_code character varying(20),
    vendor_name character varying(200),
    total_amount numeric(15,2) DEFAULT 0,
    tax_amount numeric(15,2) DEFAULT 0,
    remarks text,
    sap_doc_entry integer,
    sap_doc_num character varying(30),
    sap_synced_at timestamp with time zone,
    budget_deducted boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.purchase_orders OWNER TO "user";

--
-- Name: purchase_requests; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.purchase_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    project_id uuid,
    doc_number character varying(20) NOT NULL,
    doc_date date DEFAULT CURRENT_DATE NOT NULL,
    status public.pr_status DEFAULT 'draft'::public.pr_status,
    vendor_code character varying(20),
    vendor_name character varying(200),
    total_amount numeric(15,2) DEFAULT 0,
    tax_code character varying(10),
    tax_amount numeric(15,2) DEFAULT 0,
    remarks text,
    sap_doc_entry integer,
    sap_doc_num character varying(30),
    sap_object_type character varying(10),
    sap_synced_at timestamp with time zone,
    budget_deducted boolean DEFAULT false,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.purchase_requests OWNER TO "user";

--
-- Name: tasks; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.tasks (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    phase_id uuid,
    title character varying(500) NOT NULL,
    description text,
    status public.task_status DEFAULT 'todo'::public.task_status,
    priority public.task_priority DEFAULT 'medium'::public.task_priority,
    assigned_to uuid,
    due_date date,
    completed_at timestamp with time zone,
    sort_order integer DEFAULT 0,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.tasks OWNER TO "user";

--
-- Name: travel_members; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.travel_members (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    travel_id uuid NOT NULL,
    user_id uuid NOT NULL,
    is_lead boolean DEFAULT false,
    confirmed boolean DEFAULT false,
    confirmed_at timestamp with time zone
);


ALTER TABLE public.travel_members OWNER TO "user";

--
-- Name: travel_requests; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.travel_requests (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    project_id uuid,
    doc_number character varying(20) NOT NULL,
    destination character varying(200) NOT NULL,
    purpose text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status public.travel_status DEFAULT 'draft'::public.travel_status,
    estimated_cost numeric(15,2) DEFAULT 0,
    advance_amount numeric(15,2) DEFAULT 0,
    advance_expense_id uuid,
    vehicle_booking_id uuid,
    pre_depart_confirmed boolean DEFAULT false,
    lead_user_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.travel_requests OWNER TO "user";

--
-- Name: users; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.users (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    email character varying(200) NOT NULL,
    password_hash character varying(200),
    google_id character varying(100),
    first_name character varying(100) NOT NULL,
    first_name_th character varying(100),
    last_name character varying(100) NOT NULL,
    last_name_th character varying(100),
    role public.user_role DEFAULT 'staff'::public.user_role NOT NULL,
    "position" character varying(100),
    department character varying(50),
    sap_user_code character varying(50),
    sap_license character varying(50),
    can_approve boolean DEFAULT false,
    approval_limit numeric(15,2) DEFAULT 0,
    avatar_url character varying(500),
    phone character varying(30),
    is_active boolean DEFAULT true,
    last_login_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO "user";

--
-- Name: vehicle_bookings; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.vehicle_bookings (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    vehicle_id uuid NOT NULL,
    project_id uuid,
    travel_id uuid,
    status public.booking_status DEFAULT 'pending'::public.booking_status,
    start_date date NOT NULL,
    end_date date NOT NULL,
    purpose text,
    passengers text,
    km_start numeric(10,1),
    km_end numeric(10,1),
    fuel_start character varying(20),
    fuel_end character varying(20),
    condition_notes text,
    checked_out_at timestamp with time zone,
    checked_in_at timestamp with time zone,
    booked_by uuid,
    approved_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.vehicle_bookings OWNER TO "user";

--
-- Name: vehicles; Type: TABLE; Schema: public; Owner: user
--

CREATE TABLE public.vehicles (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    company_id uuid NOT NULL,
    plate_number character varying(30) NOT NULL,
    name character varying(100) NOT NULL,
    vehicle_type character varying(50),
    seats integer DEFAULT 5,
    status public.vehicle_status DEFAULT 'available'::public.vehicle_status,
    current_km numeric(10,1) DEFAULT 0,
    fuel_level character varying(20),
    image_url character varying(500),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.vehicles OWNER TO "user";

--
-- Data for Name: activity_log; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.activity_log (id, company_id, project_id, user_id, action, doc_type, doc_id, description, metadata, created_at) FROM stdin;
d3f4faf9-9ce0-407e-a78e-980aba20ec8c	11111111-1111-1111-1111-111111111111	6d53551c-2c84-45ba-bac7-518d2bf81287	ebee042c-0b67-4061-8ae0-6755b8549575	created	expense	\N	สร้าง EXP26050003 ค่าที่พัก ภูเก็ต ฿12,500	{}	2026-05-11 15:21:23.433908+07
79b8d3c8-c610-4ca5-8642-a4b14a2ab43a	11111111-1111-1111-1111-111111111111	6d53551c-2c84-45ba-bac7-518d2bf81287	1d57e25a-e741-4cc7-aa88-55276aba0df8	approved	pr	\N	อนุมัติ PR26050008 Sonar Module ฿62,000	{}	2026-05-11 12:21:23.433908+07
c27dff41-59a1-48dc-aa1c-719841448baa	11111111-1111-1111-1111-111111111111	6d53551c-2c84-45ba-bac7-518d2bf81287	95742447-39bf-46eb-8eea-ed16a808e164	created	attachment	\N	อัปโหลด Calibration Report	{}	2026-05-10 17:21:23.433908+07
c7599356-71e3-4753-ab99-9675c6655763	11111111-1111-1111-1111-111111111111	6d53551c-2c84-45ba-bac7-518d2bf81287	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	updated	task	\N	เสร็จ task "Sonar Module Test #3"	{}	2026-05-09 17:21:23.433908+07
5d13eeba-a827-4377-9fa0-4ff4f9b8ec3c	11111111-1111-1111-1111-111111111111	6d53551c-2c84-45ba-bac7-518d2bf81287	d0b32103-3b47-45cc-8aa9-5e7030cf226a	created	vehicle	\N	จองรถ กก-1234 เดินทาง Phuket 15-17 May	{}	2026-05-08 17:21:23.433908+07
7d640134-7d01-4379-a046-980094a6fe05	11111111-1111-1111-1111-111111111111	c96cc3ca-23d9-40ca-a9d4-217f701767bb	1d57e25a-e741-4cc7-aa88-55276aba0df8	created	pr	\N	สร้าง PR26030010 CCTV Camera x24 ฿920,000	{}	2026-03-11 17:21:23.433908+07
481e909a-c200-4f61-8a62-399eff1aa05a	11111111-1111-1111-1111-111111111111	c96cc3ca-23d9-40ca-a9d4-217f701767bb	24d99416-9114-405c-ac4d-97707f282c5c	created	expense	\N	สร้าง EXP26050010 Software License ฿85,000	{}	2026-05-10 17:21:23.433908+07
967175f4-6442-4245-84d2-a8f5c2661ae1	11111111-1111-1111-1111-111111111111	5a190f8c-e256-498a-bb0f-4705b960dced	d0b32103-3b47-45cc-8aa9-5e7030cf226a	created	pr	\N	สร้าง PR26050020 VTS Radar ฿1,200,000	{}	2026-05-09 17:21:23.433908+07
443f1933-c982-447c-9ebd-9dd3a0a49884	11111111-1111-1111-1111-111111111111	5a190f8c-e256-498a-bb0f-4705b960dced	d0b32103-3b47-45cc-8aa9-5e7030cf226a	created	travel	\N	สร้าง TRV26050006 สำรวจ VTS มาบตาพุด	{}	2026-05-10 17:21:23.433908+07
d5a66735-c792-472c-b1c2-89eb068ff083	11111111-1111-1111-1111-111111111111	586d4de6-73eb-469d-92d2-7546654ff0dd	ebee042c-0b67-4061-8ae0-6755b8549575	updated	task	\N	กำลังติดตั้ง AIS จุดที่ 2	{}	2026-05-10 17:21:23.433908+07
d817d55a-1706-4501-a010-d95f4847a9be	11111111-1111-1111-1111-111111111111	b1414314-c8cb-4184-98ac-baebae84a764	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	created	pr	\N	สร้าง PR26050019 Weather Station ฿450,000	{}	2026-05-08 17:21:23.433908+07
41212049-cd28-4574-a713-6c41d6c35976	11111111-1111-1111-1111-111111111111	de7b0847-7026-4447-b7b8-1cf0b983d44b	d0b32103-3b47-45cc-8aa9-5e7030cf226a	created	vehicle	\N	เช็คเอาท์รถ ขข-5678 ไป Rayong	{}	2026-05-09 17:21:23.433908+07
02868d5d-3a24-40de-bab2-ffb5865d590d	11111111-1111-1111-1111-111111111111	\N	5959a486-ba8f-4416-95a0-9dcb6eb54745	approved	budget	\N	อนุมัติ BG-2026-006 AIS Repeater ฿700K	{}	2026-05-01 17:21:23.433908+07
613c35b5-00a1-45b7-885d-25c6e7f6c2b2	11111111-1111-1111-1111-111111111111	d8838034-b3f2-4781-83df-4f5f00a41061	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	updated	project	\N	Project Echo Sounder Maintenance เสร็จ 100%	{}	2026-04-30 17:21:23.433908+07
\.


--
-- Data for Name: approval_matrix; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.approval_matrix (id, company_id, doc_type, min_amount, max_amount, step_order, required_role, is_active, created_at) FROM stdin;
98d97a5f-6ff2-4432-ac28-4be6e78c9a61	11111111-1111-1111-1111-111111111111	pr	0.00	10000.00	1	pm	t	2026-05-11 16:13:13.73458+07
be783139-8513-4d3b-a361-274d732ce65f	11111111-1111-1111-1111-111111111111	pr	10001.00	100000.00	1	pm	t	2026-05-11 16:13:13.73458+07
22e2960a-5f38-44e4-86c9-d46a0481cdca	11111111-1111-1111-1111-111111111111	pr	10001.00	100000.00	2	finance	t	2026-05-11 16:13:13.73458+07
8fc826de-7489-46fa-92ef-64386d7470d9	11111111-1111-1111-1111-111111111111	pr	100001.00	999999999.00	1	pm	t	2026-05-11 16:13:13.73458+07
be019e3f-d1f0-440f-8d6f-7c5f15ebef98	11111111-1111-1111-1111-111111111111	pr	100001.00	999999999.00	2	finance	t	2026-05-11 16:13:13.73458+07
0938fd15-3da3-4f59-b0aa-7c7079e923b8	11111111-1111-1111-1111-111111111111	pr	100001.00	999999999.00	3	executive	t	2026-05-11 16:13:13.73458+07
346ed359-22ca-4706-9782-fc1347d0d9aa	11111111-1111-1111-1111-111111111111	expense	0.00	10000.00	1	pm	t	2026-05-11 16:13:13.73458+07
c45cb70f-ef92-4f19-822f-3bd4519239d3	11111111-1111-1111-1111-111111111111	expense	10001.00	100000.00	1	pm	t	2026-05-11 16:13:13.73458+07
1282baec-8145-44c9-ba2a-55cc493e58c7	11111111-1111-1111-1111-111111111111	expense	10001.00	100000.00	2	finance	t	2026-05-11 16:13:13.73458+07
2bf6ad49-5d4d-412d-a65a-ca684b39fd45	11111111-1111-1111-1111-111111111111	expense	100001.00	999999999.00	1	pm	t	2026-05-11 16:13:13.73458+07
b50e64a0-3acc-450e-a5fa-533118bb3a0a	11111111-1111-1111-1111-111111111111	expense	100001.00	999999999.00	2	finance	t	2026-05-11 16:13:13.73458+07
96d13927-c2a7-4aa2-864a-d95d138c2f91	11111111-1111-1111-1111-111111111111	expense	100001.00	999999999.00	3	executive	t	2026-05-11 16:13:13.73458+07
879fb53c-5c37-45e3-911a-2e71fc2dc621	11111111-1111-1111-1111-111111111111	budget	0.00	999999999.00	1	pm	t	2026-05-11 16:13:13.73458+07
9fb8a9d7-712d-410f-9a97-785aceb76c71	11111111-1111-1111-1111-111111111111	budget	0.00	999999999.00	2	executive	t	2026-05-11 16:13:13.73458+07
3f237f3e-32a5-423c-b2ca-f3b542a72152	11111111-1111-1111-1111-111111111111	ot	0.00	999999999.00	1	pm	t	2026-05-11 16:13:13.73458+07
c7a2bfb7-8c5d-4457-b618-7509091f1678	11111111-1111-1111-1111-111111111111	ot	0.00	999999999.00	2	executive	t	2026-05-11 16:13:13.73458+07
1f3ec57f-5e34-4504-a6c5-fb08c2032f79	11111111-1111-1111-1111-111111111111	vehicle	0.00	999999999.00	1	pm	t	2026-05-11 16:13:13.73458+07
c7363339-af57-458c-ac76-f7f6b8e3e952	11111111-1111-1111-1111-111111111111	travel	0.00	100000.00	1	pm	t	2026-05-11 16:13:13.73458+07
55a16df4-b909-4814-b726-8785b620e102	11111111-1111-1111-1111-111111111111	travel	100001.00	999999999.00	1	pm	t	2026-05-11 16:13:13.73458+07
ff60f5e3-de13-4384-9844-5f3f11c50461	11111111-1111-1111-1111-111111111111	travel	100001.00	999999999.00	2	executive	t	2026-05-11 16:13:13.73458+07
\.


--
-- Data for Name: approvals; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.approvals (id, company_id, doc_type, doc_id, step_order, required_role, approver_id, action, comment, acted_at, created_at) FROM stdin;
\.


--
-- Data for Name: attachments; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.attachments (id, company_id, project_id, doc_type, doc_id, file_name, file_url, file_size, mime_type, uploaded_by, created_at) FROM stdin;
\.


--
-- Data for Name: budget_lines; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.budget_lines (id, budget_id, name, category, tor_amount, budget_amount, actual_amount, sap_account, sort_order, created_at) FROM stdin;
8fa11dba-3c32-487c-a028-ab3a51a90a49	1908b9bb-0894-47d8-97e2-14659fd30c97	Material - Sounder	material	500000.00	480000.00	320000.00	114101	1	2026-05-11 17:21:22.736711+07
349f6496-e62b-4c54-8833-b899685719c9	1908b9bb-0894-47d8-97e2-14659fd30c97	Material - Sonar	material	350000.00	340000.00	335000.00	114101	2	2026-05-11 17:21:22.736711+07
43cd6cea-6c86-4451-ace1-d385b75c299b	1908b9bb-0894-47d8-97e2-14659fd30c97	Labor - Installation	labor	200000.00	200000.00	215000.00	522601	3	2026-05-11 17:21:22.736711+07
6f17a6db-cbf6-48a1-9e24-9076b2a5cfae	1908b9bb-0894-47d8-97e2-14659fd30c97	Labor - Calibration	labor	100000.00	95000.00	72000.00	522601	4	2026-05-11 17:21:22.736711+07
81696612-4ab5-4fd9-8e99-1d50649258c3	1908b9bb-0894-47d8-97e2-14659fd30c97	Transportation	transport	80000.00	75000.00	68000.00	522701	5	2026-05-11 17:21:22.736711+07
091946c9-19a1-4099-825a-f703df545f23	1908b9bb-0894-47d8-97e2-14659fd30c97	Misc / Contingency	misc	50000.00	45000.00	18000.00	522709	6	2026-05-11 17:21:22.736711+07
72a43cd3-9214-44f1-913a-fe9ad67157ed	3b7e97e1-e465-409b-8eb6-0ea45c1a739a	AIS Transponder x3	material	360000.00	350000.00	180000.00	114101	1	2026-05-11 17:21:23.433908+07
d48d1284-bde2-4c67-9bbe-422f885d69d6	3b7e97e1-e465-409b-8eb6-0ea45c1a739a	Antenna & Cable	material	120000.00	115000.00	60000.00	114101	2	2026-05-11 17:21:23.433908+07
e677c181-9c5c-418f-ac18-e60bc922c69c	3b7e97e1-e465-409b-8eb6-0ea45c1a739a	Installation Labor	labor	180000.00	175000.00	30000.00	522601	3	2026-05-11 17:21:23.433908+07
7d1024a5-37f7-4d5e-b54f-e56275d6b680	3b7e97e1-e465-409b-8eb6-0ea45c1a739a	Transportation	transport	60000.00	60000.00	10000.00	522701	4	2026-05-11 17:21:23.433908+07
a12a83e9-edd7-49d2-85ba-3e63b427905e	6074bb67-ff26-4350-b0f0-f5035bd47d1f	CCTV Camera x24	material	960000.00	920000.00	900000.00	114101	1	2026-05-11 17:21:23.433908+07
dcaa3433-ae41-46f4-ba6c-daac976c2ed5	6074bb67-ff26-4350-b0f0-f5035bd47d1f	NVR Server x2	material	400000.00	380000.00	370000.00	114101	2	2026-05-11 17:21:23.433908+07
4812926b-b780-40ad-b522-cc1ab7eccec1	6074bb67-ff26-4350-b0f0-f5035bd47d1f	Network Switch & Cable	material	280000.00	260000.00	250000.00	114101	3	2026-05-11 17:21:23.433908+07
9e2d3261-cd9b-47db-a742-a82174e666e2	6074bb67-ff26-4350-b0f0-f5035bd47d1f	Installation Labor	labor	350000.00	340000.00	100000.00	522601	4	2026-05-11 17:21:23.433908+07
c571aa45-d73e-43df-b022-3558bbb964d8	6074bb67-ff26-4350-b0f0-f5035bd47d1f	Software License	material	150000.00	140000.00	40000.00	114101	5	2026-05-11 17:21:23.433908+07
3fb78728-b23e-4f8e-a9a0-8f37e4e5bdf9	6074bb67-ff26-4350-b0f0-f5035bd47d1f	Misc	misc	60000.00	60000.00	20000.00	522709	6	2026-05-11 17:21:23.433908+07
\.


--
-- Data for Name: budgets; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.budgets (id, company_id, project_id, code, name, status, total_tor, total_budget, total_actual, fiscal_year, notes, created_by, approved_by, approved_at, created_at, updated_at) FROM stdin;
1908b9bb-0894-47d8-97e2-14659fd30c97	11111111-1111-1111-1111-111111111111	6d53551c-2c84-45ba-bac7-518d2bf81287	BG-2026-001	Budget Marine Nav Phuket	approved	1280000.00	1235000.00	1028000.00	2026	\N	1d57e25a-e741-4cc7-aa88-55276aba0df8	1d57e25a-e741-4cc7-aa88-55276aba0df8	\N	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
6647043e-dac5-41aa-97b2-58cce6987ce1	11111111-1111-1111-1111-111111111111	de7b0847-7026-4447-b7b8-1cf0b983d44b	BG-2026-002	Budget Sonar Rayong	approved	950000.00	920000.00	460000.00	2026	\N	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	\N	\N	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
be138035-4d1e-419b-9016-451c15a19925	11111111-1111-1111-1111-111111111111	e467ad24-f938-4728-a219-7d61c1dc0823	BG-2026-003	Budget Radar Bangkok	approved	1100000.00	1060000.00	1130000.00	2026	\N	d0b32103-3b47-45cc-8aa9-5e7030cf226a	\N	\N	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
57625273-fcca-483f-94d7-9b657fe717e6	11111111-1111-1111-1111-111111111111	10e762e9-bdc9-41d7-9756-0d0ed4cbdfc4	BG-2026-004	Budget GPS Fleet	approved	650000.00	630000.00	598000.00	2026	\N	1d57e25a-e741-4cc7-aa88-55276aba0df8	\N	\N	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
1aa6c03d-c005-4f27-8c5b-b6514b69c820	11111111-1111-1111-1111-111111111111	a3e5075c-0484-4631-b718-9af934802de1	BG-2026-005	Budget Satcom Chonburi	approved	1800000.00	1750000.00	1137500.00	2026	\N	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	\N	\N	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
3b7e97e1-e465-409b-8eb6-0ea45c1a739a	11111111-1111-1111-1111-111111111111	586d4de6-73eb-469d-92d2-7546654ff0dd	BG-2026-006	Budget AIS Repeater	approved	720000.00	700000.00	280000.00	2026	\N	d0b32103-3b47-45cc-8aa9-5e7030cf226a	\N	\N	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
dae4e663-fcfa-4955-b52e-f8e362578295	11111111-1111-1111-1111-111111111111	b1414314-c8cb-4184-98ac-baebae84a764	BG-2026-007	Budget Weather Station	approved	1500000.00	1450000.00	362500.00	2026	\N	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	\N	\N	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
6074bb67-ff26-4350-b0f0-f5035bd47d1f	11111111-1111-1111-1111-111111111111	c96cc3ca-23d9-40ca-a9d4-217f701767bb	BG-2026-008	Budget CCTV Laem Chabang	approved	2200000.00	2100000.00	1680000.00	2026	\N	1d57e25a-e741-4cc7-aa88-55276aba0df8	\N	\N	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
b156347d-a2cf-4616-8041-7228b24feb71	11111111-1111-1111-1111-111111111111	5e9c047f-a845-48d6-a2e5-dc1e5fdb323d	BG-2026-009	Budget Radio Navy	pending_manager	3500000.00	3400000.00	0.00	2026	\N	75b4f523-f342-4c11-97b5-26757ccf1449	\N	\N	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
badf579e-754d-48d1-b97c-b5fe0823460b	11111111-1111-1111-1111-111111111111	d8838034-b3f2-4781-83df-4f5f00a41061	BG-2026-010	Budget Echo Sounder	approved	350000.00	340000.00	340000.00	2026	\N	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	\N	\N	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
e3d27ecf-7480-405d-ba92-29354375d63e	11111111-1111-1111-1111-111111111111	5a190f8c-e256-498a-bb0f-4705b960dced	BG-2026-011	Budget VTS Map Ta Phut	approved	4800000.00	4600000.00	920000.00	2026	\N	d0b32103-3b47-45cc-8aa9-5e7030cf226a	\N	\N	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
2fb1d5d3-d0e1-4e69-b6f0-e6fcbd90fd72	11111111-1111-1111-1111-111111111111	aa52a2af-0912-4d3b-9de7-41f4dcc99fb0	BG-2026-012	Budget Gyro Ferry	approved	900000.00	880000.00	865000.00	2026	\N	1d57e25a-e741-4cc7-aa88-55276aba0df8	\N	\N	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
\.


--
-- Data for Name: calendar_events; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.calendar_events (id, company_id, project_id, title, description, start_time, end_time, all_day, location, event_type, doc_type, doc_id, created_by, created_at) FROM stdin;
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.companies (id, name, slug, tax_id, address, phone, logo_url, sap_config, settings, is_active, created_at, updated_at) FROM stdin;
11111111-1111-1111-1111-111111111111	บริษัท เอส.ดี.เอ. กรุ๊ป จำกัด	sda-group	0105529041298	367/1 อาคารเดชะรินทร์ ซอยศูนย์วิจัย 4 ถนนพระรามที่ 9 แขวงบางกะปิ เขตห้วยขวาง กรุงเทพมหานคร 10310	02-3195588	\N	{}	{}	t	2026-05-11 16:13:13.09673+07	2026-05-11 16:13:13.09673+07
\.


--
-- Data for Name: discussions; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.discussions (id, project_id, user_id, message, parent_id, created_at, updated_at) FROM stdin;
0569587f-53da-4300-aee5-81aa7e581946	6d53551c-2c84-45ba-bac7-518d2bf81287	1d57e25a-e741-4cc7-aa88-55276aba0df8	ทีม GPS calibration Phuket 15-17 May ใครไปบ้าง confirm ด้วยครับ	\N	2026-05-08 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
c912033a-405d-44fa-b481-c676a022de13	6d53551c-2c84-45ba-bac7-518d2bf81287	d0b32103-3b47-45cc-8aa9-5e7030cf226a	ผมไปครับ + คุณศิริขวัญ	\N	2026-05-08 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
e5487ff1-c921-4c73-ac21-881f84b0a5a7	6d53551c-2c84-45ba-bac7-518d2bf81287	95742447-39bf-46eb-8eea-ed16a808e164	ขอเลื่อน confirm เป็นวันพรุ่งนี้ได้ไหมคะ	\N	2026-05-09 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
f73d1511-d863-482d-9a9c-4437e453ae0f	c96cc3ca-23d9-40ca-a9d4-217f701767bb	1d57e25a-e741-4cc7-aa88-55276aba0df8	Zone C ติดตั้งเสร็จแล้ว รอ review จากคุณวินิจ	\N	2026-05-10 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
15efda82-456c-47ab-a914-ac9c7d14da47	c96cc3ca-23d9-40ca-a9d4-217f701767bb	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	รับทราบครับ จะ review ภายในวันนี้	\N	2026-05-10 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
d92efbcd-7626-4520-8834-78f4fe8f8fa3	c96cc3ca-23d9-40ca-a9d4-217f701767bb	24d99416-9114-405c-ac4d-97707f282c5c	NVR Software ต้องใช้ license ตัวใหม่ ราคา 85K ส่ง expense แล้วครับ	\N	2026-05-10 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
d1d6c404-9754-49e2-a333-b61052dc02b0	5a190f8c-e256-498a-bb0f-4705b960dced	d0b32103-3b47-45cc-8aa9-5e7030cf226a	VTS scope ใหญ่มาก ต้องจัดทีม 4 คนลงพื้นที่	\N	2026-05-06 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
67549294-d268-405c-8299-c179ede24f3a	5a190f8c-e256-498a-bb0f-4705b960dced	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	ผมว่างช่วง 28-30 May ครับ	\N	2026-05-07 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.expenses (id, company_id, project_id, doc_number, doc_date, expense_type, status, description, amount, tax_code, tax_amount, sap_account, receipt_url, receipt_data, advance_ref_id, sap_doc_entry, sap_doc_num, sap_synced_at, budget_deducted, paid_at, created_by, created_at, updated_at) FROM stdin;
b1fa54d7-fc87-4410-9bef-d479bbb24d87	11111111-1111-1111-1111-111111111111	6d53551c-2c84-45ba-bac7-518d2bf81287	EXP26050001	2026-05-05	reimbursement	paid	ค่าอาหารทีมงาน Workshop	8700.00	\N	0.00	522603	\N	{}	\N	\N	\N	\N	f	\N	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
b4e160ac-5a2f-4857-836f-f6873ffa2811	11111111-1111-1111-1111-111111111111	6d53551c-2c84-45ba-bac7-518d2bf81287	EXP26050002	2026-05-06	reimbursement	approved	ค่าขนส่งอุปกรณ์ Phuket	35000.00	\N	0.00	522701	\N	{}	\N	\N	\N	\N	f	\N	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
0c5a4c44-99cd-45ff-81fc-5f68d0e66f46	11111111-1111-1111-1111-111111111111	6d53551c-2c84-45ba-bac7-518d2bf81287	EXP26050003	2026-05-09	reimbursement	pending_manager	ค่าที่พัก ภูเก็ต 2 คืน	12500.00	\N	0.00	522602	\N	{}	\N	\N	\N	\N	f	\N	ebee042c-0b67-4061-8ae0-6755b8549575	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
be85c2d5-ee4f-43cb-9a59-7f7684c07cfe	11111111-1111-1111-1111-111111111111	de7b0847-7026-4447-b7b8-1cf0b983d44b	EXP26050004	2026-05-10	reimbursement	pending_finance	ค่าน้ำมันเดินทาง Rayong-Bangkok	2800.00	\N	0.00	522701	\N	{}	\N	\N	\N	\N	f	\N	95742447-39bf-46eb-8eea-ed16a808e164	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
324071b7-1dcf-4009-a005-229e995be6cd	11111111-1111-1111-1111-111111111111	\N	EXP26050005	2026-05-11	reimbursement	draft	ค่าเครื่องเขียนสำนักงาน	1250.00	\N	0.00	522709	\N	{}	\N	\N	\N	\N	f	\N	95742447-39bf-46eb-8eea-ed16a808e164	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
48e5684c-1d2a-434a-9354-63b232260126	11111111-1111-1111-1111-111111111111	a3e5075c-0484-4631-b718-9af934802de1	ADV26050001	2026-05-07	advance	pending_executive	เงินทดรองจ่าย - เดินทาง Chonburi	20000.00	\N	0.00	113103	\N	{}	\N	\N	\N	\N	f	\N	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
d70408b7-ca49-46bf-8df7-f6bc9f069fdc	11111111-1111-1111-1111-111111111111	6d53551c-2c84-45ba-bac7-518d2bf81287	EXP26040015	2026-04-28	reimbursement	sent_to_sap	ค่าวัสดุทดสอบ Calibration	15400.00	\N	0.00	522709	\N	{}	\N	\N	\N	\N	f	\N	ebee042c-0b67-4061-8ae0-6755b8549575	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
6ae88230-08c9-42d8-865a-995d28479a55	11111111-1111-1111-1111-111111111111	a3e5075c-0484-4631-b718-9af934802de1	ADV26040003	2026-04-25	advance_clear	sent_to_sap	เคลียร์เงินทดรอง - งาน Chonburi	18200.00	\N	0.00	113103	\N	{}	\N	\N	\N	\N	f	\N	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
3f7e8c7b-5dc0-400e-9bf0-0b2223542c6a	11111111-1111-1111-1111-111111111111	c96cc3ca-23d9-40ca-a9d4-217f701767bb	EXP26040010	2026-04-10	reimbursement	sent_to_sap	ค่าเช่ารถเครน ติดตั้งกล้อง	45000.00	\N	0.00	522601	\N	{}	\N	\N	\N	\N	f	\N	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
27757e6f-3544-4b4b-9f0e-4506a4fc8480	11111111-1111-1111-1111-111111111111	c96cc3ca-23d9-40ca-a9d4-217f701767bb	EXP26040011	2026-04-15	reimbursement	sent_to_sap	ค่าที่พักแหลมฉบัง 5 คืน	25000.00	\N	0.00	522602	\N	{}	\N	\N	\N	\N	f	\N	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
80288e4b-6962-4f64-9eb7-eddf45d7ab26	11111111-1111-1111-1111-111111111111	586d4de6-73eb-469d-92d2-7546654ff0dd	EXP26050006	2026-05-05	reimbursement	approved	ค่าเรือข้ามฟาก สุราษฎร์	3500.00	\N	0.00	522601	\N	{}	\N	\N	\N	\N	f	\N	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
47e5ef28-c005-4acc-8a37-f2b4e2cd108d	11111111-1111-1111-1111-111111111111	586d4de6-73eb-469d-92d2-7546654ff0dd	EXP26050007	2026-05-06	reimbursement	approved	ค่าอาหาร ทีมงาน 3 คน 2 วัน	4800.00	\N	0.00	522603	\N	{}	\N	\N	\N	\N	f	\N	ebee042c-0b67-4061-8ae0-6755b8549575	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
5242d514-77ee-4be7-b9fc-a758e1c1f296	11111111-1111-1111-1111-111111111111	b1414314-c8cb-4184-98ac-baebae84a764	EXP26050008	2026-05-08	reimbursement	pending_manager	ค่าขนส่งอุปกรณ์ Weather Station	18500.00	\N	0.00	522701	\N	{}	\N	\N	\N	\N	f	\N	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
666f7767-63b2-4060-9fcf-4c44e9e4e099	11111111-1111-1111-1111-111111111111	5a190f8c-e256-498a-bb0f-4705b960dced	EXP26050009	2026-05-09	reimbursement	pending_manager	ค่าเช่าเรือสำรวจ Map Ta Phut	35000.00	\N	0.00	522601	\N	{}	\N	\N	\N	\N	f	\N	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
b456d724-15ec-4ba9-ae43-31b6c6c53a7f	11111111-1111-1111-1111-111111111111	c96cc3ca-23d9-40ca-a9d4-217f701767bb	EXP26050010	2026-05-10	reimbursement	pending_finance	ค่า Software License CCTV	85000.00	\N	0.00	522709	\N	{}	\N	\N	\N	\N	f	\N	24d99416-9114-405c-ac4d-97707f282c5c	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
578ac39f-db1c-40c4-a9c9-287d290cb761	11111111-1111-1111-1111-111111111111	5a190f8c-e256-498a-bb0f-4705b960dced	ADV26050002	2026-05-10	advance	pending_executive	เบิกล่วงหน้า สำรวจ VTS มาบตาพุด	50000.00	\N	0.00	113103	\N	{}	\N	\N	\N	\N	f	\N	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
ae70791e-382b-4d74-bd53-6edf35a7dacb	11111111-1111-1111-1111-111111111111	b1414314-c8cb-4184-98ac-baebae84a764	ADV26050003	2026-05-11	advance	pending_manager	เงินทดรอง เดินทาง Chumphon	15000.00	\N	0.00	113103	\N	{}	\N	\N	\N	\N	f	\N	95742447-39bf-46eb-8eea-ed16a808e164	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
23e4b516-b824-4356-8079-e523cd164dbc	11111111-1111-1111-1111-111111111111	\N	EXP26050011	2026-05-11	reimbursement	draft	ค่าซ่อมเครื่องพิมพ์	2800.00	\N	0.00	522709	\N	{}	\N	\N	\N	\N	f	\N	e2f86c40-6851-4068-9754-79985bdc7576	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
a4ea1d3c-afcd-45a6-b634-02f05889a8d8	11111111-1111-1111-1111-111111111111	d8838034-b3f2-4781-83df-4f5f00a41061	EXP26030005	2026-03-15	reimbursement	sent_to_sap	ค่าอะไหล่ Echo Sounder	42000.00	\N	0.00	511120	\N	{}	\N	\N	\N	\N	f	\N	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
882c9d0e-7dda-49a5-a718-1780f3777450	11111111-1111-1111-1111-111111111111	aa52a2af-0912-4d3b-9de7-41f4dcc99fb0	EXP26020008	2026-02-10	reimbursement	sent_to_sap	ค่าเปลี่ยน Gyro Sensor	185000.00	\N	0.00	511120	\N	{}	\N	\N	\N	\N	f	\N	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
dcf0bc34-55ab-4a43-b085-6e383f3a45b9	11111111-1111-1111-1111-111111111111	\N	EXP26050012	2026-05-12	reimbursement	draft		0.00	No	0.00		\N	{}	\N	\N	\N	\N	f	\N	5959a486-ba8f-4416-95a0-9dcb6eb54745	2026-05-12 11:00:02.985984+07	2026-05-12 11:00:02.985984+07
\.


--
-- Data for Name: notes; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.notes (id, project_id, title, content, note_type, created_by, created_at, updated_at) FROM stdin;
d7cb2708-3c94-403b-bd20-90dc271d5f0a	6d53551c-2c84-45ba-bac7-518d2bf81287	Meeting: Phuket Site Survey	สรุปการประชุม:\\n- จุดติดตั้ง GPS ตรงห้องควบคุมเรือ\\n- ต้องเดินสายใหม่ทั้งหมด\\n- ลูกค้าต้องการ test ก่อน 31 May	meeting	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-03-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
871c3b87-0a70-44e9-9aae-9680ea750a63	6d53551c-2c84-45ba-bac7-518d2bf81287	SOW: Marine Navigation System	Scope of Work:\\n1. Sounder + Sonar + GPS installation\\n2. System integration\\n3. Training & handover\\n4. 1 year warranty	sow	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-02-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
8043752a-975f-470a-83fa-b9eaa46691d9	c96cc3ca-23d9-40ca-a9d4-217f701767bb	Meeting: CCTV Progress Review	Zone A, B เสร็จแล้ว\\nZone C กำลัง review\\nSoftware license ต้องซื้อเพิ่ม\\nเป้าหมาย go-live: มิ.ย. 2026	meeting	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-04 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
7ac6d43c-7fde-40bd-8d9b-fe0349b574f3	5a190f8c-e256-498a-bb0f-4705b960dced	Meeting: VTS Kickoff	โปรเจกต์ใหญ่ ฿4.8M\\nต้อง survey 3 จุด\\nRadar + AIS + Software\\nทีม: Phuchong (PM), Winit, Jathuthep, Sirikwan	meeting	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-03-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.notifications (id, company_id, user_id, channel, title, body, link_url, doc_type, doc_id, is_read, read_at, created_at) FROM stdin;
8b6a44f6-9f16-44c3-b71f-6e8dc99ef4c1	11111111-1111-1111-1111-111111111111	5959a486-ba8f-4416-95a0-9dcb6eb54745	in_app	PR ฿180,000 รออนุมัติ	PR26050014 — Wave Radar System จาก Phuchong M.	pr-po.html?hl=pending	pr	\N	f	\N	2026-05-11 15:21:23.433908+07
13bf084e-fe85-49a1-b26e-bc51ab6a5e6c	11111111-1111-1111-1111-111111111111	5959a486-ba8f-4416-95a0-9dcb6eb54745	in_app	Budget BG-2026-009 รออนุมัติ	งบ Radio Navy ฿3.4M จาก Norawat S.	budget.html?hl=pending	budget	\N	f	\N	2026-05-11 12:21:23.433908+07
7579e253-7889-4354-ab27-30eff54df61a	11111111-1111-1111-1111-111111111111	5959a486-ba8f-4416-95a0-9dcb6eb54745	in_app	Advance ฿50,000 รออนุมัติ	ADV26050002 — VTS มาบตาพุด จาก Phuchong M.	expense.html?hl=pending	expense	\N	f	\N	2026-05-10 17:21:23.433908+07
54551d1d-36da-41cc-b9c6-a328bb3ccb6f	11111111-1111-1111-1111-111111111111	5959a486-ba8f-4416-95a0-9dcb6eb54745	in_app	Travel TRV26050002 รออนุมัติ	เดินทาง ชลบุรี 20-21 May — Jathuthep K.	travel.html?hl=pending	travel	\N	f	\N	2026-05-10 17:21:23.433908+07
b521e40f-9fb0-4fcf-936c-f7cc2616323b	11111111-1111-1111-1111-111111111111	5959a486-ba8f-4416-95a0-9dcb6eb54745	in_app	OT ฿6,400 รออนุมัติ	OT26050014 — Teera S. ตั้งค่า NVR วันเสาร์	ot.html?hl=pending	ot	\N	f	\N	2026-05-11 11:21:23.433908+07
9ee253c8-c8e9-49e5-815a-40f8455ca54d	11111111-1111-1111-1111-111111111111	1d57e25a-e741-4cc7-aa88-55276aba0df8	in_app	PR26050012 ถูกส่งให้อนุมัติ	Sounder Transducer ฿85,000 รอคุณอนุมัติ	pr-po.html?hl=pending	pr	\N	f	\N	2026-05-08 17:21:23.433908+07
cadf0ae6-953f-4861-b97f-7b70d9973c98	11111111-1111-1111-1111-111111111111	1d57e25a-e741-4cc7-aa88-55276aba0df8	in_app	Travel Phuket ก่อนเดินทาง 1 วัน	TRV26050001 — Noppamas B. ยังไม่ confirm	travel.html?hl=pending	travel	\N	f	\N	2026-05-11 05:21:23.433908+07
5ad5b3ad-d30f-4ceb-bb66-7799ff9b8daf	11111111-1111-1111-1111-111111111111	111d26db-f886-4f69-a1f6-cb94addefa7e	in_app	Expense ฿85,000 รอ Finance อนุมัติ	EXP26050010 — Software License CCTV	expense.html?hl=pending	expense	\N	f	\N	2026-05-10 17:21:23.433908+07
c04ed75d-394c-4876-9a0d-243a38963a7c	11111111-1111-1111-1111-111111111111	111d26db-f886-4f69-a1f6-cb94addefa7e	in_app	PR ฿1.2M รอ Finance อนุมัติ	PR26050020 — VTS Radar Equipment	pr-po.html?hl=pending	pr	\N	f	\N	2026-05-09 17:21:23.433908+07
45f9d981-948e-46be-8c4f-6dad5a29016c	11111111-1111-1111-1111-111111111111	32ae2c60-b3e7-4834-8729-23a4b3ecb2da	in_app	PO26050006 รอ Procurement ตรวจสอบ	JRC Global ฿1.2M — VTS Map Ta Phut	pr-po.html?hl=pending	po	\N	f	\N	2026-05-11 11:21:23.433908+07
7fa0990f-ec58-46cf-9f08-ac4d10761f4b	11111111-1111-1111-1111-111111111111	d0b32103-3b47-45cc-8aa9-5e7030cf226a	in_app	Budget BG-2026-006 อนุมัติแล้ว	งบ AIS Repeater ฿700K ผ่านแล้ว	budget.html	budget	\N	t	\N	2026-05-01 17:21:23.433908+07
d1351caf-2f99-4cde-a350-37c3580b9b19	11111111-1111-1111-1111-111111111111	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	in_app	PO26050003 อนุมัติแล้ว	Sonar Module ฿62,000 ผ่านแล้ว	pr-po.html	po	\N	t	\N	2026-05-07 17:21:23.433908+07
\.


--
-- Data for Name: number_series; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.number_series (id, company_id, doc_type, prefix, year_month, current_number, sap_series_name, sap_synced, created_at, updated_at) FROM stdin;
17476e2f-942c-4427-9314-945dd6ff8239	11111111-1111-1111-1111-111111111111	PO	PO	2605	8	\N	t	2026-05-12 09:48:06.723205+07	2026-05-12 09:48:06.723205+07
43e0692b-ef50-4393-b4e8-727caadab26d	11111111-1111-1111-1111-111111111111	ADV	ADV	2605	3	\N	f	2026-05-12 09:48:06.723205+07	2026-05-12 09:48:06.723205+07
6df4fee2-39b1-45de-852e-e7da6f9ed5d7	11111111-1111-1111-1111-111111111111	TRV	TRV	2605	6	\N	f	2026-05-12 09:48:06.723205+07	2026-05-12 09:48:06.723205+07
614ab88a-d536-444b-b3b0-44bbed881bff	11111111-1111-1111-1111-111111111111	OT	OT	2605	15	\N	f	2026-05-12 09:48:06.723205+07	2026-05-12 09:48:06.723205+07
3aa50568-625c-4658-bb3a-06f4258a03aa	11111111-1111-1111-1111-111111111111	VHC	VHC	2605	8	\N	f	2026-05-12 09:48:06.723205+07	2026-05-12 09:48:06.723205+07
484ebcce-32cd-4197-9951-0c36a40ee876	11111111-1111-1111-1111-111111111111	BG	BG	2605	12	\N	f	2026-05-12 09:48:06.723205+07	2026-05-12 09:48:06.723205+07
e76cb6c9-8917-4059-b6de-485ee804b3c9	11111111-1111-1111-1111-111111111111	PR	PR	2605	24	\N	t	2026-05-12 09:48:06.723205+07	2026-05-12 10:55:35.753502+07
b4a220ce-5c72-46c8-8d01-863c828f7eed	11111111-1111-1111-1111-111111111111	EXP	EXP	2605	12	\N	t	2026-05-12 09:48:06.723205+07	2026-05-12 11:00:02.946818+07
\.


--
-- Data for Name: ot_requests; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.ot_requests (id, company_id, project_id, doc_number, user_id, ot_date, ot_type, hours, base_rate, multiplier, compensation, status, reason, paid_at, created_by, created_at, updated_at) FROM stdin;
9f183d87-89d4-4515-9ba5-5c1694be4fb5	11111111-1111-1111-1111-111111111111	6d53551c-2c84-45ba-bac7-518d2bf81287	OT26050010	ebee042c-0b67-4061-8ae0-6755b8549575	2026-05-11	holiday	8.0	300.00	2.0	4800.00	pending_manager	Weekend Installation	\N	ebee042c-0b67-4061-8ae0-6755b8549575	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
101d3c49-c4aa-458a-b66d-31510e2f32d9	11111111-1111-1111-1111-111111111111	6d53551c-2c84-45ba-bac7-518d2bf81287	OT26050011	95742447-39bf-46eb-8eea-ed16a808e164	2026-05-10	normal	4.0	250.00	1.5	1500.00	pending_manager	Evening Documentation	\N	95742447-39bf-46eb-8eea-ed16a808e164	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
b2df61c7-3197-4248-b9f0-1966811bb5c7	11111111-1111-1111-1111-111111111111	e467ad24-f938-4728-a219-7d61c1dc0823	OT26050012	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-09	holiday	6.0	450.00	2.0	5400.00	pending_executive	Emergency Repair	\N	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
510c19de-2ae2-4e39-aa8d-b2ebbf21eaf2	11111111-1111-1111-1111-111111111111	de7b0847-7026-4447-b7b8-1cf0b983d44b	OT26050007	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-07	normal	3.0	450.00	1.5	2025.00	approved	System Testing	\N	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
b72a8c1e-f2f9-4c64-9aca-d2997f5006fe	11111111-1111-1111-1111-111111111111	a3e5075c-0484-4631-b718-9af934802de1	OT26050004	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-04	holiday	8.0	450.00	2.0	7200.00	paid	Holiday Deployment	\N	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
276d72f1-f643-46cd-aee3-e7b71efbcce2	11111111-1111-1111-1111-111111111111	c96cc3ca-23d9-40ca-a9d4-217f701767bb	OT26050001	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-03	holiday	8.0	450.00	2.0	7200.00	paid	ติดตั้งกล้อง Zone B วันหยุด	\N	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
0b5479d2-4447-4d06-a0b5-24268b6ad939	11111111-1111-1111-1111-111111111111	c96cc3ca-23d9-40ca-a9d4-217f701767bb	OT26050002	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-03	holiday	8.0	450.00	2.0	7200.00	paid	ติดตั้งกล้อง Zone B วันหยุด	\N	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
63d9e0e8-38d2-4057-929d-591884f8db12	11111111-1111-1111-1111-111111111111	c96cc3ca-23d9-40ca-a9d4-217f701767bb	OT26050003	ebee042c-0b67-4061-8ae0-6755b8549575	2026-05-03	holiday	6.0	300.00	2.0	3600.00	paid	ช่วยติดตั้งกล้อง Zone B	\N	ebee042c-0b67-4061-8ae0-6755b8549575	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
68f6cfdc-1770-45ec-a220-f7485edfe5e9	11111111-1111-1111-1111-111111111111	de7b0847-7026-4447-b7b8-1cf0b983d44b	OT26050005	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-05	normal	3.0	450.00	1.5	2025.00	approved	ทดสอบ Sonar หลังเลิกงาน	\N	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
199fa97c-bf78-4f57-a885-59b1c2559e12	11111111-1111-1111-1111-111111111111	de7b0847-7026-4447-b7b8-1cf0b983d44b	OT26050006	95742447-39bf-46eb-8eea-ed16a808e164	2026-05-05	normal	2.0	250.00	1.5	750.00	approved	เก็บข้อมูลทดสอบ Sonar	\N	95742447-39bf-46eb-8eea-ed16a808e164	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
f53a299a-b6e1-4c2f-8f33-c35976ff2052	11111111-1111-1111-1111-111111111111	586d4de6-73eb-469d-92d2-7546654ff0dd	OT26050008	ebee042c-0b67-4061-8ae0-6755b8549575	2026-05-06	normal	4.0	300.00	1.5	1800.00	approved	เดินสาย AIS จุดที่ 2	\N	ebee042c-0b67-4061-8ae0-6755b8549575	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
b0ae466f-4cc2-45b3-8092-3d35281ddfbf	11111111-1111-1111-1111-111111111111	586d4de6-73eb-469d-92d2-7546654ff0dd	OT26050009	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-07	normal	3.0	450.00	1.5	2025.00	approved	ทดสอบสัญญาณ AIS	\N	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
785de1eb-81cf-42bc-8aed-0c2f2a89c445	11111111-1111-1111-1111-111111111111	5a190f8c-e256-498a-bb0f-4705b960dced	OT26050013	24d99416-9114-405c-ac4d-97707f282c5c	2026-05-11	normal	4.0	400.00	1.5	2400.00	pending_manager	ออกแบบ Network VTS	\N	24d99416-9114-405c-ac4d-97707f282c5c	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
9dc9cf27-ec7e-475f-a527-0e73bc8b43fe	11111111-1111-1111-1111-111111111111	c96cc3ca-23d9-40ca-a9d4-217f701767bb	OT26050014	24d99416-9114-405c-ac4d-97707f282c5c	2026-05-10	holiday	8.0	400.00	2.0	6400.00	pending_executive	ตั้งค่า NVR วันเสาร์	\N	24d99416-9114-405c-ac4d-97707f282c5c	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
17b36ac6-a12a-4e49-b845-d1aba3c74081	11111111-1111-1111-1111-111111111111	b1414314-c8cb-4184-98ac-baebae84a764	OT26050015	95742447-39bf-46eb-8eea-ed16a808e164	2026-05-11	normal	3.0	250.00	1.5	1125.00	pending_manager	เตรียมเอกสาร Weather Station	\N	95742447-39bf-46eb-8eea-ed16a808e164	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
\.


--
-- Data for Name: phase_steps; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.phase_steps (id, phase_id, name, sort_order, status, assigned_to, start_date, end_date, completed_at, created_at) FROM stdin;
2093a010-fca7-4c75-8e32-cdb226d3825f	07dc2cc2-60b2-46ef-877f-8cc2bd6cabe8	Site survey & requirement gathering	1	done	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-01-15	2026-01-20	\N	2026-05-11 17:21:23.433908+07
4ebd325d-2b33-44d5-b4f9-99da2530acd2	07dc2cc2-60b2-46ef-877f-8cc2bd6cabe8	System design & specification	2	done	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-01-21	2026-02-10	\N	2026-05-11 17:21:23.433908+07
45879ba9-7795-490d-baa8-b827df900c19	07dc2cc2-60b2-46ef-877f-8cc2bd6cabe8	Customer sign-off design document	3	done	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-02-28	2026-02-28	\N	2026-05-11 17:21:23.433908+07
9fee9556-e8e5-452d-b2bf-d05c2c5401ce	2d8257d6-6232-42aa-b4fa-2f7863ca87d9	Create PR for Sounder + Sonar + GPS	1	done	32ae2c60-b3e7-4834-8729-23a4b3ecb2da	2026-03-01	2026-03-05	\N	2026-05-11 17:21:23.433908+07
f74422c5-4d05-460f-9945-7217570a570a	2d8257d6-6232-42aa-b4fa-2f7863ca87d9	PO approved & sent to SAP	2	done	eb90ebce-b926-4e40-82cd-2d746b24b28d	2026-03-10	2026-03-10	\N	2026-05-11 17:21:23.433908+07
d960f9cc-ed63-417e-84f1-3e4e0daf41dd	2d8257d6-6232-42aa-b4fa-2f7863ca87d9	Equipment received & QC checked	3	done	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-03-25	2026-03-25	\N	2026-05-11 17:21:23.433908+07
3c29d756-6835-4937-952c-60abbc79ee66	1e9295ec-d528-4b4a-86c2-ca5e2330c687	Sounder installation & wiring	1	done	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-04-01	2026-04-15	\N	2026-05-11 17:21:23.433908+07
25062c09-37d5-41b1-ba56-d0b72f7f52cd	1e9295ec-d528-4b4a-86c2-ca5e2330c687	Sonar module installation	2	done	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-04-16	2026-04-30	\N	2026-05-11 17:21:23.433908+07
92a51487-3db9-48bb-b809-1877c4be35d4	1e9295ec-d528-4b4a-86c2-ca5e2330c687	GPS integration & calibration	3	active	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-01	2026-05-15	\N	2026-05-11 17:21:23.433908+07
c7870585-e7c3-42b0-b8f7-96498e632a25	1e9295ec-d528-4b4a-86c2-ca5e2330c687	System integration test	4	pending	ebee042c-0b67-4061-8ae0-6755b8549575	2026-05-16	2026-05-25	\N	2026-05-11 17:21:23.433908+07
4593fd5e-241b-4950-aa73-1c5c571534bb	1e9295ec-d528-4b4a-86c2-ca5e2330c687	UAT with customer	5	pending	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-26	2026-05-31	\N	2026-05-11 17:21:23.433908+07
378ee1e5-5168-40da-a7c8-5ec36236e669	987fe99d-9766-4869-9c38-5f936c3a8248	Documentation & manual	1	pending	95742447-39bf-46eb-8eea-ed16a808e164	2026-06-01	2026-06-10	\N	2026-05-11 17:21:23.433908+07
02843f08-7080-4d1b-a19f-d7a97f07c660	987fe99d-9766-4869-9c38-5f936c3a8248	Customer training	2	pending	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-06-11	2026-06-20	\N	2026-05-11 17:21:23.433908+07
c61a057b-e413-4df4-be94-325b069eaea3	987fe99d-9766-4869-9c38-5f936c3a8248	Final sign-off & warranty start	3	pending	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-06-30	2026-06-30	\N	2026-05-11 17:21:23.433908+07
646a7236-5d66-459d-90fd-82eeaaebfdbf	0965667c-1473-4525-bee8-2d8237306856	สำรวจพื้นที่ติดตั้ง Sonar ระยอง	1	done	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-02-01	2026-02-10	\N	2026-05-11 18:55:31.797887+07
7f2f03e3-2480-409a-b342-9ca1badcb853	0965667c-1473-4525-bee8-2d8237306856	ออกแบบ layout + spec	2	done	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-02-11	2026-02-20	\N	2026-05-11 18:55:31.797887+07
61cc18e9-ac32-4c80-ad6e-9f6f3dd4f2db	0965667c-1473-4525-bee8-2d8237306856	ลูกค้า approve design	3	done	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-02-28	2026-02-28	\N	2026-05-11 18:55:31.797887+07
9d08c23d-01a1-4714-8866-64d3377223a7	32603fdd-5168-40be-8711-a3964c15360f	สร้าง PR สั่งซื้อ Sonar Module	1	done	32ae2c60-b3e7-4834-8729-23a4b3ecb2da	2026-03-01	2026-03-05	\N	2026-05-11 18:55:31.797887+07
07edb96a-2ea1-4ab0-a832-df7f23a8f37e	32603fdd-5168-40be-8711-a3964c15360f	PO อนุมัติ + ส่ง SAP	2	done	eb90ebce-b926-4e40-82cd-2d746b24b28d	2026-03-10	2026-03-10	\N	2026-05-11 18:55:31.797887+07
161fa41d-aa21-4d7e-bb88-938e344c9102	32603fdd-5168-40be-8711-a3964c15360f	รับของ + ตรวจสอบคุณภาพ	3	done	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-03-28	2026-03-31	\N	2026-05-11 18:55:31.797887+07
75a15b69-aa49-4489-81b8-12a67e38bcf7	183cabf8-f65c-43d3-bd9c-a4aea06a89c2	ติดตั้ง Sonar transducer ใต้น้ำ	1	done	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-04-01	2026-04-15	\N	2026-05-11 18:55:31.797887+07
95eb0602-4422-44b7-b5e9-67568b809491	183cabf8-f65c-43d3-bd9c-a4aea06a89c2	เดินสาย cable + display unit	2	in_progress	ebee042c-0b67-4061-8ae0-6755b8549575	2026-04-16	2026-05-15	\N	2026-05-11 18:55:31.797887+07
4a9b30a6-2534-488a-8504-85f95b1a4b59	183cabf8-f65c-43d3-bd9c-a4aea06a89c2	สอบเทียบค่า depth reading	3	pending	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-16	2026-05-31	\N	2026-05-11 18:55:31.797887+07
77779630-2ca9-484b-830e-d6bef8e644fa	183cabf8-f65c-43d3-bd9c-a4aea06a89c2	ทดสอบระบบรวม	4	pending	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-06-01	2026-06-15	\N	2026-05-11 18:55:31.797887+07
3a15b5fa-9939-4508-b558-48ff70598cad	e9b6398e-c524-4a49-a6ed-db1cce4bbdc2	UAT กับลูกค้า	1	pending	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-06-16	2026-06-30	\N	2026-05-11 18:55:31.797887+07
8fa2239e-b989-40b3-95bd-1096dd54aa7a	e9b6398e-c524-4a49-a6ed-db1cce4bbdc2	จัดทำเอกสาร + คู่มือ	2	pending	95742447-39bf-46eb-8eea-ed16a808e164	2026-07-01	2026-07-15	\N	2026-05-11 18:55:31.797887+07
ad61583c-01db-4f54-9c25-630c5c712dcb	e9b6398e-c524-4a49-a6ed-db1cce4bbdc2	ส่งมอบ + เริ่มรับประกัน	3	pending	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-07-31	2026-07-31	\N	2026-05-11 18:55:31.797887+07
2d5a625c-95fa-4de6-82aa-e18780f5f35d	e9affd4a-df62-4463-b4d0-4755eb5f4960	ตรวจสอบระบบ Radar เดิม	1	done	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-03-01	2026-03-10	\N	2026-05-11 18:55:31.797887+07
f7c003ca-dd6c-424c-926a-7938edb73fd6	e9affd4a-df62-4463-b4d0-4755eb5f4960	วางแผน upgrade + เสนอราคา	2	done	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-03-11	2026-03-25	\N	2026-05-11 18:55:31.797887+07
53e3c156-da01-485d-ab25-9abf8c0bb6ae	e9affd4a-df62-4463-b4d0-4755eb5f4960	อนุมัติแผนงาน	3	done	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-03-31	2026-03-31	\N	2026-05-11 18:55:31.797887+07
c1bc562a-fe6a-4d97-81d1-5f69d965a4d5	ce09e0cb-fe98-45e2-ad0b-d9ead0c54402	สั่งซื้อ Wave Radar ใหม่	1	done	32ae2c60-b3e7-4834-8729-23a4b3ecb2da	2026-04-01	2026-04-15	\N	2026-05-11 18:55:31.797887+07
110b2b1c-7232-4b05-aba6-5f50a6fc63c9	ce09e0cb-fe98-45e2-ad0b-d9ead0c54402	ถอดระบบ Radar เก่า	2	pending	ebee042c-0b67-4061-8ae0-6755b8549575	2026-05-01	2026-05-15	\N	2026-05-11 18:55:31.797887+07
682298df-e8a9-4cd6-baa5-82b1ad7f3eab	ce09e0cb-fe98-45e2-ad0b-d9ead0c54402	เตรียมโครงสร้างรองรับตัวใหม่	3	pending	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-16	2026-06-15	\N	2026-05-11 18:55:31.797887+07
e074d554-0bed-4848-8086-89eadc024ac5	c1b66a44-97d1-4b74-8096-e72ec3ce8d12	ติดตั้ง Wave Radar ใหม่	1	pending	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-07-01	2026-07-20	\N	2026-05-11 18:55:31.797887+07
1c7054b1-4241-441a-912c-211f0931a01b	c1b66a44-97d1-4b74-8096-e72ec3ce8d12	ทดสอบ + Commissioning	2	pending	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-07-21	2026-08-15	\N	2026-05-11 18:55:31.797887+07
676398d3-7c3c-4c91-92af-f87bcadd5ad3	c1b66a44-97d1-4b74-8096-e72ec3ce8d12	ส่งมอบ	3	pending	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-08-31	2026-08-31	\N	2026-05-11 18:55:31.797887+07
27cf14fd-9f1e-44da-95dd-0c426763624f	cbb29e11-de18-4717-af2d-0c20eb0d58eb	ออกแบบระบบ GPS Fleet	1	done	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-01-01	2026-01-15	\N	2026-05-11 18:55:31.797887+07
e79ea8b2-8d3e-40d1-8420-79c388a0a20c	cbb29e11-de18-4717-af2d-0c20eb0d58eb	จัดซื้อ GPS Module	2	done	32ae2c60-b3e7-4834-8729-23a4b3ecb2da	2026-01-16	2026-02-15	\N	2026-05-11 18:55:31.797887+07
03396e9d-4a4e-40a7-acbc-68affbecaff8	b9dd6468-f937-4b53-bc55-6b33a823287a	ติดตั้ง GPS บนรถ 15 คัน	1	done	95742447-39bf-46eb-8eea-ed16a808e164	2026-02-16	2026-03-31	\N	2026-05-11 18:55:31.797887+07
05209bd9-3bcd-4fbd-ad3e-4a427e812a4c	b9dd6468-f937-4b53-bc55-6b33a823287a	ตั้งค่า Server + Software	2	done	24d99416-9114-405c-ac4d-97707f282c5c	2026-04-01	2026-04-15	\N	2026-05-11 18:55:31.797887+07
d9e9e5de-2008-4170-87a6-0516777ce890	f9e35f8f-597a-41b7-a7a7-614d9fadec7c	ทดสอบ Tracking ครบ 15 คัน	1	done	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-04-16	2026-04-30	\N	2026-05-11 18:55:31.797887+07
d6a68a74-d821-4597-8a36-59953e145345	f9e35f8f-597a-41b7-a7a7-614d9fadec7c	อบรมผู้ใช้งาน	2	done	95742447-39bf-46eb-8eea-ed16a808e164	2026-05-01	2026-05-10	\N	2026-05-11 18:55:31.797887+07
94b2ddbf-2835-4a0b-aebd-93c25b87e937	f9e35f8f-597a-41b7-a7a7-614d9fadec7c	Go-live + Monitor	3	active	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11	2026-05-31	\N	2026-05-11 18:55:31.797887+07
a76f0020-0e3d-401e-aed9-646756a0c2a9	cca531d5-2e4f-4653-9520-4649ecaf5b3a	Survey สถานที่ + ความต้องการ	1	done	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-02-15	2026-03-01	\N	2026-05-11 18:55:31.797887+07
d2741817-83b2-43ed-ac09-4b82687678e3	cca531d5-2e4f-4653-9520-4649ecaf5b3a	ออกแบบ Satcom system	2	done	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-03-02	2026-03-31	\N	2026-05-11 18:55:31.797887+07
fd06b2dc-9d07-4889-9150-6ddf70860725	5c5d2b18-60ac-4bb6-a017-bae3fbb1bc30	สั่งซื้อ Satcom Terminal	1	done	eb90ebce-b926-4e40-82cd-2d746b24b28d	2026-04-01	2026-04-15	\N	2026-05-11 18:55:31.797887+07
37417855-266b-48c7-b0c1-7cc12997969c	5c5d2b18-60ac-4bb6-a017-bae3fbb1bc30	รับของ + ตรวจสอบ	2	done	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-04-20	2026-04-30	\N	2026-05-11 18:55:31.797887+07
7283758d-e033-4458-a4f8-02c93cbc3bb5	318651c0-e752-4aae-af3e-86c0111851cb	ติดตั้งจานดาวเทียม + สายอากาศ	1	in_progress	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-01	2026-05-31	\N	2026-05-11 18:55:31.797887+07
931cf3d3-c76e-4e14-8a9f-ec20d129a4de	318651c0-e752-4aae-af3e-86c0111851cb	เชื่อมต่อ indoor unit	2	pending	ebee042c-0b67-4061-8ae0-6755b8549575	2026-06-01	2026-06-30	\N	2026-05-11 18:55:31.797887+07
3bdc0d28-e873-4975-b447-091940ea7e3c	318651c0-e752-4aae-af3e-86c0111851cb	ทดสอบสัญญาณ	3	pending	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-07-01	2026-07-31	\N	2026-05-11 18:55:31.797887+07
0978aa25-8b67-4470-801c-32bee95613e8	815df630-d7ac-40b5-8e24-37a4ef794951	Commissioning + ทดสอบจริง	1	pending	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-08-01	2026-08-31	\N	2026-05-11 18:55:31.797887+07
6ec00762-283e-4afb-a17e-5b82c8069809	815df630-d7ac-40b5-8e24-37a4ef794951	อบรม + ส่งมอบ	2	pending	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-09-01	2026-09-30	\N	2026-05-11 18:55:31.797887+07
7493c223-c1d7-4d29-b9d2-6c19f10a34d2	cb6a031f-a9c8-4f1e-94ca-ac701e5a2926	สำรวจจุดติดตั้ง 3 จุด	1	done	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-03-01	2026-03-15	\N	2026-05-11 18:55:31.797887+07
19685dc4-3b9f-4957-b6f2-ee154f9c1e74	cb6a031f-a9c8-4f1e-94ca-ac701e5a2926	ออกแบบ AIS network	2	done	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-03-16	2026-03-31	\N	2026-05-11 18:55:31.797887+07
b139cbe1-32d9-43b2-9d2b-14b7ffe25437	e6169095-a5cc-4b05-a5d7-6bba8f0668a4	ติดตั้ง AIS จุดที่ 1	1	done	ebee042c-0b67-4061-8ae0-6755b8549575	2026-04-01	2026-04-15	\N	2026-05-11 18:55:31.797887+07
c34027d7-b4fc-40f0-8762-aab6f1526b65	e6169095-a5cc-4b05-a5d7-6bba8f0668a4	ติดตั้ง AIS จุดที่ 2	2	in_progress	ebee042c-0b67-4061-8ae0-6755b8549575	2026-04-20	2026-05-15	\N	2026-05-11 18:55:31.797887+07
6abf0668-1507-47d8-9965-b803ec82aa9e	e6169095-a5cc-4b05-a5d7-6bba8f0668a4	ติดตั้ง AIS จุดที่ 3	3	pending	95742447-39bf-46eb-8eea-ed16a808e164	2026-05-20	2026-06-15	\N	2026-05-11 18:55:31.797887+07
ec8b0e8d-67fe-4b83-a023-6cb62a996990	e6169095-a5cc-4b05-a5d7-6bba8f0668a4	ทดสอบสัญญาณครบ 3 จุด	4	pending	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-06-20	2026-07-31	\N	2026-05-11 18:55:31.797887+07
2c3c715b-bcb7-4799-8807-389200e36f68	d9330635-0e96-4568-8ad6-f681c339f81b	ทดสอบ AIS ระบบรวม	1	pending	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-08-01	2026-08-15	\N	2026-05-11 18:55:31.797887+07
f3799ea9-a0ab-48e8-9dac-63ad0a572658	d9330635-0e96-4568-8ad6-f681c339f81b	ส่งมอบ + รับประกัน	2	pending	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-08-16	2026-08-30	\N	2026-05-11 18:55:31.797887+07
79873c22-2c3e-4df9-a216-a199a3dcc219	c1233a93-482e-44bf-ab7f-cb597ec5782b	สำรวจจุดติดตั้ง 5 สถานี	1	done	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-04-01	2026-04-20	\N	2026-05-11 18:55:31.797887+07
2d9a95cb-b9ae-4f2f-9c87-5c3ac16c907a	c1233a93-482e-44bf-ab7f-cb597ec5782b	สั่งซื้ออุปกรณ์ Weather Station	2	in_progress	32ae2c60-b3e7-4834-8729-23a4b3ecb2da	2026-04-25	2026-05-31	\N	2026-05-11 18:55:31.797887+07
ccc4d1d2-ce6c-4a0b-864c-dab00a075afa	c1233a93-482e-44bf-ab7f-cb597ec5782b	เตรียมเสา + โครงสร้าง	3	pending	95742447-39bf-46eb-8eea-ed16a808e164	2026-06-01	2026-06-30	\N	2026-05-11 18:55:31.797887+07
ead694cc-f07e-4822-bd57-920d95a6827d	dae623bf-8cc7-47a1-8a37-6ff827ec8c04	ติดตั้งสถานีที่ 1-2	1	pending	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-07-01	2026-07-31	\N	2026-05-11 18:55:31.797887+07
351d4131-077b-4d74-a293-9a7fddd20084	dae623bf-8cc7-47a1-8a37-6ff827ec8c04	ติดตั้งสถานีที่ 3-4	2	pending	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-08-01	2026-08-31	\N	2026-05-11 18:55:31.797887+07
268c2435-6b57-430b-9ee5-186789ea749d	dae623bf-8cc7-47a1-8a37-6ff827ec8c04	ติดตั้งสถานีที่ 5 + เชื่อม network	3	pending	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-09-01	2026-09-30	\N	2026-05-11 18:55:31.797887+07
f002a88c-ad5e-40ac-af23-0c61ed5647e8	5514fe77-a67f-4892-9616-a2c6934fdcfa	ทดสอบ 5 สถานี + data center	1	pending	24d99416-9114-405c-ac4d-97707f282c5c	2026-10-01	2026-10-20	\N	2026-05-11 18:55:31.797887+07
c2842de9-5751-4b62-85d9-e00fee524ce4	5514fe77-a67f-4892-9616-a2c6934fdcfa	ส่งมอบ	2	pending	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-10-21	2026-10-31	\N	2026-05-11 18:55:31.797887+07
efeabe01-6666-4e31-be34-1eff77a6c85c	1fabc801-5546-4e55-9e59-b6e31a5c711c	ออกแบบ layout กล้อง 24 จุด	1	done	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-02-15	2026-02-28	\N	2026-05-11 18:55:31.797887+07
3bf74862-ba9a-4645-acdc-eedba68d0da8	1fabc801-5546-4e55-9e59-b6e31a5c711c	สั่งซื้อกล้อง + NVR + อุปกรณ์	2	done	eb90ebce-b926-4e40-82cd-2d746b24b28d	2026-03-01	2026-03-15	\N	2026-05-11 18:55:31.797887+07
4be70426-9d54-4a9e-9d8e-2d8101454cb0	6559ecd5-ff7f-4879-a57e-520d62fb9a2f	ติดตั้ง Zone A (8 กล้อง)	1	done	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-03-16	2026-04-05	\N	2026-05-11 18:55:31.797887+07
9986d1de-c970-439c-82ca-84693547228b	6559ecd5-ff7f-4879-a57e-520d62fb9a2f	ติดตั้ง Zone B (8 กล้อง)	2	done	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-04-06	2026-04-25	\N	2026-05-11 18:55:31.797887+07
adca59b1-4f4a-4bfa-a137-eeb28d322658	6559ecd5-ff7f-4879-a57e-520d62fb9a2f	ติดตั้ง Zone C (8 กล้อง)	3	done	ebee042c-0b67-4061-8ae0-6755b8549575	2026-04-26	2026-05-10	\N	2026-05-11 18:55:31.797887+07
2dbedc1e-a2af-477a-8037-c24289afbba7	6559ecd5-ff7f-4879-a57e-520d62fb9a2f	ตั้งค่า NVR + Software	4	in_progress	24d99416-9114-405c-ac4d-97707f282c5c	2026-05-11	2026-05-25	\N	2026-05-11 18:55:31.797887+07
5864c625-68a1-402f-b531-cab12c7a7f65	6559ecd5-ff7f-4879-a57e-520d62fb9a2f	ทดสอบ Live + Playback	5	pending	24d99416-9114-405c-ac4d-97707f282c5c	2026-05-26	2026-05-31	\N	2026-05-11 18:55:31.797887+07
66b1bec3-a371-4ce6-9392-66619878e16b	26e0a643-40fb-4b50-b965-70fd861871df	อบรมเจ้าหน้าที่ท่าเรือ	1	pending	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-06-01	2026-06-15	\N	2026-05-11 18:55:31.797887+07
c6721379-2e22-4724-84f4-05eb015e54c5	26e0a643-40fb-4b50-b965-70fd861871df	ส่งมอบ + รับประกัน 1 ปี	2	pending	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-06-16	2026-07-31	\N	2026-05-11 18:55:31.797887+07
c786efab-52e6-49a7-8ccf-fc6dcd1c7324	f6421305-966c-4143-9394-700b5b16ca10	ประชุม requirement กับกองทัพเรือ	1	pending	75b4f523-f342-4c11-97b5-26757ccf1449	2026-06-01	2026-06-15	\N	2026-05-11 18:55:31.797887+07
c497636f-2637-4fe9-9748-d9bce4c9fe69	f6421305-966c-4143-9394-700b5b16ca10	สำรวจระบบเดิม + ออกแบบใหม่	2	pending	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-06-16	2026-07-15	\N	2026-05-11 18:55:31.797887+07
14e8fff0-f60c-4639-833c-d7ca09f6f25d	f6421305-966c-4143-9394-700b5b16ca10	นำเสนอ proposal	3	pending	75b4f523-f342-4c11-97b5-26757ccf1449	2026-07-16	2026-07-31	\N	2026-05-11 18:55:31.797887+07
16c55abe-5c86-4293-a44d-0463228861df	732caa40-20dd-45d2-9bed-919b3055d550	จัดซื้ออุปกรณ์สื่อสาร	1	pending	32ae2c60-b3e7-4834-8729-23a4b3ecb2da	2026-08-01	2026-09-30	\N	2026-05-11 18:55:31.797887+07
c2a86f55-cbf0-4d03-b2aa-0ee8c81053c3	732caa40-20dd-45d2-9bed-919b3055d550	ติดตั้ง + commissioning	2	pending	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-10-01	2026-11-30	\N	2026-05-11 18:55:31.797887+07
73dae541-e023-4c96-a32e-8f341a0cc0df	ca4d39ed-28bd-43bd-9d8f-74c3e686c239	ทดสอบ + ส่งมอบ	1	pending	75b4f523-f342-4c11-97b5-26757ccf1449	2026-12-01	2026-12-31	\N	2026-05-11 18:55:31.797887+07
3175cfb6-a246-4a9e-bcee-c337d62d37bb	97ee6fb5-30b6-4f29-b7c5-606252249e93	Survey สถานที่ติดตั้ง Radar 3 จุด	1	done	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-03-15	2026-04-15	\N	2026-05-11 18:55:31.797887+07
d7e4e78c-2da8-4682-b9d7-7243ccced6cc	97ee6fb5-30b6-4f29-b7c5-606252249e93	ออกแบบ Network topology	2	in_progress	24d99416-9114-405c-ac4d-97707f282c5c	2026-04-16	2026-05-15	\N	2026-05-11 18:55:31.797887+07
c3ad5d29-10c9-4db5-abea-26c038207ddf	97ee6fb5-30b6-4f29-b7c5-606252249e93	นำเสนอ design ให้ลูกค้า	3	pending	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-16	2026-05-31	\N	2026-05-11 18:55:31.797887+07
b8b04344-0f1b-4f5b-ace3-2c59a87ce392	d12d5896-8b9a-4a01-857a-a3d531dd5919	สั่งซื้ออุปกรณ์ Radar + AIS	1	in_progress	32ae2c60-b3e7-4834-8729-23a4b3ecb2da	2026-04-15	2026-06-30	\N	2026-05-11 18:55:31.797887+07
162c1e22-b144-4dd6-ab13-6dc362ac5e45	d12d5896-8b9a-4a01-857a-a3d531dd5919	สั่งซื้อ Server + Software	2	pending	eb90ebce-b926-4e40-82cd-2d746b24b28d	2026-05-01	2026-07-31	\N	2026-05-11 18:55:31.797887+07
dc1420c6-faf9-4252-b575-99fe82850ad1	a8a8bd78-c258-49b6-a47a-29772b763cdb	ติดตั้ง Radar 3 จุด	1	pending	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-08-01	2026-09-15	\N	2026-05-11 18:55:31.797887+07
09b2c439-382c-4d68-a61f-253d2bf8adbe	a8a8bd78-c258-49b6-a47a-29772b763cdb	ติดตั้ง VTS Server	2	pending	24d99416-9114-405c-ac4d-97707f282c5c	2026-09-16	2026-10-15	\N	2026-05-11 18:55:31.797887+07
1c41d147-a167-4194-b783-d6ee7cf22319	a8a8bd78-c258-49b6-a47a-29772b763cdb	Integration + Testing	3	pending	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-10-16	2026-10-31	\N	2026-05-11 18:55:31.797887+07
f69499bf-932b-4420-86c4-eeabca815949	2bf57d7c-f70b-40a1-a79d-8c4e582fcbae	Commissioning	1	pending	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-11-01	2026-11-15	\N	2026-05-11 18:55:31.797887+07
5caefffa-e4c4-49e9-b6a3-a3b720549380	2bf57d7c-f70b-40a1-a79d-8c4e582fcbae	อบรม + ส่งมอบ	2	pending	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-11-16	2026-11-30	\N	2026-05-11 18:55:31.797887+07
ee022cfd-ba0b-4adc-8d67-c48a483a97c4	66258dfc-783b-41e9-8377-0238e3696ca7	ตรวจสอบ Gyro เก่า 3 ลำ	1	done	1d57e25a-e741-4cc7-aa88-55276aba0df8	2025-10-01	2025-10-15	\N	2026-05-11 18:55:31.797887+07
03f9b228-10a0-4110-bf7d-405bf3f82160	66258dfc-783b-41e9-8377-0238e3696ca7	เสนอราคาเปลี่ยน Gyro	2	done	1d57e25a-e741-4cc7-aa88-55276aba0df8	2025-10-16	2025-10-31	\N	2026-05-11 18:55:31.797887+07
0b74c11b-2148-4e71-a13e-5dac14a981d2	9ee827e7-8e05-49c7-9fcd-ad274fa3687f	เปลี่ยน Gyro ลำที่ 1	1	done	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2025-11-01	2025-11-30	\N	2026-05-11 18:55:31.797887+07
d5b853ad-3760-454a-88ae-cd247c33a526	9ee827e7-8e05-49c7-9fcd-ad274fa3687f	เปลี่ยน Gyro ลำที่ 2	2	done	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2025-12-01	2025-12-31	\N	2026-05-11 18:55:31.797887+07
4233f118-f2a1-4196-b41c-6f68f0e73b15	9ee827e7-8e05-49c7-9fcd-ad274fa3687f	เปลี่ยน Gyro ลำที่ 3	3	done	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-01-01	2026-01-31	\N	2026-05-11 18:55:31.797887+07
48467766-41ba-4563-a6ab-950f984629c8	bc5ba0ee-2048-4770-b181-e5597709b2cb	Sea trial ทดสอบ 3 ลำ	1	done	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-02-01	2026-02-15	\N	2026-05-11 18:55:31.797887+07
1c79d6bc-a72b-4848-ba21-912927bad4ae	bc5ba0ee-2048-4770-b181-e5597709b2cb	ส่งมอบ + รับประกัน	2	done	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-02-16	2026-02-28	\N	2026-05-11 18:55:31.797887+07
\.


--
-- Data for Name: phases; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.phases (id, project_id, name, description, sort_order, status, start_date, end_date, progress, created_at) FROM stdin;
07dc2cc2-60b2-46ef-877f-8cc2bd6cabe8	6d53551c-2c84-45ba-bac7-518d2bf81287	Requirement & Design	\N	1	completed	2026-01-15	2026-02-28	100	2026-05-11 17:21:23.433908+07
2d8257d6-6232-42aa-b4fa-2f7863ca87d9	6d53551c-2c84-45ba-bac7-518d2bf81287	Procurement & Preparation	\N	2	completed	2026-03-01	2026-03-30	100	2026-05-11 17:21:23.433908+07
1e9295ec-d528-4b4a-86c2-ca5e2330c687	6d53551c-2c84-45ba-bac7-518d2bf81287	Installation & Testing	\N	3	active	2026-04-01	2026-05-31	65	2026-05-11 17:21:23.433908+07
987fe99d-9766-4869-9c38-5f936c3a8248	6d53551c-2c84-45ba-bac7-518d2bf81287	Handover & Warranty	\N	4	upcoming	2026-06-01	2026-06-30	0	2026-05-11 17:21:23.433908+07
0965667c-1473-4525-bee8-2d8237306856	de7b0847-7026-4447-b7b8-1cf0b983d44b	Survey & Design	\N	1	completed	2026-02-01	2026-02-28	100	2026-05-11 18:55:31.797887+07
32603fdd-5168-40be-8711-a3964c15360f	de7b0847-7026-4447-b7b8-1cf0b983d44b	Procurement	\N	2	completed	2026-03-01	2026-03-31	100	2026-05-11 18:55:31.797887+07
183cabf8-f65c-43d3-bd9c-a4aea06a89c2	de7b0847-7026-4447-b7b8-1cf0b983d44b	Installation	\N	3	active	2026-04-01	2026-06-30	40	2026-05-11 18:55:31.797887+07
e9b6398e-c524-4a49-a6ed-db1cce4bbdc2	de7b0847-7026-4447-b7b8-1cf0b983d44b	Testing & Handover	\N	4	upcoming	2026-06-16	2026-07-31	0	2026-05-11 18:55:31.797887+07
e9affd4a-df62-4463-b4d0-4755eb5f4960	e467ad24-f938-4728-a219-7d61c1dc0823	Assessment & Planning	\N	1	completed	2026-03-01	2026-03-31	100	2026-05-11 18:55:31.797887+07
ce09e0cb-fe98-45e2-ad0b-d9ead0c54402	e467ad24-f938-4728-a219-7d61c1dc0823	Procurement & Removal	\N	2	active	2026-04-01	2026-06-30	15	2026-05-11 18:55:31.797887+07
c1b66a44-97d1-4b74-8096-e72ec3ce8d12	e467ad24-f938-4728-a219-7d61c1dc0823	Installation & Commissioning	\N	3	upcoming	2026-07-01	2026-08-31	0	2026-05-11 18:55:31.797887+07
cbb29e11-de18-4717-af2d-0c20eb0d58eb	10e762e9-bdc9-41d7-9756-0d0ed4cbdfc4	Design & Procurement	\N	1	completed	2026-01-01	2026-02-15	100	2026-05-11 18:55:31.797887+07
b9dd6468-f937-4b53-bc55-6b33a823287a	10e762e9-bdc9-41d7-9756-0d0ed4cbdfc4	Installation	\N	2	completed	2026-02-16	2026-04-15	100	2026-05-11 18:55:31.797887+07
f9e35f8f-597a-41b7-a7a7-614d9fadec7c	10e762e9-bdc9-41d7-9756-0d0ed4cbdfc4	Testing & Go-live	\N	3	active	2026-04-16	2026-05-31	80	2026-05-11 18:55:31.797887+07
cca531d5-2e4f-4653-9520-4649ecaf5b3a	a3e5075c-0484-4631-b718-9af934802de1	Requirement & Design	\N	1	completed	2026-02-15	2026-03-31	100	2026-05-11 18:55:31.797887+07
5c5d2b18-60ac-4bb6-a017-bae3fbb1bc30	a3e5075c-0484-4631-b718-9af934802de1	Procurement	\N	2	completed	2026-04-01	2026-04-30	100	2026-05-11 18:55:31.797887+07
318651c0-e752-4aae-af3e-86c0111851cb	a3e5075c-0484-4631-b718-9af934802de1	Installation	\N	3	active	2026-05-01	2026-07-31	30	2026-05-11 18:55:31.797887+07
815df630-d7ac-40b5-8e24-37a4ef794951	a3e5075c-0484-4631-b718-9af934802de1	Commissioning & Handover	\N	4	upcoming	2026-08-01	2026-09-30	0	2026-05-11 18:55:31.797887+07
cb6a031f-a9c8-4f1e-94ca-ac701e5a2926	586d4de6-73eb-469d-92d2-7546654ff0dd	Survey & Design	\N	1	completed	2026-03-01	2026-03-31	100	2026-05-11 18:55:31.797887+07
e6169095-a5cc-4b05-a5d7-6bba8f0668a4	586d4de6-73eb-469d-92d2-7546654ff0dd	Installation	\N	2	active	2026-04-01	2026-07-31	40	2026-05-11 18:55:31.797887+07
d9330635-0e96-4568-8ad6-f681c339f81b	586d4de6-73eb-469d-92d2-7546654ff0dd	Testing & Handover	\N	3	upcoming	2026-08-01	2026-08-30	0	2026-05-11 18:55:31.797887+07
c1233a93-482e-44bf-ab7f-cb597ec5782b	b1414314-c8cb-4184-98ac-baebae84a764	Planning & Procurement	\N	1	active	2026-04-01	2026-06-30	50	2026-05-11 18:55:31.797887+07
dae623bf-8cc7-47a1-8a37-6ff827ec8c04	b1414314-c8cb-4184-98ac-baebae84a764	Installation 5 Sites	\N	2	upcoming	2026-07-01	2026-09-30	0	2026-05-11 18:55:31.797887+07
5514fe77-a67f-4892-9616-a2c6934fdcfa	b1414314-c8cb-4184-98ac-baebae84a764	Commissioning	\N	3	upcoming	2026-10-01	2026-10-31	0	2026-05-11 18:55:31.797887+07
1fabc801-5546-4e55-9e59-b6e31a5c711c	c96cc3ca-23d9-40ca-a9d4-217f701767bb	Design & Procurement	\N	1	completed	2026-02-15	2026-03-15	100	2026-05-11 18:55:31.797887+07
6559ecd5-ff7f-4879-a57e-520d62fb9a2f	c96cc3ca-23d9-40ca-a9d4-217f701767bb	Installation	\N	2	active	2026-03-16	2026-05-31	75	2026-05-11 18:55:31.797887+07
26e0a643-40fb-4b50-b965-70fd861871df	c96cc3ca-23d9-40ca-a9d4-217f701767bb	Training & Handover	\N	3	upcoming	2026-06-01	2026-07-31	0	2026-05-11 18:55:31.797887+07
f6421305-966c-4143-9394-700b5b16ca10	5e9c047f-a845-48d6-a2e5-dc1e5fdb323d	Requirement Analysis	\N	1	upcoming	2026-06-01	2026-07-31	0	2026-05-11 18:55:31.797887+07
732caa40-20dd-45d2-9bed-919b3055d550	5e9c047f-a845-48d6-a2e5-dc1e5fdb323d	Procurement & Installation	\N	2	upcoming	2026-08-01	2026-11-30	0	2026-05-11 18:55:31.797887+07
ca4d39ed-28bd-43bd-9d8f-74c3e686c239	5e9c047f-a845-48d6-a2e5-dc1e5fdb323d	Handover	\N	3	upcoming	2026-12-01	2026-12-31	0	2026-05-11 18:55:31.797887+07
97ee6fb5-30b6-4f29-b7c5-606252249e93	5a190f8c-e256-498a-bb0f-4705b960dced	Site Survey & Design	\N	1	active	2026-03-15	2026-05-31	60	2026-05-11 18:55:31.797887+07
d12d5896-8b9a-4a01-857a-a3d531dd5919	5a190f8c-e256-498a-bb0f-4705b960dced	Procurement	\N	2	active	2026-04-15	2026-07-31	20	2026-05-11 18:55:31.797887+07
a8a8bd78-c258-49b6-a47a-29772b763cdb	5a190f8c-e256-498a-bb0f-4705b960dced	Installation & Integration	\N	3	upcoming	2026-08-01	2026-10-31	0	2026-05-11 18:55:31.797887+07
2bf57d7c-f70b-40a1-a79d-8c4e582fcbae	5a190f8c-e256-498a-bb0f-4705b960dced	Commissioning & Handover	\N	4	upcoming	2026-11-01	2026-11-30	0	2026-05-11 18:55:31.797887+07
66258dfc-783b-41e9-8377-0238e3696ca7	aa52a2af-0912-4d3b-9de7-41f4dcc99fb0	Assessment	\N	1	completed	2025-10-01	2025-10-31	100	2026-05-11 18:55:31.797887+07
9ee827e7-8e05-49c7-9fcd-ad274fa3687f	aa52a2af-0912-4d3b-9de7-41f4dcc99fb0	Replacement	\N	2	completed	2025-11-01	2026-01-31	100	2026-05-11 18:55:31.797887+07
bc5ba0ee-2048-4770-b181-e5597709b2cb	aa52a2af-0912-4d3b-9de7-41f4dcc99fb0	Testing & Handover	\N	3	completed	2026-02-01	2026-02-28	100	2026-05-11 18:55:31.797887+07
\.


--
-- Data for Name: po_lines; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.po_lines (id, po_id, line_num, item_code, item_name, quantity, uom, unit_price, total_price, sap_account, tax_code, received_qty, created_at) FROM stdin;
b8d86957-350b-4772-bad8-c90e016a4928	9103b770-480c-43dd-bc15-b757d45eab42	1	GR-0001	Gyro Compass Marine Grade	1.00	EA	112149.53	120000.00	114101	IG07	1.00	2026-05-12 10:31:29.105088+07
31c3c47d-6298-42f9-b92c-2849baa88a39	c7818595-2624-45b8-b587-9612d7aff90b	1	CP-0010	CCTV IP Camera 4MP	24.00	EA	28037.38	720000.00	114101	IG07	24.00	2026-05-12 10:31:29.105088+07
d1e04ae6-2149-465f-9cdc-0be0591cba75	c7818595-2624-45b8-b587-9612d7aff90b	2	CP-0011	NVR 32ch Server	2.00	Set	46728.97	100000.00	114101	IG07	2.00	2026-05-12 10:31:29.105088+07
a7ebe188-4de8-43ea-aa5f-eb588f78af16	c7818595-2624-45b8-b587-9612d7aff90b	3	CP-0012	Network Switch PoE 24port	4.00	EA	23364.49	100000.00	114101	IG07	4.00	2026-05-12 10:31:29.105088+07
b86fd810-4614-47c4-bc17-abc07f013c11	323cea20-6a07-411e-ac9e-a8cafae67d45	1	CP-0015	VMS Software License (64ch)	1.00	Set	280373.83	300000.00	114101	IG07	1.00	2026-05-12 10:31:29.105088+07
7b7edcab-1257-435a-8039-6aa4fc433f61	323cea20-6a07-411e-ac9e-a8cafae67d45	2	CP-0016	Monitor 55" Display	4.00	EA	18691.59	80000.00	114101	IG07	4.00	2026-05-12 10:31:29.105088+07
bc6b7714-682b-4108-8e49-81b2930bb5ec	6214068f-ff3e-4218-b1ac-7dd3f9bd6dd4	1	OT-0020	AIS Transponder Class A	3.00	EA	93457.94	300000.00	114101	IG07	2.00	2026-05-12 10:31:29.105088+07
92ec4ecc-8987-45c8-af09-c0fe03b9f731	6214068f-ff3e-4218-b1ac-7dd3f9bd6dd4	2	OT-0021	AIS Antenna + Cable Kit	3.00	Set	15420.56	50000.00	114101	IG07	2.00	2026-05-12 10:31:29.105088+07
9ff9ef84-4385-4b93-8ffb-7b0ec141ec99	16e98d75-9e66-495e-bf30-bd285e643c0d	1	SN-0001	Sonar Module 50/200kHz	1.00	Set	57943.93	62000.00	114101	IG07	0.00	2026-05-12 10:31:29.105088+07
c3074b3d-bc69-486d-b5a6-fa9e80fb5316	b74376b6-22cb-4850-9d2a-f49344631039	1	EX-0001	Calibration Tool Set	1.00	Set	22000.00	22000.00	511120	IG07	0.00	2026-05-12 10:31:29.105088+07
cac77009-4752-4c9e-b9cf-f2e585a99a7a	b74376b6-22cb-4850-9d2a-f49344631039	2	OT-0001	Connector Kit Waterproof	5.00	EA	2700.00	13500.00	511120	IG07	0.00	2026-05-12 10:31:29.105088+07
0ffffe0c-cb36-4c15-94d7-a398398eb527	b52c49bd-dd3c-4011-9301-21fce76fc7ec	1	OT-0030	Weather Station Unit	5.00	Set	74766.36	400000.00	114101	IG07	0.00	2026-05-12 10:31:29.105088+07
77f936ef-a7de-4f7f-ab57-5acbf38f4c3b	b52c49bd-dd3c-4011-9301-21fce76fc7ec	2	OT-0031	Data Logger + Modem	5.00	Set	9345.79	50000.00	114101	IG07	0.00	2026-05-12 10:31:29.105088+07
9550ff5d-77b4-4d2d-a8fb-ba138ab5bf7c	ca25eae6-81e2-4183-aba7-bd6e983fffc4	1	WR-0010	VTS Radar 25kW	3.00	Set	280373.83	900000.00	114101	IG07	0.00	2026-05-12 10:31:29.105088+07
913388c9-c92d-4aec-a836-4921776f11dd	ca25eae6-81e2-4183-aba7-bd6e983fffc4	2	OT-0040	AIS Base Station	3.00	Set	93457.94	300000.00	114101	IG07	0.00	2026-05-12 10:31:29.105088+07
\.


--
-- Data for Name: pr_lines; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.pr_lines (id, pr_id, line_num, item_code, item_name, quantity, uom, unit_price, total_price, sap_account, tax_code, budget_line_id, created_at) FROM stdin;
349e1010-776c-425c-bcaf-23913b8c3c80	adf29eb4-2720-46d3-9b52-513a02b57f5f	1	GR-0001	Gyro Compass Marine Grade	1.00	EA	112149.53	120000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
2c836421-4349-484d-8ecc-f329c7f6b516	8a956d88-3ca6-4305-b7e3-b2aa0462ac28	1	SN-0001	Sonar Module 50/200kHz	1.00	Set	57943.93	62000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
ae102a0c-0745-4c07-bf54-d1e76ff38ab9	2e217d88-e779-40c6-b46d-97591e0ae346	1	EX-0001	Calibration Tool Set	1.00	Set	22000.00	22000.00	511120	IG07	\N	2026-05-12 10:31:26.154389+07
9527c9d7-d99d-40f5-9610-71f65d79740d	2e217d88-e779-40c6-b46d-97591e0ae346	2	OT-0001	Connector Kit Waterproof	5.00	EA	2700.00	13500.00	511120	IG07	\N	2026-05-12 10:31:26.154389+07
4577f205-5f7b-4d62-a08a-d02f35d86da2	3845a3be-4cfb-4a45-a1ed-ca1f05848441	1	OT-0003	Waterproof Case IP67	5.00	EA	1560.00	7800.00	511120	IG07	\N	2026-05-12 10:31:26.154389+07
2bc3ec81-0091-4473-bcdc-817455356a6d	35c64290-dc1e-43f2-a83a-54e018b960c1	1	SD-0015	Sounder Transducer 200kHz Marine Grade	1.00	EA	79439.25	85000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
3a0397b4-c7d1-438d-8b87-d3ce32fbea9b	133fec17-eff4-4289-82fc-cd15728dbe34	1	OT-0010	Marine VHF Antenna	2.00	EA	21028.04	45000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
4a52febf-0393-48b2-8ba4-7006c20bc9fb	7de2eab3-03f2-4c53-82cd-7b3fb8a3b774	1	WR-0001	Wave Radar 4kW Open Array	1.00	Set	140186.92	150000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
c5e025af-7a92-4504-aabf-185e06c62669	7de2eab3-03f2-4c53-82cd-7b3fb8a3b774	2	OT-0005	Network Cable Cat6 Shielded	100.00	EA	280.37	30000.00	511120	IG07	\N	2026-05-12 10:31:26.154389+07
07045219-6d62-4117-bbfd-f512b79a57c2	7d64d630-7780-4293-a201-5b19975a01f9	1	GP-0001	GPS Navigator Module	2.00	EA	11682.24	25000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
8cf31603-94f5-4022-b698-8e15a357f913	b4d0e4ad-9ed3-4d9d-93f1-6012afe6bb58	1	OT-0005	Network Cable Cat6 50m	50.00	EA	158.88	8500.00	511120	IG07	\N	2026-05-12 10:31:26.154389+07
7f1eda93-4edd-4473-b424-fcbe6bd92ba4	50a34d47-5281-4acb-bfe7-25ef24b7ac05	1	EX-0010	กระดาษ A4 80g	10.00	EA	120.00	1200.00	522709	IG00	\N	2026-05-12 10:31:26.154389+07
d3af1c6a-c831-49b1-9dfc-dabeb22c1c68	50a34d47-5281-4acb-bfe7-25ef24b7ac05	2	EX-0011	หมึกพิมพ์ HP 680	2.00	EA	450.00	900.00	522709	IG00	\N	2026-05-12 10:31:26.154389+07
0ac219c2-2542-4ef5-9a95-84e70c1858ae	50a34d47-5281-4acb-bfe7-25ef24b7ac05	3	EX-0012	เครื่องเขียนชุด	1.00	Set	1100.00	1100.00	522709	IG00	\N	2026-05-12 10:31:26.154389+07
d73fd733-803b-4830-9546-3667eeb54886	86af0364-4652-4c5a-a2ff-9bff87a74788	1	OT-0020	AIS Transponder Class A	3.00	EA	93457.94	300000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
c754fc6c-fbd9-441e-b792-a1bbd652a46e	86af0364-4652-4c5a-a2ff-9bff87a74788	2	OT-0021	AIS Antenna + Cable Kit	3.00	Set	15420.56	50000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
83740f61-5fa7-413f-b72e-ae0069680cf1	7f61906d-c3d0-42d7-b8d4-a6f9dd77b4f0	1	CP-0010	CCTV IP Camera 4MP	24.00	EA	28037.38	720000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
17d432d6-d725-406f-b3ba-6f94c5573a85	7f61906d-c3d0-42d7-b8d4-a6f9dd77b4f0	2	CP-0011	NVR 32ch Server	2.00	Set	46728.97	100000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
e6c2f872-8acd-43e5-803e-77c0dd182f66	7f61906d-c3d0-42d7-b8d4-a6f9dd77b4f0	3	CP-0012	Network Switch PoE 24port	4.00	EA	23364.49	100000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
ade944bd-5344-4cc7-80ad-971d279143a2	c640c3b3-76a9-47e9-933d-b9714c3edfc6	1	CP-0015	VMS Software License (64ch)	1.00	Set	280373.83	300000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
cd14ec91-b47c-4d6b-b9d4-60af83dce30d	c640c3b3-76a9-47e9-933d-b9714c3edfc6	2	CP-0016	Monitor 55" Display	4.00	EA	18691.59	80000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
31711f8c-4d37-4f8c-982e-aba1e9604a46	4778d85d-0e61-45bd-bc93-af220c3683aa	1	OT-0030	Weather Station Unit	5.00	Set	74766.36	400000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
57dfd146-0a96-4cb6-b63b-dd51ab7e6780	4778d85d-0e61-45bd-bc93-af220c3683aa	2	OT-0031	Data Logger + Modem	5.00	Set	9345.79	50000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
eb068d51-ca4d-4cd7-8b74-eaa2c6e6de03	bc64c5e4-d8f3-49e8-ad0e-a5428662b027	1	WR-0010	VTS Radar 25kW	3.00	Set	280373.83	900000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
e74d0e0f-64b5-4eae-94ed-704b908724b3	bc64c5e4-d8f3-49e8-ad0e-a5428662b027	2	OT-0040	AIS Base Station	3.00	Set	93457.94	300000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
b2d16991-a562-494d-9c9b-e24b66c45a03	bd6f1215-05ec-4d36-a780-20e32200fc5b	1	CP-0020	VTS Server Rack	2.00	Set	280373.83	600000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
39e9f319-82b7-42a6-b1c6-c7995d5ac0c0	bd6f1215-05ec-4d36-a780-20e32200fc5b	2	CP-0021	VTS Software License	1.00	Set	233644.86	250000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
070e627b-181a-47fe-8727-7d00bf467270	4f3121dd-c29e-4676-bb98-16c445c7192b	1	OT-0022	AIS Coaxial Cable 50m	10.00	EA	5607.48	60000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
ba181d62-7d37-41f0-b5f9-befc7b6876e2	1d3a883a-e459-40ed-bdee-dd50555cc272	1	SN-0005	Sonar Transducer Replacement	1.00	EA	22429.91	24000.00	114101	IG07	\N	2026-05-12 10:31:26.154389+07
5d642d48-ca0d-463c-a0a9-6f70d246b431	1d3a883a-e459-40ed-bdee-dd50555cc272	2	OT-0001	Connector Kit	2.00	EA	1869.16	4000.00	511120	IG07	\N	2026-05-12 10:31:26.154389+07
\.


--
-- Data for Name: project_members; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.project_members (id, project_id, user_id, role, joined_at) FROM stdin;
9db3656c-eac0-4519-8daa-eeb4947560b7	6d53551c-2c84-45ba-bac7-518d2bf81287	1d57e25a-e741-4cc7-aa88-55276aba0df8	pm	2026-05-11 17:21:22.736711+07
68baf228-6ef8-4019-ab08-49d9c5438a46	6d53551c-2c84-45ba-bac7-518d2bf81287	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	engineer	2026-05-11 17:21:22.736711+07
936ed519-a51d-4837-8fd9-baedf58ac57d	6d53551c-2c84-45ba-bac7-518d2bf81287	d0b32103-3b47-45cc-8aa9-5e7030cf226a	engineer	2026-05-11 17:21:22.736711+07
2f6003cd-df77-4548-a4a9-004015ffd441	6d53551c-2c84-45ba-bac7-518d2bf81287	ebee042c-0b67-4061-8ae0-6755b8549575	staff	2026-05-11 17:21:22.736711+07
04e1fe74-ddc2-471a-bdb1-8736efddd21f	6d53551c-2c84-45ba-bac7-518d2bf81287	95742447-39bf-46eb-8eea-ed16a808e164	staff	2026-05-11 17:21:22.736711+07
80b2b5ff-d2b1-4dfb-8d9b-e9bf7687e77f	de7b0847-7026-4447-b7b8-1cf0b983d44b	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	pm	2026-05-11 17:21:22.736711+07
508fc87b-42ea-497e-8382-81c90f036ec9	de7b0847-7026-4447-b7b8-1cf0b983d44b	d0b32103-3b47-45cc-8aa9-5e7030cf226a	engineer	2026-05-11 17:21:22.736711+07
c3dcbb9f-3a12-43c1-8fd7-afaa8e2713ba	de7b0847-7026-4447-b7b8-1cf0b983d44b	95742447-39bf-46eb-8eea-ed16a808e164	staff	2026-05-11 17:21:22.736711+07
7eeea0bd-0e43-4d6f-ad86-36fa8481b38c	e467ad24-f938-4728-a219-7d61c1dc0823	d0b32103-3b47-45cc-8aa9-5e7030cf226a	pm	2026-05-11 17:21:22.736711+07
71b11aa9-7762-405f-977e-d44c6adb58f6	e467ad24-f938-4728-a219-7d61c1dc0823	ebee042c-0b67-4061-8ae0-6755b8549575	staff	2026-05-11 17:21:22.736711+07
206448f7-d94a-42e5-9411-e513699f7aea	10e762e9-bdc9-41d7-9756-0d0ed4cbdfc4	1d57e25a-e741-4cc7-aa88-55276aba0df8	pm	2026-05-11 17:21:22.736711+07
4f4888bf-e157-4738-92ee-73e6d8739d72	10e762e9-bdc9-41d7-9756-0d0ed4cbdfc4	95742447-39bf-46eb-8eea-ed16a808e164	staff	2026-05-11 17:21:22.736711+07
5cfa9c98-b8aa-4dc3-bac1-2e95de875f8b	a3e5075c-0484-4631-b718-9af934802de1	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	pm	2026-05-11 17:21:22.736711+07
24a0b9c7-2273-44ea-8c46-ba8fbd0f0a96	a3e5075c-0484-4631-b718-9af934802de1	1d57e25a-e741-4cc7-aa88-55276aba0df8	engineer	2026-05-11 17:21:22.736711+07
3b7dd5a7-fe68-43a6-8f3f-005cfa72c972	a3e5075c-0484-4631-b718-9af934802de1	ebee042c-0b67-4061-8ae0-6755b8549575	staff	2026-05-11 17:21:22.736711+07
b944e5da-faef-4222-8aa5-712994f83c7a	586d4de6-73eb-469d-92d2-7546654ff0dd	d0b32103-3b47-45cc-8aa9-5e7030cf226a	pm	2026-05-11 17:21:23.433908+07
82fdb688-e5e7-45b9-9139-547c6475c167	586d4de6-73eb-469d-92d2-7546654ff0dd	ebee042c-0b67-4061-8ae0-6755b8549575	engineer	2026-05-11 17:21:23.433908+07
a5ca8375-c4b9-4a19-894a-221e66c93fd7	586d4de6-73eb-469d-92d2-7546654ff0dd	95742447-39bf-46eb-8eea-ed16a808e164	staff	2026-05-11 17:21:23.433908+07
f179f8a8-57dd-45ba-a34a-b88348b33e32	b1414314-c8cb-4184-98ac-baebae84a764	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	pm	2026-05-11 17:21:23.433908+07
a5198ade-462c-40bd-a63b-958e84e1d025	b1414314-c8cb-4184-98ac-baebae84a764	d0b32103-3b47-45cc-8aa9-5e7030cf226a	engineer	2026-05-11 17:21:23.433908+07
dc104f7e-f640-44aa-abc8-ebab42de0f94	b1414314-c8cb-4184-98ac-baebae84a764	95742447-39bf-46eb-8eea-ed16a808e164	staff	2026-05-11 17:21:23.433908+07
275dd845-cc24-4d5f-9305-a18d74d59d92	b1414314-c8cb-4184-98ac-baebae84a764	ebee042c-0b67-4061-8ae0-6755b8549575	staff	2026-05-11 17:21:23.433908+07
114742e2-51a2-4fd6-bad6-e0f926eef4ad	c96cc3ca-23d9-40ca-a9d4-217f701767bb	1d57e25a-e741-4cc7-aa88-55276aba0df8	pm	2026-05-11 17:21:23.433908+07
6fd50e48-9f5f-4842-8f44-8ce00a9c4af3	c96cc3ca-23d9-40ca-a9d4-217f701767bb	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	engineer	2026-05-11 17:21:23.433908+07
c2bfbf9b-925f-4b1c-a4ab-468ec18507c3	c96cc3ca-23d9-40ca-a9d4-217f701767bb	ebee042c-0b67-4061-8ae0-6755b8549575	staff	2026-05-11 17:21:23.433908+07
e539517e-7a17-4f79-852a-283709eb515f	c96cc3ca-23d9-40ca-a9d4-217f701767bb	95742447-39bf-46eb-8eea-ed16a808e164	staff	2026-05-11 17:21:23.433908+07
0495b564-a745-4c6b-a01c-83671cce760d	5e9c047f-a845-48d6-a2e5-dc1e5fdb323d	75b4f523-f342-4c11-97b5-26757ccf1449	pm	2026-05-11 17:21:23.433908+07
74b95408-3786-49ac-aec3-6dd0ce52c716	5e9c047f-a845-48d6-a2e5-dc1e5fdb323d	1d57e25a-e741-4cc7-aa88-55276aba0df8	engineer	2026-05-11 17:21:23.433908+07
00ed27ee-19df-4dc7-bbe6-62f59bb9bb34	5e9c047f-a845-48d6-a2e5-dc1e5fdb323d	d0b32103-3b47-45cc-8aa9-5e7030cf226a	engineer	2026-05-11 17:21:23.433908+07
1245864a-7a49-4874-b248-9dd5447e8956	d8838034-b3f2-4781-83df-4f5f00a41061	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	pm	2026-05-11 17:21:23.433908+07
a6a16817-7ddc-4ccf-92b8-8b08964441fe	d8838034-b3f2-4781-83df-4f5f00a41061	95742447-39bf-46eb-8eea-ed16a808e164	staff	2026-05-11 17:21:23.433908+07
7dc4b870-488b-4556-9520-cfd9215ec5ee	5a190f8c-e256-498a-bb0f-4705b960dced	d0b32103-3b47-45cc-8aa9-5e7030cf226a	pm	2026-05-11 17:21:23.433908+07
b8500a53-6844-4fe0-9e64-38599a2c3901	5a190f8c-e256-498a-bb0f-4705b960dced	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	engineer	2026-05-11 17:21:23.433908+07
179eb457-7ed1-4a1b-87ec-20c553fc560e	5a190f8c-e256-498a-bb0f-4705b960dced	1d57e25a-e741-4cc7-aa88-55276aba0df8	engineer	2026-05-11 17:21:23.433908+07
6c35b4b2-9d06-437f-91f4-3313c653ad0c	5a190f8c-e256-498a-bb0f-4705b960dced	ebee042c-0b67-4061-8ae0-6755b8549575	staff	2026-05-11 17:21:23.433908+07
327dc352-d427-4608-8063-db1790534e1d	aa52a2af-0912-4d3b-9de7-41f4dcc99fb0	1d57e25a-e741-4cc7-aa88-55276aba0df8	pm	2026-05-11 17:21:23.433908+07
be78ee32-8739-477b-8460-55078f0e540a	aa52a2af-0912-4d3b-9de7-41f4dcc99fb0	d0b32103-3b47-45cc-8aa9-5e7030cf226a	engineer	2026-05-11 17:21:23.433908+07
\.


--
-- Data for Name: projects; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.projects (id, company_id, code, name, description, status, start_date, end_date, pm_user_id, sap_project_code, tor_amount, budget_amount, actual_amount, progress, settings, created_by, created_at, updated_at) FROM stdin;
6d53551c-2c84-45ba-bac7-518d2bf81287	11111111-1111-1111-1111-111111111111	SDA-2026-001	Marine Navigation System - Phuket	\N	active	2026-01-15	2026-06-30	1d57e25a-e741-4cc7-aa88-55276aba0df8	\N	1280000.00	1235000.00	1028000.00	80	{}	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
de7b0847-7026-4447-b7b8-1cf0b983d44b	11111111-1111-1111-1111-111111111111	SDA-2026-002	Sonar System Installation - Rayong	\N	active	2026-02-01	2026-07-31	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	\N	950000.00	920000.00	460000.00	50	{}	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
e467ad24-f938-4728-a219-7d61c1dc0823	11111111-1111-1111-1111-111111111111	SDA-2026-003	Radar System Upgrade - Bangkok	\N	active	2026-03-01	2026-08-31	d0b32103-3b47-45cc-8aa9-5e7030cf226a	\N	1100000.00	1060000.00	1130000.00	20	{}	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
10e762e9-bdc9-41d7-9756-0d0ed4cbdfc4	11111111-1111-1111-1111-111111111111	SDA-2026-004	GPS Fleet Management - Samut Prakan	\N	active	2026-01-01	2026-05-31	1d57e25a-e741-4cc7-aa88-55276aba0df8	\N	650000.00	630000.00	598000.00	95	{}	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
a3e5075c-0484-4631-b718-9af934802de1	11111111-1111-1111-1111-111111111111	SDA-2026-005	Satcom System - Chonburi	\N	active	2026-02-15	2026-09-30	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	\N	1800000.00	1750000.00	1137500.00	65	{}	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
586d4de6-73eb-469d-92d2-7546654ff0dd	11111111-1111-1111-1111-111111111111	SDA-2026-006	AIS Repeater System - Surat Thani	ติดตั้งระบบ AIS Repeater สำหรับท่าเรือสุราษฎร์ธานี	active	2026-03-01	2026-08-30	d0b32103-3b47-45cc-8aa9-5e7030cf226a	\N	720000.00	700000.00	280000.00	40	{}	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
b1414314-c8cb-4184-98ac-baebae84a764	11111111-1111-1111-1111-111111111111	SDA-2026-007	Weather Station Network - Chumphon	ติดตั้งเครือข่ายสถานีตรวจอากาศ 5 จุด	active	2026-04-01	2026-10-31	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	\N	1500000.00	1450000.00	362500.00	25	{}	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
c96cc3ca-23d9-40ca-a9d4-217f701767bb	11111111-1111-1111-1111-111111111111	SDA-2026-008	CCTV Monitoring Port - Laem Chabang	ระบบ CCTV ท่าเรือแหลมฉบัง 24 จุด	active	2026-02-15	2026-07-31	1d57e25a-e741-4cc7-aa88-55276aba0df8	\N	2200000.00	2100000.00	1680000.00	80	{}	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
5e9c047f-a845-48d6-a2e5-dc1e5fdb323d	11111111-1111-1111-1111-111111111111	SDA-2026-009	Radio Communication Upgrade - Navy	อัพเกรดระบบสื่อสารวิทยุ กองทัพเรือ	planning	2026-06-01	2026-12-31	75b4f523-f342-4c11-97b5-26757ccf1449	\N	3500000.00	0.00	0.00	0	{}	75b4f523-f342-4c11-97b5-26757ccf1449	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
d8838034-b3f2-4781-83df-4f5f00a41061	11111111-1111-1111-1111-111111111111	SDA-2026-010	Echo Sounder Maintenance - Songkhla	ซ่อมบำรุง Echo Sounder ประจำปี	active	2026-01-15	2026-04-30	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	\N	350000.00	340000.00	340000.00	100	{}	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
5a190f8c-e256-498a-bb0f-4705b960dced	11111111-1111-1111-1111-111111111111	SDA-2026-011	VTS System - Map Ta Phut	ระบบ Vessel Traffic Service ท่าเรือมาบตาพุด	active	2026-03-15	2026-11-30	d0b32103-3b47-45cc-8aa9-5e7030cf226a	\N	4800000.00	4600000.00	920000.00	20	{}	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
aa52a2af-0912-4d3b-9de7-41f4dcc99fb0	11111111-1111-1111-1111-111111111111	SDA-2026-012	Gyro Compass Replacement - Ferry	เปลี่ยน Gyro Compass เรือเฟอร์รี่ 3 ลำ	completed	2025-10-01	2026-02-28	1d57e25a-e741-4cc7-aa88-55276aba0df8	\N	900000.00	880000.00	865000.00	100	{}	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.purchase_orders (id, company_id, project_id, pr_id, doc_number, doc_date, status, vendor_code, vendor_name, total_amount, tax_amount, remarks, sap_doc_entry, sap_doc_num, sap_synced_at, budget_deducted, created_by, created_at, updated_at) FROM stdin;
9103b770-480c-43dd-bc15-b757d45eab42	11111111-1111-1111-1111-111111111111	6d53551c-2c84-45ba-bac7-518d2bf81287	adf29eb4-2720-46d3-9b52-513a02b57f5f	PO26050001	2026-05-03	received	VD0001	Marine Electronics Co.	120000.00	0.00	\N	\N	\N	\N	f	32ae2c60-b3e7-4834-8729-23a4b3ecb2da	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
c7818595-2624-45b8-b587-9612d7aff90b	11111111-1111-1111-1111-111111111111	c96cc3ca-23d9-40ca-a9d4-217f701767bb	7f61906d-c3d0-42d7-b8d4-a6f9dd77b4f0	PO26030005	2026-03-08	received	VD0002	Navigation Systems Ltd.	920000.00	0.00	\N	\N	\N	\N	f	eb90ebce-b926-4e40-82cd-2d746b24b28d	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
323cea20-6a07-411e-ac9e-a8cafae67d45	11111111-1111-1111-1111-111111111111	c96cc3ca-23d9-40ca-a9d4-217f701767bb	c640c3b3-76a9-47e9-933d-b9714c3edfc6	PO26040012	2026-04-22	received	VF0001	Furuno Japan	380000.00	0.00	\N	\N	\N	\N	f	eb90ebce-b926-4e40-82cd-2d746b24b28d	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
6214068f-ff3e-4218-b1ac-7dd3f9bd6dd4	11111111-1111-1111-1111-111111111111	586d4de6-73eb-469d-92d2-7546654ff0dd	86af0364-4652-4c5a-a2ff-9bff87a74788	PO26040015	2026-04-18	sent_to_sap	VD0001	Marine Electronics Co.	350000.00	0.00	\N	\N	\N	\N	f	32ae2c60-b3e7-4834-8729-23a4b3ecb2da	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
16e98d75-9e66-495e-bf30-bd285e643c0d	11111111-1111-1111-1111-111111111111	de7b0847-7026-4447-b7b8-1cf0b983d44b	\N	PO26050003	2026-05-07	approved	VF0001	Furuno Japan	62000.00	0.00	\N	\N	\N	\N	f	32ae2c60-b3e7-4834-8729-23a4b3ecb2da	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
b74376b6-22cb-4850-9d2a-f49344631039	11111111-1111-1111-1111-111111111111	6d53551c-2c84-45ba-bac7-518d2bf81287	\N	PO26050004	2026-05-06	approved	VD0002	Navigation Systems Ltd.	35500.00	0.00	\N	\N	\N	\N	f	32ae2c60-b3e7-4834-8729-23a4b3ecb2da	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
b52c49bd-dd3c-4011-9301-21fce76fc7ec	11111111-1111-1111-1111-111111111111	b1414314-c8cb-4184-98ac-baebae84a764	\N	PO26050005	2026-05-10	draft	VD0001	Marine Electronics Co.	450000.00	0.00	\N	\N	\N	\N	f	eb90ebce-b926-4e40-82cd-2d746b24b28d	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
ca25eae6-81e2-4183-aba7-bd6e983fffc4	11111111-1111-1111-1111-111111111111	5a190f8c-e256-498a-bb0f-4705b960dced	\N	PO26050006	2026-05-11	pending_manager	VF0002	JRC Global	1200000.00	0.00	\N	\N	\N	\N	f	32ae2c60-b3e7-4834-8729-23a4b3ecb2da	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
\.


--
-- Data for Name: purchase_requests; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.purchase_requests (id, company_id, project_id, doc_number, doc_date, status, vendor_code, vendor_name, total_amount, tax_code, tax_amount, remarks, sap_doc_entry, sap_doc_num, sap_object_type, sap_synced_at, budget_deducted, created_by, created_at, updated_at) FROM stdin;
adf29eb4-2720-46d3-9b52-513a02b57f5f	11111111-1111-1111-1111-111111111111	6d53551c-2c84-45ba-bac7-518d2bf81287	PR26050005	2026-05-02	sent_to_sap	VD0001	Marine Electronics Co.	120000.00	\N	0.00	\N	\N	\N	\N	\N	f	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
8a956d88-3ca6-4305-b7e3-b2aa0462ac28	11111111-1111-1111-1111-111111111111	de7b0847-7026-4447-b7b8-1cf0b983d44b	PR26050008	2026-05-06	approved	VF0001	Furuno Japan	62000.00	\N	0.00	\N	\N	\N	\N	\N	f	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
2e217d88-e779-40c6-b46d-97591e0ae346	11111111-1111-1111-1111-111111111111	6d53551c-2c84-45ba-bac7-518d2bf81287	PR26050009	2026-05-05	approved	VD0002	Navigation Systems Ltd.	35500.00	\N	0.00	\N	\N	\N	\N	\N	f	32ae2c60-b3e7-4834-8729-23a4b3ecb2da	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
3845a3be-4cfb-4a45-a1ed-ca1f05848441	11111111-1111-1111-1111-111111111111	10e762e9-bdc9-41d7-9756-0d0ed4cbdfc4	PR26050010	2026-05-04	approved	VD0001	Marine Electronics Co.	7800.00	\N	0.00	\N	\N	\N	\N	\N	f	95742447-39bf-46eb-8eea-ed16a808e164	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
35c64290-dc1e-43f2-a83a-54e018b960c1	11111111-1111-1111-1111-111111111111	6d53551c-2c84-45ba-bac7-518d2bf81287	PR26050012	2026-05-08	pending_manager	VD0001	Marine Electronics Co.	85000.00	\N	0.00	\N	\N	\N	\N	\N	f	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
133fec17-eff4-4289-82fc-cd15728dbe34	11111111-1111-1111-1111-111111111111	de7b0847-7026-4447-b7b8-1cf0b983d44b	PR26050013	2026-05-09	pending_finance	VF0002	JRC Global	45000.00	\N	0.00	\N	\N	\N	\N	\N	f	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
7de2eab3-03f2-4c53-82cd-7b3fb8a3b774	11111111-1111-1111-1111-111111111111	e467ad24-f938-4728-a219-7d61c1dc0823	PR26050014	2026-05-10	pending_executive	VD0002	Navigation Systems Ltd.	180000.00	\N	0.00	\N	\N	\N	\N	\N	f	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
7d64d630-7780-4293-a201-5b19975a01f9	11111111-1111-1111-1111-111111111111	10e762e9-bdc9-41d7-9756-0d0ed4cbdfc4	PR26050015	2026-05-10	draft	VD0001	Marine Electronics Co.	25000.00	\N	0.00	\N	\N	\N	\N	\N	f	95742447-39bf-46eb-8eea-ed16a808e164	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
b4d0e4ad-9ed3-4d9d-93f1-6012afe6bb58	11111111-1111-1111-1111-111111111111	6d53551c-2c84-45ba-bac7-518d2bf81287	PR26050016	2026-05-11	draft	\N	\N	8500.00	\N	0.00	\N	\N	\N	\N	\N	f	ebee042c-0b67-4061-8ae0-6755b8549575	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
50a34d47-5281-4acb-bfe7-25ef24b7ac05	11111111-1111-1111-1111-111111111111	\N	PR26050017	2026-05-11	draft	\N	\N	3200.00	\N	0.00	\N	\N	\N	\N	\N	f	95742447-39bf-46eb-8eea-ed16a808e164	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
86af0364-4652-4c5a-a2ff-9bff87a74788	11111111-1111-1111-1111-111111111111	586d4de6-73eb-469d-92d2-7546654ff0dd	PR26040018	2026-04-15	sent_to_sap	VD0001	Marine Electronics Co.	350000.00	\N	0.00	\N	\N	\N	\N	\N	f	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
7f61906d-c3d0-42d7-b8d4-a6f9dd77b4f0	11111111-1111-1111-1111-111111111111	c96cc3ca-23d9-40ca-a9d4-217f701767bb	PR26030010	2026-03-05	received	VD0002	Navigation Systems Ltd.	920000.00	\N	0.00	\N	\N	\N	\N	\N	f	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
c640c3b3-76a9-47e9-933d-b9714c3edfc6	11111111-1111-1111-1111-111111111111	c96cc3ca-23d9-40ca-a9d4-217f701767bb	PR26040020	2026-04-20	received	VF0001	Furuno Japan	380000.00	\N	0.00	\N	\N	\N	\N	\N	f	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
4778d85d-0e61-45bd-bc93-af220c3683aa	11111111-1111-1111-1111-111111111111	b1414314-c8cb-4184-98ac-baebae84a764	PR26050019	2026-05-08	pending_manager	VD0001	Marine Electronics Co.	450000.00	\N	0.00	\N	\N	\N	\N	\N	f	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
bc64c5e4-d8f3-49e8-ad0e-a5428662b027	11111111-1111-1111-1111-111111111111	5a190f8c-e256-498a-bb0f-4705b960dced	PR26050020	2026-05-09	pending_finance	VF0002	JRC Global	1200000.00	\N	0.00	\N	\N	\N	\N	\N	f	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
bd6f1215-05ec-4d36-a780-20e32200fc5b	11111111-1111-1111-1111-111111111111	5a190f8c-e256-498a-bb0f-4705b960dced	PR26050021	2026-05-10	draft	VD0002	Navigation Systems Ltd.	850000.00	\N	0.00	\N	\N	\N	\N	\N	f	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
4f3121dd-c29e-4676-bb98-16c445c7192b	11111111-1111-1111-1111-111111111111	586d4de6-73eb-469d-92d2-7546654ff0dd	PR26050022	2026-05-11	pending_manager	VD0001	Marine Electronics Co.	60000.00	\N	0.00	\N	\N	\N	\N	\N	f	ebee042c-0b67-4061-8ae0-6755b8549575	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
1d3a883a-e459-40ed-bdee-dd50555cc272	11111111-1111-1111-1111-111111111111	de7b0847-7026-4447-b7b8-1cf0b983d44b	PR26050023	2026-05-11	draft	VF0001	Furuno Japan	28000.00	\N	0.00	\N	\N	\N	\N	\N	f	95742447-39bf-46eb-8eea-ed16a808e164	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
6e809299-3f26-47cd-b77f-7b62017a4fcc	11111111-1111-1111-1111-111111111111	\N	PR26050024	2026-05-12	draft	VD0002	Navigation Systems Ltd.	0.00	\N	0.00		\N	\N	\N	\N	f	5959a486-ba8f-4416-95a0-9dcb6eb54745	2026-05-12 10:55:35.837377+07	2026-05-12 10:55:35.837377+07
\.


--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.tasks (id, project_id, phase_id, title, description, status, priority, assigned_to, due_date, completed_at, sort_order, created_by, created_at, updated_at) FROM stdin;
77d217ac-1431-47ad-93ad-44c79e3c6561	6d53551c-2c84-45ba-bac7-518d2bf81287	\N	GPS module calibration — Phuket harbor	\N	in_progress	high	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-10	\N	0	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
88d2ae05-f82d-481c-a7f6-c623761974f6	6d53551c-2c84-45ba-bac7-518d2bf81287	\N	Wire routing for navigation display bridge	\N	in_progress	medium	ebee042c-0b67-4061-8ae0-6755b8549575	2026-05-15	\N	0	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
335b181a-933f-40bc-b527-4e746d8d9f2d	6d53551c-2c84-45ba-bac7-518d2bf81287	\N	Sonar depth test — 50m, 100m, 200m range	\N	review	medium	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-08	\N	0	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
5032f420-0a92-458f-84c6-c41a234270f0	6d53551c-2c84-45ba-bac7-518d2bf81287	\N	Prepare UAT test cases document	\N	todo	medium	95742447-39bf-46eb-8eea-ed16a808e164	2026-05-20	\N	0	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
7546e53a-9c38-4ff7-8cf9-f2c7a40dbee4	6d53551c-2c84-45ba-bac7-518d2bf81287	\N	Order spare parts for warranty stock	\N	todo	low	32ae2c60-b3e7-4834-8729-23a4b3ecb2da	2026-06-01	\N	0	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
9a484285-06ac-4527-a305-9da45a6a4a8f	6d53551c-2c84-45ba-bac7-518d2bf81287	\N	Draft training manual for customer	\N	todo	low	95742447-39bf-46eb-8eea-ed16a808e164	2026-06-10	\N	0	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
fbb116ab-a770-485e-9b91-12d3976184bd	6d53551c-2c84-45ba-bac7-518d2bf81287	\N	Sounder transducer mounting	\N	done	high	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-05	\N	0	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
16ea8811-aeb2-4e5e-9ddd-e13e5990a225	6d53551c-2c84-45ba-bac7-518d2bf81287	\N	Power supply installation for nav systems	\N	done	medium	ebee042c-0b67-4061-8ae0-6755b8549575	2026-05-03	\N	0	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
a4e3fdec-1233-4298-92f0-5199295291f8	6d53551c-2c84-45ba-bac7-518d2bf81287	\N	Equipment inventory check & photo	\N	done	low	95742447-39bf-46eb-8eea-ed16a808e164	2026-05-01	\N	0	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:22.736711+07	2026-05-11 17:21:22.736711+07
9e69dfef-b7ab-4afe-90bd-5ada5d5a9f45	de7b0847-7026-4447-b7b8-1cf0b983d44b	\N	ทดสอบ Sonar transducer ระยะ 500m	\N	in_progress	high	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-15	\N	0	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
29b89feb-c49c-42ad-a522-9e44a561c4e4	de7b0847-7026-4447-b7b8-1cf0b983d44b	\N	เดินสาย cable ใต้น้ำ	\N	in_progress	medium	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-18	\N	0	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
e2793b37-fe36-4436-a455-bae77b0ecf44	de7b0847-7026-4447-b7b8-1cf0b983d44b	\N	ติดตั้ง display unit ห้องควบคุม	\N	todo	medium	ebee042c-0b67-4061-8ae0-6755b8549575	2026-05-20	\N	0	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
63e2b212-e080-4822-b840-ea9f502b7bd5	de7b0847-7026-4447-b7b8-1cf0b983d44b	\N	สอบเทียบค่า depth reading	\N	todo	high	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-25	\N	0	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
d84ae048-1cf8-494b-a3ac-787dfc59d1af	586d4de6-73eb-469d-92d2-7546654ff0dd	\N	สำรวจจุดติดตั้ง AIS Repeater 3 จุด	\N	done	high	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-03-20	\N	0	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
adfd8d44-0e0c-4fb0-a6ed-26a4aee73b2b	586d4de6-73eb-469d-92d2-7546654ff0dd	\N	ติดตั้ง AIS Transponder จุดที่ 1	\N	done	medium	ebee042c-0b67-4061-8ae0-6755b8549575	2026-04-05	\N	0	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
d80d359b-a45b-46c0-bd96-ad4b3ae7ab64	586d4de6-73eb-469d-92d2-7546654ff0dd	\N	ติดตั้ง AIS Transponder จุดที่ 2	\N	in_progress	medium	ebee042c-0b67-4061-8ae0-6755b8549575	2026-05-10	\N	0	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
1d80e468-74e1-41df-b09f-f58956f4727f	586d4de6-73eb-469d-92d2-7546654ff0dd	\N	ติดตั้ง AIS Transponder จุดที่ 3	\N	todo	medium	95742447-39bf-46eb-8eea-ed16a808e164	2026-05-25	\N	0	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
b7dfec95-0ebd-4815-9b73-c2fa1233fa6e	586d4de6-73eb-469d-92d2-7546654ff0dd	\N	ทดสอบสัญญาณ AIS ครบ 3 จุด	\N	todo	high	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-06-05	\N	0	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
02983c1c-a409-487e-92df-a4bbbba3d73a	c96cc3ca-23d9-40ca-a9d4-217f701767bb	\N	ติดตั้งกล้อง Zone A (8 ตัว)	\N	done	high	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-03-15	\N	0	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
1d63212f-731a-4a51-8566-ff5888171c46	c96cc3ca-23d9-40ca-a9d4-217f701767bb	\N	ติดตั้งกล้อง Zone B (8 ตัว)	\N	done	high	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-04-01	\N	0	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
f9735e0f-d7dd-4f63-bac6-601abdaaf6a4	c96cc3ca-23d9-40ca-a9d4-217f701767bb	\N	ติดตั้งกล้อง Zone C (8 ตัว)	\N	review	high	ebee042c-0b67-4061-8ae0-6755b8549575	2026-05-01	\N	0	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
e2339e3b-acde-4818-aa51-0fba16f9246c	c96cc3ca-23d9-40ca-a9d4-217f701767bb	\N	ตั้งค่า NVR + Software	\N	in_progress	medium	24d99416-9114-405c-ac4d-97707f282c5c	2026-05-15	\N	0	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
1519d96d-1fed-49e0-be89-4ba05539bff8	c96cc3ca-23d9-40ca-a9d4-217f701767bb	\N	ทดสอบ Live streaming + Playback	\N	todo	medium	24d99416-9114-405c-ac4d-97707f282c5c	2026-05-20	\N	0	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
3273ee64-0c4b-4a0e-8781-ee121156ebe8	c96cc3ca-23d9-40ca-a9d4-217f701767bb	\N	อบรมเจ้าหน้าที่ท่าเรือ	\N	todo	low	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-06-01	\N	0	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
8e0a0e2f-6e6e-4b36-af8d-ecd44a32aec6	5a190f8c-e256-498a-bb0f-4705b960dced	\N	Survey สถานที่ติดตั้ง Radar	\N	done	high	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-04-01	\N	0	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
a27d0f4e-aea6-496b-b52e-336de437cbc8	5a190f8c-e256-498a-bb0f-4705b960dced	\N	ออกแบบ Network topology	\N	in_progress	high	24d99416-9114-405c-ac4d-97707f282c5c	2026-05-15	\N	0	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
9980e290-9c2e-43fc-81af-9d144f4dc06e	5a190f8c-e256-498a-bb0f-4705b960dced	\N	สั่งซื้ออุปกรณ์ Radar + AIS	\N	in_progress	high	32ae2c60-b3e7-4834-8729-23a4b3ecb2da	2026-05-20	\N	0	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
6f1dfa9c-61aa-4f5c-ab96-2edba9190dc9	5a190f8c-e256-498a-bb0f-4705b960dced	\N	เตรียม Server room	\N	todo	medium	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-06-01	\N	0	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
\.


--
-- Data for Name: travel_members; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.travel_members (id, travel_id, user_id, is_lead, confirmed, confirmed_at) FROM stdin;
f9dacbbc-fdbf-4344-9c3f-82916851d61d	45f3b2c0-94b2-4e1b-b895-3920cd94bacf	d0b32103-3b47-45cc-8aa9-5e7030cf226a	t	t	\N
b3405ede-be5e-46a1-87da-2687dd987fc8	45f3b2c0-94b2-4e1b-b895-3920cd94bacf	ebee042c-0b67-4061-8ae0-6755b8549575	f	t	\N
3cc30a5b-d4d7-4dc7-84b3-425861a3446a	45f3b2c0-94b2-4e1b-b895-3920cd94bacf	95742447-39bf-46eb-8eea-ed16a808e164	f	f	\N
2b8b1553-05fe-41c9-99a1-a4580b1950b1	0d44beb5-a1e3-47dd-843c-3e89e76a1c76	1d57e25a-e741-4cc7-aa88-55276aba0df8	t	t	\N
de3369ad-6bdc-44bc-a279-baeeaedcd5d2	0d44beb5-a1e3-47dd-843c-3e89e76a1c76	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	f	t	\N
5e055312-7cb3-4794-8944-c44b4adb9e17	0d44beb5-a1e3-47dd-843c-3e89e76a1c76	95742447-39bf-46eb-8eea-ed16a808e164	f	t	\N
0aad34c7-7cbd-4762-99cb-42d366c813dc	0d44beb5-a1e3-47dd-843c-3e89e76a1c76	24d99416-9114-405c-ac4d-97707f282c5c	f	t	\N
69264a96-c985-43e5-a873-419f021c82ae	0d05f31d-c350-4476-b968-d25e879a2ef9	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	t	t	\N
a9aa10b1-21ae-403d-ad39-250d9471feec	0d05f31d-c350-4476-b968-d25e879a2ef9	d0b32103-3b47-45cc-8aa9-5e7030cf226a	f	t	\N
32a3d225-28f3-4681-93da-09101f2212ab	7b073e31-e3f7-4ace-973f-97b02f0075b1	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	t	t	\N
231a47d3-87d3-4db6-97de-571245a782fd	7b073e31-e3f7-4ace-973f-97b02f0075b1	95742447-39bf-46eb-8eea-ed16a808e164	f	f	\N
ea496599-0066-4355-9439-d9906a2508cb	7b073e31-e3f7-4ace-973f-97b02f0075b1	d0b32103-3b47-45cc-8aa9-5e7030cf226a	f	t	\N
9df7d92b-ffbe-41e7-a6c5-9ce5af5aae8b	e2dac2fc-ecc5-40b3-9d77-5de31bc02740	d0b32103-3b47-45cc-8aa9-5e7030cf226a	t	t	\N
5fa96c8e-fad9-47e4-af51-8b92f5089ae0	e2dac2fc-ecc5-40b3-9d77-5de31bc02740	ebee042c-0b67-4061-8ae0-6755b8549575	f	f	\N
fdef0a35-a55e-4b38-b197-09deaafb62a2	bdda77fc-b311-4377-bb24-fb18598ce5da	d0b32103-3b47-45cc-8aa9-5e7030cf226a	t	t	\N
05174231-19d1-4cfe-9b43-a81705a7e085	bdda77fc-b311-4377-bb24-fb18598ce5da	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	f	t	\N
ead0dfd1-f316-48e2-a400-9bb57d490592	bdda77fc-b311-4377-bb24-fb18598ce5da	1d57e25a-e741-4cc7-aa88-55276aba0df8	f	f	\N
\.


--
-- Data for Name: travel_requests; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.travel_requests (id, company_id, project_id, doc_number, destination, purpose, start_date, end_date, status, estimated_cost, advance_amount, advance_expense_id, vehicle_booking_id, pre_depart_confirmed, lead_user_id, created_by, created_at, updated_at) FROM stdin;
45f3b2c0-94b2-4e1b-b895-3920cd94bacf	11111111-1111-1111-1111-111111111111	6d53551c-2c84-45ba-bac7-518d2bf81287	TRV26050001	ภูเก็ต	Site Survey & Installation ระบบนำร่อง	2026-05-15	2026-05-17	approved	35000.00	20000.00	\N	\N	f	d0b32103-3b47-45cc-8aa9-5e7030cf226a	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
0d44beb5-a1e3-47dd-843c-3e89e76a1c76	11111111-1111-1111-1111-111111111111	a3e5075c-0484-4631-b718-9af934802de1	TRV26050002	ชลบุรี	Satcom Equipment Delivery & Setup	2026-05-20	2026-05-21	pending_executive	120000.00	50000.00	\N	\N	f	1d57e25a-e741-4cc7-aa88-55276aba0df8	1d57e25a-e741-4cc7-aa88-55276aba0df8	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
0d05f31d-c350-4476-b968-d25e879a2ef9	11111111-1111-1111-1111-111111111111	de7b0847-7026-4447-b7b8-1cf0b983d44b	TRV26050003	ระยอง	Sonar System Testing	2026-05-05	2026-05-07	completed	18200.00	0.00	\N	\N	f	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
7b073e31-e3f7-4ace-973f-97b02f0075b1	11111111-1111-1111-1111-111111111111	b1414314-c8cb-4184-98ac-baebae84a764	TRV26050004	ชุมพร	Weather Station Installation	2026-05-20	2026-05-22	pending_manager	45000.00	15000.00	\N	\N	f	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
e2dac2fc-ecc5-40b3-9d77-5de31bc02740	11111111-1111-1111-1111-111111111111	586d4de6-73eb-469d-92d2-7546654ff0dd	TRV26050005	สุราษฎร์ธานี	AIS Repeater ติดตั้งจุดที่ 3	2026-05-25	2026-05-27	draft	28000.00	10000.00	\N	\N	f	d0b32103-3b47-45cc-8aa9-5e7030cf226a	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
bdda77fc-b311-4377-bb24-fb18598ce5da	11111111-1111-1111-1111-111111111111	5a190f8c-e256-498a-bb0f-4705b960dced	TRV26050006	มาบตาพุด	VTS Site Survey	2026-05-28	2026-05-30	pending_manager	55000.00	30000.00	\N	\N	f	d0b32103-3b47-45cc-8aa9-5e7030cf226a	d0b32103-3b47-45cc-8aa9-5e7030cf226a	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.users (id, company_id, email, password_hash, google_id, first_name, first_name_th, last_name, last_name_th, role, "position", department, sap_user_code, sap_license, can_approve, approval_limit, avatar_url, phone, is_active, last_login_at, created_at, updated_at) FROM stdin;
a9326f9b-1c8f-4776-80d4-18c5ff4de298	11111111-1111-1111-1111-111111111111	somparat@sda-group.com	$2a$06$DBSGZu74ROTgGCH5mRNmZeS6HyoANUzWNhQbRPsXC7rg9qedVY16K	\N	Somparat	ศมพรัตร์	Decharintr	เดชะรินทร์	executive	Assistant MD	MD	Somparat D	Professional	t	999999999.00	\N	\N	t	\N	2026-05-11 16:13:13.23335+07	2026-05-11 16:13:13.23335+07
1d57e25a-e741-4cc7-aa88-55276aba0df8	11111111-1111-1111-1111-111111111111	jathuthep@sda-group.com	$2a$06$omhRFrn5/m1d4kvY3qoo5e/siUlQkz0D09lS.cvcpAdXO1L4Yx/rW	\N	Jathuthep	จตุเทพ	Kueadam	เกื้อดำ	pm	Manager	PRJ	Jathuthep K	Limited - Logistics	t	100000.00	\N	\N	t	\N	2026-05-11 16:13:13.23335+07	2026-05-11 16:13:13.23335+07
b31dbffc-0fd4-42fe-8ae5-a960de5b328d	11111111-1111-1111-1111-111111111111	winit@sda-group.com	$2a$06$rKzX3LJCGoWnusb/.OPueel6LGZJTFmryq053mtqxegyCcZIIw27W	\N	Winit	วินิจ	Navee	นาวี	pm	Head	PRJ	Winit N	Limited - Logistics	t	100000.00	\N	\N	t	\N	2026-05-11 16:13:13.23335+07	2026-05-11 16:13:13.23335+07
d0b32103-3b47-45cc-8aa9-5e7030cf226a	11111111-1111-1111-1111-111111111111	phuchong@sda-group.com	$2a$06$sjgE6ST/Auh76/thh4vp3.WsXY4R0h5mocguI/CHKdDfvMHpyPEqy	\N	Phuchong	ภุชงค์	Mongkol	มงคล	pm	Head	PRJ	Phuchong M	Limited - Logistics	t	100000.00	\N	\N	t	\N	2026-05-11 16:13:13.23335+07	2026-05-11 16:13:13.23335+07
75b4f523-f342-4c11-97b5-26757ccf1449	11111111-1111-1111-1111-111111111111	norawat@sda-group.com	$2a$06$Nk3iqLe1sqESmp6fbhIL5.bGHlUwIYOF0QMsmR/NpozFzegQ.b7BS	\N	Norawat	นรวัฒน์	Sappachang	สรรพช่าง	pm	Manager	Ass.MD	Norawat S	Limited - Logistics	t	100000.00	\N	\N	t	\N	2026-05-11 16:13:13.23335+07	2026-05-11 16:13:13.23335+07
111d26db-f886-4f69-a1f6-cb94addefa7e	11111111-1111-1111-1111-111111111111	sukanya@sda-group.com	$2a$06$4cDMcz4w./cEAUOBKLKu4OIylDzRLJ9clV84x8d9AgaS9ylIoGqJ.	\N	Sukanya	สุกัญญา	Duangsintham	ดวงศีลธรรม	finance	Senior	FIN	Sukanya D	Limited - Financials	t	100000.00	\N	\N	t	\N	2026-05-11 16:13:13.23335+07	2026-05-11 16:13:13.23335+07
2ad7260e-a703-4a04-bc04-ccd0cc456894	11111111-1111-1111-1111-111111111111	pranee@sda-group.com	$2a$06$Te86FgcILjf80GAY/5embOoK0XyghhiPFs0/RVPjmXPDAmoG.HnbG	\N	Pranee	ปราณี	Samritmeephon	สัมฤทธิ์มีผล	accounting	Manager	ACC	Pranee S	Limited - Financials	f	0.00	\N	\N	t	\N	2026-05-11 16:13:13.23335+07	2026-05-11 16:13:13.23335+07
66c7f9b3-1067-433c-a1a6-3061d2d78f18	11111111-1111-1111-1111-111111111111	wachirapron@sda-group.com	$2a$06$UTLNyTl1sQFavy3hY/1jSuWVaMY91Jyo7rVS64Aa/6Wd1Y8eB1KO6	\N	Wachirapron	วชิราภรณ์	Sunthorn	สุนทร	accounting	Senior	ACC	Wachirapron S	Limited - Financials	f	0.00	\N	\N	t	\N	2026-05-11 16:13:13.23335+07	2026-05-11 16:13:13.23335+07
0e689e21-f104-41c5-a27e-d1da5e0a41d6	11111111-1111-1111-1111-111111111111	nuanwan@sda-group.com	$2a$06$iw7nRIcuTZjmKq4Yw6sSwul1nSnwj6vPn/.cjKqKLT9DeYWpE31aa	\N	Nuanwan	นวลวรรณ	Wongpanich	ว่องพานิช	accounting	Staff	ACC	Nuanwan W	Limited - Financials	f	0.00	\N	\N	t	\N	2026-05-11 16:13:13.23335+07	2026-05-11 16:13:13.23335+07
3df3ce0e-558e-4b30-9956-6f40d4465ae5	11111111-1111-1111-1111-111111111111	kanganavadee@sda-group.com	$2a$06$Q/u3u9Hl/AXvbZ0lq3Ks.Obu3irCEsrlZkzv6jETZ/CKl3aSnQtCK	\N	Kanganavadee	กาญจนาวดี	Konpetch	ก้อนเพชร	accounting	Staff	ACC	Kanganavadee K	Limited - Financials	f	0.00	\N	\N	t	\N	2026-05-11 16:13:13.23335+07	2026-05-11 16:13:13.23335+07
32ae2c60-b3e7-4834-8729-23a4b3ecb2da	11111111-1111-1111-1111-111111111111	pimradaporn@sda-group.com	$2a$06$agn4RquLgcnPDVrHJVkd6.3ufY8ijSPuS6TebYbZ7TYDdBNdvHlP.	\N	Pimradaporn	พิมรดาภรณ์	Sunahu	สูน่าหู	procurement	Senior	PRC-Domestic	Pimradaporn S	Limited - Logistics	t	50000.00	\N	\N	t	\N	2026-05-11 16:13:13.23335+07	2026-05-11 16:13:13.23335+07
eb90ebce-b926-4e40-82cd-2d746b24b28d	11111111-1111-1111-1111-111111111111	mayurachat@sda-group.com	$2a$06$9/PhkNnyLficKa6FILwgCuQ1fjLGYpOhx2jSK4vIQVM9qYXuLO93a	\N	Mayurachat	มยุรฉัตร	Chantawongwut	ฉันทวงศ์วุฒิ	procurement	Senior	PRC-International	Mayurachat C	Limited - Logistics	t	50000.00	\N	\N	t	\N	2026-05-11 16:13:13.23335+07	2026-05-11 16:13:13.23335+07
e2f86c40-6851-4068-9754-79985bdc7576	11111111-1111-1111-1111-111111111111	phetcharat@sda-group.com	$2a$06$YVzzJTQI10/49l9tIXXHu.59Uualut8xmgm.Pe/iqSMS1VLJ0S8zu	\N	Phetcharat	เพชรรัตน์	Saenkaew	แสนแก้ว	admin	Staff	WHL	Phetcharat S	Limited - Logistics	f	0.00	\N	\N	t	\N	2026-05-11 16:13:13.23335+07	2026-05-11 16:13:13.23335+07
24d99416-9114-405c-ac4d-97707f282c5c	11111111-1111-1111-1111-111111111111	teera@sda-group.com	$2a$06$5zkHFj2TpYWKM9QaiI95duqsoYCwbV9Wi9VTbDzgaR7lUy33wudqi	\N	Teera	ธีระ	Suppakomolkit	ศุภโกมลกิจ	admin	Senior	IT	Teera S	Limited - Logistics	f	0.00	\N	\N	t	\N	2026-05-11 16:13:13.23335+07	2026-05-11 16:13:13.23335+07
ab007b65-ce22-4612-82f6-7e733460e99f	11111111-1111-1111-1111-111111111111	ampai@sda-group.com	$2a$06$EoLt1nFV4GdBzTXt7cCt1uJNSo/KWDKGPoFc8EaPvR6jy6w9lv/BK	\N	Ampai	อำไพ	Santadratanawong	สันทัดรัตนวงศ์	staff	Head	SAL	Ampai T	Limited - Logistics	f	0.00	\N	\N	t	\N	2026-05-11 16:13:13.23335+07	2026-05-11 16:13:13.23335+07
a00246a1-d8ee-4a7d-b626-a060f86b4d26	11111111-1111-1111-1111-111111111111	donnapa@sda-group.com	$2a$06$cbYiU5wboDZMWEoMCO6jBeTLufdkjcuO0QlkMVICAc9XJK8/ar7BK	\N	Donnapa	ดลนภา	Inphupimon	อินภู่พิมล	staff	Senior	SAL	Donnapa I	Limited - Logistics	f	0.00	\N	\N	t	\N	2026-05-11 16:13:13.23335+07	2026-05-11 16:13:13.23335+07
ebee042c-0b67-4061-8ae0-6755b8549575	11111111-1111-1111-1111-111111111111	sirikwan@sda-group.com	$2a$06$oyMp.uJJe2gDKtmJLGGRLOcg703QiJfhssYhoM3VGEZ7n4dz.tYMO	\N	Sirikwan	ศิริขวัญ	Prakobkit	ประกอบกิจ	staff	Senior	PRJ	Sirikwan P	Limited - Logistics	f	0.00	\N	\N	t	\N	2026-05-11 16:13:13.23335+07	2026-05-11 16:13:13.23335+07
95742447-39bf-46eb-8eea-ed16a808e164	11111111-1111-1111-1111-111111111111	noppamas@sda-group.com	$2a$06$ArQPGjXzroQNOVxJDnPFX.Pu6YLzwIp1zSD/FCRs6t1CpwR.zeS6m	\N	Noppamas	นพมาศ	Burana	บูรณะ	staff	Staff	PRJ	Noppamas B	Limited - Logistics	f	0.00	\N	\N	t	\N	2026-05-11 16:13:13.23335+07	2026-05-11 16:13:13.23335+07
0de45976-9d75-4fcb-a288-ad01f34e32f0	11111111-1111-1111-1111-111111111111	pakorn@sala-daeng.com	$2a$06$M6xhylieLJj0g1Ri3pDs4ezQWekBaOFpFrsQ87I5m38izzR6r0H0O	\N	Pakorn	ปกรณ์	Sala-Daeng	ศาลาแดง	executive	Web Administrator	IT	\N	\N	t	999999999.00	\N	\N	t	2026-05-12 12:10:48.176214+07	2026-05-11 16:52:02.785506+07	2026-05-12 12:10:48.176214+07
5959a486-ba8f-4416-95a0-9dcb6eb54745	11111111-1111-1111-1111-111111111111	warit@sda-group.com	$2a$06$OIxdsIMrmirXDzmzxNbyz.xdnTApdQkKJ0lwN4Zkf.gFQxUjYGh26	\N	Warit	วริศ	Decharintr	เดชะรินทร์	executive	CEO	CEO	Warit D	Professional	t	999999999.00	\N	\N	t	2026-05-11 16:23:20.603079+07	2026-05-11 16:13:13.23335+07	2026-05-11 16:23:20.603079+07
\.


--
-- Data for Name: vehicle_bookings; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.vehicle_bookings (id, vehicle_id, project_id, travel_id, status, start_date, end_date, purpose, passengers, km_start, km_end, fuel_start, fuel_end, condition_notes, checked_out_at, checked_in_at, booked_by, approved_by, created_at, updated_at) FROM stdin;
f1838e6d-9cf8-4b4e-b257-ea7250319b42	ee816762-8b01-4952-8669-1cadf4da1b0e	6d53551c-2c84-45ba-bac7-518d2bf81287	\N	checked_in	2026-05-05	2026-05-07	Site visit Phuket harbor	Jathuthep, Sirikwan	44380.0	45230.0	\N	\N	\N	\N	\N	1d57e25a-e741-4cc7-aa88-55276aba0df8	\N	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
466affe8-d9d2-4a69-bda6-481af1eb4f4d	268c7a93-feda-4bd4-91c3-6df0b5c441eb	de7b0847-7026-4447-b7b8-1cf0b983d44b	\N	checked_in	2026-04-20	2026-04-23	Sonar installation Rayong	Winit, Phuchong, Noppamas, Sirikwan	66800.0	67600.0	\N	\N	\N	\N	\N	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	\N	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
c07698a9-f0b8-455d-a1e9-3e0950e51873	92d8de61-8fc3-4824-9bfb-58e6acd1a9d2	10e762e9-bdc9-41d7-9756-0d0ed4cbdfc4	\N	checked_in	2026-04-28	2026-04-28	Delivery Samut Prakan	Noppamas	32100.0	32250.0	\N	\N	\N	\N	\N	95742447-39bf-46eb-8eea-ed16a808e164	\N	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
6bbffab9-24c1-462b-a817-37ef9c13545c	268c7a93-feda-4bd4-91c3-6df0b5c441eb	de7b0847-7026-4447-b7b8-1cf0b983d44b	\N	checked_out	2026-05-09	2026-05-12	Sonar testing Rayong	Phuchong, Sirikwan, Noppamas + 3 technicians	67600.0	\N	\N	\N	\N	\N	\N	d0b32103-3b47-45cc-8aa9-5e7030cf226a	\N	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
cc867473-6c9a-4a06-8f6d-8444573028d8	ee816762-8b01-4952-8669-1cadf4da1b0e	a3e5075c-0484-4631-b718-9af934802de1	\N	approved	2026-05-15	2026-05-17	Chonburi survey	Winit, Noppamas	\N	\N	\N	\N	\N	\N	\N	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	\N	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
6042a08c-dbf0-485e-849b-be4a16fd97ec	92d8de61-8fc3-4824-9bfb-58e6acd1a9d2	e467ad24-f938-4728-a219-7d61c1dc0823	\N	pending	2026-05-15	2026-05-17	Bangkok delivery	Sirikwan	\N	\N	\N	\N	\N	\N	\N	ebee042c-0b67-4061-8ae0-6755b8549575	\N	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
0613670f-6fbf-4ac6-9e8a-cf66695b584d	268c7a93-feda-4bd4-91c3-6df0b5c441eb	b1414314-c8cb-4184-98ac-baebae84a764	\N	approved	2026-05-20	2026-05-22	Weather station setup Chumphon	Winit, Noppamas, Phuchong	\N	\N	\N	\N	\N	\N	\N	b31dbffc-0fd4-42fe-8ae5-a960de5b328d	\N	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
e1e2bcac-253c-4554-931c-938920aa6444	ee816762-8b01-4952-8669-1cadf4da1b0e	586d4de6-73eb-469d-92d2-7546654ff0dd	\N	pending	2026-05-25	2026-05-27	AIS install Surat Thani	Phuchong, Sirikwan	\N	\N	\N	\N	\N	\N	\N	d0b32103-3b47-45cc-8aa9-5e7030cf226a	\N	2026-05-11 17:21:23.433908+07	2026-05-11 17:21:23.433908+07
92d333a6-83eb-420f-930b-ace05c141bc6	ee816762-8b01-4952-8669-1cadf4da1b0e	6d53551c-2c84-45ba-bac7-518d2bf81287	\N	pending	2026-05-02	2026-05-03			\N	\N	\N	\N	\N	\N	\N	5959a486-ba8f-4416-95a0-9dcb6eb54745	\N	2026-05-12 11:51:16.997718+07	2026-05-12 11:51:16.997718+07
\.


--
-- Data for Name: vehicles; Type: TABLE DATA; Schema: public; Owner: user
--

COPY public.vehicles (id, company_id, plate_number, name, vehicle_type, seats, status, current_km, fuel_level, image_url, notes, created_at, updated_at) FROM stdin;
ee816762-8b01-4952-8669-1cadf4da1b0e	11111111-1111-1111-1111-111111111111	กก-1234 กทม	Toyota Hilux Revo	Pickup	5	available	45230.0	\N	\N	\N	2026-05-11 16:13:13.724307+07	2026-05-11 16:13:13.724307+07
268c7a93-feda-4bd4-91c3-6df0b5c441eb	11111111-1111-1111-1111-111111111111	ขข-5678 กทม	Toyota Commuter	Van	12	in_use	68100.0	\N	\N	\N	2026-05-11 16:13:13.724307+07	2026-05-11 16:13:13.724307+07
92d8de61-8fc3-4824-9bfb-58e6acd1a9d2	11111111-1111-1111-1111-111111111111	คค-9012 กทม	Honda City	Sedan	5	maintenance	32400.0	\N	\N	\N	2026-05-11 16:13:13.724307+07	2026-05-11 16:13:13.724307+07
\.


--
-- Name: activity_log activity_log_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_pkey PRIMARY KEY (id);


--
-- Name: approval_matrix approval_matrix_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.approval_matrix
    ADD CONSTRAINT approval_matrix_pkey PRIMARY KEY (id);


--
-- Name: approvals approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_pkey PRIMARY KEY (id);


--
-- Name: attachments attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_pkey PRIMARY KEY (id);


--
-- Name: budget_lines budget_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.budget_lines
    ADD CONSTRAINT budget_lines_pkey PRIMARY KEY (id);


--
-- Name: budgets budgets_code_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_code_key UNIQUE (code);


--
-- Name: budgets budgets_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_pkey PRIMARY KEY (id);


--
-- Name: calendar_events calendar_events_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: companies companies_slug_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_slug_key UNIQUE (slug);


--
-- Name: discussions discussions_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_doc_number_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_doc_number_key UNIQUE (doc_number);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: number_series number_series_company_id_doc_type_year_month_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.number_series
    ADD CONSTRAINT number_series_company_id_doc_type_year_month_key UNIQUE (company_id, doc_type, year_month);


--
-- Name: number_series number_series_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.number_series
    ADD CONSTRAINT number_series_pkey PRIMARY KEY (id);


--
-- Name: ot_requests ot_requests_doc_number_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.ot_requests
    ADD CONSTRAINT ot_requests_doc_number_key UNIQUE (doc_number);


--
-- Name: ot_requests ot_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.ot_requests
    ADD CONSTRAINT ot_requests_pkey PRIMARY KEY (id);


--
-- Name: phase_steps phase_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.phase_steps
    ADD CONSTRAINT phase_steps_pkey PRIMARY KEY (id);


--
-- Name: phases phases_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.phases
    ADD CONSTRAINT phases_pkey PRIMARY KEY (id);


--
-- Name: po_lines po_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.po_lines
    ADD CONSTRAINT po_lines_pkey PRIMARY KEY (id);


--
-- Name: pr_lines pr_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.pr_lines
    ADD CONSTRAINT pr_lines_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_pkey PRIMARY KEY (id);


--
-- Name: project_members project_members_project_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_user_id_key UNIQUE (project_id, user_id);


--
-- Name: projects projects_code_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_code_key UNIQUE (code);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_doc_number_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_doc_number_key UNIQUE (doc_number);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_requests purchase_requests_doc_number_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_doc_number_key UNIQUE (doc_number);


--
-- Name: purchase_requests purchase_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_pkey PRIMARY KEY (id);


--
-- Name: tasks tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_pkey PRIMARY KEY (id);


--
-- Name: travel_members travel_members_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.travel_members
    ADD CONSTRAINT travel_members_pkey PRIMARY KEY (id);


--
-- Name: travel_members travel_members_travel_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.travel_members
    ADD CONSTRAINT travel_members_travel_id_user_id_key UNIQUE (travel_id, user_id);


--
-- Name: travel_requests travel_requests_doc_number_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.travel_requests
    ADD CONSTRAINT travel_requests_doc_number_key UNIQUE (doc_number);


--
-- Name: travel_requests travel_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.travel_requests
    ADD CONSTRAINT travel_requests_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: vehicle_bookings vehicle_bookings_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.vehicle_bookings
    ADD CONSTRAINT vehicle_bookings_pkey PRIMARY KEY (id);


--
-- Name: vehicles vehicles_pkey; Type: CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_pkey PRIMARY KEY (id);


--
-- Name: idx_activity_company; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_activity_company ON public.activity_log USING btree (company_id, created_at DESC);


--
-- Name: idx_activity_project; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_activity_project ON public.activity_log USING btree (project_id);


--
-- Name: idx_approvals_approver; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_approvals_approver ON public.approvals USING btree (approver_id);


--
-- Name: idx_approvals_doc; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_approvals_doc ON public.approvals USING btree (doc_type, doc_id);


--
-- Name: idx_attachments_doc; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_attachments_doc ON public.attachments USING btree (doc_type, doc_id);


--
-- Name: idx_bookings_dates; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_bookings_dates ON public.vehicle_bookings USING btree (start_date, end_date);


--
-- Name: idx_bookings_vehicle; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_bookings_vehicle ON public.vehicle_bookings USING btree (vehicle_id);


--
-- Name: idx_budgets_project; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_budgets_project ON public.budgets USING btree (project_id);


--
-- Name: idx_events_company; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_events_company ON public.calendar_events USING btree (company_id, start_time);


--
-- Name: idx_expenses_company; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_expenses_company ON public.expenses USING btree (company_id);


--
-- Name: idx_expenses_project; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_expenses_project ON public.expenses USING btree (project_id);


--
-- Name: idx_expenses_status; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_expenses_status ON public.expenses USING btree (status);


--
-- Name: idx_expenses_type; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_expenses_type ON public.expenses USING btree (expense_type);


--
-- Name: idx_notif_company; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_notif_company ON public.notifications USING btree (company_id);


--
-- Name: idx_notif_user; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_notif_user ON public.notifications USING btree (user_id, is_read);


--
-- Name: idx_ot_company; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_ot_company ON public.ot_requests USING btree (company_id);


--
-- Name: idx_ot_status; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_ot_status ON public.ot_requests USING btree (status);


--
-- Name: idx_ot_user; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_ot_user ON public.ot_requests USING btree (user_id);


--
-- Name: idx_po_company; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_po_company ON public.purchase_orders USING btree (company_id);


--
-- Name: idx_pr_company; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_pr_company ON public.purchase_requests USING btree (company_id);


--
-- Name: idx_pr_project; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_pr_project ON public.purchase_requests USING btree (project_id);


--
-- Name: idx_pr_status; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_pr_status ON public.purchase_requests USING btree (status);


--
-- Name: idx_projects_company; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_projects_company ON public.projects USING btree (company_id);


--
-- Name: idx_projects_pm; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_projects_pm ON public.projects USING btree (pm_user_id);


--
-- Name: idx_projects_status; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_projects_status ON public.projects USING btree (status);


--
-- Name: idx_tasks_assigned; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tasks_assigned ON public.tasks USING btree (assigned_to);


--
-- Name: idx_tasks_project; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tasks_project ON public.tasks USING btree (project_id);


--
-- Name: idx_tasks_status; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_tasks_status ON public.tasks USING btree (status);


--
-- Name: idx_travel_company; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_travel_company ON public.travel_requests USING btree (company_id);


--
-- Name: idx_travel_status; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_travel_status ON public.travel_requests USING btree (status);


--
-- Name: idx_users_company; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_company ON public.users USING btree (company_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_role; Type: INDEX; Schema: public; Owner: user
--

CREATE INDEX idx_users_role ON public.users USING btree (role);


--
-- Name: budgets trg_budgets_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trg_budgets_updated_at BEFORE UPDATE ON public.budgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: companies trg_companies_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: discussions trg_discussions_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trg_discussions_updated_at BEFORE UPDATE ON public.discussions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: expenses trg_expenses_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trg_expenses_updated_at BEFORE UPDATE ON public.expenses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: notes trg_notes_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trg_notes_updated_at BEFORE UPDATE ON public.notes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: number_series trg_number_series_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trg_number_series_updated_at BEFORE UPDATE ON public.number_series FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: ot_requests trg_ot_requests_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trg_ot_requests_updated_at BEFORE UPDATE ON public.ot_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: projects trg_projects_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trg_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: purchase_orders trg_purchase_orders_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: purchase_requests trg_purchase_requests_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trg_purchase_requests_updated_at BEFORE UPDATE ON public.purchase_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: tasks trg_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: travel_requests trg_travel_requests_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trg_travel_requests_updated_at BEFORE UPDATE ON public.travel_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: users trg_users_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: vehicle_bookings trg_vehicle_bookings_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trg_vehicle_bookings_updated_at BEFORE UPDATE ON public.vehicle_bookings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: vehicles trg_vehicles_updated_at; Type: TRIGGER; Schema: public; Owner: user
--

CREATE TRIGGER trg_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();


--
-- Name: activity_log activity_log_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: activity_log activity_log_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: activity_log activity_log_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.activity_log
    ADD CONSTRAINT activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: approval_matrix approval_matrix_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.approval_matrix
    ADD CONSTRAINT approval_matrix_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: approvals approvals_approver_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_approver_id_fkey FOREIGN KEY (approver_id) REFERENCES public.users(id);


--
-- Name: approvals approvals_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.approvals
    ADD CONSTRAINT approvals_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: attachments attachments_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: attachments attachments_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: attachments attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.attachments
    ADD CONSTRAINT attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.users(id);


--
-- Name: budget_lines budget_lines_budget_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.budget_lines
    ADD CONSTRAINT budget_lines_budget_id_fkey FOREIGN KEY (budget_id) REFERENCES public.budgets(id) ON DELETE CASCADE;


--
-- Name: budgets budgets_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: budgets budgets_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: budgets budgets_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: budgets budgets_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.budgets
    ADD CONSTRAINT budgets_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: calendar_events calendar_events_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: calendar_events calendar_events_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: calendar_events calendar_events_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.calendar_events
    ADD CONSTRAINT calendar_events_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: discussions discussions_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.discussions(id);


--
-- Name: discussions discussions_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: discussions discussions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.discussions
    ADD CONSTRAINT discussions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: expenses expenses_advance_ref_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_advance_ref_id_fkey FOREIGN KEY (advance_ref_id) REFERENCES public.expenses(id);


--
-- Name: expenses expenses_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: expenses expenses_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: expenses expenses_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: vehicle_bookings fk_booking_travel; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.vehicle_bookings
    ADD CONSTRAINT fk_booking_travel FOREIGN KEY (travel_id) REFERENCES public.travel_requests(id);


--
-- Name: notes notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: notes notes_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: number_series number_series_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.number_series
    ADD CONSTRAINT number_series_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: ot_requests ot_requests_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.ot_requests
    ADD CONSTRAINT ot_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: ot_requests ot_requests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.ot_requests
    ADD CONSTRAINT ot_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: ot_requests ot_requests_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.ot_requests
    ADD CONSTRAINT ot_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: ot_requests ot_requests_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.ot_requests
    ADD CONSTRAINT ot_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: phase_steps phase_steps_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.phase_steps
    ADD CONSTRAINT phase_steps_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: phase_steps phase_steps_phase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.phase_steps
    ADD CONSTRAINT phase_steps_phase_id_fkey FOREIGN KEY (phase_id) REFERENCES public.phases(id) ON DELETE CASCADE;


--
-- Name: phases phases_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.phases
    ADD CONSTRAINT phases_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: po_lines po_lines_po_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.po_lines
    ADD CONSTRAINT po_lines_po_id_fkey FOREIGN KEY (po_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: pr_lines pr_lines_budget_line_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.pr_lines
    ADD CONSTRAINT pr_lines_budget_line_id_fkey FOREIGN KEY (budget_line_id) REFERENCES public.budget_lines(id);


--
-- Name: pr_lines pr_lines_pr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.pr_lines
    ADD CONSTRAINT pr_lines_pr_id_fkey FOREIGN KEY (pr_id) REFERENCES public.purchase_requests(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: project_members project_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.project_members
    ADD CONSTRAINT project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: projects projects_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: projects projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: projects projects_pm_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pm_user_id_fkey FOREIGN KEY (pm_user_id) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_pr_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pr_id_fkey FOREIGN KEY (pr_id) REFERENCES public.purchase_requests(id);


--
-- Name: purchase_orders purchase_orders_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: purchase_requests purchase_requests_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: purchase_requests purchase_requests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchase_requests purchase_requests_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: tasks tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.users(id);


--
-- Name: tasks tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: tasks tasks_phase_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_phase_id_fkey FOREIGN KEY (phase_id) REFERENCES public.phases(id);


--
-- Name: tasks tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.tasks
    ADD CONSTRAINT tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: travel_members travel_members_travel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.travel_members
    ADD CONSTRAINT travel_members_travel_id_fkey FOREIGN KEY (travel_id) REFERENCES public.travel_requests(id) ON DELETE CASCADE;


--
-- Name: travel_members travel_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.travel_members
    ADD CONSTRAINT travel_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: travel_requests travel_requests_advance_expense_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.travel_requests
    ADD CONSTRAINT travel_requests_advance_expense_id_fkey FOREIGN KEY (advance_expense_id) REFERENCES public.expenses(id);


--
-- Name: travel_requests travel_requests_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.travel_requests
    ADD CONSTRAINT travel_requests_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: travel_requests travel_requests_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.travel_requests
    ADD CONSTRAINT travel_requests_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: travel_requests travel_requests_lead_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.travel_requests
    ADD CONSTRAINT travel_requests_lead_user_id_fkey FOREIGN KEY (lead_user_id) REFERENCES public.users(id);


--
-- Name: travel_requests travel_requests_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.travel_requests
    ADD CONSTRAINT travel_requests_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: travel_requests travel_requests_vehicle_booking_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.travel_requests
    ADD CONSTRAINT travel_requests_vehicle_booking_id_fkey FOREIGN KEY (vehicle_booking_id) REFERENCES public.vehicle_bookings(id);


--
-- Name: users users_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: vehicle_bookings vehicle_bookings_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.vehicle_bookings
    ADD CONSTRAINT vehicle_bookings_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: vehicle_bookings vehicle_bookings_booked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.vehicle_bookings
    ADD CONSTRAINT vehicle_bookings_booked_by_fkey FOREIGN KEY (booked_by) REFERENCES public.users(id);


--
-- Name: vehicle_bookings vehicle_bookings_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.vehicle_bookings
    ADD CONSTRAINT vehicle_bookings_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: vehicle_bookings vehicle_bookings_vehicle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.vehicle_bookings
    ADD CONSTRAINT vehicle_bookings_vehicle_id_fkey FOREIGN KEY (vehicle_id) REFERENCES public.vehicles(id);


--
-- Name: vehicles vehicles_company_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: user
--

ALTER TABLE ONLY public.vehicles
    ADD CONSTRAINT vehicles_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- PostgreSQL database dump complete
--

\unrestrict c09fOgealeuuQZdvdFmaP1Wrf2cS9CQdPvS0P0uSN7MLoidssm6BvGSsGmdh8Kl

