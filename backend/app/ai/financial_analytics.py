import numpy as np
import pandas as pd
from typing import Any, Dict, List
from sklearn.linear_model import LinearRegression

class FinancialAIAnalytics:
    @staticmethod
    def analyze_financial_trends(transactions: List[Dict[str, Any]], categories: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyzes real transactions using Pandas & NumPy to discover trends,
        overspending, category growth, and generate concrete society recommendations.
        """
        if not transactions:
            return {
                "health_score": 85,
                "health_status": "Healthy",
                "summary": "No historical transactions found yet. Standard society financial baseline established.",
                "trends": [],
                "recommendations": [
                    "Ensure timely generation of monthly maintenance bills.",
                    "Track recurring common area electricity and water pump utility bills."
                ],
                "forecast_next_month": {"expense": 45000.0, "income": 65000.0, "surplus": 20000.0}
            }

        df = pd.DataFrame(transactions)
        
        # Ensure proper column types
        if "amount" not in df.columns:
            df["amount"] = 0.0
        else:
            df["amount"] = pd.to_numeric(df["amount"], errors="coerce").fillna(0.0)

        if "type" not in df.columns:
            df["type"] = "Expense"

        if "date" not in df.columns:
            df["date"] = pd.Timestamp.now().strftime("%Y-%m-%d")
        
        df["date"] = pd.to_datetime(df["date"], errors="coerce").fillna(pd.Timestamp.now())
        df["month_year"] = df["date"].dt.strftime("%Y-%m")

        expenses_df = df[df["type"].str.lower() == "expense"]
        income_df = df[df["type"].str.lower() == "income"]

        total_expense = float(expenses_df["amount"].sum())
        total_income = float(income_df["amount"].sum())
        net_surplus = total_income - total_expense

        # Group by month and category
        trends = []
        recommendations = []

        if not expenses_df.empty and "category_name" in expenses_df.columns:
            monthly_cat = expenses_df.groupby(["category_name", "month_year"])["amount"].sum().reset_index()
            categories_present = monthly_cat["category_name"].unique()

            for cat in categories_present:
                cat_data = monthly_cat[monthly_cat["category_name"] == cat].sort_values("month_year")
                amounts = cat_data["amount"].tolist()
                
                if len(amounts) >= 2:
                    pct_change = ((amounts[-1] - amounts[0]) / max(amounts[0], 1.0)) * 100.0
                    if pct_change > 15.0:
                        trend_text = f"{cat} expenses increased by approximately {pct_change:.1f}% over the tracked periods."
                        trends.append({
                            "category": cat,
                            "trend": "Increasing",
                            "percentage_change": round(pct_change, 1),
                            "message": trend_text
                        })
                        if "electric" in cat.lower() or "power" in cat.lower():
                            recommendations.append(f"{cat} costs increased by {pct_change:.1f}%. Consider reviewing common-area lighting timers and solar panel maintenance.")
                        elif "water" in cat.lower() or "plumb" in cat.lower():
                            recommendations.append(f"{cat} expenses spiked by {pct_change:.1f}%. Inspect overhead tanks and sensor pumps for undetected leakages.")
                        elif "security" in cat.lower() or "staff" in cat.lower():
                            recommendations.append(f"{cat} expenses rose by {pct_change:.1f}%. Verify guard shift logs and overtime claims.")
                        else:
                            recommendations.append(f"Review {cat} operational costs: {trend_text}")

        # Machine Learning: Linear Regression for next month forecasting
        monthly_exp = expenses_df.groupby("month_year")["amount"].sum().reset_index()
        monthly_inc = income_df.groupby("month_year")["amount"].sum().reset_index()

        forecast_expense = float(expenses_df["amount"].mean()) if not expenses_df.empty else 50000.0
        forecast_income = float(income_df["amount"].mean()) if not income_df.empty else 75000.0

        if len(monthly_exp) >= 2:
            X = np.arange(len(monthly_exp)).reshape(-1, 1)
            y = monthly_exp["amount"].values
            model = LinearRegression()
            model.fit(X, y)
            next_step = np.array([[len(monthly_exp)]])
            pred_exp = max(float(model.predict(next_step)[0]), 5000.0)
            forecast_expense = round(pred_exp, 2)

        if len(monthly_inc) >= 2:
            X_inc = np.arange(len(monthly_inc)).reshape(-1, 1)
            y_inc = monthly_inc["amount"].values
            model_inc = LinearRegression()
            model_inc.fit(X_inc, y_inc)
            next_step = np.array([[len(monthly_inc)]])
            pred_inc = max(float(model_inc.predict(next_step)[0]), 10000.0)
            forecast_income = round(pred_inc, 2)

        # Health Score Computation (0 - 100)
        # Factors: Collection ratio, expense to income ratio, surplus margin
        if total_income > 0:
            expense_ratio = min(total_expense / total_income, 1.5)
            health_score = max(0, min(100, int((1.0 - (expense_ratio * 0.5)) * 100)))
        else:
            health_score = 75

        health_status = "Excellent" if health_score >= 80 else ("Moderate" if health_score >= 60 else "Attention Required")

        if not recommendations:
            recommendations = [
                "Financial health is stable. Maintenance collections adequately cover recurring overheads.",
                "Maintain at least 3 months of operational expenditure in the Society Reserve Sinking Fund."
            ]

        return {
            "health_score": health_score,
            "health_status": health_status,
            "total_income": round(total_income, 2),
            "total_expense": round(total_expense, 2),
            "net_surplus": round(net_surplus, 2),
            "trends": trends,
            "recommendations": recommendations,
            "forecast_next_month": {
                "expense": forecast_expense,
                "income": forecast_income,
                "expected_surplus": round(forecast_income - forecast_expense, 2)
            }
        }
