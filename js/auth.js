import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getFirestore, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

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

document.addEventListener("DOMContentLoaded", () => {
    const btnLogin = document.getElementById("btnLogin");
    const pesanError = document.getElementById("pesanError");

    btnLogin.addEventListener("click", async () => {
        const username = document.getElementById("inputUsername").value.trim().toUpperCase();
        const password = document.getElementById("inputPassword").value.trim();

        if (!username || !password) {
            tampilkanError("Username dan Kata Sandi wajib diisi!");
            return;
        }

        btnLogin.innerHTML = "Memverifikasi...";
        btnLogin.disabled = true;

        try {
            // 1. Cari Username di Koleksi Akun
            const qAkun = query(collection(db, "user_accounts"), where("Username", "==", username));
            const snapAkun = await getDocs(qAkun);

            if (snapAkun.empty) {
                throw new Error("Username tidak terdaftar di sistem.");
            }

            const dataAkun = snapAkun.docs[0].data();
            const idDocAkun = snapAkun.docs[0].id; // ID Unik akun

            // 2. Verifikasi Password
            if (dataAkun.Password !== password) {
                throw new Error("Kata sandi yang Anda masukkan salah.");
            }

            // 3. Lacak NIK di Master Karyawan menggunakan Nama Lengkap
            const qKaryawan = query(collection(db, "master_karyawan"), where("Nama_Karyawan", "==", dataAkun.NamaLengkap));
            const snapKaryawan = await getDocs(qKaryawan);

            let userNIK = "";
            if (!snapKaryawan.empty) {
                userNIK = snapKaryawan.docs[0].id; // Mengambil NIK
            }

            // 4. Simpan Sesi di Memori Browser
            localStorage.setItem("userNIK", userNIK);
            localStorage.setItem("accountDocID", idDocAkun); // Penting untuk fitur ubah password nanti
            localStorage.setItem("userNameLengkap", dataAkun.NamaLengkap);

            // Berhasil, lempar ke Dashboard!
            window.location.href = "/dashboard.html";

        } catch (error) {
            tampilkanError(error.message);
            btnLogin.innerHTML = "Masuk ke Sistem";
            btnLogin.disabled = false;
        }
    });

    function tampilkanError(pesan) {
        pesanError.textContent = pesan;
        pesanError.classList.remove("hidden");
    }
});
