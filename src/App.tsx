// import { Toaster } from "@/components/ui/toaster";
// import { Toaster as Sonner } from "@/components/ui/sonner";
// import { TooltipProvider } from "@/components/ui/tooltip";
// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import Landing from "./pages/Landing";
// import Login from "./pages/Login";
// import ClientDashboard from "./pages/ClientDashboard";
// import MentorProfile from "./pages/MentorProfile";
// import MentorDashboard from "./pages/MentorDashboard";
// import BecomeAMentor from "./pages/BecomeAMentor";
// import HowItWorks from "./pages/HowItWorks";
// import TermsOfService from "./pages/TermsOfService";
// import PrivacyPolicy from "./pages/PrivacyPolicy";
// import AdminDashboard from "./pages/AdminDashboard";
// import Profile from "./pages/Profile";
// import UpdatePassword from "./pages/UpdatePassword";
// import NotFound from "./pages/NotFound";
// import { seedDemoData } from "@/lib/data";
// seedDemoData();


// const queryClient = new QueryClient();

// const App = () => (
//   <QueryClientProvider client={queryClient}>
//     <TooltipProvider>
//       <Toaster />
//       <Sonner />
//       <BrowserRouter>
//         <Routes>
//           <Route path="/" element={<Landing />} />
//           <Route path="/login" element={<Login />} />
//           <Route path="/mentors" element={<ClientDashboard />} />
//           <Route path="/mentor/:id" element={<MentorProfile />} />
//           <Route path="/dashboard/mentor" element={<MentorDashboard />} />
//           <Route path="/become-mentor" element={<BecomeAMentor />} />
//           <Route path="/how-it-works" element={<HowItWorks />} />
//           <Route path="/terms-of-service" element={<TermsOfService />} />
//           <Route path="/privacy-policy" element={<PrivacyPolicy />} />
//           <Route path="/admin" element={<AdminDashboard />} />
//           <Route path="/admin/mentors/:id" element={<MentorProfile />} />
//           <Route path="/admin/onboarding" element={<BecomeAMentor />} />
//           <Route path="/profile" element={<Profile />} />
//           <Route path="/profile/password" element={<UpdatePassword />} />
//           {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
//           <Route path="*" element={<NotFound />} />
//         </Routes>
//       </BrowserRouter>
//     </TooltipProvider>
//   </QueryClientProvider>
// );

// export default App;

import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import ClientDashboard from "./pages/ClientDashboard";
import MentorProfile from "./pages/MentorProfile";
import MentorDashboard from "./pages/MentorDashboard";
import BecomeAMentor from "./pages/BecomeAMentor";
import HowItWorks from "./pages/HowItWorks";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import AdminDashboard from "./pages/AdminDashboard";
import Profile from "./pages/Profile";
import UpdatePassword from "./pages/UpdatePassword";
import NotFound from "./pages/NotFound";

import Complete from "./pages/Complete";
import Verify from "./pages/Verify";
import RequireAuth from "@/RequireAuth";
 import BookPage from "@/pages/BookPage";
 import SetPassword from "@/pages/SetPassword";
import SessionsPage from "@/pages/SessionsPage";



const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth/verify" element={<Verify />} />
          <Route path="/auth/complete" element={<Complete />} />
          <Route path="/login" element={<Login />} />
          
          <Route path="/mentors" element={<ClientDashboard />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/mentor/:id" element={<MentorProfile />} />
          <Route path="/dashboard/mentor" element={<MentorDashboard />} />
          <Route path="/become-mentor" element={<BecomeAMentor />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/terms-of-service" element={<TermsOfService />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/admin/mentors/:id" element={<MentorProfile />} />
          <Route path="/admin/onboarding" element={<BecomeAMentor />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/profile/password" element={<UpdatePassword />} />
          <Route
                path="/book"
                element={
                  <RequireAuth>
                  <BookPage />
                  </RequireAuth>
                }
              />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
