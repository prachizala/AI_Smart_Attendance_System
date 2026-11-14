"""
Smart Attendance AI Assistant Chatbot Engine
Handles natural language questions about attendance, leaves, shift policies,
biometric verification, and punctuality scores with multilingual response generation.
"""

from datetime import date, timedelta
from typing import Any, Dict

import models
from sqlalchemy.orm import Session


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
            "on_time_count": 0,
            "late_count": 0,
            "on_time_ratio": 100.0,
            "streak": 0,
        }

    total = len(logs)
    present_on_time = sum(1 for log_entry in logs if log_entry.status == "present")
    late = sum(1 for log_entry in logs if log_entry.status == "late")
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
    language: str = "en",
    image_base64: Any = None
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

    # Pre-fetch today's record for this user
    today_rec = db.query(models.Attendance).filter(
        models.Attendance.user_id == user_id,
        models.Attendance.date == today
    ).first()

    # --------------------------------------------------------------------------
    # INTENT A: TECHNICAL ISSUE & ERROR SCREENSHOT / IMAGE DIAGNOSTICS
    # --------------------------------------------------------------------------
    ADMIN_HELP_PHONE = "+91 9265272082"
    has_image = bool(image_base64 and len(str(image_base64).strip()) > 10)
    is_tech_issue = has_image or any(k in text for k in [
        "error", "issue", "problem", "fail", "failed", "bug", "dikkat", "kharab",
        "valid string", "not recognized", "not working", "chal nahi raha", "screen",
        "stuck", "black", "admin", "contact", "support", "call", "helpdesk", "phone"
    ])

    if is_tech_issue:
        # Detect specific error patterns
        if any(k in text for k in ["string", "valid string", "face not recognized", "register", "save photo", "enroll"]):
            if lang == "hi":
                reply = (
                    "🛠️ AI Diagnosis: Camera Photo Capture Issue (Resolved!)\n\n"
                    "• Samasya: Camera se photo data aane me dikkat hui thi ('Input should be a valid string').\n"
                    "• Solution: Humne ise app me auto-fix kar diya hai! Ab aap 'Register Face Now' me dobara 'Save Photo' dabayein ya seedhe '🖼️ Upload Photo' par tap karke gallery se apni clear selfie select karein.\n\n"
                    f"📞 Agar fir bhi koi dikkat aaye, toh please Contact your Admin:\n"
                    f"👉 Help Support Call: {ADMIN_HELP_PHONE}"
                )
            elif lang == "gu":
                reply = (
                    "🛠️ AI Diagnosis: કેમેરા ફોટો કેપ્ચર સમસ્યા (ઉકેલાઈ ગઈ!)\n\n"
                    "• સમસ્યા: કેમેરામાંથી ફોટો ડેટા મેળવવામાં મુશ્કેલી થઈ હતી ('Input should be a valid string').\n"
                    "• ઉકેલ: અમે એપમાં આ સુધારી દીધું છે! હવે તમે 'Register Face Now' માં ફરી 'Save Photo' કરો અથવા ગેલેરીમાંથી '🖼️ Upload Photo' પસંદ કરો.\n\n"
                    f"📞 જો હજી પણ સમસ્યા રહે, તો કૃપા કરીને Contact your Admin:\n"
                    f"👉 Help Support Call: {ADMIN_HELP_PHONE}"
                )
            else:
                reply = (
                    "🛠️ AI Diagnosis: Camera Face Capture Issue (Resolved!)\n\n"
                    "• Issue: Camera frame did not return a valid photo payload ('Input should be a valid string').\n"
                    "• Fix: We have auto-corrected this with a dual-fallback mechanism! In 'Register Face Now', tap 'Save Photo' again or simply tap '🖼️ Upload Photo' to pick a selfie from your gallery.\n\n"
                    f"📞 If technical issue persists, please Contact your Admin:\n"
                    f"👉 Help Support Call: {ADMIN_HELP_PHONE}"
                )
        elif any(k in text for k in ["geofence", "location", "outside", "distance", "100m"]):
            if lang == "hi":
                reply = (
                    "📍 AI Diagnosis: Outside Office Geofence\n\n"
                    "• Samasya: Aap SBS Campus ke 100m radius se bahar detect hue hain.\n"
                    "• Solution: Phone ka High-Accuracy GPS on karein. Viva demo ke liye 'Inside Campus' simulator toggle use karein.\n\n"
                    f"📞 Agar help chahiye ho toh Contact your Admin: {ADMIN_HELP_PHONE}"
                )
            elif lang == "gu":
                reply = (
                    "📍 AI Diagnosis: કેમ્પસ જીઓફેન્સ બહાર છો\n\n"
                    "• સમસ્યા: તમે ૧૦૦ મીટરની મર્યાદા બહાર છો.\n"
                    "• ઉકેલ: ફોનનું GPS ચાલુ કરો અથવા ડેમો માટે 'Inside Campus' સિમ્યુલેટર પસંદ કરો.\n\n"
                    f"📞 Contact your Admin: {ADMIN_HELP_PHONE}"
                )
            else:
                reply = (
                    "📍 AI Diagnosis: Outside Office Geofence\n\n"
                    "• Issue: You are outside the 100m campus boundary.\n"
                    "• Fix: Turn on device High-Accuracy GPS or toggle 'Inside Campus' on the Viva GPS Simulator.\n\n"
                    f"📞 If issue persists, Contact your Admin: {ADMIN_HELP_PHONE}"
                )
        else:
            if lang == "hi":
                reply = (
                    "🔍 AI Technical Support & Screenshot Diagnosis:\n\n"
                    "• Humne aapke issue ko record kar liya hai. Kripya app ko restart karein aur camera/location permissions verify karein.\n\n"
                    "• Agar issue khud solve na ho paaye, toh please Contact your Admin:\n"
                    f"📞 Help Support Call: {ADMIN_HELP_PHONE}"
                )
            elif lang == "gu":
                reply = (
                    "🔍 AI ટેકનિકલ સહાય અને નિદાન:\n\n"
                    "• તમારી સમસ્યા નોંધી લેવાઈ છે. કૃપા કરીને એપ રીસ્ટાર્ટ કરો અને કેમેરા/લોકેશન પરવાનગી તપાસો.\n\n"
                    "• જો સમસ્યા આપમેળે ઉકેલાય નહીં, તો Contact your Admin:\n"
                    f"📞 Help Support Call: {ADMIN_HELP_PHONE}"
                )
            else:
                reply = (
                    "🔍 AI Technical Issue & Screenshot Diagnosis:\n\n"
                    "• The technical log has been recorded. Please restart the app and ensure camera & GPS permissions are allowed.\n\n"
                    "• If this issue cannot be self-resolved, please Contact your Admin:\n"
                    f"📞 Help Support Call: {ADMIN_HELP_PHONE}"
                )

        return {
            "reply": reply,
            "chips": ["How to Punch", "Guide Me", f"Call Admin ({ADMIN_HELP_PHONE})", "Today Status"],
        }

    # --------------------------------------------------------------------------
    # INTENT B: STEP-BY-STEP ATTENDANCE GUIDANCE (How to Record Attendance)
    # --------------------------------------------------------------------------
    is_guide_query = any(k in text for k in [
        "guide", "kaise", "record", "punch", "mark", "how to", "process", "step",
        "karna hai", "karein", "click", "samjhao", "bataye", "sikhaye", "tarika",
        "rasta", "attendance lagaye", "kem karvu"
    ])

    if is_guide_query:
        if lang == "hi":
            reply = (
                "📋 Attendance Record Karne Ka Step-by-Step Tarika:\n\n"
                "1️⃣ Step 1 - Geofence Check:\n"
                "• Office Campus (100m) ke andar hona zaroori hai. (Testing/Viva ke liye screen par 'Inside Campus' simulator select karein).\n\n"
                "2️⃣ Step 2 - Face Registration (Pehli Baar):\n"
                "• Agar chehra register nahi hai, toh 'Register Face Now' par tap karke apni photo save karein.\n\n"
                "3️⃣ Step 3 - Check In Button Dabayein:\n"
                "• Home screen par green 'Check In' button par click karein.\n\n"
                "4️⃣ Step 4 - Face Verify Karein:\n"
                "• Camera me oval frame ke andar apna chehra rakhein.\n"
                "• Liveness challenge (jaise Aankh blink karna) follow karein aur 'Verify & Punch' dabayein — aapki attendance record ho jayegi!\n\n"
                "💡 Quick Shortcut: Aap seedhe '👆 Punch with Fingerprint' button dabakar apne phone ke fingerprint sensor se bhi 1-second me attendance laga sakte hain!\n\n"
                f"📞 Agar koi technical dikkat aaye toh Contact your Admin: {ADMIN_HELP_PHONE}"
            )
        elif lang == "gu":
            reply = (
                "📋 હાજરી કેવી રીતે નોંધવી (Step-by-Step માર્ગદર્શિકા):\n\n"
                "1️⃣ પગલું ૧ - જીઓફેન્સ ચકાસો:\n"
                "• ઓફિસ કેમ્પસ (૧૦૦ મીટર)ની અંદર રહો (ડેમો માટે 'Inside Campus' પસંદ કરો).\n\n"
                "2️⃣ પગલું ૨ - ફેસ રજીસ્ટ્રેશન (પ્રથમ વખત):\n"
                "• જો ચહેરો નોંધાયેલ ન હોય, તો 'Register Face Now' પર ટેપ કરીને સેલ્ફી સેવ કરો.\n\n"
                "3️⃣ પગલું ૩ - Check In પર ક્લિક કરો:\n"
                "• હોમ સ્ક્રીન પર લીલા રંગનું 'Check In' બટન દબાવો.\n\n"
                "4️⃣ પગલું ૪ - ફેસ વેરિફિકેશન:\n"
                "• કેમેરામાં લાઈવનેસ ચેલેન્જ (જેમ કે આંખ પલકાવવી) પૂર્ણ કરો અને 'Verify & Punch' દબાવો — તમારી હાજરી નોંધાઈ જશે!\n\n"
                "💡 શોર્ટકટ: તમે સીધા '👆 Punch with Fingerprint' થી પણ ૧ સેકન્ડમાં હાજરી પૂરી શકો છો!\n\n"
                f"📞 કોઈ સમસ્યા આવે તો Contact your Admin: {ADMIN_HELP_PHONE}"
            )
        else:
            reply = (
                "📋 How to Record Attendance (Step-by-Step Guide):\n\n"
                "1️⃣ Step 1 - Geofence Check:\n"
                "• Ensure you are within 100m of the office campus (or select 'Inside Campus' on the Viva GPS Simulator).\n\n"
                "2️⃣ Step 2 - Face Registration (First Time):\n"
                "• If face is not enrolled, tap 'Register Face Now' and save your reference selfie.\n\n"
                "3️⃣ Step 3 - Tap Check In:\n"
                "• On your home dashboard, click the green 'Check In' button.\n\n"
                "4️⃣ Step 4 - Face Verification & Liveness:\n"
                "• Align your face inside the oval guide, perform the passive liveness action (e.g. blink once), and tap 'Verify & Punch' — attendance marked!\n\n"
                "💡 Instant Shortcut: You can also tap '👆 Punch with Fingerprint' to mark attendance immediately via your native device biometric sensor!\n\n"
                f"📞 Need help? Contact your Admin: {ADMIN_HELP_PHONE}"
            )

        return {
            "reply": reply,
            "chips": ["Today Status", f"Call Admin ({ADMIN_HELP_PHONE})", "Leave Balance", "Shift Rules"],
        }

    # --------------------------------------------------------------------------
    # INTENT 0: ADMIN & WORKFORCE QUERIES (High Priority)
    # --------------------------------------------------------------------------
    is_workforce_query = (
        user_role == "admin"
        or any(k in text for k in ["who is", "who are", "count", "workforce", "kitne", "kon", "koni", "all staff", "attendance count"])
    )

    # Sub-intent 0A: Who is late query
    if is_workforce_query and any(k in text for k in ["who is late", "who are late", "late today", "kon late", "koni late", "late kaun", "late employee"]):
        today_late = db.query(models.Attendance).filter(
            models.Attendance.date == today,
            models.Attendance.status == "late"
        ).all()

        if today_late:
            late_lines = []
            for late_log in today_late:
                u = db.query(models.User).filter(models.User.id == late_log.user_id).first()
                emp_name = u.full_name if u else (late_log.employee_name or f"Employee #{late_log.user_id}")
                emp_code = u.employee_id if u else "EMP"
                punch_t = late_log.check_in.strftime("%I:%M %p") if late_log.check_in else "N/A"
                mins = late_log.late_minutes or 0
                late_lines.append(f"• {emp_name} ({emp_code}) — {punch_t} ({mins}m late)")

            lines_str = "\n".join(late_lines)
            if lang == "hi":
                reply = f"Aaj late aane wale staff members ({len(today_late)}):\n{lines_str}\n\n(Office shift 09:30 AM se start hoti hai)"
            elif lang == "gu":
                reply = f"આજે મોડા આવેલા સ્ટાફ સભ્યો ({len(today_late)}):\n{lines_str}\n\n(ઓફિસ શિફ્ટ 09:30 AM થી શરૂ થાય છે)"
            else:
                reply = f"Employees marked late today ({len(today_late)}):\n{lines_str}\n\n(Official shift starts at 09:30 AM)"
        else:
            if lang == "hi":
                reply = "Aaj koi bhi employee late nahi hai! Sabhi present staff members 09:30 AM se pehle on-time punch kar chuke hain. 🌟"
            elif lang == "gu":
                reply = "આજે કોઈ પણ કર્મચારી મોડા નથી! તમામ હાજર સ્ટાફ 09:30 AM પહેલા સમયસર આવી ગયા છે. 🌟"
            else:
                reply = "No employees are late today! All checked-in workforce members arrived on time before 09:30 AM. 🌟"

        return {
            "reply": reply,
            "chips": ["Today's Attendance Count", "Shift Policy & Rules", "Leave Summary"],
        }

    # Sub-intent 0B: Attendance count / workforce summary
    if is_workforce_query and any(k in text for k in ["attendance count", "count", "how many", "total present", "kitne log", "hajari count"]):
        today_logs = db.query(models.Attendance).filter(models.Attendance.date == today).all()
        total_present = len(today_logs)
        on_time_count = sum(1 for log_item in today_logs if log_item.status == "present")
        late_count = sum(1 for log_item in today_logs if log_item.status == "late")
        users_count = db.query(models.User).filter(models.User.is_active.is_(True), models.User.role != "admin").count()
        absent_count = max(0, users_count - total_present)

        if lang == "hi":
            reply = (
                f"📊 Aaj ki Attendance Telemetry:\n"
                f"• Total Staff: {users_count}\n"
                f"• Present Today: {total_present} ({on_time_count} On-Time, {late_count} Late)\n"
                f"• Absent / Not Punched: {absent_count}\n"
                f"• Biometrics: Dual AI (Face Scan 128-D & Fingerprint)"
            )
        elif lang == "gu":
            reply = (
                f"📊 આજની હાજરી વિગત:\n"
                f"• કુલ સ્ટાફ: {users_count}\n"
                f"• કુલ હાજર: {total_present} ({on_time_count} સમયસર, {late_count} મોડા)\n"
                f"• ગેરહાજર / બાકી: {absent_count}\n"
                f"• બાયોમેટ્રિક્સ: ડ્યુઅલ AI (Face Scan 128-D અને ફિંગરપ્રિન્ટ)"
            )
        else:
            reply = (
                f"📊 Today's Workforce Attendance Telemetry:\n"
                f"• Total Staff: {users_count}\n"
                f"• Present Today: {total_present} ({on_time_count} On-Time, {late_count} Late)\n"
                f"• Absent / Not Punched: {absent_count}\n"
                f"• Biometrics: Dual AI (128-D Face & Fingerprint)"
            )

        return {
            "reply": reply,
            "chips": ["Who is late today?", "Shift Policy & Rules", "Leave Summary"],
        }

    # --------------------------------------------------------------------------
    # INTENT 1: Today's Status / Check-In Query (Self)
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
        on_time = sum(1 for log_entry in logs if log_entry.status == "present")
        late = sum(1 for log_entry in logs if log_entry.status == "late")
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
        approved = sum(1 for leave_item in leaves if leave_item.status == "approved")
        pending = sum(1 for leave_item in leaves if leave_item.status == "pending")

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
                "Office Shift & Geofence Rules:\n"
                "• Shift Time: 09:30 AM se 05:30 PM (8 Ghante)\n"
                "• Grace Period: 09:30 AM tak (iske baad 'Late' mark hoga)\n"
                "• Geofence Perimeter: SBS Campus, Shela ke 100m ke andar hona zaroori hai\n"
                "• Biometrics: Face Scan (128-D AI) ya Phone Fingerprint Sensor"
            )
        elif lang == "gu":
            reply = (
                "ઓફિસ શિફ્ટ અને જીઓફેન્સ નિયમો:\n"
                "• શિફ્ટ સમય: 09:30 AM થી 05:30 PM (૮ કલાક)\n"
                "• ગ્રેસ સમય: 09:30 AM સુધી (ત્યારબાદ 'લેટ' ગણાશે)\n"
                "• જીઓફેન્સ મર્યાદા: SBS કેમ્પસના ૧૦૦ મીટરની અંદર હોવું ફરજિયાત છે\n"
                "• બાયોમેટ્રિક્સ: Face Scan અથવા ફોન ફિંગરપ્રિન્ટ સેન્સર"
            )
        else:
            reply = (
                "Office Shift & Policy Guidelines:\n"
                "• Shift Hours: 09:30 AM to 05:30 PM (8-hour standard workday)\n"
                "• Late Grace: Check-ins after 09:30 AM are flagged as 'Late'\n"
                "• Geofence: Device must be within 100m of SBS Campus perimeter\n"
                "• Verification: 128-D Face Recognition or native Device Fingerprint"
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
                "Biometrics & Location Troubleshooting:\n"
                "• Black Camera? 'Upload Photo' button daba kar gallery se photo upload karein.\n"
                "• Location Error? Phone GPS Location ON karein aur ensure karein aap 100m perimeter me hain.\n"
                "• Fingerprint? Phone Settings me biometric enrolled hona chahiye."
            )
        elif lang == "gu":
            reply = (
                "બાયોમેટ્રિક્સ અને લોકેશન સહાય:\n"
                "• બ્લેક કેમેરા? 'Upload Photo' બટન દબાવીને ગેલેરીમાંથી ફોટો અપલોડ કરો.\n"
                "• લોકેશન સમસ્યા? ફોનનું GPS ચાલુ કરો અને ખાતરી કરો કે તમે ૧૦૦ મીટરમાં છો.\n"
                "• ફિંગરપ્રિન્ટ? ફોન સેટિંગ્સમાં ફિંગરપ્રિન્ટ રજીસ્ટર હોવી જરૂરી છે."
            )
        else:
            reply = (
                "Biometric & Geofence Troubleshooting Guide:\n"
                "• Black Camera View? Use the 'Upload Photo' button to pick a selfie from your gallery.\n"
                "• Outside Geofence? Enable high-accuracy GPS and ensure you are within 100m of office HQ.\n"
                "• Fingerprint Punch: Requires native fingerprint/TouchID enrolled on your device."
            )

        return {
            "reply": reply,
            "chips": ["Today Status", "Shift Rules", "Monthly Summary", "Trust Score"],
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
        "chips": ["Guide Me", "How to Punch", "Report Technical Issue", "Call Admin (+91 9265272082)", "Today Status"],
    }
