from fastapi import FastAPI, UploadFile, Form, File
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression, Ridge, BayesianRidge
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline import make_pipeline
import io
import fitz  # PyMuPDF
import math
import cv2
import numpy as np
import os
import requests
import shapely.geometry as sg
from shapely.ops import unary_union, polygonize
import networkx as nx

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

WALL_THICKNESS_M = 0.20  # standard external/internal average (m)
OPENING_DEDUCTION = 0.90 # 10% deduction for doors/windows

@app.post("/extract-vertices/")
async def extract_vertices(file: UploadFile):
    contents = await file.read()
    pdf_document = fitz.open(stream=contents, filetype="pdf")
    page = pdf_document.load_page(0)
    
    # 1. Render PDF page to image for computer vision analysis
    pix = page.get_pixmap(dpi=300)
    # Ensure it's a valid numpy array
    img_data = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.h, pix.w, pix.n))
    
    if pix.n == 4:
        gray = cv2.cvtColor(img_data, cv2.COLOR_RGBA2GRAY)
    else:
        gray = cv2.cvtColor(img_data, cv2.COLOR_RGB2GRAY)
        
    # 2. AI/CV Preprocessing - Thresholding to isolate dark lines
    _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
    
    # Optional: Morphological operations to connect broken lines
    kernel = np.ones((3,3), np.uint8)
    thresh = cv2.dilate(thresh, kernel, iterations=1)
    
    # 3. Find structural contours (RETR_LIST to capture both inside and outside boxes)
    contours, _ = cv2.findContours(thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    
    vertices = []
    segments = []
    
    for cnt in contours:
        # Filter small noise contours (e.g. text or dots)
        if cv2.contourArea(cnt) < (pix.w * pix.h * 0.002):
            continue
            
        # Approximate the contour to a polygon
        epsilon = 0.02 * cv2.arcLength(cnt, True)
        approx = cv2.approxPolyDP(cnt, epsilon, True)
        
        # We expect rooms/boundaries to be approximated as polygons
        if len(approx) >= 3:
            points = [pt[0] for pt in approx]
            
            # Add vertices and segments
            for i in range(len(points)):
                ptA = points[i]
                ptB = points[(i + 1) % len(points)]
                
                # Convert image coordinates back to percentages relative to width/height
                p1_pct = (round(ptA[0] / pix.w, 4), round(ptA[1] / pix.h, 4))
                p2_pct = (round(ptB[0] / pix.w, 4), round(ptB[1] / pix.h, 4))
                
                vertices.append(p1_pct)
                vertices.append(p2_pct)
                
                segments.append({
                    "p1": {"xPct": p1_pct[0], "yPct": p1_pct[1]},
                    "p2": {"xPct": p2_pct[0], "yPct": p2_pct[1]}
                })
                
    # Remove duplicate/overlapping vertices that are extremely close (within 1.5% distance)
    unique_vertices = []
    for x, y in vertices:
        is_duplicate = False
        for ux, uy in unique_vertices:
            if math.hypot(x - ux, y - uy) < 0.015:
                is_duplicate = True
                break
        if not is_duplicate:
            unique_vertices.append((x, y))
            
    # Snap segments to the unique deduplicated vertices
    snapped_segments = []
    for seg in segments:
        p1 = seg["p1"]
        p2 = seg["p2"]
        
        # Find closest unique vertex for p1 and p2
        closest_p1 = min(unique_vertices, key=lambda v: math.hypot(p1["xPct"] - v[0], p1["yPct"] - v[1]))
        closest_p2 = min(unique_vertices, key=lambda v: math.hypot(p2["xPct"] - v[0], p2["yPct"] - v[1]))
        
        # Avoid zero-length segments after snapping
        if math.hypot(closest_p1[0] - closest_p2[0], closest_p1[1] - closest_p2[1]) > 0.01:
            snapped_segments.append({
                "p1": {"xPct": closest_p1[0], "yPct": closest_p1[1]},
                "p2": {"xPct": closest_p2[0], "yPct": closest_p2[1]}
            })
            
    return {
        "vertices": [{"xPct": x, "yPct": y} for x, y in unique_vertices],
        "segments": snapped_segments
    }

def merge_collinear_lines(lines, tolerance=3.0, angle_tolerance_deg=5.0):
    merged = []
    used = [False] * len(lines)
    
    for i, line in enumerate(lines):
        if used[i]:
            continue
        c1, c2 = line.coords[0], line.coords[1]
        
        dx = c2[0] - c1[0]
        dy = c2[1] - c1[1]
        length = math.hypot(dx, dy)
        if length == 0:
            continue
        
        angle = math.atan2(dy, dx)
        current_coords = [c1, c2]
        merged_any = True
        
        while merged_any:
            merged_any = False
            for j, o_line in enumerate(lines):
                if i == j or used[j]:
                    continue
                
                oc1, oc2 = o_line.coords[0], o_line.coords[1]
                odx = oc2[0] - oc1[0]
                ody = oc2[1] - oc1[1]
                o_length = math.hypot(odx, ody)
                if o_length == 0:
                    continue
                
                o_angle = math.atan2(ody, odx)
                angle_diff = abs(angle - o_angle) % math.pi
                if angle_diff > math.pi / 2:
                    angle_diff = math.pi - angle_diff
                
                if angle_diff < math.radians(angle_tolerance_deg):
                    for pA in current_coords:
                        for pB in [oc1, oc2]:
                            if math.hypot(pA[0] - pB[0], pA[1] - pB[1]) < tolerance:
                                current_coords.extend([oc1, oc2])
                                used[j] = True
                                merged_any = True
                                break
                        if merged_any:
                            break
                            
        if len(current_coords) > 2:
            ux = dx / length
            uy = dy / length
            projected = []
            for p in current_coords:
                proj_val = p[0] * ux + p[1] * uy
                projected.append((proj_val, p))
            projected.sort(key=lambda x: x[0])
            start_p = projected[0][1]
            end_p = projected[-1][1]
            merged.append(sg.LineString([start_p, end_p]))
        else:
            merged.append(line)
        used[i] = True
        
    return merged

def classify_polygon(area, aspect_ratio, perimeter_ratio, text_inside, api_key=None):
    combined_text = " ".join(text_inside).lower()
    if any(k in combined_text for k in ["bedroom", "hall", "kitchen", "bath", "toilet", "living", "din", "room", "lobby", "balcony", "utility", "foyer"]):
        return "Room", 0.95
    if any(k in combined_text for k in ["column", "col", "c1", "c2"]):
        return "Column", 0.90
    if any(k in combined_text for k in ["wall", "w1", "w2"]):
        return "Wall Thickness", 0.85
    if any(k in combined_text for k in ["slab", "s1", "s2"]):
        return "Slab", 0.85

    
    if perimeter_ratio > 40 or aspect_ratio > 8.0:
        return "Wall Thickness", 0.80

    if area < 0.8:
        if aspect_ratio > 3.0:
            return "Wall Thickness", 0.70
        else:
            return "Column", 0.70
    elif area > 100.0:
        return "Slab", 0.75
    
    default_label = "Room"
    
    if api_key:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key={api_key}"
            headers = {"Content-Type": "application/json"}
            prompt_text = (
                f"You are an architectural assistant. Analyze the geometric data and surrounding text to classify the polygon.\n"
                f"Polygon Area: {area:.2f} sqm\n"
                f"Aspect Ratio: {aspect_ratio:.2f}\n"
                f"Detected OCR Text Inside: {text_inside}\n"
                f"Classify this polygon into one of these categories: 'Room', 'Wall Thickness', 'Slab', or 'Column'.\n"
                f"Respond ONLY in valid JSON format: {{\"label\": \"string\", \"confidence\": float}}"
            )
            payload = {
                "contents": [{
                    "parts": [{"text": prompt_text}]
                }],
                "generationConfig": {
                    "responseMimeType": "application/json"
                }
            }
            res = requests.post(url, json=payload, headers=headers, timeout=5)
            if res.status_code == 200:
                res_data = res.json()
                text_response = res_data["candidates"][0]["content"]["parts"][0]["text"]
                import json
                parsed = json.loads(text_response.strip())
                label = parsed.get("label", default_label)
                confidence = parsed.get("confidence", 0.8)
                if label in ["Room", "Wall Thickness", "Slab", "Column"]:
                    return label, confidence
        except Exception as e:
            print(f"Gemini API classification failed, using heuristics: {e}")
            
            
    return default_label, 0.60

def snap_endpoints_to_segments(lines, tolerance=3.0):
    snapped_lines = []
    for i, line in enumerate(lines):
        coords = list(line.coords)
        for c_idx in [0, -1]:
            pt = sg.Point(coords[c_idx])
            closest_dist = float('inf')
            closest_pt = None
            for j, other in enumerate(lines):
                if i == j:
                    continue
                dist = other.distance(pt)
                if dist < closest_dist and dist < tolerance:
                    closest_dist = dist
                    proj_pt = other.interpolate(other.project(pt))
                    closest_pt = (proj_pt.x, proj_pt.y)
            if closest_pt is not None:
                coords[c_idx] = closest_pt
        snapped_lines.append(sg.LineString(coords))
    return snapped_lines

def process_vector_polygons(drawings, scale_factor, page, api_key=None):
    mat = page.rotation_matrix
    raw_segments = []
    for path in drawings:
        for item in path["items"]:
            if item[0] == "l":
                ptA = item[1] * mat
                ptB = item[2] * mat
                raw_segments.append(sg.LineString([(ptA.x, ptA.y), (ptB.x, ptB.y)]))
            elif item[0] == "re":
                rect = item[1]
                p1 = fitz.Point(rect.x0, rect.y0) * mat
                p2 = fitz.Point(rect.x1, rect.y0) * mat
                p3 = fitz.Point(rect.x1, rect.y1) * mat
                p4 = fitz.Point(rect.x0, rect.y1) * mat
                raw_segments.append(sg.LineString([(p1.x, p1.y), (p2.x, p2.y)]))
                raw_segments.append(sg.LineString([(p2.x, p2.y), (p3.x, p3.y)]))
                raw_segments.append(sg.LineString([(p3.x, p3.y), (p4.x, p4.y)]))
                raw_segments.append(sg.LineString([(p4.x, p4.y), (p1.x, p1.y)]))
            elif item[0] == "qu":
                q = item[1]
                ul, ur, lr, ll = q.ul * mat, q.ur * mat, q.lr * mat, q.ll * mat
                raw_segments.append(sg.LineString([(ul.x, ul.y), (ur.x, ur.y)]))
                raw_segments.append(sg.LineString([(ur.x, ur.y), (lr.x, lr.y)]))
                raw_segments.append(sg.LineString([(lr.x, lr.y), (ll.x, ll.y)]))
                raw_segments.append(sg.LineString([(ll.x, ll.y), (ul.x, ul.y)]))

    if not raw_segments:
        return []

    # 1. Vertex Snapping
    SNAP_TOLERANCE = 3.0
    snapped_coords = {}
    all_points = []
    for line in raw_segments:
        all_points.extend(line.coords)

    unique_snapped = []
    for pt in all_points:
        matched = False
        for upt in unique_snapped:
            if math.hypot(pt[0] - upt[0], pt[1] - upt[1]) < SNAP_TOLERANCE:
                snapped_coords[pt] = upt
                matched = True
                break
        if not matched:
            unique_snapped.append(pt)
            snapped_coords[pt] = pt

    snapped_segments = []
    for line in raw_segments:
        p1 = snapped_coords[line.coords[0]]
        p2 = snapped_coords[line.coords[1]]
        if p1 != p2:
            snapped_segments.append(sg.LineString([p1, p2]))

    # 2. Collinear Merge (bypassed to prevent coordinate distortion)
    merged_segments = snapped_segments

    # 3. Deduplication
    unique_segments = []
    seen = set()
    for line in merged_segments:
        c1, c2 = line.coords[0], line.coords[1]
        canonical = tuple(sorted([c1, c2]))
        if canonical not in seen:
            seen.add(canonical)
            unique_segments.append(line)

    # 3.5 Snap endpoints to segments to close T-junctions
    snapped_to_segments = snap_endpoints_to_segments(unique_segments, tolerance=SNAP_TOLERANCE)

    # 4. Noderization
    try:
        noderized = unary_union(snapped_to_segments)
    except Exception as e:
        print(f"Unary union failed, fallback: {e}")
        noderized = sg.MultiLineString(snapped_to_segments)

    # 5. Polygonize
    polygons = list(polygonize(noderized))
    if not polygons:
        return []

    pdf_w, pdf_h = page.rect.width, page.rect.height
    blocks = []
    try:
        blocks = page.get_text("blocks")
    except Exception as e:
        print(f"Failed to get page text: {e}")

    results_polygons = []
    polygons.sort(key=lambda p: p.area, reverse=True)
    
    # Exclude the largest polygon ONLY if it acts as a background frame
    target_polygons = polygons
    if len(polygons) > 1:
        total_env = noderized.envelope
        largest = polygons[0]
        second = polygons[1]
        
        # If the largest polygon takes up >90% of the entire drawing's bounding box,
        # AND there is a significant second polygon inside, it's likely a background face.
        if largest.area > 0.90 * total_env.area and second.area > 0.05 * total_env.area:
            target_polygons = polygons[1:]

    # Pre-calculate poly_outer and real_area for all target_polygons to detect footprint slabs
    poly_outers = []
    for p in target_polygons:
        p_outer = sg.Polygon(p.exterior) if p.exterior else p
        if not p_outer.is_valid:
            p_outer = p_outer.buffer(0)
        poly_outers.append(p_outer)
        
    containing_polygons_indices = set()
    contained_sets = {}
    
    for i, poly in enumerate(target_polygons):
        poly_real_area = poly.area * (scale_factor ** 2)
        if poly_real_area < 0.8:
            continue
            
        contained_sets[i] = set()
        poly_outer = poly_outers[i]
        
        for j, other in enumerate(target_polygons):
            if j != i:
                other_real_area = other.area * (scale_factor ** 2)
                if other_real_area >= 0.8:
                    if poly_outer.contains(other):
                        contained_sets[i].add(j)
                        
        if len(contained_sets[i]) >= 1:
            containing_polygons_indices.add(i)
            
    # Filter containing polygons to get the building footprints (containing polys that don't contain other containing polys)
    footprint_indices = set()
    for i in containing_polygons_indices:
        contains_other_containing = False
        for j in containing_polygons_indices:
            if j != i and j in contained_sets[i]:
                contains_other_containing = True
                break
        if not contains_other_containing:
            footprint_indices.add(i)

    for idx, poly in enumerate(target_polygons):
        real_area = poly.area * (scale_factor ** 2)
        if real_area < 0.1:
            continue
            
        real_perimeter = poly.length * scale_factor
        centroid = poly.centroid
        
        minx, miny, maxx, maxy = poly.bounds
        w = (maxx - minx) * scale_factor
        h = (maxy - miny) * scale_factor
        aspect_ratio = round(max(w, h) / min(w, h), 2) if min(w, h) > 0 else 1.0

        # Calculate oriented dimensions from raw points first, then snap dimensions to 0.1m grid
        # to avoid cumulative rounding errors of individual vertex coords.
        w_pts, h_pts = get_oriented_dimensions(poly)
        w = round((w_pts * scale_factor) * 10) / 10.0
        h = round((h_pts * scale_factor) * 10) / 10.0

        # Convert poly exterior to meter space and snap to global 0.1m (10cm) architectural grid for boundaries
        meter_coords = []
        for x, y in poly.exterior.coords:
            xm = round((x * scale_factor) * 10) / 10.0
            ym = round((y * scale_factor) * 10) / 10.0
            meter_coords.append((xm, ym))
            
        snapped_poly_m = sg.Polygon(meter_coords)
        if not snapped_poly_m.is_valid:
            snapped_poly_m = snapped_poly_m.buffer(0)
            
        snapped_area = w * h
        snapped_perimeter = (w + h) * 2
        
        perimeter_ratio = (snapped_perimeter ** 2) / snapped_area if snapped_area > 0 else 0
        text_inside = []
        
        if idx in footprint_indices:
            label = "Slab"
            confidence = 0.95
        else:
            label, confidence = classify_polygon(snapped_area, aspect_ratio, perimeter_ratio, text_inside, api_key)

        coords_pct = []
        for x, y in poly.exterior.coords:
            coords_pct.append({
                "xPct": round((x - page.rect.x0) / pdf_w, 4),
                "yPct": round((y - page.rect.y0) / pdf_h, 4)
            })

        results_polygons.append({
            "id": f"poly_{idx}",
            "vertices": coords_pct,
            "area_sqm": round(snapped_area, 2),
            "perimeter_m": round(snapped_perimeter, 2),
            "width_m": round(w, 2),
            "height_m": round(h, 2),
            "centroid": {
                "xPct": round((centroid.x - page.rect.x0) / pdf_w, 4),
                "yPct": round((centroid.y - page.rect.y0) / pdf_h, 4)
            },
            "aspect_ratio": aspect_ratio,
            "label": label,
            "confidence": confidence,
            "text_inside": text_inside
        })

    return noderized.length, results_polygons


def estimate_wall_thickness(valid_contours, scale_factor, px_to_pt):
    if len(valid_contours) < 2:
        return 0.20
        
    outer_cnt = valid_contours[0][1]
    distances = []
    
    # Sample points from the inner room contours and find distance to the outer contour
    for area, cnt in valid_contours[1:]:
        # Sample points along the contour
        for pt in cnt[::5]:
            x, y = pt[0]
            dist = cv2.pointPolygonTest(outer_cnt, (float(x), float(y)), True)
            distances.append(abs(dist))
            
    if not distances:
        return 0.20
        
    pixel_thickness = np.percentile(distances, 10)
    thickness_m = pixel_thickness * px_to_pt * scale_factor
    
    if 0.08 <= thickness_m <= 0.45:
        return round(thickness_m, 2)
    return 0.20

def get_oriented_dimensions(poly):
    coords = list(poly.exterior.coords)
    if len(coords) < 4:
        minx, miny, maxx, maxy = poly.bounds
        return max(0.01, maxx - minx), max(0.01, maxy - miny)
        
    edges = []
    for i in range(len(coords) - 1):
        p1 = coords[i]
        p2 = coords[i+1]
        dx = p2[0] - p1[0]
        dy = p2[1] - p1[1]
        length = math.hypot(dx, dy)
        if length > 0.05:
            angle = math.degrees(math.atan2(dy, dx)) % 180.0
            edges.append((length, angle))
            
    if not edges:
        minx, miny, maxx, maxy = poly.bounds
        return max(0.01, maxx - minx), max(0.01, maxy - miny)
        
    edges.sort(key=lambda x: x[0], reverse=True)
    dominant_angle = edges[0][1]
    
    horiz_lengths = []
    vert_lengths = []
    
    for length, angle in edges:
        diff = abs(angle - dominant_angle)
        if diff > 90:
            diff = 180 - diff
            
        if diff < 30.0:
            horiz_lengths.append(length)
        elif abs(diff - 90.0) < 30.0:
            vert_lengths.append(length)
            
    if horiz_lengths:
        horiz_lengths.sort(reverse=True)
        w = sum(horiz_lengths[:2]) / min(len(horiz_lengths), 2)
    else:
        w = edges[0][0]
        
    if vert_lengths:
        vert_lengths.sort(reverse=True)
        h = sum(vert_lengths[:2]) / min(len(vert_lengths), 2)
    else:
        other_edges = [l for l, a in edges if abs(a - dominant_angle) > 30.0]
        if other_edges:
            h = max(other_edges)
        else:
            h = w
            
    return max(0.01, w), max(0.01, h)

def autoscale_pdf_via_dimensions(page, drawings):
    try:
        words = page.get_text("words")
    except Exception:
        return None
        
    import re
    dim_pattern = re.compile(r"^\d+(\.\d+)?$")
    
    dimensions = []
    for w in words:
        text = w[4].strip()
        text = text.replace("m", "")
        if dim_pattern.match(text):
            val = float(text)
            # Avoid matching small integers (like 1, 2, 3) which are commonly room or sheet numbers
            if val.is_integer() and val < 5.0:
                continue
            if 0.5 <= val <= 50.0:
                rect = fitz.Rect(w[0], w[1], w[2], w[3])
                dimensions.append((val, rect))
                
    if not dimensions:
        return None
        
    lines = []
    mat = page.rotation_matrix
    for path in drawings:
        for item in path["items"]:
            if item[0] == "l":
                ptA = item[1] * mat
                ptB = item[2] * mat
                dx = abs(ptB.x - ptA.x)
                dy = abs(ptB.y - ptA.y)
                length = math.hypot(dx, dy)
                if length > 5:
                    lines.append((ptA, ptB, length, dx, dy))
            elif item[0] == "re":
                rect = item[1]
                p1 = fitz.Point(rect.x0, rect.y0) * mat
                p2 = fitz.Point(rect.x1, rect.y0) * mat
                p3 = fitz.Point(rect.x1, rect.y1) * mat
                p4 = fitz.Point(rect.x0, rect.y1) * mat
                lines.append((p1, p2, abs(p2.x - p1.x), abs(p2.x - p1.x), 0))
                lines.append((p2, p3, abs(p3.y - p2.y), 0, abs(p3.y - p2.y)))
                lines.append((p3, p4, abs(p4.x - p3.x), abs(p4.x - p3.x), 0))
                lines.append((p4, p1, abs(p1.y - p4.y), 0, abs(p1.y - p4.y)))

    scale_candidates = []
    for val, rect in dimensions:
        cx, cy = (rect.x0 + rect.x1)/2, (rect.y0 + rect.y1)/2
        for ptA, ptB, length, dx, dy in lines:
            if dx > dy * 5: # horizontal
                dist_y = abs(cy - ptA.y)
                if min(ptA.x, ptB.x) - 15 <= cx <= max(ptA.x, ptB.x) + 15:
                    if dist_y < 25:
                        scale_candidates.append(val / length)
            elif dy > dx * 5: # vertical
                dist_x = abs(cx - ptA.x)
                if min(ptA.y, ptB.y) - 15 <= cy <= max(ptA.y, ptB.y) + 15:
                    if dist_x < 25:
                        scale_candidates.append(val / length)
                        
    if not scale_candidates:
        return None
        
    # 1D Density Clustering to find the most consistent uniform scale factor
    # (Filters out random text-to-line match outliers)
    best_scale_avg = None
    max_cluster_size = 0
    for c in scale_candidates:
        cluster = [x for x in scale_candidates if abs(x - c) < 0.015 * c]  # 1.5% tolerance
        if len(cluster) > max_cluster_size:
            max_cluster_size = len(cluster)
            best_scale_avg = sum(cluster) / len(cluster)
            
    return best_scale_avg

@app.post("/calculate-vector-quantities/")
async def calculate_vector_quantities(
    file: UploadFile,
    ceiling_height: float = Form(...),
    reference_length_m: float = Form(...),
    p1_x_pct: float = Form(...),
    p1_y_pct: float = Form(...),
    p2_x_pct: float = Form(...),
    p2_y_pct: float = Form(...),
    wall_thickness: float = Form(0.20),
    waste_factor: float = Form(0.05)
):
    contents = await file.read()
    
    pdf_document = fitz.open(stream=contents, filetype="pdf")
    page = pdf_document.load_page(0) 
    
    pdf_x0, pdf_y0 = page.rect.x0, page.rect.y0
    pdf_w, pdf_h = page.rect.width, page.rect.height
    
    p1_x, p1_y = pdf_x0 + p1_x_pct * pdf_w, pdf_y0 + p1_y_pct * pdf_h
    p2_x, p2_y = pdf_x0 + p2_x_pct * pdf_w, pdf_y0 + p2_y_pct * pdf_h
    
    ref_distance_pts = math.hypot(p2_x - p1_x, p2_y - p1_y)
    
    drawings = page.get_drawings()
    
    auto_scale = autoscale_pdf_via_dimensions(page, drawings)
    manual_scale = reference_length_m / ref_distance_pts if ref_distance_pts > 0 else 0
    
    if auto_scale and manual_scale > 0:
        # If manual scale is within 15% of the auto-detected scale, snap to auto_scale
        if 0.85 * auto_scale <= manual_scale <= 1.15 * auto_scale:
            scale_factor = auto_scale
        else:
            scale_factor = manual_scale
    else:
        scale_factor = manual_scale
    
    api_key = "AQ.Ab8RN6I0RQJQVCko0cH_v-5iFeZ8CapTbnx4RqlvGv2b0T_Wqw"
    
    noderized_length, detected_polygons = process_vector_polygons(drawings, scale_factor, page, api_key=api_key)

    total_flooring_area_m2 = sum(p["area_sqm"] for p in detected_polygons if p["label"] == "Room")
    total_flooring_perimeter_m = sum(p["perimeter_m"] for p in detected_polygons if p["label"] == "Room")

    detected_thickness = wall_thickness
    if wall_thickness <= 0.0:
        detected_thickness = 0.20

    # Filter detected rooms vs outer slabs
    rooms = [p for p in detected_polygons if p["label"] == "Room"]
    slabs = [p for p in detected_polygons if p["label"] == "Slab"]
    
    total_flooring_area_m2 = sum(p["area_sqm"] for p in rooms)
    total_flooring_perimeter_m = sum(p["perimeter_m"] for p in rooms)

    # Dynamically compute centerline wall length using the Area-Difference method if an outer slab is detected
    if slabs and rooms and detected_thickness > 0:
        outer_slab = max(slabs, key=lambda s: s["area_sqm"])
        
        # Filter rooms by geometric containment inside the outer slab
        from shapely.geometry import Polygon as SPolygon, Point as SPoint
        outer_coords = [(v["xPct"], v["yPct"]) for v in outer_slab["vertices"]]
        outer_poly_pct = SPolygon(outer_coords)
        if not outer_poly_pct.is_valid:
            outer_poly_pct = outer_poly_pct.buffer(0)
            
        contained_rooms = []
        for r in rooms:
            rc = SPoint(r["centroid"]["xPct"], r["centroid"]["yPct"])
            if outer_poly_pct.contains(rc):
                contained_rooms.append(r)
                
        total_room_area = sum(r["area_sqm"] for r in contained_rooms)
        wall_area = outer_slab["area_sqm"] - total_room_area
        wall_length_m = wall_area / detected_thickness
    else:
        # Fallback to centerline vector length (sum of drawing lines / 2)
        wall_length_m = (noderized_length * scale_factor) / 2.0
    
    openings_area = 0.0 
    gross_volume = wall_length_m * detected_thickness * ceiling_height
    openings_volume = openings_area * detected_thickness
    net_volume = gross_volume - openings_volume
    total_volume_with_waste = net_volume * (1 + waste_factor)
    
    # Block Count (assuming standard 400x200x200 block with 10mm mortar)
    block_face_area = (0.40 + 0.01) * (0.20 + 0.01)
    total_wall_area = (wall_length_m * ceiling_height) - openings_area
    block_count = int(total_wall_area / block_face_area)
    
    treatment_area_sqm = total_wall_area  # Plastering/Painting

    return {
        "scale_factor": scale_factor,
        "total_wall_length_m": round(wall_length_m, 2),
        "total_brickwork_cum": round(wall_length_m * detected_thickness * ceiling_height, 3),
        "block_work_cum": round(total_volume_with_waste, 3),
        "block_count": block_count,
        "net_volume_cum": round(net_volume, 3),
        "plastering_sqm": round(treatment_area_sqm, 2),
        "painting_sqm": round(treatment_area_sqm, 2),
        "wall_thickness_m": round(detected_thickness, 2),
        "flooring_area_sqm": round(total_flooring_area_m2, 2),
        "flooring_perimeter_m": round(total_flooring_perimeter_m, 2),
        "polygons": detected_polygons
    }


@app.post("/calculate-model-quantities/")
async def calculate_model_quantities(
    file: UploadFile,
    ceiling_height: float = Form(...),
    reference_length_m: float = Form(...),
    p1_x_pct: float = Form(...),
    p1_y_pct: float = Form(...),
    p2_x_pct: float = Form(...),
    p2_y_pct: float = Form(...),
    wall_thickness: float = Form(0.20),
    waste_factor: float = Form(0.05)
):
    contents = await file.read()
    
    # 1. Coordinate Mapping (Percentages to PDF Points) & scale factor
    pdf_document = fitz.open(stream=contents, filetype="pdf")
    page = pdf_document.load_page(0) 
    
    pdf_x0, pdf_y0 = page.rect.x0, page.rect.y0
    pdf_w, pdf_h = page.rect.width, page.rect.height
    
    p1_x = pdf_x0 + p1_x_pct * pdf_w
    p1_y = pdf_y0 + p1_y_pct * pdf_h
    p2_x = pdf_x0 + p2_x_pct * pdf_w
    p2_y = pdf_y0 + p2_y_pct * pdf_h
    
    ref_distance_pts = math.hypot(p2_x - p1_x, p2_y - p1_y)
    
    drawings = page.get_drawings()
    auto_scale = autoscale_pdf_via_dimensions(page, drawings)
    manual_scale = reference_length_m / ref_distance_pts if ref_distance_pts > 0 else 0
    
    if auto_scale and manual_scale > 0:
        if 0.85 * auto_scale <= manual_scale <= 1.15 * auto_scale:
            scale_factor = auto_scale
        else:
            scale_factor = manual_scale
    else:
        scale_factor = manual_scale
    total_length_pts = 0
    
    for path in drawings:
        for item in path["items"]:
            if item[0] == "l":
                ptA, ptB = item[1], item[2]
                length = math.hypot(ptB.x - ptA.x, ptB.y - ptA.y)
                total_length_pts += length
            elif item[0] == "re":
                rect = item[1]
                perimeter = (rect.width + rect.height) * 2
                total_length_pts += perimeter

    # Apply Scale and Calculate Wall Quantities
    structural_length_pts = total_length_pts / 2
    wall_length_m = structural_length_pts * scale_factor
    
    # 3. Dynamic Flooring Area, Perimeter, and Wall Thickness calculation via CV Contours
    pix = page.get_pixmap(dpi=300)
    img_data = np.frombuffer(pix.samples, dtype=np.uint8).reshape((pix.h, pix.w, pix.n))
    
    if pix.n == 4:
        gray = cv2.cvtColor(img_data, cv2.COLOR_RGBA2GRAY)
        img_rgb = cv2.cvtColor(img_data, cv2.COLOR_RGBA2RGB)
    else:
        gray = cv2.cvtColor(img_data, cv2.COLOR_RGB2GRAY)
        img_rgb = cv2.cvtColor(img_data, cv2.COLOR_RGB2BGR)
        
    _, thresh = cv2.threshold(gray, 240, 255, cv2.THRESH_BINARY_INV)
    kernel = np.ones((3,3), np.uint8)
    thresh = cv2.dilate(thresh, kernel, iterations=1)
    
    contours, _ = cv2.findContours(thresh, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    
    detected_thickness = wall_thickness
    if wall_thickness <= 0.0:
        detected_thickness = 0.20

    drawings = page.get_drawings()
    api_key = "AQ.Ab8RN6I0RQJQVCko0cH_v-5iFeZ8CapTbnx4RqlvGv2b0T_Wqw"
    
    noderized_length, detected_polygons = process_vector_polygons(drawings, scale_factor, page, api_key=api_key)

    # Filter detected rooms vs outer slabs
    rooms = [p for p in detected_polygons if p["label"] == "Room"]
    slabs = [p for p in detected_polygons if p["label"] == "Slab"]
    
    total_flooring_area_m2 = sum(p["area_sqm"] for p in rooms)
    total_flooring_perimeter_m = sum(p["perimeter_m"] for p in rooms)

    # Dynamically compute centerline wall length using the Area-Difference method if an outer slab is detected
    if slabs and rooms and detected_thickness > 0:
        outer_slab = max(slabs, key=lambda s: s["area_sqm"])
        
        # Filter rooms by geometric containment inside the outer slab
        from shapely.geometry import Polygon as SPolygon, Point as SPoint
        outer_coords = [(v["xPct"], v["yPct"]) for v in outer_slab["vertices"]]
        outer_poly_pct = SPolygon(outer_coords)
        if not outer_poly_pct.is_valid:
            outer_poly_pct = outer_poly_pct.buffer(0)
            
        contained_rooms = []
        for r in rooms:
            rc = SPoint(r["centroid"]["xPct"], r["centroid"]["yPct"])
            if outer_poly_pct.contains(rc):
                contained_rooms.append(r)
                
        total_room_area = sum(r["area_sqm"] for r in contained_rooms)
        wall_area = outer_slab["area_sqm"] - total_room_area
        wall_length_m = wall_area / detected_thickness
    else:
        # Fallback to centerline vector length (sum of drawing lines / 2)
        wall_length_m = (noderized_length * scale_factor) / 2.0

    # Deductions and final metrics
    openings_area = 0.0 # Phase 5: Area of doors and windows
    gross_volume = wall_length_m * detected_thickness * ceiling_height
    openings_volume = openings_area * detected_thickness
    net_volume = gross_volume - openings_volume
    total_volume_with_waste = net_volume * (1 + waste_factor)
    
    # Block Count (assuming standard 400x200x200 block with 10mm mortar)
    block_face_area = (0.40 + 0.01) * (0.20 + 0.01)
    total_wall_area = (wall_length_m * ceiling_height) - openings_area
    block_count = int(total_wall_area / block_face_area)
    
    treatment_area_sqm = total_wall_area  # Plastering/Painting
    
    # 4. Deep Learning Object Detection and Segmentation
    detected_objects = []
    counts = {}
    
    try:
        from ultralytics import YOLO
        # Load pre-trained nano segmentation model
        model = YOLO("yolov8n-seg.pt")
        img_h, img_w, _ = img_rgb.shape
        
        # Perform prediction
        results_yolo = model(img_rgb)
        for r in results_yolo:
            boxes = r.boxes
            masks = r.masks
            for i, box in enumerate(boxes):
                cls_id = int(box.cls[0])
                label = model.names[cls_id]
                conf = float(box.conf[0])
                
                # Filter down to common items present on floor plans
                floorplan_labels = ["chair", "bed", "dining table", "couch", "tv", "toilet", "sink", "refrigerator", "microwave", "oven"]
                if label not in floorplan_labels or conf < 0.25:
                    continue
                
                # Bounding box in normalized percentage coordinates
                xyxy = box.xyxy[0].tolist()
                box_pct = [
                    xyxy[0] / img_w,
                    xyxy[1] / img_h,
                    xyxy[2] / img_w,
                    xyxy[3] / img_h
                ]
                
                polygon_pct = []
                if masks is not None and masks.xy is not None and len(masks.xy) > i:
                    poly_points = masks.xy[i]
                    polygon_pct = [[float(pt[0] / img_w), float(pt[1] / img_h)] for pt in poly_points]
                
                detected_objects.append({
                    "label": label.capitalize(),
                    "confidence": round(conf, 2),
                    "box": box_pct,
                    "polygon": polygon_pct
                })
                
                counts[label] = counts.get(label, 0) + 1
    except Exception as e:
        print(f"Deep learning inference bypassed or failed: {e}")

    object_summaries = []
    for lbl, cnt in counts.items():
        object_summaries.append(f"{cnt}x {lbl.capitalize()}")

    return {
        "scale_factor": scale_factor,
        "total_wall_length_m": round(wall_length_m, 2),
        "total_brickwork_cum": round(wall_length_m * detected_thickness * ceiling_height, 3),
        "block_work_cum": round(total_volume_with_waste, 3),
        "block_count": block_count,
        "net_volume_cum": round(net_volume, 3),
        "plastering_sqm": round(treatment_area_sqm, 2),
        "painting_sqm": round(treatment_area_sqm, 2),
        "wall_thickness_m": round(detected_thickness, 2),
        "flooring_area_sqm": round(total_flooring_area_m2, 2),
        "flooring_perimeter_m": round(total_flooring_perimeter_m, 2),
        "detected_objects": detected_objects,
        "detected_objects": detected_objects,
        "object_counts": counts
    }

import os

@app.get("/api/ml/export-training-data")
async def export_training_data():
    history_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "core", "market_training_data.csv")
    if not os.path.exists(history_file):
        return {"error": "Training data not found."}
    return FileResponse(path=history_file, filename="market_training_data.csv", media_type="text/csv")

@app.post("/api/ml/train-predict")
async def train_predict_ml(
    file: UploadFile = File(...), 
    months_to_predict: int = Form(1),
    past_year: int = Form(2026),
    quarter: str = Form("Jan to Apr"),
    region: str = Form("Default")
):
    try:
        contents = await file.read()
        
        # Read without headers first to find the correct header row
        df_raw = pd.read_excel(io.BytesIO(contents), header=None)
        
        header_row = -1
        for i, row in df_raw.iterrows():
            row_vals = [str(x).strip() for x in row.values]
            if 'Description' in row_vals and 'Lmr Rate (₹)' in row_vals:
                header_row = i
                break
                
        if header_row != -1:
            df_raw.columns = df_raw.iloc[header_row]
            df = df_raw.iloc[header_row + 1:].reset_index(drop=True)
            df.columns = df.columns.astype(str).str.strip()
        else:
            # Fallback if we couldn't find the exact header, just in case
            df = pd.read_excel(io.BytesIO(contents))
            df.columns = df.columns.str.strip()
        
        if 'Description' not in df.columns or 'Lmr Rate (₹)' not in df.columns:
            return {"error": f"Excel file must contain 'Description' and 'Lmr Rate (₹)'. Found: {list(df.columns)}"}
            
        # Map quarter to a list of months for the model
        if quarter == "JANMAR":
            months = [1, 2, 3]
        elif quarter == "APRJUN":
            months = [4, 5, 6]
        elif quarter == "JULSEP":
            months = [7, 8, 9]
        elif quarter == "OCTDEC":
            months = [10, 11, 12]
        else:
            months = [1, 2, 3]
            
        # Standardize the incoming data for all 3 months of the quarter
        dfs = []
        for m in months:
            m_df = pd.DataFrame({
                'Year': past_year,
                'Month': m,
                'Region': region,
                'Resource': df['Description'],
                'Rate': pd.to_numeric(df['Lmr Rate (₹)'], errors='coerce')
            })
            dfs.append(m_df)
            
        new_data = pd.concat(dfs, ignore_index=True)
        
        # Drop invalid rows
        new_data = new_data.dropna(subset=['Resource', 'Rate'])
        
        # Clean up resource names to prevent duplicates from whitespaces
        new_data['Resource'] = new_data['Resource'].str.strip()
        
        # Cumulative training: append to a persistent CSV
        history_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "core", "market_training_data.csv")
        if os.path.exists(history_file) and os.path.getsize(history_file) > 0:
            history_df = pd.read_csv(history_file)
            if 'Region' not in history_df.columns:
                history_df['Region'] = region
            history_df['Rate'] = pd.to_numeric(history_df['Rate'], errors='coerce')
            
            # Clean historical resource names to fix existing whitespace duplicates
            history_df['Resource'] = history_df['Resource'].str.strip()
            
            # Check for duplicates: if any of the new rows already exist in history with the same (Year, Month, Region)
            duplicate_check = history_df[
                (history_df['Year'] == past_year) & 
                (history_df['Region'].str.lower() == region.lower()) & 
                (history_df['Month'].isin(months))
            ]
            if not duplicate_check.empty:
                return {"error": f"Training data for {region} ({quarter} {past_year}) already exists in the database. Duplicate uploads are not allowed."}

            history_df = pd.concat([history_df, new_data])
            # Keep only the latest entry if the same quarter/year/region is uploaded twice
            history_df = history_df.drop_duplicates(subset=['Year', 'Month', 'Region', 'Resource'], keep='last')
        else:
            history_df = new_data
            
        # Save back to disk
        history_df.to_csv(history_file, index=False)
        
        predictions = {}
        
        # Only predict for the uploaded region to save processing time
        predict_df = history_df[history_df['Region'] == region] if 'Region' in history_df.columns else history_df
        
        # Train and Predict for each resource using fast groupby
        for resource, resource_df in predict_df.groupby('Resource'):
            
            # Find the last date in the history for this resource
            last_year = resource_df['Year'].max()
            last_month = resource_df[resource_df['Year'] == last_year]['Month'].max()
            last_date = pd.to_datetime(f"{int(last_year)}-{int(last_month):02d}-01")
            
            future_dates = pd.date_range(start=last_date + pd.DateOffset(months=1), periods=months_to_predict, freq='ME')
            
            if len(resource_df) < 2:
                # Not enough data for ML, just forward-fill the last known rate
                last_rate = resource_df['Rate'].iloc[-1]
                pred_rates = [last_rate] * months_to_predict
            else:
                # Train LinearRegression for faster market trend extrapolation
                X = pd.DataFrame({'Time_Index': resource_df['Year'] + (resource_df['Month'] - 1) / 12})
                y = resource_df['Rate']
                
                model = LinearRegression()
                model.fit(X, y)
                
                future_X = pd.DataFrame({
                    'Time_Index': future_dates.year + (future_dates.month - 1) / 12
                })
                
                pred_rates = model.predict(future_X)
            
            predictions[resource] = [
                {"date": future_dates[i].strftime("%Y-%m-%d"), "predicted_rate": round(float(pred_rates[i]), 2)}
                for i in range(months_to_predict)
            ]
            
        return {"success": True, "predictions": predictions, "message": f"Successfully trained on data for {past_year} {quarter}!"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

_cache_mtime = 0
_cached_history_df = None
_predictions_cache = {}
_future_predictions_cache = {}

def get_history_df():
    global _cached_history_df, _cache_mtime, _predictions_cache, _future_predictions_cache
    history_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "core", "market_training_data.csv")
    if not os.path.exists(history_file) or os.path.getsize(history_file) == 0:
        return pd.DataFrame()
        
    current_mtime = os.path.getmtime(history_file)
    if _cached_history_df is None or current_mtime != _cache_mtime:
        _cached_history_df = pd.read_csv(history_file)
        if 'Region' not in _cached_history_df.columns:
            _cached_history_df['Region'] = "Default"
        _cache_mtime = current_mtime
        _predictions_cache.clear()
        _future_predictions_cache.clear()
        
    return _cached_history_df

@app.get("/api/ml/predictions")
async def get_latest_predictions(region: str = None):
    try:
        global _predictions_cache
        if region in _predictions_cache:
            return {"success": True, "predictions": _predictions_cache[region]}
            
        history_df = get_history_df()
        if history_df.empty:
            return {"success": True, "predictions": {}}
            
        if region:
            history_df = history_df[history_df['Region'] == region]
            
        predictions = {}
        
        for resource, resource_df in history_df.groupby('Resource'):
            
            last_year = resource_df['Year'].max()
            last_month = resource_df[resource_df['Year'] == last_year]['Month'].max()
            last_date = pd.to_datetime(f"{int(last_year)}-{int(last_month):02d}-01")
            
            future_dates = pd.date_range(start=last_date + pd.DateOffset(months=1), periods=1, freq='ME')
            
            if len(resource_df) < 2:
                pred_rates = [resource_df['Rate'].iloc[-1]]
            else:
                X = pd.DataFrame({'Time_Index': resource_df['Year'] + (resource_df['Month'] - 1) / 12})
                y = resource_df['Rate']
                model = BayesianRidge()
                model.fit(X, y)
                future_X = pd.DataFrame({'Time_Index': future_dates.year + (future_dates.month - 1) / 12})
                pred_rates = model.predict(future_X)
                
            predictions[str(resource).strip()] = round(float(pred_rates[0]), 2)
            
        _predictions_cache[region] = predictions
        return {"success": True, "predictions": predictions}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

from pydantic import BaseModel
from typing import List, Optional

class FuturePredictionsRequest(BaseModel):
    region: str
    target_start_year: int
    target_start_month: int
    target_end_year: int
    target_end_month: int
    resources: Optional[List[str]] = None

@app.post("/api/ml/future-predictions")
async def get_future_predictions(request: FuturePredictionsRequest):
    try:
        region = request.region
        target_start_year = request.target_start_year
        target_start_month = request.target_start_month
        target_end_year = request.target_end_year
        target_end_month = request.target_end_month
        
        global _future_predictions_cache
        cache_key = f"{region}_{target_start_year}_{target_start_month}_{target_end_year}_{target_end_month}"
        if request.resources:
            cache_key += "_" + str(hash("".join(sorted(request.resources))))
            
        if cache_key in _future_predictions_cache:
            return {"success": True, "predictions": _future_predictions_cache[cache_key]}
            
        history_df = get_history_df()
        if history_df.empty:
            return {"success": True, "predictions": {}}
            
        if region:
            history_df = history_df[history_df['Region'] == region]
            
        # Pre-compute Time_Index for the entire dataframe to avoid doing it per-resource
        # Create a copy to avoid SettingWithCopyWarning
        work_df = history_df.copy()
        
        if request.resources:
            requested = [r.strip().lower() for r in request.resources]
            work_df = work_df[work_df['Resource'].str.strip().str.lower().isin(requested)]
            
        predictions = {}
        
        target_features = []
        curr_y, curr_m = target_start_year, target_start_month
        while curr_y < target_end_year or (curr_y == target_end_year and curr_m <= target_end_month):
            ti = curr_y + (curr_m - 1) / 12
            msin = np.sin(2 * np.pi * curr_m / 12)
            mcos = np.cos(2 * np.pi * curr_m / 12)
            target_features.append([ti, msin, mcos])
            curr_m += 1
            if curr_m > 12:
                curr_m = 1
                curr_y += 1
                
        if not target_features:
            ti = target_start_year + (target_start_month - 1) / 12
            msin = np.sin(2 * np.pi * target_start_month / 12)
            mcos = np.cos(2 * np.pi * target_start_month / 12)
            target_features = [[ti, msin, mcos]]
            
        target_X = np.array(target_features)
        
        work_df['Time_Index'] = work_df['Year'] + (work_df['Month'] - 1) / 12
        work_df['Month_Sin'] = np.sin(2 * np.pi * work_df['Month'] / 12)
        work_df['Month_Cos'] = np.cos(2 * np.pi * work_df['Month'] / 12)
        
        for resource, resource_df in work_df.groupby('Resource'):
            if len(resource_df) < 2:
                last_rate = resource_df['Rate'].iloc[-1]
                predictions[str(resource).strip()] = {
                    "expected": round(float(last_rate), 2),
                    "high": round(float(last_rate), 2),
                    "low": round(float(last_rate), 2)
                }
            else:
                X = resource_df[['Time_Index', 'Month_Sin', 'Month_Cos']].values
                y = resource_df['Rate'].values
                
                model = make_pipeline(PolynomialFeatures(degree=2), BayesianRidge())
                model.fit(X, y)
                
                # Get prediction with confidence intervals directly from BayesianRidge
                preds, stds = model.predict(target_X, return_std=True)
                
                pred = float(np.mean(preds))
                std = float(np.mean(stds))
                
                predictions[str(resource).strip()] = {
                    "expected": round(pred, 2),
                    "high": round(pred + (1.96 * std), 2),
                    "low": round(max(0, pred - (1.96 * std)), 2)
                }
                
        _future_predictions_cache[cache_key] = predictions
        return {"success": True, "predictions": predictions}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class LocalRate(BaseModel):
    resource: str
    rate: float
    region: str

class TrainLocalRatesRequest(BaseModel):
    rates: List[LocalRate]

@app.post("/api/ml/train-local-rates")
async def train_local_rates(request: TrainLocalRatesRequest):
    try:
        if not request.rates:
            return {"success": True, "message": "No rates to train on."}
            
        now = datetime.now()
        current_year = now.year
        current_month = now.month
        
        dfs = []
        for r in request.rates:
            if not r.resource: continue
            dfs.append(pd.DataFrame({
                'Year': [current_year],
                'Month': [current_month],
                'Region': [r.region or "Trivandrum"],
                'Resource': [r.resource],
                'Rate': [r.rate]
            }))
            
        if not dfs:
            return {"success": True, "message": "No valid rates to train."}
            
        new_data = pd.concat(dfs, ignore_index=True)
        new_data['Resource'] = new_data['Resource'].str.strip()
        
        history_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "core", "market_training_data.csv")
        if os.path.exists(history_file) and os.path.getsize(history_file) > 0:
            history_df = pd.read_csv(history_file)
            if 'Region' not in history_df.columns:
                history_df['Region'] = "General"
            history_df['Rate'] = pd.to_numeric(history_df['Rate'], errors='coerce')
            history_df['Resource'] = history_df['Resource'].str.strip()
            
            history_df = pd.concat([history_df, new_data])
            history_df = history_df.drop_duplicates(subset=['Year', 'Month', 'Region', 'Resource'], keep='last')
        else:
            history_df = new_data
            
        history_df.to_csv(history_file, index=False)
        
        # Clear cache so next prediction request trains on the new data
        global _future_predictions_cache
        _future_predictions_cache.clear()
        
        return {"success": True, "message": f"Successfully trained on {len(request.rates)} local market rates!"}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}

@app.get("/api/ml/resource-history")
async def get_resource_history(resource: str, region: str = None):
    try:
        history_df = get_history_df()
        if history_df.empty:
            return {"success": True, "history": []}
            
        if region:
            history_df = history_df[history_df['Region'] == region]
            
        resource_df = history_df[history_df['Resource'] == resource].copy()
        if resource_df.empty:
            return {"success": True, "history": []}
            
        # Sort chronologically
        resource_df = resource_df.sort_values(by=['Year', 'Month'])
        
        # Train model to get fitted curve for history
        X = pd.DataFrame({'Time_Index': resource_df['Year'] + (resource_df['Month'] - 1) / 12})
        y = resource_df['Rate']
        
        if len(resource_df) >= 2:
            model = BayesianRidge()
            model.fit(X, y)
            historical_predictions, hist_std = model.predict(X, return_std=True)
            historical_predictions = list(historical_predictions)
            hist_std = list(hist_std)
        else:
            historical_predictions = [y.iloc[0]] * len(resource_df)
            hist_std = [0] * len(resource_df)
            
        # Create output history points
        history_points = []
        for i, row in enumerate(resource_df.itertuples()):
            date_str = f"{int(row.Year)}-{int(row.Month):02d}"
            pred = float(historical_predictions[i])
            std = float(hist_std[i])
            
            history_points.append({
                "date": date_str,
                "actual_rate": round(float(row.Rate), 2),
                "predicted_rate": round(pred, 2),
                "predicted_rate_high": round(pred + (1.96 * std), 2),
                "predicted_rate_low": round(pred - (1.96 * std), 2)
            })
            
        # Extrapolate next 6 months
        last_year = resource_df['Year'].max()
        last_month = resource_df[resource_df['Year'] == last_year]['Month'].max()
        last_date = pd.to_datetime(f"{int(last_year)}-{int(last_month):02d}-01")
        
        future_dates = pd.date_range(start=last_date + pd.DateOffset(months=1), periods=6, freq='ME')
        if len(resource_df) >= 2:
            future_X = pd.DataFrame({'Time_Index': future_dates.year + (future_dates.month - 1) / 12})
            future_predictions, fut_std = model.predict(future_X, return_std=True)
            future_predictions = list(future_predictions)
            fut_std = list(fut_std)
        else:
            future_predictions = [y.iloc[0]] * 6
            fut_std = [0] * 6
            
        for i, date in enumerate(future_dates):
            pred = float(future_predictions[i])
            std = float(fut_std[i])
            
            history_points.append({
                "date": date.strftime("%Y-%m"),
                "actual_rate": None,
                "predicted_rate": round(pred, 2),
                "predicted_rate_high": round(pred + (1.96 * std), 2),
                "predicted_rate_low": round(pred - (1.96 * std), 2)
            })
            
        return {"success": True, "history": history_points}
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {"error": str(e)}
