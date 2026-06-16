import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const books = [
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    title: "诗经注疏",
    author: "毛亨 郑玄",
    era: "先秦",
    description: "《诗经注疏》为汉代毛亨传、郑玄笺之经典注本，汇集先秦诗歌三百余篇，为儒家经典之首。其注疏详备，为后世治诗者所宗。",
    coverUrl: "/images/cover-1.jpg",
    pageCount: 8
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567891",
    title: "楚辞集注",
    author: "王逸 朱熹",
    era: "西汉",
    description: "《楚辞集注》收录屈原及后世仿作之辞赋，王逸章句与朱熹集注并行，为楚辞学研究之双璧。",
    coverUrl: "/images/cover-2.jpg",
    pageCount: 10
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567892",
    title: "论语正义",
    author: "何晏 邢昺",
    era: "东汉",
    description: "《论语正义》以何晏集解为本，邢昺疏义辅之，阐发孔门言行微旨，为经学要籍。",
    coverUrl: "/images/cover-3.jpg",
    pageCount: 7
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567893",
    title: "道德经河上公注",
    author: "河上公",
    era: "魏晋",
    description: "河上公注《道德经》，以修身治国为旨，分八十一章，言简意深，为道家注疏之鼻祖。",
    coverUrl: "/images/cover-4.jpg",
    pageCount: 9
  },
  {
    id: "a1b2c3d4-e5f6-7890-abcd-ef1234567894",
    title: "山海经校注",
    author: "郭璞 袁珂",
    era: "唐代",
    description: "《山海经校注》以郭璞古注为基，袁珂详加校勘，记载山川异物、神话传说，为上古地理奇书。",
    coverUrl: "/images/cover-5.jpg",
    pageCount: 11
  }
];

const contentPools = {
  "a1b2c3d4-e5f6-7890-abcd-ef1234567890": [
    "关关雎鸠，在河之洲。窈窕淑女，君子好逑。",
    "蒹葭苍苍，白露为霜。所谓伊人，在水一方。",
    "昔我往矣，杨柳依依。今我来思，雨雪霏霏。",
    "桃之夭夭，灼灼其华。之子于归，宜其室家。",
    "毛氏传云：此诗言后妃之德，所以风天下而正夫妇也。",
    "郑笺曰：诗人因所见而起兴，以喻君子求淑女之意。",
    "疏：此章言文王之化行于江汉之间，女子能守贞正。",
    "注：古文经传多异文，此从鲁诗说，与齐韩不同。",
    "采薇采薇，薇亦作止。曰归曰归，岁亦莫止。",
    "投我以木桃，报之以琼瑶。匪报也，永以为好也。",
    "风雨如晦，鸡鸣不已。既见君子，云胡不喜。",
    "青青子衿，悠悠我心。纵我不往，子宁不嗣音。",
    "毛传：兴也，言后妃有关雎之德，乃能共荇菜以事宗庙。",
    "郑玄笺：言贤女能幽闲贞专，非关雎之鸟亦不能匹。",
    "疏曰：此章言文王之德，能使人修身齐家。",
    "南有樛木，葛藟累之。乐只君子，福履绥之。",
    "螽斯羽，诜诜兮。宜尔子孙，振振兮。",
    "淇奥之诗，美武公之德也。有文章，又能听其规谏。",
    "硕人其颀，衣锦褧衣。齐侯之子，卫侯之妻。",
    "七月流火，九月授衣。一之日觱发，二之日栗烈。",
    "毛亨曰：诗者，志之所之也，在心为志，发言为诗。",
    "疏：风雅颂者，诗之体也；赋比兴者，诗之用也。",
    "呦呦鹿鸣，食野之苹。我有嘉宾，鼓瑟吹笙。",
    "如切如磋，如琢如磨。瑟兮僩兮，赫兮咺兮。"
  ],
  "a1b2c3d4-e5f6-7890-abcd-ef1234567891": [
    "路漫漫其修远兮，吾将上下而求索。",
    "长太息以掩涕兮，哀民生之多艰。",
    "亦余心之所善兮，虽九死其犹未悔。",
    "王逸注：屈原忠而被谤，信而见疑，故发愤以作辞。",
    "朱熹集注：此章言己之志不可夺，虽九死犹不悔也。",
    "九歌者，屈原所作祭祀之乐歌也，凡十一篇。",
    "帝子降兮北渚，目眇眇兮愁予。袅袅兮秋风，洞庭波兮木叶下。",
    "与天地兮同寿，与日月兮齐光。",
    "悲哉秋之为气也！萧瑟兮草木摇落而变衰。",
    "王逸曰：离骚者，犹离忧也。屈原之作离骚，盖自怨生也。",
    "朝饮木兰之坠露兮，夕餐秋菊之落英。",
    "朱熹云：楚辞之体，源于巫祝，成于屈子，文采华茂。",
    "乘骐骥以驰骋兮，来吾道夫先路。",
    "日月忽其不淹兮，春与秋其代序。",
    "惟草木之零落兮，恐美人之迟暮。",
    "制芰荷以为衣兮，集芙蓉以为裳。",
    "不吾知其亦已兮，苟余情其信芳。",
    "疏：九章者，屈原既放，思君念国，随事感触而作。",
    "湘夫人降于北渚，望夫君兮未来，吹参差兮谁思。",
    "魂兮归来！东方不可以托些。",
    "朱熹曰：远游一篇，体仿离骚，而文意深远。",
    "余处幽篁兮终不见天，路险难兮独后来。",
    "风飒飒兮木萧萧，思公子兮徒离忧。",
    "举世皆浊我独清，众人皆醉我独醒。"
  ],
  "a1b2c3d4-e5f6-7890-abcd-ef1234567892": [
    "子曰：学而时习之，不亦说乎？有朋自远方来，不亦乐乎？",
    "子曰：巧言令色，鲜矣仁。",
    "何晏集解：此章言君子务本，本立而道生。",
    "邢昺疏：仁者爱之理，心之德也，为众善之长。",
    "子曰：为政以德，譬如北辰，居其所而众星共之。",
    "子曰：吾十有五而志于学，三十而立，四十而不惑。",
    "何晏曰：仁者自处于厚，故能爱人。",
    "邢昺曰：学之为言效也，人性皆善而觉有先后。",
    "子曰：温故而知新，可以为师矣。",
    "子曰：君子不重则不威，学则不固。",
    "曾子曰：吾日三省吾身，为人谋而不忠乎？",
    "子曰：弟子入则孝，出则弟，谨而信，泛爱众。",
    "何晏注：孝弟也者，其为仁之本与！",
    "子曰：诗三百，一言以蔽之，曰思无邪。",
    "疏：此章论为政之道，当以德化民。",
    "子曰：三人行，必有我师焉。择其善者而从之，其不善者而改之。",
    "子贡问曰：有一言而可以终身行之者乎？子曰：其恕乎！",
    "子曰：默而识之，学而不厌，诲人不倦，何有于我哉？",
    "邢昺疏：此篇首言学道，次言修德，终言为政之要。",
    "子曰：知之为知之，不知为不知，是知也。",
    "有子曰：礼之用，和为贵。先王之道，斯为美。",
    "子曰：见贤思齐焉，见不贤而内自省也。"
  ],
  "a1b2c3d4-e5f6-7890-abcd-ef1234567893": [
    "道可道，非常道。名可名，非常名。",
    "上善若水，水善利万物而不争。",
    "河上公注：道谓经术政教之道也，非自然长生之道。",
    "无名天地之始，有名万物之母。",
    "天下皆知美之为美，斯恶已。皆知善之为善，斯不善已。",
    "注：此章明道之体用，有无相生之理。",
    "道生一，一生二，二生三，三生万物。",
    "河上公曰：道以无为化，以自然成。",
    "大方无隅，大器晚成，大音希声，大象无形。",
    "知人者智，自知者明。胜人者有力，自胜者强。",
    "天之道，不争而善胜，不言而善应。",
    "河上公注：治国当如烹小鲜，不可烦扰。",
    "致虚极，守静笃。万物并作，吾以观复。",
    "祸兮福之所倚，福兮祸之所伏。",
    "人法地，地法天，天法道，道法自然。",
    "河上公曰：道性自然，无所法也。",
    "将欲翕之，必固张之。将欲弱之，必固强之。",
    "柔弱胜刚强。鱼不可脱于渊，国之利器不可以示人。",
    "注：此言守柔处下之道，乃长生久视之术。",
    "合抱之木，生于毫末；九层之台，起于累土。",
    "信言不美，美言不信。善者不辩，辩者不善。",
    "河上公注：上德不德，是以有德；下德不失德，是以无德。"
  ],
  "a1b2c3d4-e5f6-7890-abcd-ef1234567894": [
    "又东三百里，曰基山，其阳多玉，其阴多怪木。",
    "郭璞注：此经所记山川，多不可考，然存古之名。",
    "有兽焉，其状如狐而九尾，其音如婴儿，能食人。",
    "南山经之首曰鹊山，其首曰招摇之山，临于西海之上。",
    "注：古之巫书，记四海异物，博物者所珍。",
    "又西三百五十里，曰玉山，是西王母所居也。",
    "郭璞曰：山海经所载，虽多怪诞，亦有地理可征者。",
    "有鸟焉，其状如鸡，五采而文，名曰凤皇。",
    "又北二百里，曰发鸠之山，其上多柘木。有鸟焉，名曰精卫。",
    "袁珂校注：此经文多讹夺，今据他本校正。",
    "东海之外大壑，少昊之国。少昊孺帝颛顼于此。",
    "郭璞注：精卫常衔西山木石以填东海，志在不屈。",
    "有木焉，其状如牛，引之有皮，若缨黄蛇。",
    "又东四百里，曰亶爰之山，多水，无草木，不可以上。",
    "注：山经叙五方山川，虽间出异闻，实地理之祖。",
    "西王母其状如人，豹尾虎齿而善啸，蓬发戴胜。",
    "又西北四百二十里，曰钟山，其子曰鼓，其状如人面龙身。",
    "郭璞曰：此盖古之图腾遗说，非尽无据。",
    "氐人国在建木西，其为人人面而鱼身，无足。",
    "袁珂按：山海经所记异国，或即远古部族之传说。",
    "又南三百里，曰天帝之山，多棕枏，多犀象。",
    "有草焉，其状如葵而臭，名曰薰草，可以已疠。"
  ]
};

const animations = ["fade", "slide", "zoom"];

function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generatePosition(index, total) {
  const cols = Math.ceil(Math.sqrt(total));
  const rows = Math.ceil(total / cols);
  const col = index % cols;
  const row = Math.floor(index / cols);

  const cellW = 1.0 / cols;
  const cellH = 1.0 / rows;

  const margin = 0.02;
  const x = col * cellW + margin + Math.random() * 0.02;
  const y = row * cellH + margin + Math.random() * 0.02;
  const w = cellW - margin * 2 - Math.random() * 0.03;
  const h = cellH - margin * 2 - Math.random() * 0.03;

  return {
    x: Math.round(x * 1000) / 1000,
    y: Math.round(y * 1000) / 1000,
    width: Math.round(Math.max(0.1, w) * 1000) / 1000,
    height: Math.round(Math.max(0.1, h) * 1000) / 1000
  };
}

const pages = {};

books.forEach((book) => {
  const rng = seededRandom(book.pageCount * 137 + book.title.length * 53);
  const pool = contentPools[book.id];
  let textIndex = 0;
  let imageIndex = 0;

  pages[book.id] = [];

  for (let p = 0; p < book.pageCount; p++) {
    const blockCount = 6 + Math.floor(rng() * 5);
    const textCount = Math.round(blockCount * 0.6);
    const imageCount = blockCount - textCount;

    const blockTypes = [];
    for (let i = 0; i < textCount; i++) blockTypes.push("text");
    for (let i = 0; i < imageCount; i++) blockTypes.push("image");

    for (let i = blockTypes.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [blockTypes[i], blockTypes[j]] = [blockTypes[j], blockTypes[i]];
    }

    const page = [];

    for (let b = 0; b < blockCount; b++) {
      const type = blockTypes[b];
      let content;

      if (type === "text") {
        content = pool[textIndex % pool.length];
        textIndex++;
      } else {
        content = `/images/page-${(imageIndex % 10) + 1}.jpg`;
        imageIndex++;
      }

      const pos = generatePosition(b, blockCount);
      const animation = animations[Math.floor(rng() * 3)];

      page.push({ type, content, position: pos, animation });
    }

    pages[book.id].push(page);
  }
});

const outDir = path.join(__dirname, "data");

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(
  path.join(outDir, "books.json"),
  JSON.stringify(books, null, 2),
  "utf-8"
);

fs.writeFileSync(
  path.join(outDir, "pages.json"),
  JSON.stringify(pages, null, 2),
  "utf-8"
);

console.log("Generated books.json and pages.json successfully.");
