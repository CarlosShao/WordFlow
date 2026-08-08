import type { ContentItem } from '../types'

export const mockContentItems: ContentItem[] = [
  // ═══════════════════════════════════════════════════════════════
  // 1. Article — BBC · B2 · news
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'content-bbc-ai-future',
    type: 'article',
    title: `The Future of AI in Everyday Life`,
    summary: `Explore how artificial intelligence is transforming daily routines, from smart homes to personalized healthcare, and what it means for society.`,
    source: 'BBC',
    sourceUrl: 'https://www.bbc.com/future/article/ai-everyday-life',
    difficulty: 'B2',
    category: 'news',
    tags: ['artificial intelligence', 'technology', 'future', 'society'],
    coverImage: '/assets/covers/bbc-ai-future.jpg',
    publishedAt: '2025-06-15',
    vocabularyCount: 42,
    wordCount: 1200,
    estimatedMinutes: 8,
    segments: [
      {
        id: 'seg-bbc-ai-1',
        index: 0,
        title: `AI in the Home`,
        content: `Artificial intelligence has quietly become a fixture in millions of homes worldwide. Voice assistants like Alexa and Siri handle everyday tasks, from setting timers to controlling lighting. Smart thermostats learn household patterns and adjust temperatures automatically, reducing energy consumption by up to fifteen percent.`,
        translation: `人工智能已经悄然成为全球数百万家庭的常客。像Alexa和Siri这样的语音助手处理日常任务，从设置定时器到控制灯光。智能恒温器学习家庭模式并自动调节温度，将能耗降低高达百分之十五。`,
        highlights: ['fixture', 'consumption', 'automatically']
      },
      {
        id: 'seg-bbc-ai-2',
        index: 1,
        title: `Healthcare Revolution`,
        content: `Perhaps the most promising application of AI lies in healthcare. Machine learning algorithms can now detect certain cancers earlier than human doctors, with accuracy rates exceeding ninety-five percent. Wearable devices continuously monitor vital signs and alert users to potential health issues before symptoms even appear.`,
        translation: `也许人工智能最有前景的应用在于医疗保健。机器学习算法现在可以比人类医生更早地检测出某些癌症，准确率超过百分之九十五。可穿戴设备持续监测生命体征，并在症状出现之前提醒用户潜在的健康问题。`,
        highlights: ['promising', 'algorithms', 'accuracy', 'vital signs']
      },
      {
        id: 'seg-bbc-ai-3',
        index: 2,
        title: `Ethical Considerations`,
        content: `Despite these advances, significant concerns remain. Privacy advocates worry about the vast amounts of personal data AI systems require. Questions about job displacement continue to spark heated debates among economists and policymakers. Striking the right balance between innovation and regulation will define the next decade of AI development.`,
        translation: `尽管取得了这些进展，重大的担忧仍然存在。隐私倡导者担心人工智能系统所需的大量个人数据。关于工作岗位流失的问题继续在经济学家和政策制定者之间引发激烈辩论。在创新与监管之间找到恰当的平衡将决定人工智能发展的下一个十年。`,
        highlights: ['advocates', 'displacement', 'regulation']
      }
    ],
    segmentPractice: [
      {
        segmentId: 'seg-bbc-ai-1',
        segmentTitle: `AI in the Home`,
        questions: [
          {
            id: 'q-bbc-ai-1a',
            type: 'reading-comprehension',
            difficulty: 'B2',
            question: `According to the passage, what can smart thermostats do?`,
            options: [
              `Control all home appliances`,
              `Learn household patterns and adjust temperatures`,
              `Replace human caretakers entirely`,
              `Monitor security cameras`
            ],
            correctAnswer: `Learn household patterns and adjust temperatures`,
            explanation: `The passage states that smart thermostats learn household patterns and adjust temperatures automatically.`,
            points: 10,
            tags: ['reading comprehension']
          },
          {
            id: 'q-bbc-ai-1b',
            type: 'fill-blank',
            difficulty: 'B2',
            question: `Smart thermostats can reduce energy ________ by up to fifteen percent.`,
            correctAnswer: 'consumption',
            explanation: `Consumption means the amount of something that is used. The text mentions reducing energy consumption.`,
            points: 15,
            tags: ['vocabulary']
          }
        ]
      },
      {
        segmentId: 'seg-bbc-ai-2',
        segmentTitle: `Healthcare Revolution`,
        questions: [
          {
            id: 'q-bbc-ai-2a',
            type: 'multiple-choice',
            difficulty: 'B2',
            question: `What accuracy rate do AI algorithms achieve in detecting certain cancers?`,
            options: ['Over 80%', 'Over 90%', 'Over 95%', '100%'],
            correctAnswer: 'Over 95%',
            explanation: `The text states accuracy rates exceeding ninety-five percent.`,
            points: 10,
            tags: ['detail extraction']
          },
          {
            id: 'q-bbc-ai-2b',
            type: 'true-false',
            difficulty: 'B2',
            question: `Wearable devices can only monitor health after symptoms appear.`,
            correctAnswer: 'false',
            explanation: `The passage states wearable devices alert users before symptoms appear.`,
            points: 10,
            tags: ['reading comprehension']
          }
        ]
      },
      {
        segmentId: 'seg-bbc-ai-3',
        segmentTitle: `Ethical Considerations`,
        questions: [
          {
            id: 'q-bbc-ai-3a',
            type: 'reading-comprehension',
            difficulty: 'B2',
            question: `What is the main concern of privacy advocates regarding AI?`,
            options: [
              `AI is too expensive`,
              `AI systems require vast amounts of personal data`,
              `AI will replace all human jobs`,
              `AI is not accurate enough`
            ],
            correctAnswer: `AI systems require vast amounts of personal data`,
            explanation: `Privacy advocates worry about the vast amounts of personal data AI systems require.`,
            points: 10,
            tags: ['reading comprehension']
          },
          {
            id: 'q-bbc-ai-3b',
            type: 'fill-blank',
            difficulty: 'B2',
            question: `Striking the right balance between innovation and ________ will define the next decade.`,
            correctAnswer: 'regulation',
            explanation: `Regulation means rules or laws controlling something. The text mentions balancing innovation and regulation.`,
            points: 15,
            tags: ['vocabulary']
          }
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // 2. Article — Medium · B1 · education
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'content-medium-language-habits',
    type: 'article',
    title: `10 Habits of Highly Effective Language Learners`,
    summary: `Discover the proven strategies that successful language learners use every day to accelerate fluency and retain vocabulary long-term.`,
    source: 'Medium',
    sourceUrl: 'https://medium.com/language-learning/10-habits',
    difficulty: 'B1',
    category: 'education',
    tags: ['language learning', 'habits', 'education', 'fluency'],
    coverImage: '/assets/covers/medium-language-habits.jpg',
    publishedAt: '2025-05-20',
    vocabularyCount: 35,
    wordCount: 950,
    estimatedMinutes: 6,
    segments: [
      {
        id: 'seg-medium-lh-1',
        index: 0,
        title: `Start with Consistency`,
        content: `The most successful language learners don't study for hours once a week. Instead, they practice every single day, even if it's only for fifteen minutes. This consistent exposure helps the brain form stronger neural connections, making new vocabulary and grammar patterns easier to recall over time.`,
        translation: `最成功的语言学习者不会一周只学习几个小时。相反，他们每天都练习，即使只有十五分钟。这种持续的接触帮助大脑形成更强的神经连接，使新的词汇和语法模式更容易在一段时间后回忆起来。`,
        highlights: ['consistent', 'neural connections', 'recall']
      },
      {
        id: 'seg-medium-lh-2',
        index: 1,
        title: `Embrace Mistakes`,
        content: `Fear of making mistakes is one of the biggest obstacles to language progress. Effective learners understand that errors are not failures but essential stepping stones. They actively seek out conversations with native speakers, knowing that every awkward sentence brings them closer to natural fluency.`,
        translation: `害怕犯错是语言进步的最大障碍之一。有效的学习者明白错误不是失败，而是必不可少的垫脚石。他们积极寻求与母语者交谈，知道每一个尴尬的句子都让他们更接近自然流利。`,
        highlights: ['obstacles', 'stepping stones', 'fluency']
      },
      {
        id: 'seg-medium-lh-3',
        index: 2,
        title: `Use Authentic Materials`,
        content: `Textbooks provide a solid foundation, but real fluency comes from engaging with authentic content. Top learners watch movies, listen to podcasts, read news articles, and browse social media in their target language. This exposure to real-world language prepares them for actual conversations far better than any classroom exercise.`,
        translation: `教科书提供了坚实的基础，但真正的流利来自于接触真实内容。顶尖学习者观看电影、听播客、阅读新闻文章，并在社交媒体上用目标语言浏览。这种对真实世界语言的接触比任何课堂练习都更好地为他们准备实际对话。`,
        highlights: ['authentic', 'exposure', 'foundation']
      }
    ],
    segmentPractice: [
      {
        segmentId: 'seg-medium-lh-1',
        segmentTitle: `Start with Consistency`,
        questions: [
          {
            id: 'q-medium-lh-1a',
            type: 'reading-comprehension',
            difficulty: 'B1',
            question: `How long should you practice each day according to the passage?`,
            options: [
              `At least two hours`,
              `Only on weekends`,
              `Even if it is only fifteen minutes`,
              `Only when you feel motivated`
            ],
            correctAnswer: `Even if it is only fifteen minutes`,
            explanation: `The passage emphasizes practicing every day, even if it is only for fifteen minutes.`,
            points: 10,
            tags: ['reading comprehension']
          },
          {
            id: 'q-medium-lh-1b',
            type: 'fill-blank',
            difficulty: 'B1',
            question: `Consistent exposure helps the brain form stronger neural ________.`,
            correctAnswer: 'connections',
            explanation: `Neural connections are pathways in the brain. The text mentions forming stronger neural connections through consistent practice.`,
            points: 15,
            tags: ['vocabulary']
          }
        ]
      },
      {
        segmentId: 'seg-medium-lh-2',
        segmentTitle: `Embrace Mistakes`,
        questions: [
          {
            id: 'q-medium-lh-2a',
            type: 'true-false',
            difficulty: 'B1',
            question: `Effective learners avoid making mistakes at all costs.`,
            correctAnswer: 'false',
            explanation: `The passage states that effective learners understand errors are essential stepping stones, not failures to avoid.`,
            points: 10,
            tags: ['reading comprehension']
          },
          {
            id: 'q-medium-lh-2b',
            type: 'multiple-choice',
            difficulty: 'B1',
            question: `What do effective learners actively seek out?`,
            options: [
              `Easier textbooks`,
              `Conversations with native speakers`,
              `Translation apps`,
              `Grammar drills`
            ],
            correctAnswer: `Conversations with native speakers`,
            explanation: `The passage says they actively seek out conversations with native speakers.`,
            points: 10,
            tags: ['detail extraction']
          }
        ]
      },
      {
        segmentId: 'seg-medium-lh-3',
        segmentTitle: `Use Authentic Materials`,
        questions: [
          {
            id: 'q-medium-lh-3a',
            type: 'reading-comprehension',
            difficulty: 'B1',
            question: `Where does real fluency come from according to the author?`,
            options: [
              `Memorizing vocabulary lists`,
              `Engaging with authentic content`,
              `Only using textbooks`,
              `Watching grammar videos`
            ],
            correctAnswer: `Engaging with authentic content`,
            explanation: `The passage states that real fluency comes from engaging with authentic content.`,
            points: 10,
            tags: ['reading comprehension']
          },
          {
            id: 'q-medium-lh-3b',
            type: 'fill-blank',
            difficulty: 'B1',
            question: `Textbooks provide a solid ________, but real fluency requires more.`,
            correctAnswer: 'foundation',
            explanation: `Foundation means a base or groundwork. The text describes textbooks as providing a solid foundation.`,
            points: 15,
            tags: ['vocabulary']
          }
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // 3. Video — YouTube · B2 · technology
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'content-yt-neural-networks',
    type: 'video',
    title: `How Neural Networks Actually Work`,
    summary: `A clear, visual explanation of neural networks — from basic perceptrons to deep learning — for anyone curious about how machines learn.`,
    source: 'YouTube',
    sourceUrl: 'https://www.youtube.com/watch?v=neural-networks-explained',
    difficulty: 'B2',
    category: 'technology',
    tags: ['neural networks', 'deep learning', 'machine learning', 'AI'],
    coverImage: '/assets/covers/yt-neural-networks.jpg',
    publishedAt: '2025-04-10',
    vocabularyCount: 48,
    duration: 600,
    videoUrl: 'https://www.youtube.com/watch?v=neural-networks-explained',
    segments: [
      {
        id: 'seg-yt-nn-1',
        index: 0,
        title: `What Is a Neural Network?`,
        content: `A neural network is a computing system inspired by the human brain. It consists of layers of interconnected nodes, often called neurons. Each connection has a weight that adjusts as the network learns from data. The simplest form, called a perceptron, takes multiple inputs, multiplies each by a weight, and produces a single output.`,
        translation: `神经网络是一种受人脑启发的计算系统。它由相互连接的节点层组成，这些节点通常被称为神经元。每个连接都有一个权重，随着网络从数据中学习而调整。最简单的形式叫做感知器，它接收多个输入，将每个输入乘以一个权重，并产生一个单一的输出。`,
        startTime: 0,
        endTime: 120,
        highlights: ['perceptron', 'interconnected', 'weights']
      },
      {
        id: 'seg-yt-nn-2',
        index: 1,
        title: `Training the Network`,
        content: `Training a neural network involves feeding it thousands of examples and adjusting the weights each time it gets something wrong. This process, called backpropagation, calculates how much each weight contributed to the error and nudges it in the right direction. Over many iterations, the network becomes increasingly accurate at its assigned task.`,
        translation: `训练神经网络需要向其提供数千个示例，并在每次出错时调整权重。这个过程叫做反向传播，它计算每个权重对误差的贡献程度，并将其向正确的方向调整。经过多次迭代，网络在其指定任务上变得越来越准确。`,
        startTime: 120,
        endTime: 300,
        highlights: ['backpropagation', 'iterations', 'nudges']
      },
      {
        id: 'seg-yt-nn-3',
        index: 2,
        title: `Deep Learning and Beyond`,
        content: `When we stack many layers of neurons together, we get what is known as a deep neural network. These deep learning models can recognize faces, translate languages in real time, and even compose music. However, they require enormous amounts of data and computing power, which is why companies invest billions in specialized hardware.`,
        translation: `当我们把许多层神经元堆叠在一起时，就得到了所谓的深度神经网络。这些深度学习模型可以识别人脸、实时翻译语言，甚至创作音乐。然而，它们需要大量的数据和计算能力，这就是为什么公司投入数十亿美元开发专用硬件。`,
        startTime: 300,
        endTime: 600,
        highlights: ['deep learning', 'specialized hardware', 'enormous']
      }
    ],
    bilingualSubtitles: [
      { startTime: 0, endTime: 5, english: `Today we're going to explore how neural networks actually work.`, chinese: `今天我们将探索神经网络实际上是如何工作的。` },
      { startTime: 5, endTime: 12, english: `A neural network is a computing system inspired by the human brain.`, chinese: `神经网络是一种受人脑启发的计算系统。` },
      { startTime: 12, endTime: 20, english: `It consists of layers of interconnected nodes, often called neurons.`, chinese: `它由相互连接的节点层组成，这些节点通常被称为神经元。` },
      { startTime: 20, endTime: 28, english: `Each connection has a weight that adjusts as the network learns from data.`, chinese: `每个连接都有一个权重，随着网络从数据中学习而调整。` },
      { startTime: 28, endTime: 38, english: `The simplest form, called a perceptron, takes multiple inputs and produces a single output.`, chinese: `最简单的形式叫做感知器，它接收多个输入并产生一个单一的输出。` },
      { startTime: 38, endTime: 48, english: `Training involves feeding thousands of examples and adjusting the weights.`, chinese: `训练涉及提供数千个示例并调整权重。` },
      { startTime: 48, endTime: 58, english: `This process is called backpropagation.`, chinese: `这个过程叫做反向传播。` },
      { startTime: 58, endTime: 70, english: `Over many iterations, the network becomes increasingly accurate.`, chinese: `经过多次迭代，网络变得越来越准确。` },
      { startTime: 70, endTime: 82, english: `Deep learning models can recognize faces and translate languages in real time.`, chinese: `深度学习模型可以识别人脸并实时翻译语言。` },
      { startTime: 82, endTime: 95, english: `They require enormous amounts of data and computing power.`, chinese: `它们需要大量的数据和计算能力。` }
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // 4. Video — TED · C1 · science
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'content-ted-happiness',
    type: 'video',
    title: `The Surprising Science of Happiness`,
    summary: `A TED talk revealing the scientific research behind happiness — why our brains are wired for negativity and how we can retrain them.`,
    source: 'TED',
    sourceUrl: 'https://www.ted.com/talks/science-of-happiness',
    difficulty: 'C1',
    category: 'science',
    tags: ['happiness', 'psychology', 'neuroscience', 'well-being'],
    coverImage: '/assets/covers/ted-happiness.jpg',
    publishedAt: '2025-03-01',
    vocabularyCount: 55,
    duration: 900,
    videoUrl: 'https://www.ted.com/talks/science-of-happiness',
    segments: [
      {
        id: 'seg-ted-hap-1',
        index: 0,
        title: `The Negativity Bias`,
        content: `Our brains evolved to prioritize negative experiences over positive ones. This negativity bias was crucial for survival — our ancestors needed to remember where predators lurked far more than where they found berries. Today, this same wiring means we dwell on criticism far longer than we savor praise, and a single bad experience can overshadow dozens of good ones.`,
        translation: `我们的大脑进化为将负面经历置于正面经历之上。这种负面偏见对生存至关重要——我们的祖先需要记住捕食者潜伏的地方，远比记住他们找到浆果的地方更重要。今天，同样的神经回路意味着我们纠结于批评的时间远长于品味赞美的时间，一次糟糕的经历可以掩盖数十次美好的经历。`,
        highlights: ['negativity bias', 'predators', 'dwell on', 'savor']
      },
      {
        id: 'seg-ted-hap-2',
        index: 1,
        title: `The Hedonic Treadmill`,
        content: `Research shows that major life events — winning the lottery, getting a promotion, or even suffering an accident — have a surprisingly temporary effect on our baseline happiness. This phenomenon, known as the hedonic treadmill, means we constantly adapt to new circumstances and return to our default emotional state. Understanding this tendency is the first step toward breaking free from it.`,
        translation: `研究表明，重大生活事件——中彩票、获得晋升，甚至遭遇事故——对我们基线幸福感的影响出人意料地短暂。这种现象被称为享乐跑步机，意味着我们不断适应新环境并回到默认的情绪状态。理解这种倾向是摆脱它的第一步。`,
        highlights: ['hedonic treadmill', 'baseline', 'default emotional state']
      },
      {
        id: 'seg-ted-hap-3',
        index: 2,
        title: `Retraining the Brain`,
        content: `Neuroscience has demonstrated that we can deliberately reshape our thought patterns through practices like gratitude journaling, mindfulness meditation, and acts of kindness. Brain scans reveal that just eight weeks of consistent meditation practice produces measurable changes in regions associated with self-awareness and compassion. The key insight is that happiness is not merely a feeling — it is a skill that can be cultivated.`,
        translation: `神经科学已经证明，我们可以通过感恩日记、正念冥想和善举等练习来有意识地重塑我们的思维模式。大脑扫描显示，仅仅八周持续的冥想练习就能在与自我意识和同情心相关的区域产生可测量的变化。关键的洞察是，幸福不仅仅是一种感觉——它是一种可以培养的技能。`,
        highlights: ['deliberately', 'mindfulness', 'cultivated', 'measurable']
      }
    ],
    bilingualSubtitles: [
      { startTime: 0, endTime: 8, english: `I want to talk to you about the science of happiness.`, chinese: `我想和大家谈谈幸福的科学。` },
      { startTime: 8, endTime: 18, english: `Our brains evolved to prioritize negative experiences over positive ones.`, chinese: `我们的大脑进化为将负面经历置于正面经历之上。` },
      { startTime: 18, endTime: 30, english: `This negativity bias was crucial for survival thousands of years ago.`, chinese: `这种负面偏见在几千年前对生存至关重要。` },
      { startTime: 30, endTime: 42, english: `Today, we dwell on criticism far longer than we savor praise.`, chinese: `今天，我们纠结于批评的时间远长于品味赞美的时间。` },
      { startTime: 42, endTime: 55, english: `Research shows that major life events have a temporary effect on happiness.`, chinese: `研究表明，重大生活事件对幸福感的影响是暂时的。` },
      { startTime: 55, endTime: 68, english: `This is known as the hedonic treadmill.`, chinese: `这就是所谓的享乐跑步机。` },
      { startTime: 68, endTime: 82, english: `We constantly adapt to new circumstances and return to our default state.`, chinese: `我们不断适应新环境并回到默认状态。` },
      { startTime: 82, endTime: 95, english: `Neuroscience shows we can reshape our thought patterns.`, chinese: `神经科学表明我们可以重塑思维模式。` },
      { startTime: 95, endTime: 110, english: `Eight weeks of meditation produces measurable changes in the brain.`, chinese: `八周的冥想会在大脑中产生可测量的变化。` },
      { startTime: 110, endTime: 125, english: `Happiness is not merely a feeling — it is a skill that can be cultivated.`, chinese: `幸福不仅仅是一种感觉——它是一种可以培养的技能。` }
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // 5. Podcast — Spotify · B2 · culture  (30 min long content)
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'content-spotify-english-history',
    type: 'podcast',
    title: `The History of the English Language`,
    summary: `A deep-dive podcast tracing English from its Germanic roots through the Norman Conquest, the Renaissance, and into the global lingua franca it is today.`,
    source: 'Spotify',
    sourceUrl: 'https://open.spotify.com/episode/english-history',
    difficulty: 'B2',
    category: 'culture',
    tags: ['English language', 'history', 'linguistics', 'culture'],
    coverImage: '/assets/covers/spotify-english-history.jpg',
    publishedAt: '2025-07-01',
    vocabularyCount: 60,
    duration: 1800,
    audioUrl: 'https://open.spotify.com/episode/english-history',
    speaker: `Dr. Eleanor Hughes`,
    wordCount: 4500,
    estimatedMinutes: 30,
    segments: [
      {
        id: 'seg-spot-eh-1',
        index: 0,
        title: `Germanic Origins`,
        content: `English belongs to the Germanic family of languages, sharing its earliest roots with German, Dutch, and the Scandinavian tongues. Around the fifth century, three Germanic tribes — the Angles, the Saxons, and the Jutes — crossed the North Sea and settled in Britain. They brought with them what linguists now call Old English, a language virtually unrecognizable to modern speakers. Words like "cyning" for king and "hūs" for house hint at the connections that still exist beneath the surface.`,
        translation: `英语属于日耳曼语系，与德语、荷兰语和斯堪的纳维亚语言共享其最早的根源。大约在五世纪，三个日耳曼部落——盎格鲁人、撒克逊人和朱特人——渡过北海，在不列颠定居。他们带来了语言学家现在称为古英语的语言，这种语言对现代说话者来说几乎无法辨认。像"cyning"（国王）和"hūs"（房子）这样的词汇暗示了仍然存在于表面之下的联系。`,
        highlights: ['Germanic', 'Old English', 'unrecognizable']
      },
      {
        id: 'seg-spot-eh-2',
        index: 1,
        title: `The Norman Conquest`,
        content: `In 1066, William the Conqueror invaded England from Normandy, France. This event radically transformed the English language. French became the language of the ruling class, the courts, and fine dining, while English remained the tongue of the common people. Over the following centuries, thousands of French words seeped into English vocabulary. This is why we have pairs like "cow" and "beef," "pig" and "pork" — the animal kept its English name while the meat adopted the French one.`,
        translation: `1066年，征服者威廉从法国诺曼底入侵英格兰。这一事件彻底改变了英语。法语成为统治阶级、法庭和精致餐饮的语言，而英语仍然是普通百姓的语言。在接下来的几个世纪里，数千个法语词汇渗透到英语词汇中。这就是为什么我们有"cow"（牛）和"beef"（牛肉）、"pig"（猪）和"pork"（猪肉）这样的配对——动物保留了英语名称，而肉类采用了法语名称。`,
        highlights: ['Conquest', 'radically', 'seeped', 'vocabulary']
      },
      {
        id: 'seg-spot-eh-3',
        index: 2,
        title: `The Great Vowel Shift`,
        content: `Between the fifteenth and eighteenth centuries, English underwent a dramatic transformation in how its vowels were pronounced. Known as the Great Vowel Shift, this gradual change is the reason English spelling often seems so irregular. The word "knight," for example, was once pronounced exactly as it is spelled, with a hard K sound and a distinct "gh" sound similar to the German "Bach." Over time, these sounds simplified, but the old spellings remained.`,
        translation: `在十五世纪到十八世纪之间，英语在元音发音方面经历了戏剧性的转变。这就是所谓的大元音推移，这种渐进的变化是英语拼写看起来常常如此不规则的原因。例如，"knight"这个词曾经的发音与拼写完全一致，带有硬K音和类似于德语"Bach"的清晰"gh"音。随着时间的推移，这些发音简化了，但旧的拼写保留了下来。`,
        highlights: ['vowel shift', 'irregular', 'pronounced', 'simplified']
      },
      {
        id: 'seg-spot-eh-4',
        index: 3,
        title: `The Renaissance and Latin Influence`,
        content: `The Renaissance brought a flood of Latin and Greek vocabulary into English, particularly in the realms of science, medicine, and philosophy. Scholars deliberately borrowed terms from classical languages to express new ideas. Words like "atmosphere," "skeleton," and "encyclopedia" entered English during this period. This influx gave English an extraordinarily rich vocabulary, with multiple words often available for the same concept — one from Germanic roots and another from Latin or French.`,
        translation: `文艺复兴将大量拉丁语和希腊语词汇引入英语，特别是在科学、医学和哲学领域。学者们有意从古典语言中借用术语来表达新思想。"大气层"、"骨架"和"百科全书"等词汇在这一时期进入英语。这次涌入赋予了英语异常丰富的词汇量，通常有多个词汇可用表达同一概念——一个来自日耳曼语根，另一个来自拉丁语或法语。`,
        highlights: ['Renaissance', 'deliberately', 'influx', 'extraordinarily']
      },
      {
        id: 'seg-spot-eh-5',
        index: 4,
        title: `English Goes Global`,
        content: `The British Empire spread English to every corner of the globe, from North America to Australia, from India to South Africa. Each region developed its own distinct variety, incorporating local vocabulary and pronunciation patterns. Today, English is spoken by approximately 1.5 billion people worldwide, making it the most widely spoken language in human history. Yet it continues to evolve, absorbing words from languages across the world and adapting to new technologies and cultural trends.`,
        translation: `大英帝国将英语传播到全球的每个角落，从北美到澳大利亚，从印度到南非。每个地区发展出自己独特的变体，融入了当地词汇和发音模式。如今，全球约有15亿人说英语，使其成为人类历史上使用最广泛的语言。然而它仍在不断演变，吸收来自世界各地语言的词汇，并适应新技术和文化趋势。`,
        highlights: ['distinct variety', 'incorporating', 'approximately', 'absorbing']
      }
    ],
    segmentPractice: [
      {
        segmentId: 'seg-spot-eh-1',
        segmentTitle: `Germanic Origins`,
        questions: [
          {
            id: 'q-spot-eh-1a',
            type: 'reading-comprehension',
            difficulty: 'B2',
            question: `Which three tribes brought Old English to Britain?`,
            options: [
              `The Romans, the Vikings, and the Normans`,
              `The Angles, the Saxons, and the Jutes`,
              `The Celts, the Picts, and the Scots`,
              `The Greeks, the Romans, and the Gauls`
            ],
            correctAnswer: `The Angles, the Saxons, and the Jutes`,
            explanation: `The passage mentions three Germanic tribes: the Angles, the Saxons, and the Jutes.`,
            points: 10,
            tags: ['detail extraction']
          },
          {
            id: 'q-spot-eh-1b',
            type: 'fill-blank',
            difficulty: 'B2',
            question: `Old English is virtually ________ to modern speakers.`,
            correctAnswer: 'unrecognizable',
            explanation: `Unrecognizable means impossible to identify or recognize. The text says Old English is virtually unrecognizable.`,
            points: 15,
            tags: ['vocabulary']
          }
        ]
      },
      {
        segmentId: 'seg-spot-eh-2',
        segmentTitle: `The Norman Conquest`,
        questions: [
          {
            id: 'q-spot-eh-2a',
            type: 'multiple-choice',
            difficulty: 'B2',
            question: `Why do we have both "cow" and "beef" in English?`,
            options: [
              `They come from different regions of England`,
              `The animal kept its English name while the meat adopted the French one`,
              `One is formal and the other is informal`,
              `They were invented at different times`
            ],
            correctAnswer: `The animal kept its English name while the meat adopted the French one`,
            explanation: `The passage explains that after the Norman Conquest, animals kept English names while meat adopted French ones.`,
            points: 10,
            tags: ['reading comprehension']
          },
          {
            id: 'q-spot-eh-2b',
            type: 'fill-blank',
            difficulty: 'B2',
            question: `Thousands of French words ________ into English vocabulary over centuries.`,
            correctAnswer: 'seeped',
            explanation: `Seeped means gradually entered or渗透. The text says French words seeped into English vocabulary.`,
            points: 15,
            tags: ['vocabulary']
          }
        ]
      },
      {
        segmentId: 'seg-spot-eh-3',
        segmentTitle: `The Great Vowel Shift`,
        questions: [
          {
            id: 'q-spot-eh-3a',
            type: 'reading-comprehension',
            difficulty: 'B2',
            question: `What is the main reason English spelling often seems irregular?`,
            options: [
              `Scholars deliberately changed the spelling`,
              `The Great Vowel Shift changed pronunciation but not spelling`,
              `Printers made frequent mistakes`,
              `English borrowed spelling from many languages`
            ],
            correctAnswer: `The Great Vowel Shift changed pronunciation but not spelling`,
            explanation: `The passage states the vowel shift is the reason English spelling seems irregular — pronunciation changed but old spellings remained.`,
            points: 10,
            tags: ['reading comprehension']
          },
          {
            id: 'q-spot-eh-3b',
            type: 'true-false',
            difficulty: 'B2',
            question: `The word "knight" was once pronounced exactly as it is spelled today.`,
            correctAnswer: 'false',
            explanation: `The passage says "knight" was once pronounced as spelled, but its pronunciation has since changed. It is NOT pronounced as spelled today.`,
            points: 10,
            tags: ['reading comprehension']
          }
        ]
      },
      {
        segmentId: 'seg-spot-eh-4',
        segmentTitle: `The Renaissance and Latin Influence`,
        questions: [
          {
            id: 'q-spot-eh-4a',
            type: 'multiple-choice',
            difficulty: 'B2',
            question: `Which fields received the most Latin and Greek vocabulary during the Renaissance?`,
            options: [
              `Cooking, farming, and sports`,
              `Science, medicine, and philosophy`,
              `Music, painting, and dance`,
              `Trade, banking, and shipping`
            ],
            correctAnswer: `Science, medicine, and philosophy`,
            explanation: `The passage states Latin and Greek vocabulary entered English particularly in science, medicine, and philosophy.`,
            points: 10,
            tags: ['detail extraction']
          },
          {
            id: 'q-spot-eh-4b',
            type: 'fill-blank',
            difficulty: 'B2',
            question: `This ________ gave English an extraordinarily rich vocabulary.`,
            correctAnswer: 'influx',
            explanation: `Influx means a large arrival or entry of something. The text describes the influx of Latin and Greek words.`,
            points: 15,
            tags: ['vocabulary']
          }
        ]
      },
      {
        segmentId: 'seg-spot-eh-5',
        segmentTitle: `English Goes Global`,
        questions: [
          {
            id: 'q-spot-eh-5a',
            type: 'reading-comprehension',
            difficulty: 'B2',
            question: `Approximately how many people speak English worldwide?`,
            options: ['500 million', '1 billion', '1.5 billion', '2 billion'],
            correctAnswer: '1.5 billion',
            explanation: `The passage states approximately 1.5 billion people worldwide speak English.`,
            points: 10,
            tags: ['detail extraction']
          },
          {
            id: 'q-spot-eh-5b',
            type: 'fill-blank',
            difficulty: 'B2',
            question: `Each region developed its own ________ variety of English.`,
            correctAnswer: 'distinct',
            explanation: `Distinct means clearly different or separate. The text says each region developed its own distinct variety.`,
            points: 15,
            tags: ['vocabulary']
          }
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // 6. Podcast — BBC · B1 · daily
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'content-bbc-ordering-coffee',
    type: 'podcast',
    title: `Daily English: Ordering Coffee`,
    summary: `Learn practical everyday English through a realistic coffee shop dialogue, covering common phrases for ordering, asking questions, and making small talk.`,
    source: 'BBC',
    sourceUrl: 'https://www.bbc.co.uk/learningenglish/ordering-coffee',
    difficulty: 'B1',
    category: 'lifestyle',
    tags: ['daily English', 'conversation', 'coffee shop', 'practical'],
    coverImage: '/assets/covers/bbc-coffee.jpg',
    publishedAt: '2025-06-28',
    vocabularyCount: 25,
    duration: 300,
    audioUrl: 'https://www.bbc.co.uk/learningenglish/ordering-coffee',
    speaker: `Sarah Mitchell`,
    wordCount: 600,
    estimatedMinutes: 5,
    segments: [
      {
        id: 'seg-bbc-cof-1',
        index: 0,
        title: `Greeting and Browsing the Menu`,
        content: `Barista: Good morning! Welcome to The Daily Grind. What can I get for you today?
Customer: Hi! I'm not sure yet — what would you recommend?
Barista: Well, our most popular drink is the caramel latte. If you prefer something stronger, our flat white is excellent.
Customer: I usually go for a cappuccino, but I'm open to trying something new.`,
        translation: `咖啡师：早上好！欢迎来到The Daily Grind。今天想喝点什么？
顾客：嗨！我还不确定——你推荐什么？
咖啡师：嗯，我们最受欢迎的饮品是焦糖拿铁。如果你喜欢更浓一些的，我们的馥芮白非常棒。
顾客：我通常喝卡布奇诺，但我愿意尝试新东西。`,
        highlights: ['recommend', 'popular', 'open to trying']
      },
      {
        id: 'seg-bbc-cof-2',
        index: 1,
        title: `Placing the Order`,
        content: `Customer: I'll try the flat white, please. Could I get it with oat milk instead of regular milk?
Barista: Absolutely! Would you like that in a small, medium, or large?
Customer: Medium, please. And could I also add a shot of vanilla syrup?
Barista: Of course. That'll be four pounds fifty. Would you like to pay by card or cash?`,
        translation: `顾客：我要试试馥芮白。能用燕麦奶代替普通牛奶吗？
咖啡师：当然可以！你想要小杯、中杯还是大杯？
顾客：中杯，谢谢。能再加一份香草糖浆吗？
咖啡师：没问题。一共四英镑五十便士。你刷卡还是付现金？`,
        highlights: ['oat milk', 'shot of vanilla syrup', 'pay by card']
      },
      {
        id: 'seg-bbc-cof-3',
        index: 2,
        title: `Small Talk and Closing`,
        content: `Barista: Here you go! One medium flat white with oat milk and vanilla. Enjoy!
Customer: Thank you! By the way, do you have Wi-Fi here?
Barista: We do! The password is written on the board behind you.
Customer: Perfect. Have a great day!
Barista: You too! See you next time.`,
        translation: `咖啡师：给你！一杯中杯馥芮白加燕麦奶和香草。请享用！
顾客：谢谢！顺便问一下，这里有Wi-Fi吗？
咖啡师：有的！密码写在你身后的白板上。
顾客：太好了。祝你有美好的一天！
咖啡师：你也是！下次见。`,
        highlights: ['by the way', 'password', 'enjoy']
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // 7. Article — CNN · C1 · news
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'content-cnn-climate',
    type: 'article',
    title: `Climate Change: What the Latest Data Tells Us`,
    summary: `An in-depth analysis of the most recent climate data, examining rising temperatures, sea level changes, and what scientists predict for the coming decades.`,
    source: 'CNN',
    sourceUrl: 'https://www.cnn.com/climate/data-analysis',
    difficulty: 'C1',
    category: 'news',
    tags: ['climate change', 'environment', 'data analysis', 'science'],
    coverImage: '/assets/covers/cnn-climate.jpg',
    publishedAt: '2025-07-10',
    vocabularyCount: 65,
    wordCount: 1800,
    estimatedMinutes: 12,
    segments: [
      {
        id: 'seg-cnn-cc-1',
        index: 0,
        title: `Temperature Records Shattered`,
        content: `The past decade has been the warmest in recorded history, with global average temperatures now 1.2 degrees Celsius above pre-industrial levels. Scientists warn that this seemingly modest increase masks dramatic regional variations — the Arctic is warming nearly four times faster than the global average, triggering unprecedented ice sheet loss and threatening coastal communities worldwide.`,
        translation: `过去十年是人类有记录以来最热的十年，全球平均气温现在比工业化前水平高出1.2摄氏度。科学家警告说，这种看似温和的升温掩盖了剧烈的地区差异——北极的升温速度几乎是全球平均水平的四倍，引发了前所未有的冰盖损失，威胁着全球沿海社区。`,
        highlights: ['unprecedented', 'modest', 'triggering']
      },
      {
        id: 'seg-cnn-cc-2',
        index: 1,
        title: `Rising Sea Levels`,
        content: `Satellite measurements reveal that sea levels are rising at an accelerating rate — currently 3.6 millimeters per year, compared to 1.4 millimeters annually in the early twentieth century. If current trends continue, projections indicate a rise of between 0.3 and 1.0 meters by 2100. Such an increase would displace hundreds of millions of people living in low-lying coastal areas and small island nations.`,
        translation: `卫星测量显示，海平面正在加速上升——目前每年上升3.6毫米，而二十世纪初每年仅为1.4毫米。如果当前趋势继续下去，预测显示到2100年将上升0.3至1.0米。这样的增长将迫使数亿生活在低洼沿海地区和小岛屿国家的人流离失所。`,
        highlights: ['accelerating', 'projections', 'displace', 'low-lying']
      },
      {
        id: 'seg-cnn-cc-3',
        index: 2,
        title: `Extreme Weather Events`,
        content: `The frequency and intensity of extreme weather events have increased markedly over the past thirty years. Heat waves that once occurred once every fifty years are now happening roughly every decade. Hurricanes are becoming more powerful as warmer ocean waters provide additional energy. Droughts are lasting longer and affecting larger areas, with devastating consequences for agriculture and water supplies.`,
        translation: `过去三十年来，极端天气事件的频率和强度显著增加。曾经每五十年发生一次的热浪现在大约每十年发生一次。随着更温暖的海水提供额外能量，飓风变得更加强大。干旱持续时间更长，影响范围更大，对农业和供水造成毁灭性后果。`,
        highlights: ['markedly', 'intensity', 'devastating', 'consequences']
      },
      {
        id: 'seg-cnn-cc-4',
        index: 3,
        title: `The Path Forward`,
        content: `Despite the grim data, scientists emphasize that the worst outcomes are still avoidable if governments take decisive action now. The Paris Agreement set a target of limiting warming to 1.5 degrees Celsius, but current national pledges put the world on track for approximately 2.7 degrees. Bridging this gap requires a rapid transition to renewable energy, widespread adoption of electric vehicles, and fundamental changes in industrial processes and agricultural practices.`,
        translation: `尽管数据严峻，科学家强调，如果各国政府现在采取果断行动，最坏的结果仍然可以避免。《巴黎协定》设定了将升温限制在1.5摄氏度的目标，但目前的国家承诺使全球走向约2.7摄氏度的轨道。弥合这一差距需要快速转向可再生能源，广泛采用电动汽车，以及工业流程和农业实践的根本变革。`,
        highlights: ['decisive', 'pledges', 'transition', 'fundamental']
      }
    ],
    segmentPractice: [
      {
        segmentId: 'seg-cnn-cc-1',
        segmentTitle: `Temperature Records Shattered`,
        questions: [
          {
            id: 'q-cnn-cc-1a',
            type: 'reading-comprehension',
            difficulty: 'C1',
            question: `How much faster is the Arctic warming compared to the global average?`,
            options: [
              `Two times faster`,
              `Three times faster`,
              `Nearly four times faster`,
              `Five times faster`
            ],
            correctAnswer: `Nearly four times faster`,
            explanation: `The passage states the Arctic is warming nearly four times faster than the global average.`,
            points: 10,
            tags: ['detail extraction']
          },
          {
            id: 'q-cnn-cc-1b',
            type: 'fill-blank',
            difficulty: 'C1',
            question: `The seemingly modest increase ________ dramatic regional variations.`,
            correctAnswer: 'masks',
            explanation: `To mask means to hide or conceal. The text says the modest increase masks dramatic regional variations.`,
            points: 15,
            tags: ['vocabulary']
          }
        ]
      },
      {
        segmentId: 'seg-cnn-cc-2',
        segmentTitle: `Rising Sea Levels`,
        questions: [
          {
            id: 'q-cnn-cc-2a',
            type: 'multiple-choice',
            difficulty: 'C1',
            question: `What is the current annual rate of sea level rise?`,
            options: [
              `1.4 millimeters per year`,
              `2.5 millimeters per year`,
              `3.6 millimeters per year`,
              `5.0 millimeters per year`
            ],
            correctAnswer: `3.6 millimeters per year`,
            explanation: `The passage states sea levels are currently rising at 3.6 millimeters per year.`,
            points: 10,
            tags: ['detail extraction']
          },
          {
            id: 'q-cnn-cc-2b',
            type: 'fill-blank',
            difficulty: 'C1',
            question: `Sea level rise would ________ hundreds of millions of people.`,
            correctAnswer: 'displace',
            explanation: `To displace means to force someone to leave their home. The text says rising seas would displace hundreds of millions.`,
            points: 15,
            tags: ['vocabulary']
          }
        ]
      },
      {
        segmentId: 'seg-cnn-cc-3',
        segmentTitle: `Extreme Weather Events`,
        questions: [
          {
            id: 'q-cnn-cc-3a',
            type: 'true-false',
            difficulty: 'C1',
            question: `Heat waves that once occurred every fifty years now happen roughly every decade.`,
            correctAnswer: 'true',
            explanation: `The passage confirms that heat waves once every fifty years are now happening roughly every decade.`,
            points: 10,
            tags: ['reading comprehension']
          },
          {
            id: 'q-cnn-cc-3b',
            type: 'fill-blank',
            difficulty: 'C1',
            question: `Droughts have ________ consequences for agriculture and water supplies.`,
            correctAnswer: 'devastating',
            explanation: `Devastating means extremely destructive or damaging. The text describes the consequences as devastating.`,
            points: 15,
            tags: ['vocabulary']
          }
        ]
      },
      {
        segmentId: 'seg-cnn-cc-4',
        segmentTitle: `The Path Forward`,
        questions: [
          {
            id: 'q-cnn-cc-4a',
            type: 'reading-comprehension',
            difficulty: 'C1',
            question: `What temperature target did the Paris Agreement set?`,
            options: [
              `2.0 degrees Celsius`,
              `1.5 degrees Celsius`,
              `1.0 degrees Celsius`,
              `0.5 degrees Celsius`
            ],
            correctAnswer: `1.5 degrees Celsius`,
            explanation: `The passage states the Paris Agreement set a target of limiting warming to 1.5 degrees Celsius.`,
            points: 10,
            tags: ['detail extraction']
          },
          {
            id: 'q-cnn-cc-4b',
            type: 'fill-blank',
            difficulty: 'C1',
            question: `Governments need to take ________ action now to avoid the worst outcomes.`,
            correctAnswer: 'decisive',
            explanation: `Decisive means resolute and determined. The text says governments must take decisive action now.`,
            points: 15,
            tags: ['vocabulary']
          }
        ]
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════
  // 8. Video — Netflix · A2 · entertainment
  // ═══════════════════════════════════════════════════════════════
  {
    id: 'content-netflix-friends',
    type: 'video',
    title: `Friends - The One with the Job Interview`,
    summary: `A fun clip from the iconic sitcom Friends, featuring a job interview scenario with everyday conversational English perfect for beginners.`,
    source: 'Netflix',
    sourceUrl: 'https://www.netflix.com/watch/friends-job-interview',
    difficulty: 'A2',
    category: 'entertainment',
    tags: ['Friends', 'sitcom', 'job interview', 'everyday English'],
    coverImage: '/assets/covers/netflix-friends.jpg',
    publishedAt: '2025-02-14',
    vocabularyCount: 20,
    duration: 1200,
    videoUrl: 'https://www.netflix.com/watch/friends-job-interview',
    segments: [
      {
        id: 'seg-nf-fr-1',
        index: 0,
        title: `Before the Interview`,
        content: `Rachel: I am so nervous about this interview. What if I say something stupid?
Monica: You're going to be fine. Just be yourself — but, you know, the professional version.
Rachel: What does that even mean?
Monica: It means don't talk about your shoe collection for twenty minutes.`,
        translation: `瑞秋：我对这次面试好紧张。要是我说了蠢话怎么办？
莫妮卡：你会没事的。做你自己就好——但是，你知道的，专业版本的自己。
瑞秋：那到底是什么意思？
莫妮卡：意思就是不要花二十分钟谈论你的鞋子收藏。`,
        highlights: ['nervous', 'professional', 'collection']
      },
      {
        id: 'seg-nf-fr-2',
        index: 1,
        title: `The Interview`,
        content: `Interviewer: So, Rachel, tell me a little about yourself.
Rachel: Well, I recently left my job at Central Perk, where I was a waitress for three years. I learned a lot about customer service, time management, and working under pressure.
Interviewer: That sounds impressive. Why do you want to work in fashion?
Rachel: I've always had a passion for style and design. I believe my experience with customers has given me a strong understanding of what people want.`,
        translation: `面试官：那么，瑞秋，简单介绍一下你自己吧。
瑞秋：嗯，我最近离开了我在Central Perk的工作，在那里我做了三年服务员。我学到了很多关于客户服务、时间管理和在压力下工作的经验。
面试官：听起来很不错。你为什么想在时尚行业工作？
瑞秋：我一直对时尚和设计充满热情。我相信我与客户打交道的经历让我对人们的需求有了深刻的理解。`,
        highlights: ['customer service', 'time management', 'passion']
      },
      {
        id: 'seg-nf-fr-3',
        index: 2,
        title: `After the Interview`,
        content: `Monica: How did it go?
Rachel: I think it went really well! She said she'd call me by Friday.
Joey: Did you remember to smile? People love a good smile.
Rachel: Yes, Joey, I smiled.
Chandler: Did you remember not to be yourself?
Rachel: Very funny, Chandler.`,
        translation: `莫妮卡：怎么样？
瑞秋：我觉得进行得很顺利！她说周五之前会给我打电话。
乔伊：你记得微笑吗？人们喜欢好的微笑。
瑞秋：是的，乔伊，我笑了。
钱德勒：你记得不要做你自己了吗？
瑞秋：很好笑，钱德勒。`,
        highlights: [`went well`, 'remember to']
      }
    ],
    bilingualSubtitles: [
      { startTime: 0, endTime: 6, english: `I am so nervous about this interview.`, chinese: `我对这次面试好紧张。` },
      { startTime: 6, endTime: 14, english: `What if I say something stupid?`, chinese: `要是我说了蠢话怎么办？` },
      { startTime: 14, endTime: 22, english: `You're going to be fine. Just be yourself.`, chinese: `你会没事的。做你自己就好。` },
      { startTime: 22, endTime: 30, english: `Tell me a little about yourself.`, chinese: `简单介绍一下你自己吧。` },
      { startTime: 30, endTime: 40, english: `I learned a lot about customer service.`, chinese: `我学到了很多关于客户服务的经验。` },
      { startTime: 40, endTime: 50, english: `Why do you want to work in fashion?`, chinese: `你为什么想在时尚行业工作？` },
      { startTime: 50, endTime: 60, english: `I've always had a passion for style and design.`, chinese: `我一直对时尚和设计充满热情。` },
      { startTime: 60, endTime: 68, english: `How did it go?`, chinese: `怎么样？` },
      { startTime: 68, endTime: 78, english: `I think it went really well!`, chinese: `我觉得进行得很顺利！` },
      { startTime: 78, endTime: 88, english: `She said she would call me by Friday.`, chinese: `她说周五之前会给我打电话。` }
    ]
  }
]
