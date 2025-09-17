// import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
// import { Button } from "./button";
// import { CheckCircle } from "lucide-react";
// import { Mentor, TimeSlot } from "@/lib/types";
// import { format } from "date-fns";

// interface BookingConfirmationProps {
//   open: boolean;
//   onOpenChange: (open: boolean) => void;
//   mentor: Mentor;
//   slot: TimeSlot;
//   bookingId: string;
//   mentorName?: string;
// }

// export const BookingConfirmation = ({ 
//   open, 
//   onOpenChange, 
//   mentor, 
//   slot, 
//   bookingId 
// }: BookingConfirmationProps) => {
//   const startTime = new Date(slot.startIso);
//   const endTime = new Date(slot.endIso);

//   return (
//     <Dialog open={open} onOpenChange={onOpenChange}>
//       <DialogContent className="sm:max-w-[425px] text-center">
//         <DialogHeader>
//           <div className="flex justify-center mb-4">
//             <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
//               <CheckCircle className="w-8 h-8 text-green-600" />
//             </div>
//           </div>
//           <DialogTitle className="text-2xl font-bold text-green-600">
//             Booking Confirmed ✅
//           </DialogTitle>
//         </DialogHeader>
        
//         <div className="space-y-4 py-4">
//           <div className="bg-gray-50 p-4 rounded-lg space-y-2">
//             <h3 className="font-semibold text-lg">Booking Summary</h3>
            
//             <div className="space-y-1 text-sm">
//               <div className="flex justify-between">
//                 <span className="text-muted-foreground">Mentor:</span>
//                 <span className="font-medium">{mentor.name}</span>
//               </div>
              
//               <div className="flex justify-between">
//                 <span className="text-muted-foreground">Date:</span>
//                 <span className="font-medium">{format(startTime, 'EEEE, MMMM do, yyyy')}</span>
//               </div>
              
//               <div className="flex justify-between">
//                 <span className="text-muted-foreground">Time:</span>
//                 <span className="font-medium">
//                   {format(startTime, 'h:mm a')} - {format(endTime, 'h:mm a')}
//                 </span>
//               </div>
              
//               <div className="flex justify-between">
//                 <span className="text-muted-foreground">Duration:</span>
//                 <span className="font-medium">45 minutes</span>
//               </div>
              
//               <div className="flex justify-between">
//                 <span className="text-muted-foreground">Booking ID:</span>
//                 <span className="font-medium font-mono text-xs">{bookingId}</span>
//               </div>
//             </div>
//           </div>
          
//           <p className="text-sm text-muted-foreground">
//             You'll receive a confirmation email with the meeting details shortly.
//           </p>
//         </div>
        
//         <Button onClick={() => onOpenChange(false)} className="w-full">
//           Close
//         </Button>
//       </DialogContent>
//     </Dialog>
//   );
// };   

// src/components/ui/booking-confirmation.tsx
import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./dialog";
import { Button } from "./button";
import { CheckCircle } from "lucide-react";
import { Mentor, TimeSlot } from "@/lib/types";
import { format } from "date-fns";

interface BookingConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  // Post-booking (your existing case)
  mentor?: Mentor;
  slot?: TimeSlot;
  bookingId?: string;

  // Pre-booking (for booking-widget usage)
  mentorName?: string;
  time?: string;
  onConfirm?: () => void | Promise<void>;
  loading?: boolean;
}

export const BookingConfirmation = ({
  open,
  onOpenChange,
  mentor,
  slot,
  bookingId,
  mentorName,
  time,
  onConfirm,
  loading = false,
}: BookingConfirmationProps) => {
  // If onConfirm is provided, render a pre-booking confirm dialog
  const isPreConfirm = typeof onConfirm === "function";

  if (isPreConfirm) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Confirm your booking</DialogTitle>
            <DialogDescription>
              {mentorName ? (
                <>
                  You’re booking a session with <b>{mentorName}</b>.
                </>
              ) : (
                <>Please confirm your session details.</>
              )}
              {time ? (
                <>
                  {" "}
                  Selected time: <b>{time}</b>.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="button" onClick={onConfirm} disabled={loading}>
              {loading ? "Booking..." : "Confirm"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Otherwise, render your original post-booking success summary
  const startTime = slot ? new Date(slot.startIso) : null;
  const endTime = slot ? new Date(slot.endIso) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] text-center">
        <DialogHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <DialogTitle className="text-2xl font-bold text-green-600">
            Booking Confirmed ✅
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold text-lg">Booking Summary</h3>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mentor:</span>
                <span className="font-medium">{mentor?.name ?? "-"}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">
                  {startTime ? format(startTime, "EEEE, MMMM do, yyyy") : "-"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Time:</span>
                <span className="font-medium">
                  {startTime && endTime
                    ? `${format(startTime, "h:mm a")} - ${format(endTime, "h:mm a")}`
                    : "-"}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration:</span>
                <span className="font-medium">45 minutes</span>
              </div>

              <div className="flex justify-between">
                <span className="text-muted-foreground">Booking ID:</span>
                <span className="font-medium font-mono text-xs">
                  {bookingId ?? "-"}
                </span>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            You'll receive a confirmation email with the meeting details shortly.
          </p>
        </div>

        <Button onClick={() => onOpenChange(false)} className="w-full">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  );
};

export default BookingConfirmation;
