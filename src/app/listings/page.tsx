import ListingsPage from "./page-client";

export const metadata = {
  title: "Listings | BrandArmor",
  description: "Candidate marketplace listings prepared for evidence-backed review.",
};

export default function Page() {
  return <ListingsPage initialListings={[]} initialScores={[]} />;
}
