import ListingsPage from "./page-client";
import { getListings, getScores } from "@/persistence/store";
import { ensureDemoSeeded } from "@/persistence/auto-seed";

export const metadata = {
  title: "Listings | BrandArmor",
  description: "Candidate marketplace listings prepared for evidence-backed review.",
};

export default function Page() {
  ensureDemoSeeded();
  return <ListingsPage initialListings={getListings()} initialScores={getScores()} />;
}
