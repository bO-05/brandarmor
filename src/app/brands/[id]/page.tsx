import BrandDetailPage from "./page-client";
import { getBrand, getProducts } from "@/persistence/store";

export const metadata = {
  title: "Brand Detail | BrandArmor",
  description: "Manage product baselines for a BrandArmor brand.",
};

export default function Page({ params }: { params: { id: string } }) {
  return <BrandDetailPage brandId={params.id} initialBrand={getBrand(params.id) ?? null} initialProducts={getProducts(params.id)} />;
}
