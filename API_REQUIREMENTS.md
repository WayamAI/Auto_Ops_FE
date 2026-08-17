# AutoOps AI - API Requirements Documentation

## Overview
This document outlines all required APIs for the AutoOps AI frontend application. The application is an autonomous operations platform that manages incident remediation, agent orchestration, and approvals.

---

## 1. Control Tower / Dashboard APIs

### 1.1 Get Dashboard Metrics
**Endpoint:** `GET /api/dashboard/metrics`

**Purpose:** Fetch overall system metrics for the control tower dashboard

**Query Parameters:**
- `timeRange` (optional): "24h", "7d", "30d" (default: "24h")

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "activeRemediations": 7,
    "investigatingCount": 3,
    "remediatingCount": 3,
    "validatingCount": 1,
    "resolvedToday": 39,
    "pendingApprovals": 3,
    "routingAccuracy": 96.2,
    "successRate": 94.2,
    "valueGeneratedToday": 13104
  }
}
```

### 1.2 Get Live Activity Feed
**Endpoint:** `GET /api/dashboard/live-feed`

**Purpose:** Fetch real-time activity feed for the control tower

**Query Parameters:**
- `limit` (optional): Number of entries (default: 20, max: 100)
- `stage` (optional): Filter by "planning", "executing", "analyzing", "validating", "resolved", "escalated"

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": "ACT-001",
        "time": "11:09:30 AM",
        "agent": "MID Server Agent",
        "description": "Awaiting approval for INC0012823: JVM memory increase on prod-mid-09 — human-in-the-loop required",
        "stage": "planning",
        "confidence": "High",
        "incidentId": "INC0012823"
      },
      {
        "id": "ACT-002",
        "time": "11:04:45 AM",
        "agent": "MID Server Agent",
        "description": "Executing remediation for INC0012815: Zombie upgrade loop on prod-mid-07 — clearing stale binaries",
        "stage": "executing",
        "confidence": "High",
        "incidentId": "INC0012815"
      }
    ]
  }
}
```

### 1.3 Get MID Server Infrastructure Status
**Endpoint:** `GET /api/dashboard/mid-server-status`

**Purpose:** Get comprehensive MID Server infrastructure health

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "totalNodes": 14,
    "operational": 11,
    "degraded": 2,
    "degradedNodes": ["prod-mid-04", "prod-mid-09"],
    "unreachable": 1,
    "unreachableNodes": ["prod-mid-13"],
    "eccQueueErrors": 47,
    "eccQueueErrorsNodes": 3,
    "credentialWatch": {
      "expiringCount": 3,
      "expiringAccounts": [
        {
          "account": "svc_snow_mid_02@corp.internal",
          "expiresIn": "6d"
        }
      ]
    }
  }
}
```

---

## 2. Actions / Remediations APIs

### 2.1 Get All Actions
**Endpoint:** `GET /api/actions`

**Purpose:** Fetch all remediation actions with their states

**Query Parameters:**
- `status` (optional): "active", "pending-review", "completed", "all"
- `limit` (optional): Default 50
- `offset` (optional): Pagination offset

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "total": 12,
    "items": [
      {
        "id": "ACT-001",
        "title": "MID Server Service Down — prod-mid-03",
        "incidentId": "INC0012743",
        "agent": "MID Server Agent",
        "icon": "🔧",
        "startTime": "10:42:00 AM",
        "elapsed": "18m 30s",
        "status": "completed",
        "displayStatus": "completed",
        "progress": 100,
        "steps": [
          {
            "title": "Analyze MID Server logs for failure",
            "status": "done",
            "time": "10:42:15 AM",
            "content": "<string>"
          }
        ],
        "logEntries": [
          {
            "time": "10:42:15",
            "level": "INFO",
            "source": "agent: pipeline_start"
          }
        ],
        "learningOutcome": [
          "MID Server service crashes are often caused by memory leaks in JDBC drivers",
          "Increasing JVM heap size by 50% prevented OOMKilled events"
        ]
      }
    ]
  }
}
```

### 2.2 Get Action Details
**Endpoint:** `GET /api/actions/{actionId}`

**Purpose:** Get detailed information about a specific action

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "id": "ACT-001",
    "title": "MID Server Service Down — prod-mid-03",
    "incidentId": "INC0012743",
    "agent": "MID Server Agent",
    "startTime": "10:42:00 AM",
    "elapsed": "18m 30s",
    "status": "completed",
    "progress": 100,
    "steps": [],
    "logEntries": [],
    "metrics": {
      "avgMTTR": "3m 42s",
      "successRate": 94.2,
      "routingAccuracy": 96.2
    }
  }
}
```

### 2.3 Approve/Reject Action
**Endpoint:** `POST /api/actions/{actionId}/approve`

**Purpose:** Human approval for pending review actions

**Request Body:**
```json
{
  "action": "approve",
  "notes": "Approved after verification"
}
```

**Sample Response:**
```json
{
  "status": "success",
  "message": "Action approved and execution started"
}
```

### 2.4 Cancel Action
**Endpoint:** `POST /api/actions/{actionId}/cancel`

**Purpose:** Cancel a running action

**Request Body:**
```json
{
  "reason": "User initiated cancellation"
}
```

**Sample Response:**
```json
{
  "status": "success",
  "message": "Action cancelled successfully"
}
```

### 2.5 Resume Paused Action
**Endpoint:** `POST /api/actions/{actionId}/resume`

**Purpose:** Resume a paused action execution

**Request Body:**
```json
{
  "continueFrom": 2
}
```

**Sample Response:**
```json
{
  "status": "success",
  "message": "Action resumed"
}
```

---

## 3. Agents APIs

### 3.1 Get All Agents
**Endpoint:** `GET /api/agents`

**Purpose:** Fetch all autonomous agents with their status

**Query Parameters:**
- `status` (optional): "active", "idle", "learning", "error", "disabled", "all"
- `category` (optional): Filter by category
- `search` (optional): Search by agent name

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "total": 15,
    "items": [
      {
        "id": "infrastructure",
        "name": "Infrastructure Agent",
        "status": "active",
        "category": "Infrastructure",
        "executions": 567,
        "success": "94%",
        "avg": "3m 12s",
        "weekRuns": 89,
        "mttr": "45%",
        "description": "Manages compute infrastructure remediation including CPU, memory, and disk issues"
      }
    ],
    "statusCounts": {
      "active": 13,
      "idle": 1,
      "learning": 1,
      "error": 0,
      "disabled": 0
    }
  }
}
```

### 3.2 Get Agent Details
**Endpoint:** `GET /api/agents/{agentId}`

**Purpose:** Get detailed information about a specific agent

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "id": "infrastructure",
    "name": "Infrastructure Agent",
    "status": "active",
    "category": "Infrastructure",
    "executions": 567,
    "success": "94%",
    "avg": "3m 12s",
    "weekRuns": 89,
    "mttr": "45%",
    "description": "Manages compute infrastructure remediation including CPU, memory, and disk issues",
    "model": "Codestral-2501",
    "confidenceThreshold": 85,
    "allowedEnvironments": ["non-production", "staging", "production"],
    "maxConcurrentExecutions": 3,
    "notificationChannels": ["slack", "pagerduty"],
    "createdAt": "2024-01-15T10:00:00Z",
    "lastExecuted": "2024-04-14T11:04:45Z"
  }
}
```

### 3.3 Deploy New Agent
**Endpoint:** `POST /api/agents/deploy`

**Purpose:** Deploy a new autonomous agent

**Request Body:**
```json
{
  "name": "DNS Resolution Agent",
  "category": "Infrastructure",
  "description": "Resolves DNS issues and propagation checks",
  "confidenceThreshold": 85,
  "initialEnvironment": "non-production",
  "mode": "learning"
}
```

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "id": "dns-resolution",
    "name": "DNS Resolution Agent",
    "status": "learning",
    "message": "Agent deployed in Learning mode. Agent will run in shadow mode until validated."
  }
}
```

### 3.4 Update Agent Configuration
**Endpoint:** `PUT /api/agents/{agentId}/config`

**Purpose:** Update agent configuration

**Request Body:**
```json
{
  "status": "active",
  "confidenceThreshold": 85,
  "allowedEnvironments": ["non-production", "staging"],
  "maxConcurrentExecutions": 5,
  "notificationChannels": ["slack"],
  "model": "Claude 3.5 Sonnet"
}
```

**Sample Response:**
```json
{
  "status": "success",
  "message": "Agent configuration saved"
}
```

### 3.5 Test Agent
**Endpoint:** `POST /api/agents/{agentId}/test`

**Purpose:** Run diagnostic tests on an agent

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "agentId": "infrastructure",
    "tests": [
      {
        "name": "Tool Connectivity",
        "description": "Verifying all assigned tools are reachable",
        "status": "passed",
        "duration": "1.2s"
      },
      {
        "name": "ServiceNow API",
        "description": "Testing CMDB read and incident write access",
        "status": "passed",
        "duration": "0.8s"
      },
      {
        "name": "LLM Inference",
        "description": "Sending test prompt to primary model",
        "status": "passed",
        "duration": "2.3s"
      },
      {
        "name": "Dry Run Execution",
        "description": "Simulating a remediation pipeline",
        "status": "passed",
        "duration": "1.5s"
      }
    ],
    "overallStatus": "passed",
    "message": "All tests passed — Agent is fully operational"
  }
}
```

---

## 4. Approval Queue APIs

### 4.1 Get Approval Queue
**Endpoint:** `GET /api/approvals`

**Purpose:** Fetch all pending approvals

**Query Parameters:**
- `severity` (optional): "P1", "P2", "P3"
- `riskLevel` (optional): "high", "medium", "low"
- `status` (optional): "pending", "approved", "rejected"

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "total": 4,
    "items": [
      {
        "id": "APR-001",
        "incidentId": "INC0012823",
        "summary": "ECC Queue Backlog — Thread Exhaustion on prod-mid-09",
        "severity": "P1",
        "agent": "MID Server Agent",
        "action": "Increase JVM memory allocation from 2GB to 4GB and raise mid.threads.max from 25 to 50",
        "reason": "JVM memory changes on production MID Servers require human-in-the-loop approval per CAB policy",
        "blast": "3 Discovery schedules and 12 JDBC integrations will queue temporarily (~120s during restart)",
        "elapsed": "4m 17s",
        "routingRecommendation": {
          "team": "MID Server Administration",
          "confidence": "96%",
          "reason": "MID Server config change — routed based on CI type, change category, and team ownership"
        },
        "historicalContext": {
          "similarIncidents": 13,
          "avgResolution": "6m 20s",
          "successRate": "92.3%",
          "lastOccurrence": "3 weeks ago (INC0012601)"
        },
        "steps": [
          "1. SSH into prod-mid-09 via prod-linux-ssh",
          "2. Analyze threads.log to confirm all 25 threads are busy",
          "3. Update wrapper-override.conf: set -Xmx to 4096m",
          "4. Update MID Server config: set mid.threads.max to 50",
          "5. Restart MID Server service to apply changes",
          "6. Monitor ECC Queue for 5 minutes",
          "7. Validate thread utilization and JVM heap metrics post-restart"
        ],
        "rollback": "Revert wrapper-override.conf to -Xmx2048m and mid.threads.max to 25, then restart MID Server service.",
        "estimatedTime": "~3m 45s",
        "riskLevel": "medium"
      }
    ],
    "metrics": {
      "pendingCount": 4,
      "avgReviewTime": "2m 48s",
      "routingAccuracy": 96.2,
      "approvalRate": 94.8
    }
  }
}
```

### 4.2 Get Approval Details
**Endpoint:** `GET /api/approvals/{approvalId}`

**Purpose:** Get detailed information about a specific approval

**Sample Response:** Same as individual item in 4.1 response

### 4.3 Approve Request
**Endpoint:** `POST /api/approvals/{approvalId}/approve`

**Purpose:** Approve and execute a remediation request

**Request Body:**
```json
{
  "approverNotes": "Approved after verification with team"
}
```

**Sample Response:**
```json
{
  "status": "success",
  "message": "Approval granted. Execution started.",
  "data": {
    "id": "APR-001",
    "status": "executing",
    "currentStep": 0,
    "actionId": "ACT-001"
  }
}
```

### 4.4 Reject Request
**Endpoint:** `POST /api/approvals/{approvalId}/reject`

**Purpose:** Reject and escalate an approval request

**Request Body:**
```json
{
  "reason": "Requires additional team consultation",
  "escalateTo": "oncall-engineer"
}
```

**Sample Response:**
```json
{
  "status": "success",
  "message": "Approval rejected and escalated to on-call engineer"
}
```

### 4.5 Modify Request
**Endpoint:** `POST /api/approvals/{approvalId}/modify`

**Purpose:** Send back approval with modification notes

**Request Body:**
```json
{
  "notes": "Please reduce JVM memory increase to 3GB instead of 4GB",
  "sendBackToAgent": true
}
```

**Sample Response:**
```json
{
  "status": "success",
  "message": "Remediation plan modified and sent back to agent"
}
```

---

## 5. Analytics APIs

### 5.1 Get ROI Dashboard Data
**Endpoint:** `GET /api/analytics/roi`

**Purpose:** Get ROI metrics and financial impact data

**Query Parameters:**
- `period` (optional): "30d", "90d", "1y" (default: "30d")

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "totalSavings": 142000,
    "costPerIncident": 263,
    "roi": 340,
    "avgMTTD": "47s",
    "monthlySavings": [
      {"month": "Oct", "value": 28000},
      {"month": "Nov", "value": 32000},
      {"month": "Dec", "value": 38000},
      {"month": "Jan", "value": 42000},
      {"month": "Feb", "value": 44000},
      {"month": "Mar", "value": 48000}
    ],
    "costTrend": [
      {"month": "Oct", "savings": 28000, "cost": 8000},
      {"month": "Nov", "savings": 32000, "cost": 8200}
    ]
  }
}
```

### 5.2 Get Agent Performance Analytics
**Endpoint:** `GET /api/analytics/agents`

**Purpose:** Get detailed agent performance metrics

**Query Parameters:**
- `period` (optional): "7d", "30d", "90d"
- `agent` (optional): Filter by specific agent ID

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "agents": [
      {
        "name": "Infrastructure Agent",
        "handled": 89,
        "success": 96,
        "avg": "3m 42s",
        "escalation": "4%"
      }
    ],
    "totalIncidentsHandled": 567,
    "overallSuccessRate": 94.2,
    "overallEscalationRate": 5.8
  }
}
```

### 5.3 Get Automation Coverage
**Endpoint:** `GET /api/analytics/coverage`

**Purpose:** Get automation coverage by incident type

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "coverage": [
      {
        "type": "CPU Spike",
        "automated": 118,
        "manual": 2,
        "percentage": 98
      },
      {
        "type": "Memory Leak",
        "automated": 71,
        "manual": 7,
        "percentage": 91
      }
    ],
    "totalAutomated": 1078,
    "totalManual": 78,
    "totalCoverage": 93.2
  }
}
```

### 5.4 Get Confidence Distribution
**Endpoint:** `GET /api/analytics/confidence-distribution`

**Purpose:** Get distribution of AI confidence scores

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "distribution": [
      {"range": "<70%", "percentage": 5},
      {"range": "70-79%", "percentage": 12},
      {"range": "80-89%", "percentage": 28},
      {"range": "90-95%", "percentage": 32},
      {"range": ">95%", "percentage": 23}
    ]
  }
}
```

---

## 6. Health Monitor APIs

### 6.1 Get Infrastructure Health
**Endpoint:** `GET /api/health/infrastructure`

**Purpose:** Get comprehensive infrastructure health status

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "systems": {
      "compute": {
        "status": "healthy",
        "cpu": 45,
        "memory": 62,
        "disk": 78
      },
      "network": {
        "status": "healthy",
        "latency": 12,
        "bandwidth": 890,
        "errors": 0
      },
      "databases": {
        "status": "healthy",
        "connectionPoolUtilization": 65,
        "replicationLag": "0.2s"
      }
    },
    "alerts": []
  }
}
```

### 6.2 Get MID Server Health Details
**Endpoint:** `GET /api/health/mid-servers`

**Purpose:** Get detailed health of all MID Servers

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "servers": [
      {
        "name": "prod-mid-01",
        "status": "healthy",
        "region": "US-East",
        "uptime": "89d",
        "jvmHeap": 1.74,
        "jvmHeapMax": 2.0,
        "threads": 24,
        "threadsMax": 25,
        "eccQueueReady": 0,
        "eccQueueError": 0,
        "lastHeartbeat": "2024-04-14T11:30:15Z"
      }
    ]
  }
}
```

### 6.3 Get System Alerts
**Endpoint:** `GET /api/health/alerts`

**Purpose:** Get active system alerts and warnings

**Query Parameters:**
- `severity` (optional): "critical", "warning", "info"

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "alerts": [
      {
        "id": "ALERT-001",
        "severity": "critical",
        "title": "MID Server prod-mid-13 Unreachable",
        "description": "No heartbeat received for 12 minutes",
        "createdAt": "2024-04-14T10:55:00Z",
        "incidentId": null
      }
    ]
  }
}
```

---

## 7. Tool Registry APIs

### 7.1 Get All Tool Profiles
**Endpoint:** `GET /api/tools/profiles`

**Purpose:** Get all available tool connection profiles

**Query Parameters:**
- `type` (optional): Filter by type (SSH, Cloud API, Kubernetes, etc.)
- `status` (optional): Filter by status (connected, warning, error)

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "profiles": [
      {
        "name": "prod-linux-ssh",
        "type": "SSH Access",
        "status": "connected",
        "cis": 124,
        "lastUsed": "2m ago",
        "vault": "HashiCorp Vault",
        "host": "*.prod.internal",
        "port": "22",
        "timeout": "30s"
      }
    ]
  }
}
```

### 7.2 Get Action Packs
**Endpoint:** `GET /api/tools/action-packs`

**Purpose:** Get all available action packs

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "packs": [
      {
        "name": "Linux Action Pack",
        "count": 6,
        "actions": [
          {
            "name": "linux_service_restart",
            "description": "Restart a Linux service",
            "risk": "Low",
            "used": 89
          }
        ]
      }
    ]
  }
}
```

### 7.3 Test Tool Connection
**Endpoint:** `POST /api/tools/profiles/{profileName}/test`

**Purpose:** Test a tool connection

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "connected": true,
    "latency": "142ms",
    "message": "Connection successful"
  }
}
```

---

## 8. Knowledge Engine APIs

### 8.1 Get Similar Incidents
**Endpoint:** `GET /api/knowledge/similar-incidents`

**Purpose:** Get historically similar incidents for context

**Query Parameters:**
- `incidentId` (required): Current incident ID
- `limit` (optional): Number of results (default: 5)

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "incidents": [
      {
        "id": "INC0012601",
        "title": "MID Server Service Down — prod-mid-06",
        "similarity": 0.92,
        "resolutionTime": "6m 20s",
        "successRate": 92.3,
        "lastOccurrence": "3 weeks ago"
      }
    ]
  }
}
```

### 8.2 Get Historical Context
**Endpoint:** `GET /api/knowledge/context`

**Purpose:** Get historical context for decision making

**Query Parameters:**
- `incidentType` (required): Type of incident
- `timeRange` (optional): "30d", "90d", "1y"

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "incidentType": "MID Server Service Down",
    "totalOccurrences": 23,
    "successRate": 92.3,
    "avgResolutionTime": "6m 20s",
    "commonRootCauses": [
      {
        "cause": "JVM memory exhaustion",
        "frequency": 8,
        "resolution": "Increase JVM heap size"
      }
    ]
  }
}
```

---

## 9. ServiceNow Integration APIs

### 9.1 Get Incident Details from ServiceNow
**Endpoint:** `GET /api/servicenow/incidents/{incidentId}`

**Purpose:** Fetch incident data from ServiceNow

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "id": "INC0012823",
    "shortDescription": "ECC Queue backlog — thread exhaustion on prod-mid-09",
    "description": "MID Server prod-mid-09 has 247 ECC Queue records stuck...",
    "category": "Software",
    "subcategory": "Memory",
    "impact": "1 - High",
    "urgency": "1 - High",
    "priority": "1 - Critical",
    "configItem": "prod-mid-09",
    "assignmentGroup": "MID Server Administration",
    "state": "open",
    "createdOn": "2024-04-14T10:42:00Z",
    "updatedOn": "2024-04-14T11:15:00Z",
    "relatedIncidents": [
      {
        "id": "INC0012743",
        "description": "MID Server Service Down"
      }
    ],
    "relatedChanges": [
      {
        "id": "CHG0004521",
        "description": "Instance patch: Vancouver → Washington"
      }
    ]
  }
}
```

### 9.2 Create/Update Incident in ServiceNow
**Endpoint:** `POST /api/servicenow/incidents`

**Purpose:** Create or update an incident in ServiceNow

**Request Body:**
```json
{
  "id": "INC0012823",
  "shortDescription": "MID Server pod memory optimized",
  "description": "Increased JVM memory from 2GB to 4GB. Issue resolved.",
  "state": "resolved",
  "closureNotes": "ServiceNow MID Server Agent performed automated remediation: increased JVM heap size and thread limits. ECC Queue now processing normally.",
  "closureCode": "Resolved by Automation"
}
```

**Sample Response:**
```json
{
  "status": "success",
  "message": "Incident updated in ServiceNow",
  "data": {
    "id": "INC0012823",
    "status": "resolved"
  }
}
```

### 9.3 Get ServiceNow Change Requests
**Endpoint:** `GET /api/servicenow/changes`

**Purpose:** Get change requests related to incidents

**Query Parameters:**
- `incidentId` (optional): Filter by related incident
- `state` (optional): "pending", "approved", "rejected"

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "changes": [
      {
        "id": "CHG0004521",
        "title": "Increase memory limits on prod-mid-09",
        "description": "JVM memory increase from 2GB to 4GB",
        "state": "approved",
        "approvalState": "approved",
        "type": "Standard",
        "relatedIncidents": ["INC0012823"]
      }
    ]
  }
}
```

---

## 10. Settings & Configuration APIs

### 10.1 Get User Settings
**Endpoint:** `GET /api/settings/user`

**Purpose:** Get user-specific settings and preferences

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "userId": "user-123",
    "email": "engineer@company.com",
    "notificationPreferences": {
      "slack": true,
      "email": true,
      "pagerduty": true
    },
    "autoRefresh": true,
    "refreshInterval": 30,
    "theme": "dark"
  }
}
```

### 10.2 Get System Settings
**Endpoint:** `GET /api/settings/system`

**Purpose:** Get system-wide configuration

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "autoExecuteThreshold": 85,
    "maxConcurrentActions": 10,
    "approvalRequired": {
      "production": true,
      "staging": false,
      "development": false
    },
    "alerting": {
      "enabled": true,
      "channels": ["slack", "pagerduty"]
    }
  }
}
```

### 10.3 Update Settings
**Endpoint:** `PUT /api/settings/{setting}`

**Purpose:** Update configuration settings

**Request Body:**
```json
{
  "autoExecuteThreshold": 90,
  "maxConcurrentActions": 15
}
```

**Sample Response:**
```json
{
  "status": "success",
  "message": "Settings updated"
}
```

---

## 11. Blast Radius / Impact Analysis APIs

### 11.1 Get Blast Radius Analysis
**Endpoint:** `GET /api/blast-radius/{incidentId}`

**Purpose:** Get impact analysis for a remediation action

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "incidentId": "INC0012823",
    "directlyAffected": {
      "services": ["MID Server prod-mid-09"],
      "count": 1
    },
    "downstreamServices": {
      "services": ["Discovery schedules", "JDBC integrations"],
      "count": 15,
      "estimatedDowntime": "~120s"
    },
    "estimatedImpact": {
      "users": 250,
      "dataFlows": 12
    },
    "riskLevel": "medium"
  }
}
```

---

## 12. Authentication & Authorization APIs

### 12.1 Login
**Endpoint:** `POST /api/auth/login`

**Request Body:**
```json
{
  "email": "user@company.com",
  "password": "password123"
}
```

**Sample Response:**
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "user-123",
      "email": "user@company.com",
      "role": "operator"
    }
  }
}
```

### 12.2 Logout
**Endpoint:** `POST /api/auth/logout`

**Sample Response:**
```json
{
  "status": "success",
  "message": "Logged out successfully"
}
```

---

## Error Response Format

All endpoints should return errors in the following format:

```json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional error details"
  }
}
```

### Common Error Codes:
- `UNAUTHORIZED`: User not authenticated
- `FORBIDDEN`: User lacks required permissions
- `NOT_FOUND`: Resource not found
- `VALIDATION_ERROR`: Invalid request data
- `CONFLICT`: Resource already exists
- `INTERNAL_ERROR`: Server error
- `SERVICE_UNAVAILABLE`: External service unavailable

---

## Pagination

For endpoints returning lists, use the following pagination format:

```json
{
  "status": "success",
  "data": {
    "items": [...],
    "total": 100,
    "limit": 20,
    "offset": 0,
    "hasMore": true
  }
}
```

---

## WebSocket Real-time Updates (Optional)

For real-time updates, implement WebSocket endpoints:

### Connection
**Endpoint:** `wss://api.company.com/ws`

### Subscribe to Action Updates
```json
{
  "action": "subscribe",
  "channel": "actions",
  "filter": {"status": "executing"}
}
```

### Message Format
```json
{
  "type": "action_updated",
  "data": {
    "actionId": "ACT-001",
    "status": "completed",
    "progress": 100
  }
}
```

---

## Rate Limiting

- **Limit**: 1000 requests per minute per user
- **Headers**: 
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Authentication

All requests (except auth endpoints) must include:

```
Authorization: Bearer {token}
Content-Type: application/json
```

---

## API Base URL

```
https://api.autoops.company.com/v1
```

---

**Document Version**: 1.0
**Last Updated**: 2024-04-14
**Status**: Ready for Backend Implementation
