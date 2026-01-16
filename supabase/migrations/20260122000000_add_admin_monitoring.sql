-- Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email TEXT,
  action_type TEXT NOT NULL, -- e.g., 'LOGIN', 'CREATE_PROPOSAL', 'DELETE_LEAD'
  entity_id UUID, -- Optional: ID of the affected object (lead_id, proposal_id, etc.)
  details JSONB DEFAULT '{}'::jsonb,
  organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add permissions column to organization_members
ALTER TABLE organization_members 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{"can_export": true, "can_delete_lead": false, "can_view_sensitive": false}'::jsonb;

-- Enable RLS for activity_logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Admin/Owner can view all logs in their organization
CREATE POLICY "Admins can view all logs" 
ON activity_logs FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM organization_members
    WHERE organization_members.user_id = auth.uid()
    AND organization_members.organization_id = activity_logs.organization_id
    AND organization_members.role IN ('owner', 'admin')
  )
);

-- Policy: Users can insert logs (for their own actions)
CREATE POLICY "Users can insert logs" 
ON activity_logs FOR INSERT 
WITH CHECK (
  auth.uid() = user_id
);

-- Update Policy for organization_members (for permissions)
-- Only Owner/Admin can update other members' permissions
CREATE POLICY "Admins can update member permissions"
ON organization_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM organization_members requester
    WHERE requester.user_id = auth.uid()
    AND requester.organization_id = organization_members.organization_id
    AND requester.role IN ('owner', 'admin')
  )
);
