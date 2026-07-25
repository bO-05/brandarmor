import BrandDetailPage from "./page-client";

export const metadata = {
  title: "Brand Detail | BrandArmor",
  description: "Manage product baselines for a BrandArmor brand.",
};

export default function Page({ params }: { params: { id: string } }) {
  return <BrandDetailPage brandId={params.id} initialBrand={null} initialProducts={[]} />;
}
