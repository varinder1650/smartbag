import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

const statusConfig = {
  pending: {
    label: "Pending",
    className: "bg-status-pending text-white",
  },
  confirmed: {
    label: "Confirmed", 
    className: "bg-status-confirmed text-white",
  },
  preparing: {
    label: "Preparing",
    className: "bg-status-preparing text-white",
  },
  prepared: {
    label: "Prepared",
    className: "bg-status-prepared text-white",
  },
  out_for_delivery: {
    label: "Out for Delivery",
    className: "bg-status-delivery text-white",
  },
  delivered: {
    label: "Delivered",
    className: "bg-status-delivered text-white",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-status-cancelled text-white",
  },
  active: {
    label: "Active",
    className: "bg-success text-success-foreground",
  },
  inactive: {
    label: "Inactive",
    className: "bg-muted text-muted-foreground",
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status as keyof typeof statusConfig] || {
    label: status,
    className: "bg-muted text-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}