import { Bell } from "lucide-react";

import { EmptyState } from "@/components/common/empty-state";
import { PageHeader } from "@/components/common/page-header";

export default function NotificationsPage() {
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Vos alertes et messages"
      />
      <EmptyState
        icon={Bell}
        title="Aucune notification"
        description="Vous n'avez aucune notification pour le moment."
      />
    </>
  );
}
