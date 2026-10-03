import { Suspense, lazy } from "react";
import { Routes, Route, Outlet, Navigate } from "react-router-dom";
import Loading   from "./frontend/client/components/Spinner";
import AuthGuard from "./routes/AuthGuard";
import { AdminAuthProvider } from "./frontend/deshbord/Admin/AdminAuthContext";
import { useAuth } from "./context/AuthContext";
import GuestGuard from './routes/GuestGuard';

import {
  RequireAuth,
  RequireOnboarded,
  OnboardingRoute,
} from "./guards/RouteGuards";

/* ═══════════════════════════════════════════════════════════════
   LAZY PAGES — grouped by access level
═══════════════════════════════════════════════════════════════ */

// ── Public marketing (no auth) ────────────────────────────────────
const PublicLayout  = lazy(() => import("./PublicLayout"));
const MainPage      = lazy(() => import("./frontend/client/components/LandingPage"));
const AboutPage     = lazy(() => import("./frontend/client/components/AboutPage"));
const PrivacyPage   = lazy(() => import("./frontend/client/components/PrivacyPage"));
const TermsPage     = lazy(() => import("./frontend/client/components/TermsPage"));
const ChangelogPage = lazy(() => import("./frontend/client/components/ChangelogPage"));
const ContactPage   = lazy(() => import("./frontend/client/components/ContactPage"));
const DeveloperGuide = lazy(() => import("./frontend/client/components/DeveloperGuide"));
const DocsPage = lazy(() => import("./frontend/client/components/DocsPage"));
// ── Auth pages (standalone — full-screen, no marketing chrome) ───
const Register    = lazy(() => import("./frontend/client/components/Register"));
const EmailVerify = lazy(() => import("./frontend/client/components/EmailVerify"));
const Login       = lazy(() => import("./frontend/client/components/Login"));
const ForgotPassword = lazy(() => import("./frontend/client/components/ForgotPassword"));
const ResetPassword  = lazy(() => import("./frontend/client/components/ResetPassword"));

// ── Onboarding (logged in, not yet onboarded) ────────────────────
const OnboardingPage = lazy(() => import("./frontend/client/components/OnboardingPage"));

// ── Company app — business tools (login + onboarded required) ────
const UserLayout    = lazy(() => import("./UserLayout"));
const Main          = lazy(() => import("./frontend/client/components/Main"));
const SetTarget     = lazy(() => import("./frontend/client/components/SetTarget"));
const ViewGoal      = lazy(() => import("./frontend/client/components/ViewGoal"));
const EditGoal      = lazy(() => import("./frontend/client/components/EditGoal"));
const Employee      = lazy(() => import("./frontend/client/components/Employee"));
const AddProducts   = lazy(() => import("./frontend/client/components/AddProducts"));
const ViewProduct   = lazy(() => import("./frontend/client/components/ViewProduct"));
const EditProductCl = lazy(() => import("./frontend/client/components/EditProduct"));
const CompanyProfile = lazy(() => import("./frontend/client/components/CompanyProfile"));
const AddEmployee = lazy(() => import("./frontend/client/components/AddEmployee"));
const Support = lazy(() => import("./frontend/client/components/Support"));
const Billing = lazy(() => import("./frontend/client/components/Billing"));
// ── Storefront — customer-facing pages (public by design) ────────
// ⚠️ DECISION POINT: these were unprotected before and stay public
// here so customer flows don't break. If they are actually
// owner-only tools, move them into the guarded block below.
const Cart        = lazy(() => import("./frontend/client/components/Cart"));
const Product     = lazy(() => import("./frontend/client/components/Product"));
const Checkout    = lazy(() => import("./frontend/client/components/Checkout"));
const Thanks      = lazy(() => import("./frontend/client/components/Thanks"));
const TrackOrder  = lazy(() => import("./frontend/client/components/TrackOrder"));
const CancelOrder = lazy(() => import("./frontend/client/components/CancelOrder"));
const ReturnOrder = lazy(() => import("./frontend/client/components/ReturnOrder"));

// ── Legacy admin dashboard (/newking) ─────────────────────────────
const DeshbordLayout    = lazy(() => import("./DeshbordLayout"));
const LoginDesh         = lazy(() => import("./frontend/deshbord/components/LoginDesh"));
const MainDesh          = lazy(() => import("./frontend/deshbord/components/MainDesh"));
const AddProduct        = lazy(() => import("./frontend/deshbord/components/AddProduct"));
const Calendar          = lazy(() => import("./frontend/deshbord/components/calender/Calendar"));
const LogoandName       = lazy(() => import("./frontend/deshbord/components/LogoandName"));
const AddSliderData     = lazy(() => import("./frontend/deshbord/components/AddSliderData"));
const MyProduct         = lazy(() => import("./frontend/deshbord/components/MyProduct"));
const EditProduct       = lazy(() => import("./frontend/deshbord/components/EditProduct"));
const AllOrder          = lazy(() => import("./frontend/deshbord/components/AllOrder"));
const CustomerContact   = lazy(() => import("./frontend/deshbord/components/CustomerContact"));
const UpdateOrderStatus = lazy(() => import("./frontend/deshbord/components/UpdateOrderStatus"));
const Campaign          = lazy(() => import("./frontend/deshbord/components/Campaign"));

// ── Shared ─────────────────────────────────────────────────────────
const NotFound = () => <div className="errPageStyle">404 Not Found</div>;
//-------------admin----------
const AdminLogin  = lazy(() => import("./frontend/deshbord/Admin/AdminLogin"));
const AdminLayout = lazy(() => import("./AdminLayout"));
const AdminHome   = lazy(() => import("./frontend/deshbord/Admin/AdminHome"));
const AdminCompanies = lazy(() => import("./frontend/deshbord/Admin/AdminCompanies"));
const AdminFeedback = lazy(() => import("./frontend/deshbord/Admin/AdminFeedback"));
const AdminAnnouncements = lazy(() => import("./frontend/deshbord/Admin/AdminAnnouncements"));
const AdminBilling = lazy(() => import("./frontend/deshbord/Admin/AdminBilling"));
const AdminContact = lazy(() => import("./frontend/deshbord/Admin/AdminContact"));
// inside <Routes>, alongside your existing route trees:
/* ═══════════════════════════════════════════════════════════════
   APP
═══════════════════════════════════════════════════════════════ */

function BillingReturn() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;   // session gone → login
  return <Navigate to={`/company/${user.companyName}/billing`} replace />;
};

function App() {

  return (
    <div className="mainContainer">
      <div className="ComponentsPr">
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/billing-return" element={<BillingReturn />} />
            {/* ══ PUBLIC — marketing pages, shared header/footer ══ */}
            <Route path="/" element={<PublicLayout />}>
              <Route index            element={<MainPage />}      />
              <Route path="about"     element={<AboutPage />}     />
              <Route path="privacy"   element={<PrivacyPage />}   />
              <Route path="terms"     element={<TermsPage />}     />
              <Route path="changelog" element={<ChangelogPage />} />
              <Route path="contact"   element={<ContactPage />}   />
              <Route path="developers" element={<DeveloperGuide />} />
              <Route path="docs" element={<DocsPage />} />
            </Route>

            {/* ══ AUTH — standalone, no layout (focused screens) ══
                Same URLs as before (/register, /login, /verifyemail).
                If you want the marketing header back on these, move
                them inside the PublicLayout block above. */}
            <Route path="/register"    element={<GuestGuard><Register /></GuestGuard>}    />
            <Route path="/verifyemail" element={<EmailVerify />} />
            <Route path="/login"       element={<GuestGuard><Login /></GuestGuard>}       />
            <Route path="/forgot-password"        element={<ForgotPassword />} />
            <Route path="/reset-password/:token"  element={<ResetPassword />} />

            {/* ══ ONBOARDING — logged in, company not yet set up ══
                OnboardingRoute bounces already-onboarded users back
                to /company/:companyName so the wizard can't re-run. */}
            <Route element={<RequireAuth />}>
              <Route element={<OnboardingRoute />}>
                <Route path="/onboarding" element={<OnboardingPage />} />
              </Route>
            </Route>

{/* ══ COMPANY AREA ══ */}
<Route path="/company/:companyName" element={<UserLayout />}>

  {/* ── Public storefront (customers, NOT employees) ─────────────
       These are the buy-side pages. No employee-role guard — a
       customer browsing/checking out is not a logged-in employee. */}
  <Route path="cart"                element={<Cart />}        />
  <Route path="product/:productId"  element={<Product />}     />
  <Route path="checkout"            element={<Checkout />}    />
  <Route path="thanks"              element={<Thanks />}      />
  <Route path="trackorder"          element={<TrackOrder />}  />
  <Route path="cancelorder"         element={<CancelOrder />} />
  <Route path="returnorder"         element={<ReturnOrder />} />
  <Route path="addemployee"         element={<AddEmployee />} />
  <Route path="support"             element={<Support />} />

  {/* Billing — owner/finance only */}
  <Route path="billing" element={
    <AuthGuard requirePermission="manageBilling"><Billing /></AuthGuard>
  } />

  {/* ── Business tools — SECURED ─────────────────────────────────
       1. RequireAuth      → logged in
       2. RequireOnboarded → company completed the wizard
       3. AuthGuard        → per-page permission (see each route) */}
  <Route element={<RequireAuth />}>
    <Route element={<RequireOnboarded />}>

      {/* Dashboard (index).
          ⚠️ Do NOT gate this with requirePermission="viewFinancials".
          If you did, a staff member landing here would be redirected
          to this same page → infinite loop. Instead, leave the route
          open and hide the FINANCIAL widgets INSIDE <Main/> with
          {can(user.employeeRoal, "viewFinancials") && <Charts/>}.
          Every role can reach the dashboard; they just see different
          things on it. */}
      <Route index element={
        <AuthGuard>
          <Main />
        </AuthGuard>
      } />

      {/* Goals */}
      <Route path="creategoal" element={
        <AuthGuard requirePermission="manageProducts"><SetTarget /></AuthGuard>
      } />
      <Route path="viewgoal/:goalId" element={
        <AuthGuard requirePermission="viewFinancials"><ViewGoal /></AuthGuard>
      } />
      <Route path="updategoal/:goalId" element={
        <AuthGuard requirePermission="manageProducts"><EditGoal /></AuthGuard>
      } />

      {/* Team */}
      <Route path="theemployee/:employeeId" element={
        <AuthGuard requirePermission="manageTeam"><Employee /></AuthGuard>
      } />

      {/* Products — creating/editing needs manageProducts;
          viewing the catalog is open to all employees (matches the
          backend read routes). */}
      <Route path="addproduct" element={
        <AuthGuard requirePermission="manageProducts"><AddProducts /></AuthGuard>
      } />
      <Route path="viewproduct/:productId" element={
        <AuthGuard><ViewProduct /></AuthGuard>
      } />
      <Route path="editproduct/:productId" element={
        <AuthGuard requirePermission="manageProducts"><EditProductCl /></AuthGuard>
      } />

      {/* Company settings */}
      <Route path="settings" element={
        <AuthGuard requirePermission="manageSettings"><CompanyProfile /></AuthGuard>
      } />

    </Route>
  </Route>

  {/* Unknown /company/:name/* paths */}
  <Route path="*" element={<NotFound />} />
</Route>
            {/* ══ LEGACY ADMIN DASHBOARD — unchanged ══
                ⚠️ This has its own login (LoginDesh) but the child
                routes are not route-guarded. If this dashboard is
                still in use, consider wrapping its children in a
                guard too; if it's dead code, plan its removal. */}
            <Route path="/newking" element={<DeshbordLayout />}>
              <Route index                       element={<LoginDesh />}         />
              <Route path="deshbord"             element={<MainDesh />}          />
              <Route path="addproduct"           element={<AddProduct />}        />
              <Route path="calender"             element={<Calendar />}          />
              <Route path="changelogoandname"    element={<LogoandName />}       />
              <Route path="addsliderdata"        element={<AddSliderData />}     />
              <Route path="mycurrentproducts"    element={<MyProduct />}         />
              <Route path="editproduct/:productId" element={<EditProduct />}     />
              <Route path="orderstatus"          element={<AllOrder />}          />
              <Route path="messages"             element={<CustomerContact />}   />
              <Route path="confirmorder"         element={<UpdateOrderStatus />} />
              <Route path="campaign"             element={<Campaign />}          />
            </Route>

            <Route element={<AdminAuthProvider><Outlet /></AdminAuthProvider>}>
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminHome />} />
                <Route path="companies" element={<AdminCompanies />} />
                <Route path="feedback" element={<AdminFeedback />} />
                <Route path="announcements" element={<AdminAnnouncements />} />
                <Route path="billing" element={<AdminBilling />} />
                <Route path="contact" element={<AdminContact />} />
              </Route>
            </Route>

            {/* ══ GLOBAL 404 — catches everything else ══
                Your old file had no root catch-all, so unknown URLs
                like /foo rendered a blank screen. */}
            <Route path="*" element={<NotFound />} />

          </Routes>
        </Suspense>
      </div>
    </div>
  );
}

export default App;
