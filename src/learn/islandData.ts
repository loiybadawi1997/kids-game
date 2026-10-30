import { Question } from "./ui";

/*
 * Explorer's Island: things to discover for the journal, and the science
 * puzzles that open the path to the other side of the island.
 *
 * In every question the FIRST answer is the right one (they are shuffled on screen).
 */

export type FindKind = "animal" | "plant" | "fossil";

export interface Discovery {
  id: string;
  emoji: string;
  name: string;
  kind: FindKind;
  fact: string;
  middle: Question;
  big: Question;
}

export const KIND_INFO: Record<FindKind, { icon: string; label: string }> = {
  animal: { icon: "🐾", label: "Animals" },
  plant: { icon: "🌱", label: "Plants" },
  fossil: { icon: "🦴", label: "Fossils and rocks" },
};

export const DISCOVERIES: Discovery[] = [
  // --- Animals ---
  {
    id: "turtle", emoji: "🐢", name: "Sea turtle", kind: "animal",
    fact: "Sea turtles swim in the sea, but they lay their eggs on sandy beaches.",
    middle: { q: "Where do sea turtles lay their eggs?", options: ["🏖️ On the sand", "🌳 In a tree", "🧊 On the ice"] },
    big: { q: "Baby sea turtles hatch on the beach. Where do they go?", options: ["🌊 To the sea", "🏔️ Up a mountain", "🌳 Into the forest"] },
  },
  {
    id: "crab", emoji: "🦀", name: "Crab", kind: "animal",
    fact: "Crabs walk sideways. Their hard shell is on the outside of their body.",
    middle: { q: "How do crabs walk?", options: ["↔️ Sideways", "🦘 They hop", "🔄 In circles"] },
    big: { q: "A skeleton on the OUTSIDE of the body is called an…", options: ["🦀 Exoskeleton", "🪶 Feather coat", "🧥 Fur coat"] },
  },
  {
    id: "octopus", emoji: "🐙", name: "Octopus", kind: "animal",
    fact: "An octopus has 8 arms, 3 hearts and can change colour to hide.",
    middle: { q: "How many arms does an octopus have?", options: ["8️⃣ Eight", "4️⃣ Four", "🔟 Ten"] },
    big: { q: "How many hearts does an octopus have?", options: ["3️⃣ Three", "1️⃣ One", "8️⃣ Eight"] },
  },
  {
    id: "parrot", emoji: "🦜", name: "Parrot", kind: "animal",
    fact: "Parrots can copy sounds, even words! They crack nuts with their strong beak.",
    middle: { q: "What can parrots copy?", options: ["🗣️ Sounds and words", "🎨 Colours", "🌧️ Rain"] },
    big: { q: "Parrots crack hard nuts with their strong…", options: ["🦜 Beak", "🪶 Wings", "🦶 Tail"] },
  },
  {
    id: "frog", emoji: "🐸", name: "Frog", kind: "animal",
    fact: "Frogs start life as tadpoles in the water. Frogs can breathe through their skin!",
    middle: { q: "A baby frog is called a…", options: ["🐟 Tadpole", "🐶 Puppy", "🐣 Chick"] },
    big: { q: "As well as with lungs, frogs can breathe through their…", options: ["🐸 Skin", "💇 Hair", "🪶 Feathers"] },
  },
  {
    id: "dolphin", emoji: "🐬", name: "Dolphin", kind: "animal",
    fact: "Dolphins live in the sea, but they breathe air, like us. They are mammals.",
    middle: { q: "Why do dolphins swim up to the top of the water?", options: ["💨 To breathe air", "😴 To sleep", "🏖️ To eat sand"] },
    big: { q: "A dolphin breathes through a hole on top of its head. It's called a…", options: ["💨 Blowhole", "👃 Beak", "🐟 Gill"] },
  },
  {
    id: "butterfly", emoji: "🦋", name: "Butterfly", kind: "animal",
    fact: "A caterpillar makes a chrysalis, and changes into a butterfly inside it.",
    middle: { q: "A butterfly starts life as a…", options: ["🐛 Caterpillar", "🐟 Fish", "🐣 Chick"] },
    big: { q: "Before it becomes a butterfly, a caterpillar makes a…", options: ["🫘 Chrysalis", "🪺 Nest", "🕸️ Web"] },
  },
  {
    id: "bee", emoji: "🐝", name: "Honey bee", kind: "animal",
    fact: "Bees make honey. They carry pollen from flower to flower, which helps plants make seeds.",
    middle: { q: "What do bees make?", options: ["🍯 Honey", "🥛 Milk", "🧀 Cheese"] },
    big: { q: "Bees help flowers make seeds by carrying…", options: ["🌼 Pollen", "🏖️ Sand", "💧 Water"] },
  },
  {
    id: "shark", emoji: "🦈", name: "Shark", kind: "animal",
    fact: "Sharks have rows and rows of teeth. When one falls out, a new one moves forward.",
    middle: { q: "Where do sharks live?", options: ["🌊 In the sea", "🌵 In the desert", "🌳 In the forest"] },
    big: { q: "A shark gets air from the water with its…", options: ["🐟 Gills", "🫁 Lungs", "👃 Nose"] },
  },
  {
    id: "owl", emoji: "🦉", name: "Owl", kind: "animal",
    fact: "Owls hunt at night. They can turn their heads a very long way round.",
    middle: { q: "When do owls hunt?", options: ["🌙 At night", "☀️ At lunchtime", "🌈 Only on rainbow days"] },
    big: { q: "Animals that are awake at night are called…", options: ["🌙 Nocturnal", "🌊 Aquatic", "🥕 Herbivores"] },
  },
  // --- Plants ---
  {
    id: "palm", emoji: "🌴", name: "Coconut palm", kind: "plant",
    fact: "Coconuts grow on palm trees. A coconut can float across the sea to a new island!",
    middle: { q: "What grows on a coconut palm?", options: ["🥥 Coconuts", "🍎 Apples", "🥕 Carrots"] },
    big: { q: "How can a coconut get to a new island?", options: ["🌊 It floats", "🚶 It walks", "✈️ It flies"] },
  },
  {
    id: "sunflower", emoji: "🌻", name: "Sunflower", kind: "plant",
    fact: "Young sunflowers turn to follow the sun across the sky.",
    middle: { q: "What do plants need to grow?", options: ["☀️ Sun and 💧 water", "🍬 Sweets", "📺 TV"] },
    big: { q: "Plants make their own food from sunlight. This is called…", options: ["🌿 Photosynthesis", "🍽️ Digestion", "☁️ Evaporation"] },
  },
  {
    id: "cactus", emoji: "🌵", name: "Cactus", kind: "plant",
    fact: "A cactus keeps water inside its thick stem, so it can live in the dry desert.",
    middle: { q: "Where does a cactus keep its water?", options: ["🌵 Inside its stem", "📌 In its spines", "🍼 In a bottle"] },
    big: { q: "Why does a cactus have spines instead of big leaves?", options: ["💧 To save water and stay safe", "🏊 To swim", "🪽 To fly"] },
  },
  {
    id: "mushroom", emoji: "🍄", name: "Mushroom", kind: "plant",
    fact: "A mushroom is not really a plant. It is a fungus! Fungi break down dead leaves.",
    middle: { q: "A mushroom is a…", options: ["🍄 Fungus", "🐟 Fish", "🪨 Rock"] },
    big: { q: "Fungi help the forest by breaking down…", options: ["🍂 Dead leaves and wood", "🪨 Big rocks", "🌧️ Rain"] },
  },
  {
    id: "oak", emoji: "🌰", name: "Acorn", kind: "plant",
    fact: "A huge oak tree grows from a small acorn. Seeds need water and warmth to start growing.",
    middle: { q: "An oak tree grows from an…", options: ["🌰 Acorn", "🥚 Egg", "🪨 Stone"] },
    big: { q: "What does a seed need to start growing?", options: ["💧 Water and warmth", "🌑 Only darkness", "🧂 Lots of salt"] },
  },
  {
    id: "strawberry", emoji: "🍓", name: "Strawberry", kind: "plant",
    fact: "Strawberries wear their seeds on the outside! The fruit is the part that holds the seeds.",
    middle: { q: "Where are a strawberry's seeds?", options: ["🍓 On the outside", "🫙 In a jar", "❌ It has none"] },
    big: { q: "The part of a plant that holds the seeds is the…", options: ["🍎 Fruit", "🪵 Root", "🌿 Stem"] },
  },
  // --- Fossils and rocks ---
  {
    id: "trex", emoji: "🦖", name: "T. rex tooth", kind: "fossil",
    fact: "T. rex lived about 66 million years ago. We know about it from fossils.",
    middle: { q: "When did dinosaurs live?", options: ["⏳ Long, long ago", "📅 Last week", "🚀 In the future"] },
    big: { q: "How do we know what dinosaurs looked like?", options: ["🦴 From fossils", "📸 From old photos", "📺 From old videos"] },
  },
  {
    id: "ammonite", emoji: "🐚", name: "Ammonite", kind: "fossil",
    fact: "Ammonites were sea animals with spiral shells. Their fossils are even found on mountains!",
    middle: { q: "What shape is an ammonite shell?", options: ["🌀 A spiral", "⬛ A square", "⭐ A star"] },
    big: { q: "Sea fossils on a mountain show that the land was once…", options: ["🌊 Under the sea", "🌕 On the Moon", "🧊 Made of ice"] },
  },
  {
    id: "bone", emoji: "🦴", name: "Dinosaur bone", kind: "fossil",
    fact: "A fossil is a very old bone or shell that slowly turned into stone.",
    middle: { q: "A fossil bone is made of…", options: ["🪨 Stone", "🍮 Jelly", "📄 Paper"] },
    big: { q: "Scientists who study fossils are called…", options: ["🔬 Palaeontologists", "🚀 Astronauts", "👩‍🍳 Chefs"] },
  },
  {
    id: "feather", emoji: "🪶", name: "Feathered dinosaur", kind: "fossil",
    fact: "Some dinosaurs had feathers! Birds are related to dinosaurs.",
    middle: { q: "Which animals are related to dinosaurs?", options: ["🐦 Birds", "🐟 Fish", "🐝 Bees"] },
    big: { q: "Archaeopteryx was part dinosaur and part…", options: ["🐦 Bird", "🐟 Fish", "🐸 Frog"] },
  },
  {
    id: "pumice", emoji: "🌋", name: "Pumice stone", kind: "fossil",
    fact: "Pumice is a rock made by a volcano. It is full of tiny air holes, so it can float!",
    middle: { q: "Where does pumice come from?", options: ["🌋 A volcano", "⛄ A snowman", "🌳 A tree"] },
    big: { q: "Pumice can float because it is full of…", options: ["🫧 Tiny air holes", "💧 Water", "🪙 Gold"] },
  },
  {
    id: "quartz", emoji: "💎", name: "Quartz crystal", kind: "fossil",
    fact: "Crystals grow very slowly and have flat, shiny sides. Lots of beach sand is tiny bits of quartz.",
    middle: { q: "What do crystals have?", options: ["💎 Flat, shiny sides", "🐻 Fur", "🛞 Wheels"] },
    big: { q: "Lots of beach sand is made of tiny bits of…", options: ["💎 Quartz", "🍬 Sugar", "🧃 Plastic"] },
  },
  {
    id: "footprint", emoji: "🦕", name: "Dinosaur footprints", kind: "fossil",
    fact: "Dinosaurs walked in soft mud. The mud dried, turned to rock, and kept their footprints.",
    middle: { q: "Huge footprints mean the animal was…", options: ["🦕 Big", "🐜 Tiny", "👻 Invisible"] },
    big: { q: "A long line of footprints shows the dinosaur was…", options: ["🚶 Walking", "😴 Sleeping", "🪽 Flying"] },
  },
  {
    id: "trilobite", emoji: "🪨", name: "Trilobite", kind: "fossil",
    fact: "Trilobites were sea creatures. They lived long before the dinosaurs.",
    middle: { q: "Where did trilobites live?", options: ["🌊 In the sea", "☁️ In the sky", "🏜️ In the desert"] },
    big: { q: "Did trilobites live before or after the dinosaurs?", options: ["⏪ Before", "⏩ After", "📅 At the same time as us"] },
  },
];

// ------------------------------------------------------------------
// Science puzzles (the "gate" in the middle of each trip)
// ------------------------------------------------------------------

/** Middle: does it float or sink? */
export const FLOAT_SINK: { emoji: string; name: string; floats: boolean; why: string }[] = [
  { emoji: "🪵", name: "Wood", floats: true, why: "Wood is light for its size." },
  { emoji: "🪨", name: "Stone", floats: false, why: "A stone is heavy for its size." },
  { emoji: "🍎", name: "Apple", floats: true, why: "Apples have air inside." },
  { emoji: "🔑", name: "Key", floats: false, why: "Metal keys are heavy for their size." },
  { emoji: "🦆", name: "Rubber duck", floats: true, why: "It is full of air." },
  { emoji: "🪙", name: "Coin", floats: false, why: "Metal coins sink." },
  { emoji: "🧊", name: "Ice", floats: true, why: "Ice is a bit lighter than water." },
  { emoji: "🔩", name: "Bolt", floats: false, why: "Metal bolts sink." },
  { emoji: "🏐", name: "Ball", floats: true, why: "It is full of air." },
  { emoji: "🍃", name: "Leaf", floats: true, why: "Leaves are thin and light." },
];

/**
 * Big: balance the seesaw. A weight sits on the left at a distance;
 * the child chooses where to put the right weight so both sides are equal
 * (weight × distance).
 */
export const SEESAWS: { left: number; leftAt: number; right: number; answer: number }[] = [
  { left: 2, leftAt: 2, right: 2, answer: 2 },
  { left: 4, leftAt: 2, right: 2, answer: 4 },
  { left: 3, leftAt: 4, right: 4, answer: 3 },
  { left: 2, leftAt: 3, right: 6, answer: 1 },
  { left: 4, leftAt: 3, right: 3, answer: 4 },
];
