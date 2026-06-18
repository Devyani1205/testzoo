"""Seed dummy data for TestZoo development."""
import asyncio
import uuid
from datetime import datetime, timedelta
import secrets

from app.database import AsyncSessionLocal, async_engine
from app.models import Base, User, DoctorProfile, PatientProfile, Lab, Test, Recommendation, Order, Wallet, Referral, PromoCode, WalletTransaction
from app.utils.auth import get_password_hash


LABS = [
    {"name": "MedGenomics India", "city": "Bengaluru", "accreditation": "NABL, CAP", "description": "Premier molecular diagnostics lab specializing in oncology and genetic testing."},
    {"name": "Apollo Diagnostics", "city": "Chennai", "accreditation": "NABL, ISO 15189", "description": "India's largest diagnostics chain with 24/7 collection centers."},
    {"name": "Oncquest Labs", "city": "New Delhi", "accreditation": "NABL, College of American Pathologists", "description": "Specialized oncology diagnostics with advanced NGS capabilities."},
    {"name": "SRL Diagnostics", "city": "Mumbai", "accreditation": "NABL, ISO 9001", "description": "National reference laboratory network with 400+ collection points."},
    {"name": "Trivitron Genomics", "city": "Hyderabad", "accreditation": "NABL, WHO-GMP", "description": "Advanced genomics and companion diagnostics laboratory."},
]

TESTS = [
    {
        "name": "EGFR Mutation Analysis (NGS Panel)", "category": "Molecular Oncology",
        "description": "Comprehensive EGFR mutation profiling for lung cancer treatment selection. Detects exon 18-21 mutations including L858R, T790M, and exon 19 deletions.",
        "biomarkers": ["EGFR", "L858R", "T790M", "Exon 19 del"], "test_type": "NGS",
        "turnaround_days": 7, "sample_type": "FFPE Tissue / Liquid Biopsy",
        "mrp_cents": 2500000, "b2b_price_cents": 1800000, "lab_commission_percent": 12.0,
        "patient_discount_percent": 18.0, "is_sponsored": True,
        "sponsored_keywords": ["lung cancer", "egfr", "nsclc", "targeted therapy", "erlotinib"],
    },
    {
        "name": "ALK/ROS1 Fusion Detection (IHC + FISH)", "category": "Molecular Oncology",
        "description": "Dual ALK/ROS1 testing for NSCLC. Immunohistochemistry screening followed by confirmatory FISH.",
        "biomarkers": ["ALK", "ROS1", "EML4-ALK", "CD74-ROS1"], "test_type": "IHC + FISH",
        "turnaround_days": 10, "sample_type": "FFPE Tissue",
        "mrp_cents": 3200000, "b2b_price_cents": 2400000, "lab_commission_percent": 10.0,
        "patient_discount_percent": 15.0, "is_sponsored": False,
        "sponsored_keywords": ["alk fusion", "ros1", "lung adenocarcinoma"],
    },
    {
        "name": "BRCA1/BRCA2 Germline Sequencing", "category": "Hereditary Cancer",
        "description": "Full sequencing and large rearrangement analysis of BRCA1 and BRCA2 genes. Indicated for hereditary breast/ovarian cancer syndrome.",
        "biomarkers": ["BRCA1", "BRCA2"], "test_type": "Sanger + MLPA",
        "turnaround_days": 21, "sample_type": "Blood (EDTA)",
        "mrp_cents": 4500000, "b2b_price_cents": 3200000, "lab_commission_percent": 10.0,
        "patient_discount_percent": 12.0, "is_sponsored": True,
        "sponsored_keywords": ["brca", "breast cancer", "ovarian cancer", "hereditary", "genetic risk"],
    },
    {
        "name": "HER2 Amplification (FISH + IHC)", "category": "Breast Oncology",
        "description": "Gold-standard HER2 testing combining IHC scoring with FISH confirmation per ASCO/CAP guidelines.",
        "biomarkers": ["HER2", "ERBB2", "CEP17"], "test_type": "FISH + IHC",
        "turnaround_days": 7, "sample_type": "FFPE Tissue",
        "mrp_cents": 2800000, "b2b_price_cents": 1900000, "lab_commission_percent": 11.0,
        "patient_discount_percent": 15.0, "is_sponsored": False,
        "sponsored_keywords": ["her2", "breast cancer", "trastuzumab", "herceptin"],
    },
    {
        "name": "Comprehensive Cancer 500 Gene Panel (NGS)", "category": "Comprehensive Genomics",
        "description": "Tumor profiling of 500+ cancer-related genes covering SNVs, indels, CNVs, and fusions. Includes TMB and MSI analysis.",
        "biomarkers": ["TMB", "MSI", "KRAS", "NRAS", "BRAF", "PIK3CA", "TP53", "PTEN", "500+ genes"],
        "test_type": "NGS", "turnaround_days": 21, "sample_type": "FFPE / Blood",
        "mrp_cents": 8500000, "b2b_price_cents": 6000000, "lab_commission_percent": 8.0,
        "patient_discount_percent": 10.0, "is_sponsored": True,
        "sponsored_keywords": ["comprehensive genomics", "tumor profiling", "ngs panel", "500 gene", "tmb", "msi"],
    },
    {
        "name": "KRAS/NRAS/BRAF Codon Mutation Test", "category": "Colorectal Oncology",
        "description": "Extended RAS testing required before anti-EGFR therapy in metastatic colorectal cancer.",
        "biomarkers": ["KRAS", "NRAS", "BRAF V600E"], "test_type": "PCR + Sequencing",
        "turnaround_days": 5, "sample_type": "FFPE Tissue",
        "mrp_cents": 1800000, "b2b_price_cents": 1200000, "lab_commission_percent": 12.0,
        "patient_discount_percent": 15.0, "is_sponsored": False,
        "sponsored_keywords": ["colorectal cancer", "kras", "nras", "cetuximab", "panitumumab"],
    },
    {
        "name": "PDL1 Expression (22C3 Pharmaca)", "category": "Immunotherapy Biomarkers",
        "description": "PD-L1 IHC 22C3 assay (Dako PharmDx) — the approved companion diagnostic for pembrolizumab across multiple tumor types.",
        "biomarkers": ["PD-L1", "TPS", "CPS"], "test_type": "IHC",
        "turnaround_days": 5, "sample_type": "FFPE Tissue",
        "mrp_cents": 1500000, "b2b_price_cents": 1100000, "lab_commission_percent": 12.0,
        "patient_discount_percent": 15.0, "is_sponsored": True,
        "sponsored_keywords": ["pdl1", "immunotherapy", "checkpoint", "pembrolizumab", "keytruda", "pd-l1"],
    },
    {
        "name": "Liquid Biopsy ctDNA Panel (70 Genes)", "category": "Liquid Biopsy",
        "description": "Non-invasive plasma ctDNA profiling of 70 oncogenes. Monitors treatment response and detects resistance mutations.",
        "biomarkers": ["ctDNA", "EGFR", "KRAS", "PIK3CA", "TP53", "70+ genes"],
        "test_type": "ddPCR + NGS", "turnaround_days": 10, "sample_type": "Plasma (Blood)",
        "mrp_cents": 3500000, "b2b_price_cents": 2600000, "lab_commission_percent": 10.0,
        "patient_discount_percent": 12.0, "is_sponsored": True,
        "sponsored_keywords": ["liquid biopsy", "ctdna", "non-invasive", "blood test", "monitoring"],
    },
    {
        "name": "Chromosomal Microarray (CMA) — Oncology", "category": "Cytogenomics",
        "description": "High-resolution CNV analysis for hematological malignancies. Detects deletions, duplications, and copy-neutral LOH.",
        "biomarkers": ["CNV", "LOH", "del(5q)", "del(17p)", "del(13q)"],
        "test_type": "SNP Array", "turnaround_days": 14, "sample_type": "Blood / Bone Marrow",
        "mrp_cents": 3800000, "b2b_price_cents": 2700000, "lab_commission_percent": 10.0,
        "patient_discount_percent": 12.0, "is_sponsored": False,
        "sponsored_keywords": ["microarray", "cma", "chromosomal", "hematology", "leukemia"],
    },
    {
        "name": "Oncotype DX Breast (21-Gene Recurrence Score)", "category": "Breast Oncology",
        "description": "Genomic test predicting chemotherapy benefit and 10-year distant recurrence risk in early-stage ER+/HER2- breast cancer.",
        "biomarkers": ["ESR1", "PGR", "HER2", "Ki67", "21 genes"], "test_type": "qRT-PCR",
        "turnaround_days": 14, "sample_type": "FFPE Tissue",
        "mrp_cents": 5500000, "b2b_price_cents": 4000000, "lab_commission_percent": 8.0,
        "patient_discount_percent": 8.0, "is_sponsored": False,
        "sponsored_keywords": ["oncotype", "breast recurrence", "er positive", "chemotherapy decision"],
    },
    {
        "name": "BCR-ABL Quantitative PCR (IS Scale)", "category": "Hematology Oncology",
        "description": "Highly sensitive qPCR monitoring of BCR-ABL1 transcripts in CML/ALL. Reports on International Scale (IS).",
        "biomarkers": ["BCR-ABL1", "p210", "p190"], "test_type": "qPCR",
        "turnaround_days": 5, "sample_type": "Blood (EDTA)",
        "mrp_cents": 1200000, "b2b_price_cents": 900000, "lab_commission_percent": 12.0,
        "patient_discount_percent": 20.0, "is_sponsored": True,
        "sponsored_keywords": ["cml", "leukemia", "bcr-abl", "imatinib", "gleevec", "monitoring"],
    },
    {
        "name": "MSI / MMR Deficiency (IHC Panel)", "category": "Immunotherapy Biomarkers",
        "description": "4-marker IHC panel (MLH1, MSH2, MSH6, PMS2) to detect mismatch repair deficiency. Identifies candidates for pembrolizumab therapy.",
        "biomarkers": ["MLH1", "MSH2", "MSH6", "PMS2", "MSI-H"],
        "test_type": "IHC", "turnaround_days": 5, "sample_type": "FFPE Tissue",
        "mrp_cents": 1600000, "b2b_price_cents": 1100000, "lab_commission_percent": 12.0,
        "patient_discount_percent": 15.0, "is_sponsored": False,
        "sponsored_keywords": ["msi", "mmr", "microsatellite", "immunotherapy", "lynch syndrome"],
    },
]

PROMO_CODES = [
    {"code": "SAVE20", "discount_type": "PERCENTAGE", "discount_value": 20, "minimum_order_cents": 100000, "maximum_discount_cents": 50000},
    {"code": "FLAT500", "discount_type": "FIXED", "discount_value": 50000, "minimum_order_cents": 200000},
    {"code": "NEWUSER", "discount_type": "PERCENTAGE", "discount_value": 15, "minimum_order_cents": 0},
    {"code": "TESTZOO10", "discount_type": "PERCENTAGE", "discount_value": 10, "minimum_order_cents": 0},
    {"code": "CANCER25", "discount_type": "PERCENTAGE", "discount_value": 25, "minimum_order_cents": 500000, "maximum_discount_cents": 100000},
]


async def seed():
    from app.database import async_engine
    from app.models import Base
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        print("🌱 Seeding Labs...")
        lab_objects = []
        for lab_data in LABS:
            lab = Lab(id=str(uuid.uuid4()), **lab_data)
            db.add(lab)
            lab_objects.append(lab)
        await db.flush()

        print("🌱 Seeding Tests...")
        test_objects = []
        for i, test_data in enumerate(TESTS):
            lab = lab_objects[i % len(lab_objects)]
            test = Test(id=str(uuid.uuid4()), lab_id=lab.id, **test_data)
            db.add(test)
            test_objects.append(test)
        await db.flush()

        print("🌱 Seeding Promo Codes...")
        for pc_data in PROMO_CODES:
            pc = PromoCode(
                id=str(uuid.uuid4()),
                valid_until=datetime.utcnow() + timedelta(days=365),
                usage_limit=1000,
                **pc_data,
            )
            db.add(pc)
        await db.flush()

        print("🌱 Seeding Doctor accounts...")
        doctors_data = [
            {"email": "dr.mehta@testzoo.demo", "name": "Dr. Priya Mehta", "specialty": "Medical Oncology", "hospital": "Tata Memorial Hospital"},
            {"email": "dr.sharma@testzoo.demo", "name": "Dr. Rajesh Sharma", "specialty": "Pulmonology", "hospital": "AIIMS Delhi"},
            {"email": "dr.krishna@testzoo.demo", "name": "Dr. Sujata Krishna", "specialty": "Oncology", "hospital": "Apollo Hospitals"},
        ]
        doctor_users = []
        for d in doctors_data:
            user = User(
                id=str(uuid.uuid4()), email=d["email"],
                hashed_password=get_password_hash("Doctor@123"),
                full_name=d["name"], user_type="doctor", phone="+919876543210",
            )
            db.add(user)
            profile = DoctorProfile(
                id=str(uuid.uuid4()), user_id=user.id,
                license_number=f"MCI-{uuid.uuid4().hex[:8].upper()}",
                specialty=d["specialty"], hospital_name=d["hospital"],
            )
            db.add(profile)
            wallet = Wallet(id=str(uuid.uuid4()), user_id=user.id, balance_cents=25000)
            db.add(wallet)
            referral = Referral(
                id=str(uuid.uuid4()), user_id=user.id,
                referral_code=f"DR-{secrets.token_hex(3).upper()}",
            )
            db.add(referral)
            doctor_users.append((user, profile))

        await db.flush()

        print("🌱 Seeding Patient accounts...")
        patients_data = [
            {"email": "patient.ravi@testzoo.demo", "name": "Ravi Kumar"},
            {"email": "patient.anita@testzoo.demo", "name": "Anita Desai"},
            {"email": "patient.suresh@testzoo.demo", "name": "Suresh Patel"},
        ]
        patient_users = []
        for p in patients_data:
            user = User(
                id=str(uuid.uuid4()), email=p["email"],
                hashed_password=get_password_hash("Patient@123"),
                full_name=p["name"], user_type="patient", phone="+919876543211",
            )
            db.add(user)
            profile = PatientProfile(id=str(uuid.uuid4()), user_id=user.id, gender="Male")
            db.add(profile)
            wallet = Wallet(id=str(uuid.uuid4()), user_id=user.id, balance_cents=50000)
            db.add(wallet)
            referral = Referral(
                id=str(uuid.uuid4()), user_id=user.id,
                referral_code=f"PT-{secrets.token_hex(3).upper()}",
            )
            db.add(referral)
            patient_users.append((user, profile))

        await db.flush()

        print("🌱 Seeding Recommendations & Orders...")
        statuses = ["recommended", "sent", "patient_viewed", "paid", "completed"]
        for i, (dr_user, doctor) in enumerate(doctor_users):
            for j, test in enumerate(test_objects[:6]):
                pat_user, patient = patient_users[j % len(patient_users)]
                token = secrets.token_urlsafe(24)
                status = statuses[(i + j) % len(statuses)]
                rec = Recommendation(
                    id=str(uuid.uuid4()), doctor_id=doctor.id, test_id=test.id,
                    patient_name=pat_user.full_name, patient_phone=pat_user.phone,
                    case_description=f"Patient with suspected {test.category} requiring diagnostic workup.",
                    clinical_reasoning=f"{test.name} recommended based on clinical presentation and current guidelines.",
                    status=status,
                    share_link=f"http://localhost:3000/patient/checkout/{token}",
                    share_token=token,
                    expires_at=datetime.utcnow() + timedelta(days=7),
                    whatsapp_status="delivered",
                )
                db.add(rec)

                if status in ["paid", "completed"]:
                    b2b = test.b2b_price_cents
                    patient_price = int(b2b * (1 - test.patient_discount_percent / 100))
                    order = Order(
                        id=str(uuid.uuid4()), recommendation_id=rec.id,
                        doctor_id=doctor.id, patient_id=patient.id, test_id=test.id,
                        mrp_cents=test.mrp_cents, b2b_price_cents=b2b,
                        patient_discount_percent=test.patient_discount_percent,
                        patient_price_cents=patient_price, final_amount_cents=patient_price,
                        payment_method="card", payment_status="paid",
                        order_status="completed" if status == "completed" else "paid",
                        doctor_commission_cents=int(b2b * 0.03),
                        created_at=datetime.utcnow() - timedelta(days=j * 3 + i),
                    )
                    db.add(order)
                    doctor.total_recommendations = (doctor.total_recommendations or 0) + 1

        await db.commit()
        print("✅ Seed data inserted successfully!")
        print("\n📋 Demo Credentials:")
        print("  Doctor: dr.mehta@testzoo.demo / Doctor@123")
        print("  Patient: patient.ravi@testzoo.demo / Patient@123")
        print("\n🎟️ Promo Codes: SAVE20, FLAT500, NEWUSER, TESTZOO10, CANCER25")


if __name__ == "__main__":
    asyncio.run(seed())
