// import { useState } from "react";
// import { LogOut, Settings, User } from "lucide-react";
// import { Button } from "./button";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "./dropdown-menu";
// import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
// import { useNavigate } from "react-router-dom";
// import { getCurrentUser, logout } from "@/lib/data";

// export const UserMenu = () => {
//   const navigate = useNavigate();
//   const user = getCurrentUser();

//   if (!user) return null;

//   const handleLogout = () => {
//     logout();
//     navigate('/');
//   };

//   const getInitials = (name: string) => {
//     return name
//       .split(' ')
//       .map(n => n[0])
//       .join('')
//       .toUpperCase();
//   };

//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <Button variant="ghost" className="relative h-10 w-10 rounded-full">
//           <Avatar className="h-10 w-10">
//             <AvatarImage src={user.avatar} alt={user.name} />
//             <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
//           </Avatar>
//         </Button>
//       </DropdownMenuTrigger>
//       <DropdownMenuContent className="w-56" align="end" forceMount>
//         <div className="flex items-center justify-start gap-2 p-2">
//           <div className="flex flex-col space-y-1 leading-none">
//             <p className="font-medium">{user.name}</p>
//             <p className="w-[200px] truncate text-sm text-muted-foreground">
//               {user.email}
//             </p>
//           </div>
//         </div>
//         <DropdownMenuSeparator />
//         <DropdownMenuItem onClick={() => navigate('/profile')}>
//           <User className="mr-2 h-4 w-4" />
//           Update Profile
//         </DropdownMenuItem>
//         <DropdownMenuItem onClick={() => navigate('/profile/password')}>
//           <Settings className="mr-2 h-4 w-4" />
//           Update Password
//         </DropdownMenuItem>
//         <DropdownMenuSeparator />
//         <DropdownMenuItem onClick={handleLogout}>
//           <LogOut className="mr-2 h-4 w-4" />
//           Logout
//         </DropdownMenuItem>
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// };   
// src/components/ui/user-menu.tsx
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Settings, User as UserIcon, LayoutDashboard } from "lucide-react";
import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { logoutAndGo } from "@/lib/auth";

// ⬇️ NEW: read current user + mentor approval status
import { supabase } from "@/lib/supabase";
import { getMentorApprovalStatus } from "@/lib/data";

type UserMenuProps = { onLogout?: () => void; name?: string; email?: string; avatar?: string };

export const UserMenu: React.FC<UserMenuProps> = ({ onLogout, name = "User", email = "", avatar = "" }) => {
  const navigate = useNavigate();

  const [mentorStatus, setMentorStatus] = React.useState<"none" | "pending" | "approved" | "rejected">("none");

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) {
        if (mounted) setMentorStatus("none");
        return;
      }
      try {
        const s = await getMentorApprovalStatus(uid);
        if (!mounted) return;
        setMentorStatus(s.approved ? "approved" : ((s.application_status as any) ?? "none"));
      } catch {
        if (mounted) setMentorStatus("none");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = React.useCallback(() => {
    if (onLogout) return onLogout();
    logoutAndGo("/"); // hard reload
  }, [onLogout]);

  const initials =
    (name || "U")
      .split(/\s+/)
      .map((s) => s[0]?.toUpperCase() || "")
      .join("")
      .slice(0, 2) || "U";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          <Avatar className="h-10 w-10">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end" forceMount>
        <div className="flex items-center gap-2 p-2">
          <div className="flex flex-col">
            <p className="font-medium">{name}</p>
            <p className="w-[200px] truncate text-sm text-muted-foreground">{email}</p>
          </div>
          {/* ⬇️ NEW: tiny status pill */}
          {mentorStatus === "approved" && (
            <span className="ml-auto rounded-full bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5">Mentor</span>
          )}
          {mentorStatus === "pending" && (
            <span className="ml-auto rounded-full bg-amber-100 text-amber-700 text-xs px-2 py-0.5">
              Approve Pending
            </span>
          )}
        </div>

        <DropdownMenuSeparator />

        {/* ⬇️ NEW: Mentor dashboard quick link if approved; show disabled row if pending */}
        {mentorStatus === "approved" ? (
          <DropdownMenuItem onSelect={() => navigate("/mentor")}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            Mentor Dashboard
          </DropdownMenuItem>
        ) : mentorStatus === "pending" ? (
          <div className="px-2 py-1.5 text-sm text-muted-foreground cursor-default select-none">
            Approval pending
          </div>
        ) : null}

        {mentorStatus !== "none" && <DropdownMenuSeparator />}

        <DropdownMenuItem onSelect={() => navigate("/profile")}>
          <UserIcon className="mr-2 h-4 w-4" />
          Update Profile
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => navigate("/profile/password")}>
          <Settings className="mr-2 h-4 w-4" />
          Update Password
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          // Use onSelect only
          onSelect={(e) => {
            e.preventDefault();
            handleLogout();
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
