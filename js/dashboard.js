// js/dashboard.js
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Ambil NIK dari memori browser (disimpan saat login)
    const userNIK = localStorage.getItem("userNIK");

    if (!userNIK) {
        alert("Sesi berakhir. Silakan login kembali.");
        window.location.href = "/index.html";
        return;
    }

    try {
        // 2. Tarik profil lengkap karyawan dari Firestore menggunakan NIK
        const docRef = doc(db, "master_karyawan", userNIK);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const dataPegawai = docSnap.data();
            
            // 3. Tampilkan data ke elemen HTML
            document.getElementById("userNameDisplay").innerText = dataPegawai.Nama;
            
            // Kalkulasi Sisa Cuti (Jatah - Terpakai)
            const sisaCuti = (dataPegawai.SisaCutiTahunan || 0) - (dataPegawai.TerpakaiTahunan || 0);
            document.getElementById("cutiDisplay").innerHTML = `${sisaCuti} <span class="text-sm font-normal text-gray-500">Hari</span>`;
            
        } else {
            document.getElementById("userNameDisplay").innerText = "Data tidak ditemukan";
        }
    } catch (error) {
        console.error("Gagal menarik data:", error);
    }

    // 4. Logika Tombol Keluar (Logout)
    document.getElementById("btnLogout").addEventListener("click", () => {
        localStorage.clear();
        window.location.href = "/index.html";
    });
});
