"use client";

import { useState } from "react";
import { AssignmentPanel } from "./assignment-panel";
import { GuideGeneratorPanel } from "./guide-generator-panel";
import type { RoleGuide, RoleStatus } from "@/lib/roles";

// Lifts role status above both panels so the assignment panel activates the
// moment guide generation succeeds — no full page reload needed.
type RoleDetailPanelsProps = {
  roleId: string;
  roleName: string;
  initialStatus: RoleStatus;
  initialGuide: RoleGuide | null;
};

export function RoleDetailPanels({
  roleId,
  roleName,
  initialStatus,
  initialGuide,
}: RoleDetailPanelsProps) {
  const [status, setStatus] = useState<RoleStatus>(initialStatus);

  return (
    <>
      <GuideGeneratorPanel
        roleId={roleId}
        roleName={roleName}
        roleStatus={status}
        initialGuide={initialGuide}
        onStatusUpdated={setStatus}
      />
      <AssignmentPanel roleId={roleId} roleStatus={status} />
    </>
  );
}
