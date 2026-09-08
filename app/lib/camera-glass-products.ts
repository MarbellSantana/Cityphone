import type { Product } from "./storage";

const rows: Array<[string,number,number,number]> = [
["Protector cámara completo iPhone 13",0,14000,4],
["Protector cámara completo iPhone 14/14 Plus",0,14000,6],
["Protector cámara completo iPhone 15/15 Plus",0,14000,3],
["Protector cámara completo iPhone 12",0,14000,1],
["Protector cámara completo iPhone 11 Pro Max",0,14000,1],
["Protector cámara completo iPhone 16/16 Plus",0,14000,1],

["Protector cámara iPhone 11 Pro/12 Pro/11 Pro Max Rosa",0,14000,1],
["Protector cámara iPhone 11 Pro/12 Pro/11 Pro Max Plateado",0,14000,2],
["Protector cámara iPhone 12 Pro Max Brillo plateado",0,14000,1],
["Protector cámara iPhone 12 Pro Max Brillo negro",0,14000,1],
["Protector cámara iPhone 12/12 Mini/11 Negro",0,14000,4],
["Protector cámara iPhone 12/12 Mini/11 Plateado",0,14000,2],

["Protector cámara iPhone 14/14 Plus/15/15 Plus Dorado",0,14000,4],
["Protector cámara iPhone 14/14 Plus/15/15 Plus Negro",0,14000,1],
["Protector cámara iPhone 14/14 Plus/15/15 Plus Rosado",0,14000,2],
["Protector cámara iPhone 14/14 Plus/15/15 Plus Plateado",0,14000,1],
["Protector cámara iPhone 14/14 Plus/15/15 Plus Verde",0,14000,2],
["Protector cámara iPhone 14/14 Plus/15/15 Plus Azul",0,14000,1],
["Protector cámara iPhone 14/14 Plus/15/15 Plus Brillo lila",0,14000,1],
["Protector cámara iPhone 14/14 Plus/15/15 Plus Brillo plateado",0,14000,5],
["Protector cámara iPhone 14/14 Plus/15/15 Plus Brillo negro",0,14000,2],
["Protector cámara iPhone 14/14 Plus/15/15 Plus Brillo rosado",0,14000,1],

["Protector cámara iPhone 14 Pro Max Plateado",0,14000,4],
["Protector cámara iPhone 14 Pro Max Rojo",0,14000,1],
["Protector cámara iPhone 14 Pro Max Dorado",0,14000,1],
["Protector cámara iPhone 14 Pro Max Brillo plateado",0,14000,7],
["Protector cámara iPhone 14 Pro Max Brillo negro",0,14000,2],
["Protector cámara iPhone 14 Pro Max Brillo violeta",0,14000,1],
["Protector cámara iPhone 14 Pro Max Brillo dorado",0,14000,1],

["Protector cámara iPhone 15 Pro/15 Pro Max Brillo plateado",0,14000,3],
["Protector cámara iPhone 13/13 Mini Plateado",0,14000,3],
["Protector cámara iPhone 13/13 Mini Rosado",0,14000,2],
["Protector cámara iPhone 13 Pro Max Dorado",0,14000,1],
["Protector cámara iPhone 13 Pro Max Negro",0,14000,1],
["Protector cámara iPhone 13 Pro Max Grafito",0,14000,1],

["Protector cámara iPhone 16/16 Plus/17 Negro",0,14000,4],
["Protector cámara iPhone 16/16 Plus/17 Plateado",0,14000,1],
["Protector cámara iPhone 16/16 Plus/17 Azul",0,14000,1],
["Protector cámara iPhone 16/16 Plus/17 Azul brillo",0,14000,1],
["Protector cámara iPhone 17 Pro Max Negro",0,14000,1],
["Protector cámara iPhone 17 Pro Max Dorado",0,14000,1],
["Protector cámara iPhone 17 Pro Max Plateado",0,14000,1],
["Protector cámara Samsung S24 Plus Grafito",0,14000,6],
["Protector cámara Samsung S24 Ultra Grafito",0,14000,1]
];

export const CAMERA_GLASS_PRODUCTS: Product[] = rows.map(([name,cost,price,stock],index) => ({
  id:1791000000000+index,
  name,
  category:"Protectores de cámara",
  cost,
  price,
  stock,
  minStock:5
}));
