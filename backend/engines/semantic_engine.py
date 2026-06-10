BUSINESS_KEYWORDS = {

    "sales": "Revenue KPI",
    "profit": "Profitability",
    "customer": "Customer Analytics",
    "region": "Geography",
    "date": "Time Series"

}

def detect_business_context(columns):

    context = []

    for col in columns:

        for key in BUSINESS_KEYWORDS:

            if key in col.lower():
                context.append(BUSINESS_KEYWORDS[key])

    return list(set(context))