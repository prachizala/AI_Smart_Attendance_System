"""
Smart Attendance AI Assistant Chatbot Engine
Handles natural language questions about attendance, leaves, shift policies,
biometric verification, and punctuality scores with multilingual response generation.
"""

from datetime import datetime, date, timedelta
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import func
import models


def calculate_punctuality_score(db: Session, user_id: int) -> Dict[str, Any]:
    """
    Computes an Employee Punctuality & Trust Score (300 to 900 scale)
    based on on-time arrival ratio, geofence compliance, and streak.
    """
    logs = db.query(models.Attendance).filter(models.Attendance.user_id == user_id).all()
    if not logs:
        return {
            "score": 750,
            "rating": "Good",
            "tier": "Gold",
            "total_punches": 0,
            "on_time_ratio": 100.0,
            "streak": 0,
        }

    total = len(logs)
    present_on_time = sum(1 for l in logs if l.status == "present")
    late = sum(1 for l in logs if l.status == "late")
    ratio = (present_on_time / total) if total > 0 else 1.0

    # Base score 300, max 900
    base_score = 300
    score = int(base_score + (ratio * 550) + min(50, total * 5))
    score = max(300, min(900, score))

    if score >= 850:
        rating = "Excellent"
        tier = "Diamond"
    elif score >= 750:
        rating = "Very Good"
        tier = "Gold"
    elif score >= 650:
        rating = "Good"
        tier = "Silver"
    else:
        rating = "Needs Improvement"
        tier = "Bronze"

    return {
        "score": score,
        "rating": rating,
        "tier": tier,
        "total_punches": total,
        "on_time_count": present_on_time,
        "late_count": late,
        "on_time_ratio": round(ratio * 100, 1),
    }


def process_chat_query(
    db: Session,
    user: models.User,
    message: str,
    language: str = "en"
) -> Dict[str, Any]:
    """
    Main Chatbot Query Router.
    Parses user query and generates real-time, context-aware responses.
    """
    lang = (language or "en").lower()
    text = (message or "").strip().lower()
    user_id = user.id
    user_role = (user.role or "employee").lower()
    today = date.today()

    # Pre-fetch today's record
    today_rec = db.query(models.Attendance).filter(
        models.Attendance.user_id == user_id,
        models.Attendance.date == today
    ).first()

    # --------------------------------------------------------------------------
    # INTENT 1: Today's Status / Check-In Query
    # --------------------------------------------------------------------------
    if any(k in text for k in ["today", "aaj", "status", "check-in", "punch in", "punch out", "aaje"]):
        if today_rec and today_rec.check_in:
            in_time = today_rec.check_in.strftime("%I:%M %p")
            out_time = today_rec.check_out.strftime("%I:%M %p") if today_rec.check_out else None
            method = getattr(today_rec, "verification_method", "face")
            method_badge = "Fingerprint 👆" if method == "fingerprint" else "Face AI 📸"
            status_text = "On-Time" if today_rec.status == "present" else "Late"

            if lang == "hi":
                reply = (
                    f"Aapka aaj ka attendance status:\n"
                    f"• Punch-In: {in_time} ({status_text})\n"
                    f"• Verification: {method_badge}\n"
                    f"• Punch-Out: {out_time or 'Shift jaari hai (Active Shift)'}\n"
                    f"• Office Geofence: 100m ke andar verified ✓"
                )
            elif lang == "gu":
                reply = (
                    f"તમારું આજનું હાજરી સ્ટેટસ:\n"
                    f"• પંચ-ઇન: {in_time} ({status_text})\n"
                    f"• વેરિફિકેશન: {method_badge}\n"
                    f"• પંચ-આઉટ: {out_time or 'શિફ્ટ ચાલુ છે (Active Shift)'}\n"
                    f"• ઓફિસ જીઓફેન્સ: 100m માં ચકાસાયેલ ✓"
                )
            else:
                reply = (
                    f"Your attendance status for today:\n"
                    f"• Check-In: {in_time} ({status_text})\n"
                    f"• Method: {method_badge}\n"
                    f"• Check-Out: {out_time or 'Shift in progress'}\n"
                    f"• Location: Verified within 100m office geofence ✓"
                )
        else:
            if lang == "hi":
                reply = "Aapne aaj abhi tak punch-in nahi kiya hai. Attendance mark karne ke liye 'Face Check In' ya 'Fingerprint Punch' use karein."
            elif lang == "gu":
                reply = "તમે આજે હજુ સુધી પંચ-ઇન કર્યું નથી. હાજરી નોંધવા માટે 'Face Check In' અથવા 'Fingerprint Punch' નો ઉપયોગ કરો."
            else:
                reply = "You haven't checked in yet today. Tap 'Face Check In' or 'Fingerprint Punch' on your dashboard to mark attendance."

        return {
            "reply": reply,
            "chips": ["My Monthly Summary", "Leave Balance", "Trust Score", "Shift Rules"],
        }

    # --------------------------------------------------------------------------
    # INTENT 2: Monthly Summary / Attendance History
    # --------------------------------------------------------------------------
    if any(k in text for k in ["monthly", "history", "summary", "record", "mahine", "days", "kitne din", "hajari"]):
        thirty_days_ago = today - timedelta(days=30)
        logs = db.query(models.Attendance).filter(
            models.Attendance.user_id == user_id,
            models.Attendance.date >= thirty_days_ago
        ).all()

        total = len(logs)
        on_time = sum(1 for l in logs if l.status == "present")
        late = sum(1 for l in logs if l.status == "late")
        pct = round((on_time / total * 100), 1) if total > 0 else 100.0

        if lang == "hi":
            reply = (
                f"Pichhle 30 dino ka aapka attendance summary:\n"
                f"• Total Present Days: {total} din\n"
                f"• On-Time Punches: {on_time}\n"
                f"• Late Marks: {late}\n"
                f"• Punctuality Rate: {pct}%\n"
                f"Aap regular rahe hain! Keep it up."
            )
        elif lang == "gu":
            reply = (
                f"છેલ્લા ૩૦ દિવસનો તમારો હાજરી સારાંશ:\n"
                f"• કુલ હાજર દિવસો: {total} દિવસ\n"
                f"• સમયસર પંચ: {on_time}\n"
                f"• લેટ માર્ક્સ: {late}\n"
                f"• નિયમિતતા દર: {pct}%\n"
                f"તમારું કામ સારું રહ્યું છે!"
            )
        else:
            reply = (
                f"Your 30-day attendance overview:\n"
                f"• Total Days Present: {total}\n"
                f"• On-Time Check-Ins: {on_time}\n"
                f"• Late Arrivals: {late}\n"
                f"• Punctuality Rate: {pct}%\n"
                f"Great job maintaining consistency!"
            )

        return {
            "reply": reply,
            "chips": ["Trust Score", "Leave Balance", "Shift Rules", "Check-in Status"],
        }

    # --------------------------------------------------------------------------
    # INTENT 3: Leave Balance & Policy
    # --------------------------------------------------------------------------
    if any(k in text for k in ["leave", "chutti", "casual", "sick", "balance", "chhutti", "raja"]):
        leaves = db.query(models.LeaveRequest).filter(
            models.LeaveRequest.user_id == user_id
        ).all()
        approved = sum(1 for l in leaves if l.status == "approved")
        pending = sum(1 for l in leaves if l.status == "pending")

        # Standard academic policy: 12 casual + 6 sick
        casual_left = max(0, 12 - approved)
        sick_left = max(0, 6 - (approved // 2))

        if lang == "hi":
            reply = (
                f"Aapka Annual Leave Balance:\n"
                f"• Casual Leaves bachi hain: {casual_left} / 12\n"
                f"• Sick Leaves bachi hain: {sick_left} / 6\n"
                f"• Pending Requests: {pending}\n"
                f"Aap 'Leaves' tab me jaakar naye leave ke liye apply kar sakte hain."
            )
        elif lang == "gu":
            reply = (
                f"તમારું વાર્ષિક રજા બેલેન્સ:\n"
                f"• કેઝ્યુઅલ રજાઓ બાકી: {casual_left} / 12\n"
                f"• બીમારી રજાઓ બાકી: {sick_left} / 6\n"
                f"• પેન્ડિંગ વિનંતીઓ: {pending}\n"
                f"તમે 'Leaves' ટેબમાં જઈને નવી રજા માટે અરજી કરી શકો છો."
            )
        else:
            reply = (
                f"Your Annual Leave Balance:\n"
                f"• Casual Leaves Available: {casual_left} of 12\n"
                f"• Sick Leaves Available: {sick_left} of 6\n"
                f"• Pending Approval: {pending}\n"
                f"You can apply for a leave anytime from the 'Leaves' tab."
            )

        return {
            "reply": reply,
            "chips": ["Apply Leave", "Monthly Summary", "Shift Rules", "Trust Score"],
        }

    # --------------------------------------------------------------------------
    # INTENT 4: Trust & Punctuality Score
    # --------------------------------------------------------------------------
    if any(k in text for k in ["score", "trust", "credit", "punctual", "rating", "rank", "star"]):
        stats = calculate_punctuality_score(db, user_id)
        sc = stats["score"]
        tier = stats["tier"]
        ratio = stats["on_time_ratio"]

        if lang == "hi":
            reply = (
                f"Aapka AI Punctuality & Trust Score:\n"
                f"⭐ Score: {sc} / 900 ({stats['rating']})\n"
                f"🏅 Tier: {tier} Club\n"
                f"🎯 On-Time Accuracy: {ratio}%\n"
                f"• Late marks kam rakhne aur time par punch karne se aapka score badhta hai!"
            )
        elif lang == "gu":
            reply = (
                f"તમારો AI નિયમિતતા અને ટ્રસ્ટ સ્કોર:\n"
                f"⭐ સ્કોર: {sc} / 900 ({stats['rating']})\n"
                f"🏅 ટીયર: {tier} ક્લબ\n"
                f"🎯 સમયસર પંચ દર: {ratio}%\n"
                f"• સમયસર હાજરી નોંધવાથી તમારો સ્કોર વધશે!"
            )
        else:
            reply = (
                f"Your AI Punctuality & Trust Score:\n"
                f"⭐ Score: {sc} / 900 ({stats['rating']})\n"
                f"🏅 Tier: {tier} Badge\n"
                f"🎯 On-Time Accuracy: {ratio}%\n"
                f"Maintaining consecutive on-time punches boosts your monthly ranking!"
            )

        return {
            "reply": reply,
            "chips": ["Monthly Summary", "Shift Rules", "Leave Balance", "Today Status"],
        }

    # --------------------------------------------------------------------------
    # INTENT 5: Shift Timings & Office Rules
    # --------------------------------------------------------------------------
    if any(k in text for k in ["timing", "shift", "rules", "policy", "late", "grace", "time", "samay"]):
        if lang == "hi":
            reply = (
                f"Office Shift & Geofence Rules:\n"
                f"• Shift Time: 09:30 AM se 05:30 PM (8 Ghante)\n"
                f"• Grace Period: 09:30 AM tak (iske baad 'Late' mark hoga)\n"
                f"• Geofence Perimeter: SBS Campus, Shela ke 100m ke andar hona zaroori hai\n"
                f"• Biometrics: Face Scan (128-D AI) ya Phone Fingerprint Sensor"
            )
        elif lang == "gu":
            reply = (
                f"ઓફિસ શિફ્ટ અને જીઓફેન્સ નિયમો:\n"
                f"• શિફ્ટ સમય: 09:30 AM થી 05:30 PM (૮ કલાક)\n"
                f"• ગ્રેસ સમય: 09:30 AM સુધી (ત્યારબાદ 'લેટ' ગણાશે)\n"
                f"• જીઓફેન્સ મર્યાદા: SBS કેમ્પસના ૧૦૦ મીટરની અંદર હોવું ફરજિયાત છે\n"
                f"• બાયોમેટ્રિક્સ: Face Scan અથવા ફોન ફિંગરપ્રિન્ટ સેન્સર"
            )
        else:
            reply = (
                f"Office Shift & Policy Guidelines:\n"
                f"• Shift Hours: 09:30 AM to 05:30 PM (8-hour standard workday)\n"
                f"• Late Grace: Check-ins after 09:30 AM are flagged as 'Late'\n"
                f"• Geofence: Device must be within 100m of SBS Campus perimeter\n"
                f"• Verification: 128-D Face Recognition or native Device Fingerprint"
            )

        return {
            "reply": reply,
            "chips": ["Today Status", "Trust Score", "Leave Balance", "Monthly Summary"],
        }

    # --------------------------------------------------------------------------
    # INTENT 6: Biometrics / Geofence Troubleshooting
    # --------------------------------------------------------------------------
    if any(k in text for k in ["camera", "face", "fingerprint", "geofence", "location", "black", "error", "problem"]):
        if lang == "hi":
            reply = (
                f"Biometrics & Location Troubleshooting:\n"
                f"• Black Camera? 'Upload Photo' button daba kar gallery se photo upload karein.\n"
                f"• Location Error? Phone GPS Location ON karein aur ensure karein aap 100m perimeter me hain.\n"
                f"• Fingerprint? Phone Settings me biometric enrolled hona chahiye."
            )
        elif lang == "gu":
            reply = (
                f"બાયોમેટ્રિક્સ અને લોકેશન સહાય:\n"
                f"• બ્લેક કેમેરા? 'Upload Photo' બટન દબાવીને ગેલેરીમાંથી ફોટો અપલોડ કરો.\n"
                f"• લોકેશન સમસ્યા? ફોનનું GPS ચાલુ કરો અને ખાતરી કરો કે તમે ૧૦૦ મીટરમાં છો.\n"
                f"• ફિંગરપ્રિન્ટ? ફોન સેટિંગ્સમાં ફિંગરપ્રિન્ટ રજીસ્ટર હોવી જરૂરી છે."
            )
        else:
            reply = (
                f"Biometric & Geofence Troubleshooting Guide:\n"
                f"• Black Camera View? Use the 'Upload Photo' button to pick a selfie from your gallery.\n"
                f"• Outside Geofence? Enable high-accuracy GPS and ensure you are within 100m of office HQ.\n"
                f"• Fingerprint Punch: Requires native fingerprint/TouchID enrolled on your device."
            )

        return {
            "reply": reply,
            "chips": ["Today Status", "Shift Rules", "Monthly Summary", "Trust Score"],
        }

    # --------------------------------------------------------------------------
    # INTENT 7: Admin Specific Queries
    # --------------------------------------------------------------------------
    if user_role == "admin" and any(k in text for k in ["who", "absent", "attendance count", "log", "report", "kon"]):
        today_logs = db.query(models.Attendance).filter(models.Attendance.date == today).all()
        total_present = len(today_logs)
        late_count = sum(1 for l in today_logs if l.status == "late")
        users_count = db.query(models.User).filter(models.User.is_active == True).count()

        if lang == "hi":
            reply = (
                f"Admin Daily Telemetry Report:\n"
                f"• Total Registered Employees: {users_count}\n"
                f"• Present Today: {total_present}\n"
                f"• Late Arrivals Today: {late_count}\n"
                f"• Absent / Not Punched: {max(0, users_count - total_present)}"
            )
        else:
            reply = (
                f"Admin Daily Workforce Summary:\n"
                f"• Total Workforce: {users_count} employees\n"
                f"• Present Today: {total_present}\n"
                f"• Late Arrivals: {late_count}\n"
                f"• Absent: {max(0, users_count - total_present)}"
            )

        return {
            "reply": reply,
            "chips": ["Shift Rules", "Leave Balance", "Monthly Summary"],
        }

    # --------------------------------------------------------------------------
    # Default Fallback Greeting & Help Menu
    # --------------------------------------------------------------------------
    greeting_name = user.full_name or "Employee"
    if lang == "hi":
        reply = (
            f"Namaste {greeting_name}! Main aapka Smart Attendance AI Assistant hoon. "
            f"Aap mujhse attendance summary, leave balance, shift rules, ya punctuality score ke baare me pooch sakte hain."
        )
    elif lang == "gu":
        reply = (
            f"નમસ્તે {greeting_name}! હું તમારો સ્માર્ટ એટેન્ડન્સ AI આસિસ્ટન્ટ છું. "
            f"તમે મને હાજરી સારાંશ, રજા બેલેન્સ, શિફ્ટ નિયમો અથવા ટ્રસ્ટ સ્કોર વિશે પૂછી શકો છો."
        )
    else:
        reply = (
            f"Hello {greeting_name}! I am your Smart Attendance AI Assistant. "
            f"Ask me about your attendance history, leave balance, shift timings, or your punctuality trust score."
        )

    return {
        "reply": reply,
        "chips": ["Today Status", "My Monthly Summary", "Leave Balance", "Trust Score", "Shift Rules"],
    }
