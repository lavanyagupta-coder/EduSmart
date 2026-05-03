//////////////////////////////////////////////////
// LOGIN FUNCTION (FIXED CLEAN)
//////////////////////////////////////////////////
// ================= UI MESSAGE =================
function showMsg(msg, color="green") {

    let box = document.getElementById("sideMessage");

    if(!box){
        box = document.createElement("div");
        box.id = "sideMessage";
        box.style.position = "fixed";
        box.style.top = "20px";
        box.style.right = "20px";
        box.style.padding = "12px 18px";
        box.style.borderRadius = "8px";
        box.style.color = "white";
        box.style.fontWeight = "bold";
        box.style.zIndex = "9999";
        box.style.display = "none";
        document.body.appendChild(box);
    }

    box.innerText = msg;

    box.style.background =
        color === "red" ? "#e74c3c" :
        color === "orange" ? "#f39c12" :
        "#2ecc71";

    box.style.display = "block";

    setTimeout(() => {
        box.style.display = "none";
    }, 5000);
}
function login(){

let e = document.getElementById("enrollment").value.trim();
let p = document.getElementById("password").value.trim();
let r = document.getElementById("role").value;

if(!e || !p){
showMsg("Please fill all fields ❌", "red");
return;
}

fetch("/login",{
method:"POST",
headers:{"Content-Type":"application/json"},
body:JSON.stringify({
enrollment:e,
password:p,
role:r
})
})
.then(res=>res.json())
.then(data=>{

if(data.redirect){

// ✅ STORE USER DATA
localStorage.setItem("name", data.name);
localStorage.setItem("enrollment", e);
localStorage.setItem("role", r);

// ✅ REDIRECT
window.location.href = data.redirect;

}else{
showMsg(data.message, "red");
}

})
.catch(err=>{
console.error(err);
showMsg("Server error ❌", "red");
});
}

//////////////////////////////////////////////////
// ENTER KEY SUPPORT
//////////////////////////////////////////////////
document.addEventListener("keydown", function(e){
if(e.key === "Enter"){
login();
}
});