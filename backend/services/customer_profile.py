import pandas as pd


def load_customers():
    return pd.read_csv("data/customers.csv")


def get_customer_profile(customer_id):

    customers = load_customers()

    customer = customers[
        customers["customer_id"] == customer_id
    ]

    if customer.empty:
        return None

    return customer.iloc[0].to_dict()


def calculate_reliability_score(customer):

    if customer is None:
        return 50

    successful = customer["successful_payments"]
    failed = customer["failed_payments"]

    total = successful + failed

    if total == 0:
        return 50

    success_rate = (successful / total) * 100

    return round(success_rate)


if __name__ == "__main__":

    customer = get_customer_profile("CUST004")

    print("Customer Profile:")
    print(customer)

    score = calculate_reliability_score(customer)

    print("\nCustomer Reliability Score:")
    print(score)