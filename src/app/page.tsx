import { getStoreData } from "@/lib/storage";
import CustomerStorefront from "@/components/CustomerStorefront";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const storeData = await getStoreData();
  return <CustomerStorefront initialData={storeData} />;
}
