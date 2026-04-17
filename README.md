# RESIFLOW — Hostel Management System

A full-stack hostel management platform that integrates secure attendance , complaint and fine workflows, resource sharing, guest room booking, and a RAG-based chatbot for contextual assistance.

---

## 🚀 What This Actually Solves

Hostel systems are:
- Manual and inefficient  
- Hard to track attendance and complaints  
- Lacking centralized coordination  

This system provides:
- Centralized hostel management  
- Structured workflows for students and caretakers  
- Secure and trackable operations  

---

## ⚙️ Core Features

### Authentication
- User registration and login  
- Role-based access (Student / Caretaker)  

### Attendance Tracking
- Location-based attendance marking (within hostel premises)  
- OTP verification via email (SMTP) after location detection  
- Dual validation ensures authenticity  
- Caretaker visibility for monitoring  

### Resource Sharing
- Peer-to-peer lending and borrowing  
- Request and response workflow  
- Status tracking  

### Lost & Found
- Report lost items  
- Browse found items  
- Claim verification system  

### Complaint Management
- Categorized complaint submission  
- Priority-based resolution workflow  
- Status tracking (Pending → In Progress → Resolved)  

### Fine System
- Assign fines for rule violations  
- Track penalties per student  
- Maintain payment status  

### Guest Room Booking
- Room availability tracking  
- Booking lifecycle management  
- Status updates (Pending → Approved → Checked-in → Checked-out)  

### RAG-Based Chatbot
- Context-aware assistant  
- Uses hostel data for accurate responses  
- Helps with queries about rules, bookings, and services  

---

## 🏗️ System Flow

User → Authentication → Feature Module → Backend API → Database → Response → UI  

---

## 📁 Project Structure

resiflow/  
├── client/              # React frontend  
│   ├── src/  
│   ├── components/  
│   └── pages/  
│  
├── server/              # Node.js backend  
│   ├── routes/  
│   ├── controllers/  
│   ├── db.js  
│   └── server.js  
│  
└── README.md  

---

## 🛠️ Tech Stack

Frontend:
- React  
- Vite  
- Axios  

Backend:
- Node.js  
- Express  

Database:
- PostgreSQL  

Other:
- bcrypt (authentication)  
- Multer (file uploads)  
- geolib (location validation)  
- SMTP (OTP email verification)  

AI / NLP:
- RAG-based chatbot  

---

## 🚀 Setup

git clone https://github.com/yourusername/resiflow.git  
cd resiflow  

# Backend  
cd server  
npm install  
npm start  

# Frontend  
cd ../client  
npm install  
npm run dev  

---

## 🔧 Environment Variables

Backend (.env):

DB_USER=postgres  
DB_PASSWORD=your_password  
DB_HOST=localhost  
DB_PORT=5432  
DB_NAME=hackbyte  
PORT=5000  

---

## 🧪 How to Test

- Register/Login  
- Mark attendance (location + OTP verification)  
- Create and respond to resource requests  
- Submit complaints and track resolution  
- Assign and view fines  
- Interact with chatbot  
- Book guest rooms and track status  

---

## 💡 Future Improvements

- Deploy with scalable backend infrastructure  
- Add WebSocket-based real-time updates  
- Implement fine-grained RBAC  
- Add notification system (email/SMS)  
- Improve chatbot retrieval and context handling  
- Optimize database queries and indexing  
- Add mobile application support  

---

## 📌 Why This Project Matters

This project demonstrates:
- Full-stack system design  
- REST API development  
- Database schema and workflow modeling  
- Secure validation (location + OTP)  
- AI integration (RAG-based chatbot)  

---

## 👥 Contributors

- Gonuguntala Jaikar Ramu — https://github.com/viperxjaikar
- bravichandra12 — https://github.com/bravichandra12   
- abhinavgannoju — https://github.com/abhinavgannoju  
- koushik1974 — https://github.com/koushik1974  

---

## ⭐ Star if useful
