import BrandDetailPage from "./page-client";

export const metadata = {
  title: "Brand Detail | BrandArmor",
  description: "Manage product baselines for a BrandArmor brand.",
};

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BrandDetailPage brandId={id} initialBrand={null} initialProducts={[]} />;
}
