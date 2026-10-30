import { Question } from "./ui";

/*
 * Time Gate: quests in real places from history.
 *
 * Each place has a guide and four scenes. A scene is a short bit of story
 * and a task: a question, or (sometimes for Big) putting things in order.
 * In every question the FIRST answer is the right one (they are shuffled on screen).
 */

export interface Task {
  question?: Question;
  /** Steps in the right order (they are shuffled on screen). */
  order?: { title: string; steps: string[] };
}

export interface Scene {
  story: string;
  middle: Task;
  big: Task;
}

export interface Place {
  id: string;
  emoji: string;
  name: string;
  when: string;
  guide: { emoji: string; name: string };
  /** A rare decoration won the first time the quest is finished. */
  prize: { id: string; emoji: string; name: string };
  scenes: Scene[];
}

export const PLACES: Place[] = [
  {
    id: "egypt",
    emoji: "🏺",
    name: "Ancient Egypt",
    when: "about 4,500 years ago",
    guide: { emoji: "📜", name: "Nefer the scribe" },
    prize: { id: "cat-statue", emoji: "🐈", name: "Golden cat statue" },
    scenes: [
      {
        story: "Welcome to Egypt! Here it almost never rains. The great River Nile gives us water for our farms.",
        middle: { question: { q: "What gave the Egyptians water for their farms?", options: ["🏞️ The River Nile", "🌧️ Lots of rain", "❄️ Snow"] } },
        big: { question: { q: "Every year the Nile flooded. Why were farmers happy?", options: ["🌱 It left rich mud for crops", "🎿 They could go skiing", "🏜️ It made more desert"] } },
      },
      {
        story: "Our kings are called pharaohs. Huge pyramids were built as their tombs.",
        middle: { question: { q: "What is a pharaoh?", options: ["👑 A king of Egypt", "🐪 A camel", "🍞 A kind of bread"] } },
        big: {
          order: {
            title: "How was a pyramid built? Put the jobs in order.",
            steps: ["🪨 Cut big stone blocks", "🛶 Bring them by boat on the Nile", "🔺 Pull them up and stack them"],
          },
        },
      },
      {
        story: "I'm a scribe: I write with little pictures called hieroglyphs, on paper made from papyrus reeds.",
        middle: { question: { q: "Hieroglyphs are writing made of…", options: ["🖼️ Little pictures", "🔢 Only numbers", "🎵 Music notes"] } },
        big: { question: { q: "Egyptian paper was made from…", options: ["🌾 Papyrus reeds", "🧃 Plastic", "🪟 Glass"] } },
      },
      {
        story: "Egyptians loved cats! Cats kept mice away from the grain, and people made statues of them.",
        middle: { question: { q: "Which animal did the Egyptians love?", options: ["🐈 Cats", "🐧 Penguins", "🦘 Kangaroos"] } },
        big: { question: { q: "Why were cats so useful in Egypt?", options: ["🐭 They kept mice away from the grain", "🧹 They cleaned the houses", "📜 They could write"] } },
      },
    ],
  },
  {
    id: "andalusia",
    emoji: "🏰",
    name: "Al-Andalus",
    when: "about 1,000 years ago",
    guide: { emoji: "🧕", name: "Layla from Córdoba" },
    prize: { id: "fountain", emoji: "⛲", name: "Alhambra fountain" },
    scenes: [
      {
        story: "Welcome to Córdoba in al-Andalus, in the land we now call Spain. It was one of the biggest cities in Europe, with paved streets and lamps at night!",
        middle: { question: { q: "What lit up the streets of Córdoba at night?", options: ["🏮 Lamps", "💡 Electric lights", "🔦 Torches from space"] } },
        big: { question: { q: "Al-Andalus was in the land we now call…", options: ["🇪🇸 Spain", "🇯🇵 Japan", "🇧🇷 Brazil"] } },
      },
      {
        story: "This is the Great Mosque of Córdoba. Look: a forest of columns with arches striped red and white!",
        middle: { question: { q: "What colours are the arches?", options: ["🔴⚪ Red and white", "🟢🟣 Green and purple", "⚫ All black"] } },
        big: { question: { q: "The arches stand on hundreds of…", options: ["🏛️ Columns", "🎈 Balloons", "🪢 Ropes"] } },
      },
      {
        story: "In Granada is the Alhambra palace. Its walls have amazing patterns made of shapes, and its gardens have fountains.",
        middle: { question: { q: "What would you see on the Alhambra walls?", options: ["⭐ Star patterns made of shapes", "🦖 Dinosaur stickers", "📺 TV screens"] } },
        big: { question: { q: "The Alhambra artists made their patterns using…", options: ["📐 Geometry (shapes and angles)", "📸 Photos", "🖍️ Crayons"] } },
      },
      {
        story: "People here studied the stars, medicine and maths. An inventor called Abbas ibn Firnas even tried to fly with wings!",
        middle: { question: { q: "What did Abbas ibn Firnas try to do?", options: ["🪽 Fly", "🏊 Swim to Africa", "🌙 Dig to the Moon"] } },
        big: { question: { q: "Farmers in al-Andalus watered oranges and rice with…", options: ["💧 Canals (water channels)", "🍋 Lemonade", "❄️ Snow machines"] } },
      },
    ],
  },
  {
    id: "baghdad",
    emoji: "📚",
    name: "House of Wisdom",
    when: "about 1,200 years ago",
    guide: { emoji: "👳", name: "Yusuf the scholar" },
    prize: { id: "astrolabe", emoji: "🔭", name: "Brass astrolabe" },
    scenes: [
      {
        story: "Welcome to Baghdad! The House of Wisdom is a great library. Scholars from many lands work here together.",
        middle: { question: { q: "What was the House of Wisdom?", options: ["📚 A great library", "🏊 A swimming pool", "🎪 A circus"] } },
        big: { question: { q: "Scholars here translated books from Greek, Persian and Indian into…", options: ["🔤 Arabic", "🇬🇧 English", "🇯🇵 Japanese"] } },
      },
      {
        story: "My friend al-Khwarizmi wrote a famous book about algebra. The word 'algorithm' comes from his name!",
        middle: { question: { q: "Al-Khwarizmi was great at…", options: ["🔢 Maths", "🏇 Horse racing", "🎨 Painting"] } },
        big: { question: { q: "Which word comes from al-Khwarizmi's name?", options: ["💻 Algorithm", "🔤 Alphabet", "🦖 Dinosaur"] } },
      },
      {
        story: "We use the numbers 0 to 9 that came from India. Later they reached Europe through Arabic books. Help me count!",
        middle: { question: { q: "📚📚📚 + 📚📚 = ?", options: ["5️⃣ Five", "4️⃣ Four", "6️⃣ Six"] } },
        big: { question: { q: "A scholar copies 6 pages a day. How many pages in 4 days?", options: ["24", "10", "20"] } },
      },
      {
        story: "Ibn al-Haytham studied light. He showed that we see things because light goes into our eyes. He tested his ideas with experiments.",
        middle: { question: { q: "We see things because light goes into our…", options: ["👀 Eyes", "👂 Ears", "👃 Nose"] } },
        big: {
          order: {
            title: "Find out like a scientist! Put the steps in order.",
            steps: ["🤔 Ask a question", "🧪 Do an experiment", "👀 Watch what happens", "📝 Write what you learned"],
          },
        },
      },
    ],
  },
  {
    id: "silkroad",
    emoji: "🐫",
    name: "The Silk Road",
    when: "about 1,000 years ago",
    guide: { emoji: "🧑‍🦱", name: "Mei the trader" },
    prize: { id: "lantern", emoji: "🏮", name: "Silk lantern" },
    scenes: [
      {
        story: "The Silk Road is a long set of trade roads. It joins China with the Middle East and Europe.",
        middle: { question: { q: "The Silk Road is named after…", options: ["🧵 Silk", "🍫 Chocolate", "🚗 Cars"] } },
        big: { question: { q: "The Silk Road joined China with…", options: ["🌍 The Middle East and Europe", "🗽 America", "🐧 Antarctica"] } },
      },
      {
        story: "We cross the hot deserts with camels. Camels can walk for days without drinking!",
        middle: { question: { q: "Which animal carried things across the desert?", options: ["🐫 Camels", "🐧 Penguins", "🐬 Dolphins"] } },
        big: { question: { q: "Why were camels great for the desert?", options: ["💧 They go for days without water", "🪽 They can fly", "❄️ They love snow"] } },
      },
      {
        story: "Let's trade! At the market we swap silk for spices.",
        middle: { question: { q: "2 🧵 silk = 1 🫙 spice. You have 6 🧵. How many 🫙 can you get?", options: ["3", "2", "6"] } },
        big: { question: { q: "Our caravan has 4 groups of 5 camels. How many camels?", options: ["20", "9", "45"] } },
      },
      {
        story: "At night we rest in a caravanserai, an inn for traders and their camels. Not just things travel this road: ideas, stories and inventions like paper do too!",
        middle: { question: { q: "What else travelled along the Silk Road?", options: ["💡 Ideas and stories", "📱 Phones", "✈️ Aeroplanes"] } },
        big: {
          order: {
            title: "Travel from east to west! Put the cities in order.",
            steps: ["🇨🇳 Chang'an (China)", "🕌 Samarkand", "📚 Baghdad", "🌉 Constantinople"],
          },
        },
      },
    ],
  },
];
