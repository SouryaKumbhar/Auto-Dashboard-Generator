def generate_layout(charts):

    layout = []

    for i, chart in enumerate(charts):

        chart_type = chart.get("type")

        if chart_type == "line":
            width = 12
            height = 6
            section = "hero"

        elif chart_type == "kpi":
            width = 3
            height = 2
            section = "summary"

        else:
            width = 6
            height = 4
            section = "analytics"

        layout.append({
            "id": i,
            "section": section,
            "width": width,
            "height": height
        })

    return layout