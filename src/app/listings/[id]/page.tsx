import PilotListingDetail from "./pilot-detail";

export const metadata = {
  title: "Listing Workspace | BrandArmor",
  description: "Listing evidence workspace for review routing and human decisions.",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PilotListingDetail listingId={id} />;
}
