import { useState } from "react";
import { useParams } from "react-router-dom";
import { Globe, MessageSquare, Search, MoreHorizontal, Paperclip, Star, SlidersHorizontal, ChevronLeft, ChevronUp, ChevronDown, ArrowUpDown } from "lucide-react";
import servicenowLogo from "@/assets/servicenow-logo.png";
import { useIncidentDetail, useIncidentReport } from "@/api/hooks";

// Incident data per ID
const incidentDataMap: Record<string, {
  shortDesc: string;
  description: string;
  category: string;
  subcategory: string;
  impact: string;
  urgency: string;
  priority: string;
  configItem: string;
  assignmentGroup: string;
  relatedIncidents: { id: string; desc: string }[];
  relatedChanges: { id: string; desc: string }[];
}> = {
  INC0012801: {
    shortDesc: "API gateway returning 502 errors",
    description: "Kubernetes pod auth-service-pod-7f8d4 terminated with OOMKilled (exit code 137) in production cluster prod-k8s-01. Container memory limit of 512Mi exceeded. Pod has restarted 4 times in the last 30 minutes. Memory limit was recently reduced from 1Gi to 512Mi in change CHG0004521.",
    category: "Software",
    subcategory: "Operating System",
    impact: "1 - High",
    urgency: "1 - High",
    priority: "1 - Critical",
    configItem: "M-api-gateway",
    assignmentGroup: "Application Development",
    relatedIncidents: [
      { id: "INC0012743", desc: "MID Server Service Down" },
      { id: "INC0012789", desc: "MID Server Service Down" },
    ],
    relatedChanges: [
      { id: "CHG0004521", desc: "Reduce auth-service memory to 512Mi" },
    ],
  },
  INC0012815: {
    shortDesc: "MID Server zombie upgrade loop — prod-mid-07 rejecting all tasks after patch",
    description: "MID Server prod-mid-07 (Windows, London DC) shows 'Up' status but is rejecting all ECC Queue tasks after Vancouver→Washington instance patch. Auto-upgrade failed due to 'Access Denied' on agent\\bin\\wrapper.exe — AppLocker GPO locked the binary during replacement. Local version remains Vancouver while database expects Washington. 34 tasks stuck in 'Ready' state for 12+ minutes. Service account lacks Full Control on agent folder.",
    category: "Software",
    subcategory: "Operating System",
    impact: "2 - Medium",
    urgency: "1 - High",
    priority: "1 - Critical",
    configItem: "prod-mid-07",
    assignmentGroup: "MID Server Administration",
    relatedIncidents: [
      { id: "INC0012743", desc: "MID Server Service Down — prod-mid-03" },
      { id: "INC0012789", desc: "MID Server Service Down — prod-mid-03" },
    ],
    relatedChanges: [
      { id: "CHG0004602", desc: "Instance patch: Vancouver → Washington" },
    ],
  },
  INC0012823: {
    shortDesc: "ECC Queue backlog — thread exhaustion on prod-mid-09, Discovery schedules timing out",
    description: "MID Server prod-mid-09 (Linux, Singapore DC) has 247 ECC Queue records stuck in 'Ready' state. All 25 threads are busy — 18 Discovery and 7 JDBC integration tasks. High network latency to APAC targets (avg 340ms RTT vs 80ms baseline) is keeping threads occupied 4x longer. JVM heap at 87% utilization (1.74GB/2GB). Discovery schedules across 3 APAC sites are timing out. mid.threads.max is at default (25) and -Xmx is 2048m — both insufficient for current workload.",
    category: "Software",
    subcategory: "Memory",
    impact: "1 - High",
    urgency: "1 - High",
    priority: "1 - Critical",
    configItem: "prod-mid-09",
    assignmentGroup: "MID Server Administration",
    relatedIncidents: [
      { id: "INC0012815", desc: "MID Server Zombie Upgrade Loop — prod-mid-07" },
    ],
    relatedChanges: [
      { id: "CHG0004610", desc: "Increase JVM memory and thread pool on prod-mid-09" },
    ],
  },
};

export default function ServiceNowIncident() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState<"notes" | "related" | "resolution">("notes");
  const [workNotes, setWorkNotes] = useState("");
  const [additionalComments, setAdditionalComments] = useState("");
  const [state, setState] = useState("New");

  const incidentNumber = id || "INC0012801";
  const data = incidentDataMap[incidentNumber] || incidentDataMap["INC0012801"];
  const [description, setDescription] = useState(data.description);

  // Fetch incident details and report from backend API
  const { data: incidentDetail } = useIncidentDetail(incidentNumber);
  const { data: incidentReport } = useIncidentReport(incidentNumber);

  // Overlay API data onto the mock data when available
  const apiTitle = incidentDetail?.title;
  const apiDescription = incidentDetail?.description;
  const apiStatus = incidentDetail?.status;
  const apiSeverity = incidentDetail?.severity;
  const apiRuns = incidentDetail?.runs || [];
  const reportMarkdown = incidentReport?.markdown;

  return (
    <div style={{ fontFamily: "SourceSansPro, 'Source Sans Pro', 'Helvetica Neue', Arial, sans-serif", fontSize: "13px", color: "#333", background: "#f5f5f5", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* ===== TOP NAVBAR ===== */}
      <div style={{ background: "#032d42", height: "50px", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0", position: "sticky", top: 0, zIndex: 100 }}>
        {/* Logo + All — within sidebar width */}
        <div style={{ width: "260px", flexShrink: 0, display: "flex", alignItems: "center", gap: "20px", padding: "0 16px", borderRight: "1px solid #456a75", height: "100%" }}>
          <img src={servicenowLogo} alt="ServiceNow" style={{ height: "22px", objectFit: "contain", filter: "brightness(10)" }} />
          <NavText active>All</NavText>
        </div>
        {/* Nav items after sidebar */}
        <div style={{ display: "flex", alignItems: "center", gap: "24px", padding: "0 20px" }}>
          <NavText>Favorites</NavText>
          <NavText>History</NavText>
          <NavText>Workspaces</NavText>
          <NavText>Admin</NavText>
        </div>
        {/* Center badge */}
        <div style={{ background: "#2d4a4e", borderRadius: "14px", padding: "5px 20px", display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#fff", fontSize: "13px", fontWeight: 400 }}>Incident - {incidentNumber}</span>
          <span style={{ color: "#a0b4b8", fontSize: "14px", cursor: "pointer" }}>☆</span>
        </div>
        {/* Right icons */}
        <div style={{ display: "flex", alignItems: "center", gap: "4px", paddingRight: "12px" }}>
          <span style={{ color: "#7fa0a5", cursor: "pointer", padding: "4px 6px", fontSize: "13px" }}>▾</span>
          <div style={{ position: "relative", marginRight: "4px" }}>
            <Search size={14} style={{ position: "absolute", left: "8px", top: "50%", transform: "translateY(-50%)", color: "#7fa0a5" }} />
            <input placeholder="Search" style={{ background: "#2d4a4e", border: "none", borderRadius: "3px", padding: "6px 10px 6px 28px", color: "#c9d1d4", fontSize: "12px", width: "150px", outline: "none" }} />
          </div>
          <div style={{ width: "1px", height: "24px", background: "#3a5558", margin: "0 4px" }} />
          <Globe size={18} style={{ color: "#7fa0a5", cursor: "pointer" }} />
          <MessageSquare size={18} style={{ color: "#7fa0a5", cursor: "pointer" }} />
          <Search size={18} style={{ color: "#7fa0a5", cursor: "pointer" }} />
          <MoreHorizontal size={18} style={{ color: "#7fa0a5", cursor: "pointer" }} />
          <div style={{ width: "1px", height: "24px", background: "#3a5558", margin: "0 4px" }} />
          <div style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#8b4513", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>K</div>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1 }}>
        {/* ===== LEFT SIDEBAR ===== */}
        <div style={{ width: "260px", background: "#032d42", overflowY: "auto", flexShrink: 0, paddingBottom: "20px" }}>
          {/* Filter row */}
          <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: "#8fa4a9", fontSize: "14px" }}>▽</span>
            <input defaultValue="incide" style={{ background: "#3d555a", border: "none", borderRadius: "3px", padding: "4px 8px", color: "#c9d1d4", fontSize: "12px", width: "130px", outline: "none" }} />
            <span style={{ color: "#8fa4a9", fontSize: "14px", cursor: "pointer" }}>⟳</span>
            <span style={{ color: "#8fa4a9", fontSize: "14px", cursor: "pointer" }}>📌</span>
          </div>

          <SidebarSection title="FAVORITES" />
          <SidebarItem label="No Results" indent={0} dim />

          <SidebarSection title="ALL RESULTS" />

          <SidebarGroup label="Self-Service" />
          <SidebarItem label="Incidents" indent={1} bold="Incide" />
          <SidebarItem label="Watched Incidents" indent={1} bold="Incide" />

          <SidebarGroup label="Service Desk" />
          <SidebarItem label="Incidents" indent={1} bold="Incide" />

          <SidebarGroup label="Incident" bold="Incide" />
          <SidebarItem label="Create New" indent={2} />
          <SidebarItem label="Assigned to me" indent={2} />
          <SidebarItem label="Open" indent={2} />
          <SidebarItem label="Open - Unassigned" indent={2} />
          <SidebarItem label="Resolved" indent={2} />
          <SidebarItem label="All" indent={2} />
          <SidebarItem label="Overview" indent={2} />
          <SidebarItem label="Critical Incidents Map" indent={2} bold="Incide" />

          <SidebarGroup label="Administration" />
        </div>

        {/* ===== MAIN CONTENT ===== */}
        <div style={{ flex: 1, background: "#e8e8e8", overflow: "auto" }}>
          {/* Incident sub-header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 16px", borderBottom: "1px solid #e0e0e0", background: "#f7f8f8" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button style={iconBtnStyle}>‹</button>
              <span style={{ color: "#6c7778", fontSize: "16px", cursor: "pointer" }}>☰</span>
              <div style={{ lineHeight: 1.3 }}>
                <div style={{ fontSize: "12px", fontWeight: 600, color: "#333" }}>Incident</div>
                <div style={{ fontSize: "12px", color: "#6c7778" }}>{incidentNumber}</div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {/* Toolbar icons */}
              <ToolbarIcon><Paperclip size={15} /></ToolbarIcon>
              <ToolbarIcon><Star size={15} /></ToolbarIcon>
              <ToolbarIcon><SlidersHorizontal size={15} /></ToolbarIcon>
              <ToolbarIcon><MoreHorizontal size={15} /></ToolbarIcon>
              {/* Action buttons — all teal outline per ServiceNow reference */}
              <ActionBtn label="Discuss" />
              <ActionBtn label="Follow" />
              <ActionBtn label="Update" />
              <ActionBtn label="Resolve" />
              <ActionBtn label="Delete" />
              <ToolbarIcon><ChevronUp size={15} /></ToolbarIcon>
              <ToolbarIcon><ChevronDown size={15} /></ToolbarIcon>
            </div>
          </div>

          {/* ===== FORM ===== */}
          <div style={{ background: "#fff", margin: "0", padding: "12px 20px 20px", maxWidth: "none" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "32px", rowGap: "2px" }}>
              {/* Number / Channel */}
              <FieldRow label="Number">
                <FieldInput value={incidentNumber} readOnly style={{ background: "#e1f5fe", borderColor: "#4fc3f7", fontWeight: 600, color: "#0277bd" }} />
              </FieldRow>
              <FieldRow label="Channel" align="right">
                <FieldSelect defaultValue="">
                  <option value="">-- None --</option>
                  <option>Phone</option><option>Email</option><option>Self-Service</option>
                </FieldSelect>
              </FieldRow>

              {/* Caller / State */}
              <FieldRow label="Caller" required>
                <FieldInput defaultValue="System Administrator" />
                <FieldIconBtn>🔍</FieldIconBtn>
                <FieldIconBtn>👤</FieldIconBtn>
                <FieldIconBtn>ⓘ</FieldIconBtn>
              </FieldRow>
              <FieldRow label="State" align="right">
                <FieldSelect value={state} onChange={(e: any) => setState(e.target.value)}>
                  <option>New</option><option>In Progress</option><option>On Hold</option><option>Resolved</option><option>Closed</option>
                </FieldSelect>
              </FieldRow>

              {/* Category / Impact */}
              <FieldRow label="Category">
                <FieldSelect defaultValue={data.category}>
                  <option>-- None --</option><option>Software</option><option>Hardware</option><option>Network</option><option>Inquiry / Help</option>
                </FieldSelect>
              </FieldRow>
              <FieldRow label="Impact" align="right">
                <FieldSelect defaultValue={data.impact}>
                  <option>1 - High</option><option>2 - Medium</option><option>3 - Low</option>
                </FieldSelect>
              </FieldRow>

              {/* Subcategory / Urgency */}
              <FieldRow label="Subcategory">
                <FieldSelect defaultValue={data.subcategory}>
                  <option value="">-- None --</option><option>Operating System</option><option>Memory</option>
                </FieldSelect>
              </FieldRow>
              <FieldRow label="Urgency" align="right">
                <FieldSelect defaultValue={data.urgency}>
                  <option>1 - High</option><option>2 - Medium</option><option>3 - Low</option>
                </FieldSelect>
              </FieldRow>

              {/* Service / Priority */}
              <FieldRow label="Service">
                <FieldInput defaultValue="" />
                <FieldIconBtn>🔍</FieldIconBtn>
              </FieldRow>
              <FieldRow label="Priority" align="right">
                
                <input value={data.priority} readOnly style={{ ...fieldInputStyle, background: "#e0e0e0", color: "#333", border: "1px solid #ccc", cursor: "default", width: "170px" }} />
              </FieldRow>

              {/* Service offering / Assignment group */}
              <FieldRow label="Service offering">
                <FieldInput defaultValue="" />
                <FieldIconBtn>🔍</FieldIconBtn>
              </FieldRow>
              <FieldRow label="Assignment group" align="right">
                <FieldInput defaultValue={data.assignmentGroup} />
                <FieldIconBtn>🔍</FieldIconBtn>
                <FieldIconBtn>ⓘ</FieldIconBtn>
              </FieldRow>

              {/* Configuration item / Assigned to */}
              <FieldRow label="Configuration item">
                <FieldInput defaultValue={data.configItem} />
                <FieldIconBtn>🔍</FieldIconBtn>
                <FieldIconBtn>👤</FieldIconBtn>
                <FieldIconBtn>ⓘ</FieldIconBtn>
              </FieldRow>
              <FieldRow label="Assigned to" align="right">
                <FieldInput defaultValue="" />
                <FieldIconBtn>🔍</FieldIconBtn>
              </FieldRow>
            </div>

            {/* Short description */}
            <div style={{ display: "flex", alignItems: "center", marginTop: "10px" }}>
              <label style={labelStyle}><Req />Short description</label>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "4px" }}>
                <input defaultValue={data.shortDesc} style={{ ...fieldInputStyle, flex: 1 }} />
                <FieldIconBtn>💡</FieldIconBtn>
              </div>
            </div>

            {/* Description */}
            <div style={{ display: "flex", alignItems: "flex-start", marginTop: "6px" }}>
              <label style={{ ...labelStyle, paddingTop: "6px" }}>Description</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={3}
                style={{ flex: 1, border: "1px solid #d5d5d5", borderRadius: "2px", padding: "5px 8px", fontSize: "12px", color: "#333", resize: "vertical", outline: "none", fontFamily: "inherit", background: "#fff" }}
              />
            </div>

            {/* Related Search Results */}
            <div style={{ display: "flex", justifyContent: "center", margin: "18px 0", borderTop: "1px solid #e0e0e0", paddingTop: "14px" }}>
              <button style={{ border: "1px solid #d5d5d5", borderRadius: "14px", padding: "5px 18px", fontSize: "12px", color: "#333", background: "#fff", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
                Related Search Results <span style={{ fontSize: "11px" }}>›</span>
              </button>
            </div>
          </div>

          {/* ===== TABS SECTION — separate white card ===== */}
          <div style={{ background: "#fff", margin: "16px 0 0 0", padding: "0 20px 20px" }}>
            <div style={{ borderBottom: "1px solid #e0e0e0", display: "flex", marginBottom: "14px" }}>
              <TabBtn active={activeTab === "notes"} onClick={() => setActiveTab("notes")}>Notes</TabBtn>
              <TabBtn active={activeTab === "related"} onClick={() => setActiveTab("related")}>Related Records</TabBtn>
              <TabBtn active={activeTab === "resolution"} onClick={() => setActiveTab("resolution")} required>Resolution Information</TabBtn>
            </div>

            {/* ===== TAB CONTENT ===== */}
            {activeTab === "notes" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginBottom: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <span style={{ fontSize: "12px", color: "#333" }}>Watch list</span>
                    <FieldIconBtn>🔒</FieldIconBtn>
                    <FieldIconBtn>👥</FieldIconBtn>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", justifyContent: "flex-end" }}>
                    <span style={{ fontSize: "12px", color: "#333" }}>Work notes list</span>
                    <FieldIconBtn>🔒</FieldIconBtn>
                    <FieldIconBtn>👥</FieldIconBtn>
                  </div>
                </div>

                {/* Work notes */}
                <div style={{ display: "flex", alignItems: "flex-start", marginBottom: "10px" }}>
                  <label style={{ ...labelStyle, paddingTop: "6px" }}>Work notes</label>
                  <div style={{ flex: 1, position: "relative" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: "#e8a435", borderRadius: "1px" }} />
                    <textarea value={workNotes} onChange={e => setWorkNotes(e.target.value)} placeholder="Work notes" rows={3}
                      style={{ width: "100%", border: "1px solid #d5d5d5", borderRadius: "2px", padding: "5px 8px 5px 12px", fontSize: "12px", color: "#333", resize: "vertical", outline: "none", fontFamily: "inherit" }}
                    />
                    <div style={{ textAlign: "right", marginTop: "2px" }}>
                      <span style={{ color: "#6c7778", fontSize: "12px", cursor: "pointer" }}>☰</span>
                    </div>
                  </div>
                </div>

                {/* Additional comments */}
                <div style={{ display: "flex", alignItems: "flex-start" }}>
                  <label style={{ ...labelStyle, paddingTop: "6px" }}>Additional comments</label>
                  <div style={{ flex: 1, position: "relative" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: "#e8a435", borderRadius: "1px" }} />
                    <textarea value={additionalComments} onChange={e => setAdditionalComments(e.target.value)} placeholder="Additional comments (Customer visible)" rows={3}
                      style={{ width: "100%", border: "1px solid #d5d5d5", borderRadius: "2px", padding: "5px 8px 5px 12px", fontSize: "12px", color: "#333", resize: "vertical", outline: "none", fontFamily: "inherit" }}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "related" && (
              <div style={{ fontSize: "12px", color: "#6c7778" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#333", marginBottom: "6px" }}>Related Incidents</div>
                    <div style={{ border: "1px solid #e0e0e0", borderRadius: "3px", padding: "8px" }}>
                      {data.relatedIncidents.map((ri, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: i < data.relatedIncidents.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                          <a href={`/incident/${ri.id}`} style={{ color: "#0277bd", cursor: "pointer", textDecoration: "none" }}>{ri.id}</a>
                          <span style={{ color: "#333" }}>{ri.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: "#333", marginBottom: "6px" }}>Related Changes</div>
                    <div style={{ border: "1px solid #e0e0e0", borderRadius: "3px", padding: "8px" }}>
                      {data.relatedChanges.map((rc, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", borderBottom: i < data.relatedChanges.length - 1 ? "1px solid #f0f0f0" : "none" }}>
                          <span style={{ color: "#0277bd", cursor: "pointer" }}>{rc.id}</span>
                          <span style={{ color: "#333" }}>{rc.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "resolution" && (
              <div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: "32px", rowGap: "2px" }}>
                  <FieldRow label="Knowledge">
                    <input type="checkbox" style={{ width: "14px", height: "14px", accentColor: "#293e40" }} />
                  </FieldRow>
                  <FieldRow label="Resolved by" align="right">
                    <FieldInput defaultValue="" />
                    <FieldIconBtn>🔍</FieldIconBtn>
                  </FieldRow>

                  <FieldRow label="Resolution code" required>
                    <FieldSelect defaultValue="">
                      <option value="">-- None --</option>
                      <option>Solved (Work Around)</option><option>Solved (Permanently)</option><option>Not Solved (Not Reproducible)</option>
                    </FieldSelect>
                  </FieldRow>
                  <FieldRow label="Resolved" align="right">
                    <FieldInput defaultValue="" />
                    <FieldIconBtn>📅</FieldIconBtn>
                  </FieldRow>
                </div>

                <div style={{ display: "flex", alignItems: "flex-start", marginTop: "8px" }}>
                  <label style={{ ...labelStyle, paddingTop: "6px" }}><Req />Resolution notes</label>
                  <div style={{ flex: 1, position: "relative" }}>
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", background: "#c62828", borderRadius: "1px" }} />
                    <textarea placeholder="" rows={4}
                      style={{ width: "100%", border: "2px solid #c62828", borderRadius: "2px", padding: "5px 8px 5px 12px", fontSize: "12px", color: "#333", resize: "vertical", outline: "none", fontFamily: "inherit" }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ===== Sub-components ===== */

const labelStyle: React.CSSProperties = {
  width: "140px", minWidth: "140px", textAlign: "right", paddingRight: "10px",
  fontSize: "12px", color: "#333", whiteSpace: "nowrap",
};

const fieldInputStyle: React.CSSProperties = {
  border: "1px solid #d5d5d5", borderRadius: "2px", padding: "4px 7px",
  fontSize: "12px", color: "#333", outline: "none", width: "170px",
  background: "#fff", fontFamily: "inherit",
};

const iconBtnStyle: React.CSSProperties = {
  background: "none", border: "1px solid #d5d5d5", borderRadius: "2px",
  padding: "2px 8px", cursor: "pointer", fontSize: "15px", color: "#6c7778",
};

function NavText({ children, active }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span style={{ color: active ? "#fff" : "#c9d1d4", fontSize: "13px", cursor: "pointer", fontWeight: 400, borderBottom: active ? "2px solid #7fa0a5" : "none", paddingBottom: "2px" }}>{children}</span>
  );
}

function SidebarSection({ title }: { title: string }) {
  return <div style={{ padding: "10px 16px 4px", fontSize: "10px", fontWeight: 700, color: "#8fa4a9", letterSpacing: "0.8px", textTransform: "uppercase" }}>{title}</div>;
}

function SidebarGroup({ label, bold }: { label: string; bold?: string }) {
  return (
    <div style={{ padding: "6px 16px 2px", fontSize: "13px", color: "#c9d1d4", cursor: "pointer" }}>
      <span style={{ marginRight: "4px", fontSize: "10px" }}>▾</span>
      {bold ? <span dangerouslySetInnerHTML={{ __html: label.replace(new RegExp(`(${bold})`, "g"), "<b>$1</b>") }} /> : label}
    </div>
  );
}

function SidebarItem({ label, indent = 0, bold, dim }: { label: string; indent?: number; bold?: string; dim?: boolean }) {
  const pl = 20 + indent * 14;
  return (
    <div style={{ padding: `3px 16px 3px ${pl}px`, fontSize: "13px", color: dim ? "#8fa4a9" : "#c9d1d4", cursor: "pointer" }}>
      {bold ? <span dangerouslySetInnerHTML={{ __html: label.replace(new RegExp(`(${bold})`, "g"), "<b>$1</b>") }} /> : label}
    </div>
  );
}

function ToolbarIcon({ children }: { children: React.ReactNode }) {
  return <span style={{ color: "#6c7778", cursor: "pointer", fontSize: "14px", padding: "2px 4px" }}>{children}</span>;
}

function ActionBtn({ label }: { label: string }) {
  return (
    <button style={{
      padding: "4px 14px", fontSize: "12px", fontWeight: 500, borderRadius: "3px",
      cursor: "pointer", border: "1px solid #5a8a8f", background: "transparent", color: "#2a7a80",
    }}>{label}</button>
  );
}

function FieldRow({ label, children, required, align }: { label: string; children: React.ReactNode; required?: boolean; align?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", padding: "3px 0", justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
      <label style={{ ...labelStyle, width: align === "right" ? "auto" : "140px", minWidth: align === "right" ? "auto" : "140px", marginRight: align === "right" ? "8px" : "0" }}>
        {required && <Req />}{label}
      </label>
      <div style={{ display: "flex", alignItems: "center", gap: "3px" }}>{children}</div>
    </div>
  );
}

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement> & { style?: React.CSSProperties }) {
  const { style: extra, ...rest } = props;
  return <input style={{ ...fieldInputStyle, ...extra }} {...rest} />;
}

function FieldSelect(props: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  const { children, ...rest } = props;
  return <select style={{ ...fieldInputStyle, cursor: "pointer" }} {...rest}>{children}</select>;
}

function FieldIconBtn({ children }: { children: React.ReactNode }) {
  return <button style={{ background: "none", border: "1px solid #e0e0e0", borderRadius: "2px", padding: "1px 4px", cursor: "pointer", fontSize: "11px", color: "#6c7778", lineHeight: 1 }}>{children}</button>;
}

function Req() {
  return <span style={{ color: "#c62828", marginRight: "2px" }}>*</span>;
}

function TabBtn({ children, active, onClick, required }: { children: React.ReactNode; active: boolean; onClick: () => void; required?: boolean }) {
  return (
    <button onClick={onClick} style={{
      padding: "10px 16px 8px", fontSize: "13px", fontWeight: active ? 500 : 400,
      color: active ? "#333" : "#6c7778", background: active ? "#fff" : "transparent",
      border: active ? "1px solid #e0e0e0" : "1px solid transparent",
      borderTop: active ? "3px solid #4caf50" : "3px solid transparent",
      borderBottom: active ? "1px solid #fff" : "1px solid #e0e0e0",
      cursor: "pointer", marginBottom: "-1px", borderRadius: "0",
    }}>
      {required && <span style={{ color: "#c62828", marginRight: "2px" }}>*</span>}
      {children}
    </button>
  );
}
