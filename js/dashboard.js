// js/dashboard.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

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
    // 1. LOGIKA UI: SIDEBAR 
    // ==========================================
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const btnToggle = document.getElementById('btnToggleSidebar');

    function toggleSidebar() {
        if (window.innerWidth >= 1024) {
            sidebar.classList.toggle('lg:w-64');
            sidebar.classList.toggle('lg:w-0');
        } else {
            sidebar.classList.toggle('-translate-x-full');
            overlay.classList.toggle('hidden');
        }
    }

    if(btnToggle) btnToggle.addEventListener('click', toggleSidebar);
    if(overlay) overlay.addEventListener('click', toggleSidebar);


    // ==========================================
    // 2. LOGIKA DATA: TARIK PROFIL & HISTORI
    // ==========================================
    const userNIK = localStorage.getItem("userNIK");

    if (!userNIK) {
        alert("Sesi berakhir. Silakan login kembali.");
        window.location.href = "/index.html";
        return;
    }

    // --- HAK AKSES MENU (RBAC) ---
    const role = (localStorage.getItem("userRole") || "").toUpperCase();
    const jabatan = (localStorage.getItem("userJabatan") || "").toUpperCase();
    const isAtasan = localStorage.getItem("isAtasan") === "YES";

    const isHRD = role.includes("HRD") || jabatan.includes("HR");
    const isFinance = role.includes("FINANCE") || role.includes("CASHIER") || jabatan.includes("FINANCE");
    const isManajerial = role.includes("GM") || role.includes("SPV") || jabatan.includes("MANAGER") || jabatan.includes("SUPERVISOR");

    if (isHRD) {
        document.getElementById("menu-manajerial").classList.remove("hidden");
        document.getElementById("menu-hrd").classList.remove("hidden");
    } else if (isFinance || isManajerial || isAtasan) {
        document.getElementById("menu-manajerial").classList.remove("hidden");
    }

    try {
        // --- A. Render Profil Karyawan (SINKRONISASI EXCEL) ---
        const docRef = doc(db, "master_karyawan", userNIK);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            
            // Membaca key berdasarkan nama kolom Excel setelah spasi diganti '_'
            const nama = data.Nama_Karyawan || data.Nama || "Tanpa Nama";
            const inisial = nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            
            // Render Header Top
            document.getElementById("userNameDisplayTop").innerText = nama;
            document.getElementById("userAvatarTop").innerText = inisial;

            // Render Kartu Profil Kiri
            document.getElementById("profAvatar").innerText = inisial;
            document.getElementById("profNama").innerText = nama;
            document.getElementById("profJabatan").innerText = data.JABATAN || data.Jabatan || "-";
            document.getElementById("profNIK").innerText = data.NIK_Karyawan || data.NIK || userNIK;
            document.getElementById("profCabang").innerText = data.CABANG || data.Cabang || "-";
            
            // Format Tanggal Join
            let tglMasuk = data.TANGGAL_JOIN || data.TanggalJoin;
            if(tglMasuk && tglMasuk !== "-" && tglMasuk !== "") {
                const dateObj = new Date(tglMasuk);
                // Cek apakah dateObj valid sebelum di-format
                if(!isNaN(dateObj)) {
                    document.getElementById("profTglJoin").innerText = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                } else {
                    document.getElementById("profTglJoin").innerText = tglMasuk; // Tampilkan mentah jika gagal parsing
                }
            } else {
                document.getElementById("profTglJoin").innerText = "-";
            }
            
            // Sisa Cuti (Membaca kolom jatah_tahunan dan Terpakai_Tahunan)
            let jatahCuti = parseFloat(data.jatah_tahunan) || parseFloat(data.SisaCutiTahunan) || 0;
            let terpakai = parseFloat(data.Terpakai_Tahunan) || parseFloat(data.TerpakaiTahunan) || 0;
            let sisaCuti = jatahCuti - terpakai;
            
            document.getElementById("profSisaCuti").innerText = sisaCuti;
        } else {
            console.warn("Dokumen karyawan tidak ditemukan untuk NIK:", userNIK);
        }

        // --- B. Render Tabel Histori Pengajuan ---
        const tbody = document.getElementById("tableRiwayatBody");
        const reqRef = collection(db, "data_pengajuan");
        const qHistory = query(reqRef, where("NIK", "==", parseInt(userNIK) || userNIK)); // Handle NIK format number/string
        const historySnap = await getDocs(qHistory);

        if (historySnap.empty) {
            tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500 italic">Belum ada riwayat pengajuan.</td></tr>`;
        } else {
            let trHTML = "";
            let riwayatArr = [];
            historySnap.forEach(doc => riwayatArr.push(doc.data()));
            riwayatArr.sort((a, b) => new Date(b.Tgl) - new Date(a.Tgl));

            riwayatArr.slice(0, 5).forEach(item => {
                const dateObj = new Date(item.Tgl);
                let tglFormat = "-";
                if(!isNaN(dateObj)) {
                    tglFormat = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                }
                
                let statusBadge = "";
                let statusText = item['Status Final'] || item.StatusFinal || "PENDING"; // Sesuaikan kolom Data_Pengajuan
                
                if (statusText.includes("APPROVED")) {
                    statusBadge = `<span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">${statusText}</span>`;
                } else if (statusText.includes("REJECT") || statusText.includes("TOLAK")) {
                    statusBadge = `<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">${statusText}</span>`;
                } else {
                    statusBadge = `<span class="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">${statusText}</span>`;
                }

                trHTML += `
                    <tr class="hover:bg-gray-50 transition border-b border-gray-100">
                        <td class="px-6 py-4 text-gray-600">${tglFormat}</td>
                        <td class="px-6 py-4">
                            <p class="font-bold text-gray-800">${item['Nama Form'] || item.NamaForm || "-"}</p>
                            <p class="text-xs text-gray-400 font-mono mt-0.5">${item.ID || "-"}</p>
                        </td>
                        <td class="px-6 py-4">${statusBadge}</td>
                        <td class="px-6 py-4 text-right">
                            <button class="text-red-600 hover:text-red-800 text-sm font-semibold hover:underline">Detail</button>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = trHTML;
        }

    } catch (error) {
        console.error("Gagal menarik data:", error);
        document.getElementById("tableRiwayatBody").innerHTML = `<tr><td colspan="4" class="px-6 py-6 text-center text-red-500">Gagal memuat riwayat.</td></tr>`;
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
