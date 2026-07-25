use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DaemonStatus {
    pub status: String,
    pub port: u16,
    pub url: Option<String>,
    pub pid: u32,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct AppSetting {
    pub key: String,
    pub value: String,
}

// 🔥 1. FULLY EXPANDED PROJECTS TABLE
#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Project {
    pub id: String,
    pub name: Option<String>,
    pub code: Option<String>,
    #[sqlx(rename = "clientname")]
    #[serde(rename = "clientName")]
    pub client_name: Option<String>,
    pub status: Option<String>,
    pub region: Option<String>,
    #[sqlx(rename = "projectlead")]
    #[serde(rename = "projectLead")]
    pub project_lead: Option<String>,
    #[sqlx(rename = "sitesupervisor")]
    #[serde(rename = "siteSupervisor")]
    pub site_supervisor: Option<String>,
    pub pmc: Option<String>,
    pub architect: Option<String>,
    #[sqlx(rename = "structuralengineer")]
    #[serde(rename = "structuralEngineer")]
    pub structural_engineer: Option<String>,
    #[sqlx(rename = "ispricelocked")]
    #[serde(rename = "isPriceLocked")]
    pub is_price_locked: Option<i64>,
    #[sqlx(rename = "dailylogs")]
    #[serde(rename = "dailyLogs")]
    pub daily_logs: Option<String>,
    #[sqlx(rename = "actualresources")]
    #[serde(rename = "actualResources")]
    pub actual_resources: Option<String>,
    #[sqlx(rename = "gantttasks")]
    #[serde(rename = "ganttTasks")]
    pub gantt_tasks: Option<String>,
    pub subcontractors: Option<String>,
    #[sqlx(rename = "phaseassignments")]
    #[serde(rename = "phaseAssignments")]
    pub phase_assignments: Option<String>,
    #[sqlx(rename = "createdat")]
    #[serde(rename = "createdAt")]
    pub created_at: Option<i64>,
    #[sqlx(rename = "rabills")]
    #[serde(rename = "raBills")]
    pub ra_bills: Option<String>,
    #[sqlx(rename = "purchaseorders")]
    #[serde(rename = "purchaseOrders")]
    pub purchase_orders: Option<String>,
    #[sqlx(rename = "materialrequests")]
    #[serde(rename = "materialRequests")]
    pub material_requests: Option<String>,
    pub grns: Option<String>,
    #[sqlx(rename = "type")]
    #[serde(rename = "type")]
    pub project_type: Option<String>,
    pub location: Option<String>,
    #[sqlx(rename = "isscaffolded")]
    #[serde(rename = "isScaffolded")]
    pub is_scaffolded: Option<i64>,
    #[sqlx(rename = "scaffoldpath")]
    #[serde(rename = "scaffoldPath")]
    pub scaffold_path: Option<String>,
    #[sqlx(rename = "ismanuallylinked")]
    #[serde(rename = "isManuallyLinked")]
    pub is_manually_linked: Option<i64>,
    #[sqlx(rename = "dailyschedules")]
    #[serde(rename = "dailySchedules")]
    pub daily_schedules: Option<String>,
    #[sqlx(rename = "resourcetrackingmode")]
    #[serde(rename = "resourceTrackingMode")]
    pub resource_tracking_mode: Option<String>,
    #[sqlx(rename = "assignedstaff")]
    #[serde(rename = "assignedStaff")]
    pub assigned_staff: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Staff {
    pub id: String,
    pub name: Option<String>,
    pub designation: Option<String>,
    pub department: Option<String>,
    pub status: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    #[sqlx(rename = "createdat")]
    #[serde(rename = "createdAt")]
    pub created_at: Option<i64>,
    pub username: Option<String>,
    pub password: Option<String>,
    pub role: Option<String>,
    #[sqlx(rename = "accesslevel")]
    #[serde(rename = "accessLevel")]
    pub access_level: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Message {
    pub id: String,
    #[sqlx(rename = "projectid")]
    #[serde(rename = "projectId")]
    pub project_id: Option<String>,
    #[sqlx(rename = "senderid")]
    #[serde(rename = "senderId")]
    pub sender_id: Option<String>,
    pub content: Option<String>,
    #[sqlx(rename = "replytoid")]
    #[serde(rename = "replyToId")]
    pub reply_to_id: Option<String>,
    #[sqlx(rename = "createdat")]
    #[serde(rename = "createdAt")]
    pub created_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct PrivateMessage {
    pub id: String,
    #[sqlx(rename = "senderid")]
    #[serde(rename = "senderId")]
    pub sender_id: Option<String>,
    #[sqlx(rename = "receiverid")]
    #[serde(rename = "receiverId")]
    pub receiver_id: Option<String>,
    pub content: Option<String>,
    #[sqlx(rename = "replytoid")]
    #[serde(rename = "replyToId")]
    pub reply_to_id: Option<String>,
    #[sqlx(rename = "createdat")]
    #[serde(rename = "createdAt")]
    pub created_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct ProjectDocument {
    pub id: String,
    #[sqlx(rename = "projectid")]
    #[serde(rename = "projectId")]
    pub project_id: Option<String>,
    pub name: Option<String>,
    pub category: Option<String>,
    #[sqlx(rename = "filepath")]
    #[serde(rename = "filePath")]
    pub file_path: Option<String>,
    #[sqlx(rename = "filetype")]
    #[serde(rename = "fileType")]
    pub file_type: Option<String>,
    #[sqlx(rename = "addedat")]
    #[serde(rename = "addedAt")]
    pub added_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct ProjectBoq {
    pub id: String,
    #[sqlx(rename = "projectid")]
    #[serde(rename = "projectId")]
    pub project_id: Option<String>,
    #[sqlx(rename = "masterboqid")]
    #[serde(rename = "masterBoqId")]
    pub master_boq_id: Option<String>,
    #[sqlx(rename = "slno")]
    #[serde(rename = "slNo")]
    pub sl_no: Option<i64>,
    #[sqlx(rename = "iscustom")]
    #[serde(rename = "isCustom")]
    pub is_custom: Option<i64>,
    #[sqlx(rename = "itemcode")]
    #[serde(rename = "itemCode")]
    pub item_code: Option<String>,
    pub description: Option<String>,
    pub unit: Option<String>,
    pub rate: Option<f64>,
    #[sqlx(rename = "formulastr")]
    #[serde(rename = "formulaStr")]
    pub formula_str: Option<String>,
    pub qty: Option<f64>,
    pub measurements: Option<String>,
    pub phase: Option<String>,
    #[sqlx(rename = "lockedrate")]
    #[serde(rename = "lockedRate")]
    pub locked_rate: Option<f64>,
}

// 7. REGIONS, RESOURCES, CONTACTS, MASTER BOQ (Unchanged)
#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Region {
    pub id: String,
    pub name: String,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct Resource {
    pub id: String,
    pub code: Option<String>,
    pub description: Option<String>,
    pub unit: Option<String>,
    pub rates: Option<String>,
    #[sqlx(rename = "ratehistory")]
    #[serde(rename = "rateHistory")]
    pub rate_history: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct MasterBoq {
    pub id: String,
    #[sqlx(rename = "itemcode")]
    #[serde(rename = "itemCode")]
    pub item_code: Option<String>,
    pub description: Option<String>,
    pub unit: Option<String>,
    pub overhead: Option<f64>,
    pub profit: Option<f64>,
    pub components: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct CrmContact {
    pub id: String,
    pub name: Option<String>,
    pub company: Option<String>,
    #[sqlx(rename = "type")]
    #[serde(rename = "type")]
    pub contact_type: Option<String>,
    pub status: Option<String>,
    pub email: Option<String>,
    pub phone: Option<String>,
    #[sqlx(rename = "createdat")]
    #[serde(rename = "createdAt")]
    pub created_at: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone, FromRow)]
pub struct WorkLog {
    pub id: String,
    pub date: Option<String>,
    #[sqlx(rename = "staffid")]
    #[serde(rename = "staffId")]
    pub staff_id: Option<String>,
    #[sqlx(rename = "slno")]
    #[serde(rename = "slNo")]
    pub sl_no: Option<i64>,
    #[sqlx(rename = "projectid")]
    #[serde(rename = "projectId")]
    pub project_id: Option<String>,
    pub details: Option<String>,
    pub remarks: Option<String>,
    pub status: Option<String>,
    pub duration_minutes: i32,
    pub work_category: String,
    #[sqlx(rename = "createdat")]
    #[serde(rename = "createdAt")]
    pub created_at: Option<i64>,
}
