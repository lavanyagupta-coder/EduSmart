// ================= GLOBAL ERROR SAFETY =================
window.onerror = function(msg, url, line){
    console.log("JS ERROR:", msg, "at line", line);
};

// ================= INIT =================
document.addEventListener("DOMContentLoaded", () => {

    let name = localStorage.getItem("name");

    if(name){
        document.getElementById("studentName").innerText = "Welcome " + name;
    }

    showSection("dashboard");

    // Load everything
    loadAttendance();
    loadAssignments();
    loadNotes();
    loadAnnouncements();
    loadMarks();
    loadNotifications();
});

// ================= UI MESSAGE =================
function showMsg(msg, color="green"){

    let box = document.getElementById("sideMessage");
    if(!box) return;

    box.innerText = msg;
    box.style.background = color;
    box.classList.add("show");

    setTimeout(()=>{
        box.classList.remove("show");
    },5000);
}

function handleResponse(d){
    let color = "green";

    if(d.status === "error") color = "red";
    if(d.status === "warning") color = "orange";

    showMsg(d.message || "Done", color);
}

// ================= SECTION CONTROL =================
function showSection(section){

    // ✅ UPDATED (added "marks")
    let sections = ["dashboard","attendance","assignments","notes","announcements","marks"];

    sections.forEach(id=>{
        let el = document.getElementById(id);
        if(el) el.style.display = "none";
    });

    let active = document.getElementById(section);
    if(active) active.style.display = "block";

    if(section==="attendance") loadAttendance();
    if(section==="assignments") loadAssignments();
    if(section==="notes") loadNotes();
    if(section==="announcements") loadAnnouncements();
    if(section==="dashboard"){
    setTimeout(()=>{
        loadMarks();
    }, 300);
}

    // ✅ NEW
    if(section==="marks") loadMarksTable();
}

// ================= DATE HELPER =================
function getToday(){
    let d = new Date();

    let year = d.getFullYear();
    let month = String(d.getMonth() + 1).padStart(2, '0');
    let day = String(d.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

// ================= ATTENDANCE =================
function loadAttendance(){

let name = localStorage.getItem("name");
if(!name) return;

Promise.all([
    fetch("/get_schedule").then(r=>r.json()).catch(()=>[]),
    fetch("/get_my_attendance/" + name).then(r=>r.json()).catch(()=>[]),
    fetch("/attendance_flag").then(r=>r.json()).catch(()=>({enabled:false}))
]).then(([classes, att, flag]) => {

    let table = document.getElementById("attendanceTable");
    if(!table) return;

    table.innerHTML = "";

    let present = 0;
    let total = classes.length;

    let today = getToday();

    if(total === 0){
        table.innerHTML = `<tr><td colspan="3">No class scheduled</td></tr>`;
        document.getElementById("attValue").innerText = "0%";
        return;
    }

    classes.forEach(c => {

        let date = c[1];

        let marked = att.some(a => a[1] === date);

        if(marked) present++;

        let canMark = flag.enabled && (date === today) && !marked;

        table.innerHTML += `
        <tr>
            <td>${date}</td>
            <td>${marked ? "✔ Present" : "⚪ Absent"}</td>
            <td>
                <button 
                onclick="markAttendance('${date}')"
                ${!canMark ? "disabled" : ""}>
                ${marked ? "Marked" : (date === today ? "Mark" : "Locked")}
                </button>
            </td>
        </tr>`;
    });

    let percent = Math.round((present / total) * 100);
    loadAttendanceGraph(percent);

    let fill = document.getElementById("progressFill");
    if(fill) fill.style.width = percent + "%";

    let text = document.getElementById("percentText");
    if(text) text.innerText = `Attendance: ${present}/${total} (${percent}%)`;

    let val = document.getElementById("attValue");
    if(val) val.innerText = percent + "%";

}).catch(()=>{
    showMsg("Failed to load attendance ❌","red");
});
}

// ================= MARK ATTENDANCE =================
function markAttendance(date){

let name = localStorage.getItem("name");
let today = getToday();

if(date !== today){
    showMsg("You can only mark today's attendance ❌","red");
    return;
}

fetch("/attendance_flag")
.then(r=>r.json())
.then(flag=>{

    if(!flag.enabled){
        showMsg("Attendance is OFF ❌","red");
        return;
    }

    fetch("/mark_class_attendance",{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({name,date})
    })
    .then(r=>r.json())
    .then(d=>{
        handleResponse(d);

        setTimeout(()=>{
            loadAttendance();
        }, 200);
    });

})
.catch(()=>{
    showMsg("Server error ❌","red");
});
}

function loadAssignments(){

let name = localStorage.getItem("name");

Promise.all([
    fetch("/get_assignments").then(r=>r.json()),
    fetch("/get_submissions").then(r=>r.json())
])
.then(([assignments, submissions])=>{
let val = document.getElementById("assignValue");
if(val) val.innerText = assignments.length;
// ✅ ADD THIS HERE
let total = assignments.length;
let done = submissions.filter(s => s[1] === name).length;

let progress = document.getElementById("assignProgress");
if(progress){
    progress.innerHTML = `
        <b>${done} / ${total}</b><br>
        <small>Assignments Submitted</small>
    `;
}

let list = document.getElementById("assignmentList");
if(!list) return;

list.innerHTML = "";

assignments.forEach(a=>{

    let submitted = submissions.find(s =>
        s[1] === name && s[2] === a[1]
    );

    list.innerHTML += `
    <li>
        <b>${a[1]}</b><br>
        <small>${a[3]}</small><br>

        <a href="/uploads/${a[2]}" target="_blank">View</a>

        <br><br>

        ${
            submitted
            ?
            `<span style="color:green;font-weight:bold;">
                ✅ Submitted (${submitted[4]})
        
            </span>
            <br><br>
            <button onclick="deleteSubmission(${submitted[0]})" style="background:#e74c3c;">Delete Submission</button>`
            :
            `<form onsubmit="submitAssignment(event,'${a[1]}')">
                <input type="file" required>
                <button>Submit</button>
            </form>`
        }

        <hr>
    </li>`;
});

})
.catch(()=>{
    alert("Assignments load failed ❌");
});
}

// ================= ANNOUNCEMENTS =================
function loadAnnouncements(){

fetch("/get_announcements")
.then(r=>r.json())
.then(data=>{

let list = document.getElementById("announcementList");
if(!list) return;

list.innerHTML = "";

data.forEach(a=>{
    list.innerHTML += `
    <li>
        <b>${a[1]}</b><br>
        <small>By: ${a[3]} | ${a[2]}</small>
    </li>`;
});
})
.catch(()=>{
    showMsg("Announcements load failed ❌","red");
});
}



// ================= MARKS TABLE (NEW) =================
function loadMarks(){

fetch("/get_marks")
.then(r=>r.json())
.then(data=>{
     let name = localStorage.getItem("name");

console.log("NAME:", name);
console.log("DATA:", data);
let student = data.find(m => m[1].trim() === name.trim());

let val = document.getElementById("marksValue");

if(!student){
    if(val) val.innerText = "0";
    return;
}

let mid = student[2] || 0;
let end = student[3] || 0;
let cap = student[4] || 0;
let lab = student[5] || 0;

let total = mid + end + cap + lab;

if(val) val.innerText = total;

// ✅ ADD THIS (IMPORTANT)
setTimeout(() => {
    loadMarksGraph(mid, end, cap, lab);
}, 200);
console.log("GRAPH DATA:", mid, end, cap, lab);
const ctx = document.getElementById("marksChart");

if(!ctx){
    console.log("Canvas not found ❌");
    return;
}

})
.catch(()=>{
    showMsg("Marks load failed ❌","red");
});
}
// ================= SUBMIT ASSIGNMENT (FIXED UI MESSAGE) =================
function submitAssignment(e, title){

e.preventDefault();

let file = e.target.querySelector("input").files[0];
let name = localStorage.getItem("name");

if(!file){
    showMsg("Please select file ❌","red"); // ✅ FIXED
    return;
}

let fd = new FormData();
fd.append("file", file);
fd.append("name", name);
fd.append("title", title);

fetch("/submit_assignment",{
    method:"POST",
    body:fd
})
.then(r=>r.json())
.then(d=>{

    // ✅ REPLACED alert WITH UI MESSAGE
    handleResponse({
        message: d.message,
        status: d.message.includes("Submitted") ? "success" : "error"
    });

    // reload assignments
    setTimeout(()=>{
        loadAssignments();
    }, 300);

})
.catch(()=>{
    showMsg("Submission failed ❌","red"); // ✅ FIXED
});

}
function deleteSubmission(submissionId){

let name = localStorage.getItem("name");

if(!name){
    showMsg("Session expired ❌","red");
    return;
}

if(!confirm("Are you sure you want to delete this submission?")){
    return;
}

fetch("/delete_submission",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({submission_id: submissionId, name})
})
.then(r=>r.json())
.then(d=>{
    handleResponse(d);
    setTimeout(()=>{
        loadAssignments();
    }, 300);
})
.catch(()=>{
    showMsg("Delete failed ❌","red");
});
}

// ================= LOGOUT =================
function logout(){
    localStorage.clear();
    location.href = "/";
}
// ================= NOTES =================
function loadNotes(){

fetch("/get_notes")
.then(r=>r.json())
.then(data=>{

let list = document.getElementById("notesList");
if(!list) return;

list.innerHTML = "";

if(data.length === 0){
    list.innerHTML = "<p>No notes available</p>";
    return;
}

data.forEach(n=>{
    list.innerHTML += `
    <li>
        <b>${n[1]}</b><br>
        <small>Uploaded: ${n[3]}</small><br>
        <a href="/uploads/${n[2]}" target="_blank">Download</a>
    </li>`;
});

})
.catch(()=>{
    showMsg("Notes load failed ❌","red");
});
}
// ================= ATTENDANCE GRAPH =================
function loadAttendanceGraph(percent){

const ctx = document.getElementById("attendanceChart");

if(!ctx) return;

if(window.attChart){
    window.attChart.destroy();
}

window.attChart = new Chart(ctx, {
    type: "doughnut",
    data: {
        labels: ["Present", "Absent"],
        datasets: [{
            data: [percent, 100 - percent],
            backgroundColor: ["#00c6ff", "#ff6b6b"]
        }]
    }
});
}
function loadMarksGraph(mid, end, cap, lab){

const ctx = document.getElementById("marksChart");

if(!ctx) return;

// ✅ destroy previous graph
if(window.marksChart){
    window.marksChart.destroy();
}

window.marksChart = new Chart(ctx, {
    type: "bar",
    data: {
        labels: ["Mid", "End", "Cap", "Lab"],
        datasets: [{
            label: "Marks",
            data: [mid, end, cap, lab],
            backgroundColor: "#5f5fff"
        }]
    }
});
}
function loadMarksTable(){

fetch("/get_marks")
.then(r=>r.json())
.then(data=>{

let name = localStorage.getItem("name");
let table = document.getElementById("marksTable");

if(!table) return;

table.innerHTML = "";

let student = data.find(m => m[1].trim() === name.trim());

if(!student){
    table.innerHTML = "<tr><td colspan='2'>No marks available</td></tr>";
    return;
}

let mid = student[2] || 0;
let end = student[3] || 0;
let cap = student[4] || 0;
let lab = student[5] || 0;

let total = mid + end + cap + lab;

table.innerHTML = `
<tr><th>Name</th><td>${student[1]}</td></tr>
<tr><th>Mid</th><td>${mid}</td></tr>
<tr><th>End</th><td>${end}</td></tr>
<tr><th>Cap</th><td>${cap}</td></tr>
<tr><th>Lab</th><td>${lab}</td></tr>
<tr><th>Total</th><td><b>${total}</b></td></tr>
`;

});
}
function loadNotifications(){

fetch("/get_announcements")
.then(r=>r.json())
.then(data=>{

let list = document.getElementById("notifList");
if(!list) return;

list.innerHTML = "";

data.slice(0,3).forEach(a=>{
   list.innerHTML += `<li>📢 ${a[1]} <small>(${a[3]})</small></li>`;
});

});
}