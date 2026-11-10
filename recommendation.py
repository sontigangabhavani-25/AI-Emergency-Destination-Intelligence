import pandas as pd
import requests
import time
from pathlib import Path

# Dataset folder location
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "dataset"

# Load datasets
hospitals = pd.read_csv(DATA_DIR / "hospitals_master.csv")

services = pd.read_csv(DATA_DIR / "hospital_services.csv")

print("Datasets loaded successfully!")
# Emergency type and required services mapping

emergency_service_mapping = {
    "Chest_Pain": ["Cardiology"],
    "General_Medical": ["General Medicine"],
    "Pregnancy_Complication": ["OBG", "Gynaecology", "Obstetrics"],
    "Road_Trauma": ["Orthopedics", "General Surgery"],
    "Child_Emergency": ["Pediatrics"],
    "Breathing_Difficulty": ["Pulmonology"],
    "Stroke_Suspected": ["Neurology", "Neurosurgery"]
}
def get_hospital_recommendations(emergency_type):

    required_services = emergency_service_mapping[emergency_type]

    # Match publicly listed services
    matching = services[
        (services["service_name"].isin(required_services)) &
        (services["evidence_status"] == "Publicly listed")
    ]

    matching_ids = matching["hospital_id"].unique()

    # Hospitals needing service verification
    unknown_ids = services[
        services["service_name"] == "Unknown - needs verification"
    ]["hospital_id"].unique()

    unknown_ids = [
        hid for hid in unknown_ids
        if hid not in matching_ids
    ]

    # Get hospital details
    matching_details = hospitals[
        hospitals["hosp_id"].isin(matching_ids)
    ].copy()

    return matching_details, unknown_ids

# ==========================================
# DYNAMIC HOSPITAL ROUTING FUNCTION
# ==========================================

def calculate_hospital_routes(origin_lat, origin_lon):

    hospital_routes = hospitals.copy()

    road_distances = []
    travel_times = []

    for index, row in hospital_routes.iterrows():

        destination_lat = row["lat"]
        destination_lon = row["lon"]

        url = (
            "https://router.project-osrm.org/route/v1/driving/"
            f"{origin_lon},{origin_lat};"
            f"{destination_lon},{destination_lat}"
            "?overview=false"
        )

        try:
            response = requests.get(url, timeout=20)
            response.raise_for_status()

            route_data = response.json()

            if route_data["code"] == "Ok":

                distance = route_data["routes"][0]["distance"] / 1000
                duration = route_data["routes"][0]["duration"] / 60

                road_distances.append(distance)
                travel_times.append(duration)

            else:
                road_distances.append(None)
                travel_times.append(None)

        except Exception as e:

            print("Route failed for:", row["facility"], e)

            road_distances.append(None)
            travel_times.append(None)

        time.sleep(1)

    hospital_routes["road_distance_km"] = road_distances
    hospital_routes["travel_time_min"] = travel_times

    return hospital_routes

# ==========================================
# DYNAMIC HOSPITAL RANKING
# ==========================================


def dynamic_hospital_ranking(emergency_type, hospital_routes):

    matching_details, unknown_ids = get_hospital_recommendations(
        emergency_type
    )

    matching_details = matching_details[
        [
            "hosp_id",
            "facility",
            "verify_level",
            "verify_notes",
            "source_url"
        ]
    ].merge(
        hospital_routes[
            [
                "hosp_id",
                "lat",
                "lon",
                "address",
                "area",
                "road_distance_km",
                "travel_time_min"
            ]
        ],
        on="hosp_id",
        how="left"
    )

    matching_details = matching_details.dropna(
        subset=["travel_time_min", "lat", "lon"]
    )

    ranked_hospitals = matching_details.sort_values(
        by=["travel_time_min", "road_distance_km"],
        ascending=True
    ).copy()

    ranked_hospitals["rank"] = range(
        1, len(ranked_hospitals) + 1
    )

    return ranked_hospitals, unknown_ids

# ==========================================
# TOP 3 HOSPITAL RECOMMENDATIONS
# ==========================================

def recommend_top_hospitals(emergency_type, hospital_routes):

    ranked_hospitals, unknown_ids = dynamic_hospital_ranking(
        emergency_type,
        hospital_routes
    )

    top_hospitals = ranked_hospitals.head(3)

    return top_hospitals, unknown_ids
