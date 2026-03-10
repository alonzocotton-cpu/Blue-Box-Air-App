from fastapi import FastAPI, APIRouter, HTTPException, Depends, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
from bson import ObjectId
import json

# Salesforce integration
from salesforce_service import salesforce, sf_config, get_salesforce_status, FIELD_MAPPINGS

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'technician_app')]

# Create the main app
app = FastAPI(title="Blue Box Air Tech API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Helper to convert MongoDB documents
def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    if isinstance(doc, list):
        return [serialize_doc(d) for d in doc]
    if isinstance(doc, dict):
        result = {}
        for key, value in doc.items():
            if isinstance(value, ObjectId):
                result[key] = str(value)
            elif isinstance(value, datetime):
                result[key] = value.isoformat()
            elif isinstance(value, dict):
                result[key] = serialize_doc(value)
            elif isinstance(value, list):
                result[key] = [serialize_doc(v) if isinstance(v, (dict, ObjectId)) else v for v in value]
            else:
                result[key] = value
        return result
    if isinstance(doc, ObjectId):
        return str(doc)
    return doc

# ============ Models ============

class TechnicianLogin(BaseModel):
    username: str
    password: str

class TechnicianProfile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    salesforce_id: str
    username: str
    email: str
    full_name: str
    phone: Optional[str] = None
    profile_image: Optional[str] = None
    skills: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Project(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    salesforce_id: str
    project_number: str
    name: str
    description: Optional[str] = None
    status: str = "Active"  # Active, On Hold, Completed
    client_name: str
    address: Optional[str] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    assigned_technician_id: str
    equipment_count: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Equipment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    salesforce_id: str
    project_id: str
    name: str
    model: Optional[str] = None
    serial_number: Optional[str] = None
    equipment_type: str = "Coil Management"  # Coil Management, Chiller, AHU, RTU, etc.
    location: Optional[str] = None
    status: str = "Active"
    last_service_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Reading(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    equipment_id: str
    project_id: str
    technician_id: str
    reading_type: str  # Differential Pressure, Airflow, Temperature, Humidity
    reading_phase: str = "Pre"  # Pre or Post
    value: float
    unit: str
    captured_at: datetime = Field(default_factory=datetime.utcnow)  # User-specified capture time
    notes: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)  # Record creation time

class ReadingCreate(BaseModel):
    equipment_id: str
    project_id: str
    reading_type: str
    reading_phase: str = "Pre"  # Pre or Post
    value: float
    unit: str
    captured_at: Optional[str] = None  # ISO format datetime string
    notes: Optional[str] = None

class Photo(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    equipment_id: Optional[str] = None
    technician_id: str
    image_data: str  # Base64
    caption: Optional[str] = None
    photo_type: str = "General"  # Before, After, Issue, General
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PhotoCreate(BaseModel):
    project_id: str
    equipment_id: Optional[str] = None
    image_data: str
    caption: Optional[str] = None
    photo_type: str = "General"

class ServiceLog(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    equipment_id: str
    technician_id: str
    service_type: str  # Inspection, Maintenance, Repair, Cleaning
    description: str
    status: str = "Completed"
    duration_minutes: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ServiceLogCreate(BaseModel):
    project_id: str
    equipment_id: str
    service_type: str
    description: str
    duration_minutes: Optional[int] = None

# ============ Mock Data Generator ============

def generate_mock_data():
    """Generate mock data simulating Salesforce data"""
    
    # Mock Technician
    mock_technician = {
        "id": "tech-001",
        "salesforce_id": "003Dn00000AbCdEF",
        "username": "john.smith",
        "email": "john.smith@blueboxair.com",
        "full_name": "John Smith",
        "phone": "(555) 123-4567",
        "skills": ["Coil Management", "Coil Cleaning", "Air Quality"],
        "profile_image": None
    }
    
    # Mock Projects (from Salesforce)
    now = datetime.utcnow()
    mock_projects = [
        {
            "id": "proj-001", 
            "salesforce_id": "a0B001", 
            "project_number": "PRJ-2024-001",
            "name": "Acme Corporate Tower - Coil Management",
            "description": "Annual coil cleaning and management for all 12 floors",
            "status": "Active",
            "client_name": "Acme Corporation",
            "address": "123 Main Street, New York, NY 10001",
            "start_date": now - timedelta(days=5),
            "end_date": now + timedelta(days=25),
            "assigned_technician_id": "tech-001",
            "equipment_count": 24
        },
        {
            "id": "proj-002", 
            "salesforce_id": "a0B002", 
            "project_number": "PRJ-2024-002",
            "name": "Metro Hospital - Air Quality Assessment",
            "description": "Critical air quality inspection and coil treatment",
            "status": "Active",
            "client_name": "Metro Healthcare",
            "address": "789 Hospital Drive, Chicago, IL 60601",
            "start_date": now,
            "end_date": now + timedelta(days=10),
            "assigned_technician_id": "tech-001",
            "equipment_count": 36
        },
        {
            "id": "proj-003", 
            "salesforce_id": "a0B003", 
            "project_number": "PRJ-2024-003",
            "name": "Pacific Mall - Chiller Inspection",
            "description": "Quarterly chiller inspection and enzyme treatment",
            "status": "Active",
            "client_name": "Pacific Retail Group",
            "address": "321 Commerce Blvd, Seattle, WA 98101",
            "start_date": now + timedelta(days=3),
            "end_date": now + timedelta(days=7),
            "assigned_technician_id": "tech-001",
            "equipment_count": 8
        },
        {
            "id": "proj-004", 
            "salesforce_id": "a0B004", 
            "project_number": "PRJ-2024-004",
            "name": "Tech Campus Building A - RTU Service",
            "description": "Rooftop unit maintenance and coil cleaning",
            "status": "On Hold",
            "client_name": "Global Tech Industries",
            "address": "456 Innovation Way, San Jose, CA 95110",
            "start_date": now + timedelta(days=14),
            "end_date": now + timedelta(days=21),
            "assigned_technician_id": "tech-001",
            "equipment_count": 16
        },
        {
            "id": "proj-005", 
            "salesforce_id": "a0B005", 
            "project_number": "PRJ-2024-005",
            "name": "Downtown Office Complex - Completed",
            "description": "Full coil system cleaning completed",
            "status": "Completed",
            "client_name": "City Properties LLC",
            "address": "100 Financial District, Boston, MA 02110",
            "start_date": now - timedelta(days=30),
            "end_date": now - timedelta(days=15),
            "assigned_technician_id": "tech-001",
            "equipment_count": 12
        },
    ]
    
    # Mock Equipment for projects
    mock_equipment = [
        # Project 1 equipment
        {"id": "eq-001", "salesforce_id": "a1E001", "project_id": "proj-001", "name": "AHU-01 Floor 1", "model": "Carrier 39M", "serial_number": "CR39M001", "equipment_type": "AHU", "location": "Floor 1 Mechanical Room", "status": "Active"},
        {"id": "eq-002", "salesforce_id": "a1E002", "project_id": "proj-001", "name": "AHU-02 Floor 2", "model": "Carrier 39M", "serial_number": "CR39M002", "equipment_type": "AHU", "location": "Floor 2 Mechanical Room", "status": "Active"},
        {"id": "eq-003", "salesforce_id": "a1E003", "project_id": "proj-001", "name": "RTU-01 Roof", "model": "Trane Voyager", "serial_number": "TV12345", "equipment_type": "RTU", "location": "Rooftop", "status": "Active"},
        {"id": "eq-004", "salesforce_id": "a1E004", "project_id": "proj-001", "name": "Chiller-01", "model": "York YCIV", "serial_number": "YK001", "equipment_type": "Chiller", "location": "Basement", "status": "Active"},
        # Project 2 equipment
        {"id": "eq-005", "salesforce_id": "a1E005", "project_id": "proj-002", "name": "OR-AHU-01", "model": "Carrier 39MN", "serial_number": "CR39MN001", "equipment_type": "AHU", "location": "OR Suite 1", "status": "Active"},
        {"id": "eq-006", "salesforce_id": "a1E006", "project_id": "proj-002", "name": "ICU-AHU-01", "model": "Carrier 39MN", "serial_number": "CR39MN002", "equipment_type": "AHU", "location": "ICU", "status": "Active"},
        # Project 3 equipment
        {"id": "eq-007", "salesforce_id": "a1E007", "project_id": "proj-003", "name": "Chiller-Main", "model": "Trane CVHF", "serial_number": "TCV001", "equipment_type": "Chiller", "location": "Central Plant", "status": "Active"},
        {"id": "eq-008", "salesforce_id": "a1E008", "project_id": "proj-003", "name": "Chiller-Backup", "model": "Trane CVHF", "serial_number": "TCV002", "equipment_type": "Chiller", "location": "Central Plant", "status": "Active"},
    ]
    
    return {
        "technician": mock_technician,
        "projects": mock_projects,
        "equipment": mock_equipment,
    }

# Store for current session
MOCK_DATA = generate_mock_data()
current_technician_id = "tech-001"

# ============ Auth Routes ============

@api_router.post("/auth/login")
async def login(credentials: TechnicianLogin):
    """Mock Salesforce OAuth login - returns mock technician data"""
    technician = MOCK_DATA["technician"].copy()
    
    return {
        "success": True,
        "message": "Login successful (MOCK - Salesforce OAuth will be used in production)",
        "technician": technician,
        "token": "mock-jwt-token-" + str(uuid.uuid4())
    }

@api_router.get("/auth/profile")
async def get_profile():
    """Get current technician profile"""
    # Try to get profile from DB first, fallback to mock
    profile = await db.profiles.find_one({"technician_id": MOCK_DATA["technician"]["id"]})
    if profile:
        profile = serialize_doc(profile)
        return profile
    return MOCK_DATA["technician"]

@api_router.put("/auth/profile")
async def update_profile(profile_data: dict):
    """Update technician profile"""
    technician_id = MOCK_DATA["technician"]["id"]
    
    allowed_fields = ["full_name", "email", "phone", "skills", "profile_photo", "title", "company"]
    update_data = {k: v for k, v in profile_data.items() if k in allowed_fields}
    update_data["technician_id"] = technician_id
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    result = await db.profiles.update_one(
        {"technician_id": technician_id},
        {"$set": update_data},
        upsert=True
    )
    
    # Merge with mock data for complete profile
    merged = {**MOCK_DATA["technician"], **update_data}
    return {"success": True, "profile": merged}

# ============ Media (Photos & Videos) ============

@api_router.post("/media")
async def upload_media(media_data: dict):
    """Upload photo or video media to a project"""
    media = {
        "id": f"media-{uuid.uuid4().hex[:8]}",
        "project_id": media_data.get("project_id"),
        "equipment_id": media_data.get("equipment_id"),
        "media_type": media_data.get("media_type", "photo"),  # photo or video
        "media_uri": media_data.get("media_uri", ""),
        "thumbnail": media_data.get("thumbnail", ""),
        "caption": media_data.get("caption", ""),
        "duration": media_data.get("duration"),  # for videos
        "technician_id": MOCK_DATA["technician"]["id"],
        "created_at": datetime.utcnow().isoformat(),
    }
    
    await db.media.insert_one(media)
    media = serialize_doc(media)
    return {"success": True, "media": media}

@api_router.get("/media/{project_id}")
async def get_project_media(project_id: str):
    """Get all media (photos & videos) for a project"""
    media = await db.media.find({"project_id": project_id}).sort("created_at", -1).to_list(200)
    media = serialize_doc(media)
    return {"media": media}

@api_router.delete("/media/{media_id}")
async def delete_media(media_id: str):
    """Delete a media item"""
    await db.media.delete_one({"id": media_id})
    return {"success": True}

# ============ Project Sharing ============

@api_router.get("/technicians")
async def list_technicians():
    """List all Blue Box Air technicians for sharing"""
    # Mock list of technicians in the company
    technicians = [
        {"id": "tech-001", "full_name": "John Smith", "email": "john@blueboxair.com", "title": "Lead Technician", "skills": ["Coil Cleaning", "Air Quality"]},
        {"id": "tech-002", "full_name": "Sarah Johnson", "email": "sarah@blueboxair.com", "title": "Senior Technician", "skills": ["Coil Management", "Diagnostics"]},
        {"id": "tech-003", "full_name": "Mike Davis", "email": "mike@blueboxair.com", "title": "Technician", "skills": ["Installation", "Repair"]},
        {"id": "tech-004", "full_name": "Emily Chen", "email": "emily@blueboxair.com", "title": "Technician", "skills": ["Coil Cleaning", "Maintenance"]},
        {"id": "tech-005", "full_name": "Carlos Rodriguez", "email": "carlos@blueboxair.com", "title": "Field Supervisor", "skills": ["Management", "Quality Assurance"]},
    ]
    return {"technicians": technicians}

@api_router.post("/projects/{project_id}/share")
async def share_project(project_id: str, share_data: dict):
    """Share a project with other technicians"""
    share_record = {
        "id": f"share-{uuid.uuid4().hex[:8]}",
        "project_id": project_id,
        "shared_by": MOCK_DATA["technician"]["id"],
        "shared_with": share_data.get("technician_ids", []),
        "message": share_data.get("message", ""),
        "shared_at": datetime.utcnow().isoformat(),
    }
    
    await db.shares.insert_one(share_record)
    share_record = serialize_doc(share_record)
    return {"success": True, "share": share_record}

@api_router.get("/projects/{project_id}/shares")
async def get_project_shares(project_id: str):
    """Get all share records for a project"""
    shares = await db.shares.find({"project_id": project_id}).to_list(100)
    shares = serialize_doc(shares)
    return {"shares": shares}

# ============ Salesforce Integration Routes ============

@api_router.get("/salesforce/status")
async def salesforce_status():
    """Get Salesforce connection status and configuration info."""
    return get_salesforce_status()

@api_router.get("/salesforce/auth-url")
async def salesforce_auth_url():
    """Get the Salesforce OAuth authorization URL for login."""
    if not sf_config.is_configured:
        return {
            "error": "Salesforce not configured",
            "message": "Set SALESFORCE_CLIENT_ID and SALESFORCE_CLIENT_SECRET in backend/.env",
            "auth_url": None
        }
    return {"auth_url": sf_config.auth_url}

@api_router.get("/auth/salesforce/callback")
async def salesforce_callback(code: str = Query(...)):
    """Handle Salesforce OAuth callback after user authorization."""
    result = await salesforce.authenticate_with_code(code)
    if result:
        return {
            "success": True,
            "message": "Salesforce authentication successful",
            "user_info": result.get("user_info"),
        }
    return {
        "success": False,
        "message": "Salesforce authentication failed",
    }

@api_router.get("/salesforce/field-mappings")
async def get_field_mappings():
    """Get Salesforce object and field mappings for reference."""
    return {
        "mappings": FIELD_MAPPINGS,
        "note": "Update these in salesforce_service.py to match your Salesforce org's custom object/field API names"
    }

# ============ Projects Routes ============

@api_router.get("/projects")
async def get_projects(status: Optional[str] = None):
    """Get all projects assigned to the technician"""
    projects = MOCK_DATA["projects"].copy()
    
    # Convert datetime objects for JSON serialization
    for proj in projects:
        if proj.get("start_date"):
            proj["start_date"] = proj["start_date"].isoformat() if isinstance(proj["start_date"], datetime) else proj["start_date"]
        if proj.get("end_date"):
            proj["end_date"] = proj["end_date"].isoformat() if isinstance(proj["end_date"], datetime) else proj["end_date"]
    
    # Apply filters
    if status:
        projects = [p for p in projects if p["status"] == status]
    
    return {"projects": projects, "total": len(projects)}

@api_router.get("/projects/{project_id}")
async def get_project(project_id: str):
    """Get a specific project with all details"""
    project = next((p for p in MOCK_DATA["projects"] if p["id"] == project_id), None)
    
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Convert datetime for JSON
    project = project.copy()
    if project.get("start_date"):
        project["start_date"] = project["start_date"].isoformat() if isinstance(project["start_date"], datetime) else project["start_date"]
    if project.get("end_date"):
        project["end_date"] = project["end_date"].isoformat() if isinstance(project["end_date"], datetime) else project["end_date"]
    
    # Get equipment for this project
    equipment = [eq for eq in MOCK_DATA["equipment"] if eq["project_id"] == project_id]
    
    # Get related data from DB
    readings = await db.readings.find({"project_id": project_id}).to_list(100)
    photos = await db.photos.find({"project_id": project_id}).to_list(100)
    service_logs = await db.service_logs.find({"project_id": project_id}).to_list(100)
    
    return {
        "project": project,
        "equipment": equipment,
        "readings": serialize_doc(readings),
        "photos": serialize_doc(photos),
        "service_logs": serialize_doc(service_logs)
    }

# ============ Equipment Routes ============

@api_router.get("/equipment/{project_id}")
async def get_equipment(project_id: str):
    """Get all equipment for a project"""
    equipment = [eq for eq in MOCK_DATA["equipment"] if eq["project_id"] == project_id]
    return {"equipment": equipment}

@api_router.get("/equipment/detail/{equipment_id}")
async def get_equipment_detail(equipment_id: str):
    """Get equipment details with readings"""
    equipment = next((eq for eq in MOCK_DATA["equipment"] if eq["id"] == equipment_id), None)
    
    if not equipment:
        raise HTTPException(status_code=404, detail="Equipment not found")
    
    # Get readings for this equipment
    readings = await db.readings.find({"equipment_id": equipment_id}).sort("timestamp", -1).to_list(50)
    photos = await db.photos.find({"equipment_id": equipment_id}).to_list(50)
    service_logs = await db.service_logs.find({"equipment_id": equipment_id}).to_list(50)
    
    return {
        "equipment": equipment,
        "readings": serialize_doc(readings),
        "photos": serialize_doc(photos),
        "service_logs": serialize_doc(service_logs)
    }

# ============ Readings Routes ============

@api_router.post("/readings")
async def create_reading(reading: ReadingCreate):
    """Record a new reading (pressure, airflow, etc.) with Pre/Post phase"""
    # Parse captured_at if provided, otherwise use current time
    captured_at = datetime.utcnow()
    if reading.captured_at:
        try:
            captured_at = datetime.fromisoformat(reading.captured_at.replace('Z', '+00:00'))
        except:
            captured_at = datetime.utcnow()
    
    reading_obj = Reading(
        equipment_id=reading.equipment_id,
        project_id=reading.project_id,
        technician_id=current_technician_id,
        reading_type=reading.reading_type,
        reading_phase=reading.reading_phase,
        value=reading.value,
        unit=reading.unit,
        captured_at=captured_at,
        notes=reading.notes
    )
    await db.readings.insert_one(reading_obj.dict())
    return {"success": True, "reading": serialize_doc(reading_obj.dict())}

@api_router.get("/readings/{equipment_id}")
async def get_readings(equipment_id: str, phase: Optional[str] = None):
    """Get all readings for an equipment, optionally filtered by phase (Pre/Post)"""
    query = {"equipment_id": equipment_id}
    if phase:
        query["reading_phase"] = phase
    readings = await db.readings.find(query).sort("captured_at", -1).to_list(100)
    return {"readings": serialize_doc(readings)}

# ============ Photo Routes ============

@api_router.post("/photos")
async def upload_photo(photo: PhotoCreate):
    """Upload a photo"""
    photo_obj = Photo(
        **photo.dict(),
        technician_id=current_technician_id
    )
    await db.photos.insert_one(photo_obj.dict())
    return {"success": True, "photo_id": photo_obj.id}

@api_router.get("/photos/{project_id}")
async def get_photos(project_id: str):
    """Get all photos for a project"""
    photos = await db.photos.find({"project_id": project_id}).to_list(100)
    return {"photos": serialize_doc(photos)}

# ============ Service Log Routes ============

@api_router.post("/service-logs")
async def create_service_log(log: ServiceLogCreate):
    """Create a service log entry"""
    log_obj = ServiceLog(
        **log.dict(),
        technician_id=current_technician_id
    )
    await db.service_logs.insert_one(log_obj.dict())
    return {"success": True, "log_id": log_obj.id}

@api_router.get("/service-logs/{project_id}")
async def get_service_logs(project_id: str):
    """Get all service logs for a project"""
    logs = await db.service_logs.find({"project_id": project_id}).sort("created_at", -1).to_list(100)
    return {"service_logs": serialize_doc(logs)}

# ============ Dashboard Stats ============

@api_router.get("/reports/{project_id}")
async def generate_report(project_id: str):
    """Generate a project report with equipment readings comparison and photos link.
    This will integrate with Salesforce API in production to pull live data."""
    
    project = next((p for p in MOCK_DATA["projects"] if p["id"] == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Serialize project dates
    project = project.copy()
    if project.get("start_date"):
        project["start_date"] = project["start_date"].isoformat() if isinstance(project["start_date"], datetime) else project["start_date"]
    if project.get("end_date"):
        project["end_date"] = project["end_date"].isoformat() if isinstance(project["end_date"], datetime) else project["end_date"]
    
    # Get equipment
    equipment_list = [eq for eq in MOCK_DATA["equipment"] if eq["project_id"] == project_id]
    
    # Get all readings for this project
    all_readings = await db.readings.find({"project_id": project_id}).to_list(500)
    all_readings = serialize_doc(all_readings)
    
    # Get all photos
    photos = await db.photos.find({"project_id": project_id}).to_list(100)
    photos = serialize_doc(photos)
    
    # Get service logs
    service_logs = await db.service_logs.find({"project_id": project_id}).to_list(100)
    service_logs = serialize_doc(service_logs)
    
    # Build reading comparisons per equipment
    reading_types = ["Differential Pressure", "Airflow", "Temperature", "Humidity"]
    unit_map = {"Differential Pressure": "inWC", "Airflow": "FPM", "Temperature": "°F", "Humidity": "%"}
    
    equipment_reports = []
    for eq in equipment_list:
        eq_readings = [r for r in all_readings if r.get("equipment_id") == eq["id"]]
        
        comparisons = []
        for rt in reading_types:
            type_readings = [r for r in eq_readings if r.get("reading_type") == rt]
            pre_readings = [r for r in type_readings if r.get("reading_phase") == "Pre"]
            post_readings = [r for r in type_readings if r.get("reading_phase") == "Post"]
            
            # Get the latest pre and post
            latest_pre = None
            latest_post = None
            
            if pre_readings:
                latest_pre = max(pre_readings, key=lambda r: r.get("captured_at", r.get("timestamp", "")))
            if post_readings:
                latest_post = max(post_readings, key=lambda r: r.get("captured_at", r.get("timestamp", "")))
            
            difference = None
            percent_change = None
            if latest_pre and latest_post:
                difference = round(latest_post["value"] - latest_pre["value"], 2)
                if latest_pre["value"] != 0:
                    percent_change = round((difference / latest_pre["value"]) * 100, 1)
            
            comparisons.append({
                "reading_type": rt,
                "unit": unit_map.get(rt, ""),
                "pre": {
                    "value": latest_pre["value"] if latest_pre else None,
                    "captured_at": latest_pre.get("captured_at") if latest_pre else None,
                } if latest_pre else None,
                "post": {
                    "value": latest_post["value"] if latest_post else None,
                    "captured_at": latest_post.get("captured_at") if latest_post else None,
                } if latest_post else None,
                "difference": difference,
                "percent_change": percent_change,
            })
        
        equipment_reports.append({
            "equipment": eq,
            "comparisons": comparisons,
            "has_data": any(c["pre"] or c["post"] for c in comparisons),
        })
    
    # Build report
    report = {
        "report_id": f"RPT-{project_id}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
        "generated_at": datetime.utcnow().isoformat(),
        "salesforce_sync_status": get_salesforce_status(),
        "project": project,
        "technician": MOCK_DATA["technician"],
        "summary": {
            "total_equipment": len(equipment_list),
            "equipment_with_readings": len([er for er in equipment_reports if er["has_data"]]),
            "total_readings": len(all_readings),
            "total_photos": len(photos),
            "total_service_logs": len(service_logs),
        },
        "equipment_reports": equipment_reports,
        "photos": [{"id": p.get("id"), "photo_type": p.get("photo_type", "General"), "created_at": p.get("created_at"), "equipment_id": p.get("equipment_id")} for p in photos],
        "service_logs": service_logs,
    }
    
    return report

@api_router.get("/dashboard/stats")
async def get_dashboard_stats():
    """Get dashboard statistics"""
    projects = MOCK_DATA["projects"]
    
    stats = {
        "total_projects": len(projects),
        "active": len([p for p in projects if p["status"] == "Active"]),
        "on_hold": len([p for p in projects if p["status"] == "On Hold"]),
        "completed": len([p for p in projects if p["status"] == "Completed"]),
        "total_equipment": sum(p.get("equipment_count", 0) for p in projects),
    }
    
    return stats

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
