# 🏛️ Architecture FAQ: AI Smart Attendance System

## Q1: How does Haversine GPS Geofencing prevent attendance spoofing?
The system calculates the great-circle distance between the user's mobile device coordinates $(\text{lat}_1, \text{lon}_1)$ and the authorized workplace office perimeter $(\text{lat}_2, \text{lon}_2)$ using the spherical law of cosines:
$$d = 2r \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lon}}{2}\right)}\right)$$
If $d \le 100\text{ meters}$, the geofence perimeter verification returns `True`.

---

## Q2: How does the offline punch queue function?
When network connectivity is unavailable, the React Native client buffers check-in transactions in a secure local SQLite table with device timestamp signatures. Upon reconnecting, the client flushes queued punches to the FastAPI `/api/v1/attendance/sync` endpoint in FIFO order.
