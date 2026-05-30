import BrandsPage from "./page-client";
import { getBrands } from "@/persistence/store";

export const metadata = {
  title: "Brand Baselines | BrandArmor",
  description: "Manage brand and product truth used for listing evidence review.",
};

export default function Page() {
  return <BrandsPage initialBrands={getBrands()} />;
}
