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
    // 1. LOGIKA UI: SIDEBAR (TOGGLE LEBAR)
    // ==========================================
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const btnToggle = document.getElementById('btnToggleSidebar');

    function toggleSidebar() {
        // Logika untuk Mobile (di bawah 1024px)
        if (window.innerWidth < 1024) {
            sidebar.classList.toggle('-translate-x-full');
            overlay.classList.toggle('hidden');
        } 
        // Logika untuk Desktop (Sembunyikan ke kiri dengan lebar 0)
        else {
            if (sidebar.classList.contains('lg:w-0')) {
                sidebar.classList.remove('lg:w-0', 'px-0', 'opacity-0');
                sidebar.classList.add('w-64');
            } else {
                sidebar.classList.add('lg:w-0', 'px-0', 'opacity-0');
                sidebar.classList.remove('w-64');
            }
        }
    }

    btnToggle.addEventListener('click', toggleSidebar);
    if(overlay) overlay.addEventListener('click', toggleSidebar);

    // ==========================================
    // 2. LOGIKA UI: SUB-MENU (ACCORDION)
    // ==========================================
    const menuToggles = document.querySelectorAll('.menu-toggle');
    menuToggles.forEach(btn => {
        btn.addEventListener('click', () => {
            const submenu = btn.nextElementSibling;
            const chevron = btn.querySelector('.chevron');
            
            submenu.classList.toggle('hidden');
            submenu.classList.toggle('flex');
            chevron.classList.toggle('rotate-180');
        });
    });

    // ==========================================
    // 3. LOGIKA DATA: TARIK DATA FIREBASE
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
            
            // Format Nama Singkat untuk Avatar (Maks 2 huruf)
            const inisial = namaLengkap.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            document.getElementById("userAvatar").innerText = inisial;
            
            // Sisa Cuti
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
    // 4. LOGIKA LOGOUT
    // ==========================================
    const btnLogout = document.getElementById("btnLogout");
    if(btnLogout) {
        btnLogout.addEventListener("click", () => {
            localStorage.clear();
            window.location.href = "/index.html";
        });
    }
});
