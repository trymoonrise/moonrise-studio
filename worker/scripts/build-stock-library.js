/**
 * Curated Unsplash photo IDs (photo-*) + verified video CDN URLs.
 * Run: node scripts/build-stock-library.js
 * Optional: node scripts/build-stock-library.js --verify
 */
"use strict";

const fs = require("fs");
const path = require("path");

const VIDEOS = {
  soft: "https://videos.pexels.com/video-files/5319759/5319759-uhd_2560_1440_25fps.mp4",
  nature: "https://videos.pexels.com/video-files/3195394/3195394-uhd_2560_1440_25fps.mp4",
  city: "https://videos.pexels.com/video-files/3129671/3129671-uhd_2560_1440_30fps.mp4",
  ambient: "https://videos.pexels.com/video-files/855281/855281-hd_1920_1080_25fps.mp4",
  ocean: "https://videos.pexels.com/video-files/3571264/3571264-uhd_2560_1440_30fps.mp4",
  forest: "https://videos.pexels.com/video-files/3209298/3209298-uhd_2560_1440_25fps.mp4",
  kitchen: "https://videos.pexels.com/video-files/5752729/5752729-uhd_2560_1440_30fps.mp4",
  coffee: "https://videos.pexels.com/video-files/4763824/4763824-uhd_2560_1440_24fps.mp4",
  people: "https://videos.pexels.com/video-files/1409899/1409899-hd_1920_1080_25fps.mp4",
  workout: "https://videos.pexels.com/video-files/2098989/2098989-hd_1920_1080_30fps.mp4",
  floral: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  cinematic: "https://archive.org/download/ElephantsDream/ed_1024_512kb.mp4",
  story: "https://archive.org/download/Sintel/sintel-2048-surround_512kb.mp4",
  bunny: "https://archive.org/download/BigBuckBunny_124/Content/big_buck_bunny_720p_surround.mp4",
};

/** Large pool of known Unsplash photo-* IDs used across trade packs. */
const POOL = {
  people: [
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
  ],
  barber: [
    "photo-1503951914875-452162b0f3f1",
    "photo-1621605815971-fbc98d665033",
    "photo-1599351431202-1e0f0137899a",
    "photo-1585747860715-2ba37e788b70",
    "photo-1622286342621-4bd786c2447c",
    "photo-1493256338651-d82f87cc8093",
    "photo-1605497788044-47f0c47b5f7f",
    "photo-1562322140-8baeececf3df",
    "photo-1522337660859-02fbefca4702",
    "photo-1595475038784-bbe439ff41e6",
    "photo-1616394584738-fc6e612e71b9",
    "photo-1580618672591-eb180b1a8626",
    "photo-1517832606299-7ae9b720a186",
    "photo-1633681926022-84c23e8cb2d6",
    "photo-1522337360788-8b57ee1e0d60",
  ],
  salon: [
    "photo-1560066984-138dadb4c035",
    "photo-1522337360788-8b57ee1e0d60",
    "photo-1516975080664-ed2fc6a32937",
    "photo-1487412947147-5cebf100ffc2",
    "photo-1522335789203-aabd1fc54bc9",
    "photo-1604654894610-df63bc536371",
    "photo-1519014816548-bf5fe059798b",
    "photo-1570172619644-dfd03ed5d881",
    "photo-1600334129128-685c5582fd35",
    "photo-1522337094846-8a818192de1f",
    "photo-1633681926022-84c23e8cb2d6",
    "photo-1595476108010-b4d1f102b1b1",
  ],
  spa: [
    "photo-1540555700478-4be289fbecef",
    "photo-1556228578-0d85b1a4d571",
    "photo-1600334129128-685c5582fd35",
    "photo-1544161515-4ab6ce6db874",
    "photo-1515377905703-c4788e51af15",
    "photo-1570172619644-dfd03ed5d881",
    "photo-1540553016722-983e48a2cd10",
    "photo-1519823551278-64ac92734fb1",
    "photo-1596178065887-1198b6148b2b",
    "photo-1507652313519-d4e9174996dd",
    "photo-1515378791036-0648a3ef77b2",
    "photo-1578683010236-d716f9a3f461",
  ],
  garden: [
    "photo-1416879595882-3373a0480b5b",
    "photo-1466692476866-aef36cc2a5b0",
    "photo-1585320806297-9794b3e4eeae",
    "photo-1558904541-efa843a96f01",
    "photo-1591857177580-dc82b9ac4e1e",
    "photo-1464226184884-fa280b87c399",
    "photo-1523348837708-15d4a54fcf5f",
    "photo-1501004318641-b39e6451bec6",
    "photo-1470058869958-2a77ade41c02",
    "photo-1466781783364-36c95514d2c8",
    "photo-1485955900006-10f4d324d411",
    "photo-1459411552884-841db9b3eb2a",
    "photo-1490750967868-88aa4486c946",
    "photo-1468327768560-75b778cbb551",
    "photo-1455659817273-f96807779a8a",
    "photo-1563241527-3004b7be0ffd",
  ],
  trades: [
    "photo-1621905251189-08b45d6a269e",
    "photo-1581578731548-c64695cc6952",
    "photo-1607472586893-edb57bdc0e39",
    "photo-1558618666-fcd25c85cd64",
    "photo-1504148455328-c376907d081c",
    "photo-1581092160562-40aa08e78837",
    "photo-1621905252507-b35492cc74b4",
    "photo-1504307651254-35680f356dfd",
    "photo-1584622650111-993a426fbf0a",
    "photo-1607400201889-565b1ee75f8c",
    "photo-1581092795360-fd1ca04f0952",
    "photo-1556911220-bff31c812dba",
    "photo-1504328348525-c112f609b9c0",
    "photo-1473341304170-971dccb5ac1e",
    "photo-1581092162384-8987c1d64718",
    "photo-1513828583688-c52646db42da",
    "photo-1565043589251-bf9bf5a55c0b",
    "photo-1541888946425-d81bb19240f5",
    "photo-1503387762-592deb58ef4e",
    "photo-1581094794329-c8112a89af12",
    "photo-1589939705387-ba8829e0ac0b",
    "photo-1562259949-e8e72308cbe0",
  ],
  books: [
    "photo-1481627834876-b7833e8f5570",
    "photo-1503676260728-1c00da094a0b",
    "photo-1456513080080-7e9c7f61f9d7",
    "photo-1523050854058-8df90110c9f1",
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
  ],
  food: [
    "photo-1414235077428-338989a2e8c0",
    "photo-1517248135467-4c7edcad34c4",
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
    "photo-1513104890138-7c749659a591",
    "photo-1574071318508-1cdbab80d002",
    "photo-1593560708920-61dd98c46a4e",
    "photo-1571997478779-2adcbbe9ab2f",
    "photo-1604382354936-07c5d9983bd3",
    "photo-1588315029754-2dd089d39a1a",
    "photo-1628840042765-356cda07504e",
  ],
  coffee: [
    "photo-1495474472287-4d71bcdd2085",
    "photo-1509042239860-f550ce710b93",
    "photo-1442512595331-e89e73853f31",
    "photo-1497935586351-b67a49e012bf",
    "photo-1511920170033-f8396924c348",
    "photo-1554118811-1e0d58224f24",
    "photo-1501339847302-ac426a4a7cbb",
    "photo-1461023058943-07fcbe16d735",
    "photo-1485808191679-5f86510681a2",
    "photo-1559925393-8be0ec4767c8",
    "photo-1495147466023-ac5c588e2e94",
    "photo-1509440159596-0249088772ff",
    "photo-1578985545062-69928b1d9587",
    "photo-1517433670267-08bbd4be890f",
  ],
  fitness: [
    "photo-1534438327276-14e5300c3a48",
    "photo-1517836357463-d25dfeac3438",
    "photo-1571019614242-c5c5dee9f50b",
    "photo-1540497077202-7c8a3999166f",
    "photo-1518611012118-696072aa579a",
    "photo-1576678927484-cc907957088c",
    "photo-1571019613454-1cb2f99b2d8b",
    "photo-1583454110551-21f2fa2afe61",
    "photo-1599058945522-28d584b6f14f",
    "photo-1517963879433-6ad2b056d712",
    "photo-1541534741688-6078c6bfb5c5",
    "photo-1574680096145-d05b474e2155",
    "photo-1434596922112-19c243789e3d",
    "photo-1550345332-09e3ac987596",
    "photo-1544367567-0f2fcb009e0b",
    "photo-1506126613408-eca07a6958b0",
    "photo-1599901860904-17e6ed7083a0",
    "photo-1575052814086-f385e2e2ad1b",
    "photo-1545205597-3d9d02c29597",
    "photo-1552196563-55cd4e45efb3",
  ],
  dental: [
    "photo-1629909613654-28e377c37b09",
    "photo-1606811841689-23dfddce3e95",
    "photo-1588776814546-1ffcf47267a5",
    "photo-1609840114035-3c981b782dfe",
    "photo-1598256989800-fe5f95da9787",
    "photo-1629909615184-74f495363b67",
    "photo-1607613009820-a29f7bb81c04",
  ],
  medical: [
    "photo-1631217868264-e5b90bb7e133",
    "photo-1579684385127-1ef15d508118",
    "photo-1516549655169-df83a0774514",
    "photo-1666214280557-f1b5022eb634",
    "photo-1559839734-2b71ea197ec2",
    "photo-1582750433449-648ed127bb54",
    "photo-1576091160399-112ba8d25d1d",
    "photo-1584820927498-cfe50432d146",
    "photo-1576091160550-2173dba07efd",
    "photo-1551076805-e1869033fa41",
    "photo-1516574187841-cb9cc2ca948b",
  ],
  pets: [
    "photo-1548199973-03cce0bbc87b",
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
  ],
  legal: [
    "photo-1589829545856-d10d557cf95f",
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
  ],
  finance: [
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
  ],
  homes: [
    "photo-1560518883-ce09059eeffa",
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
  ],
  auto: [
    "photo-1486262715619-67b85e0b08d3",
    "photo-1492144534655-ae79c964c9d7",
    "photo-1503376780353-7e6692767b70",
    "photo-1619642751034-765dfdf7c58e",
    "photo-1632823471565-1ecdf5c6d7b0",
    "photo-1625047509168-a7026f773785",
    "photo-1615900119312-2acad0c81dc0",
    "photo-1605559424843-9e4c228bf1c2",
    "photo-1486006920555-c77dcf18193c",
  ],
  office: [
    "photo-1497366811353-6870744d04b2",
    "photo-1497215728101-856f4ea42174",
    "photo-1521737711867-e3b97375f902",
    "photo-1552664730-d307ca884978",
    "photo-1600880292203-757bb62b4baf",
    "photo-1517245386807-bb43f82c33c4",
    "photo-1553877522-43269d4ea984",
    "photo-1531482615713-2afd69097998",
    "photo-1498050108023-c5249f4df085",
    "photo-1522071820081-009f0129c71c",
    "photo-1558655146-9f40138edfeb",
    "photo-1519389950473-47ba0277781c",
  ],
  photo: [
    "photo-1452587925148-ce544e77e70d",
    "photo-1516035069371-29a1b244cc32",
    "photo-1492691527719-9d1e07e534b4",
    "photo-1471341971476-ae15ff5dd4ea",
    "photo-1554048612-b6a482bc67e5",
    "photo-1606983340126-99ab4feaa64a",
    "photo-1542038784456-1ea8e935640e",
    "photo-1502920917128-1aa69837af2e",
    "photo-1554080353-a576cf803bda",
    "photo-1493863641943-9b68992a8d07",
  ],
  kids: [
    "photo-1503454537195-1dcabb73ffb9",
    "photo-1587654780291-39c9404d745b",
    "photo-1588072432836-e10032774350",
    "photo-1516627145497-ae6968895b74",
    "photo-1476703993599-0035a21b17a9",
    "photo-1596464716127-f2a82984de30",
  ],
  clean: [
    "photo-1563453392212-326f5e854473",
    "photo-1527515637462-cff94eecc1ac",
    "photo-1628177142898-93e36e4e3a50",
  ],
  extra: [
    "photo-1469474968028-56623f02e42e",
    "photo-1441974231531-c6227db76b6e",
    "photo-1506905925346-21bda4d32df4",
    "photo-1470071459604-3b5ec3a7fe05",
    "photo-1447752875215-b2761acb3c5d",
    "photo-1472214103451-9374bd1c798e",
    "photo-1433086966358-54859d0ed716",
    "photo-1501854145864-1ffd0daf1c1a",
    "photo-1444927714506-8492d94b4e3d",
    "photo-1475924156734-496f6cac6ec1",
    "photo-1519681393784-d120267933ba",
    "photo-1483728642387-6c3bdd6cf561",
    "photo-1464822759023-fed622ff2c3b",
    "photo-1500534314209-a25ddb2bd429",
    "photo-1511593358241-7eea1f3c84f5",
    "photo-1493246507139-91e8fad9978e",
    "photo-1470770841072-f978cf4d019e",
    "photo-1501785888041-af3ef285b470",
    "photo-1439066615861-d1af74d74000",
    "photo-1518837695005-2083093ee35b",
    "photo-1476514525535-07fb3b4ae5f1",
    "photo-1505144808411-42c4a3e0f0f5",
    "photo-1516483638261-f4dbaf036963",
    "photo-1523906834658-6e24ef2386f9",
    "photo-1493976040374-85c8e12f0c0e",
    "photo-1514565131-fce0801e5785",
    "photo-1449824913935-59a10b8d2000",
    "photo-1480714378408-67cf0d13bc1b",
    "photo-1477959858617-67f85cf4f1df",
    "photo-1514565131-fce0801e5785",
    "photo-1444723121867-7c03297d4f67",
    "photo-1486406146926-c627a92ad1ab",
    "photo-1514565131-fce0801e5785",
    "photo-1545324418-cc1a3fa10c00",
    "photo-1486406146926-c627a92ad1ab",
    "photo-1514565131-fce0801e5785",
    "photo-1497366754035-f200968a6e72",
    "photo-1497366811353-6870744d04b2",
    "photo-1497215842964-222b430dc094",
    "photo-1556761175-4b46a572b786",
    "photo-1556761175-5973dc0f32e7",
    "photo-1557804506-669a67965ba0",
    "photo-1559136555-9303baea8ebd",
    "photo-1542744173-8e2bd5376916",
    "photo-1552664730-d307ca884978",
    "photo-1600880292089-90a7e086ee0c",
    "photo-1556761175-b413da4baf72",
    "photo-1542744094-3a31f272c490",
    "photo-1516321318423-f06f85e504b3",
    "photo-1553877522-43269d4ea984",
    "photo-1460925895917-afdab827c52f",
    "photo-1551288049-bebda4e38f71",
    "photo-1504868584819-f8e8b4b67d8f",
    "photo-1516321497487-e288fb19713f",
    "photo-1454165804606-c3d57bc86b40",
    "photo-1507679799987-4efbaaf6d2d4",
    "photo-1556761175-5973dc0f32e7",
    "photo-1521737711867-e3b97375f902",
    "photo-1522202176988-66273c2fd55f",
    "photo-1517245386807-bb43f82c33c4",
    "photo-1531482615713-2afd69097998",
    "photo-1600880292203-757bb62b4baf",
    "photo-1517245386807-bb43f82c33c4",
    "photo-1553877522-43269d4ea984",
    "photo-1497366216548-37526070297c",
    "photo-1497366811353-6870744d04b2",
    "photo-1497215728101-856f4ea42174",
    "photo-1560179707-f14e90ef3623",
    "photo-1486406146926-c627a92ad1ab",
    "photo-1545324418-cc1a3fa10c00",
    "photo-1512917772120-2f13304f0931",
    "photo-1600585154340-be6161a56a0c",
    "photo-1600596542815-ffad4c1539a9",
    "photo-1600607687939-ce8a6c25118c",
    "photo-1600566753190-17f0baa2a6c3",
    "photo-1600047509807-ba8f99d2cdde",
    "photo-1570129477492-45c003edd2be",
    "photo-1564013799919-ab600027ffc6",
    "photo-1560518883-ce09059eeffa",
    "photo-1502672260266-1c1ef2d93688",
    "photo-1493809842364-78817add7ffb",
    "photo-1449844908441-8829872d2607",
    "photo-1605276374104-dee2a0ed3cd6",
  ],
};

function uniq(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function pick(arr, n, offset = 0) {
  const u = uniq(arr);
  const out = [];
  for (let i = 0; i < n && i < u.length; i += 1) {
    out.push(u[(i + offset) % u.length]);
  }
  return out;
}

function pack(label, match, imageSources, videoKeys, count = 14) {
  const images = uniq(imageSources.flat()).slice(0, count);
  while (images.length < count) {
    images.push(...pick(POOL.extra, count - images.length, images.length));
    break;
  }
  return {
    label,
    matchSource: match,
    images: uniq(images).slice(0, count),
    videos: videoKeys,
  };
}

const PACK_DEFS = [
  pack(
    "barbershop / men's cuts / fades",
    "/barber|fade|men'?s cut|clipper|barbershop|beard trim|shave shop/i",
    [POOL.barber, POOL.people, POOL.salon],
    ["people", "ambient", "soft"]
  ),
  pack(
    "hair salon / beauty / nails",
    "/hair salon|beauty salon|nail salon|hairstylist|blowout|colorist|manicure|pedicure/i",
    [POOL.salon, POOL.spa, POOL.people],
    ["soft", "floral", "people"]
  ),
  pack(
    "spa / massage / wellness",
    "/spa|massage|wellness|med ?spa|facial|aromatherapy|sauna|hot stone/i",
    [POOL.spa, POOL.people],
    ["soft", "floral", "nature"]
  ),
  pack(
    "landscaping / gardening / lawn care",
    "/landscap|garden|lawn|yard|tree service|hedge|mulch|irrigation|hardscape|plants?/i",
    [POOL.garden, POOL.extra],
    ["nature", "forest", "floral"]
  ),
  pack(
    "florist / flowers / arrangements",
    "/florist|flower shop|bouquet|floral design|wedding flower/i",
    [POOL.garden, POOL.spa],
    ["floral", "nature", "soft"],
    12
  ),
  pack(
    "plumbing / pipes / water heaters",
    "/plumb|pipe|drain|water heater|faucet|toilet|sewer|clog/i",
    [POOL.trades, POOL.homes],
    ["ambient", "city", "people"]
  ),
  pack(
    "electrician / wiring / panels",
    "/electric|wiring|breaker|panel|lighting install|outlet|circuit/i",
    [POOL.trades, POOL.office],
    ["city", "ambient", "people"],
    12
  ),
  pack(
    "HVAC / heating / air conditioning",
    "/hvac|heating|air ?condition|furnace|ac unit|duct|thermostat|heat pump/i",
    [POOL.trades, POOL.homes],
    ["ambient", "city", "people"],
    12
  ),
  pack(
    "roofing / gutters / exterior",
    "/roof|gutter|shingle|exterior|siding/i",
    [POOL.trades, POOL.homes],
    ["city", "ambient", "people"],
    12
  ),
  pack(
    "painting / interior finish",
    "/paint|painter|drywall|wallpaper|interior finish/i",
    [POOL.trades, POOL.homes, POOL.clean],
    ["ambient", "people", "soft"],
    12
  ),
  pack(
    "cleaning / janitorial / maid service",
    "/clean|janitor|maid|housekeep|pressure wash|carpet clean|office clean/i",
    [POOL.clean, POOL.homes, POOL.trades],
    ["soft", "ambient", "people"],
    12
  ),
  pack(
    "construction / contracting / remodeling",
    "/construct|contractor|remodel|builder|renovat|framing|carpentry|general contract|handyman/i",
    [POOL.trades, POOL.homes],
    ["city", "ambient", "people"]
  ),
  pack(
    "tutoring / education / schools / books",
    "/tutor|tutoring|school|teach|education|homework|math|sat|act|learning|academy|classroom|books?/i",
    [POOL.books, POOL.people, POOL.kids],
    ["people", "soft", "story"]
  ),
  pack(
    "daycare / childcare / kids",
    "/daycare|childcare|preschool|kids|children|nanny|after ?school/i",
    [POOL.kids, POOL.people, POOL.books],
    ["people", "soft", "story"],
    12
  ),
  pack(
    "restaurant / dining / fine food",
    "/restaurant|dining|bistro|steakhouse|grill|cuisine|fine dining/i",
    [POOL.food, POOL.people],
    ["kitchen", "coffee", "people"]
  ),
  pack(
    "pizza / italian / casual food",
    "/pizza|italian|pizzaria|slice|calzone/i",
    [POOL.food, POOL.coffee],
    ["kitchen", "coffee", "people"],
    12
  ),
  pack(
    "cafe / coffee / bakery",
    "/cafe|coffee|espresso|bakery|pastry|brunch|latte/i",
    [POOL.coffee, POOL.food, POOL.people],
    ["coffee", "soft", "people"]
  ),
  pack(
    "gym / fitness / training",
    "/gym|fitness|crossfit|personal train|workout|athletic|weightlifting|boxing/i",
    [POOL.fitness, POOL.people],
    ["workout", "city", "people"]
  ),
  pack(
    "yoga / pilates / mindful movement",
    "/yoga|pilates|meditation|mindful|stretch studio/i",
    [POOL.fitness.slice(-8), POOL.spa, POOL.people],
    ["soft", "nature", "floral"],
    12
  ),
  pack(
    "dental / orthodontics",
    "/dental|dentist|orthodont|teeth|oral|invisalign/i",
    [POOL.dental, POOL.medical, POOL.people],
    ["soft", "people", "ambient"]
  ),
  pack(
    "medical / clinic / healthcare",
    "/clinic|medical|doctor|health|urgent care|chiro|physical therapy|optom|derma|pediatric/i",
    [POOL.medical, POOL.people],
    ["soft", "people", "ambient"]
  ),
  pack(
    "pet grooming / boarding / vet",
    "/pet|dog|cat|groom|boarding|veterinar|animal|kennel/i",
    [POOL.pets, POOL.people],
    ["nature", "floral", "people"]
  ),
  pack(
    "law / attorney / legal",
    "/law|attorney|legal|lawyer|paralegal|litigation|notary/i",
    [POOL.legal, POOL.office, POOL.people],
    ["city", "cinematic", "people"]
  ),
  pack(
    "accounting / finance / insurance",
    "/account|finance|financial|insurance|tax|bookkeep|advisor|cpa|wealth/i",
    [POOL.finance, POOL.office, POOL.people],
    ["city", "cinematic", "people"]
  ),
  pack(
    "real estate / property",
    "/real estate|realtor|property|home ?sale|listing|broker/i",
    [POOL.homes, POOL.people],
    ["city", "ambient", "people"]
  ),
  pack(
    "auto repair / detailing / tires",
    "/auto|car detail|mechanic|tire|oil change|body shop|towing|garage/i",
    [POOL.auto, POOL.trades, POOL.people],
    ["city", "ambient", "people"]
  ),
  pack(
    "photography / creative studio",
    "/photograph|photo studio|wedding photo|portrait studio|videograph/i",
    [POOL.photo, POOL.people, POOL.extra],
    ["cinematic", "story", "people"]
  ),
  pack(
    "marketing / design / tech agency",
    "/agency|marketing|design studio|branding|digital|saas|software|startup|web design|seo/i",
    [POOL.office, POOL.people, POOL.finance],
    ["city", "story", "people"]
  ),
  pack(
    "moving / storage / hauling",
    "/moving|movers|storage|hauling|relocation|pack.?and.?ship/i",
    [POOL.homes, POOL.trades, POOL.people],
    ["city", "people", "ambient"],
    12
  ),
  pack(
    "local business / general",
    "/.*/",
    [POOL.office, POOL.people, POOL.homes, POOL.extra],
    ["city", "ambient", "people"],
    16
  ),
];

const PACK_KEYS = [
  "barber",
  "salon",
  "spa",
  "landscaping",
  "florist",
  "plumbing",
  "electrical",
  "hvac",
  "roofing",
  "painting",
  "cleaning",
  "construction",
  "tutoring",
  "daycare",
  "restaurant",
  "pizza",
  "cafe",
  "fitness",
  "yoga",
  "dental",
  "medical",
  "pets",
  "legal",
  "finance",
  "realestate",
  "auto",
  "photography",
  "agency",
  "moving",
  "default",
];

const PACKS = {};
PACK_KEYS.forEach((key, i) => {
  const def = PACK_DEFS[i];
  PACKS[key] = {
    label: def.label,
    images: def.images,
    videos: def.videos,
  };
});

const MATCHERS = PACK_KEYS.filter((k) => k !== "default").map((key, i) => ({
  key,
  re: PACK_DEFS[i].matchSource,
}));

async function verifyIds(ids) {
  const bad = [];
  const good = [];
  for (let i = 0; i < ids.length; i += 1) {
    const id = ids[i];
    const url = `https://images.unsplash.com/${id}?auto=format&fit=crop&w=80&q=10`;
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.status === 200) good.push(id);
      else bad.push({ id, status: res.status });
    } catch (e) {
      bad.push({ id, status: "ERR" });
    }
    if ((i + 1) % 40 === 0) console.error(`verified ${i + 1}/${ids.length}`);
  }
  return { good, bad };
}

async function main() {
  const allIds = uniq(Object.values(POOL).flat());
  const doVerify = process.argv.includes("--verify");

  let validSet = new Set(allIds);
  if (doVerify) {
    console.error("Verifying", allIds.length, "Unsplash IDs…");
    const { good, bad } = await verifyIds(allIds);
    validSet = new Set(good);
    console.error("good", good.length, "bad", bad.length);
    if (bad.length) console.error("sample bad", bad.slice(0, 20));
  }

  // Rebuild packs using only valid IDs when verifying
  for (const key of Object.keys(PACKS)) {
    PACKS[key].images = PACKS[key].images.filter((id) => validSet.has(id));
    // backfill from verified pool
    if (PACKS[key].images.length < 10) {
      for (const id of validSet) {
        if (PACKS[key].images.length >= 12) break;
        if (!PACKS[key].images.includes(id)) PACKS[key].images.push(id);
      }
    }
  }

  const uniqueImages = uniq(Object.values(PACKS).flatMap((p) => p.images));
  const outPath = path.join(__dirname, "..", "stock-media-library.js");
  const payload = {
    meta: {
      generatedAt: new Date().toISOString(),
      uniqueImages: uniqueImages.length,
      videoCount: Object.keys(VIDEOS).length,
      packCount: Object.keys(PACKS).length,
      totalAssets: uniqueImages.length + Object.keys(VIDEOS).length,
      sources: ["Unsplash CDN images", "Pexels / public CDN videos"],
    },
    VIDEOS,
    PACKS,
    MATCHERS,
    ALL_IMAGE_IDS: uniqueImages,
  };

  const body = `/**
 * Auto-generated stock media library for Moonrise Studio.
 * Sources: Unsplash (images) + Pexels / public CDN (videos).
 * Free for commercial use when hotlinked from these CDNs.
 *
 * Rebuild: node scripts/build-stock-library.js
 * Verify:  node scripts/build-stock-library.js --verify
 */
"use strict";

module.exports = ${JSON.stringify(payload, null, 2)};
`;

  fs.writeFileSync(outPath, body, "utf8");
  console.log(JSON.stringify(payload.meta, null, 2));
  console.log("wrote", outPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
