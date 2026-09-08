import type { Product } from "./storage";

const rows: Array<[string,number,number,number]> = [
["Protector cámara completo iPhone 13",0,14000,4],
["Protector cámara completo iPhone 14/14 Plus",0,14000,6],
["Protector cámara completo iPhone 15/15 Plus",0,14000,3],
["Protector cámara completo iPhone 12",0,14000,1],
["Protector cámara completo iPhone 11 Pro Max",0,14000,1],
["Protector cámara completo iPhone 16/16 Plus",0,14000,1]
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
