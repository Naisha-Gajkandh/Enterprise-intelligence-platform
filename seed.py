"""
Seeds the database with demo products and 90 days of synthetic transactions
so the Analytics and Assistant modules have data to work with immediately.

Run with:  python seed.py
"""
import random
from datetime import date, timedelta

from app.database import Base, engine, SessionLocal
from app import models

CATEGORIES = ["Footwear", "Outerwear", "Electronics", "Home & Kitchen", "Accessories"]

PRODUCTS = [
    {"name": "Trail Running Shoes", "category": "Footwear", "price": 89.99,
     "description": "Lightweight, waterproof trail running shoes with reinforced grip."},
    {"name": "Classic Leather Sneakers", "category": "Footwear", "price": 64.50,
     "description": "Everyday leather sneakers, breathable and durable."},
    {"name": "Waterproof Rain Jacket", "category": "Outerwear", "price": 79.00,
     "description": "Packable waterproof jacket, ideal under $100 for rainy climates."},
    {"name": "Insulated Winter Parka", "category": "Outerwear", "price": 149.99,
     "description": "Heavy insulated parka for sub-zero temperatures."},
    {"name": "Wireless Earbuds", "category": "Electronics", "price": 39.99,
     "description": "Bluetooth 5.3 earbuds with 24-hour battery case."},
    {"name": "Smart Fitness Band", "category": "Electronics", "price": 45.00,
     "description": "Heart-rate and sleep tracking fitness band."},
    {"name": "Stainless Steel Cookware Set", "category": "Home & Kitchen", "price": 120.00,
     "description": "5-piece stainless steel cookware set, dishwasher safe."},
    {"name": "Ceramic Non-stick Pan", "category": "Home & Kitchen", "price": 29.99,
     "description": "10-inch non-stick frying pan with ceramic coating."},
    {"name": "Leather Wallet", "category": "Accessories", "price": 24.99,
     "description": "Slim leather bifold wallet with RFID blocking."},
    {"name": "Canvas Tote Bag", "category": "Accessories", "price": 19.99,
     "description": "Durable canvas tote bag for everyday carry."},
]


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(models.Product).count() > 0:
            print("Database already seeded. Skipping.")
            return

        product_objs = []
        for p in PRODUCTS:
            obj = models.Product(**p)
            db.add(obj)
            product_objs.append(obj)
        db.commit()
        for obj in product_objs:
            db.refresh(obj)

        rng = random.Random(42)
        start = date.today() - timedelta(days=90)
        for i in range(90):
            current_date = start + timedelta(days=i)
            n_transactions = rng.randint(3, 12)
            for _ in range(n_transactions):
                product = rng.choice(product_objs)
                quantity = rng.randint(1, 4)
                weekday_boost = 1.15 if current_date.weekday() >= 5 else 1.0
                revenue = round(product.price * quantity * weekday_boost * rng.uniform(0.95, 1.05), 2)
                db.add(models.Transaction(
                    order_date=current_date,
                    product_id=product.id,
                    category=product.category,
                    quantity=quantity,
                    revenue=revenue,
                ))
        db.commit()
        print("Seed complete: 10 products, ~90 days of transactions.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
