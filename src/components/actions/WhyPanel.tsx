import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";

const WhyPanel = ({ title, children }: { title: string; children: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-1.5 text-xs font-medium text-info hover:text-accent transition-colors">
        {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
        {title}
      </button>
      {open && (
        <div className="mt-2 p-3 rounded-md bg-info/5 border border-info/15 text-xs text-muted-foreground space-y-2 animate-slide-up">
          {children}
        </div>
      )}
    </div>
  );
};

export default WhyPanel;
