// File: src/lib/data.ts

export interface Product {
  id: number;
  name: string;
  price: string;
  desc: string;
  image: string;
}

export const navItems = [
  { name: "Shop", href: "#shop" },
  { name: "About", href: "#about" },
  { name: "History", href: "#history" },
  { name: "Philosophy", href: "#filosofi" },
];

export const products: Product[] = [
  {
    id: 1,
    name: "Citrine Flame",
    price: "390.000",
    desc: "Fresh, fruity, and woody. A dance of bergamot, apple, plum, and cedarwood.",
    image: "/products/cf.png",
  },
  {
    id: 2,
    name: "Ivory Bloom",
    price: "290.000",
    desc: "A radiant blend of lychee, rhubarb, saffron, and Turkish rose, capturing serenity.",
    image: "/products/ib.png",
  },
  {
    id: 3,
    name: "Or du Soir",
    price: "350.000",
    desc: "A sensual blend of coffee, amaretto, and vanilla bourbon. Warm, smooth, and intimate.",
    image: "/products/ods.png",
  },
  {
    id: 4,
    name: "Oud Legendaire",
    price: "270.000",
    desc: "A tropical yet mysterious symphony of passion fruit, mango, and pineapple.",
    image: "/products/ol.png",
  },
  {
    id: 5,
    name: "Midnight Cherry",
    price: "350.000",
    desc: "A bold fusion of cherry liqueur, bitter almond, and sparkling bergamot.",
    image: "/products/mc.png",
  },
];
