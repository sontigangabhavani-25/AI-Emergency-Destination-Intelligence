import pandas as pd
import recommendation as rec
print(
    "Routing function available:",
    hasattr(rec, "calculate_hospital_routes")
)

print("TEST STARTED")

print("\nHospital columns:")
print(rec.hospitals.columns.tolist())

print("\nService columns:")
print(rec.services.columns.tolist())

print("\nAvailable emergency types:")
print(list(rec.emergency_service_mapping.keys()))

print("\nTesting Chest Pain...")

matching, unknown = rec.get_hospital_recommendations("Chest_Pain")

print("\nMatching Hospitals:")
print(matching[["hosp_id", "facility"]].to_string(index=False))

print("\nHospitals needing verification:")
print(unknown)

print("\nTEST COMPLETED SUCCESSFULLY!")
print("\nTesting Dynamic Hospital Routing...")

origin_lat = 16.54588378517661
origin_lon = 81.51918504220544

hospital_routes = rec.calculate_hospital_routes(
    origin_lat,
    origin_lon
)

print("\nHospital Road Distance and ETA:")

print(
    hospital_routes[
        ["hosp_id", "facility",
         "road_distance_km", "travel_time_min"]
    ].to_string(index=False)
)


# ==========================================
# TEST DYNAMIC HOSPITAL RANKING
# ==========================================

print("\nTesting Dynamic Hospital Ranking...")

ranked_hospitals, unknown_ids = rec.dynamic_hospital_ranking(
    "Chest_Pain",
    hospital_routes
)

print("\nRanked Hospitals for Chest Pain:")

print(
    ranked_hospitals[
        ["rank", "hosp_id", "facility",
         "road_distance_km", "travel_time_min"]
    ].to_string(index=False)
)


# ==========================================
# TOP 3 RECOMMENDATIONS
# ==========================================

print("\nTop 3 Hospital Recommendations:")

top_3, unknown_ids = rec.recommend_top_hospitals(
    "Chest_Pain",
    hospital_routes
)

print(
    top_3[
        ["rank", "hosp_id", "facility",
         "road_distance_km", "travel_time_min"]
    ].to_string(index=False)
)

print("\nDYNAMIC RANKING TEST COMPLETED!")

print("\nChecking Estimated Average Speeds...")

for _, row in hospital_routes.iterrows():

    distance = row["road_distance_km"]
    duration = row["travel_time_min"]

    if pd.notna(distance) and pd.notna(duration) and duration > 0:

        speed = (distance / duration) * 60

        print(
            f"{row['facility']}: "
            f"{distance:.2f} km | "
            f"{duration:.2f} min | "
            f"{speed:.2f} km/hr"
        )



print("\n--- RAJARSHI HOSPITAL ROUTE VERIFICATION ---")

hospital = rec.hospitals[
    rec.hospitals["hosp_id"] == "BH004"
]

route = hospital_routes[
    hospital_routes["hosp_id"] == "BH004"
]

if not hospital.empty:
    print("Hospital:", hospital.iloc[0]["facility"])
    print("Latitude:", hospital.iloc[0]["lat"])
    print("Longitude:", hospital.iloc[0]["lon"])
    print("Address:", hospital.iloc[0]["address"])
    print("Verification Level:", hospital.iloc[0]["verify_level"])
    print("Verification Notes:", hospital.iloc[0]["verify_notes"])

if not route.empty:
    print("Road Distance:", route.iloc[0]["road_distance_km"], "km")
    print("Estimated Time:", route.iloc[0]["travel_time_min"], "minutes")