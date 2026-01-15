# Component Documentation

## Floor Plans Components

### `LineSelector`
Selects a metro line from the available options.
- **Props**:
    - `selectedLine`: `MetroLine`
    - `onLineChange`: `(line: MetroLine) => void`
    - `planCounts`: `Record<MetroLine, { station_layout: number; psd: number }>`

### `FloorPlanViewer`
Displays floor plan image with zoom/pan and ad position markers.
- **Props**:
    - `plan`: `FloorPlan | null`
    - `adPositions`: `AdPosition[]` (optional)
    - `onDownload`: `(plan: FloorPlan) => void` (optional)
    - `onPositionClick`: `(position: AdPosition) => void` (optional)
    - `isEditing`: `boolean` (optional)
    - `onAddPosition`: `(x: number, y: number) => void` (optional)

### `AdPositionDetailModal`
Displays details for a specific ad position.
- **Props**:
    - `isOpen`: `boolean`
    - `onClose`: `() => void`
    - `position`: `AdPosition | null`

### `StationList`
Lists stations for a selected metro line.
- **Props**:
    - `stations`: `FloorPlan[]`
    - `selectedPlan`: `FloorPlan | null`
    - `onSelectPlan`: `(plan: FloorPlan) => void`
    - `searchQuery`: `string` (optional)

## Lead Manager Components

### `GridView`
Displays leads in a grid/card layout.
- **Props**:
    - `leads`: `Lead[]`
    - `onStatusChange`: `(leadId: string, status: LeadStatus) => void`
    - `searchQuery`: `string` (optional)
    - `onMapView`: `(lead: Lead) => void` (optional)
    - `progressMap`: `Map<string, SalesProgress[]>` (optional)

### `ListView`
Displays leads in a table layout with sorting.
- **Props**:
    - `leads`: `Lead[]`
    - `onStatusChange`: `(leadId: string, status: LeadStatus) => void`
    - `searchQuery`: `string` (optional)
    - `onMapView`: `(lead: Lead) => void` (optional)
    - `progressMap`: `Map<string, SalesProgress[]>` (optional)

### `MapView`
Displays leads on a Leaflet map.
- **Props**:
    - `leads`: `Lead[]`
    - `onStatusChange`: `(leadId: string, status: LeadStatus) => void`
    - `onListView`: `() => void`
    - `focusLead`: `Lead | null` (optional)
    - `onFocusClear`: `() => void` (optional)

### `StatsDashboard`
Displays lead statistics dashboard.
- **Props**:
    - `leads`: `Lead[]`
    - `isExpanded`: `boolean`
    - `onToggle`: `() => void`

### `LeadDetailPanel`
Displays detailed information about a lead with CRM features.
- **Props**:
    - `leadId`: `string`
    - `onClose`: `() => void`
    - `onStatusChange`: `() => void` (optional)

### `CallLogModal`
Modal for adding/editing call logs.
- **Props**:
    - `leadId`: `string`
    - `leadName`: `string`
    - `phone`: `string` (optional)
    - `onClose`: `() => void`
    - `onSuccess`: `() => void` (optional)

### `ProgressChecklist`
Displays and manages sales progress checklist.
- **Props**:
    - `leadId`: `string`
    - `onUpdate`: `() => void` (optional)

### `CallbackNotification`
Displays notification for scheduled callbacks.
- **Props**:
    - `onDismiss`: `() => void` (optional)
    - `onLeadClick`: `(leadId: string) => void` (optional)

## Inventory Components

### `InventoryTable`
Displays ad inventory in a table with filtering.
- **Props**:
    - `onRefresh`: `() => void` (optional)

### `InventoryUploadModal`
Modal for uploading inventory via Excel file.
- **Props**:
    - `onClose`: `() => void`
    - `onSuccess`: `() => void` (optional)

## Schedule Components

### `ScheduleCalendar`
Monthly calendar view for tasks and callbacks.
- **Props**:
    - `onDateSelect`: `(date: string) => void` (optional)
    - `onEventClick`: `(event: CalendarEvent) => void` (optional)
    - `onAddTask`: `(date: string) => void` (optional)

### `TaskBoard`
Kanban board view for tasks.
- **Props**:
    - `onTaskClick`: `(task: TaskWithLead) => void` (optional)

### `TaskFormModal`
Modal for creating/editing tasks.
- **Props**:
    - `task`: `TaskWithLead | null` (optional, for editing)
    - `defaultDate`: `string` (optional)
    - `onSave`: `() => void`
    - `onClose`: `() => void`
