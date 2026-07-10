// js/dashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

// Konfigurasi Terpadu (Anti-Error)
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
    
    // --- 1. LOGIKA UI (MOBILE SIDEBAR) ---
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const btnOpen = document.getElementById('btnOpenSidebar');
    const btnClose = document.getElementById('btnCloseSidebar');

    function toggleSidebar() {
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
    }

    btnOpen.addEventListener('click', toggleSidebar);
    btnClose.addEventListener('click', toggleSidebar);
    overlay.addEventListener('click', toggleSidebar);


    // --- 2. LOGIKA PENARIKAN DATA FIREBASE ---
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
            const namaLengkap = dataPegawai.Nama;
            
            // Render Nama Lengkap
            document.getElementById("userNameDisplay").innerText = namaLengkap;
            
            // Render Inisial Nama di Avatar
            document.getElementById("userAvatar").innerText = namaLengkap.charAt(0).toUpperCase();
            
            // Render Kalkulasi Cuti
            const sisaCuti = (dataPegawai.SisaCutiTahunan || 0) - (dataPegawai.TerpakaiTahunan || 0);
            document.getElementById("cutiDisplay").innerText = sisaCuti;
            
        } else {
            document.getElementById("userNameDisplay").innerText = "Data tidak ditemukan!";
            console.error("Dokumen NIK tidak ada di koleksi master_karyawan");
        }
    } catch (error) {
        document.getElementById("userNameDisplay").innerText = "Error jaringan";
        console.error("Gagal menarik data:", error);
    }

    // --- 3. LOGIKA LOGOUT ---
    document.getElementById("btnLogout").addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "/index.html";
    });
});
