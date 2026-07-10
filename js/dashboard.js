// =======================================================================
// FIREBASE INITIALIZATION & IMPORTS
// =======================================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { 
    getFirestore, doc, getDoc, collection, query, where, getDocs, updateDoc 
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

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

// =======================================================================
// MAIN DASHBOARD LOGIC
// =======================================================================
document.addEventListener("DOMContentLoaded", async () => {
    
    // --- SESI KEAMANAN ---
    const userNIK = localStorage.getItem("userNIK");
    if (!userNIK) {
        alert("Sesi berakhir atau tidak valid. Silakan login kembali.");
        window.location.href = "/index.html";
        return;
    }

    // ==========================================
    // 1. LOGIKA UI: SIDEBAR & ACCORDION
    // ==========================================
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const btnToggle = document.getElementById('btnToggleSidebar');

    // Fungsi Buka/Tutup Sidebar Utama
    function toggleSidebar() {
        if (window.innerWidth >= 1024) { // Layar Laptop/PC
            sidebar.classList.toggle('lg:w-64');
            sidebar.classList.toggle('lg:w-0');
        } else { // Layar HP
            sidebar.classList.toggle('-translate-x-full');
            overlay.classList.toggle('hidden');
        }
    }
    if(btnToggle) btnToggle.addEventListener('click', toggleSidebar);
    if(overlay) overlay.addEventListener('click', toggleSidebar);

    // Fungsi Accordion Sub-Menu
    const menuToggles = document.querySelectorAll('.menu-toggle');
    menuToggles.forEach(btn => {
        btn.addEventListener('click', () => {
            const submenu = btn.nextElementSibling;
            const chevron = btn.querySelector('.chevron');
            if(submenu) {
                submenu.classList.toggle('hidden');
                submenu.classList.toggle('flex');
            }
            if(chevron) chevron.classList.toggle('rotate-180');
        });
    });


    // ==========================================
    // 2. LOGIKA HAK AKSES MENU (RBAC)
    // ==========================================
    const role = (localStorage.getItem("userRole") || "").toUpperCase();
    const jabatan = (localStorage.getItem("userJabatan") || "").toUpperCase();
    const isAtasan = localStorage.getItem("isAtasan") === "YES";

    const isHRD = role.includes("HRD") || jabatan.includes("HR");
    const isFinance = role.includes("FINANCE") || role.includes("CASHIER") || jabatan.includes("FINANCE");
    const isManajerial = role.includes("GM") || role.includes("SPV") || jabatan.includes("MANAGER") || jabatan.includes("SUPERVISOR");

    const menuManajerial = document.getElementById("menu-manajerial");
    const menuHrd = document.getElementById("menu-hrd");

    if (isHRD) {
        if(menuManajerial) menuManajerial.classList.remove("hidden");
        if(menuHrd) menuHrd.classList.remove("hidden");
    } else if (isFinance || isManajerial || isAtasan) {
        if(menuManajerial) menuManajerial.classList.remove("hidden");
    }


    // ==========================================
    // 3. TARIK DATA PROFIL & KALKULASI CUTI
    // ==========================================
    let namaKaryawan = "Tanpa Nama";

    try {
        // --- A. Render Profil Karyawan (Dari Master Karyawan) ---
        const docRef = doc(db, "master_karyawan", userNIK);
        const docSnap = await getDoc(docRef);

        let jatahTahunan = 0;
        let jatahKhusus = 0;
        let jatahAkumulasi = 0;

        if (docSnap.exists()) {
            const data = docSnap.data();
            namaKaryawan = data.Nama_Karyawan || data.Nama || "Tanpa Nama";
            const inisial = namaKaryawan.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            
            // Elemen Top Header
            if(document.getElementById("userNameDisplayTop")) document.getElementById("userNameDisplayTop").innerText = namaKaryawan;
            if(document.getElementById("userAvatarTop")) document.getElementById("userAvatarTop").innerText = inisial;

            // Elemen Kartu Profil
            if(document.getElementById("profAvatar")) document.getElementById("profAvatar").innerText = inisial;
            if(document.getElementById("profNama")) document.getElementById("profNama").innerText = namaKaryawan;
            if(document.getElementById("profJabatan")) document.getElementById("profJabatan").innerText = data.JABATAN || data.Jabatan || "-";
            if(document.getElementById("profNIK")) document.getElementById("profNIK").innerText = data.NIK_Karyawan || data.NIK || userNIK;
            if(document.getElementById("profCabang")) document.getElementById("profCabang").innerText = data.CABANG || data.Cabang || "-";
            
            // Format Tanggal Join (Smart Parser Excel)
            let tglMasuk = data.TANGGAL_JOIN || data.TanggalJoin;
            if (tglMasuk && tglMasuk !== "-" && tglMasuk !== "") {
                let dateObj;
                if (!isNaN(tglMasuk) && Number(tglMasuk) > 20000) {
                    dateObj = new Date((Number(tglMasuk) - 25569) * 86400 * 1000);
                } else {
                    dateObj = new Date(tglMasuk);
                }
                if(document.getElementById("profTglJoin")) {
                    document.getElementById("profTglJoin").innerText = !isNaN(dateObj) ? dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }) : tglMasuk;
                }
            } else {
                if(document.getElementById("profTglJoin")) document.getElementById("profTglJoin").innerText = "-";
            }

            // Simpan Jatah Cuti Awal
            jatahTahunan = parseFloat(data.jatah_tahunan) || parseFloat(data.SisaCutiTahunan) || 0;
            jatahKhusus = parseFloat(data.jatah_khusus) || 0;
            jatahAkumulasi = parseFloat(data.jatah_akumulasi) || 0;
            
        } else {
            console.warn("Profil tidak ditemukan untuk NIK:", userNIK);
        }

        // --- B. Kalkulasi Pengurangan Cuti (Dari Master Cuti) ---
        let potongTahunan = 0;
        let potongKhusus = 0;
        let potongAkumulasi = 0;

        const cutiRef = collection(db, "master_cuti");
        const qCuti = query(cutiRef, where("Nama_Karyawan", "==", namaKaryawan));
        const snapCuti = await getDocs(qCuti);

        snapCuti.forEach(docCuti => {
            const dataCuti = docCuti.data();
            const jumlahDiambil = parseFloat(dataCuti.Count) || parseFloat(dataCuti.COUNT) || 0;
            const jenisPotongan = (dataCuti.Potong_Jatah || dataCuti['Potong Jatah'] || "").toUpperCase();

            if (jenisPotongan.includes("TAHUNAN")) {
                potongTahunan += jumlahDiambil;
            } else if (jenisPotongan.includes("KHUSUS")) {
                potongKhusus += jumlahDiambil;
            } else if (jenisPotongan.includes("AKUMULASI")) {
                potongAkumulasi += jumlahDiambil;
            }
        });

        const sisaTahunan = jatahTahunan - potongTahunan;
        const sisaKhusus = jatahKhusus - potongKhusus;
        const sisaAkumulasi = jatahAkumulasi - potongAkumulasi;

        // Render Sisa Cuti ke Layar
        if(document.getElementById("cutiTahunanDisplay")) document.getElementById("cutiTahunanDisplay").innerText = sisaTahunan;
        if(document.getElementById("cutiKhususDisplay")) document.getElementById("cutiKhususDisplay").innerText = sisaKhusus;
        if(document.getElementById("cutiAkumulasiDisplay")) document.getElementById("cutiAkumulasiDisplay").innerText = sisaAkumulasi;
        
        // Di kartu profil utama
        if(document.getElementById("profSisaCuti")) document.getElementById("profSisaCuti").innerText = sisaTahunan;

        // --- C. Tarik Histori Pengajuan Terakhir ---
        const tbody = document.getElementById("tableRiwayatBody");
        if(tbody) {
            const reqRef = collection(db, "data_pengajuan");
            // Antisipasi NIK bertipe string atau number
            const qHistory = query(reqRef, where("NIK", "in", [userNIK, parseInt(userNIK), Number(userNIK)])); 
            const historySnap = await getDocs(qHistory);

            if (historySnap.empty) {
                tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-8 text-center text-gray-500 italic">Belum ada riwayat pengajuan.</td></tr>`;
            } else {
                let trHTML = "";
                let riwayatArr = [];
                historySnap.forEach(hDoc => riwayatArr.push(hDoc.data()));
                
                // Urutkan dari terbaru ke terlama
                riwayatArr.sort((a, b) => new Date(b.Tgl || b.TGL) - new Date(a.Tgl || a.TGL));

                riwayatArr.slice(0, 5).forEach(item => {
                    const tglMentah = item.Tgl || item.TGL;
                    const dateObj = new Date(tglMentah);
                    let tglFormat = "-";
                    if(!isNaN(dateObj)) {
                        tglFormat = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                    }
                    
                    let statusBadge = "";
                    let statusText = item['Status Final'] || item.StatusFinal || "PENDING";
                    
                    if (statusText.includes("APPROVED") || statusText.includes("SELESAI")) {
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
                                <p class="font-bold text-gray-800">${item['Nama Form'] || item.NamaForm || "Form Sistem"}</p>
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
        }

    } catch (error) {
        console.error("Gagal menarik data:", error);
        if(document.getElementById("tableRiwayatBody")) {
            document.getElementById("tableRiwayatBody").innerHTML = `<tr><td colspan="4" class="px-6 py-6 text-center text-red-500">Gagal memuat riwayat.</td></tr>`;
        }
    }


    // ==========================================
    // 4. LOGIKA PENGATURAN AKUN (MODAL)
    // ==========================================
    const btnPengaturan = document.getElementById("btnPengaturanAkun");
    const modalAkun = document.getElementById("modalAkun");
    const btnTutup = document.getElementById("btnTutupModal");
    const btnSimpan = document.getElementById("btnSimpanAkun");

    if (btnPengaturan && modalAkun) {
        btnPengaturan.addEventListener("click", () => {
            modalAkun.classList.remove("hidden");
            modalAkun.children[0].classList.replace("scale-95", "scale-100");
        });
    }

    if (btnTutup && modalAkun) {
        btnTutup.addEventListener("click", () => {
            modalAkun.classList.add("hidden");
            modalAkun.children[0].classList.replace("scale-100", "scale-95");
        });
    }

    if (btnSimpan) {
        btnSimpan.addEventListener("click", async () => {
            const newUname = document.getElementById("newUsername").value.trim().toUpperCase();
            const newPass = document.getElementById("newPassword").value.trim();
            const docIDAkun = localStorage.getItem("accountDocID");

            if (!newUname || !newPass) {
                alert("Username dan Password tidak boleh kosong!");
                return;
            }

            btnSimpan.innerText = "Menyimpan...";
            
            try {
                const akunRef = doc(db, "user_accounts", docIDAkun);
                await updateDoc(akunRef, {
                    Username: newUname,
                    Password: newPass
                });
                alert("Akun berhasil diperbarui! Silakan gunakan Username baru pada login berikutnya.");
                modalAkun.classList.add("hidden");
            } catch (error) {
                console.error(error);
                alert("Gagal mengubah akun. Pastikan Anda terhubung ke internet.");
            } finally {
                btnSimpan.innerText = "Simpan Perubahan";
            }
        });
    }

    // ==========================================
    // 5. LOGIKA LOGOUT
    // ==========================================
    const btnLogout = document.getElementById("btnLogout");
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            localStorage.clear();
            window.location.href = "/index.html";
        });
    }
});
