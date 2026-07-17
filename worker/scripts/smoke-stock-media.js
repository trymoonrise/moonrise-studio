const {
  selectStockMedia,
  catalogStats,
  PACKS,
} = require("../stock-media");

const samples = [
  { category: "Barbershop", businessName: "Cedar Cuts" },
  { category: "Landscaping", businessName: "Green Thumb Gardens" },
  { category: "Tutoring", businessName: "Bright Minds Tutoring" },
  { category: "Plumbing", businessName: "Joe Plumbing" },
  { category: "Pizza", businessName: "Tony's Pizza" },
  { category: "Dental clinic", businessName: "Smile Dental" },
];

const stats = catalogStats();
console.log("catalog", stats);

for (const ctx of samples) {
  const m = selectStockMedia(ctx);
  console.log({
    input: ctx.category,
    pack: m.key,
    label: m.label,
    hero: (m.images.hero || "").slice(0, 70),
    imageSlots: Object.keys(m.images).filter((k) => k !== "_all").length,
    galleryPool: (m.images._all || []).length,
    videos: Object.keys(m.videos || {}),
  });
}

console.log("packs", Object.keys(PACKS).length);
