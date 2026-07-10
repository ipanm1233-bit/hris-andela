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

    btnToggle.addEventListener('click', toggleSidebar);
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

    try {
        // --- A. Render Profil Karyawan ---
        const docRef = doc(db, "master_karyawan", userNIK);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            const nama = data.Nama || "Tanpa Nama";
            const inisial = nama.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            
            // Render Header Top
            document.getElementById("userNameDisplayTop").innerText = nama;
            document.getElementById("userAvatarTop").innerText = inisial;

            // Render Kartu Profil Kiri
            document.getElementById("profAvatar").innerText = inisial;
            document.getElementById("profNama").innerText = nama;
            document.getElementById("profJabatan").innerText = data.Jabatan || "-";
            document.getElementById("profNIK").innerText = data.NIK || userNIK;
            document.getElementById("profCabang").innerText = data.Cabang || "-";
            
            // Format Tanggal Join
            if(data.TanggalJoin && data.TanggalJoin !== "-") {
                const dateObj = new Date(data.TanggalJoin);
                document.getElementById("profTglJoin").innerText = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
            } else {
                document.getElementById("profTglJoin").innerText = "-";
            }
            
            // Sisa Cuti
            const sisaCuti = (data.SisaCutiTahunan || 0) - (data.TerpakaiTahunan || 0);
            document.getElementById("profSisaCuti").innerText = sisaCuti;
            
        }

        // --- B. Render Tabel Histori Pengajuan Karyawan Ini ---
        const tbody = document.getElementById("tableRiwayatBody");
        const reqRef = collection(db, "data_pengajuan");
        // Query khusus mencari NIK yang sedang login
        const qHistory = query(reqRef, where("NIK", "==", userNIK));
        const historySnap = await getDocs(qHistory);

        if (historySnap.empty) {
            tbody.innerHTML = `<tr><td colspan="4" class="px-6 py-6 text-center text-gray-500 italic">Belum ada riwayat pengajuan.</td></tr>`;
        } else {
            let trHTML = "";
            // Simpan ke array untuk di-sort berdasarkan Tanggal (Terbaru ke Terlama)
            let riwayatArr = [];
            historySnap.forEach(doc => riwayatArr.push(doc.data()));
            riwayatArr.sort((a, b) => new Date(b.Tgl) - new Date(a.Tgl));

            // Ambil 5 teratas
            riwayatArr.slice(0, 5).forEach(item => {
                const dateObj = new Date(item.Tgl);
                const tglFormat = dateObj.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
                
                // Styling Badge Status
                let statusBadge = "";
                let statusText = item.StatusFinal || "PENDING";
                
                if (statusText.includes("APPROVED")) {
                    statusBadge = `<span class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">${statusText}</span>`;
                } else if (statusText.includes("REJECT") || statusText.includes("TOLAK")) {
                    statusBadge = `<span class="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">${statusText}</span>`;
                } else {
                    statusBadge = `<span class="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">${statusText}</span>`;
                }

                trHTML += `
                    <tr class="hover:bg-gray-50 transition">
                        <td class="px-6 py-4 text-gray-600">${tglFormat}</td>
                        <td class="px-6 py-4">
                            <p class="font-bold text-gray-800">${item.NamaForm}</p>
                            <p class="text-xs text-gray-400 font-mono mt-0.5">${item.ID}</p>
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
        document.getElementById("tableRiwayatBody").innerHTML = `<tr><td colspan="4" class="px-6 py-6 text-center text-red-500">Gagal memuat data. Periksa koneksi internet.</td></tr>`;
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

// ==========================================
    // 4. LOGIKA PENGATURAN AKUN KARYAWAN
    // ==========================================
    import { updateDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
    
    const btnPengaturan = document.getElementById("btnPengaturanAkun");
    const modalAkun = document.getElementById("modalAkun");
    const btnTutup = document.getElementById("btnTutupModal");
    const btnSimpan = document.getElementById("btnSimpanAkun");

    if(btnPengaturan) {
        btnPengaturan.addEventListener("click", () => {
            modalAkun.classList.remove("hidden");
            modalAkun.children[0].classList.replace("scale-95", "scale-100"); // Efek pop-up
        });
    }

    if(btnTutup) {
        btnTutup.addEventListener("click", () => {
            modalAkun.classList.add("hidden");
            modalAkun.children[0].classList.replace("scale-100", "scale-95");
        });
    }

    if(btnSimpan) {
        btnSimpan.addEventListener("click", async () => {
            const newUname = document.getElementById("newUsername").value.trim().toUpperCase();
            const newPass = document.getElementById("newPassword").value.trim();
            const docIDAkun = localStorage.getItem("accountDocID");

            if(!newUname || !newPass) {
                alert("Semua kolom harus diisi!");
                return;
            }

            btnSimpan.innerText = "Menyimpan...";
            
            try {
                // Update dokumen di Firestore
                const akunRef = doc(db, "user_accounts", docIDAkun);
                await updateDoc(akunRef, {
                    Username: newUname,
                    Password: newPass
                });

                alert("Akun berhasil diperbarui! Silakan gunakan kredensial baru pada login berikutnya.");
                modalAkun.classList.add("hidden");
                btnSimpan.innerText = "Simpan Perubahan";
                
            } catch (error) {
                console.error(error);
                alert("Gagal mengubah akun. Pastikan Anda terhubung ke internet.");
                btnSimpan.innerText = "Simpan Perubahan";
            }
        });
    }
