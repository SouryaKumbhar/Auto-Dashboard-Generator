def generate_insights(charts):

    insights = []

    for chart in charts:

        if chart["type"] == "line":

            insights.append({
                "title": "Trend Analysis",
                "message": "This chart shows important trend movement over time."
            })

        elif chart["type"] == "bar":

            insights.append({
                "title": "Category Comparison",
                "message": "This chart compares performance across categories."
            })

    return insights