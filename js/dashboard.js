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
    // 1. LOGIKA UI: SIDEBAR (DESKTOP & MOBILE)
    // ==========================================
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('mainContent');
    const overlay = document.getElementById('sidebarOverlay');
    const btnToggle = document.getElementById('btnToggleSidebar');
    const btnCloseMobile = document.getElementById('btnCloseSidebarMobile');

    function toggleSidebar() {
        // Untuk Mobile: Munculkan/Sembunyikan panel & overlay
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
        
        // Untuk Desktop: Hilangkan paksaan lebar margin dan tampilannya
        sidebar.classList.toggle('lg:translate-x-0');
        mainContent.classList.toggle('lg:ml-64');
    }

    btnToggle.addEventListener('click', toggleSidebar);
    if(btnCloseMobile) btnCloseMobile.addEventListener('click', toggleSidebar);
    if(overlay) overlay.addEventListener('click', toggleSidebar);

    // ==========================================
    // 2. LOGIKA UI: SUB-MENU (ACCORDION)
    // ==========================================
    const menuToggles = document.querySelectorAll('.menu-toggle');
    menuToggles.forEach(btn => {
        btn.addEventListener('click', () => {
            // Tutup menu lain yang sedang terbuka (Opsional, agar rapi)
            menuToggles.forEach(otherBtn => {
                if (otherBtn !== btn) {
                    otherBtn.nextElementSibling.classList.add('hidden');
                    otherBtn.querySelector('.chevron').classList.remove('rotate-180');
                }
            });

            // Buka/Tutup menu yang diklik
            const submenu = btn.nextElementSibling;
            const chevron = btn.querySelector('.chevron');
            
            submenu.classList.toggle('hidden');
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
            document.getElementById("userAvatar").innerText = namaLengkap.charAt(0).toUpperCase();
            
            const sisaCuti = (dataPegawai.SisaCutiTahunan || 0) - (dataPegawai.TerpakaiTahunan || 0);
            document.getElementById("cutiDisplay").innerText = sisaCuti;
            
        } else {
            document.getElementById("userNameDisplay").innerText = "Data Karyawan Tidak Ditemukan";
        }
    } catch (error) {
        document.getElementById("userNameDisplay").innerText = "Error Jaringan";
        console.error("Gagal menarik data dari Firestore:", error);
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
