
from flask import Flask, render_template, request, jsonify
import recommendation as rec

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("index.html")


@app.route("/recommend", methods=["POST"])
def recommend():

    data = request.get_json()

    origin_lat = float(data["latitude"])
    origin_lon = float(data["longitude"])
    emergency_type = data["emergency_type"]

    # Get hospital routes
    hospital_routes = rec.calculate_hospital_routes(
        origin_lat, origin_lon
    )

    # Get top 3 recommended hospitals
    top_hospitals, unknown_ids = rec.recommend_top_hospitals(
        emergency_type, hospital_routes
    )

    results = top_hospitals.to_dict(orient="records")

    return jsonify({
        "success": True,
        "hospitals": results,
        "unknown_hospitals": unknown_ids
    })


if __name__ == "__main__":
    app.run(debug=True)
