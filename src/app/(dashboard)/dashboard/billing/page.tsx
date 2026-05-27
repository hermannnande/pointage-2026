import { Suspense } from "react";

import { getBillingPageData } from "./actions";
import { BillingClient } from "./billing-client";

export default async function BillingPage() {
  const data = await getBillingPageData();
  return (
    <Suspense fallback={null}>
      <BillingClient data={data} />
    </Suspense>
  );
}
