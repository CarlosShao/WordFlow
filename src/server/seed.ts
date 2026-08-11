/**
 * 种子数据脚本 v2 — 填充英语学习内容 + 配置爬虫来源
 * 
 * 用法: npx tsx seed.ts
 */

import { PrismaClient, ContentType, Difficulty } from '@prisma/client'

const prisma = new PrismaClient()

// ==================== 爬虫来源配置（免费RSS）====================

interface CrawlerSource {
  name: string
  url: string
  type: string
  contentType: ContentType
  difficulty: Difficulty
}

const crawlerSources: CrawlerSource[] = [
  // ═══════ 1. 新闻媒体（含 Learning English 专区）═══════
  {
    name: 'VOA Learning English',
    url: 'https://learningenglish.voanews.com/api/znnen',
    type: 'RSS',
    contentType: ContentType.ARTICLE,
    difficulty: Difficulty.BEGINNER,
  },
  {
    name: 'BBC Learning English',
    url: 'https://feeds.bbci.co.uk/learningenglish/english/features/rss.xml',
    type: 'RSS',
    contentType: ContentType.ARTICLE,
    difficulty: Difficulty.ELEMENTARY,
  },
  {
    name: 'CNN 10 (Student News)',
    url: 'http://rss.cnn.com/rss/edition.rss',
    type: 'RSS',
    contentType: ContentType.ARTICLE,
    difficulty: Difficulty.INTERMEDIATE,
  },
  {
    name: 'NPR News',
    url: 'https://feeds.npr.org/1001/rss.xml',
    type: 'RSS',
    contentType: ContentType.ARTICLE,
    difficulty: Difficulty.INTERMEDIATE,
  },
  {
    name: 'BBC World News',
    url: 'https://feeds.bbci.co.uk/news/world/rss.xml',
    type: 'RSS',
    contentType: ContentType.ARTICLE,
    difficulty: Difficulty.UPPER_INTERMEDIATE,
  },
  {
    name: 'AP News',
    url: 'https://apnews.com/index.rss',
    type: 'RSS',
    contentType: ContentType.ARTICLE,
    difficulty: Difficulty.UPPER_INTERMEDIATE,
  },
  {
    name: 'The Guardian',
    url: 'https://www.theguardian.com/world/rss',
    type: 'RSS',
    contentType: ContentType.ARTICLE,
    difficulty: Difficulty.ADVANCED,
  },
  {
    name: 'Al Jazeera English',
    url: 'https://www.aljazeera.com/xml/rss/all.xml',
    type: 'RSS',
    contentType: ContentType.ARTICLE,
    difficulty: Difficulty.UPPER_INTERMEDIATE,
  },
  {
    name: 'France 24 English',
    url: 'https://www.france24.com/en/rss',
    type: 'RSS',
    contentType: ContentType.ARTICLE,
    difficulty: Difficulty.UPPER_INTERMEDIATE,
  },

  // ═══════ 2. 科技文化 ═══════
  {
    name: 'TED Talks',
    url: 'https://feeds.feedburner.com/tedtalks_video',
    type: 'RSS',
    contentType: ContentType.VIDEO,
    difficulty: Difficulty.UPPER_INTERMEDIATE,
  },
  {
    name: 'TED-Ed',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCsooa4yRKGN_zEE8iknghZA',
    type: 'YOUTUBE',
    contentType: ContentType.VIDEO,
    difficulty: Difficulty.ELEMENTARY,
  },
  {
    name: '60-Second Science',
    url: 'https://www.scientificamerican.com/feed/',
    type: 'RSS',
    contentType: ContentType.PODCAST,
    difficulty: Difficulty.INTERMEDIATE,
  },
  {
    name: 'National Geographic',
    url: 'https://www.nationalgeographic.com/feed/',
    type: 'RSS',
    contentType: ContentType.ARTICLE,
    difficulty: Difficulty.UPPER_INTERMEDIATE,
  },
  {
    name: 'Crash Course',
    url: 'https://feeds.feedburner.com/crashcourse',
    type: 'YOUTUBE',
    contentType: ContentType.VIDEO,
    difficulty: Difficulty.INTERMEDIATE,
  },
  {
    name: 'Khan Academy',
    url: 'https://www.youtube.com/feeds/videos.xml?user=khanacademy',
    type: 'YOUTUBE',
    contentType: ContentType.VIDEO,
    difficulty: Difficulty.INTERMEDIATE,
  },
  {
    name: 'Kurzgesagt – In a Nutshell',
    url: 'https://www.youtube.com/feeds/videos.xml?user=Kurzgesagt',
    type: 'YOUTUBE',
    contentType: ContentType.VIDEO,
    difficulty: Difficulty.INTERMEDIATE,
  },
  {
    name: 'Veritasium',
    url: 'https://www.youtube.com/feeds/videos.xml?user=veritasium',
    type: 'YOUTUBE',
    contentType: ContentType.VIDEO,
    difficulty: Difficulty.UPPER_INTERMEDIATE,
  },
  {
    name: 'Vsauce',
    url: 'https://www.youtube.com/feeds/videos.xml?user=vsauce',
    type: 'YOUTUBE',
    contentType: ContentType.VIDEO,
    difficulty: Difficulty.UPPER_INTERMEDIATE,
  },

  // ═══════ 3. 视频平台 / 教育频道（英语学习头部 YouTube）═══════
  {
    name: 'English with Lucy',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC2BdO8IKVSk4fYOFzqUzijg',
    type: 'YOUTUBE',
    contentType: ContentType.VIDEO,
    difficulty: Difficulty.ELEMENTARY,
  },
  {
    name: "Rachel's English",
    url: 'https://www.youtube.com/feeds/videos.xml?user=RachelsEnglish',
    type: 'YOUTUBE',
    contentType: ContentType.VIDEO,
    difficulty: Difficulty.ELEMENTARY,
  },
  {
    name: 'mmmEnglish',
    url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UC8gX4UyrZk7KZp3I5XudyHw',
    type: 'YOUTUBE',
    contentType: ContentType.VIDEO,
    difficulty: Difficulty.ELEMENTARY,
  },
  {
    name: 'EngVid',
    url: 'https://www.youtube.com/feeds/videos.xml?user=engvidenglish',
    type: 'YOUTUBE',
    contentType: ContentType.VIDEO,
    difficulty: Difficulty.INTERMEDIATE,
  },
  {
    name: 'BBC Learning English (YouTube)',
    url: 'https://www.youtube.com/feeds/videos.xml?user=BBCLearningEnglish',
    type: 'YOUTUBE',
    contentType: ContentType.VIDEO,
    difficulty: Difficulty.ELEMENTARY,
  },
  {
    name: 'VOA Learning English (YouTube)',
    url: 'https://www.youtube.com/feeds/videos.xml?user=VOALearningEnglish',
    type: 'YOUTUBE',
    contentType: ContentType.VIDEO,
    difficulty: Difficulty.BEGINNER,
  },

  // ═══════ 4. 播客（新闻时事类）═══════
  {
    name: 'NPR News Now',
    url: 'https://feeds.npr.org/500005/rss.xml',
    type: 'RSS',
    contentType: ContentType.PODCAST,
    difficulty: Difficulty.INTERMEDIATE,
  },
  {
    name: 'BBC Global News Podcast',
    url: 'https://feeds.bbci.co.uk/news/podcasts/rss.xml',
    type: 'RSS',
    contentType: ContentType.PODCAST,
    difficulty: Difficulty.INTERMEDIATE,
  },
  {
    name: 'VOA Feature Magazine',
    url: 'https://learningenglish.voanews.com/api/znnen',
    type: 'RSS',
    contentType: ContentType.PODCAST,
    difficulty: Difficulty.BEGINNER,
  },

  // ═══════ 5. 播客（教育学习类）═══════
  {
    name: 'ESL Pod',
    url: 'https://www.eslpod.com/feed.xml',
    type: 'RSS',
    contentType: ContentType.PODCAST,
    difficulty: Difficulty.BEGINNER,
  },
  {
    name: 'All Ears English Podcast',
    url: 'https://feeds.simplecast.com/all-ears-english-podcast',
    type: 'RSS',
    contentType: ContentType.PODCAST,
    difficulty: Difficulty.ELEMENTARY,
  },
  {
    name: "Luke's English Podcast",
    url: 'https://lukespodcast.podbean.com/feed.xml',
    type: 'RSS',
    contentType: ContentType.PODCAST,
    difficulty: Difficulty.UPPER_INTERMEDIATE,
  },
  {
    name: 'The English We Speak (BBC)',
    url: 'https://feeds.bbci.co.uk/learningenglish/english/features/the-english-we-speak/rss.xml',
    type: 'RSS',
    contentType: ContentType.PODCAST,
    difficulty: Difficulty.INTERMEDIATE,
  },
  {
    name: '6 Minute Grammar (BBC)',
    url: 'https://feeds.bbci.co.uk/learningenglish/english/features/6-minute-grammar/rss.xml',
    type: 'RSS',
    contentType: ContentType.PODCAST,
    difficulty: Difficulty.ELEMENTARY,
  },

  // ═══════ 6. 播客（文化 / 故事 / 深度类）═══════
  {
    name: 'This American Life',
    url: 'https://www.thisamericanlife.org/podcast/rss.xml',
    type: 'RSS',
    contentType: ContentType.PODCAST,
    difficulty: Difficulty.UPPER_INTERMEDIATE,
  },
  {
    name: 'Planet Money (NPR)',
    url: 'https://feeds.npr.org/510289/rss.xml',
    type: 'RSS',
    contentType: ContentType.PODCAST,
    difficulty: Difficulty.INTERMEDIATE,
  },
  {
    name: 'Freakonomics Radio',
    url: 'https://feeds.simplecast.com/freakonomics-radio',
    type: 'RSS',
    contentType: ContentType.PODCAST,
    difficulty: Difficulty.UPPER_INTERMEDIATE,
  },
  {
    name: 'Radiolab',
    url: 'https://feeds.simplecast.com/radiolab',
    type: 'RSS',
    contentType: ContentType.PODCAST,
    difficulty: Difficulty.UPPER_INTERMEDIATE,
  },
  {
    name: 'Hidden Brain (NPR)',
    url: 'https://feeds.npr.org/510308/rss.xml',
    type: 'RSS',
    contentType: ContentType.PODCAST,
    difficulty: Difficulty.UPPER_INTERMEDIATE,
  },
  {
    name: 'Stuff You Should Know',
    url: 'https://feeds.iheart.com/podcast/105-stuff-you-should-know/rss',
    type: 'RSS',
    contentType: ContentType.PODCAST,
    difficulty: Difficulty.INTERMEDIATE,
  },

  // ═══════ 7. 文学 / 期刊 / 商业媒体 ═══════
  {
    name: 'The New Yorker',
    url: 'https://www.newyorker.com/feed/news',
    type: 'RSS',
    contentType: ContentType.ARTICLE,
    difficulty: Difficulty.PROFICIENT,
  },
  {
    name: 'The Atlantic',
    url: 'https://www.theatlantic.com/feed/all/',
    type: 'RSS',
    contentType: ContentType.ARTICLE,
    difficulty: Difficulty.ADVANCED,
  },
  {
    name: 'The Economist',
    url: 'https://www.economist.com/finance-and-economics/rss.xml',
    type: 'RSS',
    contentType: ContentType.ARTICLE,
    difficulty: Difficulty.ADVANCED,
  },
  {
    name: 'Wired',
    url: 'https://www.wired.com/feed/rss',
    type: 'RSS',
    contentType: ContentType.ARTICLE,
    difficulty: Difficulty.UPPER_INTERMEDIATE,
  },
  {
    name: 'Harvard Business Review',
    url: 'https://hbr.org/feed',
    type: 'RSS',
    contentType: ContentType.ARTICLE,
    difficulty: Difficulty.ADVANCED,
  },

  // ═══════ 8. 国内免费英文来源（无需翻墙）═══════
  {
    name: 'China Daily',
    url: 'https://www.chinadaily.com.cn/rss/china_rss.xml',
    type: 'RSS',
    contentType: ContentType.ARTICLE,
    difficulty: Difficulty.UPPER_INTERMEDIATE,
  },
  {
    name: 'CGTN (中国国际电视台)',
    url: 'https://www.cgtn.com/english/rss/world.xml',
    type: 'RSS',
    contentType: ContentType.ARTICLE,
    difficulty: Difficulty.UPPER_INTERMEDIATE,
  },
  {
    name: 'Sixth Tone (第六声)',
    url: 'https://www.sixthtone.com/rss.xml',
    type: 'RSS',
    contentType: ContentType.ARTICLE,
    difficulty: Difficulty.UPPER_INTERMEDIATE,
  },
]

// ==================== 示例内容数据（含完整字段）====================

interface SeedContent {
  title: string
  type: ContentType
  source: string
  sourceUrl: string
  author?: string
  difficulty: Difficulty
  summary: string
  translation?: string
  content?: string        // 原文正文
  audioUrl?: string       // 音频URL
  videoUrl?: string       // 视频URL
  coverUrl?: string       // 封面图
  duration?: number       // 时长(秒)
  categories?: string[]   // 分类标签
}

const seedContents: SeedContent[] = [
  // ═══════ A1-A2 初级 ═══════
  {
    title: 'My First Day at School',
    type: ContentType.ARTICLE,
    source: 'VOA Learning English',
    sourceUrl: 'https://learningenglish.voanews.com/a/back-to-school-what-students-can-expect-in-the-us/7546598.html',
    author: 'VOA Learning English',
    difficulty: Difficulty.BEGINNER,
    summary: 'A simple story about a young student named Emma and her first day at a new school. Learn basic daily routine vocabulary and past tense verbs.',
    translation: `艾玛在新学校的第一天醒得很早。她穿上最喜欢的蓝色连衣裙，快速吃完早餐。妈妈开车送她去上学。

当艾玛到达时，她看到操场上有很多孩子。有的在跑，有的在玩游戏。艾玛感到有点紧张。

她的老师怀特太太非常友善。她把艾玛介绍给班上的同学。其他学生都跟艾玛说"你好"。

午餐时间，艾玛和一个叫莉莉的女孩坐在一起。她们谈论各自最喜欢的食物和颜色。艾玛感到很开心。

放学后，艾玛告诉妈妈今天的情况。"我喜欢我的新学校！"她说。`,
    content: `Emma woke up early on her first day at the new school. She put on her favorite blue dress and ate breakfast quickly. Her mother drove her to school.

When Emma arrived, she saw many children in the playground. Some were running, some were playing games. Emma felt a little nervous.

Her teacher, Mrs. White, was very kind. She introduced Emma to the class. The other students said "Hello" to Emma.

At lunchtime, Emma sat with a girl named Lily. They talked about their favorite foods and colors. Emma felt happy.

After school, Emma told her mother about her day. "I like my new school!" she said.`,
    coverUrl: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=400&h=300&fit=crop',
    categories: ['教育', '生活'],
  },
  {
    title: 'The Weather Today',
    type: ContentType.ARTICLE,
    source: 'VOA Learning English',
    sourceUrl: 'https://learningenglish.voanews.com/a/weather-terms-in-english-sun-cloud-rain-snow-/6902855.html',
    author: 'VOA Learning English',
    difficulty: Difficulty.BEGINNER,
    summary: 'Learn to talk about the weather in English. This article covers common weather words like sunny, rainy, cloudy, and windy.',
    translation: `今天是个美丽的晴天。天空湛蓝，没有一丝云彩。外面很暖和——大约摄氏25度。

昨天就不一样了。整天下雨。人们撑着伞、穿着雨衣。街道湿漉漉的。

明天将是多云且凉爽的。气温大约18度。如果你出门的话应该带件外套。

以下是一些常见的天气词汇：
• Sunny - 阳光明媚的
• Rainy - 下雨的
• Cloudy - 多云的
• Windy - 有风的
• Snowy - 下雪的`,
    content: `Today is a beautiful sunny day. The sky is blue and there are no clouds. It is warm outside — about 25 degrees Celsius.

Yesterday was different. It was rainy all day. People carried umbrellas and wore raincoats. The streets were wet.

Tomorrow will be cloudy and cool. The temperature will be around 18 degrees. You should bring a jacket if you go outside.

Here are some common weather words:
• Sunny - 阳光明媚的
• Rainy - 下雨的
• Cloudy - 多云的
• Windy - 有风的
• Snowy - 下雪的`,
    coverUrl: 'https://images.unsplash.com/photo-1561553577-e203e43c0b49?w=400&h=300&fit=crop',
    categories: ['科学', '生活'],
  },
  {
    title: 'I Love My Family',
    type: ContentType.ARTICLE,
    source: 'BBC Learning English',
    sourceUrl: 'https://learningenglish.voanews.com/a/six-minute-english-why-do-we-give-flowers-on-special-days-/7598994.html',
    author: 'BBC Learning English',
    difficulty: Difficulty.ELEMENTARY,
    summary: 'Tom introduces his family members. Practice family vocabulary and possessive pronouns.',
    translation: `你好！我叫汤姆。我想给你们介绍一下我的家人。

我有一个大家庭。有五口人：爸爸、妈妈、姐姐、弟弟和我。

爸爸是一名医生。他在一家医院工作。他又高又和蔼。妈妈是一名老师。她在中学教英语。她喜欢做美味的食物。

姐姐叫安娜。她20岁了。在大学读书。她想成为一名工程师。弟弟叫本。他才6岁。喜欢玩电子游戏。

我非常爱我的家人！`,
    content: `Hello! My name is Tom. I want to tell you about my family.

I have a big family. There are five people: my father, my mother, my older sister, my younger brother, and me.

My father is a doctor. He works at a hospital. He is tall and kind. My mother is a teacher. She teaches English at a middle school. She loves cooking delicious food.

My older sister is Anna. She is 20 years old. She studies at university. She wants to be an engineer. My younger brother is Ben. He is only 6 years old. He likes playing video games.

I love my family very much!`,
    audioUrl: 'https://www.eslpod.com/eslpod_blog/2025/01/ordering-food-at-a-restaurant.html',
    duration: 120,
    coverUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&h=300&fit=crop',
    categories: ['生活', '文化'],
  },
  {
    title: 'At the Supermarket',
    type: ContentType.ARTICLE,
    source: 'VOA Learning English',
    sourceUrl: 'https://learningenglish.voanews.com/a/english-in-a-minute-what-is-the-difference-between-buy-and-purchase-/7585141.html',
    author: 'VOA Learning English',
    difficulty: Difficulty.ELEMENTARY,
    summary: 'Follow Anna as she shops for groceries. Learn food vocabulary, numbers, and how to ask prices.',
    translation: `安娜周六早上去超市购物。她需要买一周的食物。

首先，她买了一些水果：苹果、香蕉和橙子。苹果每公斤2美元。香蕉每公斤1.50美元。

接着，她去了蔬菜区。买了西红柿、胡萝卜和生菜。西红柿看起来新鲜又红润。

然后，她买了牛奶、面包和鸡蛋。还买了些鸡肉做晚餐。

在收银台，总共是25.50美元。安娜刷了信用卡，开心地回家了。`,
    content: `Anna went to the supermarket on Saturday morning. She needed to buy food for the week.

First, she bought some fruits: apples, bananas, and oranges. The apples cost $2 per kilogram. The bananas were $1.50 per kilogram.

Next, she went to the vegetable section. She bought tomatoes, carrots, and lettuce. The tomatoes looked fresh and red.

Then, she bought some milk, bread, and eggs. She also got some chicken for dinner.

At the checkout counter, the total was $25.50. Anna paid with her credit card and went home happily.`,
    coverUrl: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&h=300&fit=crop',
    categories: ['生活'],
  },

  // ═══════ B1-B2 中级 ═══════
  {
    title: 'The Future of Remote Work',
    type: ContentType.ARTICLE,
    source: 'BBC Learning English',
    sourceUrl: 'https://www.bbc.com/worklife/article/20230109-the-future-of-remote-work',
    author: 'BBC Worklife',
    difficulty: Difficulty.INTERMEDIATE,
    summary: 'How has COVID-19 changed the way we work forever? Explore the pros and cons of working from home.',
    translation: `新冠疫情从根本上改变了我们对工作的看法。2020年之前，远程办公只是进步科技公司提供的一项福利。如今，它已成为全球数百万员工的常态。

根据斯坦福大学最近的一项研究，远程工作者的生产力比办公室工作者提高了13%。员工节省了通勤时间，在日程安排上也享有更大的灵活性。

然而，远程办公并非没有挑战。许多员工报告说感到孤独，难以将工作和个人生活区分开来。管理者难以在虚拟环境中维持团队凝聚力和公司文化。

展望未来，专家预测混合模式将占主导地位：员工将在家和办公室之间分配时间。拥抱这种灵活性的公司更有可能在竞争激烈的就业市场中吸引顶尖人才。`,
    content: `The COVID-19 pandemic has fundamentally transformed how we think about work. Before 2020, remote work was a perk offered by progressive tech companies. Today, it has become the norm for millions of employees worldwide.

According to a recent Stanford study, productivity among remote workers increased by 13% compared to office-based workers. Employees save time on commuting and enjoy greater flexibility in managing their schedules.

However, remote work is not without challenges. Many workers report feelings of isolation and difficulty separating work from personal life. Managers struggle to maintain team cohesion and company culture in a virtual environment.

Looking ahead, experts predict a hybrid model will dominate: employees will split their time between home and office. Companies that embrace this flexibility are likely to attract top talent in the competitive job market.`,
    coverUrl: 'https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=400&h=300&fit=crop',
    categories: ['科技', '商务'],
  },
  {
    title: 'Social Media and Mental Health',
    type: ContentType.ARTICLE,
    source: 'The Guardian',
    sourceUrl: 'https://www.theguardian.com/technology/2023/nov/08/social-media-mental-health-crisis',
    author: 'The Guardian',
    difficulty: Difficulty.INTERMEDIATE,
    summary: 'Research shows heavy social media use can affect mental health. But is it all bad?',
    translation: `在过去十年中，社交媒体已成为日常生活中不可或缺的一部分。普通人每天花近三个小时在Instagram、TikTok和Twitter等平台上。但这对我们的心理健康有什么影响呢？

《异常心理学杂志》发表的研究发现，重度使用社交媒体与抑郁症发病率显著相关，尤其是在青少年群体中。不断与他人精心策划的生活进行比较会导致自卑感和自我价值感降低。

然而，并非全是负面的。社交媒体也可以提供宝贵的支持网络，尤其是对边缘化社区而言。它让人们找到有相似经历和兴趣的人，减少孤立感。

关键似乎在于有意识地使用。设定时间限制、精心筛选关注积极正面的账号、定期进行数字排毒，可以帮助与这些平台保持健康的关系。`,
    content: `In the past decade, social media has become an integral part of daily life. The average person spends nearly three hours per day on platforms like Instagram, TikTok, and Twitter. But what is this doing to our mental health?

Research published in the Journal of Abnormal Psychology found a significant correlation between heavy social media use and increased rates of depression, particularly among teenagers. The constant comparison to others' curated lives can lead to feelings of inadequacy and low self-esteem.

However, it's not all negative. Social media can also provide valuable support networks, especially for marginalized communities. It enables people to find others with similar experiences and interests, reducing feelings of isolation.

The key seems to be mindful usage. Setting time limits, curating your feed to follow positive accounts, and taking regular digital detoxes can help maintain a healthy relationship with these platforms.`,
    coverUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=300&fit=crop',
    categories: ['科技', '科学'],
  },
  {
    title: 'Climate Change: Small Actions, Big Impact',
    type: ContentType.ARTICLE,
    source: 'National Geographic',
    sourceUrl: 'https://www.nationalgeographic.com/environment/article/climate-change-solutions',
    author: 'National Geographic',
    difficulty: Difficulty.UPPER_INTERMEDIATE,
    summary: "You don't need to be a superhero to save the planet. Discover how small lifestyle changes can make a difference.",
    translation: `气候变化常常让人感觉是一个无法抗拒的大问题——太大了以至于任何个人都无法产生影响。然而研究表明，集体的微小行动可以创造有意义的改变。

以交通为例：如果每个美国人每周用步行或骑车替代一次驾车出行，我们每年可减少超过5000万吨碳排放。这相当于从道路上移除1000万辆汽车。

饮食选择也很重要。每周仅减少一餐肉食就能显著降低你的碳足迹。牛津大学的一项研究发现，植物性饮食产生的温室气体排放比肉食为主的饮食少75%。

家庭节能是另一个个人可以做出贡献的领域。改用LED灯泡、使用智能恒温器、在不使用设备时拔掉插头，可以将家庭能耗降低20-30%。

信息很明确：你不需要做到完美。每一个可持续的选择，无论多小，都有助于建设一个更健康的地球。`,
    content: `Climate change often feels like an overwhelming problem — too big for any individual to influence. However, research shows that collective small actions can create meaningful change.

Consider transportation: if every American replaced one car trip per week with walking or cycling, we would reduce carbon emissions by over 50 million tons annually. That's equivalent to taking 10 million cars off the road.

Dietary choices matter too. Reducing meat consumption by just one meal per week can significantly lower your carbon footprint. A study from the University of Oxford found that plant-based diets produce 75% fewer greenhouse gas emissions than meat-heavy diets.

Energy efficiency at home is another area where individuals can contribute. Switching to LED light bulbs, using smart thermostats, and unplugging devices when not in use can reduce household energy consumption by 20-30%.

The message is clear: you don't need to be perfect. Every sustainable choice, no matter how small, contributes to a healthier planet.`,
    coverUrl: 'https://images.unsplash.com/photo-1473496169904-658ba7c44d8a?w=400&h=300&fit=crop',
    categories: ['科学', '新闻'],
  },
  {
    title: 'The Science of Habit Formation',
    type: ContentType.ARTICLE,
    source: 'Wired',
    sourceUrl: 'https://www.wired.com/story/habit-forming-science/',
    author: 'Wired',
    difficulty: Difficulty.UPPER_INTERMEDIATE,
    summary: "Why is it so hard to form good habits? Dive into neuroscience research about cue-routine-reward loops.",
    translation: `习惯塑造了我们超过40%的日常行为，但我们大多数人在试图建立新习惯或打破旧模式时都很挣扎。神经科学为我们理解为什么会这样以及我们能做些什么提供了洞见。

每个习惯都遵循三步循环：提示、例行程序和奖励。提示触发大脑启动某种行为。例行程序是你实际执行的行为。奖励是你从该行为中获得的好处，它会强化这个循环。

麻省理工学院的神经科学家发现，习惯存储在大脑深部的基底神经节中。当一种习惯变得自动化时，大脑活动会减少——这就是为什么一旦养成习惯就会感觉毫不费力。

要培养新习惯，从小处着手。研究表明，一致性比强度更重要。每天锻炼五分钟比每周一次锻炼一小时更有效。将新行为与现有习惯配对（习惯叠加）可以利用已建立的神经通路。

要改掉坏习惯，需要识别提示和奖励，然后找到一个能带来类似满足感的更健康的例行方法。这种方法从根源入手解决问题，而不是仅仅对抗症状。`,
    content: `Habits shape more than 40% of our daily actions, yet most of us struggle when trying to establish new ones or break old patterns. Neuroscience offers insights into why this happens and what we can do about it.

Every habit follows a three-step loop: cue, routine, and reward. The cue triggers your brain to initiate a behavior. The routine is the actual behavior you perform. And the reward is the benefit you gain from the behavior, which reinforces the loop.

Neuroscientists at MIT discovered that habits are stored in the basal ganglia, a region deep in the brain. When a habit becomes automatic, brain activity decreases — this is why habits feel effortless once established.

To build a new habit, start small. Research shows that consistency matters more than intensity. Doing five minutes of exercise daily is more effective than one hour once a week. Pair the new behavior with an existing habit (habit stacking) to leverage established neural pathways.

Breaking bad habits requires identifying the cue and reward, then finding a healthier routine that delivers similar satisfaction. This approach addresses the root cause rather than fighting the symptom.`,
    coverUrl: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=400&h=300&fit=crop',
    categories: ['科学', '教育'],
  },

  // ═══════ C1-C2 高级 ═══════
  {
    title: 'Artificial Intelligence and Ethics',
    type: ContentType.ARTICLE,
    source: 'The Economist',
    sourceUrl: 'https://www.economist.com/technology/2023/11/15/the-ai-revolution-is-here-will-we-be-ready',
    author: 'The Economist',
    difficulty: Difficulty.ADVANCED,
    summary: 'As AI systems become autonomous, we face profound ethical dilemmas about algorithmic bias, accountability, and regulation.',
    translation: `人工智能的快速发展已经超出了我们的伦理框架，产生了社会必须解决的紧迫问题。随着AI系统变得越来越自主，意外后果的可能性呈指数级增长。

算法偏见或许是最紧迫的担忧。基于历史数据训练的机器学习系统不可避免地继承了数据中嵌入的偏见。例如，人脸识别软件已被证明对女性和有色人种的错误率显著更高。招聘算法根据与人口统计因素相关的语言模式歧视候选人。

问责制问题同样棘手。当自动驾驶汽车造成致命事故时，谁应承担责任？制造商？软件开发者？乘客？现有法律框架建立在人类行为主体的基础上，难以适应决策来自复杂、不透明的神经网络这种场景。

全球监管努力仍然支离破碎。欧盟的《人工智能法案》代表了迄今为止最全面的尝试，建立了基于风险的分类来确定合规要求。与此同时，美国采取了行业特定方式，不同机构分别监督医疗保健、金融和交通领域的应用。

有一点很清楚：技术能力已经跑在了伦理智慧的前面。缩小这一差距需要技术专家、伦理学家、政策制定者和公众之间的协作。`,
    content: `The rapid advancement of artificial intelligence has outpaced our ethical frameworks, creating urgent questions that society must address. As AI systems become increasingly autonomous, the potential for unintended consequences grows exponentially.

Algorithmic bias represents perhaps the most immediate concern. Machine learning systems trained on historical data inevitably inherit the prejudices embedded within that data. Facial recognition software, for example, has been shown to exhibit significantly higher error rates for women and people of color. Hiring algorithms have discriminated against candidates based on linguistic patterns correlated with demographic factors.

The question of accountability poses equally thorny challenges. When an autonomous vehicle causes a fatal accident, who bears responsibility? The manufacturer? The software developer? The passenger? Existing legal frameworks, predicated on human agency, struggle to accommodate scenarios where decisions emerge from complex, opaque neural networks.

Global regulatory efforts remain fragmented. The European Union's AI Act represents the most comprehensive attempt to date, establishing risk-based classifications that determine compliance requirements. Meanwhile, the United States has pursued a sector-specific approach, with different agencies overseeing applications in healthcare, finance, and transportation.

What remains clear is that technological capability has sprinted ahead of ethical wisdom. Closing this gap requires collaboration between technologists, ethicists, policymakers, and the broader public.`,
    coverUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop',
    categories: ['科技', '商务'],
  },
  {
    title: 'The Philosophy of Language',
    type: ContentType.ARTICLE,
    source: 'The New Yorker',
    sourceUrl: 'https://www.newyorker.com/magazine/2023/03/13/the-philosophy-of-language-and-meaning',
    author: 'The New Yorker',
    difficulty: Difficulty.PROFICIENT,
    summary: "From Wittgenstein's language games to Chomsky's universal grammar, explore how philosophers have grappled with meaning.",
    translation: `语言哲学在分析传统中占据核心地位，构成了知识、心灵和现实探究的基础。两种根本不同的方法塑造了这个领域：指称意义论和使用意义论。

路德维希·维特根斯坦后期的著作代表了他早期图像理论的决裂。在《哲学研究》中，他引入了语言游戏的概念——词语通过在特定生活方式中的使用而获得意义的受规则支配的活动。著名的格言"意义即用法"概括了从寻求本质定义到考察语境部署的转变。

诺姆·乔姆斯基的生成语法提供了一个替代框架，假设存在普遍认知所固有的内在语言结构。他的能力（对语法规则的隐含知识）和表现（实际语言使用）之间的区别深刻影响了语言学和认知科学。

保罗·格赖斯的含义理论增加了另一个维度，区分字面所说的内容和语用传达的内容。合作原则——涵盖数量、质量、关系和方式准则——解释了说话者如何在字面语义内容之外传达意义。

当代辩论继续围绕指称（词语如何与世界连接）、组合性（句子意义如何由组成部分推导）以及语言实践的规范性维度等问题展开。`,
    content: `The philosophy of language occupies a central position in analytic tradition, serving as a foundation for inquiries into knowledge, mind, and reality. Two fundamentally divergent approaches have shaped the field: the referential theory of meaning and the use theory of meaning.

Ludwig Wittgenstein's later work represents a decisive break from his earlier picture theory of language. In Philosophical Investigations, he introduces the concept of language games — rule-governed activities in which words derive meaning through their use within specific forms of life. The famous dictum "meaning is use" encapsulates this shift from seeking essential definitions to examining contextual deployment.

Noam Chomsky's generative grammar presents an alternative framework, positing innate linguistic structures universal to human cognition. His distinction between competence (implicit knowledge of grammatical rules) and performance (actual language use) has profoundly influenced both linguistics and cognitive science.

Paul Grice's theory of implicature adds another dimension, distinguishing between what is said literally and what is communicated pragmatically. The cooperative principle — encompassing maxims of quantity, quality, relation, and manner — explains how speakers convey meaning beyond literal semantic content.

Contemporary debates continue to revolve questions of reference (how words connect to world), compositionality (how sentence meaning derives from constituent parts), and the normative dimensions of linguistic practice.`,
    coverUrl: 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?w=400&h=300&fit=crop',
    categories: ['文化', '教育'],
  },

  // ═══════ 视频 ═══════
  {
    title: 'English Pronunciation Tips: The "TH" Sound',
    type: ContentType.VIDEO,
    source: 'English with Lucy',
    sourceUrl: 'https://www.youtube.com/watch?v=geNfmpY8HKQ',
    author: 'English with Lucy',
    difficulty: Difficulty.ELEMENTARY,
    summary: 'Master the most difficult sound for English learners! Lucy demonstrates tongue placement and provides practice words.',
    translation: `在这个视频中，露西讲解了如何在英语中发音"TH"音。

涵盖的关键要点：
1. 将舌头放在牙齿之间
2. 轻轻地通过缝隙吹气
3. 用单词练习：think, this, that, they
4. 浊音/ð/ 和清音/θ/ 的区别

练习句子：
- I think therefore I am.
- This is the best thing.
- They thought about it thoroughly.`,
    content: `In this video, Lucy explains how to pronounce the "TH" sound in English.

Key points covered:
1. Place your tongue between your teeth
2. Blow air gently through the gap
3. Practice with words: think, this, that, they
4. Difference between voiced /ð/ and voiceless /θ/

Practice sentences:
- I think therefore I am.
- This is the best thing.
- They thought about it thoroughly.`,
    videoUrl: 'https://www.youtube.com/embed/Th-fYBo8VVg',
    coverUrl: 'https://img.youtube.com/vi/Th-fYBo8VVg/maxresdefault.jpg',
    duration: 720,
    categories: ['教育'],
  },
  {
    title: 'TED Talk: How to Speak So That People Want to Listen',
    type: ContentType.VIDEO,
    source: 'TED Talks',
    sourceUrl: 'https://www.ted.com/talks/julian_treasure_how_to_speak_so_that_people_want_to_listen',
    author: 'Julian Treasure',
    difficulty: Difficulty.INTERMEDIATE,
    summary: 'Sound expert Julian Treasure shares powerful communication techniques including HAIL and vocal exercises.',
    translation: `声音专家朱利安·特雷演示了有力说话的方法。

HAIL 框架：
- H = Honesty（真诚实在）
- A = Authenticity（做自己）
- I = Integrity（言行一致）
- L = Love（祝愿他人好）

发声工具箱：
- Register（声音位置）
- Timbre（音色）
- Prosody（韵律：节奏、速度、音量、音调）
- Pace（语速）
- Pitch（高低）
- Volume（响度）

沉默是有力量的。开口前，先深呼吸。`,
    content: `Julian Treasure, a sound expert, demonstrates the how-to\'s of powerful speaking.

HAIL framework:
- H = Honesty (be real and authentic)
- A = Authenticity (be yourself)
- I = Integrity (be your word)
- L = Love (wish them well)

Vocal toolbox:
- Register (where your voice sits in your chest)
- Timbre (the texture of your voice)
- Prosody (rhythm, pace, volume, pitch)
- Pace (speed of speaking)
- Pitch (high vs low)
- Volume (loudness)

Silence is powerful. Before you speak, take a breath.`,
    videoUrl: 'https://www.youtube.com/embed/eIho2S0ZahI',
    coverUrl: 'https://img.youtube.com/vi/eIho2S0ZahI/maxresdefault.jpg',
    duration: 618,
    categories: ['教育', '文化'],
  },

  // ═══════ 播客/音频 ═══════
  {
    title: 'Daily News Podcast: Tech Roundup',
    type: ContentType.PODCAST,
    source: 'NPR News Now',
    sourceUrl: 'https://www.npr.org/sections/news/',
    author: 'NPR News',
    difficulty: Difficulty.UPPER_INTERMEDIATE,
    summary: 'Your weekly digest of the biggest tech stories: smartphone releases, AI breakthroughs, cybersecurity threats.',
    translation: `欢迎收听 NPR 科技摘要。我是主持人，以下是今天的头条新闻。

首先，苹果发布了最新的 iPhone 系列，配备了改进的 AI 功能和重新设计的摄像头系统。新的 A18 芯片承诺性能提升30%，同时功耗更低。

在 AI 方面，OpenAI 发布了 GPT-5，推理任务方面取得了显著改进。早期基准测试显示它在数学证明和科学分析方面超越了之前的模型。

网络安全研究人员发现了一个影响数百万物联网设备的严重漏洞。制造商正在紧急发布补丁，但专家建议立即更新设备固件。

最后，一家名为 Neuralink 竞争对手的初创公司在非侵入式脑机接口方面取得突破，使瘫痪患者能够仅凭思维控制电脑。

以上就是今天的摘要。明天请继续收听更多科技新闻。`,
    content: `[Transcript]

Welcome to NPR Tech Roundup. I'm your host, and here are today's top stories.

First up, Apple announced its latest iPhone lineup featuring improved AI capabilities and a redesigned camera system. The new A18 chip promises 30% better performance while using less power.

In AI news, OpenAI released GPT-5 with remarkable improvements in reasoning tasks. Early benchmarks show it outperforming previous models on mathematical proofs and scientific analysis.

Cybersecurity researchers discovered a critical vulnerability affecting millions of IoT devices. Manufacturers are rushing to release patches, but experts recommend updating your device firmware immediately.

Finally, a startup called Neuralink competitor achieved a breakthrough in non-invasive brain-computer interfaces, allowing paralyzed patients to control computers using only their thoughts.

That's all for today's roundup. Join us tomorrow for more tech news.`,
    audioUrl: 'https://www.eslpod.com/eslpod_blog/2025/01/ordering-food-at-a-restaurant.html',
    duration: 1500,
    coverUrl: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=400&h=300&fit=crop',
    categories: ['科技', '新闻'],
  },
  {
    title: 'Story Time: The Gift of the Magi',
    type: ContentType.PODCAST,
    source: "Luke's English Podcast",
    sourceUrl: 'https://www.eslpod.com/eslpod_blog/',
    author: 'ESL Podcast',
    difficulty: Difficulty.BEGINNER,
    summary: 'A classic short story by O. Henry about love and sacrifice. Perfect for intermediate listeners.',
    translation: `一美元八十七美分。就这么多。其中六十美分是零钱。一分一分地省下来的，通过对杂货商、菜贩和肉贩的死缠烂打，直到脸颊因这种斤斤计较而隐隐作痛。德拉数了三次。一美元八十七 cents。而明天就是圣诞节。

显然除了瘫倒在破旧的小沙发上痛哭之外别无办法。于是德拉就这么做了。这引发了一个道德反思：人生是由抽泣、啜泣和微笑组成的，其中抽泣占主导。

当女主人逐渐从第一阶段平复到第二阶段时，让我们看看这个家。一套每周八美元的带家具公寓。虽然不能说简陋到了极点，但这个词确实已经在乞丐侦察队的监视之下了。

楼下的门廊里有一个小到装不下信件的信箱。还有一个电铃，但没人能按得响。上面挂着一张卡片，写着：詹姆斯·迪林厄姆·杨先生。

[故事接着讲述德拉卖掉美丽的长发给吉姆买了一条白金表链来搭配他珍爱的金表，而吉姆却卖掉了手表给德拉买来了她美丽头发用的梳子——送礼物的终极讽刺。]`,
    content: `[Full Transcript]

One dollar and eighty-seven cents. That was all. And sixty cents of it was in pennies. Pennies saved one and two at a time by bulldozing the grocer and the vegetable man and the butcher until one's cheeks burned with the silent imputation of parsimony that such close dealing implied. Three times Della counted it. One dollar and eighty-seven cents. And the next day would be Christmas.

There was clearly nothing left to do but flop down on the shabby little couch and howl. So Della did it. Which instigates the moral reflection that life is made up of sobs, sniffles, and smiles, with sniffles predominating.

While the mistress of the home is gradually subsiding from the first stage to the second, let us look at the home. A furnished flat at eight dollars per week. It did not exactly beggar description, but it certainly had that word on the lookout for the mendicancy squad.

In the vestibule below was a letter-box too small to hold letters. There was an electric bell, but no one could ring it. And there was a card attached to it that read: Mr. James Dillingham Young.

[Story continues with Della selling her beautiful hair to buy Jim a platinum fob chain for his prized gold watch, while Jim sells his watch to buy Della the combs for her beautiful hair — the ultimate irony of gift-giving.]`,
    audioUrl: 'https://www.eslpod.com/eslpod_blog/2025/01/ordering-food-at-a-restaurant.html',
    duration: 2400,
    coverUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=400&h=300&fit=crop',
    categories: ['文化', '教育'],
  },
  {
    title: '6 Minute English: Why We Procrastinate',
    type: ContentType.PODCAST,
    source: 'BBC Learning English',
    sourceUrl: 'https://www.bbc.com/sounds/play/p02pc9tp',
    author: 'BBC 6 Minute English',
    difficulty: Difficulty.ELEMENTARY,
    summary: 'A BBC 6 Minute English episode exploring why people procrastinate and practical tips to overcome it.',
    translation: `欢迎收听六分钟英语，我们在六分钟内探索有趣的话题。今天我们要讨论的是拖延症。

尼尔：你好。这里是 BBC 学习英语的六分钟英语节目。我是尼尔。
萨姆：我是萨姆。今天我们讨论为什么人们会把事情往后推。

尼尔：萨姆，你有过拖延吗？
萨姆：呃……我现在就在拖延啊！我应该为明天的会议做准备，但我却在跟你聊天！

[讨论继续，涉及词汇：procrastination（拖延）、deadline（截止日期）、prioritize（优先排序）、distraction（分心）、motivation（动力）、self-discipline（自律）]`,
    content: `[Transcript - BBC 6 Minute English]

Welcome to 6 Minute English, where we explore interesting topics in just six minutes. Today we're talking about procrastination.

Neil: Hello. This is 6 Minute English from BBC Learning English. I'm Neil.
Sam: And I'm Sam. Today we're discussing why we put things off.

Neil: Sam, do you ever procrastinate?
Sam: Well... I'm doing it right now! I should be preparing for tomorrow's meeting, but here I am chatting with you!

[Discussion continues with vocabulary: procrastination, deadline, prioritize, distraction, motivation, self-discipline]`,
    audioUrl: 'https://www.eslpod.com/eslpod_blog/2025/01/ordering-food-at-a-restaurant.html',
    duration: 360,
    coverUrl: 'https://images.unsplash.com/photo-1499638673689-79a0b659c85e?w=400&h=300&fit=crop',
    categories: ['教育', '生活'],
  },
  {
    title: 'ESL Pod: Ordering Food at a Restaurant',
    type: ContentType.PODCAST,
    source: 'ESL Pod',
    sourceUrl: 'https://www.eslpod.com/eslpod_blog/',
    author: 'ESL Podcast',
    difficulty: Difficulty.BEGINNER,
    summary: 'Learn useful phrases for ordering food in English-speaking restaurants. Slow-paced dialogue with explanations.',
    translation: `[对话 - 慢速]

服务员：晚上好。欢迎来到金叉餐厅。请问您有预订吗？
顾客：有的，以史密斯的名字预订的。两位。

服务员：这边请。这是菜单。服务员马上就来。

服务员：需要先给您上点喝的吗？
顾客：我要一杯店里的红葡萄酒。我的朋友想要气泡水。

服务员：当然可以。您准备好点餐了吗，还是需要再等几分钟？

顾客：我想我们可以点了。我要烤三文鱼配蔬菜。
朋友：那我点凯撒沙拉和今日例汤。
服务员：非常好的选择。马上为您下单。

[接下来是词汇讲解：reservation（预订）、menu（菜单）、sparkling water（气泡水）、grilled（烤制的）、Caesar salad（凯撒沙拉）]`,
    content: `[Dialogue - Slow Speed]

Server: Good evening. Welcome to The Golden Fork. Do you have a reservation?
Customer: Yes, under the name of Smith. For two people.
Server: Right this way. Here are your menus. Your server will be with you shortly.

Server: Can I get you started with something to drink?
Customer: I'll have a glass of house red wine, please. And my friend would like sparkling water.
Server: Certainly. Are you ready to order, or do you need a few more minutes?

Customer: I think we're ready. I'd like the grilled salmon with vegetables.
Friend: And I'll have the Caesar salad and the soup of the day, please.
Server: Excellent choices. I'll put that right in.

[Vocabulary explanations follow: reservation, menu, sparkling water, grilled, Caesar salad]`,
    audioUrl: 'https://www.eslpod.com/eslpod_blog/2025/01/ordering-food-at-a-restaurant.html',
    duration: 900,
    coverUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=300&fit=crop',
    categories: ['生活', '教育'],
  },
]

async function main() {
  console.log('🌱 Starting database seeding v2...\n')

  // ── Step 1: 创建爬虫来源（先清空再全量重建，保证来源表与定义一致）──
  console.log('--- Crawler Sources ---')
  await prisma.crawlerSource.deleteMany()
  console.log('  🧹 Cleared existing crawler sources')
  let sourcesCreated = 0
  for (const src of crawlerSources) {
    try {
      const existing = await prisma.crawlerSource.findFirst({ where: { url: src.url } })
      if (existing) {
        console.log(`  ⏭️  ${src.name} (exists)`)
        continue
      }
      const result = await prisma.crawlerSource.create({
        data: {
          name: src.name,
          url: src.url,
          type: src.type as any, // CrawlerSourceType enum
          contentType: src.contentType,
          difficulty: src.difficulty,
          enabled: true,
          crawlInterval: 1440,
        },
      })
      console.log(`  ✅ ${src.name} [${src.type}]`)
      sourcesCreated++
    } catch (err) {
      console.error(`  ❌ Failed: ${src.name}`, err)
    }
  }

  // ── Step 2: 填充内容数据（先清空再全量重建，保证数据与 seed 定义一致）──
  console.log('\n--- Content Items ---')
  await prisma.content.deleteMany()
  console.log('  🧹 Cleared existing content items')
  let inserted = 0
  let skipped = 0

  for (const item of seedContents) {
    try {
      const result = await prisma.content.create({
        data: {
          title: item.title,
          type: item.type,
          source: item.source,
          sourceUrl: item.sourceUrl,
          author: item.author,
          difficulty: item.difficulty,
          summary: item.summary,
          translation: item.translation,
          content: item.content,
          audioUrl: item.audioUrl,
          videoUrl: item.videoUrl,
          coverUrl: item.coverUrl,
          duration: item.duration,
          publishedAt: new Date(),
          isPublished: true,
          ...(item.categories && item.categories.length > 0 ? { tags: item.categories } : {}),
        },
      })

      console.log(`  ✅ ${item.title} [${item.difficulty}]`)
      inserted++
    } catch (err) {
      console.error(`  ❌ Failed: ${item.title}`, err)
    }
  }

  // ── 统计 ──
  console.log(`\n✨ Seeding complete!`)
  console.log(`   Sources created: ${sourcesCreated}`)
  console.log(`   Content inserted: ${inserted}`)
  console.log(`   Content skipped: ${skipped}`)

  const counts = await prisma.content.groupBy({
    by: ['type', 'difficulty'],
    _count: true,
  })
  console.log('\n📊 Content breakdown:')
  for (const c of counts) {
    console.log(`   ${c.type.padEnd(10)} | ${c.difficulty.padEnd(20)} | ${c._count}`)
  }

  const sourceCounts = await prisma.content.groupBy({
    by: ['source'],
    _count: true,
  })
  console.log('\n📰 By source:')
  for (const sc of sourceCounts) {
    console.log(`   ${sc.source}: ${sc._count}`)
  }

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Seed failed:', err)
  process.exit(1)
})
