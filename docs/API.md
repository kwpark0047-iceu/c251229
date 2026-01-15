# API Documentation

## Floor Plan Service (`src/app/floor-plans/floor-plan-service.ts`)

### `getFloorPlansByLine(lineNumber, planType)`
Fetches floor plans for a specific metro line.
- **lineNumber**: `MetroLine` (e.g., '1', '2')
- **planType**: `PlanType` (optional)
- **Returns**: `Promise<FloorPlan[]>`

### `getFloorPlanByStation(stationName, lineNumber, planType)`
Fetches a specific floor plan by station name.
- **Returns**: `Promise<FloorPlan | null>`

### `saveFloorPlan(input)`
Upserts a floor plan record.
- **input**: `FloorPlanInput`
- **Returns**: `Promise<FloorPlan>`

### `getAdPositionsByFloorPlan(floorPlanId)`
Fetches ad positions for a specific floor plan.
- **floorPlanId**: `string`
- **Returns**: `Promise<AdPosition[]>`

### `linkPositionToInventory(positionId, inventoryId)`
Links an ad position to an inventory item.
- **positionId**: `string`
- **inventoryId**: `string`
- **Returns**: `Promise<void>`

## Inventory Service (`src/app/lead-manager/inventory-service.ts`)

### `getInventory(filters?)`
Fetches ad inventory items with optional filters.
- **filters**: `{ stationName?, adType?, availabilityStatus? }` (optional)
- **Returns**: `Promise<AdInventory[]>`

### `createInventory(inventory)`
Creates a new inventory item.
- **inventory**: `Omit<AdInventory, 'id' | 'createdAt' | 'updatedAt'>`
- **Returns**: `Promise<{ success: boolean; inventory?: AdInventory; message: string }>`

### `updateInventory(id, updates)`
Updates an existing inventory item.
- **id**: `string`
- **updates**: `Partial<AdInventory>`
- **Returns**: `Promise<{ success: boolean; message: string }>`

### `deleteInventory(id)`
Deletes an inventory item.
- **id**: `string`
- **Returns**: `Promise<{ success: boolean; message: string }>`

### `parseInventoryExcel(buffer, defaultMediaType?)`
Parses Excel file and extracts inventory data.
- **buffer**: `ArrayBuffer`
- **defaultMediaType**: `string` (optional)
- **Returns**: `Promise<ExcelInventoryRow[]>`

### `uploadInventoryExcel(file)`
Uploads and processes Excel file for bulk inventory import.
- **file**: `File`
- **Returns**: `Promise<ExcelUploadResult>`

### `findInventoryForLead(lead)`
Finds available inventory items near a lead's location.
- **lead**: `Lead`
- **Returns**: `Promise<AdInventory[]>`

## Lead Service (`src/app/lead-manager/supabase-service.ts`)

### `getLeads(filters?)`
Fetches leads with optional filters.
- **filters**: `{ category?, regions? }` (optional)
- **Returns**: `Promise<{ success: boolean; leads: Lead[] }>`

### `saveLeads(leads, onProgress?)`
Saves multiple leads in batch.
- **leads**: `Lead[]`
- **onProgress**: `(current: number, total: number, status: string) => void` (optional)
- **Returns**: `Promise<{ success: boolean; message: string }>`

### `updateLeadStatus(leadId, status)`
Updates a lead's status.
- **leadId**: `string`
- **status**: `LeadStatus`
- **Returns**: `Promise<{ success: boolean; message: string; assignedToName?: string }>`

## CRM Service (`src/app/lead-manager/crm-service.ts`)

### `logCall(leadId, outcome, options?)`
Logs a call record for a lead.
- **leadId**: `string`
- **outcome**: `CallOutcome`
- **options**: `{ durationSeconds?, contactPerson?, notes?, nextAction?, nextContactDate? }` (optional)
- **Returns**: `Promise<{ success: boolean; callLog?: CallLog; message: string }>`

### `getCallLogs(leadId)`
Fetches call logs for a lead.
- **leadId**: `string`
- **Returns**: `Promise<CallLog[]>`

### `getTodayCallbacks()`
Fetches leads with callbacks scheduled for today.
- **Returns**: `Promise<Array<{ callLog: CallLog; lead: Lead }>>`

### `getProgress(leadId)`
Fetches sales progress for a lead.
- **leadId**: `string`
- **Returns**: `Promise<SalesProgress[]>`

## Proposal Service (`src/app/lead-manager/proposal-service.ts`)

### `createProposal(leadId, inventoryIds, options?)`
Creates a new proposal.
- **leadId**: `string`
- **inventoryIds**: `string[]`
- **options**: `{ title?, greetingMessage?, discountRate? }` (optional)
- **Returns**: `Promise<{ success: boolean; proposal?: Proposal; message: string }>`

### `getProposals(leadId?, status?)`
Fetches proposals with optional filters.
- **leadId**: `string` (optional)
- **status**: `ProposalStatus` (optional)
- **Returns**: `Promise<Proposal[]>`

### `generateProposalPDF(proposalId)`
Generates PDF for a proposal.
- **proposalId**: `string`
- **Returns**: `Promise<{ success: boolean; pdfBlob?: Blob; bizName?: string; message: string }>`

### `downloadProposalPDF(proposalId)`
Downloads PDF for a proposal.
- **proposalId**: `string`
- **Returns**: `Promise<boolean>`

## Task Service (`src/app/lead-manager/task-service.ts`)

### `getTasks(filters?)`
Fetches tasks with optional filters.
- **filters**: `{ status?, priority?, taskType?, assignee?, dateFrom?, dateTo? }` (optional)
- **Returns**: `Promise<TaskWithLead[]>`

### `createTask(task)`
Creates a new task.
- **task**: `Omit<Task, 'id' | 'createdAt' | 'updatedAt'>`
- **Returns**: `Promise<Task | null>`

### `updateTaskStatus(id, status)`
Updates a task's status.
- **id**: `string`
- **status**: `TaskStatus`
- **Returns**: `Promise<boolean>`

### `getCalendarEvents(dateFrom, dateTo)`
Fetches calendar events (tasks + callbacks) for a date range.
- **dateFrom**: `string` (YYYY-MM-DD)
- **dateTo**: `string` (YYYY-MM-DD)
- **Returns**: `Promise<CalendarEvent[]>`
