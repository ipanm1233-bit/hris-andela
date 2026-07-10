// js/dashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAyFFFuXdnTUpxw9wW4uPKwqyeSpZNilRE",
    authDomain: "andela-hris.firebaseapp.com",
    projectId: "andela-hris",
    storageBucket: "andela-hris.firebasestorage.app",
    messagingSenderId: "504290269212",
    appId: "1:504290269212:web:830f76268842c38ad267d9"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

document.addEventListener("DOMContentLoaded", async () => {
    
    // ==========================================
    // 1. LOGIKA UI: SIDEBAR (ANTI-STUCK)
    // ==========================================
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const btnToggle = document.getElementById('btnToggleSidebar');

    function toggleSidebar() {
        if (window.innerWidth >= 1024) {
            // Logic khusus Desktop (Ubah lebar 64 ke 0)
            sidebar.classList.toggle('lg:w-64');
            sidebar.classList.toggle('lg:w-0');
        } else {
            // Logic khusus Mobile (Geser posisi keluar layar)
            sidebar.classList.toggle('-translate-x-full');
            overlay.classList.toggle('hidden');
        }
    }

    btnToggle.addEventListener('click', toggleSidebar);
    if(overlay) overlay.addEventListener('click', toggleSidebar);

    // ==========================================
    // 2. LOGIKA DATA: TARIK DATA FIREBASE
    // ==========================================
    const userNIK = localStorage.getItem("userNIK");

    if (!userNIK) {
        alert("Sesi berakhir. Silakan login kembali.");
        window.location.href = "/index.html";
        return;
    }

    try {
        const docRef = doc(db, "master_karyawan", userNIK);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const dataPegawai = docSnap.data();
            const namaLengkap = dataPegawai.Nama || "Tanpa Nama";
            
            document.getElementById("userNameDisplay").innerText = namaLengkap;
            
            const inisial = namaLengkap.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            document.getElementById("userAvatar").innerText = inisial;
            
            const sisaCuti = (dataPegawai.SisaCutiTahunan || 0) - (dataPegawai.TerpakaiTahunan || 0);
            document.getElementById("cutiDisplay").innerText = sisaCuti;
            
        } else {
            document.getElementById("userNameDisplay").innerText = "Data Kosong";
        }
    } catch (error) {
        document.getElementById("userNameDisplay").innerText = "Error Data";
        console.error("Gagal menarik profil:", error);
    }

    // ==========================================
    // 3. LOGIKA LOGOUT
    // ==========================================
    const btnLogout = document.getElementById("btnLogout");
    if(btnLogout) {
        btnLogout.addEventListener("click", () => {
            localStorage.clear();
            window.location.href = "/index.html";
        });
    }
});
