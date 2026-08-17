import { CheckCircle, Loader2, Circle } from "lucide-react";
import StatusBadge from "@/components/shared/StatusBadge";

const StepItem = ({ num, title, time, status, children }: { num: number; title: string; time: string; status: "done" | "in-progress" | "pending"; children?: React.ReactNode }) => {
  const icons = {
    done: <CheckCircle size={16} className="text-success" />,
    "in-progress": <Loader2 size={16} className="text-info animate-spin" />,
    pending: <Circle size={16} className="text-muted-foreground" />,
  };
  return (
    <div className="flex gap-3 pb-4">
      <div className="flex flex-col items-center">
        {icons[status]}
        <div className="w-px flex-1 bg-border mt-1" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-semibold text-foreground">Step {num}: {title}</span>
          <span className="text-[10px] font-mono text-muted-foreground">{time}</span>
          <StatusBadge variant={status === "done" ? "completed" : status === "in-progress" ? "in-progress" : "pending"} label={status === "done" ? "Done" : status === "in-progress" ? "In Progress" : "Pending"} />
        </div>
        {children}
      </div>
    </div>
  );
};

export default StepItem;
