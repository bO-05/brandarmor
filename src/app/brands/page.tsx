import React from "react";
import BrandsPage from "./page-client";
import { ensureDemoSeeded } from "@/persistence/auto-seed";
import { getBrands } from "@/persistence/store";

export const metadata = {
  title: "Brand Baselines | BrandArmor",
  description: "Manage brand and product truth used for listing evidence review.",
};

export default function Page() {
  ensureDemoSeeded();
  return React.createElement(BrandsPage, { initialBrands: getBrands() });
}
