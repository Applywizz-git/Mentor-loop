import React from "react";

// Define the prop type for NotificationsBell
interface NotificationsBellProps {
  unreadCount: number; // The unreadCount prop type should be a number
}

const NotificationsBell: React.FC<NotificationsBellProps> = ({ unreadCount }) => {
  return (
    <div className="relative">
      <span className="text-gray-600">🔔</span>
      {unreadCount > 0 && (
        <span className="absolute top-0 right-0 text-xs text-white bg-red-500 rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </div>
  );
};

export default NotificationsBell;
