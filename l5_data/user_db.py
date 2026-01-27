# l5_data/user_db.py

class UserDB:
    def __init__(self):
        # 模拟数据库存储
        self.transactions = []
        self.holdings = []

    def get_user_holdings(self, user_id):
        """
        获取用户持仓
        Mock implementation. Real implementation would query a DB.
        """
        # 模拟返回一些持仓数据
        return [
            {"ticker": "0700.HK", "cost": 300.0, "quantity": 100},
            {"ticker": "BABA", "cost": 80.0, "quantity": 50},
            {"ticker": "AAPL", "cost": 150.0, "quantity": 20}
        ]

    def get_recent_transactions(self, user_id, limit=5):
        """
        获取最近交易流水
        """
        return [
            {"date": "2023-10-01", "action": "BUY", "ticker": "0700.HK", "price": 300.0, "quantity": 100},
            {"date": "2023-09-15", "action": "BUY", "ticker": "BABA", "price": 80.0, "quantity": 50}
        ]
