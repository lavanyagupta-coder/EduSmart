from flask import Flask, render_template, request, jsonify, send_from_directory
import sqlite3, os, csv
from datetime import datetime
from werkzeug.utils import secure_filename

app = Flask(__name__)

# ================= GLOBAL =================
attendance_enabled = True

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ================= DB INIT =================
def init_db():
    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    # ================= USERS =================
    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        enrollment TEXT UNIQUE,
        password TEXT,
        role TEXT
    )''')

    # ================= CLASS =================
    c.execute('''CREATE TABLE IF NOT EXISTS class_schedule (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS class_attendance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        class_date TEXT
    )''')

    # ================= ASSIGNMENTS =================
    c.execute('''CREATE TABLE IF NOT EXISTS assignments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT,
        time TEXT
    )''')

    # ================= NOTES =================
    c.execute('''CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT,
        filename TEXT,
        time TEXT
    )''')

    # ================= ANNOUNCEMENTS =================
    c.execute('''CREATE TABLE IF NOT EXISTS announcements (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message TEXT,
        time TEXT,
        posted_by TEXT DEFAULT 'Teacher'
    )''')

    # Backward compatibility for existing DBs
    c.execute("PRAGMA table_info(announcements)")
    cols = [row[1] for row in c.fetchall()]
    if "posted_by" not in cols:
        c.execute("ALTER TABLE announcements ADD COLUMN posted_by TEXT DEFAULT 'Teacher'")

    # ================= MARKS =================
    c.execute('''CREATE TABLE IF NOT EXISTS marks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        mid INTEGER,
        end INTEGER,
        cap INTEGER,
        lab INTEGER
    )''')

    # ================= SUBMISSIONS =================
    c.execute('''CREATE TABLE IF NOT EXISTS submissions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_name TEXT,
        assignment_title TEXT,
        filename TEXT,
        time TEXT
    )''')

    # ================= LOAD USERS FROM CSV =================
    # students
    with open("students.csv", "r") as file:
        reader = csv.reader(file)
        next(reader)

        for row in reader:
            if len(row) < 3:
                continue

            name = row[0]
            enrollment = row[1]
            password = row[2]

            c.execute("""
                INSERT OR IGNORE INTO users (name, enrollment, password, role)
                VALUES (?, ?, ?, ?)
            """, (name, enrollment, password, "student"))

    # teachers
    with open("teacher.csv", "r") as file:
        reader = csv.reader(file)
        next(reader)

        for row in reader:
            if len(row) < 4:
                continue

            name = row[0]
            enrollment = row[1]
            password = row[2]
            role = row[3]

            c.execute("""
                INSERT OR IGNORE INTO users (name, enrollment, password, role)
                VALUES (?, ?, ?, ?)
            """, (name, enrollment, password, role))

    conn.commit()
    conn.close()


# ================= ROUTES =================
@app.route('/')
def home():
    return render_template("index.html")

@app.route('/student')
def student():
    return render_template("student.html")

@app.route('/teacher')
def teacher():
    return render_template("teacher.html")

@app.route('/change-password')
def change_password():
    return render_template("change_password.html")


# ================= LOGIN =================
@app.route('/login', methods=['POST'])
def login():
    data = request.json

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("""
        SELECT * FROM users 
        WHERE enrollment=? AND password=? AND role=?
    """, (data['enrollment'], data['password'], data['role']))

    user = c.fetchone()
    conn.close()

    if user:
        return jsonify({
            "name": user[1],
            "redirect": "/teacher" if data['role']=="teacher" else "/student"
        })

    return jsonify({"message": "Invalid credentials ❌"})


# ================= ATTENDANCE CONTROL =================
@app.route('/toggle_attendance', methods=['POST'])
def toggle_attendance():
    global attendance_enabled
    attendance_enabled = not attendance_enabled
    return jsonify({"enabled": attendance_enabled})


@app.route('/attendance_flag')
def attendance_flag():
    return jsonify({"enabled": attendance_enabled})


# ================= CLASS SCHEDULE =================
@app.route('/schedule_class', methods=['POST'])
def schedule_class():

    data = request.json
    date = data['date']

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("INSERT OR IGNORE INTO class_schedule (date) VALUES (?)", (date,))

    conn.commit()
    conn.close()

    return jsonify({"message": "Class scheduled ✅"})


@app.route('/get_schedule')
def get_schedule():

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM class_schedule ORDER BY date DESC")
    data = c.fetchall()

    conn.close()
    return jsonify(data)


# ================= CLASS ATTENDANCE =================
@app.route('/mark_class_attendance', methods=['POST'])
def mark_class_attendance():

    global attendance_enabled

    if not attendance_enabled:
        return jsonify({"status":"error","message": "Attendance is OFF ❌"})

    data = request.json
    name = data['name']
    class_date = data['date']

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM class_schedule WHERE date=?", (class_date,))
    if not c.fetchone():
        return jsonify({"status":"error","message": "No class scheduled ❌"})

    c.execute("""
        SELECT * FROM class_attendance 
        WHERE name=? AND class_date=?
    """, (name, class_date))

    if c.fetchone():
        return jsonify({"status":"warning","message": "Already marked ⚠️"})

    c.execute("""
        INSERT INTO class_attendance (name, class_date)
        VALUES (?, ?)
    """, (name, class_date))

    conn.commit()
    conn.close()

    return jsonify({"status":"success","message": "Attendance marked ✅"})


# ✅🔥 NEW ROUTE (CRITICAL FIX)
@app.route('/get_my_attendance/<name>')
def get_my_attendance(name):

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("""
        SELECT name, class_date 
        FROM class_attendance 
        WHERE name=?
    """, (name,))

    data = c.fetchall()

    conn.close()
    return jsonify(data)


@app.route('/get_class_attendance')
def get_class_attendance():

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM class_attendance")
    data = c.fetchall()

    conn.close()
    return jsonify(data)


# ================= STUDENTS =================
@app.route('/get_students')
def get_students():

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT name, enrollment FROM users WHERE role='student'")
    data = c.fetchall()

    conn.close()
    return jsonify(data)


# ================= ASSIGNMENTS =================
@app.route('/upload_assignment', methods=['POST'])
def upload_assignment():

    file = request.files['file']
    title = request.form['title']
    desc = request.form.get('desc', '')

    filename = secure_filename(file.filename)
    file.save(os.path.join(UPLOAD_FOLDER, filename))

    time_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("""
        INSERT INTO assignments (title, filename, time)
        VALUES (?, ?, ?)
    """, (title + " - " + desc, filename, time_now))

    conn.commit()
    conn.close()

    return jsonify({"message": "Assignment uploaded ✅"})


@app.route('/get_assignments')
def get_assignments():

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM assignments ORDER BY id DESC")
    data = c.fetchall()

    conn.close()
    return jsonify(data)
@app.route('/delete_assignment', methods=['POST'])
def delete_assignment():

    data = request.json
    assignment_id = data.get('assignment_id')

    if not assignment_id:
        return jsonify({"status": "error", "message": "Invalid assignment ❌"}), 400

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT filename FROM assignments WHERE id=?", (assignment_id,))
    row = c.fetchone()

    if not row:
        conn.close()
        return jsonify({"status": "error", "message": "Assignment not found ❌"}), 404

    filename = row[0]

    c.execute("DELETE FROM assignments WHERE id=?", (assignment_id,))
    conn.commit()

    # Delete file only when no other record references it.
    c.execute("SELECT COUNT(*) FROM assignments WHERE filename=?", (filename,))
    assignment_count = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM submissions WHERE filename=?", (filename,))
    submission_count = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM notes WHERE filename=?", (filename,))
    notes_count = c.fetchone()[0]

    conn.close()

    if assignment_count == 0 and submission_count == 0 and notes_count == 0:
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)

    return jsonify({"status": "success", "message": "Assignment deleted ✅"})
@app.route('/get_submissions')

def get_submissions():

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM submissions ORDER BY id DESC")
    data = c.fetchall()

    conn.close()
    return jsonify(data)
@app.route('/submit_assignment', methods=['POST'])
def submit_assignment():

    file = request.files['file']
    student = request.form['name']
    title = request.form['title']

    filename = secure_filename(file.filename)
    file.save(os.path.join(UPLOAD_FOLDER, filename))

    time_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("""
        INSERT INTO submissions (student_name, assignment_title, filename, time)
        VALUES (?, ?, ?, ?)
    """, (student, title, filename, time_now))

    conn.commit()
    conn.close()

    return jsonify({"message": "Submitted ✅"})
    # =================delete_submission  =================
@app.route('/delete_submission', methods=['POST'])
def delete_submission():

    data = request.json
    submission_id = data.get('submission_id')
    student_name = data.get('name')

    if not submission_id or not student_name:
        return jsonify({"status": "error", "message": "Invalid request ❌"}), 400

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("""
        SELECT filename FROM submissions
        WHERE id=? AND student_name=?
    """, (submission_id, student_name))
    row = c.fetchone()

    if not row:
        conn.close()
        return jsonify({"status": "error", "message": "Submission not found ❌"}), 404

    filename = row[0]

    c.execute("DELETE FROM submissions WHERE id=? AND student_name=?",
              (submission_id, student_name))
    conn.commit()

    # Delete file only when no other record references it.
    c.execute("SELECT COUNT(*) FROM submissions WHERE filename=?", (filename,))
    submission_count = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM assignments WHERE filename=?", (filename,))
    assignment_count = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM notes WHERE filename=?", (filename,))
    notes_count = c.fetchone()[0]

    conn.close()

    if submission_count == 0 and assignment_count == 0 and notes_count == 0:
        file_path = os.path.join(UPLOAD_FOLDER, filename)
        if os.path.exists(file_path):
            os.remove(file_path)

    return jsonify({"status": "success", "message": "Submission deleted ✅"})


# ================= NOTES =================
@app.route('/upload_notes', methods=['POST'])
def upload_notes():

    file = request.files['file']
    title = request.form['title']

    filename = secure_filename(file.filename)
    file.save(os.path.join(UPLOAD_FOLDER, filename))

    time_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("INSERT INTO notes (title, filename, time) VALUES (?, ?, ?)",
              (title, filename, time_now))

    conn.commit()
    conn.close()

    return jsonify({"message": "Notes uploaded ✅"})
@app.route('/get_notes')
def get_notes():

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM notes ORDER BY id DESC")
    data = c.fetchall()

    conn.close()
    return jsonify(data)


# ================= ANNOUNCEMENTS =================
@app.route('/add_announcement', methods=['POST'])
def add_announcement():

    data = request.json
    time_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")


    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("""
        INSERT INTO announcements (message, time, posted_by)
        VALUES (?, ?, ?)
    """, (data['message'], time_now, posted_by))

    conn.commit()
    conn.close()

    return jsonify({"message": "Announcement posted ✅"})


@app.route('/get_announcements')
def get_announcements():

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM announcements ORDER BY id DESC")
    data = c.fetchall()

    conn.close()
    return jsonify(data)


# ================= MARKS =================
@app.route('/save_marks', methods=['POST'])
def save_marks():

    data = request.json

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM marks WHERE name=?", (data['name'],))
    exists = c.fetchone()

    if exists:
        c.execute("""
            UPDATE marks 
            SET mid=?, end=?, cap=?, lab=? 
            WHERE name=?
        """, (data['mid'], data['end'], data['cap'], data['lab'], data['name']))
    else:
        c.execute("""
            INSERT INTO marks (name, mid, end, cap, lab)
            VALUES (?, ?, ?, ?, ?)
        """, (data['name'], data['mid'], data['end'], data['cap'], data['lab']))

    conn.commit()
    conn.close()

    return jsonify({"message": "Marks saved ✅"})


@app.route('/get_marks')
def get_marks():

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    c.execute("SELECT * FROM marks")
    data = c.fetchall()

    conn.close()
    return jsonify(data)


# ================= FILES =================
@app.route('/uploads/<filename>')
def uploads(filename):
    return send_from_directory(UPLOAD_FOLDER, filename)

@app.route('/teacher_dashboard_data')
def teacher_dashboard_data():

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    # ✅ FIX 1: correct students table
    c.execute("SELECT COUNT(*) FROM users WHERE role='student'")
    total_students = c.fetchone()[0]

    # ✅ assignments (correct already)
    c.execute("SELECT COUNT(*) FROM assignments")
    total_assignments = c.fetchone()[0]

    # ✅ notes (correct already)
    c.execute("SELECT COUNT(*) FROM notes")
    total_notes = c.fetchone()[0]

    # ✅ FIX 2: correct column names
    c.execute("""
        SELECT student_name, assignment_title, time 
        FROM submissions 
        ORDER BY time DESC 
        LIMIT 5
    """)
    submissions = c.fetchall()

    conn.close()

    return jsonify({
        "students": total_students,
        "assignments": total_assignments,
        "notes": total_notes,
        "submissions": submissions
    })

# ================= CHANGE PASSWORD (FIXED) =================
@app.route('/change_password', methods=['POST'])
def change_password_api():

    data = request.json

    enrollment = data.get('enrollment')
    old_pass = data.get('old')
    new_pass = data.get('new')

    # ✅ validation
    if not enrollment or not old_pass or not new_pass:
        return jsonify({"message": "All fields required ❌"})

    conn = sqlite3.connect("database.db")
    c = conn.cursor()

    # ✅ check old password
    c.execute("""
        SELECT * FROM users 
        WHERE enrollment=? AND password=?
    """, (enrollment, old_pass))

    user = c.fetchone()

    if not user:
        conn.close()
        return jsonify({"message": "Old password incorrect ❌"})

    # ✅ update password
    c.execute("""
        UPDATE users 
        SET password=? 
        WHERE enrollment=?
    """, (new_pass, enrollment))

    conn.commit()
    conn.close()

    return jsonify({"message": "Password Updated ✅"})

# ================= RUN =================
if __name__ == '__main__':
    init_db()
    app.run(debug=True,port=5003)