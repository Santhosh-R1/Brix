import Dexie from 'dexie';

export const db = new Dexie('ConstructionAppDB');

db.version(4).stores({
    projects: 'id, name, code, status, createdAt',
    projectBoq: 'id, projectId, masterBoqId, slNo, phase',
    masterBoq: 'id, itemCode',
    resources: 'id, code, type',
    regions: 'id, name',
    crmContacts: 'id, name, company, type, status, createdAt',
    orgStaff: 'id, name, designation, department, status, createdAt', 
    kanbanTasks: 'id, projectId, boqItemId, status, priority, assigneeId'
});