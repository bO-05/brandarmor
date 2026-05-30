import ListingsPage from "./page-client";
import { getListings, getScores } from "@/persistence/store";

export const metadata = {
  title: "Listings | BrandArmor",
  description: "Candidate marketplace listings prepared for evidence-backed review.",
};

export default function Page() {
  return <ListingsPage initialListings={getListings()} initialScores={getScores()} />;
}
