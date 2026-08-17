import { useState } from "react";
import AppLayout from "@/components/layout/AppLayout";
import MetricCard from "@/components/shared/MetricCard";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, Area, AreaChart } from "recharts";
import { DollarSign, Receipt, TrendingUp, Clock, Zap, CheckCircle, ArrowDownRight, Award } from "lucide-react";

const monthlySavings = [
  { month: "Oct", value: 28000 }, { month: "Nov", value: 32000 }, { month: "Dec", value: 38000 },
  { month: "Jan", value: 42000 }, { month: "Feb", value: 44000 }, { month: "Mar", value: 48000 },
];

const costTrend = [
  { month: "Oct", savings: 28000, cost: 8000 }, { month: "Nov", savings: 32000, cost: 8200 },
  { month: "Dec", savings: 38000, cost: 8500 }, { month: "Jan", savings: 42000, cost: 8800 },
  { month: "Feb", savings: 44000, cost: 9000 }, { month: "Mar", savings: 48000, cost: 9200 },
];

const automationRate = [
  { month: "Jan", rate: 55 }, { month: "Feb", rate: 65 }, { month: "Mar", rate: 78 },
];

const coverageTable = [
  { type: "CPU Spike", auto: 118, manual: 2, pct: 98 },
  { type: "Memory Leak", auto: 71, manual: 7, pct: 91 },
  { type: "API Latency", auto: 88, manual: 7, pct: 93 },
  { type: "Network Issues", auto: 52, manual: 4, pct: 93 },
  { type: "Container Crashes", auto: 534, manual: 33, pct: 94 },
  { type: "Disk Space", auto: 95, manual: 3, pct: 97 },
  { type: "MID Server Issues", auto: 67, manual: 6, pct: 92 },
  { type: "Certificate Issues", auto: 23, manual: 1, pct: 96 },
  { type: "Database Issues", auto: 45, manual: 8, pct: 85 },
  { type: "Config Drift", auto: 38, manual: 5, pct: 88 },
];

const confidenceDist = [
  { range: "<70%", pct: 5 }, { range: "70-79%", pct: 12 }, { range: "80-89%", pct: 28 },
  { range: "90-95%", pct: 32 }, { range: ">95%", pct: 23 },
];

const agentPerf = [
  { name: "Infrastructure", handled: 89, success: 96, avg: "3m 42s", escalation: "4%" },
  { name: "Container & K8s", handled: 67, success: 93, avg: "1m 48s", escalation: "7%" },
  { name: "Database", handled: 67, success: 97, avg: "4m 15s", escalation: "3%" },
  { name: "MID Server", handled: 58, success: 96, avg: "2m 30s", escalation: "9%" },
  { name: "Escalation", handled: 63, success: 97, avg: "1m 15s", escalation: "3%" },
  { name: "App Performance", handled: 67, success: 93, avg: "2m 05s", escalation: "7%" },
  { name: "Storage", handled: 52, success: 94, avg: "4m 10s", escalation: "6%" },
  { name: "Network", handled: 45, success: 91, avg: "5m 30s", escalation: "9%" },
  { name: "Cloud Resource", handled: 42, success: 95, avg: "2m 48s", escalation: "5%" },
  { name: "Config Drift", handled: 42, success: 95, avg: "1m 48s", escalation: "5%" },
];

const chartTooltipStyle = { background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 6, fontSize: 11, color: "hsl(var(--popover-foreground))" };

export default function Analytics() {
  const [activeTab, setActiveTab] = useState("ROI Dashboard");
  const tabs = ["ROI Dashboard", "Agent Performance", "Automation Coverage", "Operational Metrics"];

  return (
    <AppLayout title="Analytics" subtitle="AutoOps performance metrics and ROI">
      <div className="flex border-b border-border mb-6">
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-4 py-2.5 text-xs font-medium border-b-2 transition-colors ${activeTab === t ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {activeTab === "ROI Dashboard" && (
        <div className="space-y-6">
          <div className="grid grid-cols-4 gap-6 mb-8">
            <MetricCard 
              value="$142,000" 
              label="Total Savings (30 days)" 
              accentColor="green" 
              icon={<DollarSign size={24} />}
            />
            <MetricCard 
              value="$263" 
              label="Cost Per Incident" 
              accentColor="blue" 
              icon={<Receipt size={24} />}
            />
            <MetricCard 
              value="340%" 
              label="ROI" 
              accentColor="green" 
              icon={<TrendingUp size={24} />}
            />
            <MetricCard 
              value="47s" 
              label="Avg MTTD" 
              subText="Baseline 23m reactive" 
              accentColor="blue" 
              icon={<Clock size={24} />}
            />
          </div>

          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-card rounded-md border border-border/40 p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80 mb-4">Monthly Cost Savings</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={monthlySavings}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(215, 12%, 55%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(215, 12%, 55%)" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}K`} />
                  <Tooltip contentStyle={chartTooltipStyle} formatter={(v: number) => [`$${(v / 1000).toFixed(0)}K`, "Savings"]} />
                  <Bar dataKey="value" fill="hsl(152, 60%, 48%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="bg-card rounded-md border border-border/40 p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80 mb-4">Cost Trend & ROI</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={costTrend}>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(215, 12%, 55%)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(215, 12%, 55%)" }} axisLine={false} tickLine={false} tickFormatter={v => `$${v / 1000}K`} />
                  <Tooltip contentStyle={chartTooltipStyle} />
                  <Line type="monotone" dataKey="savings" stroke="hsl(152, 60%, 48%)" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="cost" stroke="hsl(0, 72%, 55%)" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm mb-8">
            <div className="px-5 py-4 border-b border-border/40 bg-secondary/20"><h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Cost Savings Breakdown</h3></div>
            <table className="w-full">
              <thead><tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Metric</th><th className="px-4 py-2 text-right">Monthly</th><th className="px-4 py-2 text-right">Annually</th>
              </tr></thead>
              <tbody>
                {[
                  { m: "Engineer Time Saved", monthly: "$18,500", annual: "$222,000" },
                  { m: "Incident Prevention", monthly: "$12,300", annual: "$147,600" },
                  { m: "Faster Resolutions", monthly: "$8,200", annual: "$98,400" },
                  { m: "Improved SLA Compliance", monthly: "$4,500", annual: "$54,000" },
                  { m: "Total Monthly Savings", monthly: "$43,500", annual: "$522,000", bold: true },
                  { m: "Platform Cost", monthly: "($8,500)", annual: "($102,000)", red: true },
                  { m: "Net Value", monthly: "$35,000", annual: "$420,000", bold: true, green: true },
                ].map((r, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className={`px-4 py-2 text-xs ${r.bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{r.m}</td>
                    <td className={`px-4 py-2 text-xs text-right ${r.green ? "text-success font-semibold" : r.red ? "text-destructive" : r.bold ? "font-semibold text-foreground" : "text-foreground"}`}>{r.monthly}</td>
                    <td className={`px-4 py-2 text-xs text-right ${r.green ? "text-success font-semibold" : r.red ? "text-destructive" : r.bold ? "font-semibold text-foreground" : "text-foreground"}`}>{r.annual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* MID Server Self-Healing ROI */}
          <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border/40 bg-secondary/20">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Use Case Breakdown — MID Server Self-Healing</h3>
              <p className="text-[10px] text-muted-foreground/60 font-medium">Based on 30-day automated handling of MID Server incidents</p>
            </div>
            <table className="w-full">
              <thead><tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Metric</th><th className="px-4 py-2 text-right">This Month</th><th className="px-4 py-2 text-right">Annualised</th>
              </tr></thead>
              <tbody>
                {[
                  { m: "MID incidents auto handled", monthly: "23 of 25", annual: "276" },
                  { m: "Credential failures self healed", monthly: "11", annual: "132" },
                  { m: "Upgrade loops auto remediated", monthly: "4", annual: "48" },
                  { m: "ECC queue restorations", monthly: "8", annual: "96" },
                  { m: "Avg MTTR — MID incidents", monthly: "4m 18s", annual: "—" },
                  { m: "MTTR before AutoOps (baseline)", monthly: "2h 24m", annual: "—" },
                  { m: "MTTR reduction", monthly: "97%", annual: "—", green: true },
                  { m: "Engineer hours saved (MID only)", monthly: "54 hrs", annual: "648 hrs" },
                  { m: "P1/P2 incidents prevented", monthly: "7", annual: "84" },
                  { m: "MID specific savings", monthly: "$18,200", annual: "$218,400", bold: true, green: true },
                ].map((r: any, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className={`px-4 py-2 text-xs ${r.bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{r.m}</td>
                    <td className={`px-4 py-2 text-xs text-right ${r.green ? "text-success font-semibold" : "text-foreground"}`}>{r.monthly}</td>
                    <td className={`px-4 py-2 text-xs text-right ${r.green ? "text-success font-semibold" : "text-foreground"}`}>{r.annual}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="px-4 py-2 text-[10px] text-muted-foreground">Baseline MTTR sourced from ServiceNow incident history (Jan–Mar, pre-AutoOps). Current MTTR measured from INC creation to auto-resolution timestamp.</p>
          </div>
        </div>
      )}

      {activeTab === "Agent Performance" && (
        <div className="space-y-6">
          <div className="bg-card rounded-md border border-border/40 p-5 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80 mb-4">Incidents Handled by Agent</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={agentPerf} layout="vertical">
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(215, 12%, 55%)" }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(215, 12%, 55%)" }} axisLine={false} tickLine={false} width={100} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Bar dataKey="handled" fill="hsl(210, 80%, 55%)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
            <table className="w-full">
              <thead><tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                <th className="px-4 py-2 text-left">Agent</th><th className="px-4 py-2 text-right">Handled</th><th className="px-4 py-2 text-right">Success</th><th className="px-4 py-2 text-right">Avg Time</th><th className="px-4 py-2 text-right">Escalation</th>
              </tr></thead>
              <tbody>
                {agentPerf.map((a, i) => (
                  <tr key={i} className="border-b border-border hover:bg-secondary/50">
                    <td className="px-4 py-2 text-xs font-medium text-foreground">{a.name}</td>
                    <td className="px-4 py-2 text-xs text-right text-foreground">{a.handled}</td>
                    <td className="px-4 py-2 text-xs text-right text-success">{a.success}%</td>
                    <td className="px-4 py-2 text-xs text-right text-muted-foreground">{a.avg}</td>
                    <td className="px-4 py-2 text-xs text-right text-muted-foreground">{a.escalation}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "Automation Coverage" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-6 mb-8">
            <MetricCard 
              value="78%" 
              label="Automation Rate" 
              subText="+3% WoW" 
              accentColor="green" 
              icon={<Zap size={24} />}
            />
            <MetricCard 
              value="94%" 
              label="Avg Confidence" 
              subText="+1.2% WoW" 
              accentColor="green" 
              icon={<CheckCircle size={24} />}
            />
            <MetricCard 
              value="45%" 
              label="MTTR Reduction" 
              subText="+8% WoW" 
              accentColor="blue" 
              icon={<ArrowDownRight size={24} />}
            />
          </div>

          <div className="bg-card rounded-md border border-border/40 p-5 shadow-sm mb-8">
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80 mb-4">Automation Rate Over Time</h3>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={automationRate}>
                <XAxis dataKey="month" tick={{ fontSize: 10, fill: "hsl(215, 12%, 55%)" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(215, 12%, 55%)" }} axisLine={false} tickLine={false} tickFormatter={v => `${v}%`} />
                <Tooltip contentStyle={chartTooltipStyle} />
                <Area type="monotone" dataKey="rate" stroke="hsl(152, 60%, 48%)" fill="hsl(152, 60%, 48%)" fillOpacity={0.15} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-card rounded-md border border-border/40 overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-border/40 bg-secondary/20"><h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80">Coverage by Incident Type</h3></div>
              <table className="w-full">
                <thead><tr className="border-b border-border text-[10px] text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-2 text-left">Type</th><th className="px-3 py-2 text-right">Auto</th><th className="px-3 py-2 text-right">Manual</th><th className="px-3 py-2 text-right">Coverage</th>
                </tr></thead>
                <tbody>
                  {coverageTable.map((r, i) => (
                    <tr key={i} className="border-b border-border hover:bg-secondary/50">
                      <td className="px-4 py-1.5 text-xs text-foreground">{r.type}</td>
                      <td className="px-3 py-1.5 text-xs text-right text-foreground">{r.auto}</td>
                      <td className="px-3 py-1.5 text-xs text-right text-muted-foreground">{r.manual}</td>
                      <td className="px-3 py-1.5 text-xs text-right text-success">{r.pct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-card rounded-md border border-border/40 p-5 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80 mb-4">Confidence Distribution</h3>
              <div className="space-y-3">
                {confidenceDist.map((d, i) => {
                  const colorClass = d.range.includes(">95") || d.range.includes("90-95") 
                    ? "bg-success" 
                    : d.range.includes("80-89") || d.range.includes("70-79")
                    ? "bg-warning"
                    : "bg-destructive";
                  
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-16">{d.range}</span>
                      <div className="flex-1 h-5 bg-secondary rounded-full overflow-hidden">
                        <div className={`h-full ${colorClass} rounded-full`} style={{ width: `${d.pct * 2}%` }} />
                      </div>
                      <span className="text-xs font-medium text-foreground w-8 text-right">{d.pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Operational Metrics" && (
        <div className="space-y-6">
          <div className="bg-card rounded-md border border-border/40 p-8 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-widest text-foreground/80 mb-8">MTTR Comparison</h3>
            <div className="flex items-end gap-8 justify-center">
              <div className="text-center">
                <div className="w-24 bg-success rounded-t-lg flex items-end justify-center" style={{ height: 120 }}>
                  <span className="text-xs font-bold text-success-foreground mb-2">3m 42s</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Agent-Resolved</p>
              </div>
              <div className="text-center">
                <div className="w-24 bg-muted rounded-t-lg flex items-end justify-center" style={{ height: 280 }}>
                  <span className="text-xs font-bold text-muted-foreground mb-2">38m 15s</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Human-Resolved</p>
              </div>
            </div>
          </div>

          <MetricCard 
            value="92.7%" 
            label="First Attempt Success Rate" 
            subText="+1.3% this month" 
            accentColor="green" 
            icon={<Award size={24} />}
          />
        </div>
      )}
    </AppLayout>
  );
}
