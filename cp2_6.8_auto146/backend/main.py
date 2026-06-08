from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import random
import math

app = FastAPI(title="促销模拟器 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ThresholdDiscount(BaseModel):
    threshold: float
    discount: float


class PromotionRules(BaseModel):
    promoType: str
    discountRate: float
    thresholdDiscounts: List[ThresholdDiscount]
    selectedThresholdIndex: int
    bundleProductId1: int
    bundleProductId2: int


class Product(BaseModel):
    id: int
    name: str
    icon: str
    originalPrice: float
    stock: int
    baseSales: int
    discountPrice: float
    estimatedSalesLift: float
    inventoryConsumptionRate: float
    salesBefore: float
    salesAfter: float
    isBundleEligible: bool


class SimulationResult(BaseModel):
    products: List[Product]
    totalSalesBefore: float
    totalSalesAfter: float
    conversionRateLift: float
    inventoryTurnoverDays: float
    thresholdDiscounts: Optional[List[ThresholdDiscount]] = None
    bundleInfo: Optional[dict] = None


PRODUCT_ICONS = ['📱', '💻', '📚', '👗', '👟', '🎧', '⌚', '🎮', '🍳', '🧴',
                 '🎒', '🕶️', '💄', '🧸', '🏀', '🎸', '🖱️', '⌨️', '🖼️', '🌿']
PRODUCT_NAMES = [
    '智能手机', '笔记本电脑', '畅销图书', '时尚连衣裙', '运动跑鞋',
    '蓝牙耳机', '智能手表', '游戏手柄', '不粘锅具', '护肤套装',
    '双肩背包', '太阳眼镜', '口红礼盒', '毛绒玩具', '篮球装备',
    '民谣吉他', '电竞鼠标', '机械键盘', '装饰画框', '绿植盆栽'
]

random.seed(42)
BASE_PRODUCTS = []
for i in range(20):
    BASE_PRODUCTS.append({
        'id': i,
        'name': PRODUCT_NAMES[i],
        'icon': PRODUCT_ICONS[i],
        'originalPrice': round(50 + random.random() * 950, 2),
        'stock': random.randint(50, 500),
        'baseSales': random.randint(20, 200),
    })


@app.post("/api/simulate", response_model=SimulationResult)
async def simulate(rules: PromotionRules):
    products = []

    for base in BASE_PRODUCTS:
        idx = base['id']
        original_price = base['originalPrice']
        stock = base['stock']
        base_sales = base['baseSales']

        discount_price = original_price
        sales_lift = 0.0

        if rules.promoType == 'discount':
            discount_price = round(original_price * (1 - rules.discountRate / 100), 2)
            sales_lift = rules.discountRate * 1.5

        elif rules.promoType == 'threshold':
            if 0 <= rules.selectedThresholdIndex < len(rules.thresholdDiscounts):
                td = rules.thresholdDiscounts[rules.selectedThresholdIndex]
                if original_price >= td.threshold:
                    discount_price = round(original_price - td.discount, 2)
                    sales_lift = (td.discount / original_price) * 100 * 1.2

        elif rules.promoType == 'bundle':
            if idx == rules.bundleProductId1 or idx == rules.bundleProductId2:
                sales_lift = 25.0

        sales_lift_pct = min(round(sales_lift, 1), 80.0)
        estimated_sales = round(base_sales * (1 + sales_lift_pct / 100))
        consumption_rate = round((estimated_sales / stock) * 100, 1)

        products.append(Product(
            id=idx,
            name=base['name'],
            icon=base['icon'],
            originalPrice=original_price,
            stock=stock,
            baseSales=base_sales,
            discountPrice=discount_price,
            estimatedSalesLift=sales_lift_pct,
            inventoryConsumptionRate=consumption_rate,
            salesBefore=round(original_price * base_sales, 2),
            salesAfter=round(discount_price * estimated_sales, 2),
            isBundleEligible=True,
        ))

    if rules.promoType == 'bundle':
        p1_idx = rules.bundleProductId1
        p2_idx = rules.bundleProductId2
        if 0 <= p1_idx < len(products) and 0 <= p2_idx < len(products):
            p1 = products[p1_idx]
            p2 = products[p2_idx]
            original_total = p1.originalPrice + p2.originalPrice
            bundle_price = round(original_total * 0.8, 2)
            p1.discountPrice = round(bundle_price * (p1.originalPrice / original_total), 2)
            p2.discountPrice = round(bundle_price * (p2.originalPrice / original_total), 2)
            p1.salesAfter = round(p1.discountPrice * round(p1.baseSales * 1.25), 2)
            p2.salesAfter = round(p2.discountPrice * round(p2.baseSales * 1.25), 2)

    total_sales_before = sum(p.salesBefore for p in products)
    total_sales_after = sum(p.salesAfter for p in products)
    avg_lift = sum(p.estimatedSalesLift for p in products) / len(products)
    avg_consumption = sum(p.inventoryConsumptionRate for p in products) / len(products)
    turnover_days = round(100 / max(avg_consumption, 0.1), 1)

    return SimulationResult(
        products=products,
        totalSalesBefore=round(total_sales_before, 2),
        totalSalesAfter=round(total_sales_after, 2),
        conversionRateLift=round(avg_lift, 1),
        inventoryTurnoverDays=turnover_days,
        thresholdDiscounts=rules.thresholdDiscounts,
    )


@app.get("/api/health")
async def health():
    return {"status": "ok"}
