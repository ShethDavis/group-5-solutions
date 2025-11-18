-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'hr', 'department_head', 'employee');

-- Create enum for departments
CREATE TYPE public.department_type AS ENUM ('Human Resources', 'Finance', 'Operations', 'Sales');

-- Create enum for leave request status
CREATE TYPE public.leave_status AS ENUM ('pending', 'approved', 'rejected');

-- Create enum for attendance status
CREATE TYPE public.attendance_status AS ENUM ('present', 'absent', 'late', 'half_day');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(user_id, role)
);

-- Create employees table (managed by HR)
CREATE TABLE public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  employee_number TEXT NOT NULL UNIQUE,
  department department_type NOT NULL,
  position TEXT NOT NULL,
  hire_date DATE NOT NULL,
  salary DECIMAL(10, 2),
  address TEXT,
  emergency_contact TEXT,
  emergency_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create attendance table
CREATE TABLE public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  status attendance_status NOT NULL,
  check_in_time TIME,
  check_out_time TIME,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(employee_id, date)
);

-- Create leave_requests table
CREATE TABLE public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  status leave_status DEFAULT 'pending' NOT NULL,
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Create performance_reviews table
CREATE TABLE public.performance_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID REFERENCES public.employees(id) ON DELETE CASCADE NOT NULL,
  reviewer_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  review_date DATE NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  strengths TEXT,
  areas_for_improvement TEXT,
  goals TEXT,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to get user's department
CREATE OR REPLACE FUNCTION public.get_user_department(_user_id UUID)
RETURNS department_type
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT department
  FROM public.employees
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "HR can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "HR can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for employees
CREATE POLICY "Employees can view their own data"
  ON public.employees FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "HR and Admins can view all employees"
  ON public.employees FOR SELECT
  USING (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Department heads can view their department employees"
  ON public.employees FOR SELECT
  USING (
    public.has_role(auth.uid(), 'department_head') AND
    department = public.get_user_department(auth.uid())
  );

CREATE POLICY "HR can manage employees"
  ON public.employees FOR ALL
  USING (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for attendance
CREATE POLICY "Employees can view their own attendance"
  ON public.attendance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = attendance.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "HR and Admins can view all attendance"
  ON public.attendance FOR SELECT
  USING (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Department heads can view their department attendance"
  ON public.attendance FOR SELECT
  USING (
    public.has_role(auth.uid(), 'department_head') AND
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = attendance.employee_id
      AND employees.department = public.get_user_department(auth.uid())
    )
  );

CREATE POLICY "HR can manage attendance"
  ON public.attendance FOR ALL
  USING (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'));

-- RLS Policies for leave_requests
CREATE POLICY "Employees can view their own leave requests"
  ON public.leave_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = leave_requests.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "Employees can create their own leave requests"
  ON public.leave_requests FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = leave_requests.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "HR and Admins can view all leave requests"
  ON public.leave_requests FOR SELECT
  USING (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Department heads can view their department leave requests"
  ON public.leave_requests FOR SELECT
  USING (
    public.has_role(auth.uid(), 'department_head') AND
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = leave_requests.employee_id
      AND employees.department = public.get_user_department(auth.uid())
    )
  );

CREATE POLICY "HR and Department heads can update leave requests"
  ON public.leave_requests FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'hr') OR 
    public.has_role(auth.uid(), 'admin') OR
    (public.has_role(auth.uid(), 'department_head') AND
     EXISTS (
       SELECT 1 FROM public.employees
       WHERE employees.id = leave_requests.employee_id
       AND employees.department = public.get_user_department(auth.uid())
     ))
  );

-- RLS Policies for performance_reviews
CREATE POLICY "Employees cannot view other employees' reviews"
  ON public.performance_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = performance_reviews.employee_id
      AND employees.user_id = auth.uid()
    )
  );

CREATE POLICY "HR and Admins can view all reviews"
  ON public.performance_reviews FOR SELECT
  USING (public.has_role(auth.uid(), 'hr') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Department heads can view their department reviews"
  ON public.performance_reviews FOR SELECT
  USING (
    public.has_role(auth.uid(), 'department_head') AND
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = performance_reviews.employee_id
      AND employees.department = public.get_user_department(auth.uid())
    )
  );

CREATE POLICY "HR and Department heads can create reviews"
  ON public.performance_reviews FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'hr') OR 
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'department_head')
  );

CREATE POLICY "HR and Department heads can update reviews"
  ON public.performance_reviews FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'hr') OR 
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'department_head')
  );

-- Create trigger function to update updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_leave_requests_updated_at
  BEFORE UPDATE ON public.leave_requests
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER update_performance_reviews_updated_at
  BEFORE UPDATE ON public.performance_reviews
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Create function to automatically create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();