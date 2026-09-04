export type SeedProduct = {
  name: string;
  category: string;
  price: number;
  rating: number;
  inventory: number;
  description: string;
  tags: string[];
  accent: "lime" | "blue" | "orange" | "violet";
  imageUrl: string;
};

export type SeedStore = {
  storeName: string;
  slug: string;
  ownerName: string;
  email: string;
  password: string;
  products: SeedProduct[];
};

type ProductTuple = [name: string, category: string, price: number, description: string, tags: string[]];

type StoreDef = {
  storeName: string;
  slug: string;
  ownerName: string;
  email: string;
  password: string;
  products: ProductTuple[];
};

const ACCENTS = ["lime", "blue", "orange", "violet"] as const;
const accentFor = (index: number) => ACCENTS[index % ACCENTS.length];
const img = (seed: string) => `https://picsum.photos/seed/${seed}/640/480`;

const storeDefs: StoreDef[] = [
  {
    storeName: "UrbanThreads",
    slug: "urbanthreads",
    ownerName: "Meera Kapoor",
    email: "owner@urbanthreads.demo",
    password: "demoPass123",
    products: [
      ["Classic White Tee", "T-shirts", 499, "Soft-knit 100% cotton crew neck, everyday fit.", ["cotton", "casual", "everyday", "unisex"]],
      ["Charcoal Graphic Tee", "T-shirts", 599, "Printed cotton tee with a minimal front graphic.", ["cotton", "casual", "graphic", "streetwear"]],
      ["Slim Fit Denim Jeans", "Jeans", 1799, "Stretch denim with a tapered slim fit.", ["denim", "casual", "stretch", "everyday"]],
      ["Relaxed Fit Cargo Pants", "Pants", 1599, "Utility cargo pants with multiple pockets.", ["cargo", "casual", "utility", "streetwear"]],
      ["Oversized Hoodie", "Hoodies", 1299, "Heavyweight fleece hoodie with kangaroo pocket.", ["hoodie", "winter", "streetwear", "comfort"]],
      ["Zip-Up Bomber Jacket", "Jackets", 2199, "Lightweight bomber with ribbed cuffs.", ["jacket", "layering", "streetwear"]],
      ["Denim Jacket", "Jackets", 2499, "Classic washed denim jacket, unisex fit.", ["denim", "jacket", "layering", "casual"]],
      ["Formal Slim Shirt", "Shirts", 999, "Wrinkle-resistant cotton-blend formal shirt.", ["formal", "office", "cotton"]],
      ["Checked Flannel Shirt", "Shirts", 899, "Brushed flannel check shirt for layering.", ["casual", "winter", "flannel"]],
      ["Running Sneakers", "Footwear", 2299, "Breathable mesh sneakers with cushioned sole.", ["shoes", "running", "sports", "comfort"]],
      ["Canvas Sneakers", "Footwear", 1499, "Classic low-top canvas sneakers.", ["shoes", "casual", "everyday"]],
      ["Formal Leather Shoes", "Footwear", 2999, "Genuine leather derby shoes for office wear.", ["shoes", "formal", "leather", "office"]],
      ["Ankle-Length Chinos", "Pants", 1399, "Cotton chinos with a tapered ankle-length cut.", ["chinos", "office", "casual"]],
      ["Athleisure Joggers", "Pants", 1099, "Stretch-fit joggers for gym or lounging.", ["joggers", "sports", "comfort", "gym"]],
      ["Sports Performance Tee", "T-shirts", 799, "Moisture-wicking tee for workouts.", ["gym", "sports", "moisture-wicking"]],
      ["Polo Neck T-shirt", "T-shirts", 899, "Pique cotton polo for smart-casual looks.", ["polo", "smart-casual", "cotton"]],
      ["Puffer Vest", "Jackets", 1799, "Lightweight quilted puffer vest.", ["winter", "layering", "vest"]],
      ["Wool Blend Overcoat", "Jackets", 3499, "Tailored overcoat for cold-weather formal wear.", ["winter", "formal", "wool"]],
      ["Leather Belt", "Accessories", 599, "Genuine leather belt with metal buckle.", ["accessory", "formal", "leather"]],
      ["Canvas Tote Bag", "Accessories", 449, "Durable canvas tote for daily carry.", ["bag", "accessory", "casual"]],
      ["Aviator Sunglasses", "Accessories", 799, "UV-protected metal-frame aviators.", ["accessory", "summer", "eyewear"]],
      ["Wool Beanie", "Accessories", 349, "Ribbed knit beanie for winter.", ["accessory", "winter", "headwear"]],
      ["Crew Socks (3-pack)", "Accessories", 299, "Breathable cotton crew socks, pack of three.", ["socks", "everyday", "cotton"]],
      ["Baseball Cap", "Accessories", 449, "Adjustable cotton-twill baseball cap.", ["accessory", "headwear", "casual"]],
    ],
  },
  {
    storeName: "GreenLeaf Grocers",
    slug: "greenleaf-grocers",
    ownerName: "Rohit Verma",
    email: "owner@greenleafgrocers.demo",
    password: "demoPass123",
    products: [
      ["Basmati Rice 5kg", "Grains", 599, "Aged long-grain basmati rice, aromatic and fluffy.", ["grocery", "staple", "rice"]],
      ["Whole Wheat Atta 5kg", "Grains", 349, "Stone-ground whole wheat flour.", ["grocery", "staple", "flour"]],
      ["Toor Dal 1kg", "Pulses", 189, "Premium split pigeon peas.", ["grocery", "staple", "pulses", "protein"]],
      ["Moong Dal 1kg", "Pulses", 179, "Split green gram, easy to digest.", ["grocery", "staple", "pulses", "protein"]],
      ["Cold-Pressed Groundnut Oil 1L", "Cooking Oil", 249, "Chemical-free cold-pressed groundnut oil.", ["grocery", "cooking", "oil"]],
      ["Extra Virgin Olive Oil 500ml", "Cooking Oil", 599, "Imported extra virgin olive oil.", ["grocery", "cooking", "oil", "premium"]],
      ["Garam Masala 100g", "Spices", 129, "Hand-blended aromatic spice mix.", ["grocery", "spices", "cooking"]],
      ["Turmeric Powder 200g", "Spices", 89, "Pure ground turmeric.", ["grocery", "spices", "cooking"]],
      ["Red Chilli Powder 200g", "Spices", 99, "Deep-red, medium-heat chilli powder.", ["grocery", "spices", "cooking"]],
      ["Organic Honey 500g", "Pantry", 349, "Raw, unprocessed forest honey.", ["grocery", "pantry", "organic", "sweetener"]],
      ["Mixed Nuts 250g", "Snacks", 399, "Roasted almonds, cashews and pistachios.", ["grocery", "snacks", "protein", "healthy"]],
      ["Masala Chana Chaat 200g", "Snacks", 99, "Spiced roasted chickpea snack.", ["grocery", "snacks", "spicy"]],
      ["Whole Wheat Cookies 300g", "Snacks", 129, "Lightly sweetened digestive cookies.", ["grocery", "snacks", "tea-time"]],
      ["Green Tea (25 bags)", "Beverages", 199, "Antioxidant-rich green tea bags.", ["grocery", "beverages", "healthy"]],
      ["Filter Coffee Powder 200g", "Beverages", 249, "South Indian style filter coffee blend.", ["grocery", "beverages", "coffee"]],
      ["Masala Chai Powder 250g", "Beverages", 179, "Traditional spiced tea blend.", ["grocery", "beverages", "tea"]],
      ["Fresh Paneer 200g", "Dairy", 89, "Soft, fresh cottage cheese.", ["grocery", "dairy", "protein", "fresh"]],
      ["Cow Ghee 500ml", "Dairy", 449, "Pure desi cow ghee.", ["grocery", "dairy", "cooking", "premium"]],
      ["Greek Yogurt 400g", "Dairy", 129, "Thick, protein-rich Greek-style yogurt.", ["grocery", "dairy", "healthy", "protein"]],
      ["Whole Wheat Pasta 500g", "Grains", 149, "High-fibre whole wheat pasta.", ["grocery", "staple", "pasta", "healthy"]],
      ["Rock Salt 1kg", "Spices", 69, "Natural unrefined rock salt.", ["grocery", "spices", "cooking"]],
      ["Mixed Pickle 400g", "Pantry", 159, "Traditional tangy mixed vegetable pickle.", ["grocery", "pantry", "condiment"]],
      ["Multigrain Bread", "Bakery", 69, "Freshly baked multigrain sandwich bread.", ["grocery", "bakery", "fresh", "healthy"]],
      ["Extra Virgin Coconut Oil 500ml", "Cooking Oil", 299, "Cold-pressed virgin coconut oil.", ["grocery", "cooking", "oil"]],
    ],
  },
  {
    storeName: "TechNest",
    slug: "technest",
    ownerName: "Karan Shah",
    email: "owner@technest.demo",
    password: "demoPass123",
    products: [
      ["Smart LED Bulb (Wi-Fi)", "Smart Home", 699, "App-controlled colour-changing smart bulb.", ["smart-home", "wireless", "lighting"]],
      ["Smart Plug", "Smart Home", 599, "Wi-Fi smart plug with schedule and voice control.", ["smart-home", "wireless", "automation"]],
      ["4-in-1 USB-C Hub", "Accessories", 899, "USB-C hub with HDMI, USB-A and SD card slots.", ["accessory", "laptop", "connectivity"]],
      ["65W GaN Fast Charger", "Chargers", 1299, "Compact fast charger for laptops and phones.", ["charger", "fast-charging", "travel", "compact"]],
      ["20000mAh Power Bank", "Power Banks", 1499, "High-capacity power bank with dual output.", ["power-bank", "travel", "fast-charging"]],
      ["Wireless Charging Pad", "Chargers", 799, "15W Qi wireless charging pad.", ["charger", "wireless", "compact"]],
      ["Mechanical Keyboard (Wired)", "Keyboards", 2499, "Hot-swappable mechanical keyboard, tactile switches.", ["keyboard", "gaming", "productivity"]],
      ["Wireless Silent Mouse", "Mice", 699, "Quiet-click wireless mouse with long battery life.", ["mouse", "wireless", "quiet", "productivity"]],
      ["1080p Webcam", "Webcams", 1699, "Full HD webcam with auto light correction.", ["webcam", "video-calls", "work-from-home"]],
      ["Laptop Stand (Aluminium)", "Accessories", 999, "Adjustable ergonomic aluminium laptop stand.", ["accessory", "ergonomic", "desk"]],
      ["Portable Bluetooth Speaker", "Audio", 1599, "Waterproof portable speaker with deep bass.", ["speaker", "wireless", "travel", "bass"]],
      ["True Wireless Earbuds", "Audio", 1899, "ANC-enabled true wireless earbuds.", ["earbuds", "wireless", "noise-control", "gym"]],
      ["Over-Ear Studio Headphones", "Audio", 2799, "Studio-quality over-ear headphones.", ["headphones", "wired", "premium", "music"]],
      ["1TB Portable SSD", "Storage", 4999, "USB-C portable SSD with fast transfer speeds.", ["storage", "portable", "backup"]],
      ["64GB USB Flash Drive", "Storage", 499, "High-speed USB 3.0 flash drive.", ["storage", "portable", "compact"]],
      ["Smartwatch (Fitness)", "Wearables", 2299, "Fitness smartwatch with heart-rate tracking.", ["wearable", "fitness", "smart"]],
      ["Tablet Stand", "Accessories", 449, "Adjustable foldable tablet and phone stand.", ["accessory", "desk", "compact"]],
      ["Ring Light with Tripod", "Accessories", 999, "10-inch ring light for content creation.", ["accessory", "video", "content-creation"]],
      ["HDMI Cable (2m)", "Cables", 299, "High-speed 4K-capable HDMI cable.", ["cable", "connectivity", "compact"]],
      ["USB-C to USB-C Cable (1m)", "Cables", 249, "Fast-charging braided USB-C cable.", ["cable", "fast-charging", "durable"]],
      ["Mini Wi-Fi Router (Travel)", "Networking", 1399, "Pocket-sized travel Wi-Fi router.", ["networking", "travel", "compact"]],
      ["Laptop Sleeve (14-inch)", "Accessories", 649, "Padded neoprene laptop sleeve.", ["accessory", "protection", "travel"]],
      ["Gaming Mouse Pad (XL)", "Accessories", 399, "Extra-large stitched-edge mouse pad.", ["accessory", "gaming", "desk"]],
      ["Phone Camera Lens Kit", "Accessories", 899, "Clip-on wide-angle and macro lens kit.", ["accessory", "photography", "mobile"]],
    ],
  },
  {
    storeName: "PetPals Corner",
    slug: "petpals-corner",
    ownerName: "Ananya Iyer",
    email: "owner@petpalscorner.demo",
    password: "demoPass123",
    products: [
      ["Dry Dog Food 3kg", "Dog Food", 1199, "Balanced nutrition kibble for adult dogs.", ["dog", "food", "nutrition"]],
      ["Dry Cat Food 1.5kg", "Cat Food", 699, "Grain-inclusive kibble for adult cats.", ["cat", "food", "nutrition"]],
      ["Puppy Starter Food 1kg", "Dog Food", 449, "Easy-digest kibble for puppies.", ["dog", "food", "puppy"]],
      ["Wet Cat Food (Pack of 6)", "Cat Food", 599, "Grain-free wet food pouches.", ["cat", "food", "wet-food"]],
      ["Rope Chew Toy", "Toys", 249, "Durable cotton rope toy for dogs.", ["dog", "toy", "chew"]],
      ["Feather Wand Cat Toy", "Toys", 199, "Interactive feather teaser for cats.", ["cat", "toy", "interactive"]],
      ["Squeaky Plush Toy", "Toys", 299, "Soft plush toy with built-in squeaker.", ["dog", "toy", "plush"]],
      ["Laser Pointer Toy", "Toys", 249, "LED laser toy for cat play sessions.", ["cat", "toy", "interactive"]],
      ["Adjustable Dog Collar", "Accessories", 349, "Padded adjustable collar with D-ring.", ["dog", "accessory", "collar"]],
      ["Retractable Dog Leash", "Accessories", 599, "5m retractable leash with lock button.", ["dog", "accessory", "leash", "walking"]],
      ["Cat Harness & Leash Set", "Accessories", 499, "Escape-proof harness with matching leash.", ["cat", "accessory", "harness"]],
      ["Stainless Steel Pet Bowl", "Feeding", 249, "Non-slip stainless steel feeding bowl.", ["feeding", "durable", "easy-clean"]],
      ["Automatic Pet Feeder", "Feeding", 1899, "Programmable timed feeder for cats and dogs.", ["feeding", "automatic", "smart"]],
      ["Elevated Pet Feeding Stand", "Feeding", 799, "Raised double-bowl feeding stand.", ["feeding", "ergonomic", "comfort"]],
      ["Cat Litter Box", "Hygiene", 899, "Enclosed litter box with odour control.", ["cat", "hygiene", "litter"]],
      ["Clumping Cat Litter 5kg", "Hygiene", 499, "Dust-free clumping litter, fast odour control.", ["cat", "hygiene", "litter"]],
      ["Pet Grooming Brush", "Grooming", 299, "De-shedding brush for cats and dogs.", ["grooming", "shedding", "comfort"]],
      ["Pet Shampoo (Oatmeal)", "Grooming", 349, "Gentle oatmeal shampoo for sensitive skin.", ["grooming", "hygiene", "gentle"]],
      ["Nail Clipper for Pets", "Grooming", 249, "Safety-guard nail clipper with file.", ["grooming", "safety", "compact"]],
      ["Cozy Pet Bed (Medium)", "Beds", 1299, "Soft cushioned bed for cats and small dogs.", ["bed", "comfort", "cozy"]],
      ["Foldable Travel Pet Carrier", "Travel", 999, "Breathable foldable carrier for travel.", ["travel", "carrier", "portable"]],
      ["Car Seat Cover for Pets", "Travel", 899, "Waterproof back-seat cover for car rides.", ["travel", "protection", "car"]],
      ["Dental Chew Sticks (Pack)", "Dog Food", 349, "Chew sticks that help reduce plaque.", ["dog", "dental", "treats"]],
      ["Catnip Toy Set", "Toys", 249, "Set of 3 catnip-infused play toys.", ["cat", "toy", "catnip"]],
    ],
  },
  {
    storeName: "HomeCraft Studio",
    slug: "homecraft-studio",
    ownerName: "Sanya Bhatt",
    email: "owner@homecraftstudio.demo",
    password: "demoPass123",
    products: [
      ["Handwoven Cotton Rug", "Rugs", 1799, "Soft handwoven cotton area rug.", ["decor", "rug", "handmade"]],
      ["Macrame Wall Hanging", "Wall Decor", 899, "Handcrafted boho macrame wall art.", ["decor", "wall-art", "handmade", "boho"]],
      ["Ceramic Table Vase", "Decor", 699, "Minimalist glazed ceramic vase.", ["decor", "ceramic", "minimal"]],
      ["Scented Soy Candle Set", "Decor", 599, "Set of 3 hand-poured soy candles.", ["decor", "candle", "aromatherapy"]],
      ["Rattan Storage Basket", "Storage", 749, "Handwoven rattan basket for storage.", ["storage", "handmade", "organic"]],
      ["Wooden Wall Shelf", "Storage", 1199, "Floating wooden shelf, easy mount.", ["storage", "wood", "wall-mount"]],
      ["Linen Throw Cushion Cover", "Cushions", 399, "Textured linen cushion cover, 45x45cm.", ["decor", "cushion", "linen"]],
      ["Chunky Knit Throw Blanket", "Textiles", 1499, "Cozy chunky-knit throw for sofas.", ["textile", "cozy", "winter"]],
      ["Table Runner (Cotton)", "Textiles", 449, "Handloom cotton table runner.", ["textile", "dining", "handmade"]],
      ["Brass Tealight Holders (Set)", "Decor", 549, "Set of 4 antique-finish brass holders.", ["decor", "brass", "lighting"]],
      ["Wall Clock (Wooden)", "Decor", 999, "Minimalist round wooden wall clock.", ["decor", "wood", "minimal"]],
      ["Framed Botanical Print (Set)", "Wall Decor", 799, "Set of 3 framed botanical art prints.", ["decor", "wall-art", "botanical"]],
      ["Terracotta Planter (Pair)", "Planters", 549, "Handmade terracotta planters, pair.", ["planter", "handmade", "garden"]],
      ["Hanging Macrame Planter", "Planters", 449, "Cotton macrame plant hanger.", ["planter", "handmade", "boho"]],
      ["Bamboo Bathroom Organizer", "Storage", 649, "Multi-tier bamboo bathroom shelf.", ["storage", "bamboo", "bathroom"]],
      ["Ceramic Dinner Plate Set", "Kitchenware", 1399, "Set of 4 glazed ceramic dinner plates.", ["kitchenware", "ceramic", "dining"]],
      ["Marble Coasters (Set of 4)", "Kitchenware", 599, "Polished marble drink coasters.", ["kitchenware", "marble", "dining"]],
      ["Wooden Cutting Board", "Kitchenware", 549, "Solid acacia wood cutting board.", ["kitchenware", "wood", "kitchen"]],
      ["Copper Water Bottle", "Kitchenware", 449, "Handcrafted pure copper water bottle.", ["kitchenware", "copper", "wellness"]],
      ["LED Fairy Lights (5m)", "Lighting", 349, "Warm-white battery-powered fairy lights.", ["lighting", "decor", "ambient"]],
      ["Rattan Pendant Lamp Shade", "Lighting", 1299, "Handwoven rattan ceiling lamp shade.", ["lighting", "handmade", "boho"]],
      ["Woven Door Mat", "Decor", 499, "Natural coir woven entrance mat.", ["decor", "entrance", "handmade"]],
      ["Photo Frame Set (Wood)", "Decor", 649, "Set of 5 wooden photo frames, mixed sizes.", ["decor", "wood", "memories"]],
      ["Storage Ottoman (Fabric)", "Storage", 2199, "Upholstered storage ottoman/footstool.", ["storage", "furniture", "multi-purpose"]],
    ],
  },
];

export function buildSeedStores(): SeedStore[] {
  return storeDefs.map((store) => ({
    storeName: store.storeName,
    slug: store.slug,
    ownerName: store.ownerName,
    email: store.email,
    password: store.password,
    products: store.products.map(([name, category, price, description, tags], index) => ({
      name,
      category,
      price,
      rating: Math.round((4.2 + Math.random() * 0.7) * 10) / 10,
      inventory: 8 + Math.floor(Math.random() * 35),
      description,
      tags,
      accent: accentFor(index),
      imageUrl: img(`${store.slug}-${index}`),
    })),
  }));
}