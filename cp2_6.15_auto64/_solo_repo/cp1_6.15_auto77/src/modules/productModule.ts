export interface Product {
  id: string;
  name: string;
  price: number;
  style: string;
  imageUrl: string;
}

export type StyleFilter = '全部' | '复古' | '极简' | '自然' | '科技';

export const STYLE_OPTIONS: StyleFilter[] = ['全部', '复古', '极简', '自然', '科技'];

export function filterProducts(products: Product[], filter: StyleFilter): Product[] {
  if (filter === '全部') {
    return products;
  }
  return products.filter(product => product.style === filter);
}

export async function fetchProducts(): Promise<Product[]> {
  const response = await fetch('/api/products');
  if (!response.ok) {
    throw new Error('获取产品数据失败');
  }
  return response.json();
}
