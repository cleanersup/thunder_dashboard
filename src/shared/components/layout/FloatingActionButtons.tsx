import { useNavigate } from "react-router-dom";
import { FileText, Route, Receipt, UserPlus, Users, Calendar, Clock, MapPin } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface FloatingActionButtonsProps {
  isOpen: boolean;
  onClose: () => void;
}

const ACTION_OPTIONS = [
  { icon: Receipt, label: "Create Estimate", path: "/create-estimate", color: "bg-blue-500" },
  { icon: Route, label: "Create Route", path: "/create-route", color: "bg-green-500" },
  { icon: FileText, label: "Create Invoice", path: "/create-invoice", color: "bg-orange-500" },
  { icon: Users, label: "CRM", path: "/crm", color: "bg-indigo-500" },
  { icon: Calendar, label: "Booking", path: "/booking", color: "bg-pink-500" },
  { icon: UserPlus, label: "Employees", path: "/employees", color: "bg-purple-500" },
  { icon: Clock, label: "Time Clock", path: "/time-clock", color: "bg-teal-500" },
  { icon: MapPin, label: "Smart Map", path: "/smart-map", color: "bg-cyan-500" },
] as const;

/**
 * Floating radial action menu for mobile — appears above the BottomNav.
 * Navigates to quick-create routes on item selection.
 *
 * @param isOpen - Whether the menu is visible
 * @param onClose - Callback to close the menu
 */
export function FloatingActionButtons({ isOpen, onClose }: FloatingActionButtonsProps) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleClick = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed bottom-24 right-4 z-50">
        <div className="flex flex-col gap-2 items-end">
          {ACTION_OPTIONS.map((option, index) => {
            const Icon = option.icon;
            return (
              <div
                key={option.label}
                className="flex items-center gap-3"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <span
                  onClick={() => handleClick(option.path)}
                  className={`text-sm font-medium px-3 py-2 rounded-[15px] shadow-lg whitespace-nowrap text-white cursor-pointer hover:opacity-90 ${option.color}`}
                >
                  {option.label}
                </span>
                <Button
                  onClick={() => handleClick(option.path)}
                  size="icon"
                  className={`h-12 w-12 rounded-full shadow-lg hover:opacity-90 border border-white ${option.color}`}
                >
                  <Icon className="h-5 w-5 text-white" />
                </Button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
