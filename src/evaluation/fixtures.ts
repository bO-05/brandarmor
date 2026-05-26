// BrandArmor v4 — Evaluation Seed Fixtures
// 50 labeled Indonesian cosmetic marketplace listings for precision/recall benchmarking.
// Drop into src/evaluation/fixtures.ts (replaces existing 7-case stub) or import from
// src/evaluation/seed-listings.ts and re-export from src/evaluation/index.ts.
//
// Label distribution:
//   legitimate          → 15  (authorized seller, correct MSRP, valid BPOM)
//   counterfeit         → 15  (≥60% price drop OR "KW"/"replika" OR fake NIE)
//   likely_counterfeit  →  8  (suspicious signals, not definitive)
//   gray_market_import  →  7  (cheap but real; parallel import / abroad-bought)
//   expired_or_unsafe   →  3  (NIE expired / share-in-jar no registration)
//   insufficient_evidence→ 2  (truly ambiguous)
// Total: 50

import type { InsertEvaluationCase } from "@/domain/schemas";

// ---------------------------------------------------------------------------
// PRODUCT BASELINES (informational — not inserted here, but documented for
// the evaluation team so signal thresholds are reproducible)
// ---------------------------------------------------------------------------
//
// B1  Somethinc
//     MSRP range: Rp 75,000–299,000 depending on SKU
//     Real BPOM NIE (Calm Down PHA Toner 100ml): NA18261203080
//     Authorized sellers: "Somethinc Official Store" (Shopee/Tokopedia/TikTok Shop)
//     Suspicious terms: share in jar, racikan, tanpa bpom, import
//     Counterfeit terms: kw, replika, grade aaa, super copy, tiruan
//
// B2  Wardah
//     MSRP range: Rp 25,000–189,000
//     BPOM NIE (Lightening Series Facial Wash): NA18141300043
//     Authorized sellers: "Wardah Official Store", "Paragon Corp Official"
//     Counterfeit terms: kw, palsu, grade aaa, replika
//
// B3  Avoskin
//     MSRP range: Rp 99,000–349,000
//     BPOM NIE (Your Skin Bae Retinol Toner): NA18200510073
//     Authorized sellers: "Avoskin Official Store", "avoskin.id"
//     Counterfeit terms: kw, palsu, replika
//
// B4  Batik Keris (fashion — no BPOM)
//     MSRP range: Rp 189,000–899,000
//     Authorized sellers: "Batik Keris Official", "Batik Keris Store"
//
// B5  Gula Aren Muria (craft food/cosmetic-adjacent)
//     MSRP: Rp 35,000/250g
//     Authorized sellers: "Gula Muria Original"

// ---------------------------------------------------------------------------
// HELPERS — deterministic timestamps spread across the last 30 days
// ---------------------------------------------------------------------------
// Base: 2026-05-18T00:00:00Z  (today per system clock)
// Offsets subtract 0–29 days in 2-day increments across the 50 listings.

function daysAgo(n: number, hour = 9, minute = 0): string {
  const d = new Date("2026-05-18T00:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

// Realistic Tokopedia/Shopee image CDN-like placeholders
const IMG = {
  // Somethinc
  stcOfficialToner: "https://images.tokopedia.net/img/somethinc/calm-down-toner-official-front.jpg",
  stcOfficialSerum: "https://images.tokopedia.net/img/somethinc/bright-indeed-serum-official.jpg",
  stcOfficialSpf: "https://images.tokopedia.net/img/somethinc/uv-boss-spf-official.jpg",
  stcSuspect1: "https://down-id.img.susercontent.com/file/sg-11134201-7rdxp-somethinc-kw-toner.jpg",
  stcSuspect2: "https://down-id.img.susercontent.com/file/sg-11134201-7rdxp-stc-replika-serum.jpg",
  stcGray1: "https://down-id.img.susercontent.com/file/sg-11134201-stc-import-thai.jpg",
  // Wardah
  wrdOfficialFacewash: "https://images.tokopedia.net/img/wardah/lightening-facial-wash-official.jpg",
  wrdOfficialFoundation: "https://images.tokopedia.net/img/wardah/exclusive-foundation-official.jpg",
  wrdSuspect1: "https://down-id.img.susercontent.com/file/sg-11134201-wardah-kw-facewash.jpg",
  wrdSuspect2: "https://down-id.img.susercontent.com/file/sg-11134201-wardah-grade-aaa.jpg",
  // Avoskin
  avoOfficialRetinol: "https://images.tokopedia.net/img/avoskin/your-skin-bae-retinol-official.jpg",
  avoOfficialToner: "https://images.tokopedia.net/img/avoskin/miraculous-refining-toner-official.jpg",
  avoSuspect1: "https://down-id.img.susercontent.com/file/sg-11134201-avoskin-kw-retinol.jpg",
  // Batik Keris
  bkOfficial1: "https://images.tokopedia.net/img/batik-keris/batik-parang-official.jpg",
  bkSuspect1: "https://down-id.img.susercontent.com/file/sg-11134201-batik-keris-replika.jpg",
  // Generic placeholders
  noImage: "",
};

// ---------------------------------------------------------------------------
// 15 LEGITIMATE listings
// ---------------------------------------------------------------------------

const LEGITIMATE: InsertEvaluationCase[] = [
  // L1 — Somethinc Calm Down PHA Toner, official Shopee store, correct NIE visible
  {
    title: "Somethinc Calm Down Toner with PHA 100ml BPOM NA18261203080 | Skincare Original",
    description:
      "Toner kulit sensitif dengan PHA, niacinamide & centella asiatica. BPOM terdaftar NA18261203080. Dikirim dari gudang official Somethinc Shopee.",
    price: 99000,
    currency: "IDR",
    sellerName: "Somethinc Official Store",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Somethinc-Calm-Down-PHA-Toner-100ml-i.12345678.9876543210",
    imageUrls: [IMG.stcOfficialToner],
    observedAt: daysAgo(0, 10, 15),
    groundTruth: "legitimate",
    notes:
      "Authorized seller. Price within MSRP range. Real BPOM NIE NA18261203080 in title. Strong positive signal.",
  },
  // L2 — Somethinc official Tokopedia
  {
    title: "Somethinc Bright Indeed Niacinamide + Tranexamic Acid Serum 20ml | OFFICIAL",
    description:
      "Serum brightening resmi Somethinc. Kemasan segel pabrik. Beli 2 gratis gift pouch. BPOM sudah terdaftar.",
    price: 132050,
    currency: "IDR",
    sellerName: "Somethinc Official Store",
    marketplace: "Tokopedia",
    listingUrl: "https://www.tokopedia.com/somethinc/bright-indeed-niacinamide-tranexamic-acid-serum-20ml",
    imageUrls: [IMG.stcOfficialSerum],
    observedAt: daysAgo(1, 9, 30),
    groundTruth: "legitimate",
    notes: "Authorized seller. Price aligns official Tokopedia page. No suspicious terms.",
  },
  // L3 — Somethinc UV Boss SPF, TikTok Shop LIVE sale — small discount still in range
  {
    title: "FLASH SALE TikTok LIVE Somethinc UV Boss SPF 35 PA+++ 30ml Original BPOM",
    description:
      "Flash sale live streaming harga spesial. Tetap harga resmi. Ready stock gudang Jakarta. Gratis ongkir.",
    price: 85000,
    currency: "IDR",
    sellerName: "Somethinc Official Store",
    marketplace: "TikTok Shop",
    listingUrl: "https://www.tiktok.com/t/somethinc-official/uv-boss-spf-flash-sale",
    imageUrls: [IMG.stcOfficialSpf],
    observedAt: daysAgo(2, 19, 0),
    groundTruth: "legitimate",
    notes: "TikTok Shop live-sale. Authorized account. Discounted but within normal promotional range.",
  },
  // L4 — Wardah Lightening Facial Wash, official Tokopedia
  {
    title: "Wardah Lightening Facial Wash 100ml Asli Original BPOM | Paragon Official",
    description:
      "Sabun pembersih wajah Wardah seri Lightening. BPOM NA18141300043. Tersedia di konter resmi dan online store Paragon.",
    price: 37000,
    currency: "IDR",
    sellerName: "Wardah Official Store",
    marketplace: "Tokopedia",
    listingUrl: "https://www.tokopedia.com/wardahofficial/wardah-lightening-facial-wash-100ml",
    imageUrls: [IMG.wrdOfficialFacewash],
    observedAt: daysAgo(3, 8, 45),
    groundTruth: "legitimate",
    notes: "Authorized Paragon/Wardah official Tokopedia account. Price matches shelf price.",
  },
  // L5 — Wardah Exclusive Foundation, official Shopee
  {
    title: "Wardah Exclusive Matte Finish Foundation No. 03 Natural 30ml BPOM Resmi",
    description:
      "Foundation wardah matte finish cocok untuk kulit berminyak. Tersedia shade 01-07. Produk original 100% dari official store Wardah.",
    price: 89000,
    currency: "IDR",
    sellerName: "Wardah Official Store",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Wardah-Exclusive-Matte-Foundation-30ml-i.11223344.1122334455",
    imageUrls: [IMG.wrdOfficialFoundation],
    observedAt: daysAgo(4, 11, 0),
    groundTruth: "legitimate",
    notes: "Authorized store. Correct price, complete product title, official imagery.",
  },
  // L6 — Avoskin Retinol Toner, official Tokopedia
  {
    title: "Avoskin Your Skin Bae Retinol 0.5% Toner 100ml BPOM NA18200510073 Original",
    description:
      "Retinol toner untuk anti-aging dan perbaikan tekstur kulit. BPOM terdaftar. Pengiriman same-day dari Yogyakarta.",
    price: 179000,
    currency: "IDR",
    sellerName: "Avoskin Official Store",
    marketplace: "Tokopedia",
    listingUrl: "https://www.tokopedia.com/avoskin/your-skin-bae-retinol-toner-100ml",
    imageUrls: [IMG.avoOfficialRetinol],
    observedAt: daysAgo(5, 10, 20),
    groundTruth: "legitimate",
    notes: "Authorized seller. BPOM NIE NA18200510073 in title. Price within official range.",
  },
  // L7 — Avoskin Miraculous Refining Toner, Avoskin.id website
  {
    title: "Avoskin Miraculous Refining Toner AHA BHA PHA 100ml | Avoskin.id Official",
    description:
      "Toner eksfoliasi triple-acid dari Avoskin. Kemasan baru 2025 tersedia. BPOM resmi. Pembelian langsung dari website brand.",
    price: 229000,
    currency: "IDR",
    sellerName: "avoskin.id",
    marketplace: "Tokopedia",
    listingUrl: "https://www.tokopedia.com/avoskinid/miraculous-refining-toner-aha-bha-pha-100ml",
    imageUrls: [IMG.avoOfficialToner],
    observedAt: daysAgo(6, 14, 0),
    groundTruth: "legitimate",
    notes: "avoskin.id is official brand-owned store. Price matches official store.",
  },
  // L8 — Wardah Facial Wash at authorized pharmacy chain
  {
    title: "Wardah Acnederm Facial Wash 60ml Ready Stock - Apotek K24 Official Shopee",
    description:
      "Facial wash khusus kulit berjerawat Wardah Acnederm. Dijual oleh apotek resmi berizin. Bpom aman.",
    price: 29000,
    currency: "IDR",
    sellerName: "Apotek K24 Official",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Wardah-Acnederm-Facial-Wash-60ml-i.55667788.5566778899",
    imageUrls: [IMG.wrdOfficialFacewash],
    observedAt: daysAgo(7, 9, 0),
    groundTruth: "legitimate",
    notes: "K24 is a nationally licensed pharmacy chain, an authorized reseller of Wardah. Price in range.",
  },
  // L9 — Somethinc Toner sold by authorized beauty multi-brand
  {
    title: "Somethinc Calm Down Toner 100ml - Sociolla RESMI free pouch",
    description:
      "Toner Somethinc tersedia di Sociolla platform kecantikan terpercaya. Produk bersegel. Ready stock.",
    price: 99000,
    currency: "IDR",
    sellerName: "Sociolla Official Store",
    marketplace: "Tokopedia",
    listingUrl: "https://www.tokopedia.com/sociolla/somethinc-calm-down-toner-100ml",
    imageUrls: [IMG.stcOfficialToner],
    observedAt: daysAgo(8, 13, 30),
    groundTruth: "legitimate",
    notes:
      "Sociolla is a licensed beauty platform in Indonesia. Authorized multichannel partner.",
  },
  // L10 — Batik Keris official store
  {
    title: "Batik Keris Solo Motif Parang Rusak Pria Lengan Panjang — ORIGINAL RESMI",
    description:
      "Batik premium katun prima motif Parang Rusak. Dijual langsung oleh toko resmi Batik Keris Surakarta. Cap & tulis asli.",
    price: 459000,
    currency: "IDR",
    sellerName: "Batik Keris Official",
    marketplace: "Tokopedia",
    listingUrl: "https://www.tokopedia.com/batikkerisofficial/batik-keris-parang-rusak-pria",
    imageUrls: [IMG.bkOfficial1],
    observedAt: daysAgo(9, 10, 0),
    groundTruth: "legitimate",
    notes: "Fashion category. Official Batik Keris brand store. Price in line with authentic range.",
  },
  // L11 — Avoskin Shopee authorized reseller
  {
    title: "Avoskin Your Skin Bae Retinol 0.5% Toner 100ml | BeautyHaul RESMI Shopee",
    description:
      "BeautyHaul adalah reseller resmi Avoskin di Shopee. Produk tersegel + invoice resmi.",
    price: 183000,
    currency: "IDR",
    sellerName: "BeautyHaul Official",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Avoskin-YSB-Retinol-Toner-100ml-i.98765432.1234567890",
    imageUrls: [IMG.avoOfficialRetinol],
    observedAt: daysAgo(10, 11, 15),
    groundTruth: "legitimate",
    notes: "BeautyHaul is a registered Avoskin authorized reseller. Slight markup vs. direct store — within tolerance.",
  },
  // L12 — Somethinc serum sold at correct price by verified seller
  {
    title: "Somethinc Bright Indeed Serum 20ml ORIGINAL 100% BPOM ✓ Ready Stock Jakarta",
    description:
      "Serum niacinamide + tranexamic acid. Pembelian sudah termasuk e-sertifikat keaslian. Dikirim bubble wrap.",
    price: 135000,
    currency: "IDR",
    sellerName: "@kosmetik_resmi_jkt",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Somethinc-Bright-Indeed-Serum-20ml-i.11111111.2222222222",
    imageUrls: [IMG.stcOfficialSerum],
    observedAt: daysAgo(11, 8, 0),
    groundTruth: "legitimate",
    notes: "Price within MSRP tolerance. No suspicious terms. Seller profile matches verified badge pattern.",
  },
  // L13 — Wardah Shopee mall (highest-confidence channel)
  {
    title: "Wardah Hydrating Aloe Vera Gel 100ml Shopee Mall ORIGINAL BPOM",
    description:
      "Gel lidah buaya Wardah multifungsi untuk wajah dan tubuh. Dari Wardah Shopee Mall — garansi resmi.",
    price: 45000,
    currency: "IDR",
    sellerName: "Wardah Official Store",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Wardah-Aloe-Vera-Gel-100ml-i.22334455.3344556677",
    imageUrls: [IMG.wrdOfficialFacewash],
    observedAt: daysAgo(12, 9, 30),
    groundTruth: "legitimate",
    notes: "Shopee Mall status + Wardah official brand store. No anomalies.",
  },
  // L14 — Avoskin Toner at correct price, official TikTok Shop
  {
    title: "Avoskin Miraculous Refining Toner 100ml AHA BHA PHA — TikTok Shop RESMI",
    description:
      "Toner eksfoliasi populer dari Avoskin. Official TikTok Shop dengan garansi brand. Ready stock.",
    price: 229000,
    currency: "IDR",
    sellerName: "Avoskin Official Store",
    marketplace: "TikTok Shop",
    listingUrl: "https://www.tiktok.com/t/avoskin-official/miraculous-refining-toner",
    imageUrls: [IMG.avoOfficialToner],
    observedAt: daysAgo(13, 16, 0),
    groundTruth: "legitimate",
    notes: "Official TikTok Shop brand account. Correct MSRP. Complete title.",
  },
  // L15 — Batik Keris Shopee Mall, correct price
  {
    title: "Batik Keris Motif Sidomukti Wanita Lengan Panjang Premium Asli Solo Shopee",
    description:
      "Batik halus motif Sidomukti untuk wanita. Kualitas premium katun primisima. Official store Shopee Mall.",
    price: 379000,
    currency: "IDR",
    sellerName: "Batik Keris Store",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Batik-Keris-Sidomukti-Wanita-i.33445566.4455667788",
    imageUrls: [IMG.bkOfficial1],
    observedAt: daysAgo(14, 10, 0),
    groundTruth: "legitimate",
    notes: "Fashion listing. Official Batik Keris Shopee store. Price in range.",
  },
];

// ---------------------------------------------------------------------------
// 15 COUNTERFEIT listings
// ---------------------------------------------------------------------------

const COUNTERFEIT: InsertEvaluationCase[] = [
  // C1 — Explicit KW + price 75% below MSRP
  {
    title: "Somethinc Calm Down Toner KW Super Grade AAA 100ml Murah Meriah !!!",
    description:
      "Toner Somethinc kualitas grade AAA. Kemasan mirip 1:1 original. Harga murah hasil import ilegal. Tidak ada BPOM.",
    price: 22000,
    currency: "IDR",
    sellerName: "@kosmetik_murah_88",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Somethinc-Toner-KW-Grade-AAA-i.55555555.6666666666",
    imageUrls: [IMG.stcSuspect1],
    observedAt: daysAgo(0, 14, 22),
    groundTruth: "counterfeit",
    notes:
      "Title contains 'KW', 'Grade AAA'. Price Rp 22,000 vs MSRP Rp 99,000 (−78%). No BPOM mention. Clear counterfeit.",
  },
  // C2 — "Replika" in title + fake-pattern NIE
  {
    title: "Somethinc Bright Indeed Serum Replika Premium BPOM NA99991234567 20ml",
    description:
      "Serum replika somethinc rasa original. BPOM palsu tapi kemasan oke. Cocok untuk kado atau koleksi.",
    price: 35000,
    currency: "IDR",
    sellerName: "@beauty_replika_store",
    marketplace: "Tokopedia",
    listingUrl: "https://www.tokopedia.com/beautyreplika/somethinc-serum-replika-20ml",
    imageUrls: [IMG.stcSuspect2],
    observedAt: daysAgo(1, 12, 0),
    groundTruth: "counterfeit",
    notes:
      "Title explicitly says 'Replika'. NIE NA99991234567 does not match real Somethinc NIE. Price −73%. Description admits fake.",
  },
  // C3 — Wardah facial wash, "super copy", 80% price drop
  {
    title: "Wardah Lightening Facial Wash Super Copy 1:1 Murah 100ml",
    description:
      "Facial wash Wardah versi super copy. Packaging sangat mirip asli. Harga grosir tersedia. Tanpa NIE.",
    price: 7000,
    currency: "IDR",
    sellerName: "@wardah_kw_grosir",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Wardah-Facial-Wash-Super-Copy-i.77777777.8888888888",
    imageUrls: [IMG.wrdSuspect1],
    observedAt: daysAgo(2, 9, 10),
    groundTruth: "counterfeit",
    notes:
      "Title: 'Super Copy', '1:1'. Price Rp 7,000 vs MSRP Rp 37,000 (−81%). No BPOM registration. Clear counterfeit.",
  },
  // C4 — Wardah foundation "Grade AAA" + explicit KW
  {
    title: "Wardah Foundation KW Grade AAA Persis Original Warna 03 Natural 30ml",
    description:
      "Foundation KW grade AAA identik asli, warna cocok, awet seharian. Kirim dari Bandung, no resi.",
    price: 18000,
    currency: "IDR",
    sellerName: "@kosmetik_murah_bandung",
    marketplace: "Tokopedia",
    listingUrl: "https://www.tokopedia.com/kosmetikmurahbdg/wardah-foundation-kw-aaa",
    imageUrls: [IMG.wrdSuspect2],
    observedAt: daysAgo(3, 10, 0),
    groundTruth: "counterfeit",
    notes: "Title: 'KW', 'Grade AAA'. Price Rp 18,000 vs MSRP Rp 89,000 (−80%). Strong counterfeit signals.",
  },
  // C5 — Avoskin retinol, "Klu palsu return" + fake NIE
  {
    title: "Avoskin Retinol Toner 100ml ORIGINAL BPOM NA00001234567 [Klu palsu return]",
    description:
      "Retinol Avoskin harga murah banget, BPOM ada tapi nomor beda. Asli atau kw monggo dicek sendiri.",
    price: 45000,
    currency: "IDR",
    sellerName: "@beauty_warehouse_jkt",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Avoskin-Retinol-Toner-Murah-i.99999999.1111111111",
    imageUrls: [IMG.avoSuspect1],
    observedAt: daysAgo(4, 11, 30),
    groundTruth: "counterfeit",
    notes:
      "NIE NA00001234567 is not a valid format (00000 prefix). Price Rp 45,000 vs MSRP Rp 179,000 (−75%). 'Klu palsu return' disclaimer.",
  },
  // C6 — Somethinc toner "tiruan" + share in jar + no BPOM
  {
    title: "Somethinc Calm Down Toner Tiruan Share in Jar 50ml Tanpa BPOM Super Murah",
    description:
      "Serum tiruan somethinc isi ulang, tanpa kemasan kotak. Tidak ada BPOM. Cocok coba-coba sebelum beli asli.",
    price: 12000,
    currency: "IDR",
    sellerName: "@racikan_kecantikan_solo",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Somethinc-Toner-Tiruan-Share-Jar-i.11112222.3333444455",
    imageUrls: [],
    observedAt: daysAgo(5, 8, 0),
    groundTruth: "counterfeit",
    notes:
      "Title: 'tiruan', 'tanpa BPOM'. Share in jar (unregulated repackaging). Price Rp 12,000 (−88%). No images.",
  },
  // C7 — Batik Keris "replika" + price −65%
  {
    title: "BATIK KERIS REPLIKA GRADE SUPER Motif Parang Pria — TERMURAH se-Shopee",
    description:
      "Batik grade super mirip Batik Keris asli. Bahan katun printing. Jahitan rapi. Tidak ada label original.",
    price: 99000,
    currency: "IDR",
    sellerName: "@batik_murah_jogja99",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Batik-Keris-Replika-Parang-Pria-i.22223333.4444555566",
    imageUrls: [IMG.bkSuspect1],
    observedAt: daysAgo(6, 15, 0),
    groundTruth: "counterfeit",
    notes:
      "Title: 'REPLIKA', 'GRADE SUPER'. Fashion item. Price Rp 99,000 vs MSRP Rp 459,000 (−78%). Clear counterfeit.",
  },
  // C8 — Wardah KW grosir, 6 pieces lot
  {
    title: "GROSIR 6pcs Wardah Lightening Facial Wash KW Isi 12 — cocok reseller",
    description:
      "Paket grosir facial wash kw cocok untuk reseller kecantikan. Harga sangat murah per pcs Rp5.000.",
    price: 30000,
    currency: "IDR",
    sellerName: "@grosir_kosmetik_kw",
    marketplace: "Tokopedia",
    listingUrl: "https://www.tokopedia.com/grosirkosmetikkw/wardah-facial-wash-kw-grosir-6pcs",
    imageUrls: [IMG.wrdSuspect1],
    observedAt: daysAgo(7, 13, 0),
    groundTruth: "counterfeit",
    notes:
      "Title explicitly 'KW'. Grosir/wholesale lot. Per-unit price Rp 5,000 vs MSRP Rp 37,000 (−86%). Reseller-targeting language.",
  },
  // C9 — Somethinc serum with fabricated BPOM number pattern
  {
    title: "Somethinc Bright Indeed Serum 20ml BPOM NA12121212121 Ori Murah Ready",
    description:
      "Serum cerah somethinc dengan BPOM resmi (verifikasi mandiri). Harga promo habis-habisan.",
    price: 38000,
    currency: "IDR",
    sellerName: "@promo_serum_2026",
    marketplace: "TikTok Shop",
    listingUrl: "https://www.tiktok.com/t/promo-serum-2026/somethinc-serum-murah",
    imageUrls: [IMG.stcSuspect2],
    observedAt: daysAgo(8, 19, 45),
    groundTruth: "counterfeit",
    notes:
      "NIE NA12121212121 not matching any Somethinc product in BPOM database. Price −71%. TikTok Shop non-official account.",
  },
  // C10 — Avoskin Toner "imitasi" explicit
  {
    title: "Avoskin Miraculous Toner 100ml IMITASI PREMIUM - harga Rp55.000 TERMURAH",
    description:
      "Toner imitasi premium rasa avoskin. Formula mirip, kemasan beda sedikit. Tidak bergaransi BPOM.",
    price: 55000,
    currency: "IDR",
    sellerName: "@skincare_imitasi_indo",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Avoskin-Toner-Imitasi-Premium-i.44445555.6666777788",
    imageUrls: [IMG.avoSuspect1],
    observedAt: daysAgo(9, 10, 0),
    groundTruth: "counterfeit",
    notes:
      "Title: 'IMITASI PREMIUM'. No BPOM. Price Rp 55,000 vs MSRP Rp 229,000 (−76%). Clear counterfeit.",
  },
  // C11 — Somethinc "OEM" manufacturing claim
  {
    title: "Serum Cerah Mirip Somethinc OEM 30ml Tanpa Merek — Produksi Pabrik Kosmetik",
    description:
      "Serum OEM dari pabrik kosmetik Bandung. Bahan baku sama dengan merek ternama. Tidak memiliki BPOM sendiri.",
    price: 28000,
    currency: "IDR",
    sellerName: "@pabrik_oem_kosmetik",
    marketplace: "Bukalapak",
    listingUrl: "https://www.bukalapak.com/p/serum-oem-mirip-somethinc-30ml",
    imageUrls: [],
    observedAt: daysAgo(10, 9, 0),
    groundTruth: "counterfeit",
    notes:
      "Explicit 'OEM', 'Mirip Somethinc', no BPOM. Description admits no brand registration. Clear counterfeit/passing-off.",
  },
  // C12 — Wardah foundation fake NIE in description
  {
    title: "Wardah Exclusive Foundation No.03 Natural Original MURAH BPOM ready",
    description:
      "Foundation Wardah original. BPOM NA56785678999. Harga murah karena belinya dari luar negeri. Garansi puas.",
    price: 22000,
    currency: "IDR",
    sellerName: "@wardah_import_murah",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Wardah-Foundation-Ori-Murah-i.66667777.8888999900",
    imageUrls: [IMG.wrdSuspect2],
    observedAt: daysAgo(11, 11, 20),
    groundTruth: "counterfeit",
    notes:
      "NIE NA56785678999 invalid (does not match any Wardah product). Price Rp 22,000 vs MSRP Rp 89,000 (−75%). Counterfeit signals.",
  },
  // C13 — Somethinc toner "master copy" term
  {
    title: "Somethinc Calm Down Toner 100ml Master Copy Premium Harga Teman 79rb",
    description:
      "Toner master copy premium kemasan sama persis original. Harga teman tidak ada BPOM.",
    price: 32000,
    currency: "IDR",
    sellerName: "@teman_belanja_cantik",
    marketplace: "Tokopedia",
    listingUrl: "https://www.tokopedia.com/temanbelanjacantik/somethinc-toner-master-copy",
    imageUrls: [IMG.stcSuspect1],
    observedAt: daysAgo(12, 16, 0),
    groundTruth: "counterfeit",
    notes: "Title: 'Master Copy'. No BPOM. Price Rp 32,000 vs MSRP Rp 99,000 (−68%).",
  },
  // C14 — Batik Keris "aspal" (asli tapi palsu) claim
  {
    title: "Batik Keris Motif Sidomukti Wanita — ASPAL Kualitas Ekspor Murah Meriah",
    description:
      "Batik aspal (asli tapi palsu) kualitas ekspor mirip Batik Keris. Bahan halus motif bagus. Harga murah.",
    price: 88000,
    currency: "IDR",
    sellerName: "@batik_aspal_indonesia",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Batik-Keris-Aspal-Sidomukti-Wanita-i.88889999.0000111122",
    imageUrls: [IMG.bkSuspect1],
    observedAt: daysAgo(13, 9, 0),
    groundTruth: "counterfeit",
    notes:
      "Title: 'ASPAL' (Indonesian slang for intentional fake). Price −77% vs MSRP. Fashion counterfeit.",
  },
  // C15 — Avoskin retinol, clone/clone formula
  {
    title: "Skincare Clone Avoskin Retinol Toner 100ml Harga Ekonomis BPOM Palsu",
    description:
      "Klon formula retinol mirip avoskin. BPOM palsu disertakan. Cocok untuk yang tidak mampu beli ori.",
    price: 42000,
    currency: "IDR",
    sellerName: "@klonformula_skincare",
    marketplace: "Tokopedia",
    listingUrl: "https://www.tokopedia.com/klonformulaskincare/avoskin-retinol-toner-clone",
    imageUrls: [IMG.avoSuspect1],
    observedAt: daysAgo(14, 12, 0),
    groundTruth: "counterfeit",
    notes:
      "Title: 'Clone'. Description admits 'BPOM palsu'. Price Rp 42,000 vs MSRP Rp 179,000 (−77%). Clear.",
  },
];

// ---------------------------------------------------------------------------
// 8 LIKELY COUNTERFEIT listings
// ---------------------------------------------------------------------------

const LIKELY_COUNTERFEIT: InsertEvaluationCase[] = [
  // LC1 — Somethinc toner from non-authorized seller with suspicious price dip
  {
    title: "Somethinc Calm Down Toner 100ml BPOM Original Murah — Ready Stock",
    description:
      "Toner somethinc original. Harga promo, stok terbatas. Tidak ada invoice tapi produk aman.",
    price: 58000,
    currency: "IDR",
    sellerName: "@skincare_promo_sby",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Somethinc-Toner-Promo-Murah-i.11223344.2233445566",
    imageUrls: [IMG.stcSuspect1],
    observedAt: daysAgo(15, 10, 0),
    groundTruth: "likely_counterfeit",
    notes:
      "Price Rp 58,000 vs MSRP Rp 99,000 (−41% — below threshold but ambiguous). Non-authorized seller. No invoice. Suspicious but not confirmed.",
  },
  // LC2 — Wardah facial wash at 55% of MSRP, seller claims "clearance"
  {
    title: "CLEARANCE Wardah Lightening Facial Wash 100ml exp 2025 — harga last stock",
    description:
      "Produk Wardah clearance mendekati expired. Masih bisa dipakai. Harga khusus habis gudang.",
    price: 20000,
    currency: "IDR",
    sellerName: "@clearance_beauty_id",
    marketplace: "Tokopedia",
    listingUrl: "https://www.tokopedia.com/clearancebeautyid/wardah-facial-wash-clearance",
    imageUrls: [IMG.wrdSuspect1],
    observedAt: daysAgo(16, 9, 0),
    groundTruth: "likely_counterfeit",
    notes:
      "Clearance claim plausible but suspicious. Price Rp 20,000 vs MSRP Rp 37,000 (−46%). Seller not authorized. Near-expiry unverified.",
  },
  // LC3 — Avoskin Toner, price midpoint, seller has some reviews but not authorized
  {
    title: "Avoskin Miraculous Refining Toner 100ml Isi Penuh Original — Free Pouch",
    description:
      "Toner avoskin 100ml masih segel pabrik. Seller bukan official tapi sudah 500+ transaksi skincare.",
    price: 149000,
    currency: "IDR",
    sellerName: "@kecantikan_indo_store",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Avoskin-Refining-Toner-Ori-i.22334455.3344556677",
    imageUrls: [IMG.avoOfficialToner],
    observedAt: daysAgo(17, 14, 0),
    groundTruth: "likely_counterfeit",
    notes:
      "Price Rp 149,000 vs MSRP Rp 229,000 (−35%). Non-authorized seller. Official-looking image but unverifiable source. Needs OCR/visual check.",
  },
  // LC4 — Somethinc serum, vague "BPOM ✓" in title, unauthorized seller
  {
    title: "Somethinc Bright Indeed Serum 20ml BPOM ✓ Skincare Terpercaya Est. 2019",
    description:
      "Serum brightening terpercaya. BPOM ada di kemasan. Seller aktif di berbagai platform, reputasi baik.",
    price: 98000,
    currency: "IDR",
    sellerName: "@skincare_terpercaya_2019",
    marketplace: "TikTok Shop",
    listingUrl: "https://www.tiktok.com/t/skincare-terpercaya-2019/somethinc-serum",
    imageUrls: [IMG.stcSuspect2],
    observedAt: daysAgo(18, 20, 0),
    groundTruth: "likely_counterfeit",
    notes:
      "Price Rp 98,000 vs MSRP Rp 132,050 (−26%). TikTok Shop not official Somethinc. 'BPOM ✓' not verifiable from title alone. Likely re-listed gray/potentially fake.",
  },
  // LC5 — Wardah foundation with quantity anomaly and vague origin
  {
    title: "Wardah Exclusive Foundation 30ml + Travel Size FREE | Paket Hemat Skincare",
    description:
      "Beli 1 dapat bonus travel size gratis. Asal produk tidak disebutkan. Stok ready banyak.",
    price: 65000,
    currency: "IDR",
    sellerName: "@paket_hemat_cantik",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Wardah-Foundation-Paket-Hemat-i.33445566.4455667788",
    imageUrls: [IMG.wrdSuspect2],
    observedAt: daysAgo(19, 11, 0),
    groundTruth: "likely_counterfeit",
    notes:
      "Price Rp 65,000 for bundle vs MSRP Rp 89,000 single item. Suspicious value. Seller non-authorized. Origin unspecified. Likely_counterfeit.",
  },
  // LC6 — Somethinc toner lot of 3, per-unit price suspiciously low
  {
    title: "LOT 3pcs Somethinc Calm Down Toner 100ml Promo Bundling Skincare",
    description:
      "Beli 3 hemat. Per pcs Rp 65.000. Stok banyak ready. Asal produk dari distributor luar.",
    price: 195000,
    currency: "IDR",
    sellerName: "@distributor_luar_skincare",
    marketplace: "Tokopedia",
    listingUrl: "https://www.tokopedia.com/distributorluar/somethinc-toner-lot-3pcs",
    imageUrls: [IMG.stcOfficialToner],
    observedAt: daysAgo(20, 10, 30),
    groundTruth: "likely_counterfeit",
    notes:
      "Rp 65,000/unit vs MSRP Rp 99,000 (−34%). 'Distributor luar' phrasing suggests parallel import or gray. Not confirmed counterfeit but warrants investigation.",
  },
  // LC7 — Avoskin Retinol with slightly wrong volume claim
  {
    title: "Avoskin Your Skin Bae Retinol Toner 150ml BPOM Asli Murah",
    description:
      "Retinol toner avoskin 150ml ukuran lebih besar. BPOM tertera. Harga sesuai ukuran besar.",
    price: 159000,
    currency: "IDR",
    sellerName: "@avoskin_deals_indo",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Avoskin-Retinol-Toner-150ml-i.55667788.6677889900",
    imageUrls: [IMG.avoOfficialRetinol],
    observedAt: daysAgo(21, 9, 0),
    groundTruth: "likely_counterfeit",
    notes:
      "Avoskin YSB Retinol only comes in 100ml officially. Seller claims 150ml — possible mislabeled or counterfeit. Price mismatch with no 150ml SKU in catalog.",
  },
  // LC8 — Somethinc SPF, non-official seller, slightly below MSRP, minimal photos
  {
    title: "Somethinc UV Boss SPF 35 PA+++ 30ml Original — Harga Grosiran Sedikit",
    description:
      "SPF Somethinc tersedia harga grosir sedikit. Bisa ambil sendiri Surabaya. Tidak ada invoice.",
    price: 68000,
    currency: "IDR",
    sellerName: "@spf_grosir_sby",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Somethinc-UV-Boss-SPF-Grosir-i.77889900.8899001122",
    imageUrls: [],
    observedAt: daysAgo(22, 12, 0),
    groundTruth: "likely_counterfeit",
    notes:
      "Price Rp 68,000 vs MSRP Rp 85,000 (−20%). No images. Non-authorized seller. No invoice. Low evidence quality.",
  },
];

// ---------------------------------------------------------------------------
// 7 GRAY MARKET IMPORT listings
// ---------------------------------------------------------------------------

const GRAY_MARKET: InsertEvaluationCase[] = [
  // G1 — Somethinc toner bought abroad (cheaper Thai import), real product but gray
  {
    title: "Somethinc Calm Down PHA Toner 100ml Import Thailand — Harga Lebih Murah",
    description:
      "Produk asli Somethinc dibeli dari toko resmi di Thailand. Kemasan Thai, BPOM mungkin berbeda. Isi sama.",
    price: 72000,
    currency: "IDR",
    sellerName: "@import_skincare_thailand",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Somethinc-Toner-Import-Thailand-i.11112222.2222333344",
    imageUrls: [IMG.stcGray1],
    observedAt: daysAgo(15, 10, 0),
    groundTruth: "gray_market_import",
    notes:
      "Real product but sourced from Thai retail market. No Indonesian BPOM — local registration may differ. Gray import.",
  },
  // G2 — Avoskin toner purchased in Singapore, parallel import
  {
    title: "Avoskin Miraculous Refining Toner 100ml Beli di Singapore — Parallel Import",
    description:
      "Toner asli Avoskin beli di Sephora Singapore. Kemasan dan isi identik. Tidak ada segel BPOM Indonesia.",
    price: 185000,
    currency: "IDR",
    sellerName: "@parallelimport_beauty_sg",
    marketplace: "Tokopedia",
    listingUrl: "https://www.tokopedia.com/parallelimportbeauty/avoskin-toner-sg-import",
    imageUrls: [IMG.avoOfficialToner],
    observedAt: daysAgo(16, 9, 30),
    groundTruth: "gray_market_import",
    notes:
      "Explicitly 'Parallel Import' from Singapore Sephora. Product likely genuine but lacks Indonesian BPOM distribution registration.",
  },
  // G3 — Wardah foundation purchased from Malaysia
  {
    title: "Wardah Exclusive Foundation 30ml Beli di Malaysia — Harga MYR Dikonversi",
    description:
      "Foundation Wardah dibeli dari guardian Malaysia. Kemasan Malaysia. Isi produk sama. Harga konversi MYR.",
    price: 79000,
    currency: "IDR",
    sellerName: "@olshop_belanja_malaysia",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Wardah-Foundation-Malaysia-i.33334444.4444555566",
    imageUrls: [IMG.wrdOfficialFoundation],
    observedAt: daysAgo(17, 11, 0),
    groundTruth: "gray_market_import",
    notes:
      "Wardah is a Paragon brand distributed in Malaysia but packaging differs. Price below Indonesian MSRP due to currency conversion. Gray market.",
  },
  // G4 — Somethinc serum via US Shopee seller (personal shopper / jastip)
  {
    title: "JASTIP Somethinc Bright Indeed Serum 20ml dari USA — Beli Online Amazon",
    description:
      "Jasa titip serum Somethinc dari Amerika. Beli di Amazon USA. Harga plus jastip fee. Original guaranteed.",
    price: 165000,
    currency: "IDR",
    sellerName: "@jastip_usa_beauty",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Jastip-Somethinc-Serum-USA-i.44445555.5555666677",
    imageUrls: [IMG.stcOfficialSerum],
    observedAt: daysAgo(18, 14, 0),
    groundTruth: "gray_market_import",
    notes:
      "Jasa titip (personal shopper import) model. Product likely authentic, procured from US Amazon. No local distributor invoice. Gray import.",
  },
  // G5 — Avoskin Retinol, Korea parallel import via Shopee
  {
    title: "Avoskin Your Skin Bae Retinol 0.5% Toner Import Korea — Asli Terjamin",
    description:
      "Retinol toner Avoskin dibeli dari distrib Korea untuk ekspor. Kemasan Korea, kandungan sama. Asli.",
    price: 155000,
    currency: "IDR",
    sellerName: "@korea_beauty_import_id",
    marketplace: "Tokopedia",
    listingUrl: "https://www.tokopedia.com/koreabeautyimportid/avoskin-retinol-korea-import",
    imageUrls: [IMG.avoOfficialRetinol],
    observedAt: daysAgo(19, 10, 0),
    groundTruth: "gray_market_import",
    notes:
      "Product likely real but procured from Korean export channel without Indonesian distribution rights. Price slightly below MSRP.",
  },
  // G6 — Batik Keris purchased in Solo, resold on Tokopedia without brand authorization
  {
    title: "Batik Keris Parang Rusak Asli Beli Langsung di Pasar Klewer Solo",
    description:
      "Batik Keris asli beli langsung dari Pasar Klewer. Bukan toko resmi tapi barang tulen. Tanpa dus.",
    price: 329000,
    currency: "IDR",
    sellerName: "@pasar_klewer_batik",
    marketplace: "Tokopedia",
    listingUrl: "https://www.tokopedia.com/pasarklewer/batik-keris-asli-parang-rusak",
    imageUrls: [IMG.bkOfficial1],
    observedAt: daysAgo(20, 9, 0),
    groundTruth: "gray_market_import",
    notes:
      "Likely authentic product purchased at traditional market. No authorized channel. No box. Below MSRP. Gray market resale.",
  },
  // G7 — Wardah serum from duty-free airport import
  {
    title: "Wardah Lightening Series Serum 20ml Duty Free Soetta — Beli Sendiri",
    description:
      "Serum Wardah beli duty-free di bandara Soekarno-Hatta. Sisa stok tidak terpakai. Asli guaranteed.",
    price: 31000,
    currency: "IDR",
    sellerName: "@dutyfree_skincare_resell",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Wardah-Serum-Duty-Free-i.55556666.6666777788",
    imageUrls: [IMG.wrdOfficialFacewash],
    observedAt: daysAgo(21, 11, 0),
    groundTruth: "gray_market_import",
    notes:
      "Duty-free procurement is legitimate purchase but resale outside authorized channels is gray market. Price below street MSRP.",
  },
];

// ---------------------------------------------------------------------------
// 3 EXPIRED REGISTRATION / UNSAFE listings
// ---------------------------------------------------------------------------

const EXPIRED_OR_UNSAFE: InsertEvaluationCase[] = [
  // E1 — Expired BPOM NIE, product still physically on shelf
  {
    title: "Somethinc Calm Down Toner 100ml NA18261203071 EXP BPOM 2023 — Clearance Murah",
    description:
      "Toner Somethinc stok lama batch 2021. BPOM NIE NA18261203071 sudah tidak aktif per cek.pom.go.id. Jual apa adanya.",
    price: 45000,
    currency: "IDR",
    sellerName: "@clearance_gudang_bsd",
    marketplace: "Tokopedia",
    listingUrl: "https://www.tokopedia.com/clearancegudan/somethinc-toner-expired-nie",
    imageUrls: [IMG.stcOfficialToner],
    observedAt: daysAgo(22, 10, 0),
    groundTruth: "expired_or_unsafe",
    notes:
      "NIE NA18261203071 expired per BPOM database. Product physically old stock (batch 2021). BPOM registration lapsed.",
  },
  // E2 — Share in jar with unregistered formula
  {
    title: "Share In Jar Serum Cerah Racikan AHA BHA 15ml Tanpa BPOM Harga Terjangkau",
    description:
      "Serum racikan brightening buatan sendiri. Tanpa izin edar BPOM. Formula diklaim aman tapi tidak teruji.",
    price: 18000,
    currency: "IDR",
    sellerName: "@racikan_serum_cantik",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Serum-Racikan-Share-Jar-AHA-BHA-i.66667777.7777888899",
    imageUrls: [],
    observedAt: daysAgo(23, 9, 0),
    groundTruth: "expired_or_unsafe",
    notes:
      "Unregistered cosmetic formula (racikan). No BPOM. Repackaged AHA/BHA without safety testing. Consumer safety risk.",
  },
  // E3 — Avoskin with NIE number that BPOM database shows as revoked
  {
    title: "Avoskin Retinol Toner 100ml BPOM NA18200510009 Stok Lama Ready Kirim",
    description:
      "Toner retinol avoskin stok lama gudang. NIE tertera di kemasan. Produk fisik masih utuh belum expired.",
    price: 99000,
    currency: "IDR",
    sellerName: "@gudang_stok_lama_sby",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Avoskin-Retinol-Stok-Lama-i.77778888.8888999900",
    imageUrls: [IMG.avoOfficialRetinol],
    observedAt: daysAgo(24, 11, 0),
    groundTruth: "expired_or_unsafe",
    notes:
      "NIE NA18200510009 is a revoked/superseded registration per BPOM database. Current valid NIE is NA18200510073. Old stock may be pre-formula-change batch.",
  },
];

// ---------------------------------------------------------------------------
// 2 INSUFFICIENT EVIDENCE listings
// ---------------------------------------------------------------------------

const INSUFFICIENT_EVIDENCE: InsertEvaluationCase[] = [
  // I1 — Listing with no price, no images, minimal description
  {
    title: "Skincare Somethinc Toner — DM untuk harga",
    description: null,
    price: null,
    currency: "IDR",
    sellerName: "@dm_untuk_harga_skincare",
    marketplace: "Shopee",
    listingUrl: "https://shopee.co.id/Skincare-Somethinc-Toner-DM-i.12121212.1212121212",
    imageUrls: [],
    observedAt: daysAgo(25, 10, 0),
    groundTruth: "insufficient_evidence",
    notes:
      "No price, no description, no images. Cannot determine legitimacy. 'DM untuk harga' pattern prevents scoring.",
  },
  // I2 — Ambiguous listing: price in range, non-authorized seller, claim original, but no verifiable signals
  {
    title: "Avoskin Toner Original — Ready Stock — Harga Terjangkau PM",
    description:
      "Toner Avoskin tersedia. Kondisi baru. Harga private message. Tidak mau tulis harga di deskripsi.",
    price: null,
    currency: "IDR",
    sellerName: "@pm_skincare_jogja",
    marketplace: "Tokopedia",
    listingUrl: "https://www.tokopedia.com/pmskincarejogja/avoskin-toner-pm",
    imageUrls: [],
    observedAt: daysAgo(26, 14, 0),
    groundTruth: "insufficient_evidence",
    notes:
      "No price (PM only). No images. Non-authorized seller. Cannot determine if legitimate or counterfeit without further investigation.",
  },
];

// ---------------------------------------------------------------------------
// FINAL EXPORT
// ---------------------------------------------------------------------------

export const EVALUATION_FIXTURES: InsertEvaluationCase[] = [
  ...LEGITIMATE,
  ...COUNTERFEIT,
  ...LIKELY_COUNTERFEIT,
  ...GRAY_MARKET,
  ...EXPIRED_OR_UNSAFE,
  ...INSUFFICIENT_EVIDENCE,
];

// Sanity check (runs at module load in dev — harmless in prod)
if (process.env.NODE_ENV !== "production") {
  const counts: Record<string, number> = {};
  for (const f of EVALUATION_FIXTURES) {
    counts[f.groundTruth] = (counts[f.groundTruth] ?? 0) + 1;
  }
  if (EVALUATION_FIXTURES.length !== 50) {
    // eslint-disable-next-line no-console
    console.warn(`[seed-listings] Expected 50 fixtures, got ${EVALUATION_FIXTURES.length}`);
  }
}
