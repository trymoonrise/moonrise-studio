/**
 * Lead prospect ranking — shuffle on each load, float high-fit niches to the top.
 */
(function (global) {
  const SMART_PROSPECT_CATEGORY_SCORES = {
    Plumbing: 100,
    HVAC: 99,
    Roofing: 98,
    Electrical: 97,
    "Tree Service": 93,
    Moving: 90,
    Landscaping: 87,
    Flooring: 84,
    Painting: 83,
    Pool: 81,
    "Cleaning Services": 75,
    Security: 70,
    Construction: 68,
    "Home Repair": 66,
    Dental: 55,
    "Senior Care": 50,
    Childcare: 48,
    Auto: 42,
    Pets: 36,
    Tutoring: 32,
    Fitness: 20,
    Events: 24,
    "Real Estate": 18,
    "Finance & Legal": 16,
    Medical: 12,
    Beauty: 8,
    Food: 4,
    Tech: 2,
    Marketing: -20,
    Education: 10,
    Other: 0,
  };

  const SMART_PROSPECT_TEXT_SCORES = [
    { score: 100, pattern: /plumb|\bdrain\b|sewer|septic|water heater/i },
    { score: 99, pattern: /hvac|heating|air condition|furnace|\bcooling\b/i },
    { score: 98, pattern: /\broof|gutter/i },
    { score: 97, pattern: /electric|electrician/i },
    { score: 96, pattern: /water damage|flood restor/i },
    { score: 95, pattern: /mold remed/i },
    { score: 94, pattern: /garage door/i },
    { score: 93, pattern: /tree\s*(service|care|remov)|arborist|stump/i },
    { score: 92, pattern: /junk removal|trash.?out|haul.?away/i },
    { score: 91, pattern: /pest control|exterminat|mosquito/i },
    { score: 89, pattern: /locksmith/i },
    { score: 88, pattern: /\btow(ing| truck)?\b/i },
    { score: 87, pattern: /landscap|\blawn\b|irrigation|sprinkler/i },
    { score: 85, pattern: /concrete|masonry|asphalt|paving/i },
    { score: 84, pattern: /\bfloor|carpet|\btile\b|hardwood/i },
    { score: 83, pattern: /\bpaint(er|ing)\b/i },
    { score: 82, pattern: /\bfence\b/i },
    { score: 81, pattern: /\bpool\b|hot tub/i },
    { score: 80, pattern: /pressure wash|power wash/i },
    { score: 77, pattern: /handyman/i },
    { score: 76, pattern: /dry\s*wall|siding|stucco/i },
    { score: 66, pattern: /kitchen remodel|bathroom remodel|cabinet/i },
    { score: 60, pattern: /moving|\bmover/i },
    { score: 58, pattern: /security system|\balarm\b|cctv/i },
    { score: 54, pattern: /house clean|maid service|janitor/i },
    { score: -30, pattern: /web design|web develop|marketing agency|\bseo\b/i },
    { score: -50, pattern: /fire station|police|city hall|government/i },
  ];

  const SMART_PROSPECT_TOP_MIN = 60;

  const BASIC_CATEGORY_GROUPS = [
    { label: "Childcare", pattern: /daycare|day care|child ?care|preschool|babysit|\bnanny\b/i },
    { label: "Tutoring", pattern: /tutor/i },
    { label: "Education", pattern: /teacher|test prep|learning center|driving school|music lesson|\bacademy\b|education|school/i },
    { label: "Dental", pattern: /dental|dentist|orthodont|endodont|periodont/i },
    { label: "Medical", pattern: /chiropr|doctor|physician|clinic|medical|urgent care|optometr|optician|physical therapy|med spa|dermatolog|pediatric|hospital|surgeon|podiat/i },
    { label: "Beauty", pattern: /salon|barber|\bnail\b|\bhair\b|beauty|\blash|\bbrow\b|makeup|esthetic|waxing|tanning|massage|\bspa\b/i },
    { label: "Pets", pattern: /\bpet\b|\bdog\b|\bcat\b|\bvet\b|veterin|groom|kennel|\banimal\b|aquarium/i },
    { label: "Fitness", pattern: /\bgym\b|fitness|yoga|pilates|crossfit|martial art|karate|taekwondo|\bjiu\b|dance studio|personal train|trainer|workout/i },
    { label: "Food", pattern: /restaurant|cafe|coffee|bakery|\bfood\b|pizza|\bbar\b|grill|\bdeli\b|diner|eatery|catering|caterer|brewery|juice|smoothie|taqueria/i },
    { label: "Auto", pattern: /\bauto\b|\bcar\b|truck|\btire\b|mechanic|detailing|body shop|collision|towing|\btow\b|windshield|oil change|transmission|\btint\b|smog|muffler|\bbrake|\bboat\b|\brv\b|motorcycle|bicycle|bike shop/i },
    { label: "Plumbing", pattern: /plumb|\bdrain\b|sewer|septic|water heater/i },
    { label: "Electrical", pattern: /electric|solar/i },
    { label: "HVAC", pattern: /hvac|heating|air condition|furnace|\bcooling\b/i },
    { label: "Roofing", pattern: /\broof|gutter/i },
    { label: "Tree Service", pattern: /tree\s*(service|care|remov)|arborist|stump/i },
    { label: "Landscaping", pattern: /landscap|\blawn\b|\bgarden|\birrigation|sprinkler|pest control|exterminat|mosquito|\bsod\b/i },
    { label: "Pool", pattern: /\bpool\b|hot tub/i },
    { label: "Painting", pattern: /paint/i },
    { label: "Cleaning Services", pattern: /clean|janitor|\bmaid\b|housekeep|pressure wash|power wash/i },
    { label: "Flooring", pattern: /\bfloor|carpet|\btile\b|hardwood|laminate/i },
    { label: "Tech", pattern: /computer|laptop|tech support|\bit services?\b|phone repair|cell phone|electronics|web design|web develop|software|app develop/i },
    { label: "Marketing", pattern: /marketing|advertis|\bseo\b|branding|graphic design|design agency|\bprint\b|sign shop|signage/i },
    { label: "Security", pattern: /security|\balarm\b|surveillance|\bcctv\b|locksmith/i },
    { label: "Moving", pattern: /moving|\bmover|relocation|storage|junk removal|hauling/i },
    { label: "Construction", pattern: /remodel|renovat|construct|contractor|\bbuilder|concrete|masonry|stucco|drywall|dry wall|\bdeck\b|\bfence|cabinet|kitchen|bathroom|countertop|excavat|demolition|paving|asphalt|siding|insulation|installer|installation|framing|foundation/i },
    { label: "Home Repair", pattern: /handyman|\brepair\b|restoration|water damage|\bmold\b|chimney|fireplace|garage door|appliance|inspector|inspection|\bfix\b/i },
    { label: "Real Estate", pattern: /real estate|realtor|\brealty\b|mortgage|\bbroker|property management|home stag|\bstager\b|interior design|architect/i },
    { label: "Finance & Legal", pattern: /insurance|\btax\b|account|bookkeep|attorney|lawyer|\blegal\b|\bnotary\b|financial|\bcpa\b|payroll/i },
    { label: "Events", pattern: /photograph|videograph|wedding|\bevent\b|\bvenue\b|party rental|equipment rental|\brental\b|florist|flower|\bdj\b/i },
    { label: "Senior Care", pattern: /senior|assisted living|home health|home care|caregiver|hospice|\belder/i },
  ];

  const TOP_SEARCH_CATEGORIES = [
    "Plumbers",
    "HVAC",
    "Roofing",
    "Electricians",
    "Landscaping",
    "Tree Service",
    "Pest Control",
    "Garage Door Repair",
    "Cleaning Services",
    "Handyman",
    "Moving Companies",
    "Locksmiths",
    "Pressure Washing",
    "General Contractors",
    "Pool Service",
  ];

  function getLeadCategory(lead) {
    return String(
      lead?.categoryGroup || lead?.category || lead?.titleLine || lead?.name || ""
    ).trim();
  }

  function getBasicCategory(lead) {
    if (lead && lead.__lfBasicCat) return lead.__lfBasicCat;
    const rawCategory = getLeadCategory(lead);
    const hay = [
      rawCategory,
      lead?.searchQuery,
      lead?.search_query,
      lead?.query,
      lead?.name,
      lead?.category,
      lead?.categoryGroup,
      lead?.titleLine,
    ]
      .map((v) => String(v || ""))
      .join(" ");
    const group = BASIC_CATEGORY_GROUPS.find(
      (item) => item.pattern.test(hay) || (rawCategory && item.pattern.test(rawCategory))
    );
    const label = group ? group.label : "Other";
    if (lead) lead.__lfBasicCat = label;
    return label;
  }

  function getReviewCount(lead) {
    const n = Number(lead?.reviewCount);
    return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
  }

  function leadHasWebsite(lead) {
    if (typeof lead?.hasWebsite === "boolean") return lead.hasWebsite;
    if (global.LeadCsvFormat?.resolveLeadHasWebsite) {
      return global.LeadCsvFormat.resolveLeadHasWebsite(lead);
    }
    const url = String(lead?.website || "").trim();
    return !!url && url !== "\u2014" && !/^(none|n\/a)$/i.test(url);
  }

  function clearLeadRankCache(lead) {
    if (!lead || typeof lead !== "object") return;
    delete lead.__lfProspectScore;
    delete lead.__lfBasicCat;
  }

  function getWebsiteProspectScore(lead) {
    if (lead && typeof lead.__lfProspectScore === "number") return lead.__lfProspectScore;
    const basic = getBasicCategory(lead);
    let score = Number(SMART_PROSPECT_CATEGORY_SCORES[basic]) || 0;
    const hay = [
      lead?.category,
      lead?.categoryGroup,
      lead?.name,
      lead?.titleLine,
      lead?.search_query,
      lead?.query,
      lead?.searchQuery,
    ]
      .map((v) => String(v || ""))
      .join(" ");
    for (const item of SMART_PROSPECT_TEXT_SCORES) {
      if (item.pattern.test(hay) && item.score > score) score = item.score;
    }
    if (!leadHasWebsite(lead)) score += 12;
    const rating = Number(lead?.rating);
    const reviews = getReviewCount(lead);
    if (Number.isFinite(rating) && rating >= 4) score += 4;
    if (reviews >= 10) score += 3;
    if (reviews >= 50) score += 2;
    if (lead) lead.__lfProspectScore = score;
    return score;
  }

  function shuffleLeads(leads) {
    const rest = (leads || []).slice();
    for (let i = rest.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rest[i], rest[j]] = [rest[j], rest[i]];
    }
    return rest;
  }

  function applySmartProspectOrder(leads) {
    const indexed = (leads || []).map((lead, index) => ({
      lead,
      index,
      score: getWebsiteProspectScore(lead),
    }));
    const top = indexed
      .filter((row) => row.score >= SMART_PROSPECT_TOP_MIN)
      .sort((a, b) => b.score - a.score || a.index - b.index);
    const rest = indexed
      .filter((row) => row.score < SMART_PROSPECT_TOP_MIN)
      .sort((a, b) => a.index - b.index);
    return [...top, ...rest].map((row) => row.lead);
  }

  function prepareList(leads) {
    const list = Array.isArray(leads) ? leads.slice() : [];
    if (!list.length) return list;
    list.forEach(clearLeadRankCache);
    return applySmartProspectOrder(shuffleLeads(list));
  }

  global.LeadProspectRank = {
    TOP_MIN: SMART_PROSPECT_TOP_MIN,
    TOP_SEARCH_CATEGORIES,
    getBasicCategory,
    getWebsiteProspectScore,
    shuffleLeads,
    applySmartProspectOrder,
    prepareList,
  };
})(typeof window !== "undefined" ? window : globalThis);
