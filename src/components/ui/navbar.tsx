import * as React from "react";
import { Link } from "react-router-dom";
import { Button } from "./button";
import { UserMenu } from "./user-menu";
import { useAuthUser } from "@/hooks/useAuthUser";
import { logoutAndGo } from "@/lib/auth";
import logo from "@/assets/applywizz-logo.png";

// ⬇️ helper to read mentor approval state (added in Step 2)
import { getMentorApprovalStatus } from "@/lib/data";
import NotificationsBell from "@/components/NotificationBell"; // Correct import for NotificationsBell component

interface NavbarProps {
  unreadCount: number;  // Add unreadCount prop for the notification bell
}

export const Navbar: React.FC<NavbarProps> = ({ unreadCount }) => {
  const { user, profile, loading } = useAuthUser();

  const isLoggedIn = !!user?.id;
  const rawRole = profile?.role ?? "";

  // ⬇️ fetch mentor approval state so we can show "Approve Pending"
  const [mentorStatus, setMentorStatus] = React.useState<"none" | "pending" | "approved" | "rejected">("none");

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      if (!user?.id) {
        if (mounted) setMentorStatus("none");
        return;
      }
      try {
        const s = await getMentorApprovalStatus(user.id);
        if (!mounted) return;
        if (s.approved) setMentorStatus("approved");
        else setMentorStatus((s.application_status as any) ?? "none");
      } catch {
        if (mounted) setMentorStatus("none");
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.id]);

  // ✅ Treat mentor roles explicitly; clients will never see pending pill
  const isMentorRole = rawRole === "mentor" || rawRole === "mentor_pending";
  const isMentorApproved = isMentorRole && mentorStatus === "approved";
  const showPendingPill = isLoggedIn && isMentorRole && mentorStatus === "pending";

  const isAdmin = rawRole === "admin";
  // ✅ NEW: identify clients (logged-in, not mentor, not admin)
  const isClient = isLoggedIn && !isMentorRole && !isAdmin;

  const handleLogout = React.useCallback(() => {
    logoutAndGo("/"); // hard reload to home on logout
  }, []);

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-white border-b border-border">
      <Link to="/" className="flex items-center gap-3">
        <img src={logo} alt="ApplyWizz" className="h-8 w-auto" />
        <span className="text-xl font-bold text-foreground">APPLY WIZZ</span>
      </Link>

      <div className="hidden md:flex items-center gap-8">
        {isMentorApproved ? (
          <Link
            to="/mentor"
            className="text-foreground hover:text-primary transition-colors"
          >
            Mentor Dashboard
          </Link>
        ) : (
          <>
            <Link
              to="/mentors"
              className="text-foreground hover:text-primary transition-colors"
            >
              Find Mentors
            </Link>
            <Link
              to="/how-it-works"
              className="text-foreground hover:text-primary transition-colors"
            >
              How it Works
            </Link>
            {isClient ? (
              <Link
                to="/sessions"
                className="text-foreground hover:text-primary transition-colors"
              >
                Sessions
              </Link>
            ) : (
              <Link
                to="/become-mentor"
                className="text-foreground hover:text-primary transition-colors"
              >
                Become a Mentor
              </Link>
            )}
          </>
        )}
        {isAdmin && (
          <Link
            to="/admin"
            className="text-foreground hover:text-primary transition-colors"
          >
            Admin
          </Link>
        )}
      </div>

      <div className="flex items-center gap-4">
        {/* ✅ Only mentors-in-process see this; clients never do */}
        {showPendingPill && (
          <Link
            to="/mentor"
            className="hidden md:inline-flex rounded-full bg-amber-100 text-amber-700 text-xs px-3 py-1 font-medium"
            title="Your mentor application is pending approval"
          >
            Approval Pending
          </Link>
        )}

        {/* Notification Bell Icon */}
        {isLoggedIn && (
          <div className="relative">
            <NotificationsBell unreadCount={unreadCount} /> {/* Pass unreadCount here */}
          </div>
        )}

        {loading ? (
          <>
            <Link to="/login">
              <Button variant="ghost" className="text-foreground">
                Login
              </Button>
            </Link>
            <Link to="/login">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Get Started
              </Button>
            </Link>
          </>
        ) : isLoggedIn ? (
          <UserMenu
            onLogout={handleLogout}
            name={profile?.name ?? user?.email ?? "User"}
            email={profile?.email ?? user?.email ?? ""}
            avatar={profile?.avatar ?? ""}
          />
        ) : (
          <>
            <Link to="/login">
              <Button variant="ghost" className="text-foreground">
                Login
              </Button>
            </Link>
            <Link to="/login">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Get Started
              </Button>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
};
