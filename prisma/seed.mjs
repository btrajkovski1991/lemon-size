import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SHOP = process.env.SEED_SHOP || "kuze-web-test.myshopify.com";

const GLOBAL_DISCLAIMER =
  "Sizes can vary by 2–3 cm because items are measured by hand. 1 inch = 2.54 cm. Size on label may differ from the one you ordered.";

const GLOBAL_TIPS =
  "For product measurements: lay garment flat and do not stretch fabric. For body measurements: tape should be snug but not tight.";

const TEMPLATES = [
  {
    title: "Tops (product)",
    unit: "cm",
    columns: ["SIZE", "CHEST", "LENGTH"],
    guideTitle: "How to measure (Tops)",
    guideImage: "/images/size-guides/tops.png",
    guideText:
      "CHEST: Measure straight across from armpit to armpit (flat). If you want circumference, multiply by 2.\nLENGTH: Measure from the highest point of the shoulder (near collar) down to the hem.\nOptional: SHOULDER (seam to seam), SLEEVE (shoulder seam to cuff).",
    tips: GLOBAL_TIPS,
    disclaimer: GLOBAL_DISCLAIMER,
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", CHEST: "88", LENGTH: "66" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", CHEST: "92", LENGTH: "68" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", CHEST: "100", LENGTH: "70" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", CHEST: "108", LENGTH: "72" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", CHEST: "116", LENGTH: "74" } },
      { label: "XXL", sortOrder: 6, values: { SIZE: "XXL", CHEST: "124", LENGTH: "76" } },
    ],
  },
  {
    title: "Tops (body)",
    unit: "cm",
    columns: ["SIZE", "CHEST", "WAIST"],
    guideTitle: "How to measure (Body)",
    guideImage: "/images/size-guides/body-upper.png",
    guideText:
      "CHEST: Measure around the fullest part of the chest, under the arms, tape level across the back.\nWAIST: Measure around the narrowest point (natural waist).",
    tips: GLOBAL_TIPS,
    disclaimer: GLOBAL_DISCLAIMER,
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", CHEST: "84-89", WAIST: "72-77" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", CHEST: "90-95", WAIST: "78-82" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", CHEST: "96-101", WAIST: "83-87" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", CHEST: "102-107", WAIST: "88-92" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", CHEST: "108-113", WAIST: "93-98" } },
      { label: "XXL", sortOrder: 6, values: { SIZE: "XXL", CHEST: "114-119", WAIST: "99-104" } },
    ],
  },
  {
    title: "Bottoms (product)",
    unit: "cm",
    columns: ["SIZE", "WAIST", "HIP", "INSEAM"],
    guideTitle: "How to measure (Bottoms)",
    guideImage: "/images/size-guides/bottoms.png",
    guideText:
      "WAIST: Measure straight across the waistband (flat). For circumference multiply by 2.\nHIP: Measure across the widest point of the hip area (flat). For circumference multiply by 2.\nINSEAM: Measure from crotch seam to bottom hem along the inside leg.",
    tips: GLOBAL_TIPS,
    disclaimer: GLOBAL_DISCLAIMER,
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", WAIST: "72", HIP: "90", INSEAM: "77" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", WAIST: "78", HIP: "94", INSEAM: "78" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", WAIST: "84", HIP: "100", INSEAM: "79" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", WAIST: "90", HIP: "106", INSEAM: "80" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", WAIST: "96", HIP: "112", INSEAM: "81" } },
      { label: "XXL", sortOrder: 6, values: { SIZE: "XXL", WAIST: "102", HIP: "118", INSEAM: "82" } },
    ],
  },
  {
    title: "Bottoms (body)",
    unit: "cm",
    columns: ["SIZE", "WAIST", "HIP"],
    guideTitle: "How to measure (Body)",
    guideImage: "/images/size-guides/body-lower.png",
    guideText:
      "WAIST: Measure around the natural waist (narrowest part).\nHIP: Measure around the fullest part of hips/seat with feet together.",
    tips: GLOBAL_TIPS,
    disclaimer: GLOBAL_DISCLAIMER,
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", WAIST: "70-75", HIP: "88-91" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", WAIST: "76-81", HIP: "92-97" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", WAIST: "82-87", HIP: "98-103" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", WAIST: "88-93", HIP: "104-109" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", WAIST: "94-99", HIP: "110-115" } },
      { label: "XXL", sortOrder: 6, values: { SIZE: "XXL", WAIST: "100-105", HIP: "116-121" } },
    ],
  },
  {
    title: "Blazer",
    unit: "cm",
    columns: ["SIZE", "CHEST", "WAIST", "SHOULDER"],
    guideTitle: "How to measure (Blazer)",
    guideImage: "/images/size-guides/tops.png",
    guideText:
      "CHEST: Around fullest chest (body) OR armpit-to-armpit (product). Be consistent.\nWAIST: Natural waist (body) OR narrowest width (product).\nSHOULDER: Measure straight across back from shoulder seam to shoulder seam.",
    tips: GLOBAL_TIPS,
    disclaimer: GLOBAL_DISCLAIMER,
    rows: [
      { label: "46", sortOrder: 1, values: { SIZE: "46", CHEST: "92", WAIST: "80", SHOULDER: "42" } },
      { label: "48", sortOrder: 2, values: { SIZE: "48", CHEST: "96", WAIST: "84", SHOULDER: "44" } },
      { label: "50", sortOrder: 3, values: { SIZE: "50", CHEST: "100", WAIST: "88", SHOULDER: "46" } },
      { label: "52", sortOrder: 4, values: { SIZE: "52", CHEST: "104", WAIST: "92", SHOULDER: "47" } },
      { label: "54", sortOrder: 5, values: { SIZE: "54", CHEST: "108", WAIST: "96", SHOULDER: "48" } },
      { label: "56", sortOrder: 6, values: { SIZE: "56", CHEST: "112", WAIST: "100", SHOULDER: "49" } },
    ],
  },
  {
    title: "Jacket",
    unit: "cm",
    columns: ["SIZE", "CHEST", "LENGTH", "SLEEVE"],
    guideTitle: "How to measure (Jacket)",
    guideImage: "/images/size-guides/tops.png",
    guideText:
      "CHEST: Measure armpit to armpit (flat). For circumference multiply by 2.\nLENGTH: Highest shoulder point to hem.\nSLEEVE: Shoulder seam to cuff (or center back collar to cuff if your brand uses that method).",
    tips: GLOBAL_TIPS,
    disclaimer: GLOBAL_DISCLAIMER,
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", CHEST: "92", LENGTH: "64", SLEEVE: "61" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", CHEST: "96", LENGTH: "66", SLEEVE: "62" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", CHEST: "104", LENGTH: "68", SLEEVE: "63" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", CHEST: "112", LENGTH: "70", SLEEVE: "64" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", CHEST: "120", LENGTH: "72", SLEEVE: "65" } },
      { label: "XXL", sortOrder: 6, values: { SIZE: "XXL", CHEST: "128", LENGTH: "74", SLEEVE: "66" } },
    ],
  },
  {
    title: "Brief",
    unit: "cm",
    columns: ["SIZE", "WAIST", "HIP"],
    guideTitle: "How to measure (Underwear)",
    guideImage: "/images/size-guides/underwear.png",
    guideText:
      "WAIST: Measure around where the waistband sits (natural waist or low-rise).\nHIP: Measure around the fullest part of hips/seat.",
    tips: GLOBAL_TIPS,
    disclaimer: GLOBAL_DISCLAIMER,
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", WAIST: "66-71", HIP: "84-89" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", WAIST: "72-78", HIP: "90-96" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", WAIST: "79-85", HIP: "97-103" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", WAIST: "86-92", HIP: "104-110" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", WAIST: "93-99", HIP: "111-117" } },
      { label: "XXL", sortOrder: 6, values: { SIZE: "XXL", WAIST: "100-106", HIP: "118-124" } },
    ],
  },
  {
    title: "Bikini",
    unit: "cm",
    columns: ["SIZE", "BUST", "WAIST", "HIP"],
    guideTitle: "How to measure (Swimwear)",
    guideImage: "/images/size-guides/bikini.png",
    guideText:
      "BUST: Around fullest part of bust, tape level.\nWAIST: Natural waist.\nHIP: Around fullest part of hips/seat.",
    tips: GLOBAL_TIPS,
    disclaimer: GLOBAL_DISCLAIMER,
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", BUST: "78-83", WAIST: "60-65", HIP: "84-89" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", BUST: "84-90", WAIST: "66-72", HIP: "90-96" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", BUST: "91-97", WAIST: "73-79", HIP: "97-103" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", BUST: "98-104", WAIST: "80-86", HIP: "104-110" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", BUST: "105-111", WAIST: "87-93", HIP: "111-117" } },
      { label: "XXL", sortOrder: 6, values: { SIZE: "XXL", BUST: "112-118", WAIST: "94-100", HIP: "118-124" } },
    ],
  },
  {
    title: "Dress",
    unit: "cm",
    columns: ["SIZE", "BUST", "WAIST", "HIP"],
    guideTitle: "How to measure (Dress)",
    guideImage: "/images/size-guides/dress.png",
    guideText:
      "BUST: Around fullest bust.\nWAIST: Natural waist.\nHIP: Fullest hips/seat.\nTip: If between sizes, choose based on the largest measurement.",
    tips: GLOBAL_TIPS,
    disclaimer: GLOBAL_DISCLAIMER,
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", BUST: "78-83", WAIST: "60-65", HIP: "84-89" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", BUST: "84-90", WAIST: "66-72", HIP: "90-96" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", BUST: "91-97", WAIST: "73-79", HIP: "97-103" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", BUST: "98-104", WAIST: "80-86", HIP: "104-110" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", BUST: "105-111", WAIST: "87-93", HIP: "111-117" } },
      { label: "XXL", sortOrder: 6, values: { SIZE: "XXL", BUST: "112-118", WAIST: "94-100", HIP: "118-124" } },
    ],
  },
  {
    title: "Bra",
    unit: "cm",
    columns: ["SIZE", "UNDERBUST", "BUST"],
    guideTitle: "How to measure (Bra)",
    guideImage: "/images/size-guides/bra.png",
    guideText:
      "UNDERBUST: Measure around ribcage directly under bust, snug and level.\nBUST: Measure around fullest part of bust, tape level.\nTip: If between sizes, choose the larger band for comfort.",
    tips: GLOBAL_TIPS,
    disclaimer: GLOBAL_DISCLAIMER,
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", UNDERBUST: "63-67", BUST: "77-81" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", UNDERBUST: "68-73", BUST: "82-88" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", UNDERBUST: "74-79", BUST: "89-95" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", UNDERBUST: "80-85", BUST: "96-102" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", UNDERBUST: "86-91", BUST: "103-109" } },
      { label: "XXL", sortOrder: 6, values: { SIZE: "XXL", UNDERBUST: "92-97", BUST: "110-116" } },
    ],
  },
  {
    title: "Shoes",
    unit: "in",
    columns: ["SIZE US", "SIZE EUR", "FOOT LENGTH"],
    guideTitle: "How to measure (Shoes)",
    guideImage: "/images/size-guides/shoes.png",
    guideText:
      "1) Place a sheet of paper on the floor and stand with your heel against a wall.\n2) Put full weight on the foot.\n3) Mark the tip of the longest toe.\n4) Measure from the wall to the mark.\n5) Add 3–5 mm for toe space.\n6) Compare foot length with the chart.",
    tips: "Sizing varies by brand. If between sizes, size up.",
    disclaimer: GLOBAL_DISCLAIMER,
    rows: [
      { label: "4", sortOrder: 1, values: { "SIZE US": "4", "SIZE EUR": "36", "FOOT LENGTH": "8.86" } },
      { label: "5", sortOrder: 2, values: { "SIZE US": "5", "SIZE EUR": "37", "FOOT LENGTH": "9.13" } },
      { label: "6", sortOrder: 3, values: { "SIZE US": "6", "SIZE EUR": "38", "FOOT LENGTH": "9.45" } },
      { label: "7", sortOrder: 4, values: { "SIZE US": "7", "SIZE EUR": "40", "FOOT LENGTH": "9.84" } },
      { label: "8", sortOrder: 5, values: { "SIZE US": "8", "SIZE EUR": "41", "FOOT LENGTH": "10.2" } },
      { label: "9", sortOrder: 6, values: { "SIZE US": "9", "SIZE EUR": "43", "FOOT LENGTH": "10.6" } },
      { label: "10", sortOrder: 7, values: { "SIZE US": "10", "SIZE EUR": "44", "FOOT LENGTH": "10.94" } },
      { label: "11", sortOrder: 8, values: { "SIZE US": "11", "SIZE EUR": "45", "FOOT LENGTH": "11.26" } },
      { label: "12", sortOrder: 9, values: { "SIZE US": "12", "SIZE EUR": "46", "FOOT LENGTH": "11.57" } },
      { label: "13", sortOrder: 10, values: { "SIZE US": "13", "SIZE EUR": "47", "FOOT LENGTH": "11.89" } },
      { label: "14", sortOrder: 11, values: { "SIZE US": "14", "SIZE EUR": "48", "FOOT LENGTH": "12.2" } },
    ],
  },
  {
    title: "Pet clothing",
    unit: "cm",
    columns: ["SIZE", "NECK", "CHEST", "BACK"],
    guideTitle: "How to measure (Pet clothing)",
    guideImage: "/images/size-guides/pet-clothing.png",
    guideText:
      "NECK: Around base of neck (where collar sits), allow 1–2 fingers.\nCHEST: Widest part behind front legs.\nBACK: Base of neck to base of tail.",
    tips: "If between sizes, choose the larger size for comfort.",
    disclaimer: GLOBAL_DISCLAIMER,
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", NECK: "18", CHEST: "28", BACK: "20" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", NECK: "22", CHEST: "32", BACK: "25" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", NECK: "28", CHEST: "40", BACK: "30" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", NECK: "34", CHEST: "48", BACK: "35" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", NECK: "40", CHEST: "56", BACK: "40" } },
      { label: "XXL", sortOrder: 6, values: { SIZE: "XXL", NECK: "46", CHEST: "64", BACK: "45" } },
    ],
  },
  {
    title: "Pet collar",
    unit: "cm",
    columns: ["SIZE", "NECK"],
    guideTitle: "How to measure (Pet collar)",
    guideImage: "/images/size-guides/pet-collar.png",
    guideText:
      "Measure around the neck where the collar sits.\nAdd comfort space (2 fingers).",
    tips: "If between sizes, choose the larger size.",
    disclaimer: GLOBAL_DISCLAIMER,
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", NECK: "16-22" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", NECK: "20-28" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", NECK: "28-36" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", NECK: "36-44" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", NECK: "44-52" } },
      { label: "XXL", sortOrder: 6, values: { SIZE: "XXL", NECK: "52-60" } },
    ],
  },
  {
    title: "Headwear",
    unit: "cm",
    columns: ["SIZE", "HEAD CIRCUMFERENCE"],
    guideTitle: "How to measure (Headwear)",
    guideImage: "/images/size-guides/headwear.png",
    guideText: "Wrap tape around forehead and above ears, level all around.",
    tips: "If between sizes, choose the larger size for comfort.",
    disclaimer: GLOBAL_DISCLAIMER,
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", "HEAD CIRCUMFERENCE": "52-54" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", "HEAD CIRCUMFERENCE": "54-56" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", "HEAD CIRCUMFERENCE": "56-58" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", "HEAD CIRCUMFERENCE": "58-60" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", "HEAD CIRCUMFERENCE": "60-62" } },
    ],
  },
  {
    title: "Bracelet",
    unit: "cm",
    columns: ["SIZE", "WRIST CIRCUMFERENCE"],
    guideTitle: "How to measure (Bracelet)",
    guideImage: "/images/size-guides/bracelet.png",
    guideText:
      "Measure wrist circumference around the wrist bone.\nAdd 0.5–1.5 cm depending on fit (tight vs loose).",
    tips: "If you wear it over sleeves, size up slightly.",
    disclaimer: GLOBAL_DISCLAIMER,
    rows: [
      { label: "XS", sortOrder: 1, values: { SIZE: "XS", "WRIST CIRCUMFERENCE": "14-15" } },
      { label: "S", sortOrder: 2, values: { SIZE: "S", "WRIST CIRCUMFERENCE": "15-16" } },
      { label: "M", sortOrder: 3, values: { SIZE: "M", "WRIST CIRCUMFERENCE": "16-17" } },
      { label: "L", sortOrder: 4, values: { SIZE: "L", "WRIST CIRCUMFERENCE": "17-18" } },
      { label: "XL", sortOrder: 5, values: { SIZE: "XL", "WRIST CIRCUMFERENCE": "18-19" } },
    ],
  },
  {
    title: "Ring",
    unit: "mm",
    columns: ["SIZE", "INNER DIAMETER"],
    guideTitle: "How to measure (Ring)",
    guideImage: "/images/size-guides/ring.png",
    guideText:
      "Measure the inner diameter of a ring that fits you (in mm).\nTip: Measure at end of day if your fingers swell.",
    tips: "If between sizes, choose the larger size.",
    disclaimer: GLOBAL_DISCLAIMER,
    rows: [
      { label: "5", sortOrder: 1, values: { SIZE: "5", "INNER DIAMETER": "15.7" } },
      { label: "6", sortOrder: 2, values: { SIZE: "6", "INNER DIAMETER": "16.5" } },
      { label: "7", sortOrder: 3, values: { SIZE: "7", "INNER DIAMETER": "17.3" } },
      { label: "8", sortOrder: 4, values: { SIZE: "8", "INNER DIAMETER": "18.1" } },
      { label: "9", sortOrder: 5, values: { SIZE: "9", "INNER DIAMETER": "18.9" } },
      { label: "10", sortOrder: 6, values: { SIZE: "10", "INNER DIAMETER": "19.8" } },
    ],
  },
  {
    title: "Necklace",
    unit: "cm",
    columns: ["SIZE", "LENGTH"],
    guideTitle: "How to measure (Necklace)",
    guideImage: "/images/size-guides/necklace.png",
    guideText:
      "Measure an existing necklace end-to-end (including clasp), or wrap a string around your neck to the desired drop and measure it.",
    tips: "If you plan to layer, choose different lengths (40/45/50 cm).",
    disclaimer: GLOBAL_DISCLAIMER,
    rows: [
      { label: "Short", sortOrder: 1, values: { SIZE: "Short", LENGTH: "40" } },
      { label: "Mid", sortOrder: 2, values: { SIZE: "Mid", LENGTH: "45" } },
      { label: "Long", sortOrder: 3, values: { SIZE: "Long", LENGTH: "50" } },
      { label: "Extra Long", sortOrder: 4, values: { SIZE: "Extra Long", LENGTH: "60" } },
    ],
  },
];

const KEYWORD_RULES = [
  { keyword: "dress", field: "ANY", chartTitle: "Dress", priority: 500 },
  { keyword: "gown", field: "ANY", chartTitle: "Dress", priority: 500 },
  { keyword: "bikini", field: "ANY", chartTitle: "Bikini", priority: 500 },
  { keyword: "bra", field: "ANY", chartTitle: "Bra", priority: 500 },
  { keyword: "blazer", field: "ANY", chartTitle: "Blazer", priority: 500 },
  { keyword: "jacket", field: "ANY", chartTitle: "Jacket", priority: 500 },

  { keyword: "sneaker", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "shoe", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "shoes", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "boot", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "boots", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "slipper", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "slippers", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "slide", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "slides", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "sandal", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "sandals", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "flip flop", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "flip flops", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "sock", field: "ANY", chartTitle: "Shoes", priority: 500 },
  { keyword: "socks", field: "ANY", chartTitle: "Shoes", priority: 500 },

  { keyword: "ring", field: "ANY", chartTitle: "Ring", priority: 500 },
  { keyword: "bracelet", field: "ANY", chartTitle: "Bracelet", priority: 500 },
  { keyword: "necklace", field: "ANY", chartTitle: "Necklace", priority: 500 },
  { keyword: "cap", field: "ANY", chartTitle: "Headwear", priority: 500 },
  { keyword: "hat", field: "ANY", chartTitle: "Headwear", priority: 500 },

  { keyword: "pet collar", field: "ANY", chartTitle: "Pet collar", priority: 500 },
  { keyword: "dog collar", field: "ANY", chartTitle: "Pet collar", priority: 500 },
  { keyword: "pet clothing", field: "ANY", chartTitle: "Pet clothing", priority: 500 },
];

const PURCHASE_SIGNALS = [
  { productHandle: "nike-air-max", productId: "123456789", chartTitle: "Shoes", sizeLabel: "8", heightCm: 178, weightKg: 75 },
  { productHandle: "nike-air-max", productId: "123456789", chartTitle: "Shoes", sizeLabel: "9", heightCm: 181, weightKg: 82 },
  { productHandle: "nike-air-max", productId: "123456789", chartTitle: "Shoes", sizeLabel: "8", heightCm: 175, weightKg: 74 },
  { productHandle: "nike-air-max", productId: "123456789", chartTitle: "Shoes", sizeLabel: "8", heightCm: 179, weightKg: 77 },

  { productHandle: "black-dress", productId: "987654321", chartTitle: "Dress", sizeLabel: "S", heightCm: 168, weightKg: 56 },
  { productHandle: "black-dress", productId: "987654321", chartTitle: "Dress", sizeLabel: "M", heightCm: 172, weightKg: 61 },
  { productHandle: "black-dress", productId: "987654321", chartTitle: "Dress", sizeLabel: "M", heightCm: 171, weightKg: 62 },
  { productHandle: "black-dress", productId: "987654321", chartTitle: "Dress", sizeLabel: "M", heightCm: 173, weightKg: 63 },
];

async function main() {
  const shopRow = await prisma.shop.upsert({
    where: { shop: SHOP },
    update: {},
    create: { shop: SHOP },
  });

  await prisma.sizePurchaseSignal.deleteMany({
    where: { shopId: shopRow.id },
  });

  await prisma.sizeKeywordRule.deleteMany({
    where: { shopId: shopRow.id },
  });

  await prisma.sizeChartAssignment.deleteMany({
    where: { shopId: shopRow.id },
  });

  await prisma.sizeChartRow.deleteMany({
    where: { chart: { shopId: shopRow.id } },
  });

  await prisma.sizeChart.deleteMany({
    where: { shopId: shopRow.id },
  });

  const createdCharts = [];

  for (let i = 0; i < TEMPLATES.length; i++) {
    const t = TEMPLATES[i];

    const chart = await prisma.sizeChart.create({
      data: {
        shopId: shopRow.id,
        title: t.title,
        unit: t.unit,
        columns: t.columns,
        isDefault: i === 0,
        guideTitle: t.guideTitle,
        guideText: t.guideText,
        guideImage: t.guideImage,
        tips: t.tips,
        disclaimer: t.disclaimer,
        rows: { create: t.rows },
      },
    });

    createdCharts.push(chart);
  }

  const chartByTitle = new Map(createdCharts.map((chart) => [chart.title, chart]));

  for (const rule of KEYWORD_RULES) {
    const chart = chartByTitle.get(rule.chartTitle);
    if (!chart) continue;

    await prisma.sizeKeywordRule.create({
      data: {
        shopId: shopRow.id,
        chartId: chart.id,
        keyword: rule.keyword,
        field: rule.field,
        priority: rule.priority,
        enabled: true,
      },
    });
  }

  for (const signal of PURCHASE_SIGNALS) {
    const chart = chartByTitle.get(signal.chartTitle);

    await prisma.sizePurchaseSignal.create({
      data: {
        shopId: shopRow.id,
        chartId: chart?.id || null,
        productHandle: signal.productHandle,
        productId: signal.productId,
        sizeLabel: signal.sizeLabel,
        heightCm: signal.heightCm,
        weightKg: signal.weightKg,
        kept: true,
        returned: false,
        refunded: false,
      },
    });
  }

  console.log(`✅ Seeded ${createdCharts.length} charts for: ${SHOP}`);
  console.log(`✅ Seeded ${KEYWORD_RULES.length} keyword rules`);
  console.log(`✅ Seeded ${PURCHASE_SIGNALS.length} purchase signals`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });