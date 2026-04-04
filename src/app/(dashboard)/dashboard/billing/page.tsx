import { getBillingPageData } from "./actions";
import { BillingClient } from "./billing-client";

export default async function BillingPage() {
  const data = await getBillingPageData();
  return <BillingClient data={data} />;
}
