// ================= INIT =================
window.onload = function(){
    showTeacher("dashboard");
    loadStatus();
};

// ================= SIDE MESSAGE =================
function showMsg(msg, color="green") {
    let box = document.getElementById("sideMessage");

    if(!box){
        box = document.createElement("div");
        box.id = "sideMessage";
        box.className = "side-message";
        document.body.appendChild(box);
    }

    box.innerText = msg;
    box.style.background = color === "red" ? "#e74c3c" :
                           color === "orange" ? "#f39c12" : "#2ecc71";

    box.classList.add("show");

    setTimeout(() => {
        box.classList.remove("show");
    }, 5000);
}

// ================= SAFE RESPONSE =================
function handleResponse(d){
    let color = "green";

    if(d.status === "error") color = "red";
    if(d.status === "warning") color = "orange";

    let msg = d.message || "Done ✅";

    showMsg(msg, color);
}
function loadSubmissions(){

fetch("/get_submissions")
.then(r=>r.json())
.then(data=>{

let list = document.getElementById("assignList");
list.innerHTML = "";

data.forEach(s=>{
    list.innerHTML += `
    <li>
        <b>${s[1]}</b> submitted <b>${s[2]}</b><br>
        <small>${s[4]}</small><br>
        <a href="/uploads/${s[3]}" target="_blank">View</a>
    </li>`;
});

});
}

// ================= NAVIGATION =================
function showTeacher(section){

    let all = ["dashboard","students","schedule","assignments","notes","announcements","marks"];

    all.forEach(id=>{
        let el = document.getElementById(id);
        if(el) el.style.display="none";
    });

    let sec = document.getElementById(section);
    if(sec) sec.style.display="block";

    if(section==="students") loadStudents();
    if(section==="schedule") loadSchedule();
    if(section==="assignments"){
    loadAssignments();
    loadSubmissions();
}
    if(section==="notes") loadNotes();
    if(section==="marks") loadMarks();
    if(section==="announcements") loadTeacherAnnouncements();
    loadTeacherNotifications();
    loadTeacherDashboard();
}

// ================= ATTENDANCE =================
function loadStatus(){
    fetch("/attendance_flag")
    .then(r=>r.json())
    .then(d=>{
        document.getElementById("attStatus").innerText =
        d.enabled ? "ON ✅" : "OFF ❌";
    })
    .catch(()=>{
        document.getElementById("attStatus").innerText = "OFF ❌";
        showMsg("Status load failed ❌","red");
    });
}

function toggleAttendance(){
    fetch("/toggle_attendance",{method:"POST"})
    .then(r=>r.json())
    .then(d=>{
        handleResponse(d);
        loadStatus();
    })
    .catch(()=>{
        showMsg("Toggle failed ❌","red");
    });
}

// ================= SCHEDULE =================
function scheduleClass(){

let date = document.getElementById("classDate").value;

if(!date){
    showMsg("Please select date ❌","red");
    return;
}

fetch("/schedule_class",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({date})
})
.then(r=>r.json())
.then(d=>{
    handleResponse(d);
    loadSchedule();
    loadStudents();
});
}

function loadSchedule(){

fetch("/get_schedule")
.then(r=>r.json())
.then(data=>{

let list=document.getElementById("scheduleList");
list.innerHTML="";

data.forEach(c=>{
    list.innerHTML+=`<li>📅 ${c[1]}</li>`;
});

});
}

// ================= STUDENTS =================
function loadStudents(){

fetch("/get_schedule")
.then(r=>r.json())
.then(classes=>{

fetch("/get_students")
.then(r=>r.json())
.then(students=>{

fetch("/get_class_attendance")
.then(r=>r.json())
.then(att=>{

let table=document.getElementById("studentTable");
table.innerHTML="";

// ✅ FIX 1: dynamic header
let header = document.getElementById("dynamicHeader");
header.innerHTML = "<th>Name</th><th>Enrollment</th>";

classes.forEach(c=>{
    header.innerHTML += `<th>${c[1]}</th>`;
});

// ✅ FIX 2: empty students safety
if(!students || students.length===0){
    table.innerHTML = "<tr><td colspan='10'>No students found</td></tr>";
    return;
}

students.forEach(s=>{

let row=`<tr>
<td>${s[0]}</td>
<td>${s[1]}</td>`;

classes.forEach(c=>{

let date=c[1];

// ✅ FIX 3: correct attendance check
let marked = att.some(a =>
    a[1] == s[0] && a[2] == date
);

row+=`
<td>
${marked ? "✔️" : "⚪"}<br>
<button onclick="markAttendance('${s[0]}','${date}')"
${marked ? "disabled" : ""}>
${marked ? "Done" : "Mark"}
</button>
</td>`;
});

row+="</tr>";
table.innerHTML+=row;

});

});
});
});
}

// ================= MARK ATTENDANCE =================
function markAttendance(name,date){

fetch("/mark_class_attendance",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({name,date})
})
.then(r=>r.json())
.then(d=>{
    handleResponse(d);
    loadStudents();
});
}

// ================= ASSIGNMENTS =================
function uploadAssignment(){

let title=document.getElementById("assignTitle").value;
let desc=document.getElementById("assignDesc").value;
let file=document.getElementById("assignFile").files[0];

if(!title || !file){
    showMsg("Fill all fields ❌","red");
    return;
}

let fd=new FormData();
fd.append("title",title);
fd.append("desc",desc);
fd.append("file",file);

fetch("/upload_assignment",{method:"POST",body:fd})
.then(r=>r.json())
.then(d=>{
    handleResponse(d);
    loadAssignments();
});
}

function loadAssignments(){
fetch("/get_assignments")
.then(r=>r.json())
.then(data=>{
    let list=document.getElementById("assignList");
    list.innerHTML="";
    data.forEach(a=>{
        list.innerHTML+=`
        <li>
            <b>${a[1]}</b> - ${a[3]}<br>
            <a href="/uploads/${a[2]}" target="_blank">Open</a>
            <button onclick="deleteAssignment(${a[0]})" style="background:#e74c3c;margin-left:8px;">
                Delete
            </button>
        </li>`;
    });
});
}
function deleteAssignment(assignmentId){
if(!confirm("Delete this assignment?")){
    return;
}

fetch("/delete_assignment",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({assignment_id: assignmentId})
})
.then(r=>r.json())
.then(d=>{
    handleResponse(d);
    loadAssignments();
})
.catch(()=>{
    showMsg("Delete failed ❌","red");
});
}

// ================= NOTES =================
function uploadNotes(){

let title=document.getElementById("noteTitle").value;
let file=document.getElementById("noteFile").files[0];

if(!title || !file){
    showMsg("Fill all fields ❌","red");
    return;
}

let fd=new FormData();
fd.append("title",title);
fd.append("file",file);

fetch("/upload_notes",{method:"POST",body:fd})
.then(r=>r.json())
.then(d=>{
    handleResponse(d);
    loadNotes();
});
}

function loadNotes(){
fetch("/get_notes")
.then(r=>r.json())
.then(data=>{
    let list=document.getElementById("noteList");
    list.innerHTML="";
    data.forEach(n=>{
        list.innerHTML+=`
        <li>${n[1]} - <a href="/uploads/${n[2]}" target="_blank">Open</a></li>`;
    });
});
}

// ================= ANNOUNCEMENTS =================
function postAnnouncement(){

let msg=document.getElementById("announcementInput").value;

if(!msg){
    showMsg("Message required ❌","red");
    return;
}

fetch("/add_announcement",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
        message:msg,
        posted_by: localStorage.getItem("name") || "Teacher"
    })
})

.then(r=>r.json())
.then(d=>{
    handleResponse(d);
    document.getElementById("announcementInput").value = "";
    loadTeacherAnnouncements();
});
}

function loadTeacherAnnouncements(){
fetch("/get_announcements")
.then(r=>r.json())
.then(data=>{
    let list = document.getElementById("teacherAnnouncementList");
    if(!list) return;

    list.innerHTML = "";

    if(data.length === 0){
        list.innerHTML = "<li>No announcements yet</li>";
        return;
    }

    data.forEach(a=>{
        list.innerHTML += `
        <li>
            <b>${a[1]}</b><br>
            <small>By: ${a[3]} | ${a[2]}</small>
        </li>`;
    });
});
}


// ================= MARKS =================
function loadMarks(){

fetch("/get_students")
.then(r=>r.json())
.then(students=>{

let table=document.getElementById("marksTable");
table.innerHTML="";

if(!students || students.length===0){
    table.innerHTML="<tr><td colspan='7'>No students found</td></tr>";
    return;
}

students.forEach(s=>{

let name = s[0];
let enroll = s[1];

table.innerHTML+=`
<tr>
<td>${name}</td>
<td>${enroll}</td>

<td><input type="number" id="mid_${enroll}" placeholder="Mid"></td>
<td><input type="number" id="end_${enroll}" placeholder="End"></td>
<td><input type="number" id="cap_${enroll}" placeholder="Cap"></td>
<td><input type="number" id="lab_${enroll}" placeholder="Lab"></td>

<td>
<button onclick="saveMarks('${name}','${enroll}')">
💾 Save
</button>
</td>
</tr>
`;

});

})
.catch(()=>{
    showMsg("Failed to load students ❌","red");
});
}

// ================= SAVE MARKS =================
function saveMarks(name,enroll){

let mid = document.getElementById("mid_"+enroll).value;
let end = document.getElementById("end_"+enroll).value;
let cap = document.getElementById("cap_"+enroll).value;
let lab = document.getElementById("lab_"+enroll).value;

mid = mid ? Number(mid) : 0;
end = end ? Number(end) : 0;
cap = cap ? Number(cap) : 0;
lab = lab ? Number(lab) : 0;

fetch("/save_marks",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({
        name:name,
        enrollment:enroll,
        mid:mid,
        end:end,
        cap:cap,
        lab:lab
    })
})
.then(r=>r.json())
.then(d=>{
    handleResponse(d);
})
.catch(()=>{
    showMsg("Save failed ❌","red");
});
}

// ================= LOGOUT =================
function logout(){
localStorage.clear();
location.href="/";
}
function loadTeacherNotifications(){
fetch("/get_announcements")
.then(r=>r.json())
.then(data=>{
let list = document.getElementById("teacherNotif");
if(!list) return;

list.innerHTML = "";

data.slice(0,3).forEach(a=>{
    list.innerHTML += `<li>📢 ${a[1]} <small>(${a[3]})</small></li>`;
});
});
}
function loadTeacherDashboard(){

fetch("/teacher_dashboard_data")
.then(r=>r.json())
.then(data=>{

// 📊 stats
document.getElementById("totalStudents").innerText = data.students;
document.getElementById("totalAssign").innerText = data.assignments;
document.getElementById("totalNotes").innerText = data.notes;

// 📂 recent submissions
let list = document.getElementById("recentSubmissions");
if(!list) return;

list.innerHTML = "";

if(data.submissions.length === 0){
    list.innerHTML = "<li>No submissions</li>";
    return;
}

data.submissions.forEach(s=>{
    list.innerHTML += `
        <li>
            👤 ${s[0]} <br>
            📂 ${s[1]} <br>
            <small>${s[2]}</small>
        </li>
    `;
});

});
}
function changePassword() {

    let enrollment = localStorage.getItem("enrollment");
    let oldPass = document.getElementById("oldPass").value.trim();
    let newPass = document.getElementById("newPass").value.trim();

    if(!oldPass || !newPass){
        showToast("Fill all fields ❌", "#dc3545");
        return;
    }

    fetch("/change_password", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
            enrollment: enrollment,
            old: oldPass,
            new: newPass
        })
    })
    .then(res => res.json())
    .then(data => {

        document.getElementById("msg").innerText = data.message;

        let success = data.message.includes("Updated");

        showToast(
            data.message,
            success ? "#28a745" : "#dc3545"
        );

        if(success){
            setTimeout(() => {
                localStorage.clear();
                window.location.href = "/";
            }, 1200);
        }
    })
    .catch(()=>{
        showToast("Server error ❌", "#dc3545");
    });
}