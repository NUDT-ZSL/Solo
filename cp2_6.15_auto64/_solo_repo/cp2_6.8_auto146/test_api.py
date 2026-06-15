import requests
import json

data = {
    "promoType": "discount",
    "discountRate": 20,
    "thresholdDiscounts": [{"threshold": 100, "discount": 20}],
    "selectedThresholdIndex": 0,
    "bundleProductId1": 0,
    "bundleProductId2": 1
}

response = requests.post("http://localhost:8000/api/simulate", json=data)
print("Status:", response.status_code)
if response.status_code == 200:
    result = response.json()
    print("Products count:", len(result["products"]))
    print("Total sales after:", result["totalSalesAfter"])
    print("Conversion lift:", result["conversionRateLift"])
    print("Inventory turnover:", result["inventoryTurnoverDays"])
else:
    print("Error:", response.text)
