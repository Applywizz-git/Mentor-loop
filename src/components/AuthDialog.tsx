"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Login from "@/pages/Login"; // single component handles both modes

interface AuthDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirectTo?: string; // optional: where to go after login/signup
}

/**
 * AuthDialog - modal popup for login/signup using the single Login component.
 * We render Login twice with different initialMode so tabs work as expected.
 */
export default function AuthDialog({ open, onOpenChange, redirectTo }: AuthDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-semibold">
            Login / Sign Up
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="login" className="mt-4">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-4">
            {/* Use the same Login component with initialMode="signin" */}
            <Login initialMode="signin" redirectTo={redirectTo} />
          </TabsContent>

          <TabsContent value="signup" className="mt-4">
            {/* Use the same Login component with initialMode="signup" */}
            <Login initialMode="signup" redirectTo={redirectTo} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
