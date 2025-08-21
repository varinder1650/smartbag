import { cn } from "@/lib/utils";
import { Wifi, WifiOff } from "lucide-react";

interface ConnectionIndicatorProps {
  isConnected: boolean;
  className?: string;
}

export function ConnectionIndicator({ isConnected, className }: ConnectionIndicatorProps) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {isConnected ? (
        <>
          <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          <Wifi className="h-4 w-4 text-success" />
          <span className="text-sm text-success">Connected</span>
        </>
      ) : (
        <>
          <div className="w-2 h-2 bg-destructive rounded-full" />
          <WifiOff className="h-4 w-4 text-destructive" />
          <span className="text-sm text-destructive">Disconnected</span>
        </>
      )}
    </div>
  );
}