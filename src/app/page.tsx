import type { Metadata } from "next";
import { getStoreData } from "@/lib/storage";
import CustomerStorefront from "@/components/CustomerStorefront";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const storeData = await getStoreData();
  return {
    title: storeData.store.storeName,
    description: storeData.store.tagline,
  };
}

export default async function HomePage() {
  const storeData = await getStoreData();
  return <CustomerStorefront initialData={storeData} />;
}
