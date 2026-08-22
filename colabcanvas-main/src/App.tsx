import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { DeviceLayout } from "@/components/mobile/DeviceLayout";
import { MobileEditorGate } from "@/components/mobile/MobileEditorGate";
import { MobileCanvasViewer } from "@/components/canvas/MobileCanvasViewer";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { OnboardingRoute } from "@/components/OnboardingRoute";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { PageLoader } from "@/components/ui/PageLoader";
import { TourProvider } from "@/components/tour/TourProvider";
import { AiAccessProvider } from "@/contexts/AiAccessContext";

// Eagerly loaded routes (critical path)
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";


// Lazy loaded routes (heavy pages)
const Dashboard = lazy(() => import("./pages/Dashboard"));

// Eagerly loaded (primary workspace — avoid skeleton on every visit)
import Canvas from "./pages/Canvas";
const WorkflowCanvas = lazy(() => import("./pages/WorkflowCanvas"));
const WorkflowMarketplace = lazy(() => import("./pages/WorkflowMarketplace"));
const CovexLanding = lazy(() => import("./pages/CovexLanding"));
const Settings = lazy(() => import("./pages/Settings"));
const Pricing = lazy(() => import("./pages/Pricing"));
const PaymentCallback = lazy(() => import("./pages/PaymentCallback"));
const Admin = lazy(() => import("./pages/Admin"));
const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/TermsOfService"));
const HelpCenter = lazy(() => import("./pages/HelpCenter"));
const Feedback = lazy(() => import("./pages/Feedback"));
const Community = lazy(() => import("./pages/Community"));
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Verify = lazy(() => import("./pages/Verify"));
const UploadEmailAssets = lazy(() => import("./pages/UploadEmailAssets"));
const Brands = lazy(() => import("./pages/Brands"));
const BrandDetail = lazy(() => import("./pages/BrandDetail"));
const SharedBrand = lazy(() => import("./pages/SharedBrand"));
const CosmoPresentation = lazy(() => import("./pages/CosmoPresentation"));
const CosmoLanding = lazy(() => import("./pages/CosmoLanding"));
const PresentationView = lazy(() => import("./pages/PresentationView"));
const Think = lazy(() => import("./pages/Think"));
const CogentLanding = lazy(() => import("./pages/CogentLanding"));
const Referral = lazy(() => import("./pages/Referral"));
const JoinProject = lazy(() => import("./pages/JoinProject"));
const JoinWorkflow = lazy(() => import("./pages/JoinWorkflow"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const WebsitePreview = lazy(() => import("./pages/WebsitePreview"));
const PublishedLandingPage = lazy(() => import("./pages/PublishedLandingPage"));
const SocialOAuthCallback = lazy(() => import("./pages/SocialOAuthCallback"));
const Talent = lazy(() => import("./pages/Talent"));
const TalentIntake = lazy(() => import("./pages/TalentIntake"));
const TalentProject = lazy(() => import("./pages/TalentProject"));
const TalentConfirm = lazy(() => import("./pages/TalentConfirm"));
const TalentPayment = lazy(() => import("./pages/TalentPayment"));
const Unsubscribe = lazy(() => import("./pages/Unsubscribe"));
import { TalentRouteGuard } from "./components/talent/TalentRouteGuard";

// Optimized QueryClient with better caching
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 minute
      gcTime: 5 * 60_000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => {
  const reduceMotion = useReduceMotion();
  
  useEffect(() => {
    if (reduceMotion) {
      document.body.classList.add('reduce-motion');
    } else {
      document.body.classList.remove('reduce-motion');
    }
  }, [reduceMotion]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AuthProvider>
              <TourProvider>
                <AiAccessProvider>
                <Suspense fallback={<PageLoader />}>
                  <Routes>
                    {/* Critical routes - eagerly loaded */}
                    <Route path="/" element={<Index />} />
                    <Route path="/auth" element={<Auth />} />
                    {/* Shared layout routes — desktop AppLayout or MobileShell depending on device */}
                    <Route element={<DeviceLayout />}>
                      <Route path="/dashboard" element={<OnboardingRoute><Dashboard /></OnboardingRoute>} />
                      <Route path="/brands" element={<OnboardingRoute><Brands /></OnboardingRoute>} />
                      <Route path="/cogent" element={<OnboardingRoute><CogentLanding /></OnboardingRoute>} />
                      <Route path="/cogent/chat" element={<OnboardingRoute><Think /></OnboardingRoute>} />
                      <Route path="/talent" element={<OnboardingRoute><Talent /></OnboardingRoute>} />
                      <Route path="/talent/new" element={<OnboardingRoute><TalentRouteGuard requires="client"><TalentIntake /></TalentRouteGuard></OnboardingRoute>} />
                      <Route path="/talent/projects/:id" element={<OnboardingRoute><TalentRouteGuard requires="any"><TalentProject /></TalentRouteGuard></OnboardingRoute>} />
                      <Route path="/talent/projects/:id/confirm" element={<OnboardingRoute><TalentRouteGuard requires="client"><TalentConfirm /></TalentRouteGuard></OnboardingRoute>} />
                      <Route path="/talent/projects/:id/pay" element={<OnboardingRoute><TalentRouteGuard requires="client"><TalentPayment /></TalentRouteGuard></OnboardingRoute>} />
                      <Route path="/referral" element={<OnboardingRoute><Referral /></OnboardingRoute>} />
                      <Route path="/covex" element={<OnboardingRoute><CovexLanding /></OnboardingRoute>} />
                      <Route path="/cosmo" element={<OnboardingRoute><CosmoLanding /></OnboardingRoute>} />
                    </Route>

                    {/* Legacy Think → Cogent redirects */}
                    <Route path="/think" element={<Navigate to="/cogent" replace />} />
                    <Route path="/think/chat" element={<Navigate to="/cogent/chat" replace />} />

                    {/* Cosmo editor — full-page layout (desktop only) */}
                    <Route path="/cosmo/editor" element={<OnboardingRoute><MobileEditorGate toolName="The Cosmo editor"><CosmoPresentation /></MobileEditorGate></OnboardingRoute>} />
                    <Route path="/cosmo/view/:shareToken" element={<PresentationView />} />
                    
                    {/* Lazy loaded routes */}
                    <Route path="/verify" element={<Verify />} />
                    <Route path="/onboarding" element={<Onboarding />} />
                    <Route path="/canvas" element={<OnboardingRoute><MobileEditorGate toolName="Canvas" mobileFallback={<MobileCanvasViewer />}><Canvas /></MobileEditorGate></OnboardingRoute>} />
                    {/* Site preview is intentionally NOT wrapped in OnboardingRoute — it must render
                        landing-page content even inside iframes / unauthenticated contexts.
                        Auth/access is handled inside WebsitePreview itself. */}
                    <Route path="/site-preview" element={<WebsitePreview />} />
                    {/* Public published landing pages — no auth required */}
                    <Route path="/l/:slug" element={<PublishedLandingPage />} />
                    <Route path="/workflow" element={<Navigate to="/covex" replace />} />
                    <Route path="/workflow/marketplace" element={<Navigate to="/covex/marketplace" replace />} />
                    <Route path="/covex/editor" element={<OnboardingRoute><MobileEditorGate toolName="The Covex editor"><WorkflowCanvas /></MobileEditorGate></OnboardingRoute>} />
                    <Route path="/covex/marketplace" element={<MobileEditorGate toolName="The Covex marketplace"><WorkflowMarketplace /></MobileEditorGate>} />
                    <Route path="/project/join/:shareToken" element={<JoinProject />} />
                    <Route path="/workflow/join/:shareToken" element={<JoinWorkflow />} />
                    <Route path="/covex/join/:shareToken" element={<JoinWorkflow />} />
                    <Route path="/settings" element={<OnboardingRoute><Settings /></OnboardingRoute>} />
                    <Route path="/brands/shared/:shareToken" element={<SharedBrand />} />
                    <Route path="/brands/:brandSlug" element={<OnboardingRoute><BrandDetail /></OnboardingRoute>} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/payment/callback" element={<PaymentCallback />} />
                    <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><MobileEditorGate toolName="The admin console"><Admin /></MobileEditorGate></ProtectedRoute>} />
                    <Route path="/privacy" element={<PrivacyPolicy />} />
                    <Route path="/terms" element={<TermsOfService />} />
                    <Route path="/help" element={<HelpCenter />} />
                    <Route path="/feedback" element={<Feedback />} />
                    <Route path="/community" element={<Community />} />
                    <Route path="/upload-email-assets" element={<UploadEmailAssets />} />
                    <Route path="/oauth/social/callback" element={<SocialOAuthCallback />} />
                    <Route path="/reset-password" element={<ResetPassword />} />
                    <Route path="/unsubscribe" element={<Unsubscribe />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </Suspense>
                </AiAccessProvider>
              </TourProvider>
            </AuthProvider>
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
