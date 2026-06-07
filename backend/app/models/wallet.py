from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON, func
from app.core.database import Base


SUPPORTED_CURRENCIES = {
    "NGN": {"name": "Nigerian Naira", "symbol": "₦", "flag": "🇳🇬", "country": "Nigeria", "min_fund": 100},
    "USD": {"name": "US Dollar",       "symbol": "$",  "flag": "🇺🇸", "country": "United States", "min_fund": 1},
    "GBP": {"name": "British Pound",   "symbol": "£",  "flag": "🇬🇧", "country": "United Kingdom", "min_fund": 1},
    "EUR": {"name": "Euro",            "symbol": "€",  "flag": "🇪🇺", "country": "European Union", "min_fund": 1},
    "KES": {"name": "Kenyan Shilling", "symbol": "KSh", "flag": "🇰🇪", "country": "Kenya", "min_fund": 100},
    "GHS": {"name": "Ghanaian Cedi",   "symbol": "GH₵", "flag": "🇬🇭", "country": "Ghana", "min_fund": 5},
    "ZAR": {"name": "South African Rand", "symbol": "R", "flag": "🇿🇦", "country": "South Africa", "min_fund": 10},
    "RWF": {"name": "Rwandan Franc",   "symbol": "FRw", "flag": "🇷🇼", "country": "Rwanda", "min_fund": 500},
    "UGX": {"name": "Ugandan Shilling","symbol": "USh", "flag": "🇺🇬", "country": "Uganda", "min_fund": 2000},
    "TZS": {"name": "Tanzanian Shilling","symbol": "TSh","flag": "🇹🇿", "country": "Tanzania", "min_fund": 1000},
}

DEFAULT_BALANCES = {code: 0.0 for code in SUPPORTED_CURRENCIES}


class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)
    balance = Column(Float, default=0.0)
    currency = Column(String, default="NGN")
    balances = Column(JSON, default=dict)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class WalletTransaction(Base):
    __tablename__ = "wallet_transactions"

    id = Column(Integer, primary_key=True, index=True)
    wallet_id = Column(Integer, ForeignKey("wallets.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, default="NGN")
    type = Column(String, nullable=False)
    reference = Column(String, unique=True, nullable=False)
    description = Column(String, nullable=True)
    status = Column(String, default="completed")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
