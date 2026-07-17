/**
 * Expand stock library toward 400+ verified assets.
 * Adds more Unsplash photo IDs + Pexels image CDN IDs, verifies, merges.
 * Run: node scripts/expand-stock-library.js
 */
"use strict";

const fs = require("fs");
const path = require("path");

const existing = require("../stock-media-library.js");

const U = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=80&q=10`;
const P = (id) =>
  `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=80`;

/** Additional Unsplash photo-* ids to try. */
const MORE_UNSPLASH = [
  "photo-1503951914875-452162b0f3f1",
  "photo-1517836357463-d25dfeac3438",
  "photo-1495474472287-4d71bcdd2085",
  "photo-1540555700478-4be289fbecef",
  "photo-1416879595882-3373a0480b5b",
  "photo-1481627834876-b7833e8f5570",
  "photo-1621905251189-08b45d6a269e",
  "photo-1534438327276-14e5300c3a48",
  "photo-1517248135467-4c7edcad34c4",
  "photo-1554118811-1e0d58224f24",
  "photo-1560066984-138dadb4c035",
  "photo-1629909613654-28e377c37b09",
  "photo-1548199973-03cce0bbc87b",
  "photo-1589829545856-d10d557cf95f",
  "photo-1560518883-ce09059eeffa",
  "photo-1486262715619-67b85e0b08d3",
  "photo-1452587925148-ce544e77e70d",
  "photo-1498050108023-c5249f4df085",
  "photo-1503454537195-1dcabb73ffb9",
  "photo-1513104890138-7c749659a591",
  "photo-1544367567-0f2fcb009e0b",
  "photo-1558904541-efa843a96f01",
  "photo-1591857177580-dc82b9ac4e1e",
  "photo-1464226184884-fa280b87c399",
  "photo-1501004318641-b39e6451bec6",
  "photo-1470058869958-2a77ade41c02",
  "photo-1485955900006-10f4d324d411",
  "photo-1490750967868-88aa4486c946",
  "photo-1468327768560-75b778cbb551",
  "photo-1455659817273-f96807779a8a",
  "photo-1563241527-3004b7be0ffd",
  "photo-1585320806297-9794b3e4eeae",
  "photo-1517832606299-7ae9b720a186",
  "photo-1622286342621-4bd786c2447c",
  "photo-1585747860715-2ba37e788b70",
  "photo-1616394584738-fc6e612e71b9",
  "photo-1562322140-8baeececf3df",
  "photo-1522337660859-02fbefca4702",
  "photo-1595475038784-bbe439ff41e6",
  "photo-1633681926022-84c23e8cb2d6",
  "photo-1516975080664-ed2fc6a32937",
  "photo-1487412947147-5cebf100ffc2",
  "photo-1522335789203-aabd1fc54bc9",
  "photo-1604654894610-df63bc536371",
  "photo-1519014816548-bf5fe059798b",
  "photo-1570172619644-dfd03ed5d881",
  "photo-1600334129128-685c5582fd35",
  "photo-1522337094846-8a818192de1f",
  "photo-1544161515-4ab6ce6db874",
  "photo-1515377905703-c4788e51af15",
  "photo-1540553016722-983e48a2cd10",
  "photo-1519823551278-64ac92734fb1",
  "photo-1596178065887-1198b6148b2b",
  "photo-1507652313519-d4e9174996dd",
  "photo-1515378791036-0648a3ef77b2",
  "photo-1578683010236-d716f9a3f461",
  "photo-1556228578-0d85b1a4d571",
  "photo-1607472586893-edb57bdc0e39",
  "photo-1558618666-fcd25c85cd64",
  "photo-1504148455328-c376907d081c",
  "photo-1581092160562-40aa08e78837",
  "photo-1621905252507-b35492cc74b4",
  "photo-1504307651254-35680f356dfd",
  "photo-1584622650111-993a426fbf0a",
  "photo-1581092795360-fd1ca04f0952",
  "photo-1556911220-bff31c812dba",
  "photo-1473341304170-971dccb5ac1e",
  "photo-1581092162384-8987c1d64718",
  "photo-1513828583688-c52646db42da",
  "photo-1541888946425-d81bb19240f5",
  "photo-1503387762-592deb58ef4e",
  "photo-1581094794329-c8112a89af12",
  "photo-1503676260728-1c00da094a0b",
  "photo-1427504494785-3a9ca7044f45",
  "photo-1509062522246-3755977927d7",
  "photo-1497633762265-9d179a990aa6",
  "photo-1524995997946-a1c2e315a42f",
  "photo-1512820790803-83ca734da794",
  "photo-1457369804613-52c61a468e7d",
  "photo-1434030216411-0b793f4b4173",
  "photo-1580582932707-520aed937b7b",
  "photo-1524178232363-1fb2b075b655",
  "photo-1491841550275-ad7854e35ca6",
  "photo-1522202176988-66273c2fd55f",
  "photo-1513258496099-48168024aec0",
  "photo-1414235077428-338989a2e8c0",
  "photo-1559339352-11d035aa65de",
  "photo-1504674900247-0877df9cc836",
  "photo-1555396273-367ea4eb4db5",
  "photo-1476224203421-9ac39bcb3327",
  "photo-1577219491135-ce391730fb2c",
  "photo-1552566626-52f8b828add9",
  "photo-1466978913421-dad2ebd01d17",
  "photo-1424847651672-bf20a4b0982b",
  "photo-1544025162-d76694265947",
  "photo-1565299624946-b28f40a0ae38",
  "photo-1574071318508-1cdbab80d002",
  "photo-1593560708920-61dd98c46a4e",
  "photo-1571997478779-2adcbbe9ab2f",
  "photo-1604382354936-07c5d9983bd3",
  "photo-1588315029754-2dd089d39a1a",
  "photo-1628840042765-356cda07504e",
  "photo-1509042239860-f550ce710b93",
  "photo-1442512595331-e89e73853f31",
  "photo-1497935586351-b67a49e012bf",
  "photo-1511920170033-f8396924c348",
  "photo-1501339847302-ac426a4a7cbb",
  "photo-1461023058943-07fcbe16d735",
  "photo-1485808191679-5f86510681a2",
  "photo-1559925393-8be0ec4767c8",
  "photo-1495147466023-ac5c588e2e94",
  "photo-1509440159596-0249088772ff",
  "photo-1578985545062-69928b1d9587",
  "photo-1517433670267-08bbd4be890f",
  "photo-1571019614242-c5c5dee9f50b",
  "photo-1540497077202-7c8a3999166f",
  "photo-1518611012118-696072aa579a",
  "photo-1576678927484-cc907957088c",
  "photo-1571019613454-1cb2f99b2d8b",
  "photo-1583454110551-21f2fa2afe61",
  "photo-1517963879433-6ad2b056d712",
  "photo-1541534741688-6078c6bfb5c5",
  "photo-1574680096145-d05b474e2155",
  "photo-1599901860904-17e6ed7083a0",
  "photo-1575052814086-f385e2e2ad1b",
  "photo-1545205597-3d9d02c29597",
  "photo-1552196563-55cd4e45efb3",
  "photo-1606811841689-23dfddce3e95",
  "photo-1588776814546-1ffcf47267a5",
  "photo-1609840114035-3c981b782dfe",
  "photo-1598256989800-fe5f95da9787",
  "photo-1629909615184-74f495363b67",
  "photo-1607613009820-a29f7bb81c04",
  "photo-1631217868264-e5b90bb7e133",
  "photo-1579684385127-1ef15d508118",
  "photo-1516549655169-df83a0774514",
  "photo-1666214280557-f1b5022eb634",
  "photo-1559839734-2b71ea197ec2",
  "photo-1582750433449-648ed127bb54",
  "photo-1576091160399-112ba8d25d1d",
  "photo-1576091160550-2173dba07efd",
  "photo-1551076805-e1869033fa41",
  "photo-1516574187841-cb9cc2ca948b",
  "photo-1450778869180-41d0601e046e",
  "photo-1516734212186-a967f81ad0d7",
  "photo-1601758228041-f3b2795255f1",
  "photo-1583511655857-d19b40a7a54e",
  "photo-1537151608828-ea2b11777ee8",
  "photo-1587300003388-59208cc962cb",
  "photo-1544568100-847a948585b9",
  "photo-1514888286974-6c03e2ca1dba",
  "photo-1574158622682-e40e69881006",
  "photo-1425082661705-1834bfd09dca",
  "photo-1543466835-00a7907e9de1",
  "photo-1583337130417-3346a1be7dee",
  "photo-1598133894008-61f7fdb8cc3a",
  "photo-1450101499163-c8848c66ca85",
  "photo-1505664194779-8beaceb93744",
  "photo-1521791136064-7986c2920216",
  "photo-1454165804606-c3d57bc86b40",
  "photo-1497366216548-37526070297c",
  "photo-1486406146926-c627a92ad1ab",
  "photo-1556761175-5973dc0f32e7",
  "photo-1560179707-f14e90ef3623",
  "photo-1507679799987-4efbaaf6d2d4",
  "photo-1436450412741-6c536d876f21",
  "photo-1479142506502-19b3a4b4bd15",
  "photo-1589391886645-d51941baf7fb",
  "photo-1554224155-6726b3ff858f",
  "photo-1460925895917-afdab827c52f",
  "photo-1551288049-bebda4e38f71",
  "photo-1579621970563-ebec7560ff3e",
  "photo-1563986768609-322da13575f3",
  "photo-1556761175-b413da4baf72",
  "photo-1611974789855-9c2a0a7236a3",
  "photo-1590283603385-17ffb3a7f81f",
  "photo-1633158829585-23ba8f7c8caf",
  "photo-1554224154-26032ffc0d62",
  "photo-1563013544-824ae1b704d3",
  "photo-1526304640581-d334cdbbf45e",
  "photo-1642543492481-44e81e3914a7",
  "photo-1564013799919-ab600027ffc6",
  "photo-1600596542815-ffad4c1539a9",
  "photo-1600585154340-be6161a56a0c",
  "photo-1600607687939-ce8a6c25118c",
  "photo-1600566753190-17f0baa2a6c3",
  "photo-1600047509807-ba8f99d2cdde",
  "photo-1512917772120-2f13304f0931",
  "photo-1570129477492-45c003edd2be",
  "photo-1493809842364-78817add7ffb",
  "photo-1502672260266-1c1ef2d93688",
  "photo-1605276374104-dee2a0ed3cd6",
  "photo-1449844908441-8829872d2607",
  "photo-1600585152220-90363fe7e115",
  "photo-1600566752355-35792bedcfea",
  "photo-1484154218962-a197022b5858",
  "photo-1556912173-46c336c7fd55",
  "photo-1492144534655-ae79c964c9d7",
  "photo-1503376780353-7e6692767b70",
  "photo-1619642751034-765dfdf7c58e",
  "photo-1632823471565-1ecdf5c6d7b0",
  "photo-1625047509168-a7026f773785",
  "photo-1615900119312-2acad0c81dc0",
  "photo-1605559424843-9e4c228bf1c2",
  "photo-1486006920555-c77dcf18193c",
  "photo-1497366811353-6870744d04b2",
  "photo-1497215728101-856f4ea42174",
  "photo-1521737711867-e3b97375f902",
  "photo-1552664730-d307ca884978",
  "photo-1600880292203-757bb62b4baf",
  "photo-1517245386807-bb43f82c33c4",
  "photo-1553877522-43269d4ea984",
  "photo-1531482615713-2afd69097998",
  "photo-1522071820081-009f0129c71c",
  "photo-1558655146-9f40138edfeb",
  "photo-1519389950473-47ba0277781c",
  "photo-1516035069371-29a1b244cc32",
  "photo-1492691527719-9d1e07e534b4",
  "photo-1471341971476-ae15ff5dd4ea",
  "photo-1554048612-b6a482bc67e5",
  "photo-1606983340126-99ab4feaa64a",
  "photo-1542038784456-1ea8e935640e",
  "photo-1502920917128-1aa69837af2e",
  "photo-1554080353-a576cf803bda",
  "photo-1493863641943-9b68992a8d07",
  "photo-1587654780291-39c9404d745b",
  "photo-1588072432836-e10032774350",
  "photo-1516627145497-ae6968895b74",
  "photo-1476703993599-0035a21b17a9",
  "photo-1596464716127-f2a82984de30",
  "photo-1563453392212-326f5e854473",
  "photo-1527515637462-cff94eecc1ac",
  "photo-1628177142898-93e36e4e3a50",
  "photo-1469474968028-56623f02e42e",
  "photo-1441974231531-c6227db76b6e",
  "photo-1506905925346-21bda4d32df4",
  "photo-1470071459604-3b5ec3a7fe05",
  "photo-1447752875215-b2761acb3c5d",
  "photo-1472214103451-9374bd1c798e",
  "photo-1433086966358-54859d0ed716",
  "photo-1501854145864-1ffd0daf1c1a",
  "photo-1519681393784-d120267933ba",
  "photo-1483728642387-6c3bdd6cf561",
  "photo-1464822759023-fed622ff2c3b",
  "photo-1500534314209-a25ddb2bd429",
  "photo-1493246507139-91e8fad9978e",
  "photo-1470770841072-f978cf4d019e",
  "photo-1501785888041-af3ef285b470",
  "photo-1439066615861-d1af74d74000",
  "photo-1518837695005-2083093ee35b",
  "photo-1476514525535-07fb3b4ae5f1",
  "photo-1516483638261-f4dbaf036963",
  "photo-1523906834658-6e24ef2386f9",
  "photo-1493976040374-85c8e12f0c0e",
  "photo-1449824913935-59a10b8d2000",
  "photo-1480714378408-67cf0d13bc1b",
  "photo-1477959858617-67f85cf4f1df",
  "photo-1444723121867-7c03297d4f67",
  "photo-1545324418-cc1a3fa10c00",
  "photo-1497366754035-f200968a6e72",
  "photo-1497215842964-222b430dc094",
  "photo-1556761175-4b46a572b786",
  "photo-1557804506-669a67965ba0",
  "photo-1559136555-9303baea8ebd",
  "photo-1542744173-8e2bd5376916",
  "photo-1600880292089-90a7e086ee0c",
  "photo-1542744094-3a31f272c490",
  "photo-1516321318423-f06f85e504b3",
  "photo-1504868584819-f8e8b4b67d8f",
  "photo-1516321497487-e288fb19713f",
  "photo-1507003211169-0a1dd7228f2d",
  "photo-1494790108377-be9c29b29330",
  "photo-1438761681033-6461ffad8d80",
  "photo-1472099645785-5658abf4ff4e",
  "photo-1534528741775-53994a69daeb",
  "photo-1500648767791-00dcc994a43e",
  "photo-1544005313-94ddf0286df2",
  "photo-1531746020798-e6953c6e8e04",
  "photo-1506794778202-cad84cf45f1d",
  "photo-1517841905240-472988babdf9",
  "photo-1529626455594-4ff0802cfb7e",
  "photo-1539571696357-5a69c17a67c6",
  "photo-1524504388940-b1c1722653e1",
  "photo-1487412720507-e7ab37603c6f",
  "photo-1573496359142-b8d87734a5a2",
  "photo-1560250097-0b93528c311a",
  "photo-1573497019940-1c28c88b4f3e",
  "photo-1580489944761-15a19d654956",
  "photo-1599566150163-29194dcaad36",
  "photo-1552058544-f2b08422138a",
  // more lifestyle / trade
  "photo-1556912172-45b7abe8b7e1",
  "photo-1581578017093-cd30efc5b0b0",
  "photo-1615876234674-4b2e0b0b0b0b",
  "photo-1595476108010-b4d1f102b1b1",
  "photo-1621605815971-fbc98d665033",
  "photo-1599351431202-1e0f0137899a",
  "photo-1581578731548-c64695cc6952",
];

/** Popular Pexels numeric photo IDs (CDN pattern is stable). */
const PEXELS_IDS = [
  417074, 1103970, 3225517, 1386604, 1287145, 210186, 414612, 355465, 459225,
  462162, 326055, 36717, 158607, 33109, 1323550, 167699, 1366919, 1287142,
  132037, 147411, 206359, 235615, 417173, 462024, 572897, 572619, 572897,
  775201, 807598, 910831, 1001682, 1028225, 1031232, 1034662, 1054218,
  1054289, 1054293, 1061640, 1089438, 1098365, 1103970, 1122408, 1134176,
  1141853, 1157255, 1166209, 1179229, 1183099, 1191710, 1209843, 1226302,
  1237119, 1252500, 1252890, 1261728, 1266808, 1271619, 1285625, 1292115,
  1308624, 131723, 1323550, 133459, 1341279, 1352983, 1366919, 1370296,
  1374064, 1386604, 139162, 1402787, 1415248, 1420440, 1430676, 1440727,
  145939, 1462017, 147411, 1485894, 1509428, 1525041, 1532771, 1547813,
  1550337, 1563356, 1571174, 158607, 159711, 1603650, 1619317, 1624496,
  1640770, 1640777, 1659438, 1666021, 167699, 1687657, 169647, 170811,
  1722183, 1732414, 1743229, 1755683, 1761279, 1770809, 1784577, 1796730,
  1809644, 1828687, 1838550, 1851164, 186077, 1873494, 1888004, 189349,
  1904769, 1915380, 1926769, 1933399, 1955134, 196324, 1974596, 1983037,
  1996333, 2007401, 2014422, 2026324, 2047905, 206359, 2072583, 208636,
  209065, 210186, 2116475, 2128249, 214574, 2156, 2166, 2199293, 220201,
  22185, 2248517, 2253879, 2260784, 2275298, 2280549, 2294361, 2306281,
  2317710, 2325446, 233698, 2343171, 235615, 2362004, 2379004, 2387873,
  2398361, 240040, 2412603, 2422461, 2437291, 2440009, 245022, 2467506,
  2478248, 248771, 2495555, 2506923, 251225, 2529148, 2531608, 2544829,
  255441, 2562992, 2574643, 258154, 2599244, 261662, 262047, 2635038,
  264636, 265722, 2662116, 267885, 268533, 2696064, 2706654, 271816,
  2732382, 2747449, 275753, 276528, 2775196, 278887, 2792156, 280222,
  2820884, 2832382, 2846814, 2866757, 288100, 2896626, 2901209, 291528,
  2923034, 2933243, 2949576, 296282, 2977565, 298244, 2990644, 300980,
  302769, 303383, 3044470, 3052361, 3062541, 3075993, 3083386, 3097286,
  310452, 311039, 3125195, 313782, 314726,
];

async function headOk(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.status === 200;
  } catch (_) {
    return false;
  }
}

async function main() {
  const have = new Set(existing.ALL_IMAGE_IDS || []);
  const assets = [];

  // Keep existing as Unsplash refs
  for (const id of existing.ALL_IMAGE_IDS || []) {
    assets.push({ source: "unsplash", id, url: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=80` });
  }

  const tryUnsplash = [...new Set(MORE_UNSPLASH)].filter((id) => !have.has(id));
  console.error("Checking", tryUnsplash.length, "extra Unsplash IDs…");
  for (let i = 0; i < tryUnsplash.length; i += 1) {
    const id = tryUnsplash[i];
    if (await headOk(U(id))) {
      have.add(id);
      assets.push({
        source: "unsplash",
        id,
        url: `https://images.unsplash.com/${id}?auto=format&fit=crop&w=1600&q=80`,
      });
    }
    if ((i + 1) % 50 === 0) console.error("unsplash", i + 1, "ok", assets.length);
  }

  const tryPexels = [...new Set(PEXELS_IDS)].filter((id) => !have.has(`pexels-${id}`));
  console.error("Checking", tryPexels.length, "Pexels IDs…");
  for (let i = 0; i < tryPexels.length; i += 1) {
    const id = tryPexels[i];
    if (await headOk(P(id))) {
      const key = `pexels-${id}`;
      have.add(key);
      assets.push({
        source: "pexels",
        id: key,
        url: `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=1600`,
      });
    }
    if ((i + 1) % 40 === 0) console.error("pexels", i + 1, "ok", assets.length);
    if (assets.length >= 420) break;
  }

  // Assign extras round-robin into packs so each trade gets more gallery shots
  const packKeys = Object.keys(existing.PACKS);
  const extras = assets.map((a) => a.url);
  for (let i = 0; i < extras.length; i += 1) {
    const key = packKeys[i % packKeys.length];
    const pack = existing.PACKS[key];
    if (!pack.galleryUrls) pack.galleryUrls = [];
    if (pack.galleryUrls.length < 20) pack.galleryUrls.push(extras[i]);
  }

  // Also store full flat catalog
  existing.CATALOG = assets;
  existing.meta = {
    generatedAt: new Date().toISOString(),
    uniqueImages: assets.length,
    videoCount: Object.keys(existing.VIDEOS || {}).length,
    packCount: packKeys.length,
    totalAssets: assets.length + Object.keys(existing.VIDEOS || {}).length,
    sources: ["Unsplash CDN images", "Pexels CDN images", "Pexels / public CDN videos"],
  };
  existing.ALL_IMAGE_IDS = assets.map((a) => a.id);
  existing.ALL_IMAGE_URLS = assets.map((a) => a.url);

  const outPath = path.join(__dirname, "..", "stock-media-library.js");
  const body = `/**
 * Auto-generated stock media library for Moonrise Studio.
 * Sources: Unsplash + Pexels CDNs (images), Pexels / public CDNs (videos).
 *
 * Rebuild base:   node scripts/build-stock-library.js --verify
 * Expand to 400+: node scripts/expand-stock-library.js
 */
"use strict";

module.exports = ${JSON.stringify(existing, null, 2)};
`;
  fs.writeFileSync(outPath, body, "utf8");
  console.log(JSON.stringify(existing.meta, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
