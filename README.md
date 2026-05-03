```markdown
# 🎓 EduSmart – Smart Attendance & Student Management System

EduSmart is a full-stack web application built to simplify academic management for students and teachers. It provides a centralized dashboard for handling attendance, assignments, submissions, notes, announcements, and marks in a seamless and interactive way.

---

## 📌 Overview

EduSmart streamlines daily academic workflows by enabling:
- Students to track and manage their academic activities in one place
- Teachers to efficiently control attendance, assignments, and performance data
- Real-time interaction between frontend and backend without page reloads

---

## ✨ Features

### 👨‍🎓 Student Dashboard
- 📊 Attendance overview with circular graph
- 📅 Mark attendance (controlled by teacher)
- 📂 View and download assignments
- 📤 Submit assignments with file upload
- 🗑️ Delete submitted assignments
- 📈 Track submission progress
- 📚 Access notes and study material
- 📢 View announcements
- 📊 View marks breakdown
- 🔔 Notifications panel

---

### 👩‍🏫 Teacher Dashboard
- ➕ Upload assignments and notes
- 🗑️ Delete assignments and notes
- 📅 Schedule classes
- 🎯 Enable/disable attendance system
- 📢 Post announcements
- 📊 Enter and update marks
- 👥 View student submissions

---

## 🛠️ Tech Stack

**Frontend**
- HTML5
- CSS3
- JavaScript (Vanilla JS)
- Chart.js

**Backend**
- Python (Flask)

**Database**
- SQLite3

**Other**
- Werkzeug (file handling)
- LocalStorage (session-like behavior)

---

## ⚙️ How It Works

- Users log in as student or teacher
- Students access a personalized dashboard
- Teachers manage academic data and system controls
- Data is handled via Flask APIs and stored in SQLite
- UI updates dynamically without refreshing the page

---

## 📁 Project Structure

```

smart-attendence-system/
│
├── static/
│   ├── student.js
│   ├── teacher.js
│   └── style.css
│
├── templates/
│   ├── index.html
│   ├── student.html
│   ├── teacher.html
│   └── change_password.html
│
├── uploads/
├── database.db
├── app.py
├── students.csv
├── teacher.csv
├── requirements.txt
└── README.md

```

---

## 🚀 Setup Instructions

### 1. Clone the repository
```

git clone [https://github.com/jyotibagdi-07/smart-attendence-system.git](https://github.com/jyotibagdi-07/smart-attendence-system.git)
cd smart-attendence-system

```

### 2. Create virtual environment
```

python -m venv venv
source venv/bin/activate

```

### 3. Install dependencies
```

pip install -r requirements.txt

```

### 4. Run the server
```

python app.py

```

### 5. Open in browser
```

[http://localhost:5003](http://localhost:5003)

```

---

## 📊 Highlights

- Real-time UI updates without page reload
- Interactive dashboards with data visualization
- Secure file upload and management
- Clean and modular code structure
- Scalable backend using Flask

---

## 🚧 Future Improvements

- Authentication using JWT
- Role-based access control
- Cloud storage integration
- Email notifications
- Fully responsive mobile UI

---

## 👩‍💻 Author

Lavanya Gupta  
https://github.com/lavanyagupta-coder  

---

## ⭐ Support

If you found this project useful, consider giving it a ⭐ on GitHub.
```

---

## ✅ requirements.txt

```txt
Flask>=3.0.0
Werkzeug>=3.0.0
gunicorn>=21.2.0
```

