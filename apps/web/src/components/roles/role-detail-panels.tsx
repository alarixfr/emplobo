"use client";

import { useState } from "react";
import { AssignmentPanel } from "./assignment-panel";
import { GuideGeneratorPanel } from "./guide-generator-panel";
import { Reveal } from "@/components/motion/reveal";
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
      <Reveal y={18} x={0} delay={0} duration={0.7}>
        <GuideGeneratorPanel
          roleId={roleId}
          roleName={roleName}
          roleStatus={status}
          initialGuide={initialGuide}
          onStatusUpdated={setStatus}
        />
      </Reveal>
      <Reveal y={18} x={0} delay={0.06} duration={0.7}>
        <AssignmentPanel roleId={roleId} roleStatus={status} />
      </Reveal>
    </>
  );
}
